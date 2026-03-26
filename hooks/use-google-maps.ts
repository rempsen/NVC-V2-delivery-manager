/**
 * useGoogleMaps — loads the Google Maps JavaScript API on web.
 *
 * Fetches the API key from the server via tRPC (system.getPublicConfig),
 * then injects the Maps JS script into the document head.
 * Returns { isLoaded, error } so components can wait before rendering a map.
 */
import { useState, useEffect } from "react";
import { Platform } from "react-native";
import { trpc } from "@/lib/trpc";

let scriptPromise: Promise<void> | null = null;

function loadMapsScript(apiKey: string): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if ((window as any).google?.maps) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: config } = trpc.system.getPublicConfig.useQuery(undefined, {
    staleTime: Infinity,
  });

  useEffect(() => {
    if (Platform.OS !== "web") {
      setIsLoaded(true);
      return;
    }
    if (!config?.googleMapsApiKey) return;

    loadMapsScript(config.googleMapsApiKey)
      .then(() => setIsLoaded(true))
      .catch((e) => setError(e.message));
  }, [config?.googleMapsApiKey]);

  return { isLoaded, error, apiKey: config?.googleMapsApiKey ?? "" };
}
