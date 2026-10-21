const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/livekitAudioService.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function harness(options = {}) {
  const log = [], rooms = [], exported = {};
  let release;
  const sdk = { registerGlobals() { log.push('globals'); }, AudioSession: {
    async startAudioSession() { log.push('start'); }, async stopAudioSession() { log.push('stop'); },
    async getAudioOutputs() { return ['earpiece', 'speaker']; }, async selectAudioOutput(value) { log.push(value); },
  }};
  class Room {
    constructor() { this.state = 'disconnected'; this.events = {}; this.id = rooms.length; rooms.push(this); this.localParticipant = { setMicrophoneEnabled: async value => { log.push(`mic:${this.id}:${value}`); if (options.micFails) throw new Error('microphone failed'); } }; }
    on(event, handler) { this.events[event] = handler; }
    async connect() { log.push(`connect:${this.id}`); if (options.blockFirst && this.id === 0) await new Promise(resolve => { release = resolve; }); this.state = 'connected'; }
    async disconnect() { this.state = 'disconnected'; log.push(`disconnect:${this.id}`); this.events.disconnected?.(); }
  }
  const modules = {
    'react-native': { Platform: { OS: 'android' }, NativeModules: options.missing ? {} : { WebRTCModule: {}, LivekitReactNativeModule: {} }, PermissionsAndroid: {
      PERMISSIONS: { RECORD_AUDIO: 'mic' }, RESULTS: { GRANTED: 'granted' }, check: async () => !!options.permissionGranted,
      request: async () => { log.push('permission'); return options.denied ? 'denied' : 'granted'; },
    } },
    expo: { isRunningInExpoGo: () => !!options.expoGo },
    '@livekit/react-native': sdk,
    'livekit-client': { Room, RoomEvent: { TrackSubscribed: 'subscribed', TrackUnsubscribed: 'unsubscribed', Disconnected: 'disconnected' }, Track: { Kind: { Audio: 'audio' } } },
  };
  vm.runInNewContext(code, { exports: exported, require: key => { if (!modules[key]) throw new Error(key); return modules[key]; } });
  return { api: exported, log, rooms, release: () => release() };
}
(async () => {
  assert.throws(() => harness({ expoGo: true }).api.assertVoiceCallingAvailable(), /Expo Go/);
  assert.throws(() => harness({ missing: true }).api.assertVoiceCallingAvailable(), /missing native/);
  const denied = harness({ denied: true });
  await assert.rejects(denied.api.prepareVoiceCalling(), /Microphone access/);
  assert.equal(denied.rooms.length, 0);
  const h = harness();
  await h.api.prepareVoiceCalling();
  assert.ok(h.log.includes('permission'));
  assert.throws(() => h.api.connectToLiveKitRoom('https://wrong-url', 'token'), /valid audio credentials/);
  let disconnected = 0;
  await h.api.connectToLiveKitRoom('wss://voice.example.test', 'test-token', () => disconnected++);
  assert.equal(h.api.isLiveKitConnected(), true);
  assert.ok(h.log.indexOf('globals') < h.log.indexOf('connect:0'));
  assert.ok(h.log.indexOf('start') < h.log.indexOf('mic:0:true'));
  await h.api.setLiveKitMicrophoneMuted(true);
  await h.api.setLiveKitSpeakerEnabled(true);
  assert.ok(h.log.includes('mic:0:false'));
  assert.ok(h.log.includes('speaker'));
  await h.api.disconnectLiveKitRoom();
  assert.equal(disconnected, 0, 'intentional hangup must not report a connection failure');
  assert.equal(h.api.isLiveKitConnected(), false);
  await assert.rejects(h.api.setLiveKitMicrophoneMuted(true), /still connecting/);
  const racing = harness({ blockFirst: true });
  const first = racing.api.connectToLiveKitRoom('wss://voice.example.test', 'token-1');
  for (let i = 0; i < 30 && !racing.log.includes('connect:0'); i++) await Promise.resolve();
  assert.ok(racing.log.includes('connect:0'));
  const hangup = racing.api.disconnectLiveKitRoom();
  const second = racing.api.connectToLiveKitRoom('wss://voice.example.test', 'token-2');
  racing.release();
  assert.equal((await first).connected, false);
  await hangup;
  assert.equal((await second).connected, true);
  assert.equal(racing.rooms[1].state, 'connected');
  assert.equal(racing.log.at(-1), 'mic:1:true', 'stale cleanup must finish before the new audio session starts');
  const failing = harness({ micFails: true });
  await assert.rejects(failing.api.connectToLiveKitRoom('wss://voice.example.test', 'token'), /microphone failed/);
  assert.equal(failing.rooms[0].state, 'disconnected');
  assert.equal(failing.log.at(-1), 'stop');
  console.log('Call audio checks passed: build guards, microphone preflight, registration, speaker/mute, cleanup and overlapping call cancellation.');
})().catch(error => { console.error(error); process.exit(1); });
