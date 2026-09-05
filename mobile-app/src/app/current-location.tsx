import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  WebView,
  WebViewMessageEvent,
} from "react-native-webview";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";

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

export default function CurrentLocation() {
  const webViewRef = useRef<WebView>(null);

  const [region, setRegion] =
    useState<LocationData | null>(null);

  const [mapInitialRegion, setMapInitialRegion] =
    useState<LocationData | null>(null);

  const [address, setAddress] =
    useState<AddressData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [locationError, setLocationError] =
    useState(false);

  const [recenterLoading, setRecenterLoading] =
    useState(false);

  const reverseGeocode = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      const result =
        await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

      console.log(
        "REVERSE GEOCODE RESULT:",
        result
      );

      if (result.length > 0) {
        setAddress(result[0]);
      }
    } catch (error) {
      console.log(
        "REVERSE GEOCODE ERROR:",
        error
      );
    }
  };

  const updateSelectedLocation = async (
    latitude: number,
    longitude: number
  ) => {
    const newLocation = {
      latitude,
      longitude,
    };

    setRegion(newLocation);

    await reverseGeocode(
      latitude,
      longitude
    );
  };

  const getCurrentLocation = async (
    shouldRecenterMap = false
  ) => {
    try {
      if (shouldRecenterMap) {
        setRecenterLoading(true);
      } else {
        setLoading(true);
      }

      setLocationError(false);

      const permission =
        await Location.getForegroundPermissionsAsync();

      console.log(
        "LOCATION PERMISSION BEFORE:",
        permission
      );

      if (
        permission.status !== "granted"
      ) {
        const requestedPermission =
          await Location.requestForegroundPermissionsAsync();

        console.log(
          "LOCATION PERMISSION AFTER:",
          requestedPermission
        );

        if (
          requestedPermission.status !==
          "granted"
        ) {
          setLocationError(true);
          setLoading(false);
          setRecenterLoading(false);
          return;
        }
      }

      const servicesEnabled =
        await Location.hasServicesEnabledAsync();

      console.log(
        "LOCATION SERVICES ENABLED:",
        servicesEnabled
      );

      if (!servicesEnabled) {
        setLocationError(true);
        setLoading(false);
        setRecenterLoading(false);
        return;
      }

      const current =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        });

      console.log(
        "CURRENT LOCATION:",
        current
      );

      const latitude =
        current.coords.latitude;

      const longitude =
        current.coords.longitude;

      const newLocation = {
        latitude,
        longitude,
      };

      console.log(
        "NEW GPS LOCATION:",
        newLocation
      );

      if (!shouldRecenterMap) {
        setMapInitialRegion(
          newLocation
        );
      }

      setRegion(newLocation);

      await reverseGeocode(
        latitude,
        longitude
      );

      if (
        shouldRecenterMap &&
        webViewRef.current
      ) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type:
              "RECENTER_TO_LOCATION",
            latitude,
            longitude,
          })
        );
      }

      console.log(
        "LOCATION UPDATED:",
        newLocation
      );

      setLoading(false);
      setRecenterLoading(false);
    } catch (error) {
      console.log(
        "CURRENT LOCATION ERROR:",
        error
      );

      if (!shouldRecenterMap) {
        setLocationError(true);
      }

      setLoading(false);
      setRecenterLoading(false);
    }
  };

  const handleMapMessage = async (
    event: WebViewMessageEvent
  ) => {
    try {
      const data =
        JSON.parse(
          event.nativeEvent.data
        );

      if (
        data.type === "MAP_MOVED"
      ) {
        const latitude =
          Number(data.latitude);

        const longitude =
          Number(data.longitude);

        if (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        ) {
          await updateSelectedLocation(
            latitude,
            longitude
          );
        }
      }
    } catch (error) {
      console.log(
        "MAP MESSAGE ERROR:",
        error
      );
    }
  };

  const getAddressText = () => {
    if (!address) {
      return "Locating address...";
    }

    const street = [
      address.streetNumber,
      address.street,
    ]
      .filter(Boolean)
      .join(" ");

    if (street) {
      return street;
    }

    if (address.formattedAddress) {
      return address.formattedAddress;
    }

    return "Selected location";
  };

  const getCityText = () => {
    if (!address) {
      return "";
    }

    return [
      address.city,
      address.district,
      address.subregion,
      address.region,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const createMapHtml = () => {
    if (!mapInitialRegion) {
      return "";
    }

    return `
<!DOCTYPE html>
<html>

<head>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>

<style>

html,
body,
#map {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

html,
body {
  overflow: hidden;
  overscroll-behavior: none;
  background: #ffffff;
}

body {
  position: fixed;
  inset: 0;
  touch-action: none;
}

.leaflet-container {
  width: 100%;
  height: 100%;
  background: #ffffff;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  touch-action: none;

  cursor: grab;
}

.leaflet-container:active {
  cursor: grabbing;
}

.leaflet-control-zoom {
  display: none !important;
}

.leaflet-container .leaflet-tile {
  image-rendering: auto;
}

.leaflet-control-attribution {
  font-size: 7px;

  color: #999999;

  background:
    rgba(255,255,255,0.72);

  border-radius: 5px;

  padding: 2px 4px;
}



.location-marker-wrapper {
  position: relative;

  width: 76px;
  height: 76px;

  display: flex;

  align-items: center;
  justify-content: center;

  pointer-events: none;
}

.location-glow {
  position: absolute;

  width: 70px;
  height: 70px;

  border-radius: 50%;

  background:
    rgba(254,193,3,0.08);

  animation:
    locationPulse 2.4s
    cubic-bezier(0.22, 1, 0.36, 1)
    infinite;
}

.location-glow-inner {
  position: absolute;

  width: 46px;
  height: 46px;

  border-radius: 50%;

  background:
    rgba(254,193,3,0.14);

  animation:
    locationPulseInner 2.4s
    cubic-bezier(0.22, 1, 0.36, 1)
    infinite;
}

.location-marker {
  position: relative;

  width: 24px;
  height: 24px;

  border-radius: 50%;

  background: #FEC103;

  border: 2px solid #FFFFFF;

  box-sizing: border-box;

  z-index: 10;

  box-shadow:
    0 2px 8px
    rgba(0,0,0,0.16),

    0 0 0 2px
    rgba(254,193,3,0.28);
}

.location-marker::after {
  content: "";

  position: absolute;

  width: 7px;
  height: 7px;

  left: 50%;
  top: 50%;

  transform:
    translate(-50%, -50%);

  border-radius: 50%;
}

@keyframes locationPulse {

  0% {
    transform: scale(0.55);
    opacity: 0.72;
  }

  70% {
    transform: scale(1.38);
    opacity: 0;
  }

  100% {
    transform: scale(1.38);
    opacity: 0;
  }

}

@keyframes locationPulseInner {

  0% {
    transform: scale(0.65);
    opacity: 0.58;
  }

  60% {
    transform: scale(1.2);
    opacity: 0;
  }

  100% {
    transform: scale(1.2);
    opacity: 0;
  }

}



.leaflet-fade-anim .leaflet-tile {
  transition:
    opacity 0.2s ease;
}

.leaflet-zoom-anim
.leaflet-zoom-animated {
  transition:
    transform 0.35s
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

</style>

</head>

<body>

<div id="map"></div>

<script
src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
</script>

<script>

const initialLatitude =
  ${mapInitialRegion.latitude};

const initialLongitude =
  ${mapInitialRegion.longitude};

const map = L.map(
  "map",
  {

    zoomControl: false,

    attributionControl: true,

    zoomAnimation: true,

    fadeAnimation: true,

    markerZoomAnimation: true,

    dragging: true,

    touchZoom: true,

    doubleClickZoom: true,

    boxZoom: false,

    keyboard: false,

    scrollWheelZoom: false,

    zoomSnap: 0.25,

    zoomDelta: 0.5,

    wheelDebounceTime: 30,

    wheelPxPerZoomLevel: 80,

    inertia: true,

    inertiaDeceleration: 2800,

    inertiaMaxSpeed: 1500,

    easeLinearity: 0.15

  }

).setView(

  [
    initialLatitude,
    initialLongitude
  ],

  17,

  {
    animate: false
  }

);



L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    minZoom: 3,
    tileSize: 256,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    keepBuffer: 6,
    updateWhenZooming: false,
    updateWhenIdle: true,
    updateInterval: 150,
  }
).addTo(map);


const markerIcon =
  L.divIcon({

    className: "",

    html: \`

      <div
        class="location-marker-wrapper"
      >

        <div
          class="location-glow"
        ></div>

        <div
          class="location-glow-inner"
        ></div>

        <div
          class="location-marker"
        ></div>

      </div>

    \`,

    iconSize: [
      76,
      76
    ],

    iconAnchor: [
      38,
      38
    ]

  });

const marker =
  L.marker(

    [
      initialLatitude,
      initialLongitude
    ],

    {

      icon:
        markerIcon,

      interactive:
        false,

      keyboard:
        false

    }

  ).addTo(map);

let lastSentLatitude =
  initialLatitude;

let lastSentLongitude =
  initialLongitude;

let moveTimer = null;

let isRecentering =
  false;

map.on(
  "move",
  function() {

    const center =
      map.getCenter();

    marker.setLatLng([
      center.lat,
      center.lng
    ]);

  }
);

map.on(
  "moveend",
  function() {

    const center =
      map.getCenter();

    marker.setLatLng([
      center.lat,
      center.lng
    ]);

    if (isRecentering) {

      isRecentering =
        false;

      lastSentLatitude =
        center.lat;

      lastSentLongitude =
        center.lng;

      return;
    }

    const distance =
      Math.abs(
        center.lat -
        lastSentLatitude
      ) +
      Math.abs(
        center.lng -
        lastSentLongitude
      );

    if (distance < 0.000001) {
      return;
    }

    lastSentLatitude =
      center.lat;

    lastSentLongitude =
      center.lng;

    clearTimeout(
      moveTimer
    );

    moveTimer =
      setTimeout(
        function() {

          window.ReactNativeWebView.postMessage(

            JSON.stringify({

              type:
                "MAP_MOVED",

              latitude:
                center.lat,

              longitude:
                center.lng

            })

          );

        },
        80
      );

  }
);

map.on(
  "click",
  function(event) {

    const latitude =
      event.latlng.lat;

    const longitude =
      event.latlng.lng;

    map.flyTo(

      [
        latitude,
        longitude
      ],

      map.getZoom(),

      {

        animate: true,

        duration: 0.45,

        easeLinearity: 0.15

      }

    );

  }
);

let wheelTimeout = null;

map.getContainer()
  .addEventListener(

    "wheel",

    function(event) {

      event.preventDefault();
      event.stopPropagation();

      const rect =
        map.getContainer()
          .getBoundingClientRect();

      const point =
        L.point(

          event.clientX -
          rect.left,

          event.clientY -
          rect.top

        );

      const currentZoom =
        map.getZoom();

      const direction =
        event.deltaY < 0
          ? 1
          : -1;

      let zoomChange;

      if (
        Math.abs(event.deltaY) > 80
      ) {

        zoomChange =
          direction * 0.5;

      } else {

        zoomChange =
          direction * 0.25;

      }

      const targetZoom =
        Math.max(

          3,

          Math.min(

            20,

            currentZoom +
            zoomChange

          )

        );

      clearTimeout(
        wheelTimeout
      );

      wheelTimeout =
        setTimeout(
          function() {

            map.setZoomAround(

              point,

              targetZoom,

              {
                animate: true
              }

            );

          },
          10
        );

    },

    {
      passive: false
    }

  );


document.addEventListener(

  "wheel",

  function(event) {

    event.preventDefault();

  },

  {
    passive: false
  }

);

document.addEventListener(

  "touchmove",

  function(event) {

    event.preventDefault();

  },

  {
    passive: false
  }

);


document.addEventListener(
  "message",
  handleReactNativeMessage
);

window.addEventListener(
  "message",
  handleReactNativeMessage
);

function handleReactNativeMessage(event) {

  try {

    const data =
      typeof event.data === "string"
        ? JSON.parse(event.data)
        : event.data;

    if (
      data.type ===
      "RECENTER_TO_LOCATION"
    ) {

      const latitude =
        Number(
          data.latitude
        );

      const longitude =
        Number(
          data.longitude
        );

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {

        return;

      }

      isRecentering =
        true;

      clearTimeout(
        moveTimer
      );

      lastSentLatitude =
        latitude;

      lastSentLongitude =
        longitude;

      marker.setLatLng([
        latitude,
        longitude
      ]);

      map.flyTo(

        [
          latitude,
          longitude
        ],

        17,

        {

          animate: true,

          duration: 0.9,

          easeLinearity: 0.15

        }

      );

    }

  } catch (error) {

    console.log(
      "REACT NATIVE MESSAGE ERROR:",
      error
    );

  }

}

</script>

</body>

</html>
`;
  };

  useEffect(() => {
    const timer =
      setTimeout(() => {
        getCurrentLocation();
      }, 0);

    return () =>
      clearTimeout(timer);
  }, []);

  const handleRecenter = () => {
    getCurrentLocation(true);
  };

  const handleRetry = () => {
    getCurrentLocation();
  };

  const handleConfirmLocation = () => {
    router.replace(
      "/(tabs)/home"
    );
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>

        <Text style={styles.title}>
          Current Location
        </Text>

        <Text style={styles.description}>
          Allow Ride4Rent to use your
          current location to find
          vehicles near you.
        </Text>

      </View>

      <View style={styles.mapContainer}>

        {loading ? (

          <View
            style={
              styles.loadingContainer
            }
          >

            <ActivityIndicator
              size="large"
              color={
                Colors.primary
              }
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Finding your location...
            </Text>

          </View>

        ) : locationError ? (

          <View
            style={
              styles.errorContainer
            }
          >

            <Text
              style={
                styles.errorTitle
              }
            >
              Unable to get your
              location
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              Please allow location
              access so Ride4Rent can
              find your current
              location.
            </Text>

            <TouchableOpacity
              style={
                styles.retryButton
              }
              onPress={
                handleRetry
              }
            >

              <Text
                style={
                  styles.retryText
                }
              >
                Try Again
              </Text>

            </TouchableOpacity>

          </View>

        ) : region ? (

          <WebView
            ref={webViewRef}
            source={{
              html:
                createMapHtml(),
            }}
            style={styles.map}
            originWhitelist={[
              "*",
            ]}
            javaScriptEnabled
            domStorageEnabled
            onMessage={
              handleMapMessage
            }
            geolocationEnabled
            scrollEnabled={false}
          />

        ) : null}

        {!loading &&
          !locationError &&
          region && (

            <>

              <View
                pointerEvents="none"
                style={
                  styles.mapInstruction
                }
              >

                <Text
                  style={
                    styles.mapInstructionText
                  }
                >
                  Move the map or tap
                  to choose a location
                </Text>

              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={
                  styles.myLocationButton
                }
                onPress={
                  handleRecenter
                }
                disabled={
                  recenterLoading
                }
              >

                {recenterLoading ? (

                  <ActivityIndicator
                    size="small"
                    color={
                      Colors.dark
                    }
                  />

                ) : (

                  <View
                    style={
                      styles.myLocationIcon
                    }
                  >

                    <View
                      style={
                        styles.myLocationDot
                      }
                    />

                  </View>

                )}

              </TouchableOpacity>

            </>

          )}

      </View>

      <View
        style={
          styles.bottomSheet
        }
      >

        <View
          style={
            styles.sheetHandle
          }
        />

        <Text
          style={
            styles.locationTitle
          }
        >
          Your selected location
        </Text>

        <Text
          style={
            styles.addressText
          }
        >
          {getAddressText()}
        </Text>

        {getCityText() !== "" && (

          <Text
            style={
              styles.locationText
            }
          >
            {getCityText()}
          </Text>

        )}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            !region &&
              styles.disabledButton,
          ]}
          disabled={!region}
          onPress={
            handleConfirmLocation
          }
        >

          <Text
            style={
              styles.confirmText
            }
          >
            Confirm Location
          </Text>

        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      Colors.white,
  },

  header: {
    paddingHorizontal:
      Spacing.lg,

    paddingTop: 60,

    paddingBottom:
      Spacing.md,
  },

  title: {
    fontFamily:
      FontFamily.bold,

    fontSize:
      FontSize.heading,

    color:
      Colors.dark,
  },

  description: {
    marginTop:
      Spacing.xs,

    fontFamily:
      FontFamily.regular,

    fontSize:
      FontSize.body,

    color:
      Colors.secondary,

    lineHeight: 22,
  },

  mapContainer: {
    flex: 1,
    overflow: "hidden",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  mapInstruction: {
    position: "absolute",

    top:
      Spacing.md,

    left:
      Spacing.lg,

    right:
      Spacing.lg,

    alignItems:
      "center",
  },

  mapInstructionText: {
    backgroundColor:
      "rgba(255,255,255,0.96)",

    paddingHorizontal:
      Spacing.md,

    paddingVertical:
      Spacing.sm,

    borderRadius: 18,

    fontFamily:
      FontFamily.medium,

    fontSize: 12,

    color:
      Colors.dark,

    overflow:
      "hidden",

    elevation: 3,

    shadowColor:
      "#000",

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity:
      0.08,

    shadowRadius: 4,
  },

  myLocationButton: {
    position: "absolute",

    right:
      Spacing.lg,

    bottom:
      Spacing.lg,

    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor:
      Colors.white,

    alignItems:
      "center",

    justifyContent:
      "center",

    elevation: 6,

    shadowColor:
      "#000",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity:
      0.15,

    shadowRadius: 6,
  },

  myLocationIcon: {
    width: 22,
    height: 22,

    borderRadius: 11,

    borderWidth: 2,

    borderColor:
      Colors.dark,

    alignItems:
      "center",

    justifyContent:
      "center",
  },

  myLocationDot: {
    width: 8,
    height: 8,

    borderRadius: 4,

    backgroundColor:
      Colors.primary,
  },

  loadingContainer: {
    flex: 1,

    justifyContent:
      "center",

    alignItems:
      "center",
  },

  loadingText: {
    marginTop:
      Spacing.md,

    fontFamily:
      FontFamily.regular,

    fontSize:
      FontSize.body,

    color:
      Colors.secondary,
  },

  errorContainer: {
    flex: 1,

    justifyContent:
      "center",

    alignItems:
      "center",

    paddingHorizontal:
      Spacing.xl,
  },

  errorTitle: {
    fontFamily:
      FontFamily.bold,

    fontSize:
      FontSize.body,

    color:
      Colors.dark,

    textAlign:
      "center",
  },

  errorText: {
    marginTop:
      Spacing.sm,

    fontFamily:
      FontFamily.regular,

    fontSize: 14,

    color:
      Colors.secondary,

    textAlign:
      "center",

    lineHeight: 21,
  },

  retryButton: {
    marginTop:
      Spacing.lg,

    backgroundColor:
      Colors.primary,

    paddingHorizontal:
      Spacing.xl,

    paddingVertical:
      Spacing.md,

    borderRadius: 25,
  },

  retryText: {
    fontFamily:
      FontFamily.bold,

    color:
      Colors.dark,
  },

  sheetHandle: {
    alignSelf:
      "center",

    width: 42,
    height: 4,

    borderRadius: 10,

    backgroundColor:
      "#D9D9D9",

    marginBottom:
      Spacing.md,
  },

  bottomSheet: {
    backgroundColor:
      Colors.white,

    paddingHorizontal:
      Spacing.lg,

    paddingTop:
      Spacing.md,

    paddingBottom:
      Spacing.xl,

    borderTopLeftRadius:
      24,

    borderTopRightRadius:
      24,

    elevation: 10,

    shadowColor:
      "#000",

    shadowOffset: {
      width: 0,
      height: -3,
    },

    shadowOpacity:
      0.08,

    shadowRadius: 10,
  },

  locationTitle: {
    fontFamily:
      FontFamily.bold,

    fontSize:
      FontSize.body,

    color:
      Colors.dark,
  },

  addressText: {
    marginTop: 4,

    fontFamily:
      FontFamily.medium,

    fontSize: 15,

    color:
      Colors.dark,
  },

  locationText: {
    marginTop: 3,

    fontFamily:
      FontFamily.regular,

    fontSize: 13,

    color:
      Colors.secondary,
  },

  confirmButton: {
    marginTop:
      Spacing.md,

    backgroundColor:
      Colors.primary,

    paddingVertical:
      Spacing.md,

    borderRadius: 25,

    alignItems:
      "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  confirmText: {
    fontFamily:
      FontFamily.bold,

    fontSize:
      FontSize.body,

    color:
      Colors.white,
  },

});
