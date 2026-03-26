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
import React, { useEffect, useRef, useCallback } from "react";
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
}

export function GoogleMapView({
  technicians = [],
  tasks = [],
  selectedId,
  onSelectTech,
  center = { lat: 49.8951, lng: -97.1384 }, // Winnipeg default
  zoom = 11,
  height = 500,
}: GoogleMapViewProps) {
  const { isLoaded, error } = useGoogleMaps();
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

      const svgMarker = {
        path: G.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: isSelected ? "#fff" : color,
        strokeWeight: isSelected ? 3 : 1.5,
        scale: isSelected ? 14 : 10,
      };

      if (markersRef.current.has(key)) {
        const existing = markersRef.current.get(key)!;
        existing.setPosition({ lat: tech.latitude, lng: tech.longitude });
        existing.setIcon(svgMarker);
      } else {
        const marker = new G.Marker({
          position: { lat: tech.latitude, lng: tech.longitude },
          map,
          icon: svgMarker,
          title: tech.name,
          zIndex: isSelected ? 100 : 10,
        });

        marker.addListener("click", () => {
          infoWindow.setContent(`
            <div style="font-family: -apple-system, sans-serif; padding: 4px 2px; min-width: 160px;">
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${tech.name}</div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                <span style="font-size: 12px; color: #555; text-transform: capitalize;">${tech.status.replace("_", " ")}</span>
              </div>
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
        height: height,
        borderRadius: 12,
        overflow: "hidden",
      }}
    />
  );
}
