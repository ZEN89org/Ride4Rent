import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { MUNICIPALITY_COORDINATES, ORIENTAL_MINDORO_LOCATIONS } from "@/constants/orientalMindoroLocations";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";

export interface SelectedLocationResult {
  latitude: number;
  longitude: number;
  municipality?: string;
  barangay?: string;
  streetAddress?: string;
  formattedAddress?: string;
}

interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialMunicipality?: string | null;
  onConfirm: (result: SelectedLocationResult) => void;
}

const DEFAULT_ORIENTAL_MINDORO = {
  latitude: 13.0453,
  longitude: 121.4878, // Center of Oriental Mindoro (Pinamalayan)
};

export default function MapLocationPicker({
  visible,
  onClose,
  initialLatitude,
  initialLongitude,
  initialMunicipality,
  onConfirm,
}: MapLocationPickerProps) {
  const webViewRef = useRef<WebView>(null);

  const muniCoords = initialMunicipality && MUNICIPALITY_COORDINATES[initialMunicipality]
    ? MUNICIPALITY_COORDINATES[initialMunicipality]
    : null;
  const initialLat = initialLatitude || muniCoords?.latitude || DEFAULT_ORIENTAL_MINDORO.latitude;
  const initialLng = initialLongitude || muniCoords?.longitude || DEFAULT_ORIENTAL_MINDORO.longitude;

  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: initialLat,
    longitude: initialLng,
  });

  const [detectedAddress, setDetectedAddress] = useState<{
    street?: string;
    barangay?: string;
    municipality?: string;
    formattedAddress?: string;
  }>({});

  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (visible) {
      const muni = initialMunicipality && MUNICIPALITY_COORDINATES[initialMunicipality]
        ? MUNICIPALITY_COORDINATES[initialMunicipality]
        : null;
      const lat = initialLatitude || muni?.latitude || DEFAULT_ORIENTAL_MINDORO.latitude;
      const lng = initialLongitude || muni?.longitude || DEFAULT_ORIENTAL_MINDORO.longitude;
      setCurrentCoords({ latitude: lat, longitude: lng });
      performReverseGeocode(lat, lng);
    }
  }, [visible, initialLatitude, initialLongitude, initialMunicipality]);

  const matchMunicipality = (rawCity?: string | null): string | undefined => {
    if (!rawCity) return undefined;
    const clean = rawCity.toLowerCase().replace(/city|of/g, "").trim();
    for (const loc of ORIENTAL_MINDORO_LOCATIONS) {
      const nameClean = loc.name.toLowerCase().replace(/city|of/g, "").trim();
      if (clean.includes(nameClean) || nameClean.includes(clean)) {
        return loc.name;
      }
    }
    return undefined;
  };

  const matchBarangay = (muniName: string, rawBarangay?: string | null): string | undefined => {
    if (!rawBarangay) return undefined;
    const muni = ORIENTAL_MINDORO_LOCATIONS.find((m) => m.name === muniName);
    if (!muni) return undefined;
    const clean = rawBarangay.toLowerCase().replace(/barangay|brgy\.?/g, "").trim();
    for (const b of muni.barangays) {
      const bClean = b.toLowerCase().replace(/barangay|brgy\.?/g, "").trim();
      if (clean.includes(bClean) || bClean.includes(clean)) {
        return b;
      }
    }
    return undefined;
  };

  const performReverseGeocode = async (lat: number, lng: number) => {
    try {
      setGeocoding(true);
      let street = "";
      let rawCity = "";
      let rawDistrict = "";
      let fullText = "";

      const expoResults = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (expoResults && expoResults.length > 0) {
        const item = expoResults[0];
        street = [item.streetNumber, item.street].filter(Boolean).join(" ");
        rawCity = item.city || item.subregion || "";
        rawDistrict = item.district || item.name || "";
        fullText = item.formattedAddress || `${street}, ${rawDistrict}, ${rawCity}`.replace(/^, |, $/g, "");
      } else {
        // Fallback to OpenStreetMap Nominatim
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { "User-Agent": "Ride4Rent-App" } }
        );
        const data = await resp.json();
        if (data?.address) {
          street = data.address.road || data.address.pedestrian || "";
          rawCity = data.address.city || data.address.town || data.address.municipality || "";
          rawDistrict = data.address.suburb || data.address.neighbourhood || data.address.village || "";
          fullText = data.display_name || "";
        }
      }

      const matchedMuni = matchMunicipality(rawCity) || initialMunicipality || undefined;
      let matchedBrgy: string | undefined = undefined;
      if (matchedMuni) {
        matchedBrgy = matchBarangay(matchedMuni, rawDistrict);
      }

      setDetectedAddress({
        street: street || (rawDistrict ? `Near ${rawDistrict}` : undefined),
        barangay: matchedBrgy || (rawDistrict ? rawDistrict.replace(/Barangay|Brgy\.?/gi, "").trim() : undefined),
        municipality: matchedMuni,
        formattedAddress: fullText,
      });
    } catch (e) {
      console.log("Geocoding error:", e);
    } finally {
      setGeocoding(false);
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "location_change") {
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setCurrentCoords({ latitude: lat, longitude: lng });
          performReverseGeocode(lat, lng);
        }
      }
    } catch (e) {
      console.log("Map postMessage error:", e);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        alert("Location permission is needed to pinpoint your current location.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCurrentCoords({ latitude: lat, longitude: lng });

      webViewRef.current?.injectJavaScript(`
        if (typeof map !== 'undefined') {
          map.setView([${lat}, ${lng}], 17, { animate: true });
        }
        true;
      `);

      performReverseGeocode(lat, lng);
    } catch (e) {
      console.log("Current location error:", e);
    } finally {
      setLocating(false);
    }
  };

  const handleConfirmLocation = () => {
    onConfirm({
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      streetAddress: detectedAddress.street,
      barangay: detectedAddress.barangay,
      municipality: detectedAddress.municipality,
      formattedAddress: detectedAddress.formattedAddress,
    });
    onClose();
  };

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    html, body { overflow: hidden; background: #f8fafc; }
    .center-pin-wrapper {
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
    .pin-shadow {
      width: 14px;
      height: 6px;
      background: rgba(0,0,0,0.25);
      border-radius: 50%;
      margin-top: 2px;
    }
    .pin-svg {
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
    }
    .layer-selector {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 1000;
      display: flex;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 3px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.14);
      border: 1px solid #E2E8F0;
      gap: 2px;
    }
    .layer-btn {
      border: none;
      background: transparent;
      padding: 5px 11px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      border-radius: 16px;
      cursor: pointer;
      outline: none;
      transition: all 0.15s ease;
    }
    .layer-btn.active {
      background: #1A1A1A;
      color: #FFFFFF;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="layer-selector">
    <button id="btn-streets" class="layer-btn active" onclick="setLayer('streets')">Map & Barangays</button>
    <button id="btn-sat" class="layer-btn" onclick="setLayer('satellite')">Satellite</button>
  </div>
  <div class="center-pin-wrapper">
    <svg class="pin-svg" width="40" height="48" viewBox="0 0 24 24" fill="none">
      <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z" fill="#FEC103" stroke="#FFFFFF" stroke-width="1.2"/>
      <circle cx="12" cy="8" r="3.5" fill="#FFFFFF"/>
    </svg>
    <div class="pin-shadow"></div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map("map", {
      zoomControl: false,
      attributionControl: false
    }).setView([${initialLat}, ${initialLng}], 16);

    const streetsLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{y}/{x}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });

    const satTiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19
    });
    const satLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19
    });
    const satGroup = L.layerGroup([satTiles, satLabels]);

    streetsLayer.addTo(map);
    let activeLayer = streetsLayer;

    function setLayer(type) {
      map.removeLayer(activeLayer);
      document.querySelectorAll('.layer-btn').forEach(function(b) { b.classList.remove('active'); });
      if (type === 'satellite') {
        activeLayer = satGroup;
        document.getElementById('btn-sat').classList.add('active');
      } else {
        activeLayer = streetsLayer;
        document.getElementById('btn-streets').classList.add('active');
      }
      activeLayer.addTo(map);
    }

    let moveTimeout = null;
    map.on("moveend", function() {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(function() {
        const center = map.getCenter();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "location_change",
            latitude: center.lat,
            longitude: center.lng
          }));
        }
      }, 150);
    });

    map.on("click", function(e) {
      map.panTo(e.latlng, { animate: true });
    });
  </script>
