const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/utils', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  return exports;
}
const { keyboardScrollDelta: delta } = load('keyboardVisibility.ts');
assert.equal(delta(100, 52, 50, 400), 0, 'Visible fields should remain still');
assert.equal(delta(360, 52, 50, 400), 28, 'Move the field above the keyboard with 16px clearance');
assert.equal(delta(40, 52, 50, 400), -26, 'Reveal fields above the visible form');
assert.equal(delta(80, 500, 50, 400), 14, 'Oversized multiline fields align at the top');
assert.equal(delta(100, 52, 400, 400), 0, 'Ignore a collapsed viewport');
assert.equal(delta(600, 52, 50, 700), 0, 'Do not add movement when the keyboard is absent');
const { paginateItems } = load('paginateItems.ts');
const vehicles = Array.from({ length: 12 }, (_, index) => index + 1);
assert.equal(paginateItems(vehicles, 1, 5).items.join(','), '1,2,3,4,5');
assert.equal(paginateItems(vehicles, 2, 5).items.join(','), '6,7,8,9,10');
assert.equal(paginateItems(vehicles, 3, 5).items.join(','), '11,12');
assert.equal(paginateItems(vehicles.slice(0, 2), 3, 5).page, 1, 'Filtering clamps the old page');
assert.equal(paginateItems([], 9, 5).items.length, 0);
console.log('Keyboard visibility and five-card pagination checks passed.');
