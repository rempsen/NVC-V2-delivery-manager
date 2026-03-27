const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude react-native-maps from web bundle (it imports native-only modules)
// On web, NativeMapView returns null so the import is never reached.
config.resolver = config.resolver ?? {};
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Exclude react-native-maps and all its sub-modules from web bundle
  if (platform === "web" && (moduleName === "react-native-maps" || moduleName.startsWith("react-native-maps/"))) {
    return { type: "empty" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
