import api from "@/services/api";
import { getMyBookings } from "@/services/bookingService";

import {
  AvailableMonth,
  OperatorRegisterData,
  OperatorRevenueData,
  OperatorStatus,
  RevenueBookingItem,
} from "@/features/operator/types/operatorService";

export const registerOperator = async (
  data: OperatorRegisterData
) => {
  const formData = new FormData();

  formData.append("first_name", data.first_name);
  formData.append("middle_name", data.middle_name ?? "");
  formData.append("last_name", data.last_name);
  formData.append("suffix", data.suffix ?? "");
  formData.append("date_of_birth", data.date_of_birth);
  formData.append("sex", data.sex);
  formData.append("email", data.email);
  formData.append("mobile_number", data.mobile_number);
  formData.append("password", data.password);
  formData.append(
    "password_confirmation",
    data.password_confirmation
  );
  if (data.otp) {
    formData.append("otp", data.otp);
  }

  formData.append("business_name", data.business_name);
  formData.append("business_email", data.business_email);
  formData.append(
    "business_contact_number",
    data.business_contact_number
  );
  formData.append("street_address", data.street_address);
  formData.append("barangay", data.barangay);
  formData.append("municipality", data.municipality);
  if (data.latitude !== undefined && data.latitude !== null) {
    formData.append("latitude", String(data.latitude));
  }
  if (data.longitude !== undefined && data.longitude !== null) {
    formData.append("longitude", String(data.longitude));
  }

  if (data.government_id_front) {
    formData.append(
      "government_id_front",
      {
        uri: data.government_id_front,
        name: "government_id_front.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  if (data.government_id_back) {
    formData.append(
      "government_id_back",
      {
        uri: data.government_id_back,
        name: "government_id_back.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  if (data.business_permit_front) {
    formData.append(
      "business_permit_front",
      {
        uri: data.business_permit_front,
        name: "business_permit_front.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  if (data.business_permit_back) {
    formData.append(
      "business_permit_back",
      {
        uri: data.business_permit_back,
        name: "business_permit_back.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  if (data.dti_sec_registration) {
    formData.append(
      "dti_sec_registration",
      data.dti_sec_registration
    );
  }

  formData.append(
    "accepted_payment_methods",
    JSON.stringify(data.accepted_payment_methods)
  );

  if (data.account_name) {
    formData.append("account_name", data.account_name);
  }

  if (data.account_number) {
    formData.append(
      "account_number",
      data.account_number
    );
  }

  if (data.qr_code) {
    formData.append("qr_code", data.qr_code);
  }

  const response = await api.post(
    "/operator/register",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const getOperatorStatus =
  async (): Promise<OperatorStatus> => {
    const response = await api.get(
      "/operator/status"
    );

    return response.data.data;
  };

const fallbackComputeOperatorRevenue = async (targetMonth?: string): Promise<OperatorRevenueData> => {
  const allBookings = await getMyBookings().catch(() => []);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthKey = targetMonth || currentMonthKey;
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;

  const cycleStart = new Date(year, monthIndex, 1);
  const cycleEnd = new Date(year, monthIndex + 1, 0); // last day of month
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthLabel = `${monthNames[monthIndex] || "Month"} ${year}`;

  const isCurrentCycle = monthKey === currentMonthKey;
  const daysInCycle = cycleEnd.getDate();
  const currentDay = now.getDate();
  const daysRemaining = isCurrentCycle ? Math.max(0, daysInCycle - currentDay) : 0;

  // Active bookings count
  const activeBookingsCount = allBookings.filter((b) =>
    ["approved", "awaiting_pickup", "pickup_in_progress", "ready_to_start", "trip_in_progress", "ongoing", "return_pending"].includes(b.status)
  ).length;

  // Completed bookings
  const completedBookings = allBookings.filter((b) => b.status === "completed");

  // Collect available historical months
  const monthCounts: Record<string, number> = {};
  completedBookings.forEach((b) => {
    const dateStr = b.actual_end_time || b.updated_at || b.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
  });
  if (!monthCounts[currentMonthKey]) {
    monthCounts[currentMonthKey] = 0;
  }

  const availableMonths: AvailableMonth[] = Object.keys(monthCounts)
    .sort()
    .reverse()
    .map((k) => {
      const [y, m] = k.split("-");
      const name = monthNames[parseInt(m, 10) - 1] || "Month";
      return {
        month: k,
        label: `${name} ${y}`,
        count: monthCounts[k],
      };
    });

  // Filter for the requested month
  const monthBookings = completedBookings.filter((b) => {
    const dateStr = b.actual_end_time || b.updated_at || b.created_at;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return key === monthKey;
  });

  const commissionPercent = 10;
  let grossRevenue = 0;
  const items: RevenueBookingItem[] = monthBookings.map((b) => {
    const baseRental = Number(b.total_price || 0);
    const fuel = Number(b.fuel_charge || 0);
    const damage = Number(b.damage_charge || 0);
    const late = Number(b.late_fee || 0);
    const other = Number(b.other_charges || 0);
    const surcharges = fuel + damage + late + other;
    const bookingGross = baseRental + surcharges;
    grossRevenue += bookingGross;

    const bookingCommission = Math.round(bookingGross * (commissionPercent / 100) * 100) / 100;
    const bookingNet = Math.round((bookingGross - bookingCommission) * 100) / 100;

    const renterName = b.renter
      ? `${b.renter.first_name || ""} ${b.renter.last_name || ""}`.trim() || "Customer"
      : "Customer";

    const completedAtStr = b.actual_end_time || b.updated_at || b.created_at || "";
    const compDate = completedAtStr
      ? new Date(completedAtStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Completed";

    return {
      id: b.id,
      booking_code: `#${b.id}`,
      vehicle_name: b.vehicle?.name || "Vehicle",
      renter_name: renterName,
      start_date: b.start_date || null,
      end_date: b.end_date || null,
      completed_at: compDate,
      base_rental: baseRental,
      surcharges: surcharges,
      gross_total: bookingGross,
      commission_percent: commissionPercent,
      commission_amount: bookingCommission,
      net_amount: bookingNet,
    };
  });

  const totalCommissionDue = Math.round(grossRevenue * (commissionPercent / 100) * 100) / 100;
  const totalNetEarnings = Math.round((grossRevenue - totalCommissionDue) * 100) / 100;

  return {
    month: monthKey,
    month_label: monthLabel,
    cycle_start: cycleStart.toISOString().split("T")[0],
    cycle_end: cycleEnd.toISOString().split("T")[0],
    is_current_cycle: isCurrentCycle,
    days_remaining_in_cycle: daysRemaining,
    commission_percent: commissionPercent,
    gross_revenue: grossRevenue,
    commission_due: totalCommissionDue,
    net_earnings: totalNetEarnings,
    completed_bookings_count: monthBookings.length,
    active_bookings_count: activeBookingsCount,
    available_months: availableMonths,
    bookings: items,
  };
};

export const getOperatorRevenue = async (
  month?: string
): Promise<OperatorRevenueData> => {
  try {
    const url = month ? `/operator/revenue?month=${encodeURIComponent(month)}` : "/operator/revenue";
    const response = await api.get(url);
    if (response?.data?.data) {
      return response.data.data;
    }
  } catch (err: any) {
    if (err?.response?.status === 404) {
      // Endpoint not deployed to remote backend yet: gracefully compute locally from bookings
      return fallbackComputeOperatorRevenue(month);
    }
    throw err;
  }
  return fallbackComputeOperatorRevenue(month);
};

export const resubmitOperatorDocuments = async (data: {
  business_permit_front?: string;
  business_permit_back?: string;
  government_id_front?: string;
  government_id_back?: string;
  notes?: string;
}): Promise<any> => {
  const formData = new FormData();

  if (data.business_permit_front && !data.business_permit_front.startsWith("http")) {
    formData.append("business_permit_front", {
      uri: data.business_permit_front,
      name: "business_permit_front.jpg",
      type: "image/jpeg",
    } as any);
  }

  if (data.business_permit_back && !data.business_permit_back.startsWith("http")) {
    formData.append("business_permit_back", {
      uri: data.business_permit_back,
      name: "business_permit_back.jpg",
      type: "image/jpeg",
    } as any);
  }

  if (data.government_id_front && !data.government_id_front.startsWith("http")) {
    formData.append("government_id_front", {
      uri: data.government_id_front,
      name: "government_id_front.jpg",
      type: "image/jpeg",
    } as any);
  }

  if (data.government_id_back && !data.government_id_back.startsWith("http")) {
    formData.append("government_id_back", {
      uri: data.government_id_back,
      name: "government_id_back.jpg",
      type: "image/jpeg",
    } as any);
  }

  if (data.notes) {
    formData.append("notes", data.notes);
  }

  const response = await api.post("/operator/resubmit-documents", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
