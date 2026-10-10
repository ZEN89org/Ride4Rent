import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";

type LocationData = {
  latitude: number;
  longitude: number;
};

type AddressData = {
  street?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  district?: string | null;
  subregion?: string | null;
  region?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
};

// Default center: Oriental Mindoro (Calapan / Central Mindoro)
const DEFAULT_COORDS: LocationData = {
  latitude: 13.4115,
  longitude: 121.1803,
};

export default function CurrentLocation() {
  const webViewRef = useRef<WebView>(null);

  const [activeLayer, setActiveLayer] = useState<"streets" | "satellite">("streets");
  const [selectedCoords, setSelectedCoords] = useState<LocationData>(DEFAULT_COORDS);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [hasResolvedGps, setHasResolvedGps] = useState(false);

  useEffect(() => {
    // Start locating immediately on mount
    fetchCurrentLocation(false);
  }, []);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      setGeocoding(true);
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (result && result.length > 0) {
        setAddress(result[0]);
      } else {
        // Fallback to nominatim if expo reverse geocode returns empty
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "Ride4Rent-App" } }
          );
          const data = await resp.json();
          if (data?.address) {
            setAddress({
              street: data.address.road || data.address.pedestrian || null,
              district: data.address.suburb || data.address.neighbourhood || data.address.village || null,
              city: data.address.city || data.address.town || data.address.municipality || "Oriental Mindoro",
              region: data.address.state || "MIMAROPA",
              formattedAddress: data.display_name || null,
            });
          }
        } catch {
          // silent fallback
        }
      }
    } catch (error) {
      console.log("Reverse geocode error:", error);
    } finally {
      setGeocoding(false);
    }
  };

  const updateSelectedLocation = async (latitude: number, longitude: number) => {
    const newCoords = { latitude, longitude };
    setSelectedCoords(newCoords);
    await reverseGeocode(latitude, longitude);
  };

  const fetchCurrentLocation = async (animateToMap = true) => {
    try {
      setLocating(true);

      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (requested.status !== "granted") {
          // If denied, reverse geocode the default coordinates
          await reverseGeocode(selectedCoords.latitude, selectedCoords.longitude);
          setLocating(false);
          return;
        }
      }

      // Check last known position first for instant responsiveness
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown && !hasResolvedGps) {
        const lastCoords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        setSelectedCoords(lastCoords);
        reverseGeocode(lastCoords.latitude, lastCoords.longitude);
        if (animateToMap) {
          sendLocationToMap(lastCoords.latitude, lastCoords.longitude);
        }
      }

      // Then fetch precise current GPS
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const preciseCoords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setSelectedCoords(preciseCoords);
      setHasResolvedGps(true);
      await reverseGeocode(preciseCoords.latitude, preciseCoords.longitude);
      sendLocationToMap(preciseCoords.latitude, preciseCoords.longitude);
    } catch (error) {
      console.log("GPS Location error:", error);
      // Ensure we have address for default coordinates
      if (!address) {
        reverseGeocode(selectedCoords.latitude, selectedCoords.longitude);
      }
    } finally {
      setLocating(false);
    }
  };

  const sendLocationToMap = (lat: number, lng: number) => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "RECENTER_TO_LOCATION",
        latitude: lat,
        longitude: lng,
      })
    );
  };

  const handleMapMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = typeof event.nativeEvent.data === "string"
        ? JSON.parse(event.nativeEvent.data)
        : event.nativeEvent.data;

      if (data.type === "MAP_MOVED" || data.type === "LOCATION_SELECTED") {
        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          await updateSelectedLocation(latitude, longitude);
        }
      }
    } catch (error) {
      console.log("Map message error:", error);
    }
  };

  const handleLayerSwitch = (mode: "streets" | "satellite") => {
    setActiveLayer(mode);
    webViewRef.current?.injectJavaScript(`switchLayer('${mode}'); true;`);
  };

  const getPrimaryAddress = () => {
    if (geocoding) return "Locating address...";
    if (!address) return "Oriental Mindoro";

    const street = [address.streetNumber, address.street].filter(Boolean).join(" ");
    if (street) return street;

    const district = address.district || address.subregion;
    if (district) return district;

    if (address.formattedAddress) {
      return address.formattedAddress.split(",")[0];
    }

    return "Selected Location";
  };

  const getSecondaryAddress = () => {
    if (!address) return "MIMAROPA, Philippines";

    const parts = [address.district, address.city, address.region].filter(Boolean);
    if (parts.length > 0) {
      return parts.slice(1).join(", ") || parts[0];
    }
    return "Oriental Mindoro, Philippines";
  };

  const handleConfirmLocation = () => {
    router.replace("/(tabs)/home");
  };

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #E8E6DF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }

    /* Fixed Center Pin that hovers over map center */
    .center-pin-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      z-index: 1000;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .marker-wrap {
      position: relative;
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .marker-pulse {
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(254, 193, 3, 0.45);
      animation: pinPulse 2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }

    @keyframes pinPulse {
      0% { transform: scale(0.6); opacity: 0.95; }
      75% { transform: scale(1.35); opacity: 0.1; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .marker-pin {
      position: relative;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #FEC103;
      border: 3px solid #1A1A1A;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .pin-shadow {
      width: 16px;
      height: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 50%;
      margin-top: 2px;
      filter: blur(1px);
    }

    /* Attribution & Zoom */
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>

  <div class="center-pin-container">
    <div class="marker-wrap">
      <div class="marker-pulse"></div>
      <div class="marker-pin">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
    <div class="pin-shadow"></div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const initLat = ${selectedCoords.latitude};
    const initLng = ${selectedCoords.longitude};
    let currentMode = "streets";

    const map = L.map("map", {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    }).setView([initLat, initLng], 16);

    // 1. Watermark-free, official Esri World Street Map (high-definition streets, barangays, POIs)
    const streetsLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      minZoom: 3,
      keepBuffer: 6,
    });

    // 2. High-Resolution Google Hybrid Satellite with Roads & Place Labels
    const satelliteLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
      minZoom: 3,
      keepBuffer: 6,
    });

    streetsLayer.addTo(map);

    function switchLayer(mode) {
      currentMode = mode;
      if (mode === "streets") {
        map.removeLayer(satelliteLayer);
        if (!map.hasLayer(streetsLayer)) streetsLayer.addTo(map);
      } else if (mode === "satellite") {
        map.removeLayer(streetsLayer);
        satelliteLayer.addTo(map);
      }
      setTimeout(function() {
        map.invalidateSize();
      }, 100);
    }

    let moveTimeout = null;
    map.on("moveend", function() {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(function() {
        const center = map.getCenter();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "MAP_MOVED",
            latitude: center.lat,
            longitude: center.lng,
          }));
        }
      }, 150);
    });

    map.on("click", function(e) {
      map.flyTo([e.latlng.lat, e.latlng.lng], map.getZoom(), {
        animate: true,
        duration: 0.5,
      });
    });

    function handleReactNativeMessage(event) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "RECENTER_TO_LOCATION") {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            map.flyTo([lat, lng], 16, {
              animate: true,
              duration: 0.8,
            });
          }
        } else if (data.type === "SWITCH_LAYER") {
          switchLayer(data.mode);
        }
      } catch (e) {
        console.error("Leaflet message error:", e);
      }
    }

    document.addEventListener("message", handleReactNativeMessage);
    window.addEventListener("message", handleReactNativeMessage);

    setTimeout(function() {
      if (map) {
        map.invalidateSize();
      }
    }, 200);
  </script>
