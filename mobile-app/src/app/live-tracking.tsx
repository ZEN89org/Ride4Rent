import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";

import { Colors } from "@/constants/colors";
import {
  MUNICIPALITY_COORDINATES,
  resolveCoordinatesFromAddress,
} from "@/constants/orientalMindoroLocations";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { getBookingLocation } from "@/services/bookingService";

export default function LiveTrackingScreen() {
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
    const pinColor = "#FEC103";
    const pulseColor = "rgba(254, 193, 3, 0.45)";

    const svgIcon = isPickupView
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;

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

    /* Marker: Golden Circular Pin with Pulse */
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
      background: ${pulseColor};
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
      background: ${pinColor};
      border: 3px solid #FFFFFF;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .marker-pin:active {
      transform: scale(0.92);
    }

    /* Bubble Chat Popup with Tip pointing to Pin */
    .leaflet-popup {
      margin-bottom: 6px;
    }
    .leaflet-popup-content-wrapper {
      background: #FFFFFF !important;
      border-radius: 14px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22) !important;
      padding: 3px !important;
    }
    .leaflet-popup-content {
      margin: 10px 14px !important;
      line-height: 1.4 !important;
    }
    .leaflet-popup-tip {
      background: #FFFFFF !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15) !important;
    }
    .leaflet-container a.leaflet-popup-close-button {
      top: 8px !important;
      right: 10px !important;
      color: #94A3B8 !important;
      font-size: 16px !important;
      font-weight: 700 !important;
    }
    .leaflet-container a.leaflet-popup-close-button:hover {
      color: #0F172A !important;
    }

    /* Zoom control styling */
    .leaflet-control-zoom {
      top: 14px !important;
      left: 14px !important;
      border: none !important;
      border-radius: 10px !important;
      overflow: hidden !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18) !important;
    }
    .leaflet-control-zoom a {
      width: 36px !important;
      height: 36px !important;
      line-height: 36px !important;
      font-size: 16px !important;
      color: #0F172A !important;
      background: #FFFFFF !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const initLat = ${lat};
    const initLng = ${lng};
    let currentMode = "streets";

    window.map = L.map("map", {
      zoomControl: true,
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

    // 2. High-Resolution Google Hybrid Satellite with Roads & Place Labels (maxZoom 20, zero missing tiles)
    const satelliteLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
      minZoom: 3,
      keepBuffer: 6,
    });

    // Default start with Streets
    streetsLayer.addTo(window.map);

    function switchLayer(mode) {
      currentMode = mode;

      if (mode === "streets") {
        window.map.removeLayer(satelliteLayer);
        if (!window.map.hasLayer(streetsLayer)) streetsLayer.addTo(window.map);
        window.map.flyTo([initLat, initLng], 16, { animate: true, duration: 0.5 });
      } else if (mode === "satellite") {
        window.map.removeLayer(streetsLayer);
        satelliteLayer.addTo(window.map);
        window.map.flyTo([initLat, initLng], 17, { animate: true, duration: 0.5 });
      }

      setTimeout(function() {
        if (window.map) window.map.invalidateSize();
      }, 150);
    }

    // Circular Golden Pin Marker with Bubble Chat
    const customIcon = L.divIcon({
      className: "",
      html: \`
        <div class="marker-wrap">
          <div class="marker-pulse"></div>
          <div class="marker-pin">
            ${svgIcon}
          </div>
        </div>
      \`,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      popupAnchor: [0, -28],
    });

    const marker = L.marker([initLat, initLng], {
      icon: customIcon,
      interactive: true,
    }).addTo(window.map);

    const titleText = ${JSON.stringify(screenTitle)};
    const descText = ${JSON.stringify(params.address || vehicleName)};
    marker.bindPopup(\`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2px; min-width: 170px;">
        <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 3px;">\${titleText}</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.35; margin-bottom: 6px;">\${descText}</div>
        <div style="display: inline-block; font-size: 9.5px; font-weight: 700; color: #0F172A; background: #FEC103; padding: 2px 7px; border-radius: 4px;">
          ${isPickupView ? "Official Garage & Warehouse Hub" : "Active GPS Vehicle"}
        </div>
      </div>
    \`).openPopup();

    function handleReactNativeMessage(event) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data.type === "UPDATE_LOCATION" || data.type === "RECENTER_TO_LOCATION") {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);

          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            marker.setLatLng([lat, lng]);
            window.map.flyTo([lat, lng], currentMode === "satellite" ? 17 : 16, {
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
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.dark} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {screenTitle}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {vehicleName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.recenterHeaderBtn}
          onPress={handleRecenter}
          activeOpacity={0.7}
        >
          <Ionicons name="locate" size={19} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Single, Unified Layer Switcher Bar in Container */}
      <View style={styles.layerBar}>
        <TouchableOpacity
          style={[styles.layerPill, activeLayer === "streets" && styles.layerPillActive]}
          onPress={() => handleLayerSwitch("streets")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="map"
            size={14}
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
            size={14}
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

      {/* Interactive Map View */}
      <View style={styles.mapWrapper}>
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
          style={styles.floatingRecenterBtn}
          onPress={handleRecenter}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={19} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Bottom Location Card */}
      <View style={styles.bottomCard}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name={isPickupView ? "location" : "navigate-circle"}
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.cardHeaderTitle}>
              {isPickupView ? "PICKUP & GARAGE ADDRESS" : "CURRENT LOCATION"}
            </Text>
          </View>

          {!isPickupView && trackingData?.last_updated_human && (
            <Text style={styles.timestampText}>
              {trackingData.last_updated_human}
            </Text>
          )}
        </View>

        {/* Single Paragraph Address Text */}
        <Text style={styles.addressParagraph}>
          {getSingleParagraphAddress()}
        </Text>

        {isPickupView && (
          <View style={styles.badgesRow}>
            <View style={styles.infoBadge}>
              <Ionicons name="business-outline" size={12} color="#D97706" />
              <Text style={styles.infoBadgeText}>Host Garage / Warehouse</Text>
            </View>
          </View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 10,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 1,
  },
  recenterHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  layerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
    zIndex: 9,
  },
  layerPill: {
    flex: 1,
    maxWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  layerPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  layerPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  layerPillTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  mapWrapper: {
    flex: 1,
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
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.white,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
  },
  floatingSpeedBadge: {
    position: "absolute",
    top: 14,
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
  floatingRecenterBtn: {
    position: "absolute",
    bottom: 16,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bottomCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.secondary,
    letterSpacing: 0.6,
  },
  timestampText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#10B981",
  },
  addressParagraph: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 21,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  infoBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: "#92400E",
  },
});
