const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../src/utils/clipboard.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function load({ available = false, os = "android", write, setString } = {}) {
  let nativeImports = 0;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    navigator: write ? { clipboard: { writeText: write } } : {},
    require(name) {
      if (name === "expo") return { requireOptionalNativeModule: () => available ? {} : null };
      if (name === "react-native") return { Platform: { OS: os } };
      if (name === "expo-clipboard") { nativeImports++; if (!available) throw Error("Native module missing"); return { setStringAsync: setString }; }
      throw Error(`Unexpected dependency: ${name}`);
    },
  });
  return { copy: exports.copyToClipboard, imports: () => nativeImports };
}
(async () => {
  const missing = load();
  assert.equal(await missing.copy("09171234567"), false);
  assert.equal(missing.imports(), 0, "Missing module must never be imported");
  let copied;
  const native = load({ available: true, setString: async text => { copied = text; return true; } });
  assert.equal(await native.copy("0917 123 4567", true), true);
  assert.equal(copied, "09171234567");
  assert.equal(await load({ available: true, setString: async () => { throw Error("Unavailable"); } }).copy("value"), false);
  assert.equal(await load({ os: "web", write: async text => { copied = text; } }).copy("web text"), true);
  assert.equal(copied, "web text");
  assert.equal(await load({ os: "web" }).copy("value"), false);
  assert.equal(await native.copy(""), false);
  console.log("Clipboard checks passed: missing native module, native copy, copy failure, web fallback and empty input.");
})().catch(error => { console.error(error); process.exitCode = 1; });
