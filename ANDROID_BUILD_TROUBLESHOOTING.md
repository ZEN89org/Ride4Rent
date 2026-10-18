# Android native build: memory and disk exhaustion

The 2026-10-18 failure after 1m 38s contains two concrete errors:

- Expo Modules native compilation: "The paging file is too small for this operation to complete."
- Reanimated native compilation: "LLVM ERROR: out of memory" / "Allocation failed".

The splash-resource failure was already repaired and its failed task passed. This later failure is Windows memory/commit exhaustion. C: had roughly 250–320 MB free during diagnosis.

## Before retrying

1. Free disk space on C:. Aim for at least 10 GB free as a practical starting point. The new helper requires at least 5 GiB before it starts; this is a guardrail, not a guarantee that every build fits.
2. Close the Android emulator, unused Android Studio windows, and other memory-heavy programs while compiling for a physical phone. Keep existing Gradle caches; deleting them forces downloads/recompilation.
3. Check Windows virtual memory: Win+R → SystemPropertiesAdvanced → Performance / Settings → Advanced → Virtual memory / Change. Enable "Automatically manage paging file size for all drives" if disabled. Apply the setting and restart Windows if requested. Windows needs free disk space for paging-file growth; the appropriate size depends on workload and memory demand.
4. Build with the opt-in command below. It serializes Gradle workers and configures a one-job CMake/Ninja compile/link pool for Android native modules. Ordinary Expo build settings are unchanged. The helper and Gradle init file live in mobile-app/scripts, so Expo prebuild does not remove them.

## Physical Android phone (usual arm64-v8a architecture)

Run in Windows PowerShell:

```powershell
cd C:\capstone\Ride4Rent\mobile-app
npm run android:build:low-memory
```

Once it reports BUILD SUCCESSFUL, connect exactly one physical phone with USB debugging enabled and authorize the computer on the phone:

```powershell
adb devices
adb -d install -r .\android\app\build\outputs\apk\debug\app-debug.apk
npx expo start --dev-client --clear
```

Open the installed Ride4Rent development app and connect to Metro. The build command assembles an APK; it does not automatically install or launch it. If adb reports INSTALL_FAILED_UPDATE_INCOMPATIBLE, an older app with a different signing key is installed. Removing that older app clears its local app data; preserve anything needed before uninstalling it.

## x86_64 Android emulator

The failed command in the log targets x86_64, normally an emulator architecture. To keep that target:

```powershell
npm run android:build:low-memory -- x86_64
```

Build with the emulator closed to reduce memory use, then start it and install the APK using adb -e install -r. Do not install an arm64-only APK on an x86_64 emulator.

## Validation performed

- Gradle verifyRide4RentBuildLimits passed for app, expo-modules-core, react-native-reanimated, and react-native-worklets.
- Node syntax and targeted ESLint passed for the helper.
- Verified the helper blocks low-disk builds, rejects unsupported architecture arguments, and passes the serial-build configuration to Gradle.
- Full native APK assembly was not rerun while disk space remained critically low. Audio, background GPS, and physical-device behavior still need the completed native build.

Sources:

- https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/how-to-determine-the-appropriate-page-file-size-for-64-bit-versions-of-windows
- https://cmake.org/cmake/help/latest/prop_gbl/JOB_POOLS.html
- https://cmake.org/cmake/help/latest/variable/CMAKE_JOB_POOL_COMPILE.html
