const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
const logo = './assets/images/applogo.png';
assert.equal(app.icon, logo);
assert.equal(app.android.icon, logo);
assert.equal(app.ios.icon, logo);
assert.equal(app.web.favicon, logo);
assert.equal(app.android.adaptiveIcon, undefined, 'Use the uncropped official icon fallback instead of a masked foreground layer');
const png = fs.readFileSync(path.join(root, logo));
assert.equal(png.readUInt32BE(16), 1024);
assert.equal(png.readUInt32BE(20), 1024);
const splash = app.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
assert.equal(splash.backgroundColor, '#FFFFFF');
assert.equal(splash.android.dark.backgroundColor, '#FFFFFF');
assert.equal(splash.ios.backgroundColor, '#FFFFFF');
assert.equal(splash.ios.dark.backgroundColor, '#FFFFFF');
assert.equal(splash.ios.image, undefined, 'Do not add another native image before the two app splash screens');
const drawable = fs.readFileSync(path.join(root, splash.android.drawable.icon), 'utf8');
assert.match(drawable, /android:fillColor="#00000000"/);
assert.equal(eas.build.preview.autoIncrement, true);
assert.equal(eas.build.preview.android.buildType, 'apk');
assert.equal(eas.build.preview.env.EXPO_PUBLIC_API_URL, 'https://ride4rent-production.up.railway.app/api/v1');
if (fs.existsSync(path.join(root, 'android/app/src/main/res/values/colors.xml'))) {
  for (const theme of ['values', 'values-night']) {
    const colors = fs.readFileSync(path.join(root, `android/app/src/main/res/${theme}/colors.xml`), 'utf8');
    assert.match(colors, /name="splashscreen_background">#FFFFFF</);
  }
  assert.equal(fs.existsSync(path.join(root, 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml')), false);
}
console.log('Release branding checks passed: official uncropped icon, white native launch window, hidden native logo and incrementing preview APK builds.');
