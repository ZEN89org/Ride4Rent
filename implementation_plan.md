# Comprehensive Feature Enhancements & Bug Fixes Plan

## User Review Required
> [!IMPORTANT]
> - Database updates: Adding `drivers_license_front`, `drivers_license_back` to `users`, and `quantity`, `available_units` to `vehicles`.
> - Adding operator payment setup validation before creating vehicle listings.
> - Date picker modal on booking ensuring start/end dates are realistic and in the future.
> - Global toast provider replacing generic alerts with vector icons.

---

## 1. Backend Database Migrations & Controllers
- **Migration 1**: Add `drivers_license_front` and `drivers_license_back` to `users` table.
- **Migration 2**: Add `quantity` (default 1) and `available_units` (default 1) to `vehicles` table.
- **`VehicleResource.php`**: Expose full operator profile (including profile photo, contact, business address, and payment details `accepted_payment_methods`, `account_name`, `account_number`, `qr_code`), vehicle `quantity`, `available_units`, `rating`, `rating_count`.
- **`VehicleController.php`**:
  - Add query param `?sort=top_rated` or `?random=true` (or randomize listings in the query).
  - Enforce that operators must have payment credentials configured before listing a vehicle.
  - Expose vehicle edit & delete endpoints for operators.
- **`BookingController.php`**:
  - Validate renter has uploaded driver's license before booking.
  - Validate against duplicate active bookings for the same user on the same vehicle.
  - Multi-unit check: Check if active bookings + settled reservations $\ge$ `available_units` / `quantity`. If unavailable or already reserved, reject new booking/settlement with clear notification.
- **`LicenseController.php` & `License routes`**: Upload and persist driver's license images for renters.

---

## 2. Frontend State & Components
- **`ToastContext.tsx`**: Reusable toast context providing `showSuccess(title, msg)` and `showError(title, msg)` using vector icons (no emojis, simple and casual).
- **`VehicleCard.tsx` (Renter)**: Completely redesigned new minimal, modern vehicle card layout.
- **`TopRatedVehicles.tsx`**: Filter and sort vehicles by real database rating.
- **`HomeHeader.tsx`**: Fix profile avatar alignment to match operator style; add live unread count badge to notification bell.
- **`vehicles/[id].tsx`**:
  - If viewed by vehicle owner (Operator), show action buttons: **Edit Details**, **Toggle Availability / Delete Vehicle**, and fleet management.
  - If viewed by Renter, display full operator profile avatar, business badge, address, and host details.
  - Booking bottom sheet: Native date picker modal with realistic range guards (start date $\ge$ today, realistic duration).
  - Driver's license check: If not uploaded, prompt modal with direct link to upload DL.
  - Payment settlement details: Display host payment accounts (GCash, Maya, Bank) on payment modal.
- **Operator Home / Dashboard Screen**: Complete redesign with fresh modern layout (fleet stats, quick action shortcuts, recent reservation cards, revenue / status preview).
- **Operator Shell & SideNav**:
  - Header: Replace '+' icon with Notification Bell + unread count badge.
  - SideNav: Mirror the clean design of the renter SideNav.
  - Bottom navigation: Edge-to-edge styling (`edges={['bottom']}`) with zero padding bug at the bottom.
- **Operator Profile Screen**: Clean layout matching renter profile; moved preferences/support to Operator SideNav.
- **Driver License Screen**: Live camera/gallery photo upload sending to backend API and saving to `user.drivers_license_front` and `back`.
- **Operator Bookings (Fleet Operations)**: Clean reservation cards with clean YYYY-MM-DD dates, renter profile modal / preview, and accurate verification flow.

---

## 3. Verification Plan
- Run `php artisan migrate` on backend.
- Run `npx tsc --noEmit` in `mobile-app` to verify type safety across all modified files.
- Test booking validation (DL check, date bounds, duplicate check, multi-unit availability).
- Test operator vehicle edit/delete and notifications.
