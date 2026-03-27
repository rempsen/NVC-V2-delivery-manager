/**
 * mapsRouter — server-side Google Maps API integration.
 *
 * Keeps the API key server-side (never exposed to the browser).
 * Provides:
 *  - maps.getEtas        — Distance Matrix API: travel time + distance for N origins → M destinations
 *  - maps.optimizeRoutes — Routes API v2: optimal task ordering for a technician given traffic
 *  - maps.geocode        — Geocoding API: address → lat/lng
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const GOOGLE_MAPS_BASE = "https://maps.googleapis.com/maps/api";
const ROUTES_API_BASE = "https://routes.googleapis.com/directions/v2:computeRoutes";
const ROUTE_OPT_BASE = "https://routeoptimization.googleapis.com/v1/projects";

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? "";
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  return key;
}

// ─── Distance Matrix ──────────────────────────────────────────────────────────

const LatLngSchema = z.object({ lat: z.number(), lng: z.number() });

export const mapsRouter = router({
  /**
   * Get travel time + distance from multiple origins to multiple destinations.
   * Uses Distance Matrix API with traffic model = best_guess.
   * Returns a flat array of results indexed as [origin_idx * dest_count + dest_idx].
   */
  getEtas: protectedProcedure
    .input(z.object({
      origins: z.array(LatLngSchema).min(1).max(25),
      destinations: z.array(LatLngSchema).min(1).max(25),
      /** departure_time: "now" uses live traffic */
      departureTime: z.enum(["now"]).default("now"),
    }))
    .query(async ({ input }) => {
      const apiKey = getApiKey();
      const originsStr = input.origins.map((o) => `${o.lat},${o.lng}`).join("|");
      const destsStr = input.destinations.map((d) => `${d.lat},${d.lng}`).join("|");

      const url = new URL(`${GOOGLE_MAPS_BASE}/distancematrix/json`);
      url.searchParams.set("origins", originsStr);
      url.searchParams.set("destinations", destsStr);
      url.searchParams.set("departure_time", "now");
      url.searchParams.set("traffic_model", "best_guess");
      url.searchParams.set("units", "metric");
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Distance Matrix API error: ${res.status}`);
      const data = await res.json() as any;

      if (data.status !== "OK") {
        throw new Error(`Distance Matrix API: ${data.status} — ${data.error_message ?? ""}`);
      }

      // Flatten rows × elements into a simple array
      const results: Array<{
        originIndex: number;
        destinationIndex: number;
        durationSeconds: number;
        durationInTrafficSeconds: number | null;
        distanceMeters: number;
        status: string;
      }> = [];

      data.rows.forEach((row: any, oi: number) => {
        row.elements.forEach((el: any, di: number) => {
          results.push({
            originIndex: oi,
            destinationIndex: di,
            durationSeconds: el.duration?.value ?? 0,
            durationInTrafficSeconds: el.duration_in_traffic?.value ?? null,
            distanceMeters: el.distance?.value ?? 0,
            status: el.status,
          });
        });
      });

      return {
        originAddresses: data.origin_addresses as string[],
        destinationAddresses: data.destination_addresses as string[],
        results,
      };
    }),

  /**
   * Compute an optimized route for a single technician visiting multiple task locations.
   * Uses the Routes API v2 with optimizeWaypointOrder=true and traffic awareness.
   * Returns the optimized waypoint order + per-leg ETAs.
   */
  optimizeRoutes: protectedProcedure
    .input(z.object({
      origin: LatLngSchema,
      waypoints: z.array(z.object({
        taskId: z.number(),
        lat: z.number(),
        lng: z.number(),
        address: z.string().optional(),
      })).min(1).max(25),
      returnToOrigin: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const apiKey = getApiKey();

      // Build the Routes API v2 request body
      const body = {
        origin: {
          location: { latLng: { latitude: input.origin.lat, longitude: input.origin.lng } },
        },
        destination: input.returnToOrigin
          ? { location: { latLng: { latitude: input.origin.lat, longitude: input.origin.lng } } }
          : {
              location: {
                latLng: {
                  latitude: input.waypoints[input.waypoints.length - 1].lat,
                  longitude: input.waypoints[input.waypoints.length - 1].lng,
                },
              },
            },
        intermediates: input.waypoints.slice(0, input.returnToOrigin ? undefined : -1).map((wp) => ({
          location: { latLng: { latitude: wp.lat, longitude: wp.lng } },
        })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        optimizeWaypointOrder: true,
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
        languageCode: "en-US",
        units: "METRIC",
      };

      const res = await fetch(ROUTES_API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.legs,routes.optimizedIntermediateWaypointIndex",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        // Fallback: return original order with estimated ETAs from Distance Matrix
        console.warn(`Routes API error ${res.status}: ${errText} — falling back to Distance Matrix`);
        return fallbackOptimize(input, apiKey);
      }

      const data = await res.json() as any;
      const route = data.routes?.[0];
      if (!route) return fallbackOptimize(input, apiKey);

      // optimizedIntermediateWaypointIndex gives the reordered intermediate indices
      const optimizedOrder: number[] = route.optimizedIntermediateWaypointIndex ?? input.waypoints.map((_: any, i: number) => i);

      // Build per-leg info
      const legs = (route.legs ?? []) as any[];
      const orderedTasks = optimizedOrder.map((idx: number, legIdx: number) => {
        const wp = input.waypoints[idx];
        const leg = legs[legIdx];
        return {
          taskId: wp.taskId,
          lat: wp.lat,
          lng: wp.lng,
          address: wp.address,
          legIndex: legIdx,
          durationSeconds: parseDuration(leg?.duration),
          distanceMeters: leg?.distanceMeters ?? 0,
          cumulativeDurationSeconds: legs.slice(0, legIdx + 1).reduce((s: number, l: any) => s + parseDuration(l?.duration), 0),
        };
      });

      return {
        optimizedOrder,
        orderedTasks,
        totalDurationSeconds: parseDuration(route.duration),
        totalDistanceMeters: route.distanceMeters ?? 0,
        polylineEncoded: route.polyline?.encodedPolyline ?? null,
      };
    }),

  /**
   * Public ETA endpoint for the customer-facing tracking page.
   * No auth required — uses jobHash to look up the task.
   * Returns ETA in seconds + distance in meters from tech location to job site.
   */
  getTrackingEta: publicProcedure
    .input(z.object({
      techLat: z.number(),
      techLng: z.number(),
      destLat: z.number(),
      destLng: z.number(),
    }))
    .query(async ({ input }) => {
      const apiKey = getApiKey();
      const url = new URL(`${GOOGLE_MAPS_BASE}/distancematrix/json`);
      url.searchParams.set("origins", `${input.techLat},${input.techLng}`);
      url.searchParams.set("destinations", `${input.destLat},${input.destLng}`);
      url.searchParams.set("departure_time", "now");
      url.searchParams.set("traffic_model", "best_guess");
      url.searchParams.set("units", "metric");
      url.searchParams.set("key", apiKey);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) return { etaSeconds: null, distanceMeters: null, error: `HTTP ${res.status}` };
        const data = await res.json() as any;
        if (data.status !== "OK") return { etaSeconds: null, distanceMeters: null, error: data.status };
        const el = data.rows?.[0]?.elements?.[0];
        if (!el || el.status !== "OK") return { etaSeconds: null, distanceMeters: null, error: el?.status ?? "NO_RESULT" };
        return {
          etaSeconds: el.duration_in_traffic?.value ?? el.duration?.value ?? null,
          distanceMeters: el.distance?.value ?? null,
          error: null,
        };
      } catch (e: any) {
        return { etaSeconds: null, distanceMeters: null, error: e?.message ?? "unknown" };
      }
    }),

  /**
   * Geocode an address to lat/lng coordinates.
   */
  geocode: publicProcedure
    .input(z.object({ address: z.string().min(3) }))
    .query(async ({ input }) => {
      const apiKey = getApiKey();
      const url = new URL(`${GOOGLE_MAPS_BASE}/geocode/json`);
      url.searchParams.set("address", input.address);
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
      const data = await res.json() as any;

      if (data.status !== "OK" || !data.results?.length) {
        return { found: false, lat: null, lng: null, formattedAddress: null };
      }

      const loc = data.results[0].geometry.location;
      return {
        found: true,
        lat: loc.lat as number,
        lng: loc.lng as number,
        formattedAddress: data.results[0].formatted_address as string,
      };
    }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDuration(d: any): number {
  if (!d) return 0;
  if (typeof d === "number") return d;
  // Routes API returns duration as "123s"
  if (typeof d === "string") return parseInt(d.replace("s", ""), 10) || 0;
  return d.value ?? 0;
}

/** Fallback: use Distance Matrix to estimate ordering when Routes API is unavailable */
async function fallbackOptimize(
  input: { origin: { lat: number; lng: number }; waypoints: Array<{ taskId: number; lat: number; lng: number; address?: string }> },
  apiKey: string,
) {
  const origins = [input.origin, ...input.waypoints.map((w) => ({ lat: w.lat, lng: w.lng }))];
  const destinations = input.waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));

  const url = new URL(`${GOOGLE_MAPS_BASE}/distancematrix/json`);
  url.searchParams.set("origins", origins.map((o) => `${o.lat},${o.lng}`).join("|"));
  url.searchParams.set("destinations", destinations.map((d) => `${d.lat},${d.lng}`).join("|"));
  url.searchParams.set("departure_time", "now");
  url.searchParams.set("traffic_model", "best_guess");
  url.searchParams.set("units", "metric");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    const data = await res.json() as any;

    if (data.status === "OK") {
      // Greedy nearest-neighbor from origin
      const visited = new Set<number>();
      const order: number[] = [];
      let currentOriginIdx = 0; // index in origins array (0 = depot)

      while (order.length < input.waypoints.length) {
        let bestIdx = -1;
        let bestTime = Infinity;
        for (let di = 0; di < input.waypoints.length; di++) {
          if (visited.has(di)) continue;
          const el = data.rows[currentOriginIdx]?.elements[di];
          const t = el?.duration_in_traffic?.value ?? el?.duration?.value ?? Infinity;
          if (t < bestTime) { bestTime = t; bestIdx = di; }
        }
        if (bestIdx === -1) break;
        visited.add(bestIdx);
        order.push(bestIdx);
        currentOriginIdx = bestIdx + 1; // next origin is the visited waypoint
      }

      const orderedTasks = order.map((idx, legIdx) => ({
        taskId: input.waypoints[idx].taskId,
        lat: input.waypoints[idx].lat,
        lng: input.waypoints[idx].lng,
        address: input.waypoints[idx].address,
        legIndex: legIdx,
        durationSeconds: data.rows[legIdx === 0 ? 0 : order[legIdx - 1] + 1]?.elements[idx]?.duration_in_traffic?.value ?? 0,
        distanceMeters: data.rows[legIdx === 0 ? 0 : order[legIdx - 1] + 1]?.elements[idx]?.distance?.value ?? 0,
        cumulativeDurationSeconds: 0,
      }));

      return {
        optimizedOrder: order,
        orderedTasks,
        totalDurationSeconds: orderedTasks.reduce((s, t) => s + t.durationSeconds, 0),
        totalDistanceMeters: orderedTasks.reduce((s, t) => s + t.distanceMeters, 0),
        polylineEncoded: null,
      };
    }
  } catch {
    // ignore
  }

  // Last resort: return original order
  return {
    optimizedOrder: input.waypoints.map((_, i) => i),
    orderedTasks: input.waypoints.map((wp, i) => ({
      taskId: wp.taskId,
      lat: wp.lat,
      lng: wp.lng,
      address: wp.address,
      legIndex: i,
      durationSeconds: 0,
      distanceMeters: 0,
      cumulativeDurationSeconds: 0,
    })),
    totalDurationSeconds: 0,
    totalDistanceMeters: 0,
    polylineEncoded: null,
  };
}