</body>
</html>
  `;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Pin Garage Location</Text>
            <Text style={styles.headerSubtitle}>Drag the map to pinpoint your fleet's base</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        {/* Map Container */}
        <View style={styles.mapWrap}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            onMessage={handleMessage}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />

          {/* Floating Current Location Button */}
          <TouchableOpacity
            style={styles.currentLocationBtn}
            onPress={handleUseCurrentLocation}
            disabled={locating}
            activeOpacity={0.8}
          >
            {locating ? (
              <ActivityIndicator size="small" color={Colors.dark} />
            ) : (
              <Ionicons name="locate" size={22} color={Colors.dark} />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Location Details Card */}
        <View style={styles.bottomCard}>
          <View style={styles.addressInfoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="location" size={22} color={Colors.primary} />
            </View>
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressPrimary} numberOfLines={1}>
                {detectedAddress.street || detectedAddress.barangay || "Locating base..."}
              </Text>
              <Text style={styles.addressSecondary} numberOfLines={2}>
                {[
                  detectedAddress.barangay ? `Brgy. ${detectedAddress.barangay}` : null,
                  detectedAddress.municipality,
                  "Oriental Mindoro",
                ]
                  .filter(Boolean)
                  .join(", ") || "Move pin to set address"}
              </Text>
              <Text style={styles.coordsText}>
                {currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)}
              </Text>
            </View>
            {geocoding && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>

          <PrimaryButton
            title="Set This Location"
            onPress={handleConfirmLocation}
            style={styles.confirmBtn}
          />
        </View>
      </SafeAreaView>
    </Modal>
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  currentLocationBtn: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  addressInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  addressTextContainer: {
    flex: 1,
  },
  addressPrimary: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  addressSecondary: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  coordsText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.secondary,
    marginTop: 3,
  },
  confirmBtn: {
    marginTop: 4,
  },
});
