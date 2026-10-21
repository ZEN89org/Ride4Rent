const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../src/utils/bookingPaymentSummary.ts"), "utf8");
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const summarize = exportsObject.bookingPaymentSummary;
const quote = exportsObject.reservationPaymentQuote;
const pickup = quote({ daily_rate: 2200, total_days: 2, total_price: 4180, reservation_fee: 220 });
assert.equal(pickup.total, 4400, "Rental total must use booked daily rate times days, not a net balance");
assert.equal(pickup.pickupBalance, 4180, "Subtract the reservation fee exactly once");
assert.equal(pickup.pickupBalance + pickup.reservation, pickup.total);
const example = quote({ daily_rate: 2090, total_days: 2, total_price: 4180, reservation_fee: 209 });
assert.equal(example.total, 4180);
assert.equal(example.pickupBalance, 3971);
assert.equal(quote({ daily_rate: 2200, total_days: 2 }).reservation, 2200);
assert.equal(quote({ daily_rate: 999.99, total_days: 3 }).pickupBalance, 1499.98);
const base = { total_price: "3000.00", status: "pending_payment", payment_status: "unpaid" };
assert.equal(summarize(base).reservation, 1500);
assert.equal(summarize(base).balance, 1500);
assert.equal(summarize({ ...base, reservation_fee: 150, payment_status: "paid_reservation" }).balance, 2850);
const handedOver = { ...base, status: "trip_in_progress", payment_status: "paid_full", rental_paid_amount: "3000.00", reservation_fee: 150, balance_due: 0 };
assert.equal(summarize(handedOver).balance, 0);
for (const extension_status of ["payment_required", "pending_verification"]) {
  const summary = summarize({ ...handedOver, extension_status, extension_price: 1200 });
  assert.equal(summary.balance, 1200, "Extension needs full payment, without another reservation fee");
  assert.equal(summary.reservation, 150);
}
const extended = summarize({ ...handedOver, total_price: 5400, extension_paid_total: 2400, extension_price: 1200, extension_status: "approved" });
assert.equal(extended.balance, 0);
assert.equal(extended.total, 5400, "Approved extensions must not be added to the rental total twice");
assert.equal(extended.paid, 5400, "Include all paid extensions, not just the latest one");
for (const status of ["cancelled", "rejected", "no_show"]) {
  assert.equal(summarize({ ...base, status, payment_status: "paid_reservation", reservation_fee: 150 }).balance, 0);
}
assert.equal(summarize({ ...handedOver, status: "completed" }).balance, 0);
assert.equal(summarize({ ...base, total_price: 999.99 }).reservation, 500);
assert.equal(summarize({ ...base, total_price: "invalid" }).balance, 0);
console.log("Booking payment checks passed: 50% reservations with preserved legacy credit, handover, extensions, repeated extensions, closed bookings and rounding.");

const fifty = summarize({ ...base, daily_rate: 2090, total_days: 2, total_price: 4180, reservation_fee: 2090, payment_status: "paid_reservation" });
assert.equal(fifty.total, 4180);
assert.equal(fifty.pickupBalance, 2090);
assert.equal(fifty.reservationPercent, 50);
assert.equal(summarize({ ...handedOver, extension_status: "pending", extension_price: 1200 }).isFullPaid, false);
assert.equal(summarize({ ...handedOver, extension_status: "pending", extension_price: 1200 }).extensionStatus, "Awaiting approval");
const reviewing = summarize({ ...handedOver, extension_status: "pending_verification", extension_price: 1200 });
assert.equal(reviewing.isRentalPaid, true);
assert.equal(reviewing.isFullPaid, false);
assert.equal(reviewing.status, "Extension payment under review");
assert.equal(reviewing.paid, 3000);
const repeated = summarize({ ...handedOver, daily_rate: 600, total_days: 9, total_price: 5400, extension_paid_total: 2400, extension_price: 1200, extension_status: "approved" });
assert.equal(repeated.total, 5400);
assert.equal(repeated.baseRentalTotal, 3000);
assert.equal(repeated.paid, 5400);
const nextRequest = summarize({ ...handedOver, total_price: 5400, extension_paid_total: 2400, extension_price: 600, extension_status: "pending_verification" });
assert.equal(nextRequest.total, 5400);
assert.equal(nextRequest.paid, 5400);
assert.equal(nextRequest.balance, 600);
assert.equal(nextRequest.isFullPaid, false);
console.log("Extension review status and cumulative payment regressions passed.");

const bookingsSource = fs.readFileSync(path.join(__dirname, "../src/app/(tabs)/bookings.tsx"), "utf8");
const daysSource = bookingsSource.slice(bookingsSource.indexOf("export const getEffectiveTripDays ="), bookingsSource.indexOf("export default function Bookings()"));
const dayExports = {};
vm.runInNewContext(ts.transpileModule(daysSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: dayExports, parseDateString: value => new Date(value) });
assert.equal(dayExports.getEffectiveTripDays({ status: "ongoing", total_days: 2, start_date: "2026-10-20", end_date: "2026-10-22", extension_end_date: "2026-10-25", extension_days: 3, extension_status: "pending" }), 2);
assert.equal(dayExports.getEffectiveTripDays({ status: "ongoing", total_days: 5, start_date: "2026-10-20", end_date: "2026-10-25", extension_days: 3, extension_status: "approved" }), 5);
console.log("Unverified extensions do not change displayed booked duration.");

const storedZero = summarize({ ...base, total_price: 4180, daily_rate: 2090, total_days: 2, reservation_fee: 2090, rental_paid_amount: "0.00", payment_status: "paid_reservation" });
assert.equal(storedZero.paidAmount, 2090);
assert.equal(storedZero.amountDueNow, 2090);
console.log("Verified reservation credit is preserved when the rental-paid column still stores zero.");
