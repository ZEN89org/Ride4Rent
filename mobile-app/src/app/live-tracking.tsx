import { displayTripSpeed } from "@/utils/tripTelemetry";
import { useMapSheetGesture } from "@/hooks/useMapSheetGesture";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { Colors } from "@/constants/colors";
import { resolveCoordinatesFromAddress } from "@/constants/orientalMindoroLocations";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { getBookingLocation } from "@/services/bookingService";
import { publishCurrentTripLocation, watchCurrentTripLocation } from "@/services/tripLocationService";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePickupRoute } from "@/hooks/usePickupRoute";
import {
  isInServiceArea,
  SERVICE_AREA_ERROR,
  serviceAreaLockScript,
} from "@/utils/serviceArea";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [automaticRetryVersion, setAutomaticRetryVersion] = useState(0);
  const retryNeeded = useRef(false);
  const [updatingGps, setUpdatingGps] = useState(false);
  const [gpsIssue, setGpsIssue] = useState<string | null>(null);
  const params = useLocalSearchParams<{
    bookingId?: string;
    vehicleName?: string;
    renterName?: string;
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
  const screenTitle =
    params.title || (isPickupView ? "Pickup Location" : "Vehicle Location");
  const vehicleName = params.vehicleName || "Vehicle";

  const webViewRef = useRef<WebView>(null);
  const outsideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeLayer, setActiveLayer] = useState<"streets" | "satellite">("streets");
  const [attemptError, setOutsideError] = useState<string | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(true);
  const sheetPanHandlers = useMapSheetGesture(setIsSheetExpanded);


  const rawLat = params.latitude || params.lat;
  const rawLng = params.longitude || params.lng;
  const parsedLat = rawLat && !isNaN(Number(rawLat)) ? Number(rawLat) : null;
  const parsedLng = rawLng && !isNaN(Number(rawLng)) ? Number(rawLng) : null;

  // Resolve fallback coordinates based on address
  const addressFallbackCoords = resolveCoordinatesFromAddress(params.address);

  const initialLat = parsedLat ?? addressFallbackCoords.latitude;
  const initialLng = parsedLng ?? addressFallbackCoords.longitude;

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
    location_sharing_status?: "on" | "off" | "unavailable" | null;
    location_sharing_reason?: string | null;
    outside_service_area?: boolean | null;
    operator_latitude?: number;
    operator_longitude?: number;
    operator_address?: string;
    operator_business_name?: string;
    renter_name?: string;
    last_location_updated_at?: string;
    last_updated_human?: string;
  } | null>(null);

  const [loadedBookingId, setLoadedBookingId] = useState<string | null>(null);
  const loading = !isPickupView && Boolean(bookingId) && loadedBookingId !== String(bookingId);

  // Operator Location (Hub / Garage / Destination)
  const opLat =
    trackingData?.operator_latitude ??
    parsedLat ??
    initialLat;
  const opLng =
    trackingData?.operator_longitude ??
    parsedLng ??
    initialLng;
  const opBusinessName =
    trackingData?.operator_business_name ||
    (isPickupView ? params.vehicleName || "Operator Hub" : "Operator Garage Hub");
  const opAddress =
    trackingData?.operator_address ||
    params.address ||
    "Oriental Mindoro Hub";

  // Renter Live Telemetry Origin (if available from backend)
  const telemetryRenterLat = trackingData?.current_latitude != null
    ? Number(trackingData.current_latitude)
    : null;
  const telemetryRenterLng = trackingData?.current_longitude != null
    ? Number(trackingData.current_longitude)
    : null;

  const explicitOrigin = useMemo(() => {
    if (
      telemetryRenterLat !== null &&
      telemetryRenterLng !== null &&
      Number.isFinite(telemetryRenterLat) &&
      Number.isFinite(telemetryRenterLng)
    ) {
      return { latitude: telemetryRenterLat, longitude: telemetryRenterLng };
    }
    return null;
  }, [telemetryRenterLat, telemetryRenterLng]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const locationIsFresh = ["trip_in_progress", "ongoing", "return_pending"].includes(trackingData?.status || "") && trackingData?.location_sharing_status !== "off" && trackingData?.location_sharing_status !== "unavailable" && !!trackingData?.last_location_updated_at && now - Date.parse(trackingData.last_location_updated_at) < 45000;

  // Route trace between renter and operator (primary #FEC103)
  const routeHook = usePickupRoute(isPickupView, opLat, opLng, explicitOrigin);

  const renterName =
    trackingData?.renter_name ||
    params.renterName ||
    "Renter Location";

  const renterAddress = trackingData?.current_location_address || [trackingData?.current_street, trackingData?.current_barangay, trackingData?.current_city].filter(Boolean).join(", ") || (explicitOrigin ? `${explicitOrigin.latitude.toFixed(5)}, ${explicitOrigin.longitude.toFixed(5)}` : "Waiting for the renter’s GPS location");
  const outsideError = !isPickupView && trackingData?.outside_service_area
    ? "The renter’s GPS location is outside Oriental Mindoro. The operator has been notified."
    : isPickupView && !isInServiceArea(opLat, opLng) ? SERVICE_AREA_ERROR : attemptError;

  // Sync route and markers to Leaflet WebView
  const syncMapData = () => {
    if (!webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({
        type: "SYNC_MAP_DATA",
        operator: isPickupView ? {
          latitude: opLat,
          longitude: opLng,
          name: opBusinessName,
          address: opAddress,
        } : null,
        renter: (isPickupView ? routeHook.origin : explicitOrigin)
          ? {
              latitude: (isPickupView ? routeHook.origin : explicitOrigin)!.latitude,
              longitude: (isPickupView ? routeHook.origin : explicitOrigin)!.longitude,
              name: renterName,
              address: renterAddress,
            }
          : null,
        route: routeHook.route,
        error: routeHook.error,
      }),
    );
  };

  useEffect(() => {
    syncMapData();
  }, [
    opLat,
    opLng,
    opBusinessName,
    opAddress,
    routeHook.origin?.latitude,
    routeHook.origin?.longitude,
    routeHook.route,
    routeHook.error,
    renterName,
    renterAddress,
    isPickupView,
    explicitOrigin,
  ]);

  // Poll for live GPS telemetry if active booking
  useEffect(() => {
    if (isPickupView || !bookingId) return;

    let isMounted = true;
    let fetching = false;

    const fetchLocation = async (isFirst = false) => {
      if (fetching) return;
      fetching = true;
      if (isFirst && isMounted) setUpdatingGps(true);
      try {
        if (isFirst && user?.role === "customer") {
          const initial = await getBookingLocation(bookingId);
          if (!isMounted) return;
          if (initial.success && initial.data) {
            setTrackingData(initial.data);
            setLoadedBookingId(String(bookingId));
          }
          try {
            await publishCurrentTripLocation(Number(bookingId));
            retryNeeded.current = false;
            if (isMounted) setGpsIssue(null);
          } catch (error: any) {
            retryNeeded.current = true;
            if (isMounted) setGpsIssue(error?.response
              ? "Could not upload your GPS location. Check your connection and trip status. Tracking retries automatically."
              : error?.message || "Finding GPS. Tracking retries automatically.");
          }
        }
        if (!isMounted) return;
        const res = await getBookingLocation(bookingId);
        if (res.success && res.data && isMounted) {
          setTrackingData(res.data);
          if (res.data.current_latitude != null && res.data.current_longitude != null && res.data.last_location_updated_at && Date.now() - Date.parse(res.data.last_location_updated_at) < 120000) {
            setGpsIssue((current) => current?.startsWith("Finding your GPS location") ? null : current);
          }

          const lat = res.data.current_latitude != null
            ? Number(res.data.current_latitude)
            : null;
          const lng = res.data.current_longitude != null
            ? Number(res.data.current_longitude)
            : null;

          if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
            webViewRef.current?.postMessage(
              JSON.stringify({
                type: "UPDATE_LOCATION",
                latitude: lat,
                longitude: lng,
              }),
            );
          }
        }
      } catch (err) {
        console.error("Live tracking fetch error:", err);
        if (isMounted) setGpsIssue("Could not load the trip location. Check your connection and try again.");
      } finally {
        fetching = false;
        if (isFirst && isMounted) setUpdatingGps(false);
        if (isFirst && isMounted) {
          setLoadedBookingId(String(bookingId));
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
  }, [isPickupView, bookingId, user?.id, user?.role, automaticRetryVersion]);

  useEffect(() => {
    if (isPickupView || !bookingId || user?.role !== "customer" || !["trip_in_progress", "ongoing", "return_pending"].includes(trackingData?.status || "")) return;
    let active = true;
    let subscription: { remove: () => void } | undefined;
    void watchCurrentTripLocation(Number(bookingId), () => {
      retryNeeded.current = false;
      if (active) setGpsIssue(null);
    }, (message) => {
      retryNeeded.current = true;
      if (active) setGpsIssue(message);
    }).then((watcher) => {
      if (active) subscription = watcher;
      else watcher.remove();
    }).catch(() => {
      retryNeeded.current = true;
      // The one-shot upload above reports permissions/settings errors to the user.
    });
    return () => { active = false; subscription?.remove(); };
  }, [isPickupView, bookingId, user?.id, user?.role, trackingData?.status, automaticRetryVersion]);

  useEffect(() => {
    if (isPickupView || !bookingId) return;
    const timer = setInterval(() => {
      if (retryNeeded.current) setAutomaticRetryVersion((current) => current + 1);
    }, 15000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setAutomaticRetryVersion((current) => current + 1);
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [isPickupView, bookingId]);

  const handleRecenterRoute = () => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "RECENTER_TO_LOCATION",
      }),
    );
  };

  const handleFitMindoro = () => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "FIT_MINDORO",
      }),
    );
  };

  const handleLayerSwitch = (mode: "streets" | "satellite") => {
    setActiveLayer(mode);
    webViewRef.current?.injectJavaScript(`switchLayer('${mode}'); true;`);
  };

  // Google Maps style full-screen Leaflet map HTML
  const mapHtml = useMemo(() => {
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
      background: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }
    .leaflet-control-attribution { font-size: 8px; max-width: 85vw; opacity: 0.7; }
    .leaflet-control-zoom { display: none !important; }

    /* Renter Primary Gold Pin (#FEC103) */
    .renter-marker-wrapper {
      position: relative;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .renter-glow {
      position: absolute;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(254, 193, 3, 0.28);
      animation: renterPulse 2.2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }
    .renter-glow-inner {
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(254, 193, 3, 0.45);
      animation: renterPulseInner 2.2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }
    .renter-pin {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #FEC103;
      border: 2.5px solid #0F172A;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    @keyframes renterPulse {
      0% { transform: scale(0.6); opacity: 0.95; }
      75% { transform: scale(1.35); opacity: 0.1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    @keyframes renterPulseInner {
      0% { transform: scale(0.7); opacity: 0.85; }
      60% { transform: scale(1.18); opacity: 0; }
      100% { transform: scale(1.22); opacity: 0; }
    }

    /* Operator Dark Slate & Gold Hub Pin */
    .op-marker-wrapper {
      position: relative;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .op-glow {
      position: absolute;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.3);
      animation: opPulse 2.2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }
    .op-glow-inner {
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.45);
      animation: opPulseInner 2.2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }
    .op-pin {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0F172A;
      border: 2.5px solid #FEC103;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    @keyframes opPulse {
      0% { transform: scale(0.6); opacity: 0.9; }
      75% { transform: scale(1.35); opacity: 0.1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    @keyframes opPulseInner {
      0% { transform: scale(0.7); opacity: 0.8; }
      60% { transform: scale(1.18); opacity: 0; }
      100% { transform: scale(1.22); opacity: 0; }
    }

    /* Google Maps style popup card */
    .leaflet-popup {
      margin-bottom: 6px;
    }
    .leaflet-popup-content-wrapper {
      background: #FFFFFF !important;
      border-radius: 16px !important;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22) !important;
      padding: 3px !important;
    }
    .leaflet-popup-content {
      margin: 10px 14px !important;
      line-height: 1.4 !important;
    }
    .leaflet-popup-tip {
      background: #FFFFFF !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Geographic center of Oriental Mindoro (Pinamalayan)
    const mindoroCenter = [13.0453, 121.4878];
    let currentMode = "streets";

    // Initialize directly centered on Oriental Mindoro
    window.map = L.map("map", {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    }).setView(mindoroCenter, 10);

    // Inject service area locking (focus backdrop + primary yellow border)
    ${serviceAreaLockScript("window.map", isPickupView)}

    // Directly fit Oriental Mindoro province bounds immediately upon load
    if (window.r4rMindoroBounds) {
      window.map.fitBounds(window.r4rMindoroBounds, { padding: [20, 20], maxZoom: 14 });
    }

    // Warn on outside click
    window.map.on("click", function(e) {
      if (window.r4rIsInServiceArea && !window.r4rIsInServiceArea(e.latlng.lat, e.latlng.lng)) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "OUTSIDE_SERVICE_AREA"
          }));
        }
      }
    });

    let opMarker = null;
    let renterMarker = null;
    let routeLineCasing = null;
    let routeLine = null;
    let boundsFitted = false;

    // 1. Street Map Tiles (Esri World Street Map)
    const streetsLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      minZoom: 7,
      keepBuffer: 6,
    });

    // 2. High-Resolution Google Hybrid Satellite with Roads & Labels
    const satelliteLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
      minZoom: 7,
      keepBuffer: 6,
    });

    streetsLayer.addTo(window.map);

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

    // Primary #FEC103 Renter Marker Icon
    const renterMarkerIcon = L.divIcon({
      className: "",
      html: '<div class="renter-marker-wrapper"><div class="renter-glow"></div><div class="renter-glow-inner"></div><div class="renter-pin"><svg width="15" height="15" viewBox="0 0 24 24" fill="#0F172A"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div></div>',
      iconSize: [56, 56],
      iconAnchor: [28, 28],
      popupAnchor: [0, -22],
    });

    // Dark Slate & Gold Operator Hub Marker Icon
    const opMarkerIcon = L.divIcon({
      className: "",
      html: '<div class="op-marker-wrapper"><div class="op-glow"></div><div class="op-glow-inner"></div><div class="op-pin"><svg width="15" height="15" viewBox="0 0 24 24" fill="#FEC103"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.5l7 6.3V18h-4v-5H9v5H5v-7.2l7-6.3z"/></svg></div></div>',
      iconSize: [56, 56],
      iconAnchor: [28, 28],
      popupAnchor: [0, -22],
    });

    function escapeHtml(str) {
      return String(str || "").replace(/[&<>"']/g, function(m) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
      });
    }

    function handleReactNativeMessage(event) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data.type === "SYNC_MAP_DATA") {
          // 1. Operator Garage Hub Marker
          if (data.operator && Number.isFinite(data.operator.latitude) && Number.isFinite(data.operator.longitude)) {
            if (!opMarker) {
              opMarker = L.marker([data.operator.latitude, data.operator.longitude], {
                icon: opMarkerIcon,
                interactive: true,
              }).addTo(window.map);
            } else {
              opMarker.setLatLng([data.operator.latitude, data.operator.longitude]);
            }
            opMarker.bindPopup(\`
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2px; min-width: 175px;">
                <div style="display: inline-block; font-size: 9px; font-weight: 800; color: #FEC103; background: #0F172A; padding: 3px 8px; border-radius: 4px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Operator Garage Hub
                </div>
                <div style="font-size: 13.5px; font-weight: 800; color: #0F172A; margin-bottom: 3px;">\${escapeHtml(data.operator.name)}</div>
                <div style="font-size: 11px; color: #64748B; line-height: 1.35;">\${escapeHtml(data.operator.address)}</div>
              </div>
            \`);
          }

          // 2. Renter Location Marker (Primary #FEC103)
          if (data.renter && Number.isFinite(data.renter.latitude) && Number.isFinite(data.renter.longitude)) {
            if (!renterMarker) {
              renterMarker = L.marker([data.renter.latitude, data.renter.longitude], {
                icon: renterMarkerIcon,
                interactive: true,
              }).addTo(window.map);
            } else {
              renterMarker.setLatLng([data.renter.latitude, data.renter.longitude]);
            }
            if (!data.operator && !boundsFitted) { window.map.setView([data.renter.latitude, data.renter.longitude], 16); boundsFitted = true; }
            renterMarker.bindPopup(\`
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2px; min-width: 175px;">
                <div style="display: inline-block; font-size: 9px; font-weight: 800; color: #78350F; background: #FEF3C7; padding: 3px 8px; border-radius: 4px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Renter GPS Location
                </div>
                <div style="font-size: 13.5px; font-weight: 800; color: #0F172A; margin-bottom: 3px;">\${escapeHtml(data.renter.name)}</div>
                <div style="font-size: 11px; color: #64748B; line-height: 1.35;">\${escapeHtml(data.renter.address)}</div>
              </div>
            \`);
          }

          // 3. Primary Road Route Trace Line (#FEC103 core with #0F172A casing)
          if (routeLineCasing) { window.map.removeLayer(routeLineCasing); routeLineCasing = null; }
          if (routeLine) { window.map.removeLayer(routeLine); routeLine = null; }

          if (!data.error && data.route && data.route.coordinates && data.route.coordinates.length > 0) {
            // High-contrast dark casing
            routeLineCasing = L.geoJSON({ type: 'LineString', coordinates: data.route.coordinates }, {
              style: { color: '#0F172A', weight: 8.5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }
            }).addTo(window.map);

            // Primary yellow/gold trace line
            routeLine = L.geoJSON({ type: 'LineString', coordinates: data.route.coordinates }, {
              style: { color: '#FEC103', weight: 5.5, opacity: 1.0, lineCap: 'round', lineJoin: 'round' }
            }).addTo(window.map);

            if (!boundsFitted) {
              const layers = [opMarker, renterMarker, routeLine].filter(Boolean);
              if (layers.length > 0) {
                const group = L.featureGroup(layers);
                window.map.fitBounds(group.getBounds(), { padding: [60, 60], maxZoom: 15 });
                boundsFitted = true;
              }
            }
          }
          return;
        }

        if (data.type === "UPDATE_LOCATION") {
          const mLat = Number(data.latitude);
          const mLng = Number(data.longitude);
          if (Number.isFinite(mLat) && Number.isFinite(mLng)) {
            if (!renterMarker) {
              renterMarker = L.marker([mLat, mLng], { icon: renterMarkerIcon, interactive: true }).addTo(window.map);
            } else {
              renterMarker.setLatLng([mLat, mLng]);
            }
            if (!boundsFitted) { window.map.setView([mLat, mLng], 16); boundsFitted = true; }
          }
        } else if (data.type === "RECENTER_TO_LOCATION") {
          const layers = [opMarker, renterMarker, routeLine].filter(Boolean);
          if (layers.length > 0) {
            const group = L.featureGroup(layers);
            window.map.fitBounds(group.getBounds(), { padding: [60, 60], maxZoom: 15, animate: true });
          } else if (window.r4rMindoroBounds) {
            window.map.fitBounds(window.r4rMindoroBounds, { padding: [20, 20], animate: true });
          }
        } else if (data.type === "FIT_MINDORO") {
          if (window.r4rMindoroBounds) {
            window.map.fitBounds(window.r4rMindoroBounds, { padding: [20, 20], animate: true });
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
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: "MAP_READY" }));

    setTimeout(function() {
      if (window.map) {
        window.map.invalidateSize();
      }
    }, 200);
  </script>
</body>
</html>
`;
  }, [isPickupView]);

  return (
    <View style={styles.container}>
      {/* 1. TRUE FULL SCREEN MAP (Google Maps style edge-to-edge) */}
      <View style={StyleSheet.absoluteFill}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading Oriental Mindoro map...</Text>
          </View>
        ) : (
          <WebView
            key={`${bookingId || "pickup"}_${isPickupView}`}
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={StyleSheet.absoluteFill}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            geolocationEnabled
            onLoadEnd={() => {
              syncMapData();
              webViewRef.current?.injectJavaScript(`
                if (window.map) {
                  window.map.invalidateSize();
                }
                true;
              `);
            }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === "MAP_READY") syncMapData();
                if (data.type === "OUTSIDE_SERVICE_AREA") {
                  setOutsideError(
                    "This location is outside Oriental Mindoro. Ride4Rent operates exclusively within Oriental Mindoro.",
                  );
                  if (outsideTimeoutRef.current) clearTimeout(outsideTimeoutRef.current);
                  outsideTimeoutRef.current = setTimeout(() => {
                    setOutsideError(null);
                  }, 3500);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }}
          />
        )}
      </View>

      {/* 2. TOP FLOATING CARD (Overlapping Header Card & Layer Pills) */}
      <View
        pointerEvents="box-none"
        style={[
          styles.topFloatingCardContainer,
          { top: Math.max(insets.top + 8, 44) },
        ]}
      >
        <View style={styles.topFloatingCard}>
          <View style={styles.topCardRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.topBackBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.dark} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.topCardTitle} numberOfLines={1}>
                {isPickupView
                  ? opBusinessName || "Operator Location"
                  : params.vehicleName || "Live Vehicle Tracking"}
              </Text>
              <Text style={styles.topCardSubtitle} numberOfLines={1}>
                {isPickupView
                  ? "Operator business and garage location in Oriental Mindoro."
                  : "Renter’s shared GPS location"}
              </Text>
            </View>
          </View>
        </View>

        {/* Floating Layer Selector Pills directly beneath card */}
        <View style={styles.layerSelectorRow}>
          <TouchableOpacity
            style={[
              styles.layerPill,
              activeLayer === "streets"
                ? styles.layerPillActive
                : styles.layerPillInactive,
            ]}
            onPress={() => handleLayerSwitch("streets")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="map"
              size={13}
              color={activeLayer === "streets" ? Colors.white : Colors.dark}
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
            style={[
              styles.layerPill,
              activeLayer === "satellite"
                ? styles.layerPillActive
                : styles.layerPillInactive,
            ]}
            onPress={() => handleLayerSwitch("satellite")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="earth"
              size={13}
              color={activeLayer === "satellite" ? Colors.white : "#6B7280"}
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

          {/* Live Route Distance Pill if available */}
          {routeHook.route ? (
            <View style={styles.layerPillDistance}>
              <Ionicons name="navigate" size={13} color={Colors.dark} />
              <Text style={styles.layerPillDistanceText}>
                {(routeHook.route.distance / 1000).toFixed(1)} km
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 3. OUTSIDE SERVICE AREA ALERT BANNER */}
      {outsideError ? (
        <View
          style={[
            styles.outsideBanner,
            { top: Math.max(insets.top + 160, 196) },
          ]}
        >
          <Ionicons name="alert-circle" size={17} color="#DC2626" />
          <Text style={styles.outsideBannerText}>{outsideError}</Text>
        </View>
      ) : null}

      {/* 4. FLOATING TELEMETRY SPEED BADGE (Active GPS tracking) */}
      {!isPickupView && explicitOrigin && (
        <View
          style={[
            styles.floatingSpeedBadge,
            { top: Math.max(insets.top + 162, 198) },
          ]}
        >
          <MaterialCommunityIcons
            name="speedometer"
            size={17}
            color={Colors.dark}
          />
          <Text style={styles.floatingSpeedText}>
            {displayTripSpeed(trackingData?.current_speed, locationIsFresh)}
          </Text>
          <View style={[styles.activePill, !locationIsFresh && { backgroundColor: "#FEF3C7" }]}>
            <View style={[styles.activeDot, !locationIsFresh && { backgroundColor: "#D97706" }]} />
            <Text style={[styles.activePillText, !locationIsFresh && { color: "#92400E" }]}>{locationIsFresh ? "LIVE GPS" : "GPS OFFLINE"}</Text>
          </View>
        </View>
      )}

      {/* 5. FLOATING CIRCULAR LOCATE BUTTON (Bottom Right above Sheet) */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.myLocationButton,
          {
            bottom: isSheetExpanded
              ? 265 + insets.bottom
              : 135 + insets.bottom,
          },
        ]}
        onPress={handleRecenterRoute}
      >
        <View style={styles.myLocationCircle}>
          <View style={styles.myLocationDot} />
        </View>
      </TouchableOpacity>

      {/* 6. GOOGLE MAPS STYLE OVERLAPPING BOTTOM SHEET */}
      <View
        style={[
          styles.bottomSheet,
          {
            paddingBottom: Math.max(insets.bottom + 12, 22),
          },
        ]}
      >
        {/* Handle for drag/toggle */}
        <View {...sheetPanHandlers} style={styles.sheetHandleTouch} accessible accessibilityLabel="Swipe up to expand location details or down to collapse">
          <View style={styles.sheetHandle} />
        </View>

        <View>
          <Text style={styles.sheetStreetText} numberOfLines={1}>
            {isPickupView ? (opBusinessName || "Pickup Location") : vehicleName}
          </Text>
          <Text style={styles.sheetCityText} numberOfLines={gpsIssue ? undefined : 2}>
            {isPickupView ? opAddress : gpsIssue || (trackingData?.location_sharing_status === "off" ? "Renter location sharing is off" : trackingData?.location_sharing_status === "unavailable" ? "Renter GPS updates are unavailable" : updatingGps ? "Getting and sharing the renter’s GPS location…" : renterAddress)}
          </Text>
        </View>

        {isSheetExpanded && (
          <View style={styles.sheetExpandedContent}>
            <Text style={styles.sheetNoteText}>
              {isPickupView ? "Pickup service is available within Oriental Mindoro." : explicitOrigin ? (locationIsFresh ? "Receiving the renter’s GPS updates" : "Last shared location · waiting for a new GPS update") : "The renter must allow location access and keep the app open to share GPS."}
            </Text>

            {/* Directions Action Button */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleRecenterRoute}
              disabled={!opLat || !opLng}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>Show on Map</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: "#E2E8F0",
  },

  topFloatingCardContainer: {
    position: "absolute",
    left: 18,
    right: 18,
    zIndex: 10,
  },

  topFloatingCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },

  topCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  topBackBtn: {
    paddingTop: 2,
    paddingRight: 4,
  },

  topCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    color: Colors.dark,
  },

  topCardSubtitle: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: Colors.secondary,
    lineHeight: 19,
  },

  layerSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  layerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
  },

  layerPillActive: {
    backgroundColor: Colors.dark,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  layerPillInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  layerPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },

  layerPillTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
  },

  layerPillDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  layerPillDistanceText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#78350F",
  },

  myLocationButton: {
    position: "absolute",
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    zIndex: 15,
  },

  myLocationCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3.5,
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

  sheetStreetText: {
    marginTop: 8,
    fontFamily: FontFamily.bold,
    fontSize: 21,
    color: Colors.dark,
  },

  sheetCityText: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: "#4B5563",
  },

  sheetExpandedContent: {
    marginTop: 4,
  },

  sheetNoteText: {
    marginTop: 14,
    marginBottom: 12,
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: "#4B5563",
  },
  chipPillTextActive: {
    color: Colors.white,
  },
  chipPillHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  chipPillHighlightText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
  },

  // 3. Outside Warning Banner
  outsideBanner: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 99,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  outsideBannerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#991B1B",
    lineHeight: 16,
  },

  // 4. Floating Speed Badge
  floatingSpeedBadge: {
    position: "absolute",
    left: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    zIndex: 48,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#16A34A",
  },
  activePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: "#166534",
  },

  // 5. Floating Controls FAB Column
  floatingControlsColumn: {
    position: "absolute",
    right: Spacing.md,
    gap: 10,
    zIndex: 48,
  },
  floatingFabBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },

  // 6. Google Maps Overlapping Bottom Sheet
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    zIndex: 60,
  },
  sheetHandleTouch: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 6,
  },
  sheetHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 10,
    backgroundColor: "#CBD5E1",
  },
  sheetTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  locationTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  routeSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.secondary,
    marginTop: 2,
  },
  timestampText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#10B981",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  routeSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: Spacing.sm,
  },
  routeMetricItem: {
    alignItems: "center",
    flex: 1,
  },
  routeMetricValue: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
    marginTop: 2,
  },
  routeMetricLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.secondary,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#FDE68A",
  },
  routeErrorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 10,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  routeErrorText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#991B1B",
  },
  routeLoadingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: Spacing.sm,
  },
  routeLoadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  journeyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.sm,
  },
  journeyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  journeyIconColumn: {
    alignItems: "center",
    width: 28,
    marginRight: 8,
  },
  renterDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  renterInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  journeyDottedLine: {
    width: 2,
    height: 24,
    backgroundColor: "#CBD5E1",
    marginVertical: 2,
  },
  opDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  opInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  journeyTextColumn: {
    flex: 1,
  },
  journeyBadgeTextGold: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    color: "#92400E",
    letterSpacing: 0.5,
  },
  journeyBadgeTextDark: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  journeyNameText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
    marginTop: 1,
  },
  journeyAddressText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 1,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },
});
