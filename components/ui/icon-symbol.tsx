import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navigation
  "house.fill": "home",
  "list.bullet": "list",
  "person.2.fill": "group",
  "gearshape.fill": "settings",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  // Tasks & Work Orders
  "doc.text.fill": "description",
  "doc.badge.plus": "note-add",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "clock.fill": "schedule",
  "exclamationmark.triangle.fill": "warning",
  "flag.fill": "flag",
  "map.fill": "map",
  "location.fill": "location-on",
  "location.north.fill": "navigation",
  "car.fill": "directions-car",
  "truck.box.fill": "local-shipping",
  // Communication
  "phone.fill": "phone",
  "message.fill": "chat",
  "envelope.fill": "email",
  "bell.fill": "notifications",
  "bell.badge.fill": "notifications-active",
  // People
  "person.fill": "person",
  "person.crop.circle.fill": "account-circle",
  "person.badge.plus": "person-add",
  // Actions
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "pencil": "edit",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "arrow.clockwise": "refresh",
  "magnifyingglass": "search",
  "xmark": "close",
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-vert",
  // Status
  "circle.fill": "circle",
  "dot.circle.fill": "radio-button-on",
  "checkmark": "check",
  "bolt.fill": "bolt",
  "wifi": "wifi",
  "wifi.slash": "wifi-off",
  // Media
  "camera.fill": "camera-alt",
  "photo.fill": "photo",
  "signature": "draw",
  // Finance
  "dollarsign.circle.fill": "monetization-on",
  "creditcard.fill": "credit-card",
  // Misc
  "info.circle.fill": "info",
  "questionmark.circle.fill": "help",
  "lock.fill": "lock",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "star.fill": "star",
  "building.2.fill": "business",
  "gauge.medium": "speed",
  "timer": "timer",
  "calendar": "calendar-today",
  "tag.fill": "label",
  "wrench.fill": "build",
  "hammer.fill": "handyman",
  "paintbrush.fill": "brush",
  // Auth & Social
  "apple.logo": "apple",
  "arrow.right.circle.fill": "arrow-circle-right",
  "arrow.triangle.2.circlepath": "sync",
  "arrow.up.doc.fill": "upload-file",
  "key.fill": "vpn-key",
  "doc.on.doc.fill": "content-copy",
  // Notifications & Settings
  "bell.slash.fill": "notifications-off",
  "at": "alternate-email",
  "phone.badge.plus": "add-call",
  "calendar.badge.clock": "event",
  "chart.bar.fill": "bar-chart",
  "person.3.fill": "groups",
  "shield.fill": "security",
  "shield.checkmark.fill": "verified-user",
  "checkmark.shield.fill": "verified-user",
  "person.crop.circle.badge.checkmark": "how-to-reg",
  "person.crop.circle.badge.xmark": "person-remove",
  "slider.horizontal.3": "tune",
  "toggles": "toggle-on",
  "waveform": "graphic-eq",
  "mic.fill": "mic",
  "paperclip": "attach-file",
} as unknown as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
