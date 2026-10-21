const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/services/renterProfileService.ts'), 'utf8');
function client(get) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText,
    { exports, require: () => ({ __esModule: true, default: { get } }) });
  return exports.getRenterProfile;
}
(async () => {
  const full = { id: 7, first_name: 'Maria', can_review_license: true };
  assert.equal((await client(async () => ({ data: { data: full } }))('7')).can_review_license, true);
  const calls = [];
  const missing = { response: { status: 404 } };
  const load = client(async url => {
    calls.push(url);
    if (url.startsWith('/operator/')) throw missing;
    return { data: { data: [{ user_id: 7, name: 'Maria Santos', role: 'customer', profile_photo: 'photo.jpg' }] } };
  });
  const contact = await load('7');
  assert.equal(contact.id, 7);
  assert.equal(contact.first_name, 'Maria Santos');
  assert.equal(contact.can_review_license, false);
  assert.equal(contact.drivers_license_front_url, undefined);
  assert.deepEqual(calls, ['/operator/renters/7', '/messages/conversations'], 'Fallback must not mark thread messages read');
  await assert.rejects(load('8'), error => error === missing, 'Unknown contacts must not fabricate a profile');
  let forbiddenCalls = 0;
  await assert.rejects(client(async () => { forbiddenCalls++; throw { response: { status: 403 } }; })('7'));
  assert.equal(forbiddenCalls, 1, 'Never fall back around an authorization failure');
  await assert.rejects(load('invalid'));
  console.log('Renter profile checks passed: full endpoint, older-server contact fallback, identity matching and authorization.');
})().catch(error => { console.error(error); process.exit(1); });
