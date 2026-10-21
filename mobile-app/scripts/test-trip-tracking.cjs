const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function compiled(relative) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src", relative), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
const telemetry = {};
vm.runInNewContext(compiled("utils/tripTelemetry.ts"), { exports: telemetry });
function service({ missingTaskManager = false, foregroundDenied = false, appLocationOff = false, cached = null, gpsHangs = false, fastTimeout = false } = {}) {
  const pings = [];
  let watcher;
  const exports = {};
  vm.runInNewContext(compiled("services/tripLocationService.ts"), {
    exports, console, clearTimeout,
    setTimeout: fastTimeout ? callback => { queueMicrotask(callback); return 1; } : setTimeout,
    require(name) {
      if (name.includes("async-storage")) return { __esModule: true, default: { getItem: async () => appLocationOff ? "false" : null, setItem: async () => {}, removeItem: async () => {} } };
      if (name === "expo") return { isRunningInExpoGo: () => false, requireOptionalNativeModule: () => missingTaskManager ? null : {} };
      if (name === "react-native") return { Platform: { OS: "android" } };
      if (name === "@/utils/tripTelemetry") return telemetry;
      if (name === "expo-task-manager") return { defineTask: () => {}, isAvailableAsync: async () => true };
      if (name === "expo-location") return {
        Accuracy: { Balanced: 3, High: 4 },
        hasServicesEnabledAsync: async () => true,
        getLastKnownPositionAsync: async () => cached,
        getForegroundPermissionsAsync: async () => ({ granted: !foregroundDenied }),
        requestForegroundPermissionsAsync: async () => ({ granted: !foregroundDenied }),
        requestBackgroundPermissionsAsync: async () => { throw Error("Background native support unavailable"); },
        getCurrentPositionAsync: () => gpsHangs ? new Promise(() => {}) : Promise.resolve({ coords: { latitude: 13.0453, longitude: 121.4878, speed: 2 } }),
        reverseGeocodeAsync: () => new Promise(() => {}),
        watchPositionAsync: async (_, callback) => { watcher = callback; return { remove() {} }; },
      };
      if (name === "./bookingService") return { reportTripLocationOff: async () => {}, getMyBookings: async () => [{ id: 5, renter_id: 1, status: "trip_in_progress" }], sendBookingLocation: async (id, data) => { pings.push({ id, ...data }); } };
      if (name.includes("authStorage")) return { getToken: async () => "test-token", getUser: async () => ({ id: 1 }) };
      throw Error(`Unexpected import ${name}`);
    },
  });
  return { ...exports, pings, emit: (position) => watcher(position) };
}

async function providerFallback() {
  const effects = [];
  let interval;
  let transmissions = 0;
  const exports = {};
  vm.runInNewContext(compiled("context/TripLocationContext.tsx"), {
    exports, console, setInterval: callback => { interval = callback; return 1; }, clearInterval: () => {},
    require(name) {
      if (name === "react") return { useEffect: callback => effects.push(callback), useRef: value => ({ current: value }) };
      if (name.includes("async-storage")) return { __esModule: true, default: { getItem: async () => null } };
      if (name === "react-native") return { AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) } };
      if (name.includes("useAuth")) return { useAuth: () => ({ user: { id: 1, role: "customer" } }) };
      if (name.includes("ToastContext")) return { useAppToast: () => ({ showWarning() {} }) };
      if (name.includes("bookingService")) return { getMyBookings: async () => [{ id: 5, status: "trip_in_progress", is_multi_vehicle_rental: "0" }] };
      if (name.includes("tripLocationService")) return { getLocationSharingOffReason: async () => null, ensureTripLocationPermission: async () => {}, startTripTracking: async () => { throw Error("Background setup failed"); }, stopTripTracking: async () => {}, transmitTripLocation: async () => { transmissions++; } };
      throw Error(`Unexpected import ${name}`);
    },
  });
  exports.TripLocationProvider({ children: null });
  effects[0]();
  const cleanup = effects[1]();
  await new Promise(setImmediate);
  assert.equal(transmissions, 1, "Initial foreground GPS upload must not depend on background setup");
  await interval();
  assert.equal(transmissions, 2, "Periodic foreground upload must continue after background failure");
  cleanup();
}

(async () => {
  const tracker = service();
  await tracker.transmitTripLocation(5);
  assert.equal(tracker.pings.length, 1, "An unresolved address lookup must not hold up coordinate upload");
  assert.equal(tracker.pings[0].latitude, 13.0453);
  assert.equal(tracker.pings[0].speed, 7);
  assert.equal(await tracker.startTripTracking(5), false, "Background setup failure must be a safe foreground fallback");
  await tracker.transmitTripLocation(5);
  assert.equal(tracker.pings.length, 2);
  assert.equal(await service({ missingTaskManager: true }).startTripTracking(5), false);
  await assert.rejects(service({ foregroundDenied: true }).ensureTripLocationPermission(), /Location permission/);
  await providerFallback();
  const direct = service();
  await direct.publishCurrentTripLocation(5);
  assert.equal(direct.pings.length, 1, "Renter map can request a real GPS upload without waiting for provider polling");
  await assert.rejects(direct.publishCurrentTripLocation(999), /your active trip/);
  await assert.rejects(service({ appLocationOff: true }).publishCurrentTripLocation(5), /Ride4Rent Settings/);
  const stopped = service({ appLocationOff: true });
  await assert.rejects(stopped.transmitTripLocation(5, { coords: { latitude: 13.1, longitude: 121.2, speed: 0 } }), /Location sharing is off/);
  assert.equal(stopped.pings.length, 0, "A pending GPS fix must not publish after location sharing is switched off");
  const recent = { coords: { latitude: 13.1, longitude: 121.2, speed: 0 } };
  assert.equal(await service({ cached: recent, gpsHangs: true }).getTripGpsFix(), recent);
  await assert.rejects(service({ gpsHangs: true, fastTimeout: true }).getTripGpsFix(), /Finding your GPS location/);
  const live = service();
  let sent = 0;
  const watcher = await live.watchCurrentTripLocation(5, () => { sent++; }, message => { throw Error(message); });
  await live.emit({ coords: { latitude: 13.2, longitude: 121.3, speed: 0 } });
  assert.equal(live.pings.length, 1, "Foreground watcher uploads actual new GPS fixes");
  assert.equal(sent, 1);
  watcher.remove();
  await live.emit({ coords: { latitude: 13.3, longitude: 121.4, speed: 0 } });
  assert.equal(live.pings.length, 1, "Leaving Live GPS stops this screen's watcher");
  assert.equal(telemetry.gpsSpeedKmh(0.0015749), 0);
  assert.equal(telemetry.gpsSpeedKmh(10), 36);
  assert.equal(telemetry.displayTripSpeed(0.005669642938301, true), "0 km/h");
  assert.equal(telemetry.displayTripSpeed(35.86389, true), "36 km/h");
  assert.equal(telemetry.displayTripSpeed(36, false), "— km/h");
  assert.equal(telemetry.displayTripSpeed(null, true), "— km/h");
  console.log("Trip tracking checks passed: immediate GPS upload, slow address lookup, missing background support, permissions and continued foreground sharing.");
})().catch(error => { console.error(error); process.exitCode = 1; });
