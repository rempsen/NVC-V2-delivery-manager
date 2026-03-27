/**
 * NativeMapView — uses react-native-maps on iOS/Android (Apple Maps via PROVIDER_DEFAULT).
 * On web, delegates to GoogleMapView (JS API iframe embed).
 *
 * IMPORTANT: react-native-maps MUST be imported at the top level — NOT inside a function
 * via require(). Inline require() causes "Cannot read property 'default' of undefined"
 * in Expo Go because the native module hasn't registered yet when the component renders.
 */
import React from "react";
import { Platform, View, Text, StyleSheet } from "react-native";

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
  customerName?: string;
  jobAddress?: string;
  jobLatitude: number;
  jobLongitude: number;
  status: string;
}

export interface NativeMapViewProps {
  technicians?: MapTechnician[];
  tasks?: MapTask[];
  selectedId?: number | null;
  onSelectTech?: (id: number) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  /** Single destination pin (for customer tracking / task detail) */
  destination?: { lat: number; lng: number; label?: string };
}

// ─── Web: delegate to GoogleMapView ──────────────────────────────────────────
function WebMapView(props: NativeMapViewProps) {
  // Dynamic import to avoid bundling the web-only GoogleMapView on native
  const { GoogleMapView } = require("@/components/google-map-view");
  return (
    <GoogleMapView
      technicians={props.technicians}
      selectedId={props.selectedId}
      onSelectTech={props.onSelectTech}
      center={props.center}
      zoom={props.zoom}
      height={props.height ?? 300}
      destination={props.destination}
    />
  );
}

// ─── Native: react-native-maps (top-level static import) ─────────────────────
// Top-level import is required — inline require() inside component body crashes
// in Expo Go because the native module may not be registered yet at render time.
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

const STATUS_COLORS: Record<string, string> = {
  online: "#22C55E",
  available: "#22C55E",
  busy: "#F59E0B",
  on_job: "#F59E0B",
  en_route: "#8B5CF6",
  offline: "#6B7280",
  on_break: "#3B82F6",
};

const TASK_COLORS: Record<string, string> = {
  unassigned: "#F59E0B",
  assigned: "#3B82F6",
  en_route: "#8B5CF6",
  on_site: "#06B6D4",
  completed: "#22C55E",
  cancelled: "#EF4444",
};

function NativeOnlyMapView(props: NativeMapViewProps) {
  const centerLat = props.center?.lat ?? props.technicians?.[0]?.latitude ?? 49.8951;
  const centerLng = props.center?.lng ?? props.technicians?.[0]?.longitude ?? -97.1384;

  // Convert zoom level (0–22) to latitudeDelta approximation
  const zoom = props.zoom ?? 11;
  const latDelta = (360 / Math.pow(2, zoom)) * 0.8;
  const lngDelta = latDelta * 1.5;

  return (
    <View style={[styles.container, props.height != null ? { height: props.height } : { flex: 1 }]}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={false}
      >
        {/* Destination pin */}
        {props.destination && (
          <Marker
            coordinate={{ latitude: props.destination.lat, longitude: props.destination.lng }}
            title={props.destination.label ?? "Destination"}
            pinColor="#EF4444"
          />
        )}

        {/* Task/job markers */}
        {(props.tasks ?? [])
          .filter((t) => t.jobLatitude && t.jobLongitude && t.status !== "completed" && t.status !== "cancelled")
          .map((task) => (
            <Marker
              key={`task-${task.id}`}
              coordinate={{ latitude: task.jobLatitude, longitude: task.jobLongitude }}
              title={task.customerName ?? "Job"}
              description={task.jobAddress ?? ""}
              pinColor={TASK_COLORS[task.status] ?? "#F59E0B"}
            />
          ))}

        {/* Technician markers */}
        {(props.technicians ?? [])
          .filter((t) => t.latitude && t.longitude && t.status !== "offline")
          .map((tech) => (
            <Marker
              key={`tech-${tech.id}`}
              coordinate={{ latitude: tech.latitude, longitude: tech.longitude }}
              title={tech.name}
              description={tech.status.replace("_", " ")}
              pinColor={props.selectedId === tech.id ? "#1E6FBF" : (STATUS_COLORS[tech.status] ?? "#6B7280")}
              onPress={() => props.onSelectTech?.(tech.id)}
            />
          ))}
      </MapView>
    </View>
  );
}

// ─── Unified export ───────────────────────────────────────────────────────────
export function NativeMapView(props: NativeMapViewProps) {
  if (Platform.OS === "web") {
    return <WebMapView {...props} />;
  }
  return <NativeOnlyMapView {...props} />;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
  },
});
