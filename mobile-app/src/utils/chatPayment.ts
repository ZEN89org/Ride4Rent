import type { BookingContext } from "@/services/messageService";

function messageDate(value?: string): Date | null {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T");
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatChatTime(value?: string): string {
  const date = messageDate(value);
  return date ? new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true }).format(date) : "";
}

export function formatReceiptDateTime(value?: string): string {
  const date = messageDate(value);
  if (!date) return "Date unavailable";
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(date);
  return `${day} ${formatChatTime(value)}`;
}

export function getPinnedPayment(context?: BookingContext | null): "reservation" | "extension" | null {
  if (!context || ["cancelled", "rejected", "completed", "no_show"].includes(context.status) || ["refunded", "refund_pending"].includes(context.payment_status)) return null;
  if (context.extension_status === "payment_required") return "extension";
  if (context.status === "pending_payment" && context.payment_status === "unpaid") return "reservation";
  return null;
}

export function isFaceToFaceReceipt(receipt: { method?: string; reference?: string; type?: string }): boolean {
  return /in[ _-]?person|face[ _-]?to[ _-]?face|\bftf\b|\bcash\b/i.test(receipt.method || "")
    || /in[ _-]?person collection/i.test(receipt.reference || "")
    || (!receipt.method && ["handover", "return"].includes(receipt.type || ""));
}

export function receiptHeading(receipt: { type: string; status?: string }): string {
  const status = (receipt.status || "").toLowerCase();
  if (/refund/.test(receipt.type) || /refund/.test(status)) return /pending|review|requested|submit|awaiting|verification/.test(status) ? "Refund Pending" : "Refund Sent";
  if (/reject|declin/.test(status)) return "Payment Rejected";
  if (/submit|review|verification/.test(status)) return "Payment Submitted";
  if (/pending|awaiting|required|not verified|unverified|unpaid/.test(status)) return "Payment Pending";
  if (/confirm|paid|settled|verified/.test(status)) return "Payment Confirmed";
  return "Payment Recorded";
}
