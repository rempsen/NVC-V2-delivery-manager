/**
 * NativeMapView — uses react-native-maps on iOS/Android with Google Maps provider.
 * On web, delegates to GoogleMapView (JS API iframe embed).
 * This component is the single source of truth for all map rendering in the app.
 */
import React from "react";
import { Platform, View, StyleSheet } from "react-native";

export interface MapTechnician {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  transportType?: string;
}

export interface NativeMapViewProps {
  technicians?: MapTechnician[];
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

// ─── Native: react-native-maps ────────────────────────────────────────────────
function NativeOnlyMapView(props: NativeMapViewProps) {
  // Lazy import so web bundler never processes react-native-maps
  const MapView = require("react-native-maps").default;
  const { Marker, PROVIDER_GOOGLE } = require("react-native-maps");

  const STATUS_COLORS: Record<string, string> = {
    online: "#22C55E",
    available: "#22C55E",
    busy: "#F59E0B",
    on_job: "#F59E0B",
    en_route: "#8B5CF6",
    offline: "#6B7280",
    on_break: "#3B82F6",
  };

  const centerLat = props.center?.lat ?? props.technicians?.[0]?.latitude ?? 49.8951;
  const centerLng = props.center?.lng ?? props.technicians?.[0]?.longitude ?? -97.1384;

  // Convert zoom level (0-22) to latitudeDelta approximation
  const zoom = props.zoom ?? 11;
  const latDelta = 360 / Math.pow(2, zoom) * 0.8;
  const lngDelta = latDelta * 1.5;

  return (
    <View style={[styles.container, { height: props.height ?? 300 }]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        showsUserLocation={false}
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

        {/* Technician markers */}
        {(props.technicians ?? []).map((tech) => {
          const color = STATUS_COLORS[tech.status] ?? "#6B7280";
          const isSelected = props.selectedId === tech.id;
          return (
            <Marker
              key={tech.id}
              coordinate={{ latitude: tech.latitude, longitude: tech.longitude }}
              title={tech.name}
              description={tech.status.replace("_", " ")}
              pinColor={isSelected ? "#FFFFFF" : color}
              onPress={() => props.onSelectTech?.(tech.id)}
            />
          );
        })}
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
    borderRadius: 12,
  },
});
