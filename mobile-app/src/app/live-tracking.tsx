import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { Colors } from "@/constants/colors";
import {
  MUNICIPALITY_COORDINATES,
  resolveCoordinatesFromAddress,
} from "@/constants/orientalMindoroLocations";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { getBookingLocation } from "@/services/bookingService";

export default function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bookingId?: string;
    vehicleName?: string;
    title?: string;
    type?: string;
    mode?: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    lat?: string;
    lng?: string;
  }>();

  const isPickupView = params.type === "pickup" || params.mode === "pickup";
  const bookingId = params.bookingId;
  const screenTitle = params.title || (isPickupView ? "Pickup Location" : "Live GPS Telemetry");
  const vehicleName = params.vehicleName || "Vehicle";

  const webViewRef = useRef<WebView>(null);
  const [activeLayer, setActiveLayer] = useState<"streets" | "satellite">("streets");

  const rawLat = params.latitude || params.lat;
  const rawLng = params.longitude || params.lng;
  const parsedLat = rawLat && !isNaN(Number(rawLat)) ? Number(rawLat) : null;
  const parsedLng = rawLng && !isNaN(Number(rawLng)) ? Number(rawLng) : null;

  // Resolve fallback coordinates based on address
  const addressFallbackCoords = resolveCoordinatesFromAddress(params.address);

  // Validate if passed coordinates are within Oriental Mindoro
  const isValidMindoroCoord = (lat: number | null, lng: number | null) =>
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 12.0 &&
    lat <= 14.0 &&
    lng >= 120.5 &&
    lng <= 122.0 &&
    // Guard against the corrupted Puerto Galera mountain glitch coordinate (13.4115, 120.9575)
    !(Math.abs(lat - 13.4115) < 0.001 && Math.abs(lng - 120.9575) < 0.001);

  // Check if passed coordinates are just generic municipality defaults
  const isGenericMunCoord = (lat: number | null, lng: number | null) => {
    if (!lat || !lng) return true;
    for (const mun of Object.values(MUNICIPALITY_COORDINATES)) {
      if (Math.abs(lat - mun.latitude) < 0.0002 && Math.abs(lng - mun.longitude) < 0.0002) {
        return true;
      }
    }
    return false;
  };

  const hasSpecificBarangayFallback =
    addressFallbackCoords.latitude !== 13.4115 || addressFallbackCoords.longitude !== 121.1803;

  const initialLat =
    isValidMindoroCoord(parsedLat, parsedLng) &&
    (!isGenericMunCoord(parsedLat, parsedLng) || !hasSpecificBarangayFallback)
      ? parsedLat!
      : addressFallbackCoords.latitude;

  const initialLng =
    isValidMindoroCoord(parsedLat, parsedLng) &&
    (!isGenericMunCoord(parsedLat, parsedLng) || !hasSpecificBarangayFallback)
      ? parsedLng!
      : addressFallbackCoords.longitude;

  const [trackingData, setTrackingData] = useState<{
    booking_id?: number;
    vehicle_name?: string;
    status?: string;
    current_latitude?: number;
    current_longitude?: number;
    current_street?: string;
    current_barangay?: string;
    current_city?: string;
    current_location_address?: string;
    current_speed?: number;
    last_location_updated_at?: string;
    last_updated_human?: string;
  } | null>(null);

  const [loading, setLoading] = useState(!isPickupView);
  const [initialCoordinates, setInitialCoordinates] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: initialLat,
    longitude: initialLng,
  });

  // If viewing a static pickup location
  useEffect(() => {
    if (isPickupView) {
      setLoading(false);
      const targetLat =
        isValidMindoroCoord(parsedLat, parsedLng) &&
        (!isGenericMunCoord(parsedLat, parsedLng) || !hasSpecificBarangayFallback)
          ? parsedLat!
          : addressFallbackCoords.latitude;
      const targetLng =
        isValidMindoroCoord(parsedLat, parsedLng) &&
        (!isGenericMunCoord(parsedLat, parsedLng) || !hasSpecificBarangayFallback)
          ? parsedLng!
          : addressFallbackCoords.longitude;

      setInitialCoordinates({
        latitude: targetLat,
        longitude: targetLng,
      });

      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "UPDATE_LOCATION",
            latitude: targetLat,
            longitude: targetLng,
          })
        );
      }
    }
  }, [isPickupView, parsedLat, parsedLng, params.address]);

  // If viewing live GPS for an active booking, poll every 5s
  useEffect(() => {
    if (isPickupView || !bookingId) return;

    let isMounted = true;

    const fetchLocation = async (isFirst = false) => {
      try {
        if (isFirst) setLoading(true);
        const res = await getBookingLocation(bookingId);
        if (res.success && res.data && isMounted) {
          setTrackingData(res.data);

          const lat = res.data.current_latitude ? Number(res.data.current_latitude) : null;
          const lng = res.data.current_longitude ? Number(res.data.current_longitude) : null;

          if (lat && lng && Number.isFinite(lat) && Number.isFinite(lng)) {
            if (!initialCoordinates) {
              setInitialCoordinates({ latitude: lat, longitude: lng });
            } else if (webViewRef.current) {
              webViewRef.current.postMessage(
                JSON.stringify({
                  type: "UPDATE_LOCATION",
                  latitude: lat,
                  longitude: lng,
                })
              );
            }
          }
        }
      } catch (err) {
        console.error("Live tracking fetch error:", err);
      } finally {
        if (isFirst && isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLocation(true);

    const poller = setInterval(() => {
      fetchLocation(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(poller);
    };
  }, [isPickupView, bookingId]);

  const handleRecenter = () => {
    const lat = isPickupView
      ? initialCoordinates?.latitude
      : trackingData?.current_latitude
      ? Number(trackingData.current_latitude)
      : initialCoordinates?.latitude;

    const lng = isPickupView
      ? initialCoordinates?.longitude
      : trackingData?.current_longitude
      ? Number(trackingData.current_longitude)
      : initialCoordinates?.longitude;

    if (lat && lng && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "RECENTER_TO_LOCATION",
          latitude: lat,
          longitude: lng,
        })
      );
    }
  };

  const handleOpenDirections = () => {
    const lat = initialCoordinates.latitude;
    const lng = initialCoordinates.longitude;
    const label = encodeURIComponent(params.address || vehicleName || "Pickup Location");
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });

    Linking.canOpenURL(url!)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url!);
        } else {
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      });
  };

  // Compile clean, human-readable single paragraph address
  const getSingleParagraphAddress = () => {
    if (isPickupView) {
      return params.address || "Pickup and meetup location designated by the host.";
    }

    if (!trackingData) {
      return "Acquiring live GPS location from renter's mobile device...";
    }

    const parts = [];
    if (trackingData.current_street) parts.push(trackingData.current_street);
    if (trackingData.current_barangay) parts.push(trackingData.current_barangay);
    if (trackingData.current_city) parts.push(trackingData.current_city);

    if (parts.length > 0) {
      return parts.join(", ");
    }

    if (trackingData.current_location_address) {
      return trackingData.current_location_address;
    }

    return "Live location active in Mindoro.";
  };

  const createMapHtml = () => {
    const lat = initialCoordinates.latitude;
    const lng = initialCoordinates.longitude;

    return `
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
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }

    /* Center Marker Pin with Golden Pulse matching Current Location map */
    .location-marker-wrapper {
      position: relative;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .location-glow {
      position: absolute;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: rgba(254, 193, 3, 0.16);
      animation: locationPulse 2.2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }
    .location-glow-inner {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(254, 193, 3, 0.32);
      animation: locationPulseInner 2.2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }
    .location-marker {
      position: relative;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #FEC103;
      border: 3px solid #FFFFFF;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
      z-index: 10;
    }
    .location-marker::after {
      content: "";
      position: absolute;
      width: 6px;
      height: 6px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: #FFFFFF;
    }
    @keyframes locationPulse {
      0% { transform: scale(0.6); opacity: 0.9; }
      75% { transform: scale(1.3); opacity: 0.1; }
      100% { transform: scale(1.35); opacity: 0; }
    }
    @keyframes locationPulseInner {
      0% { transform: scale(0.7); opacity: 0.8; }
      60% { transform: scale(1.15); opacity: 0; }
      100% { transform: scale(1.2); opacity: 0; }
    }

    /* Bubble Popup with Tip pointing to Pin */
    .leaflet-popup {
      margin-bottom: 6px;
    }
    .leaflet-popup-content-wrapper {
      background: #FFFFFF !important;
      border-radius: 14px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
      padding: 3px !important;
    }
    .leaflet-popup-content {
      margin: 10px 14px !important;
      line-height: 1.4 !important;
    }
    .leaflet-popup-tip {
      background: #FFFFFF !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12) !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const initLat = ${lat};
    const initLng = ${lng};
    let currentMode = "${activeLayer}";

    window.map = L.map("map", {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    }).setView([initLat, initLng], 16);

    // 1. Watermark-free, official Esri World Street Map (consistent with Current Location)
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

    if (currentMode === "satellite") {
      satelliteLayer.addTo(window.map);
    } else {
      streetsLayer.addTo(window.map);
    }

    function switchLayer(mode) {
      currentMode = mode;
      if (mode === "streets") {
        window.map.removeLayer(satelliteLayer);
        if (!window.map.hasLayer(streetsLayer)) streetsLayer.addTo(window.map);
      } else if (mode === "satellite") {
        window.map.removeLayer(streetsLayer);
        satelliteLayer.addTo(window.map);
      }
      setTimeout(function() { if (window.map) window.map.invalidateSize(); }, 100);
    }

    const markerIcon = L.divIcon({
      className: "",
      html: '<div class="location-marker-wrapper"><div class="location-glow"></div><div class="location-glow-inner"></div><div class="location-marker"></div></div>',
      iconSize: [64, 64],
      iconAnchor: [32, 32],
      popupAnchor: [0, -22],
    });

    const marker = L.marker([initLat, initLng], {
      icon: markerIcon,
      interactive: true,
    }).addTo(window.map);

    const titleText = ${JSON.stringify(screenTitle)};
    const descText = ${JSON.stringify(params.address || vehicleName)};
    marker.bindPopup(\`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2px; min-width: 170px;">
        <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 3px;">\${titleText}</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.35; margin-bottom: 6px;">\${descText}</div>
        <div style="display: inline-block; font-size: 9.5px; font-weight: 700; color: #FFFFFF; background: #FEC103; padding: 2px 7px; border-radius: 4px;">
          ${isPickupView ? "Official Garage Hub" : "Active GPS Vehicle"}
        </div>
      </div>
    \`).openPopup();

    function handleReactNativeMessage(event) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "UPDATE_LOCATION" || data.type === "RECENTER_TO_LOCATION") {
          const mLat = Number(data.latitude);
          const mLng = Number(data.longitude);
          if (Number.isFinite(mLat) && Number.isFinite(mLng)) {
            marker.setLatLng([mLat, mLng]);
            window.map.flyTo([mLat, mLng], currentMode === "satellite" ? 17 : 16, {
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
      if (window.map) {
        window.map.invalidateSize();
      }
    }, 200);
  </script>
</body>
</html>
`;
  };

  const currentLat = initialCoordinates.latitude;
  const currentLng = initialCoordinates.longitude;

  const handleLayerSwitch = (mode: "streets" | "satellite") => {
    setActiveLayer(mode);
    webViewRef.current?.injectJavaScript(`switchLayer('${mode}'); true;`);
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar matching Current Location screen */}
      {/* Streamlined Compact Header (Single Row for Maximum Map Space) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 48) }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.dark} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.title} numberOfLines={1}>{screenTitle}</Text>
          </View>

          {/* Streets and Satellite layer selector */}
          <View style={styles.layerSelector}>
            <TouchableOpacity
              style={[styles.layerButton, activeLayer === "streets" && styles.layerButtonActive]}
              onPress={() => handleLayerSwitch("streets")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="map"
                size={12}
                color={activeLayer === "streets" ? Colors.white : Colors.secondary}
              />
              <Text
                style={[
                  styles.layerButtonText,
                  activeLayer === "streets" && styles.layerButtonTextActive,
                ]}
              >
                Map
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.layerButton, activeLayer === "satellite" && styles.layerButtonActive]}
              onPress={() => handleLayerSwitch("satellite")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="earth"
                size={12}
                color={activeLayer === "satellite" ? Colors.white : Colors.secondary}
              />
              <Text
                style={[
                  styles.layerButtonText,
                  activeLayer === "satellite" && styles.layerButtonTextActive,
                ]}
              >
                Satellite
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Map Container matching Current Location screen */}
      <View style={styles.mapContainer}>
        {loading && !initialCoordinates ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading map coordinates...</Text>
          </View>
        ) : (
          <WebView
            key={`${currentLat}_${currentLng}_${isPickupView}`}
            ref={webViewRef}
            source={{ html: createMapHtml() }}
            style={styles.map}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            geolocationEnabled
            onLoadEnd={() => {
              webViewRef.current?.injectJavaScript(`
                if (window.map) {
                  window.map.invalidateSize();
                }
                true;
              `);
            }}
          />
        )}

        {/* Live Telemetry Speed Badge (only for active GPS tracking) */}
        {!isPickupView && (
          <View style={styles.floatingSpeedBadge}>
            <MaterialCommunityIcons name="speedometer" size={17} color={Colors.dark} />
            <Text style={styles.floatingSpeedText}>
              {trackingData?.current_speed !== undefined && trackingData?.current_speed !== null
                ? `${trackingData.current_speed} km/h`
                : "0 km/h"}
            </Text>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>LIVE</Text>
            </View>
          </View>
        )}

        {/* Floating Recenter Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.myLocationButton}
          onPress={handleRecenter}
        >
          <View style={styles.myLocationIcon}>
            <View style={styles.myLocationDot} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet without duplicate messages */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom + 12, Spacing.xl) }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetTitleRow}>
          <Text style={styles.locationTitle}>
            {isPickupView ? "Pickup Location" : "Current Vehicle Location"}
          </Text>

          {!isPickupView && trackingData?.last_updated_human && (
            <Text style={styles.timestampText}>{trackingData.last_updated_human}</Text>
          )}
        </View>

        <Text style={styles.addressText}>{getSingleParagraphAddress()}</Text>

        {isPickupView ? (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleOpenDirections}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={17} color={Colors.dark} />
            <Text style={styles.confirmText}>Get Directions</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.white,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  layerSelector: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.full,
    padding: 2.5,
    alignSelf: "center",
    gap: 2,
  },
  layerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: Radius.full,
  },
  layerButtonActive: {
    backgroundColor: Colors.dark,
  },
  layerButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.secondary,
  },
  layerButtonTextActive: {
    color: Colors.white,
  },
  mapContainer: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E8E6DF",
  },
  map: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8E6DF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
  },
  mapInstruction: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: "center",
  },
  mapInstructionText: {
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  myLocationButton: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  myLocationIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  myLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  floatingSpeedBadge: {
    position: "absolute",
    top: 54,
    left: 14,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  floatingSpeedText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  activePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    color: "#166534",
  },
  bottomSheet: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 10,
    backgroundColor: "#D9D9D9",
    marginBottom: Spacing.md,
  },
  sheetTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },
  timestampText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#10B981",
  },
  addressText: {
    marginTop: 4,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.dark,
    lineHeight: 22,
  },
  locationText: {
    marginTop: 3,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },
  confirmButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  confirmText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },
});
