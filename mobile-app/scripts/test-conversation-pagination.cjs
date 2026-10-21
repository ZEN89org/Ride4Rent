const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/hooks/useConversations.ts'), 'utf8');
const states = [], refs = [], calls = [];
let stateIndex = 0, refIndex = 0, focus, poll;
let contacts = Array.from({ length: 35 }, (_, index) => ({ user_id: index + 1, last_message_at: '2026-10-21T12:00:00Z', last_message_id: 100 - index }));
const react = {
  useState(initial) { const slot = stateIndex++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
  useRef(initial) { const slot = refIndex++; return refs[slot] ||= { current: initial }; },
  useCallback(callback) { return callback; },
};
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports: exportsObject, console,
  setInterval(callback) { poll = callback; return 1; }, clearInterval() {},
  require(name) {
    if (name === 'react') return react;
    if (name === 'react-native') return { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } };
    if (name === 'expo-router') return { useFocusEffect: callback => { focus ||= callback; } };
    if (name.includes('useAuth')) return { useAuth: () => ({ user: { id: 1 }, loading: false }) };
    if (name.includes('messageService')) return { getConversationPage: async (page, archived, search) => {
      calls.push({ page, archived, search });
      return { items: contacts.slice((page - 1) * 20, page * 20), hasMore: page * 20 < contacts.length, archivedCount: 0 };
    } };
    throw Error(name);
  },
});
function render() { stateIndex = 0; refIndex = 0; return exportsObject.useConversations(false, ''); }
const settle = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  render(); const cleanup = focus(); await settle();
  assert.equal(states[0].length, 20, 'Initial load requests one page');
  assert.equal(calls.length, 1);
  render().loadMore(); await settle();
  assert.equal(states[0].length, 35);
  assert.equal(states[4], false);
  render().loadMore(); await settle();
  assert.equal(calls.length, 2, 'Do not fetch after the final page');
  contacts.unshift({ user_id: 36, last_message_at: '2026-10-21T13:00:00Z', last_message_id: 200 });
  poll(); await settle();
  assert.equal(states[0].length, 36, 'Polling retains previously loaded pages');
  assert.equal(states[0][0].user_id, 36, 'New messages move the conversation to the top');
  await render().mutate(async () => { contacts = contacts.filter(item => item.user_id !== 1); }, items => items.filter(item => item.user_id !== 1));
  await settle();
  assert.equal(states[0].length, 20, 'Removing a contact resets pagination to avoid skipping a row');
  render().loadMore(); await settle();
  assert.equal(states[0].length, 35);
  assert.equal(new Set(states[0].map(item => item.user_id)).size, 35);
  assert.equal(calls.at(-1).page, 2);
  cleanup();
  console.log('Conversation paging checks passed: initial batch, automatic next batch, final-page guard, live ordering and removal reset.');
})().catch(error => { console.error(error); process.exit(1); });
