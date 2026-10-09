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
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { getBookingLocation } from "@/services/bookingService";

export default function LiveTrackingScreen() {
  const params = useLocalSearchParams<{
    bookingId?: string;
    vehicleName?: string;
    title?: string;
    type?: "pickup" | "live_gps";
    address?: string;
    latitude?: string;
    longitude?: string;
  }>();

  const isPickupView = params.type === "pickup";
  const bookingId = params.bookingId;
  const screenTitle = params.title || (isPickupView ? "Pickup Location" : "Live GPS Telemetry");
  const vehicleName = params.vehicleName || "Vehicle";

  const webViewRef = useRef<WebView>(null);

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

  const [loading, setLoading] = useState(true);
  const [initialCoordinates, setInitialCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    params.latitude && params.longitude && !isNaN(Number(params.latitude)) && !isNaN(Number(params.longitude))
      ? { latitude: Number(params.latitude), longitude: Number(params.longitude) }
      : null
  );

  // If viewing a static pickup location
  useEffect(() => {
    if (isPickupView) {
      setLoading(false);
      if (params.latitude && params.longitude) {
        setInitialCoordinates({
          latitude: Number(params.latitude),
          longitude: Number(params.longitude),
        });
      }
    }
  }, [isPickupView, params.latitude, params.longitude]);

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
    const lat = initialCoordinates?.latitude ?? 13.4115;
    const lng = initialCoordinates?.longitude ?? 120.9575;
    const pinColor = isPickupView ? "#10B981" : "#2563EB";
    const pulseColor = isPickupView ? "rgba(16, 185, 129, 0.25)" : "rgba(37, 99, 235, 0.25)";
    
    // SVG icon for marker inside Ride4Rent badge
    const svgIcon = isPickupView
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FEC103" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #F4F3F0;
    }
    body {
      overflow: hidden;
      overscroll-behavior: none;
      touch-action: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-control-zoom {
      display: none !important;
    }
    .leaflet-container .leaflet-tile {
      image-rendering: auto;
    }
    .leaflet-control-attribution {
      font-size: 8px;
      color: #71717A;
      background: rgba(255, 255, 255, 0.75);
      border-radius: 4px;
      padding: 2px 6px;
      margin: 6px !important;
      backdrop-filter: blur(4px);
    }

    .marker-container {
      position: relative;
      width: 54px;
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .marker-pulse {
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: ${isPickupView ? "rgba(16, 185, 129, 0.25)" : "rgba(254, 193, 3, 0.35)"};
      animation: pinPulse 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    }

    .marker-pin {
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: ${isPickupView ? "#10B981" : "#1A1A1A"};
      border: 2.5px solid ${isPickupView ? "#FFFFFF" : "#FEC103"};
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    @keyframes pinPulse {
      0% {
        transform: scale(0.65);
        opacity: 0.95;
      }
      70% {
        transform: scale(1.4);
        opacity: 0;
      }
      100% {
        transform: scale(1.4);
        opacity: 0;
      }
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const initLat = ${lat};
    const initLng = ${lng};

    const map = L.map("map", {
      zoomControl: false,
      attributionControl: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: false,
    }).setView([initLat, initLng], 16);

    // Esri Light Gray Canvas (Ultra-clean, modern light minimalist map - 100% free, no watermark)
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      maxNativeZoom: 16,
      maxZoom: 19,
      minZoom: 3,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    }).addTo(map);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
      maxNativeZoom: 16,
      maxZoom: 19,
      minZoom: 3,
    }).addTo(map);

    const customIcon = L.divIcon({
      className: "",
      html: \`
        <div class="marker-container">
          <div class="marker-pulse"></div>
          <div class="marker-pin">${svgIcon}</div>
        </div>
      \`,
      iconSize: [54, 54],
      iconAnchor: [27, 27],
    });

    const marker = L.marker([initLat, initLng], {
      icon: customIcon,
      interactive: false,
    }).addTo(map);

    function handleReactNativeMessage(event) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data.type === "UPDATE_LOCATION" || data.type === "RECENTER_TO_LOCATION") {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);

          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            marker.setLatLng([lat, lng]);
            map.flyTo([lat, lng], 16, {
              animate: true,
              duration: 0.9,
            });
          }
        }
      } catch (e) {
        console.error("Leaflet message error:", e);
      }
    }

    document.addEventListener("message", handleReactNativeMessage);
    window.addEventListener("message", handleReactNativeMessage);
  </script>
</body>
</html>
`;
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

      {/* Interactive Map View */}
      <View style={styles.mapWrapper}>
        {loading && !initialCoordinates ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading map coordinates...</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: createMapHtml() }}
            style={styles.map}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            geolocationEnabled
          />
        )}

        {/* Live Telemetry Speed Badge (only for active GPS tracking) */}
        {!isPickupView && (
          <View style={styles.floatingSpeedBadge}>
            <MaterialCommunityIcons name="speedometer" size={17} color="#2563EB" />
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

      {/* Bottom Simplified Location Card */}
      <View style={styles.bottomCard}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name={isPickupView ? "location" : "navigate-circle"}
              size={18}
              color={isPickupView ? "#10B981" : "#2563EB"}
            />
            <Text style={styles.cardHeaderTitle}>
              {isPickupView ? "PICKUP ADDRESS" : "CURRENT LOCATION"}
            </Text>
          </View>

          {!isPickupView && trackingData?.last_updated_human && (
            <Text style={styles.timestampText}>
              {trackingData.last_updated_human}
            </Text>
          )}
        </View>

        {/* Clean Single Paragraph Address Text */}
        <Text style={styles.addressParagraph}>
          {getSingleParagraphAddress()}
        </Text>
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
    paddingBottom: 12,
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
  mapWrapper: {
    flex: 1,
    position: "relative",
    backgroundColor: Colors.white,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
    paddingBottom: Spacing.xl,
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
});
