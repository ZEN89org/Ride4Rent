<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Sign In | Ride4Rent</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased flex items-center justify-center p-4 sm:p-6 lg:p-10">
    <main class="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl border border-[#E2E8F0] grid lg:grid-cols-[1.1fr_1fr]">
        <!-- Brand Left Banner -->
        <section class="relative bg-[#1A1A1A] p-8 sm:p-12 text-white flex flex-col justify-between overflow-hidden">
            <!-- Subtle Gold Ambient Glow -->
            <div class="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#FEC103]/10 blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#FEC103]/5 blur-3xl pointer-events-none"></div>

            <div class="relative z-10">
                <div class="flex items-center gap-3">
                    <img src="{{ asset('images/ride4rent.png') }}" alt="Ride4Rent Logo" class="h-11 w-auto object-contain" />
                    <div>
                        <span class="text-xl font-bold tracking-tight text-white">Ride<span class="text-[#FEC103]">4</span>Rent</span>
                        <span class="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEC103]">Admin Control</span>
                    </div>
                </div>

                <div class="mt-14 sm:mt-20">
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#FEC103] backdrop-blur-sm border border-white/10">
                        <span class="h-1.5 w-1.5 rounded-full bg-[#FEC103]"></span>
                        Internal Operations
                    </span>
                    <h1 class="mt-4 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white">
                        Vetting & Fleet Compliance.
                    </h1>
                    <p class="mt-3 text-sm text-[#94A3B8] leading-relaxed max-w-sm">
                        Verify renter driver's licenses, audit operator fleet permits, and keep rentals safe and verified across the platform.
                    </p>
                </div>
            </div>

            <div class="relative z-10 mt-12 border-t border-white/10 pt-6">
                <div class="space-y-2 text-xs text-[#94A3B8]">
                    <div class="flex items-center gap-2">
                        <span class="text-[#FEC103]">✓</span>
                        <span>Renter Driver's License Matching</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[#FEC103]">✓</span>
                        <span>Vehicle Host Business Onboarding</span>
                    </div>
                </div>
                <p class="mt-6 text-[11px] text-[#64748B]">© {{ date('Y') }} Ride4Rent System. Secure Administrative Console.</p>
            </div>
        </section>

        <!-- Login Form Right Panel -->
        <section class="p-8 sm:p-12 flex flex-col justify-center bg-white">
            <div class="w-full max-w-sm mx-auto">
                <div class="flex items-center gap-2">
                    <span class="inline-block h-2 w-2 rounded-full bg-[#FEC103]"></span>
                    <p class="text-xs font-bold uppercase tracking-wider text-[#64748B]">Administrator Access</p>
                </div>
                <h2 class="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">Welcome Back</h2>
                <p class="mt-1 text-sm text-[#64748B]">Sign in with your administrative account credentials.</p>

                @if (isset($errors) && $errors->any())
                    <div class="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start gap-2">
                        <span class="font-bold">Error:</span>
                        <span>{{ $errors->first() }}</span>
                    </div>
                @endif

                <form method="POST" action="{{ route('admin.login.submit') }}" class="mt-6 space-y-4">
                    @csrf
                    <div>
                        <label class="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1.5" for="email">
                            Email Address
                        </label>
                        <input
                            class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#FEC103] focus:bg-white focus:ring-2 focus:ring-[#FEC103]/25"
                            id="email"
                            name="email"
                            type="email"
                            value="{{ old('email') }}"
                            placeholder="admin@ride4rent.com"
                            required
                            autofocus
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1.5" for="password">
                            Password
                        </label>
                        <input
                            class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#FEC103] focus:bg-white focus:ring-2 focus:ring-[#FEC103]/25"
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••••••"
                            required
                        />
                    </div>

                    <button
                        class="w-full mt-2 rounded-xl bg-[#FEC103] hover:bg-[#EAB308] px-4 py-3.5 text-sm font-bold text-[#1A1A1A] shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                        type="submit"
                    >
                        <span>Access Admin Dashboard</span>
                        <span>→</span>
                    </button>
                </form>

                <div class="mt-8 border-t border-[#F1F5F9] pt-4 text-center">
                    <p class="text-[11.5px] text-[#94A3B8]">
                        Authorized personnel only. All access attempts are logged for system security.
                    </p>
                </div>
            </div>
        </section>
    </main>
</body>
</html>