</body>
</html>
  `;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeContainer}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.title}>Current Location</Text>
          <Text style={styles.subtitle}>
            Pan or tap the map to choose your rental search area
          </Text>
        </View>

        {/* Dual Layer Switcher (Streets & Satellite) */}
        <View style={styles.layerBar}>
          <TouchableOpacity
            style={[styles.layerPill, activeLayer === "streets" && styles.layerPillActive]}
            onPress={() => handleLayerSwitch("streets")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="map"
              size={13}
              color={activeLayer === "streets" ? Colors.white : Colors.secondary}
            />
            <Text
              style={[
                styles.layerPillText,
                activeLayer === "streets" && styles.layerPillTextActive,
              ]}
            >
              Streets
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerPill, activeLayer === "satellite" && styles.layerPillActive]}
            onPress={() => handleLayerSwitch("satellite")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="earth"
              size={13}
              color={activeLayer === "satellite" ? Colors.white : Colors.secondary}
            />
            <Text
              style={[
                styles.layerPillText,
                activeLayer === "satellite" && styles.layerPillTextActive,
              ]}
            >
              Satellite
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
          scrollEnabled={false}
          bounces={false}
        />

        {/* Floating Instruction Badge */}
        <View style={styles.mapBadge} pointerEvents="none">
          <Ionicons name="finger-print-outline" size={14} color={Colors.white} />
          <Text style={styles.mapBadgeText}>Drag map to adjust location pin</Text>
        </View>

        {/* Floating My Location (Recenter) Button */}
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={() => fetchCurrentLocation(true)}
          disabled={locating}
          activeOpacity={0.85}
        >
          {locating ? (
            <ActivityIndicator size="small" color={Colors.dark} />
          ) : (
            <Ionicons name="locate" size={22} color={Colors.dark} />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Card */}
      <View style={styles.bottomCard}>
        <View style={styles.handle} />

        <View style={styles.addressSection}>
          <View style={styles.addressIconWrap}>
            <Ionicons name="location" size={22} color={Colors.primary} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressPrimary} numberOfLines={1}>
              {getPrimaryAddress()}
            </Text>
            <Text style={styles.addressSecondary} numberOfLines={1}>
              {getSecondaryAddress()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmLocation}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.dark} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextGroup: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  layerBar: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.full,
    padding: 3,
    gap: 3,
  },
  layerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: Radius.full,
  },
  layerPillActive: {
    backgroundColor: Colors.dark,
  },
  layerPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.secondary,
  },
  layerPillTextActive: {
    color: Colors.white,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#E8E6DF",
  },
  map: {
    flex: 1,
  },
  mapBadge: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 50,
  },
  mapBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.white,
  },
  recenterButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 50,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  bottomCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === "ios" ? Spacing.xl + 8 : Spacing.xl,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  addressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.lg,
  },
  addressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  addressInfo: {
    flex: 1,
  },
  addressPrimary: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },
  addressSecondary: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },
});
