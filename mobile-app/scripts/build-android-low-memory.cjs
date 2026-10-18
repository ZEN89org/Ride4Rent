const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.dirname(require.resolve('../package.json'));
const arch = process.argv[2] || 'arm64-v8a';
if (!['arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86'].includes(arch)) {
  console.error('Choose one Android architecture: arm64-v8a (usual physical phone), armeabi-v7a, x86_64, or x86.');
  process.exit(1);
}

const disk = fs.statfsSync(root);
const freeGiB = disk.bavail * disk.bsize / (1024 ** 3);
if (freeGiB < 5) {
  console.error(`Build stopped: only ${freeGiB.toFixed(2)} GiB free on the project drive. Free at least 5 GiB before compiling; 10 GiB is a safer target. Close memory-heavy apps and ensure Windows virtual memory is system-managed.`);
  process.exit(1);
}

const android = path.join(root, 'android');
const windows = process.platform === 'win32';
const wrapper = path.join(android, windows ? 'gradlew.bat' : 'gradlew');
if (!fs.existsSync(wrapper)) {
  console.error('Android project is missing. Run npx expo prebuild --platform android --no-install first.');
  process.exit(1);
}

const args = [':app:assembleDebug', '-I', '../scripts/android-low-memory.gradle', '--max-workers=1', '--no-parallel', '--build-cache', '--console=plain', `-PreactNativeArchitectures=${arch}`];
// The command and arguments are fixed/allowlisted; cmd is needed for Windows .bat.
const result = windows
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `gradlew.bat ${args.join(' ')}`], { cwd: android, stdio: 'inherit' })
  : spawnSync(wrapper, args, { cwd: android, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
if (result.status === 0) console.log(`APK ready: ${path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')}`);
process.exit(result.status ?? 1);
