const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Run the actual API resolver without loading React Native or making requests.
const source = fs.readFileSync(path.join(__dirname, "../src/services/api.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const origin = "https://ride4rent-production.up.railway.app";
const moduleObject = { exports: {} };
const interceptor = { use() {} };
vm.runInNewContext(compiled, {
  exports: moduleObject.exports,
  module: moduleObject,
  process: { env: { EXPO_PUBLIC_API_URL: `${origin}/api/v1` } },
  console,
  require(name) {
    if (name === "axios") return { create: () => ({ interceptors: { request: interceptor, response: interceptor } }) };
    if (name === "expo-constants") return {};
    if (name === "@/features/auth/storage/authStorage") return { getToken: async () => null };
    throw new Error(`Unexpected native/asset dependency: ${name}`);
  },
});

const { resolveImageUrl, normalizeApiImages } = moduleObject.exports;
const fleetPath = "vehicles/NgjBfESpFvEKvQKd1urqnE5ODqSp2z23OXow93oA.jpg";
for (const storagePath of [fleetPath, "profile-photos/example.jpg", "chat_images/example.jpg"]) {
  const expected = `${origin}/storage/${storagePath}`;
  for (const input of [storagePath, `/storage/${storagePath}`, expected,
    `http://ride4rent-production.up.railway.app/storage/${storagePath}`,
    `http://192.168.1.20:8000/storage/${storagePath}`,
    `${origin}/storage/${expected}`]) {
    assert.equal(resolveImageUrl(input), expected);
    assert.equal(resolveImageUrl(resolveImageUrl(input)), expected, "Repeated resolution must preserve server URLs");
  }
}
for (const uri of ["file:///photo.jpg", "content://media/123", "data:image/jpeg;base64,example"]) {
  assert.equal(resolveImageUrl(uri), uri);
}
assert.equal(resolveImageUrl(null), null);
const payload = { cover_photo: fleetPath, image_url: fleetPath,
  operator: { profile_photo: "profile-photos/example.jpg" },
  messages: [{ image_url: "chat_images/example.jpg" }] };
normalizeApiImages(payload);
const firstPass = JSON.stringify(payload);
normalizeApiImages(payload);
assert.equal(JSON.stringify(payload), firstPass, "Repeated API normalization must be stable");
assert.equal(payload.image_url, `${origin}/storage/${fleetPath}`);
assert.equal(payload.operator.profile_photo, `${origin}/storage/profile-photos/example.jpg`);
assert.equal(payload.messages[0].image_url, `${origin}/storage/chat_images/example.jpg`);
console.log("Image URL checks passed: server URLs, Android release independence, repeated normalization, profiles, chat, and local uploads.");
