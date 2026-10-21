const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../src/utils/chatPayment.ts"), "utf8");
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { getPinnedPayment, formatChatTime, formatReceiptDateTime } = exportsObject;
const booking = { id: 1, status: "pending_payment", payment_status: "unpaid" };
assert.equal(getPinnedPayment(booking), "reservation");
assert.equal(getPinnedPayment({ ...booking, status: "pending_verification", payment_status: "paid_reservation" }), null, "Reservation receipt submission clears the pin for both participants");
assert.equal(getPinnedPayment({ ...booking, status: "approved", payment_status: "paid_reservation" }), null);
assert.equal(getPinnedPayment({ ...booking, status: "trip_in_progress", payment_status: "paid_full", extension_status: "payment_required" }), "extension");
assert.equal(getPinnedPayment({ ...booking, status: "trip_in_progress", payment_status: "paid_full", extension_status: "pending_verification" }), null, "Submitted extension payment must not keep requesting payment");
for (const status of ["completed", "cancelled", "rejected", "no_show"]) assert.equal(getPinnedPayment({ ...booking, status, extension_status: "payment_required" }), null);
assert.equal(getPinnedPayment(null), null);
const utc = "2026-10-20T20:35:00+00:00";
const manila = "2026-10-21T04:35:00+08:00";
assert.equal(formatReceiptDateTime(utc), formatReceiptDateTime(manila));
assert.equal(formatReceiptDateTime(utc), "Oct 21, 2026 4:35 AM");
assert.equal(formatChatTime("2026-10-20 20:35:00"), "4:35 AM");
assert.equal(formatReceiptDateTime("bad timestamp"), "Date unavailable");
console.log("Chat payment checks passed: reservation/extension pin lifecycle and Philippine receipt times across UTC date boundaries.");

const chatSource = fs.readFileSync(path.join(__dirname, "../src/app/chat/[id].tsx"), "utf8");
const receiptSource = chatSource.slice(chatSource.indexOf("interface ReceiptData"), chatSource.indexOf("const maskSingleWord")) + "\nexports.parseReceiptData = parseReceiptData;";
const receiptExports = {};
vm.runInNewContext(ts.transpileModule(receiptSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: receiptExports });
for (const [header, kind] of [["EXTENSION", "extension"], ["HANDOVER", "handover"], ["RETURN", "return"], ["REFUND", "refund"]]) {
  const parsed = receiptExports.parseReceiptData(`${header} PAYMENT RECEIPT\nVehicle: Test\nExtended return date: Oct 24, 2026 03:45 PM\nSubmitted Amount: ₱600.00\nStatus: Payment Submitted — Awaiting Host Verification\nReference: 1234567890123`);
  assert.equal(parsed.type, kind);
  assert.equal(parsed.amount, "₱600.00");
  assert.equal(parsed.status, "Payment Submitted — Awaiting Host Verification");
  assert.equal(parsed.reference, "1234567890123");
  assert.ok(parsed.schedule.includes("03:45 PM"));
}
console.log("Payment receipt kinds, unverified statuses, amounts and schedules render consistently.");

assert.equal(exportsObject.isFaceToFaceReceipt({ method: "IN PERSON", reference: "IN-PERSON" }), true);
assert.equal(exportsObject.isFaceToFaceReceipt({ method: "GCash", reference: "1234567890123" }), false);
assert.equal(exportsObject.receiptHeading({ type: "return", status: "Payment Confirmed" }), "Payment Confirmed");

assert.equal(exportsObject.receiptHeading({ type: "reservation", status: "Payment Submitted — Awaiting Host Verification" }), "Payment Submitted");
assert.equal(exportsObject.receiptHeading({ type: "refund", status: "Refund Sent" }), "Refund Sent");
assert.equal(exportsObject.receiptHeading({ type: "extension", status: "Payment Rejected — Upload another receipt" }), "Payment Rejected");
