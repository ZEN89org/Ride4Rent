const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ts = require("typescript");
const exportsObject = {};
const boundary = { geometry: { type: "Polygon", coordinates: [[[121, 12], [122, 12], [122, 13], [121, 13], [121, 12]]] } };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src/utils/serviceArea.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject, require: () => ({ __esModule: true, default: boundary }) });
for (const lockViewport of [false, true]) {
  const polygons = [];
  const borders = [];
  let locked = false;
  const bounds = { pad() { return this; } };
  const layer = { addTo() { return this; }, getBounds: () => bounds, addAttribution() { return this; } };
  vm.runInNewContext(exportsObject.serviceAreaLockScript("window.map", lockViewport), {
    window: { map: { options: {}, setMaxBounds() { locked = true; }, getBoundsZoom: () => 8, setMinZoom() {} } },
    setTimeout: callback => callback(),
    L: {
      polygon: (rings, options) => { polygons.push({ rings, options }); return layer; },
      geoJSON: (_, options) => { borders.push(options); return layer; },
      control: { attribution: () => layer },
    },
  });
  assert.equal(polygons.length, 1, "Live GPS and pickup maps both draw the outside-province backdrop");
  assert.equal(polygons[0].rings.length, 2, "Province remains a cutout in the dark backdrop");
  assert.equal(polygons[0].options.fillOpacity, 0.65);
  assert.equal(polygons[0].options.interactive, false, "Backdrop must not intercept map gestures");
  assert.ok(borders.some(border => border.style.color === "#FEC103"));
  assert.equal(locked, lockViewport);
}
console.log("Map backdrop checks passed: dimmed outside area, province cutout, yellow boundary and unaffected live-map gestures.");
