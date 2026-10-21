const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const Stack = Object.assign(() => {}, { Screen: () => {} });
const states = [], refs = [], sequences = [];
let stateIndex = 0, refIndex = 0, effect;
class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } stopAnimation() {} }
const native = {
  Platform: { OS: 'android' }, StatusBar: () => {}, View: 'View', useWindowDimensions: () => ({ height: 800 }),
  StyleSheet: { create: styles => styles }, Easing: { cubic: t => t ** 3, quad: t => t ** 2, out: easing => t => 1 - easing(1 - t), inOut: easing => easing },
  Animated: { Value, View: 'AnimatedView', timing: (value, options) => ({ kind: 'timing', value, options }), delay: duration => ({ kind: 'delay', duration }), sequence: steps => ({ start() { sequences.push(steps); } }) },
};
function load(file) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/app', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, console, require(name) {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return {
        useState(initial) { const slot = stateIndex++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial; return [states[slot], value => { states[slot] = value; }]; },
        useRef(initial) { const slot = refIndex++; return refs[slot] ||= { current: initial }; },
        useEffect(callback) { effect = callback; },
      };
      if (name === 'react-native') return native;
      if (name === 'expo-router') return { Stack, router: { replace() { throw Error('Navigation must not be needed to start the splash'); } } };
      if (name === 'expo-font') return { useFonts: () => [false] };
      if (name === 'expo-splash-screen') return { setOptions() {} };
      if (name.includes('LaunchArtwork')) return { __esModule: true, default: 'Artwork', FIRST_SPLASH_TOP_RATIO: .2 };
      if (name.includes('AppLogo')) return { __esModule: true, default: 'Logo' };
      if (name.includes('authStorage')) return { isFirstLaunch: () => new Promise(() => {}) };
      if (name.includes('colors')) return { Colors: { white: '#FFFFFF' } };
      return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : () => {} });
    },
  });
  return exports.default;
}
function find(node, type) {
  if (!node) return undefined;
  if (node.type === type) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) { const match = find(child, type); if (match) return match; }
}
const Layout = load('_layout.tsx');
assert.ok(find(Layout(), Stack), 'The startup route must mount while fonts are still loading');
const Index = load('index.tsx');
function render() { stateIndex = 0; refIndex = 0; return Index(); }
const tree = render();
effect();
assert.equal(sequences.length, 0, 'Do not slide an image that has not displayed yet');
find(tree, 'Artwork').props.onLoad();
render(); effect();
assert.equal(sequences.length, 1, 'Image display starts animation without waiting for auth storage or fonts');
assert.equal(sequences[0][0].kind, 'timing', 'There must be no hold before the first slide');
assert.ok(sequences[0][0].options.easing(.05) > .1, 'Motion must be visible at the beginning, without a slow ease-in');
console.log('Splash timing checks passed: route mounts before fonts finish and the displayed artwork slides immediately, independently of authentication loading.');
