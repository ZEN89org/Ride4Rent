import type { Booking } from "@/services/bookingService";

export const RESERVATION_PERCENT = 50;
const money = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0;
};

export function reservationPaymentQuote(b: Booking) {
  const dailyRate = money(b.daily_rate);
  const days = Math.max(1, Math.trunc(Number(b.total_days) || 1));
  const total = dailyRate > 0 ? money(dailyRate * days) : money(b.total_price);
  // Historical bookings retain the deposit agreed when they were booked.
  const reservation = b.reservation_fee == null ? money(total * RESERVATION_PERCENT / 100) : money(b.reservation_fee);
  const reservationPercent = total > 0 ? Math.round(reservation / total * 10000) / 100 : RESERVATION_PERCENT;
  return { dailyRate, days, total, reservation, pickupBalance: money(total - reservation), reservationPercent };
}

export function bookingPaymentSummary(b: Booking) {
  const dailyRate = money(b.daily_rate);
  const days = Math.max(1, Math.trunc(Number(b.total_days) || 1));
  // Backend totals/days already include verified extensions. Never add them twice.
  const total = dailyRate > 0 ? money(dailyRate * days) : money(b.total_price);
  const extensionPrice = money(b.extension_price ?? b.extension_fee);
  const isExtensionApproved = b.extension_status === "approved";
  const extensionPaid = money(b.extension_paid_total) || (isExtensionApproved ? extensionPrice : 0);
  const baseRentalTotal = money(total - extensionPaid);
  const baseDays = dailyRate > 0 ? Math.max(1, Math.round(baseRentalTotal / dailyRate)) : days;
  const reservation = b.reservation_fee != null ? money(b.reservation_fee) : money(baseRentalTotal * RESERVATION_PERCENT / 100);
  const reservationPercent = baseRentalTotal > 0 ? Math.round(reservation / baseRentalTotal * 10000) / 100 : RESERVATION_PERCENT;
  const pickupBalance = money(baseRentalTotal - reservation);
  const isReservationPaid = ["paid_reservation", "paid_full"].includes(b.payment_status) || b.reservation_paid_at != null;
  const isRentalPaid = b.payment_status === "paid_full" || b.rental_balance_paid_at != null || (money(b.rental_paid_amount) >= baseRentalTotal && baseRentalTotal > 0);
  const isExtensionPendingPayment = ["payment_required", "pending_verification"].includes(b.extension_status ?? "");
  const extensionOpen = b.extension_status === "pending" || isExtensionPendingPayment;
  const isClosed = ["cancelled", "rejected", "no_show"].includes(b.status) || ["refund_pending", "refunded"].includes(b.payment_status);
  const additionalCharges = money(Number(b.fuel_charge || 0) + Number(b.damage_charge || 0) + Number(b.late_fee || 0) + Number(b.other_charges || 0));
  const rentalPaid = money(b.rental_paid_amount) > 0 ? money(b.rental_paid_amount) : isRentalPaid ? baseRentalTotal : isReservationPaid ? reservation : 0;
  const paidAmount = money(rentalPaid + extensionPaid);
  const isFullPaid = isRentalPaid && !extensionOpen && money(total - paidAmount) === 0;
  const extensionStatus = b.extension_status === "pending" ? "Awaiting approval"
    : b.extension_status === "pending_verification" ? "Payment under review"
    : b.extension_status === "payment_required" ? "Payment due"
    : isExtensionApproved ? "Paid / verified"
    : b.extension_status === "rejected" ? "Declined" : "Not requested";
  let amountDueNow = 0;
  let amountDueLabel = "Paid in Full";
  if (isClosed) amountDueLabel = b.status === "no_show" ? "No-Show (Deposit Retained)" : "Booking Closed";
  else if (!isReservationPaid) { amountDueNow = reservation; amountDueLabel = "Reservation Fee Due Now"; }
  else if (b.extension_status === "pending") amountDueLabel = "Extension Awaiting Approval";
  else if (isExtensionPendingPayment) {
    amountDueNow = extensionPrice;
    amountDueLabel = b.extension_status === "pending_verification" ? "Extension Payment Under Review" : "Extension Fee Due Now";
  } else if (!isRentalPaid) { amountDueNow = money(total - paidAmount + additionalCharges); amountDueLabel = "Balance Before Pickup"; }
  const status = b.payment_status === "refunded" ? "Refunded"
    : b.payment_status === "refund_pending" ? "Refund pending"
    : b.status === "no_show" ? "Reservation fee retained"
    : isClosed ? "Booking closed"
    : b.extension_status === "pending" ? "Extension awaiting approval"
    : b.extension_status === "pending_verification" ? "Extension payment under review"
    : b.status === "pending_verification" && isReservationPaid ? "Under review"
    : isExtensionPendingPayment ? "Extension payment due"
    : isFullPaid ? "Paid in full"
    : isReservationPaid ? "Balance due before pickup" : "Reservation payment due";
  return { dailyRate, days, baseDays, baseRentalTotal, total, reservation, reservationPercent, pickupBalance, extensionPrice, extensionPaid,
    isExtensionApproved, isExtensionPendingPayment, extensionOpen, extensionStatus, isReservationPaid, isRentalPaid, isFullPaid,
    isClosed, additionalCharges, paidAmount, amountDueNow, amountDueLabel,
    paid: paidAmount, pendingExtension: isExtensionPendingPayment ? extensionPrice : 0, balance: amountDueNow, status, closed: isClosed };
}
