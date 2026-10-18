import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  LayoutAnimation,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { getSavedLocation, saveLocation } from "@/storage/locationStorage";
import {
  isInServiceArea,
  SERVICE_AREA_ERROR,
  serviceAreaLockScript,
} from "@/utils/serviceArea";

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

const DEFAULT_MINDORO_COORDS: LocationData = {
  latitude: 13.4115,
  longitude: 121.1803,
};

export default function CurrentLocation() {
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const webViewRef = useRef<WebView>(null);

  const [activeLayer, setActiveLayer] = useState<"streets" | "satellite">(
    "streets",
  );
  const [isSheetExpanded, setIsSheetExpanded] = useState(true);
  const [region, setRegion] = useState<LocationData | null>(null);
  const [mapInitialRegion, setMapInitialRegion] = useState<LocationData | null>(
    null,
  );
  const [address, setAddress] = useState<AddressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recenterLoading, setRecenterLoading] = useState(false);
  const [outsideAttempt, setOutsideAttempt] = useState(false);
  const [outsideBanner, setOutsideBanner] = useState(false);
  const outsideBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeRequest = useRef(0);

  const toggleSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSheetExpanded((prev) => !prev);
  };

  const showOutsideError = () => {
    setOutsideBanner(true);
    if (outsideBannerTimer.current) clearTimeout(outsideBannerTimer.current);
    outsideBannerTimer.current = setTimeout(() => setOutsideBanner(false), 3000);
  };

  useEffect(
    () => () => {
      if (outsideBannerTimer.current) clearTimeout(outsideBannerTimer.current);
    },
    [],
  );

  const reverseGeocode = async (latitude: number, longitude: number) => {
    const requestId = ++geocodeRequest.current;
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (requestId !== geocodeRequest.current) return;

      if (result && result.length > 0) {
        setAddress(result[0]);
      } else {
        // Fallback to nominatim if expo reverse geocode returns empty
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "Ride4Rent-App" } },
          );
          const data = await resp.json();
          if (requestId !== geocodeRequest.current) return;
          if (data?.address) {
            setAddress({
              street: data.address.road || data.address.pedestrian || null,
              district:
                data.address.suburb ||
                data.address.neighbourhood ||
                data.address.village ||
                null,
              city:
                data.address.city ||
                data.address.town ||
                data.address.municipality ||
                "Oriental Mindoro",
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
    }
  };

  const updateSelectedLocation = async (
    latitude: number,
    longitude: number,
  ) => {
    setRegion({ latitude, longitude });
    if (!isInServiceArea(latitude, longitude)) {
      geocodeRequest.current++;
      setOutsideAttempt(true);
      setAddress(null);
      return;
    }
    setOutsideAttempt(false);
    await reverseGeocode(latitude, longitude);
  };

  const handleRequestPermission = async () => {
    try {
      setLoading(true);
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status === "granted") {
          setPermissionDenied(false);
          await getCurrentLocation();
          return;
        }
      }
      setLoading(false);
      // If user denied permanently or cannot ask again, open settings
      Linking.openSettings();
    } catch {
      setLoading(false);
      Linking.openSettings();
    }
  };

  const DEFAULT_SERVICE_HUB = {
    latitude: 13.4115, // Calapan City, Oriental Mindoro
    longitude: 121.1803,
  };

  const getCurrentLocation = async (shouldRecenterMap = false) => {
    try {
      if (shouldRecenterMap) {
        setRecenterLoading(true);
      } else {
        setLoading(true);
      }

      setLocationError(false);

      // 1. Verify Foreground Permission
      const permission = await Location.getForegroundPermissionsAsync();
      let isGranted = permission.status === "granted";

      if (!isGranted) {
        const requestedPermission =
          await Location.requestForegroundPermissionsAsync();
        isGranted = requestedPermission.status === "granted";
        if (!isGranted) {
          setPermissionDenied(true);
          setLoading(false);
          setRecenterLoading(false);
          return;
        }
      }

      setPermissionDenied(false);

      // 2. Check if hardware Location Services (GPS) is enabled on the device
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          Alert.alert(
            "Device Location is Off",
            "Please turn on Location / GPS in your device quick settings for live pinpointing. Showing default regional hub on map.",
            [{ text: "OK" }],
          );
        }
      } catch {}

      let resolvedCoords: { latitude: number; longitude: number } | null = null;

      // Tier 1: Try Last Known Position first for instant loading
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 600000,
        });
        if (lastKnown?.coords?.latitude && lastKnown?.coords?.longitude) {
          resolvedCoords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          if (
            !shouldRecenterMap &&
            !region &&
            isInServiceArea(resolvedCoords.latitude, resolvedCoords.longitude)
          ) {
            setMapInitialRegion(resolvedCoords);
            setRegion(resolvedCoords);
            reverseGeocode(resolvedCoords.latitude, resolvedCoords.longitude);
            setLoading(false);
          }
        }
      } catch (err) {
        console.log("Last known location fetch failed:", err);
      }

      // Tier 2: Try accurate current position with a 6-second timeout
      try {
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 6000),
        );
        const currentPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const current = await Promise.race([currentPromise, timeoutPromise]);
        if (
          current &&
          "coords" in current &&
          current.coords?.latitude &&
          current.coords?.longitude
        ) {
          resolvedCoords = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
        }
      } catch (err) {
        console.log("Balanced accuracy location failed:", err);
      }

      // Tier 3: If still unresolved, try Lowest accuracy (Cell/WiFi, works indoors!) with 5-second timeout
      if (!resolvedCoords) {
        try {
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 5000),
          );
          const lowPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
          });
          const low = await Promise.race([lowPromise, timeoutPromise]);
          if (
            low &&
            "coords" in low &&
            low.coords?.latitude &&
            low.coords?.longitude
          ) {
            resolvedCoords = {
              latitude: low.coords.latitude,
              longitude: low.coords.longitude,
            };
          }
        } catch (err) {
          console.log("Lowest accuracy location failed:", err);
        }
      }

      // Tier 4: Fallback to existing selected region or Oriental Mindoro Default Hub
      if (!resolvedCoords) {
        if (region) {
          resolvedCoords = region;
        } else {
          resolvedCoords = DEFAULT_SERVICE_HUB;
        }
      }

      // Apply the resolved coordinates
      if (!isInServiceArea(resolvedCoords.latitude, resolvedCoords.longitude)) {
        setOutsideAttempt(false);
        Alert.alert(
          "Outside service area",
          "Your current location is outside Oriental Mindoro. Select a location inside the highlighted province.",
        );
        resolvedCoords =
          region && isInServiceArea(region.latitude, region.longitude)
            ? region
            : DEFAULT_SERVICE_HUB;
      }
      if (!shouldRecenterMap || !mapInitialRegion) {
        setMapInitialRegion(resolvedCoords);
      }
      setRegion(resolvedCoords);
      await reverseGeocode(resolvedCoords.latitude, resolvedCoords.longitude);

      if (shouldRecenterMap && webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "RECENTER_TO_LOCATION",
            latitude: resolvedCoords.latitude,
            longitude: resolvedCoords.longitude,
          }),
        );
      }

      setLoading(false);
      setRecenterLoading(false);
      setLocationError(false);
    } catch (error) {
      console.log("Current location error caught:", error);
      // Fallback to default hub so the user can still view the map and drag the pin
      if (!region) {
        setMapInitialRegion(DEFAULT_SERVICE_HUB);
        setRegion(DEFAULT_SERVICE_HUB);
        reverseGeocode(
          DEFAULT_SERVICE_HUB.latitude,
          DEFAULT_SERVICE_HUB.longitude,
        );
      }
      setLocationError(false);
      setLoading(false);
      setRecenterLoading(false);
    }
  };

  const handleMapMessage = async (event: WebViewMessageEvent) => {
    try {
      const data =
        typeof event.nativeEvent.data === "string"
          ? JSON.parse(event.nativeEvent.data)
          : event.nativeEvent.data;

      if (data.type === "OUTSIDE_SERVICE_AREA") {
        showOutsideError();
        return;
      }

      if (data.type === "MAP_MOVED") {
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

  const getAddressText = () => {
    if (!address) {
      return "Locating address...";
    }

    const street = [address.streetNumber, address.street]
      .filter(Boolean)
      .join(" ");
    if (street) {
      return street;
    }

    if (address.district) {
      return address.district;
    }

    if (address.formattedAddress) {
      return address.formattedAddress.split(",")[0];
    }

    return "Selected location";
  };

  const getCityText = () => {
    if (!address) {
      return "";
    }

    return [address.city, address.district, address.subregion, address.region]
      .filter(Boolean)
      .join(", ");
  };

  const handleLayerSwitch = (mode: "streets" | "satellite") => {
    setActiveLayer(mode);
    webViewRef.current?.injectJavaScript(`switchLayer('${mode}'); true;`);
  };

  const mapHtml = useMemo(() => {
    if (!mapInitialRegion) {
      return "";
    }

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
    .leaflet-control-attribution { font-size: 8px; max-width: 85vw; }
    .leaflet-control-zoom { display: none !important; }

    /* Center Marker Pin with Golden Pulse */
    .location-marker-wrapper {
      position: relative;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
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
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 5px solid #FEC103;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
      z-index: 10;
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
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const initialLatitude = ${mapInitialRegion.latitude};
    const initialLongitude = ${mapInitialRegion.longitude};
    let currentMode = "streets";

    const map = L.map("map", {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    }).setView([initialLatitude, initialLongitude], 16);
    ${serviceAreaLockScript("map")}

    function notifyOutside() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "OUTSIDE_SERVICE_AREA" }));
      }
    }
    let lastValidCenter = window.r4rIsInServiceArea(initialLatitude, initialLongitude)
      ? [initialLatitude, initialLongitude]
      : null;

    // 1. Watermark-free, official Esri World Street Map
    const streetsLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      minZoom: 3,
      keepBuffer: 6,
    });

    // 2. High-Resolution Google Hybrid Satellite with Roads & Labels
    const satelliteLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
      minZoom: 3,
      keepBuffer: 6,
    });

    if (currentMode === "satellite") {
      satelliteLayer.addTo(map);
    } else {
      streetsLayer.addTo(map);
    }

    function switchLayer(mode) {
      currentMode = mode;
      if (mode === "streets") {
        map.removeLayer(satelliteLayer);
        if (!map.hasLayer(streetsLayer)) streetsLayer.addTo(map);
      } else if (mode === "satellite") {
        map.removeLayer(streetsLayer);
        satelliteLayer.addTo(map);
      }
      setTimeout(function() { if (map) map.invalidateSize(); }, 100);
    }

    const markerIcon = L.divIcon({
      className: "",
      html: '<div class="location-marker-wrapper"><div class="location-glow"></div><div class="location-glow-inner"></div><div class="location-marker"></div></div>',
      iconSize: [64, 64],
      iconAnchor: [32, 32],
    });

    const marker = L.marker([initialLatitude, initialLongitude], {
      icon: markerIcon,
      interactive: false,
      keyboard: false,
    }).addTo(map);

    let moveTimer = null;
    let isRecentering = false;

    map.on("move", function() {
      const center = map.getCenter();
      marker.setLatLng([center.lat, center.lng]);
    });

    map.on("moveend", function() {
      const center = map.getCenter();
      marker.setLatLng([center.lat, center.lng]);

      if (isRecentering) {
        isRecentering = false;
        return;
      }

      // Dragged outside Oriental Mindoro -> snap back to the last valid point
      if (!window.r4rIsInServiceArea(center.lat, center.lng)) {
        notifyOutside();
        if (lastValidCenter) {
          isRecentering = true;
          map.flyTo(lastValidCenter, map.getZoom(), { animate: true, duration: 0.4 });
        }
        return;
      }

      lastValidCenter = [center.lat, center.lng];
      clearTimeout(moveTimer);
      moveTimer = setTimeout(function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "MAP_MOVED",
            latitude: center.lat,
            longitude: center.lng,
          }));
        }
      }, 100);
    });

    map.on("click", function(event) {
      // Taps outside Oriental Mindoro are blocked
      if (!window.r4rIsInServiceArea(event.latlng.lat, event.latlng.lng)) {
        notifyOutside();
        return;
      }
      map.flyTo([event.latlng.lat, event.latlng.lng], map.getZoom(), {
        animate: true,
        duration: 0.45,
      });
    });

    function handleReactNativeMessage(event) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "RECENTER_TO_LOCATION") {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            isRecentering = true;
            if (window.r4rIsInServiceArea(lat, lng)) lastValidCenter = [lat, lng];
            marker.setLatLng([lat, lng]);
            map.flyTo([lat, lng], 17, {
              animate: true,
              duration: 0.8,
            });
          }
        } else if (data.type === "SWITCH_LAYER") {
          switchLayer(data.mode);
        }
      } catch (e) {
        console.error("Message error:", e);
      }
    }

    document.addEventListener("message", handleReactNativeMessage);
    window.addEventListener("message", handleReactNativeMessage);

    setTimeout(function() {
      if (map) map.invalidateSize();
    }, 200);
  </script>
