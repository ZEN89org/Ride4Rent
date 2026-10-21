const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

let permission = { status: "undetermined", canAskAgain: true };
let prompts = 0;
let scheduled = 0;
const notifications = {
  getPermissionsAsync: async () => permission,
  requestPermissionsAsync: async () => { prompts++; permission = { status: "granted", canAskAgain: true }; return permission; },
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async () => {},
  scheduleNotificationAsync: async () => { scheduled++; return "notification-1"; },
};
function load(file, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, "../src", file), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: dependencies, console, setTimeout, clearTimeout });
  return exports;
}

async function main() {
  const service = load("services/deviceNotificationService.ts", (id) => {
    if (id === "react-native") return { Platform: { OS: "android" } };
    if (id === "expo-router") return { router: {} };
    if (id === "@react-native-async-storage/async-storage") return { getItem: async () => null };
    if (id.startsWith("expo-notifications")) return notifications;
    throw new Error(`Unexpected dependency ${id}`);
  });
  assert.equal(prompts, 0, "Importing the notification service must not open a permission prompt");
  assert.equal(await service.requestDeviceNotificationPermission(), false);
  await service.triggerDeviceNotification("Booking", "Test");
  await service.scheduleBookingReminders({ id: 1, status: "pending_payment" });
  assert.equal(prompts, 0, "Background checks and reminders must not request permission");
  assert.equal(scheduled, 0, "Do not schedule alerts before consent");
  const onboarding = load("services/permissionService.ts", (id) => {
    if (id === "expo-location") return {};
    if (id === "./deviceNotificationService") return service;
    throw new Error(`Unexpected dependency ${id}`);
  });
  assert.equal(await onboarding.requestNotificationPermission(), true);
  assert.equal(prompts, 1, "The onboarding Allow action should request permission once");
  await service.triggerDeviceNotification("Trip", "Ready");
  assert.equal(scheduled, 1);
  assert.equal(prompts, 1, "An alert must not ask again after consent");
  permission = { status: "denied", canAskAgain: false };
  assert.equal(await service.requestDeviceNotificationPermission(true), false);
  assert.equal(prompts, 1, "Respect an OS denial that cannot be requested again");
  console.log("Startup permission checks passed: no import/background prompts, explicit onboarding consent, granted alerts and denied permissions.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
