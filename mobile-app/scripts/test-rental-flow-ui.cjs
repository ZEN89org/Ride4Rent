const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(name) {
  const source = fs.readFileSync(path.join(__dirname, "../src/utils", name + ".ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported = {};
  vm.runInNewContext(compiled, { exports: exported, console });
  return exported;
}
const { groupNotifications } = load("groupNotifications");
const notifications = [
  { id: "1", title: "Incoming Voice Call", action_url: "/chat/1", is_read: true, created_at: "2026-10-19T12:00:00Z" },
  { id: "2", title: "Incoming Voice Call", action_url: "/chat/2", is_read: false, created_at: "2026-10-20T12:00:00Z" },
  { id: "3", title: "Refund Reminder", is_read: true, created_at: "2026-10-20T12:00:00Z" },
];
const grouped = groupNotifications(notifications);
assert.equal(grouped.length, 2);
assert.equal(grouped[0].id, "2");
assert.equal(grouped[0].group_count, 2);
assert.equal(grouped[0].is_read, false);
assert.equal(grouped[0].group_ids.length, 2);
assert.equal(grouped[1].group_count, 1);
assert.equal(notifications[0].group_ids, undefined, "Grouping must not mutate the source notification feed");
const { normalizePhilippinePhone, sanitizeMoney } = load("inputValidation");
for (const phone of ["09171234567", "+639171234567", "9171234567"]) assert.equal(normalizePhilippinePhone(phone), "09171234567");
assert.equal(normalizePhilippinePhone("letters"), "");
assert.equal(sanitizeMoney("₱1,234.567"), "1234.56");
assert.equal(sanitizeMoney("12.3.4"), "12.34");
const { paginateItems } = load("paginateItems");
assert.equal(paginateItems([1, 2, 3, 4, 5], 1).totalPages, 1);
assert.equal(paginateItems([1, 2, 3, 4, 5, 6], 2).items[0], 6);
assert.equal(paginateItems([1], 9).page, 1, "Deleting or filtering items must clamp the selected page");
assert.equal(paginateItems([], 2).items.length, 0);
console.log("Rental UI logic passed: notification groups, Philippine phone input, currency input and five-item pagination.");

const { validateVehicleFields } = load("vehicleValidation");
const vehicle = { name: "Toyota Vios", model: "Vios 1.3", year_model: "2025", plate_number: "ABC 1234", vehicle_type_id: "1", transmission_type_id: "1", fuel_type_id: "1", seating_capacity: "5", number_of_doors: "4", mileage: "1000", daily_rate: "1500.50" };
assert.equal(validateVehicleFields(vehicle, 1), null);
assert.equal(validateVehicleFields(vehicle, 2), null);
for (const invalid of [{ name: "1234" }, { model: "!!!" }, { year_model: "9999" }, { plate_number: "random" }]) assert.ok(validateVehicleFields({ ...vehicle, ...invalid }, 1));
for (const invalid of [{ daily_rate: "12abc" }, { daily_rate: "1.234" }, { seating_capacity: "0" }, { mileage: "-1" }, { exterior_color: "123" }]) assert.ok(validateVehicleFields({ ...vehicle, ...invalid }, 2));
console.log("Vehicle field validation checks passed.");

const { sortConversations } = load("sortConversations");
const chats = [
  { user_id: 1, unread_count: 4, last_message_at: "2026-10-20T10:00:00Z", last_message_id: 1 },
  { user_id: 2, unread_count: 0, last_message_at: "2026-10-20T11:00:00Z", last_message_id: 2 },
  { user_id: 3, unread_count: 0, last_message_at: "2026-10-20T11:00:00Z", last_message_id: 3 },
];
assert.deepEqual(Array.from(sortConversations(chats), c => c.user_id), [3, 2, 1]);
assert.equal(chats[0].user_id, 1);
console.log("Latest-message conversation ordering passed, including unread and timestamp ties.");

const { recordConversationActivity, applyConversationActivity } = load("conversationActivity");
recordConversationActivity(1, 2, { id: "20", created_at: "2026-10-20T12:00:00Z", text: "Newest sent" });
recordConversationActivity(1, 2, { id: "10", created_at: "2026-10-20T11:00:00Z", text: "Older history" });
const stale = [{ user_id: 2, last_message: "Old preview", last_time: "Yesterday" }, { user_id: 3, last_message: "Other", last_time: "Today" }];
const merged = applyConversationActivity(1, stale);
assert.equal(merged[0].last_message, "Newest sent");
assert.equal(merged[0].last_message_id, 20);
assert.equal(applyConversationActivity(99, stale)[0].last_message, "Old preview");
assert.equal(applyConversationActivity(1, [{ ...stale[0], last_message_id: 21, last_message: "New server message" }])[0].last_message, "New server message");
assert.equal(stale[0].last_message, "Old preview");
console.log("Confirmed message activity overrides stale summaries without crossing accounts or older history.");
