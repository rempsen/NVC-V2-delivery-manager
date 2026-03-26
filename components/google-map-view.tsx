/**
 * GoogleMapView — renders a real Google Map on web using the Maps JS API.
 * Falls back to the existing SVG fleet map on native (iOS/Android).
 *
 * Props:
 *  - technicians: array of { id, name, lat, lng, status, transportType }
 *  - selectedId: currently selected technician ID (highlights marker)
 *  - onSelectTech: callback when a marker is clicked
 *  - center: { lat, lng } default map center
 *  - zoom: default zoom level
 *  - tasks: optional array of task pins { id, lat, lng, status }
 *  - style: optional container style
 */
import React, { useEffect, useRef, useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { useColors } from "@/hooks/use-colors";

// Status → marker color mapping
const STATUS_COLORS: Record<string, string> = {
  available: "#22C55E",
  on_job: "#3B82F6",
  en_route: "#8B5CF6",
  on_break: "#F59E0B",
  offline: "#9CA3AF",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  unassigned: "#F59E0B",
  assigned: "#3B82F6",
  en_route: "#8B5CF6",
  on_site: "#06B6D4",
  completed: "#22C55E",
  cancelled: "#EF4444",
};

export interface MapTechnician {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  transportType?: string;
}

export interface MapTask {
  id: number;
  jobAddress?: string;
  jobLatitude: number;
  jobLongitude: number;
  status: string;
  customerName?: string;
}

interface GoogleMapViewProps {
  technicians?: MapTechnician[];
  tasks?: MapTask[];
  selectedId?: number | null;
  onSelectTech?: (id: number) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  style?: React.CSSProperties;
  height?: number;
  /** ETA data keyed by technician ID: minutes remaining (negative = overdue) */
  etaData?: Record<number, number>;
  /** Route polylines: array of routes to draw on the map */
  routePolylines?: RoutePolyline[];
}

export interface RoutePolyline {
  /** Technician ID this route belongs to */
  techId: number;
  /** Color for this route's polyline */
  color: string;
  /** Ordered list of lat/lng waypoints */
  waypoints: Array<{ lat: number; lng: number }>;
}

export function GoogleMapView({
  technicians = [],
  tasks = [],
  selectedId,
  onSelectTech,
  center = { lat: 49.8951, lng: -97.1384 }, // Winnipeg default
  zoom = 11,
  height = 500,
  style,
  etaData = {},
  routePolylines = [],
}: GoogleMapViewProps) {
  const polylinesRef = React.useRef<Map<number, google.maps.Polyline[]>>(new Map());
  const etaLabelsRef = React.useRef<Map<number, google.maps.Marker[]>>(new Map());
  const { isLoaded, error, apiKey } = useGoogleMaps();
  const colors = useColors();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || Platform.OS !== "web") return;
    if (mapInstanceRef.current) return; // already initialized

    const map = new (window as any).google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new (window as any).google.maps.InfoWindow();
  }, [isLoaded, center, zoom]);

  // Update technician markers
  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current || Platform.OS !== "web") return;
    const G = (window as any).google.maps;
    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current!;

    // Remove stale tech markers
    markersRef.current.forEach((marker, key) => {
      if (key.startsWith("tech-")) {
        const id = parseInt(key.replace("tech-", ""), 10);
        if (!technicians.find((t) => t.id === id)) {
          marker.setMap(null);
          markersRef.current.delete(key);
        }
      }
    });

    // Add/update tech markers
    technicians.forEach((tech) => {
      const key = `tech-${tech.id}`;
      const color = STATUS_COLORS[tech.status] ?? "#9CA3AF";
      const isSelected = tech.id === selectedId;

      // Build ETA label for this tech
      const etaMins = etaData[tech.id];
      const hasEta = etaMins !== undefined;
      const etaColor = hasEta
        ? (etaMins < 0 ? "#EF4444" : etaMins <= 5 ? "#EF4444" : etaMins <= 15 ? "#F59E0B" : "#22C55E")
        : null;
      const etaLabel = hasEta
        ? (etaMins < 0 ? `${Math.abs(etaMins)}m late` : `${etaMins}m`)
        : null;

      // Custom SVG marker with ETA badge
      const initials = tech.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      const size = isSelected ? 44 : 36;
      const badgeHtml = hasEta && etaColor && etaLabel
        ? `<rect x="${size - 2}" y="-6" width="${etaLabel.length * 6 + 8}" height="14" rx="7" fill="${etaColor}" stroke="white" stroke-width="1.5"/>
           <text x="${size - 2 + (etaLabel.length * 6 + 8) / 2}" y="5" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="8" font-weight="800" fill="white">${etaLabel}</text>`
        : "";

      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size + (hasEta ? etaLabel!.length * 6 + 16 : 0)}" height="${size + 8}" viewBox="0 0 ${size + (hasEta ? etaLabel!.length * 6 + 16 : 0)} ${size + 8}">
        <circle cx="${size / 2}" cy="${size / 2 + 4}" r="${size / 2}" fill="${color}" stroke="white" stroke-width="${isSelected ? 3 : 2}"/>
        <text x="${size / 2}" y="${size / 2 + 8}" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="${isSelected ? 13 : 11}" font-weight="700" fill="white">${initials}</text>
        ${badgeHtml}
      </svg>`;

      const svgMarker = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgContent)}`,
        scaledSize: new G.Size(size + (hasEta ? etaLabel!.length * 6 + 16 : 0), size + 8),
        anchor: new G.Point((size + (hasEta ? etaLabel!.length * 6 + 16 : 0)) / 2, size + 4),
      };

      if (markersRef.current.has(key)) {
        const existing = markersRef.current.get(key)!;
        existing.setPosition({ lat: tech.latitude, lng: tech.longitude });
        existing.setIcon(svgMarker);
        existing.setZIndex(isSelected ? 100 : 10);
      } else {
        const marker = new G.Marker({
          position: { lat: tech.latitude, lng: tech.longitude },
          map,
          icon: svgMarker,
          title: tech.name,
          zIndex: isSelected ? 100 : 10,
        });

        marker.addListener("click", () => {
          const etaBadge = hasEta && etaColor && etaLabel
            ? `<div style="display:inline-block; background:${etaColor}; color:white; font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; margin-top:5px;">${etaLabel}</div>`
            : "";
          infoWindow.setContent(`
            <div style="font-family: -apple-system, sans-serif; padding: 4px 2px; min-width: 160px;">
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${tech.name}</div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                <span style="font-size: 12px; color: #555; text-transform: capitalize;">${tech.status.replace("_", " ")}</span>
              </div>
              ${etaBadge}
              ${tech.transportType ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">Transport: ${tech.transportType}</div>` : ""}
            </div>
          `);
          infoWindow.open(map, marker);
          onSelectTech?.(tech.id);
        });

        markersRef.current.set(key, marker);
      }
    });

    // Remove stale task markers
    markersRef.current.forEach((marker, key) => {
      if (key.startsWith("task-")) {
        const id = parseInt(key.replace("task-", ""), 10);
        if (!tasks.find((t) => t.id === id)) {
          marker.setMap(null);
          markersRef.current.delete(key);
        }
      }
    });

    // Add/update task markers (smaller pins)
    tasks.forEach((task) => {
      const key = `task-${task.id}`;
      const color = TASK_STATUS_COLORS[task.status] ?? "#F59E0B";

      if (!markersRef.current.has(key)) {
        const marker = new G.Marker({
          position: { lat: task.jobLatitude, lng: task.jobLongitude },
          map,
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: "#fff",
            strokeWeight: 1,
            scale: 1.4,
            anchor: new G.Point(12, 22),
          },
          title: task.customerName ?? `Task #${task.id}`,
          zIndex: 5,
        });

        marker.addListener("click", () => {
          infoWindow.setContent(`
            <div style="font-family: -apple-system, sans-serif; padding: 4px 2px; min-width: 140px;">
              <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">${task.customerName ?? `Task #${task.id}`}</div>
              <div style="font-size: 11px; color: #555; text-transform: capitalize;">${task.status.replace("_", " ")}</div>
              ${task.jobAddress ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">${task.jobAddress}</div>` : ""}
            </div>
          `);
          infoWindow.open(map, marker);
        });

        markersRef.current.set(key, marker);
      }
    });
  }, [technicians, tasks, selectedId, onSelectTech]);

  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      updateMarkers();
    }
  }, [isLoaded, updateMarkers]);

  // Draw / update route polylines using Google Directions API for road-following routes
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || Platform.OS !== "web") return;
    const G = (window as any).google.maps;
    const map = mapInstanceRef.current;

    // Clear all existing polylines and ETA labels
    const clearTech = (techId: number) => {
      polylinesRef.current.get(techId)?.forEach((p) => p.setMap(null));
      polylinesRef.current.delete(techId);
      etaLabelsRef.current.get(techId)?.forEach((m) => m.setMap(null));
      etaLabelsRef.current.delete(techId);
    };

    // Remove routes for techs no longer active
    const activeIds = new Set(routePolylines.map((r) => r.techId));
    polylinesRef.current.forEach((_, techId) => {
      if (!activeIds.has(techId)) clearTech(techId);
    });

    if (routePolylines.length === 0) return;

    const directionsService = new G.DirectionsService();

    routePolylines.forEach((route) => {
      if (route.waypoints.length < 2) return;

      // Clear previous route for this tech
      clearTech(route.techId);

      const origin = route.waypoints[0];
      const destination = route.waypoints[route.waypoints.length - 1];
      const waypts = route.waypoints.slice(1, -1).map((wp: { lat: number; lng: number }) => ({
        location: new G.LatLng(wp.lat, wp.lng),
        stopover: true,
      }));

      directionsService.route(
        {
          origin: new G.LatLng(origin.lat, origin.lng),
          destination: new G.LatLng(destination.lat, destination.lng),
          waypoints: waypts,
          optimizeWaypoints: false,
          travelMode: G.TravelMode.DRIVING,
        },
        (result: any, status: string) => {
          if (status !== "OK" || !result) {
            // Fallback: draw straight-line polyline
            const fallbackPoly = new G.Polyline({
              path: route.waypoints.map((wp: { lat: number; lng: number }) => ({ lat: wp.lat, lng: wp.lng })),
              geodesic: true,
              strokeColor: route.color,
              strokeOpacity: 0.7,
              strokeWeight: 3,
              map,
            });
            polylinesRef.current.set(route.techId, [fallbackPoly]);
            return;
          }

          const legs = result.routes[0].legs as any[];
          const newPolys: google.maps.Polyline[] = [];
          const newLabels: google.maps.Marker[] = [];

          legs.forEach((leg: any, legIdx: number) => {
            // Decode the leg's overview path
            const decodedPath = G.geometry.encoding.decodePath(leg.steps.flatMap((s: any) => G.geometry.encoding.decodePath(s.polyline.points)));

            const poly = new G.Polyline({
              path: decodedPath,
              geodesic: true,
              strokeColor: route.color,
              strokeOpacity: 0.88,
              strokeWeight: 4,
              map,
              icons: [{
                icon: { path: G.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: route.color },
                offset: "60%",
              }],
            });
            newPolys.push(poly);

            // ETA label at the midpoint of each leg
            const midIdx = Math.floor(decodedPath.length / 2);
            const midPoint = decodedPath[midIdx] ?? leg.end_location;
            const durationText = leg.duration?.text ?? "";
            const distanceText = leg.distance?.text ?? "";
            const labelContent = `<div style="background:${route.color};color:#fff;padding:3px 7px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${durationText}${distanceText ? ` · ${distanceText}` : ""}</div>`;
            const label = new G.Marker({
              position: midPoint,
              map,
              icon: { path: G.SymbolPath.CIRCLE, scale: 0 },
              label: { text: " ", color: "transparent" },
              title: `Leg ${legIdx + 1}: ${durationText}`,
              optimized: false,
            });
            // Use InfoWindow as a persistent label
            const iw = new G.InfoWindow({ content: labelContent, disableAutoPan: true });
            iw.open(map, label);
            newLabels.push(label);
          });

          polylinesRef.current.set(route.techId, newPolys);
          etaLabelsRef.current.set(route.techId, newLabels);
        },
      );
    });
  }, [isLoaded, routePolylines]);

  if (Platform.OS !== "web") {
    return null; // handled by native fallback in parent
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <Text style={{ color: colors.error ?? "#EF4444", fontSize: 13 }}>Maps failed to load: {error}</Text>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, height }}>
        <ActivityIndicator size="large" color="#1E6FBF" />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>Loading map…</Text>
      </View>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: height > 0 ? height : "100%",
        borderRadius: height > 0 ? 12 : 0,
        overflow: "hidden",
        ...style,
      }}
    />
  );
}