</body>
</html>
    `;
  }, [mapInitialRegion]);
  const mapSource = useMemo(() => ({ html: mapHtml }), [mapHtml]);

  const restoreCurrentLocation = useEffectEvent(() => getCurrentLocation());
  const resumeLocation = useEffectEvent(() => {
    if (!region) getCurrentLocation();
  });

  useEffect(() => {
    const initLocation = async () => {
      try {
        const saved = await getSavedLocation();
        if (
          saved &&
          Number.isFinite(saved.latitude) &&
          Number.isFinite(saved.longitude) &&
          isInServiceArea(saved.latitude, saved.longitude)
        ) {
          const coords = {
            latitude: saved.latitude,
            longitude: saved.longitude,
          };
          setMapInitialRegion(coords);
          setRegion(coords);
          setLoading(false);
          reverseGeocode(coords.latitude, coords.longitude);
          return;
        }
      } catch {
        // fallback to live GPS
      }
      restoreCurrentLocation();
    };

    initLocation();

    // Auto-detect when user returns from phone Settings after enabling location
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        Location.getForegroundPermissionsAsync().then((perm) => {
          if (perm.status === "granted") {
            setPermissionDenied(false);
            resumeLocation();
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRecenter = async () => {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert(
        "Location Access Required",
        "Please enable location permission so Ride4Rent can center on your current position.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }
    getCurrentLocation(true);
  };

  const handleRetry = () => {
    getCurrentLocation();
  };

  const handleConfirmLocation = async () => {
    if (region && !isInServiceArea(region.latitude, region.longitude)) {
      Alert.alert("Outside service area", SERVICE_AREA_ERROR);
      return;
    }
    if (permissionDenied || !region) {
      Alert.alert(
        "Location Required",
        "Please enable location permissions and select your location before proceeding.",
        [
          { text: "Enable Location", onPress: handleRequestPermission },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }

    const fullAddress = [getAddressText(), getCityText()]
      .filter((part) => part && part !== "Locating address...")
      .join(", ");

    try {
      await saveLocation({
        latitude: region.latitude,
        longitude: region.longitude,
        address: fullAddress || "Selected location",
        confirmed: true,
      });
    } catch {
      // ignore storage write error
    }

    if (from === "profile" && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home");
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. TRUE FULL SCREEN MAP (Edge-to-edge background) */}
      <View style={StyleSheet.absoluteFill}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Finding your location...</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconBadge}>
              <Ionicons name="location" size={40} color={Colors.dark} />
            </View>
            <Text style={styles.permissionTitle}>Location Access Required</Text>
            <Text style={styles.permissionText}>
              Ride4Rent uses your location to show nearby rental vehicles on the
              map.
            </Text>
            <TouchableOpacity
              style={styles.enableLocationBtn}
              activeOpacity={0.85}
              onPress={handleRequestPermission}
            >
              <Ionicons name="navigate" size={17} color={Colors.dark} />
              <Text style={styles.enableLocationBtnText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        ) : locationError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to get your location</Text>
            <Text style={styles.errorText}>
              Please allow location access so Ride4Rent can find your current
              location.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : region ? (
          <WebView
            ref={webViewRef}
            source={mapSource}
            style={StyleSheet.absoluteFill}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleMapMessage}
            onLoadEnd={() =>
              webViewRef.current?.injectJavaScript(
                `switchLayer('${activeLayer}'); true;`,
              )
            }
            geolocationEnabled
            scrollEnabled={false}
          />
        ) : null}
      </View>

      {/* 2. TOP FLOATING CARD (Overlapping Header & Layer Pills) */}
      <View
        pointerEvents="box-none"
        style={[
          styles.topFloatingCardContainer,
          { top: Math.max(insets.top + 8, 44) },
        ]}
      >
        <View style={styles.topFloatingCard}>
          <View style={styles.topCardRow}>
            {router.canGoBack() && (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.topBackBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.dark} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.topCardTitle}>Current Location</Text>
              <Text style={styles.topCardSubtitle}>
                Allow Ride4Rent to use your current location to find vehicles near
                you.
              </Text>
            </View>
          </View>
        </View>

        {/* Floating Layer Selector Pills directly underneath card */}
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
        </View>
      </View>

      {/* 3. OUTSIDE SERVICE AREA ALERT BANNER */}
      {outsideBanner && (
        <View
          pointerEvents="none"
          accessibilityRole="alert"
          style={[
            styles.outsideBanner,
            { top: Math.max(insets.top + 160, 196) },
          ]}
        >
          <Ionicons name="alert-circle" size={18} color={Colors.white} />
          <Text style={styles.outsideBannerText}>
            Outside service area. Ride4Rent is only available in Oriental
            Mindoro.
          </Text>
        </View>
      )}

      {/* 4. FLOATING CIRCULAR LOCATE BUTTON (Bottom Right above Sheet) */}
      {!loading && !locationError && region && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.myLocationButton,
            {
              bottom: isSheetExpanded
                ? 245 + insets.bottom
                : 135 + insets.bottom,
            },
          ]}
          onPress={handleRecenter}
          disabled={recenterLoading}
        >
          {recenterLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.myLocationCircle}>
              <View style={styles.myLocationDot} />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* 5. GOOGLE MAPS STYLE OVERLAPPING BOTTOM SHEET */}
      <View
        style={[
          styles.bottomSheet,
          {
            paddingBottom: Math.max(insets.bottom + 12, 22),
          },
        ]}
      >
        {/* Handle for drag/toggle */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleSheet}
          style={styles.sheetHandleTouch}
        >
          <View style={styles.sheetHandle} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={toggleSheet}>
          <Text style={styles.sheetStreetText} numberOfLines={1}>
            {getAddressText()}
          </Text>
          {getCityText() !== "" && (
            <Text style={styles.sheetCityText} numberOfLines={1}>
              {getCityText()}
            </Text>
          )}
        </TouchableOpacity>

        {isSheetExpanded && (
          <View style={styles.sheetExpandedContent}>
            <Text style={styles.sheetNoteText}>
              Only location inside Oriental Mindoro can be selected
            </Text>

            {outsideAttempt && (
              <Text
                accessibilityRole="alert"
                style={styles.sheetErrorText}
              >
                Choose a location inside Oriental Mindoro to continue.
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!region || outsideAttempt) && styles.disabledButton,
              ]}
              disabled={!region || outsideAttempt}
              onPress={handleConfirmLocation}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>Confirm Location</Text>
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
    backgroundColor: "#F8FAFC",
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

  outsideBanner: {
    position: "absolute",
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 14,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 15,
  },

  outsideBannerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.white,
    lineHeight: 16,
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

  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 22,
    paddingTop: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    zIndex: 20,
  },

  sheetHandleTouch: {
    alignItems: "center",
    paddingVertical: 6,
  },

  sheetHandle: {
    width: 52,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#9CA3AF",
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
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: "#4B5563",
  },

  sheetErrorText: {
    marginTop: 6,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: "#DC2626",
  },

  confirmButton: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.full,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  disabledButton: {
    opacity: 0.5,
  },

  confirmText: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.dark,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: "#F8FAFC",
  },

  permissionIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  permissionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },

  permissionText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },

  enableLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  enableLocationBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },

  openSettingsBtn: {
    marginTop: Spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  openSettingsBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
    textDecorationLine: "underline",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },

  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
    textAlign: "center",
  },

  errorText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 21,
  },

  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
  },

  retryText: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
});
