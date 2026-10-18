<!DOCTYPE html>
<html lang="en" class="h-full bg-[#0F172A]">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Console | Ride4Rent</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        code, .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        .nav-item-active {
            background-color: rgba(254, 193, 3, 0.12);
            color: #FEC103;
            border-left: 3px solid #FEC103;
            font-weight: 700;
        }
        .nav-item-inactive {
            color: #94A3B8;
            border-left: 3px solid transparent;
            font-weight: 600;
        }
        .nav-item-inactive:hover {
            background-color: rgba(255, 255, 255, 0.04);
            color: #F8FAFC;
        }
    </style>
</head>
<body class="h-full bg-[#F8FAFC] text-[#0F172A] antialiased flex overflow-hidden">

    <!-- ======================================================== -->
    <!-- LEFT EXECUTIVE SIDEBAR (Admin Console Navigation)       -->
    <!-- ======================================================== -->
    <aside id="admin-sidebar" class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between bg-[#0F172A] text-white transition-transform duration-200 lg:static lg:translate-x-0 -translate-x-full">
        <!-- Top Section: Brand & Navigation -->
        <div class="flex flex-col h-full overflow-y-auto">
            <!-- Brand Identity -->
            <div class="flex items-center gap-3 border-b border-[#1E293B] px-5 py-5">
                <img src="{{ asset('images/ride4rent.png') }}" alt="Ride4Rent Logo" class="h-9 w-auto object-contain" />
                <div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-lg font-black tracking-tight text-white">Ride<span class="text-[#FEC103]">4</span>Rent</span>
                    </div>
                    <span class="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEC103]">Admin Console</span>
                </div>
            </div>

            <!-- Navigation Links Grouped by Pillar -->
            <nav class="flex-1 space-y-6 px-3 py-6 text-xs">
                <!-- Group 1: Verification & Trust -->
                <div>
                    <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Compliance & Vetting</p>
                    <div class="space-y-1">
                        <button 
                            id="nav-moderation" 
                            onclick="switchTab('moderation')" 
                            class="nav-item-active flex w-full items-center justify-between rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer"
                        >
                            <div class="flex items-center gap-2.5">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span>Moderation Queue</span>
                            </div>
                            @if ($stats['pending_verifications'] > 0)
                                <span class="rounded-full bg-[#FEC103] px-1.5 py-0.2 text-[10px] font-black text-[#1A1A1A]">
                                    {{ $stats['pending_verifications'] }}
                                </span>
                            @endif
                        </button>

                        <button 
                            id="nav-users" 
                            onclick="switchTab('users')" 
                            class="nav-item-inactive flex w-full items-center justify-between rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer"
                        >
                            <div class="flex items-center gap-2.5">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span>Member Directory</span>
                            </div>
                            <span class="rounded bg-[#1E293B] px-1.5 py-0.2 text-[10px] font-bold text-[#94A3B8]">
                                {{ $stats['total_platform_users'] }}
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Group 2: Operations & Resolution -->
                <div>
                    <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Platform Operations</p>
                    <div class="space-y-1">
                        <button 
                            id="nav-disputes" 
                            onclick="switchTab('disputes')" 
                            class="nav-item-inactive flex w-full items-center justify-between rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer"
                        >
                            <div class="flex items-center gap-2.5">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Disputes & Incidents</span>
                            </div>
                            @if ($disputes->count() > 0)
                                <span class="rounded bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400">
                                    {{ $disputes->count() }}
                                </span>
                            @endif
                        </button>

                        <button 
                            id="nav-reviews" 
                            onclick="switchTab('reviews')" 
                            class="nav-item-inactive flex w-full items-center justify-between rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer"
                        >
                            <div class="flex items-center gap-2.5">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                <span>Review Moderation</span>
                            </div>
                            <span class="text-[10px] text-[#64748B]">{{ $reviews->count() }}</span>
                        </button>
                    </div>
                </div>

                <!-- Group 3: Governance & Audit -->
                <div>
                    <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Governance & Audit</p>
                    <div class="space-y-1">
                        <button 
                            id="nav-audit" 
                            onclick="switchTab('audit')" 
                            class="nav-item-inactive flex w-full items-center gap-2.5 rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer"
                        >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <span>Action Audit Log</span>
                        </button>

                        <button 
                            id="nav-settings" 
                            onclick="switchTab('settings')" 
                            class="nav-item-inactive flex w-full items-center gap-2.5 rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer"
                        >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Platform Controls</span>
                        </button>

                        <button 
                            id="nav-exports" 
                            onclick="switchTab('exports')" 
                            class="nav-item-inactive flex w-full items-center gap-2.5 rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer"
                        >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Compliance Exports</span>
                        </button>
                    </div>
                </div>
            </nav>

            <!-- Bottom: Announcement Trigger & Admin Profile -->
            <div class="border-t border-[#1E293B] p-4 space-y-3">
                <button 
                    onclick="openBroadcastModal()" 
                    class="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FEC103] hover:bg-[#EAB308] px-3.5 py-2.5 text-xs font-bold text-[#1A1A1A] shadow-xs transition active:scale-98 cursor-pointer"
                >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    <span>Broadcast Notice</span>
                </button>

                <div class="flex items-center justify-between rounded-xl bg-[#1E293B]/70 p-2.5">
                    <div class="flex items-center gap-2.5 truncate">
                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEC103] text-xs font-black text-[#1A1A1A]">
                            AD
                        </div>
                        <div class="truncate">
                            <p class="text-xs font-bold text-white truncate">Administrator</p>
                            <p class="text-[10px] text-[#94A3B8] truncate">{{ auth()->user()?->email }}</p>
                        </div>
                    </div>
                    <form method="POST" action="{{ route('admin.logout') }}">
                        @csrf
                        <button type="submit" title="Sign out" class="rounded-lg p-1.5 text-[#94A3B8] hover:bg-white/10 hover:text-white transition cursor-pointer">
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </aside>

    <!-- Sidebar Backdrop on Mobile -->
    <div id="sidebar-backdrop" onclick="toggleSidebar()" class="fixed inset-0 z-30 hidden bg-black/60 backdrop-blur-xs lg:hidden"></div>

    <!-- ======================================================== -->
    <!-- MAIN APPLICATION WORKSPACE                              -->
    <!-- ======================================================== -->
    <div class="flex flex-1 flex-col overflow-hidden">
        
        <!-- Top App Bar -->
        <header class="flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8">
            <div class="flex items-center gap-3">
                <button onclick="toggleSidebar()" class="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] lg:hidden cursor-pointer">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div>
                    <h1 id="topbar-section-title" class="text-base font-bold text-[#0F172A]">Moderation & Verification Queue</h1>
                    <p id="topbar-section-sub" class="text-[11px] text-[#64748B]">Driver's license reviews and commercial operator accreditation</p>
                </div>
            </div>

            <!-- Top Bar Badges & Actions -->
            <div class="flex items-center gap-3">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="hidden sm:inline">System Live</span>
                </span>
                <a href="{{ route('admin.exports.renters-kyc') }}" class="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition">
                    <span>Export KYC</span>
                    <span>↓</span>
                </a>
            </div>
        </header>

        <!-- Main Scrollable Content Viewport -->
        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            
            <!-- Flash Message Banner -->
            @if (session('status'))
                <div class="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 shadow-xs">
                    <div class="flex items-center gap-2.5">
                        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">✓</span>
                        <p class="font-semibold">{{ session('status') }}</p>
                    </div>
                    <button onclick="this.parentElement.remove()" class="text-emerald-600 hover:text-emerald-900">✕</button>
                </div>
            @endif

            @if (isset($errors) && $errors->any())
                <div class="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 shadow-xs">
                    <div class="flex items-center gap-2.5">
                        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-red-600 text-white font-bold text-xs">✕</span>
                        <p class="font-semibold">{{ $errors->first() }}</p>
                    </div>
                    <button onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-900">✕</button>
                </div>
            @endif

            <!-- Compact Admin KPI Row (Always Visible for Snapshot Oversight) -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-8">
                <!-- KPI 1 -->
                <div class="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                    <p class="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">Pending Moderation</p>
                    <div class="mt-1.5 flex items-baseline justify-between">
                        <span class="text-2xl font-extrabold text-[#0F172A]">{{ $stats['pending_verifications'] }}</span>
                        <span class="rounded bg-[#FFF6DA] border border-[#FDE68A] px-1.5 py-0.5 text-[10px] font-bold text-[#92400E]">Action Req.</span>
                    </div>
                    <p class="text-[10px] text-[#94A3B8] mt-1">{{ $pendingRenters->count() }} Licenses · {{ $operators->count() }} Permits</p>
                </div>

                <!-- KPI 2 -->
                <div class="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                    <p class="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">Platform Members</p>
                    <div class="mt-1.5 flex items-baseline justify-between">
                        <span class="text-2xl font-extrabold text-[#0F172A]">{{ $stats['total_platform_users'] }}</span>
                        <span class="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-bold text-[#64748B]">Clients</span>
                    </div>
                    <p class="text-[10px] text-[#94A3B8] mt-1">{{ $stats['total_renters'] }} Renters · {{ $stats['total_operators'] }} Hosts</p>
                </div>

                <!-- KPI 3 -->
                <div class="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                    <p class="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">KYC Verified Rate</p>
                    <div class="mt-1.5 flex items-baseline justify-between">
                        <span class="text-2xl font-extrabold text-emerald-700">{{ $stats['kyc_compliance_rate'] }}%</span>
                        <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Verified</span>
                    </div>
                    <p class="text-[10px] text-[#94A3B8] mt-1">{{ $stats['verified_renters'] }} of {{ $stats['total_renters'] }} verified</p>
                </div>

                <!-- KPI 4 -->
                <div class="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                    <p class="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">Active Account Health</p>
                    <div class="mt-1.5 flex items-baseline justify-between">
                        <span class="text-2xl font-extrabold text-[#0F172A]">{{ $stats['active_accounts'] }}</span>
                        <span class="text-[10.5px] font-bold text-red-600">{{ $stats['suspended_accounts'] }} restricted</span>
                    </div>
                    <p class="text-[10px] text-[#94A3B8] mt-1">Normal platform standing</p>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- SECTION 1: MODERATION QUEUE (Default View)              -->
            <!-- ======================================================== -->
            <div id="section-moderation" class="space-y-10">
                <!-- Renter License Submissions -->
                <div>
                    <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
                        <div class="flex items-center gap-2">
                            <span class="flex h-5 w-5 items-center justify-center rounded bg-[#1A1A1A] text-[10px] font-bold text-[#FEC103]">1</span>
                            <h2 class="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Renter Driver's License Submissions</h2>
                        </div>
                        <span class="rounded-full bg-[#FFF6DA] border border-[#FDE68A] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E]">
                            {{ $pendingRenters->count() }} Awaiting Verification
                        </span>
                    </div>

                    <div class="grid grid-cols-1 gap-5">
                        @forelse ($pendingRenters as $renter)
                            <article class="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
                                <!-- Top Bar -->
                                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] bg-[#FAFBFD] px-5 py-3">
                                    <div class="flex items-center gap-2.5">
                                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A] font-bold text-xs text-[#FEC103]">
                                            {{ strtoupper(substr($renter->first_name ?: 'R', 0, 1) . substr($renter->last_name ?: '', 0, 1)) }}
                                        </div>
                                        <div>
                                            <p class="text-xs font-bold text-[#0F172A]">
                                                {{ trim($renter->first_name . ' ' . $renter->middle_name . ' ' . $renter->last_name . ' ' . $renter->suffix) ?: 'Unnamed Renter' }}
                                            </p>
                                            <p class="text-[10.5px] text-[#64748B]">{{ $renter->email }} · ID #{{ $renter->id }}</p>
                                        </div>
                                    </div>
                                    <div class="text-[11px] text-[#64748B]">
                                        Submitted: <span class="font-semibold text-[#0F172A]">{{ $renter->license_submitted_at ? \Carbon\Carbon::parse($renter->license_submitted_at)->format('M j, Y h:i A') : $renter->updated_at->format('M j, Y') }}</span>
                                    </div>
                                </div>

                                <!-- Body Grid: Info vs Photo Previews vs Decisions -->
                                <div class="grid gap-5 p-5 lg:grid-cols-[1fr_1.4fr_1fr]">
                                    <!-- Column 1: Record Checklist -->
                                    <div class="rounded-xl border border-[#F1F5F9] bg-[#FAFBFD] p-4 text-xs">
                                        <p class="font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2.5">Applicant Record</p>
                                        <dl class="space-y-2">
                                            <div class="flex justify-between border-b border-[#E2E8F0]/60 pb-1.5">
                                                <dt class="text-[#64748B]">Full Name:</dt>
                                                <dd class="font-bold text-[#0F172A]">{{ trim($renter->first_name . ' ' . $renter->last_name) }}</dd>
                                            </div>
                                            <div class="flex justify-between border-b border-[#E2E8F0]/60 pb-1.5">
                                                <dt class="text-[#64748B]">Birthdate:</dt>
                                                <dd class="font-bold text-[#0F172A]">
                                                    {{ $renter->date_of_birth ? $renter->date_of_birth->format('M j, Y') : 'Not provided' }}
                                                    @if ($renter->date_of_birth)
                                                        <span class="text-[#64748B] font-normal">({{ \Carbon\Carbon::parse($renter->date_of_birth)->age }} yrs)</span>
                                                    @endif
                                                </dd>
                                            </div>
                                            <div class="flex justify-between border-b border-[#E2E8F0]/60 pb-1.5">
                                                <dt class="text-[#64748B]">Sex / Gender:</dt>
                                                <dd class="font-bold text-[#0F172A]">{{ $renter->sex ? ucfirst($renter->sex) : 'Not specified' }}</dd>
                                            </div>
                                            <div class="flex justify-between border-b border-[#E2E8F0]/60 pb-1.5">
                                                <dt class="text-[#64748B]">Mobile:</dt>
                                                <dd class="font-bold text-[#0F172A]">{{ $renter->mobile_number ?: 'None' }}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <!-- Column 2: Uploaded Card Previews -->
                                    <div>
                                        <p class="font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2.5">Uploaded License Photos (Click to Enlarge)</p>
                                        <div class="grid grid-cols-2 gap-3">
                                            <!-- Front -->
                                            <div class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-center">
                                                <span class="block text-[10px] font-bold text-[#64748B] mb-1">Front (Name & Details)</span>
                                                @if ($renter->drivers_license_front)
                                                    <img 
                                                        src="{{ \App\Services\PrivateDocumentService::url($renter->drivers_license_front) }}"
                                                        alt="Driver License Front" 
                                                        class="h-32 w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-[#E2E8F0]"
                                                        onclick="openImageModal('{{ \App\Services\PrivateDocumentService::url($renter->drivers_license_front) }}', 'Front License - {{ addslashes(trim($renter->first_name . ' ' . $renter->last_name)) }}')"
                                                    />
                                                @else
                                                    <div class="h-32 flex items-center justify-center rounded-lg bg-[#F1F5F9] text-[#94A3B8] text-[11px]">No Photo</div>
                                                @endif
                                            </div>

                                            <!-- Back -->
                                            <div class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-center">
                                                <span class="block text-[10px] font-bold text-[#64748B] mb-1">Back (Restrictions)</span>
                                                @if ($renter->drivers_license_back)
                                                    <img 
                                                        src="{{ \App\Services\PrivateDocumentService::url($renter->drivers_license_back) }}"
                                                        alt="Driver License Back" 
                                                        class="h-32 w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-[#E2E8F0]"
                                                        onclick="openImageModal('{{ \App\Services\PrivateDocumentService::url($renter->drivers_license_back) }}', 'Back License - {{ addslashes(trim($renter->first_name . ' ' . $renter->last_name)) }}')"
                                                    />
                                                @else
                                                    <div class="h-32 flex items-center justify-center rounded-lg bg-[#F1F5F9] text-[#94A3B8] text-[11px]">No Photo</div>
                                                @endif
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Column 3: Decision Console -->
                                    <div class="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-4 text-xs">
                                        <div>
                                            <p class="font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">Verification Action</p>
                                            <form method="POST" action="{{ route('admin.licenses.approve', $renter) }}">
                                                @csrf
                                                <button 
                                                    class="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer" 
                                                    type="submit"
                                                    onclick="return confirm('Approve driver license for {{ addslashes(trim($renter->first_name . ' ' . $renter->last_name)) }}?')"
                                                >
                                                    ✓ Approve License
                                                </button>
                                            </form>

                                            <div class="my-3 border-t border-[#E2E8F0]"></div>

                                            <form method="POST" action="{{ route('admin.licenses.reject', $renter) }}" class="space-y-2">
                                                @csrf
                                                <textarea 
                                                    class="min-h-16 w-full resize-y rounded-xl border border-[#CBD5E1] bg-white p-2 text-xs text-[#0F172A] outline-none focus:border-red-400" 
                                                    name="rejection_reason" 
                                                    placeholder="Reason for rejection (sent to renter)" 
                                                    required
                                                ></textarea>
                                                <button class="w-full rounded-xl border border-red-200 bg-white hover:bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition cursor-pointer" type="submit">
                                                    ✕ Reject Submission
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        @empty
                            <div class="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center text-xs text-[#64748B]">
                                ✓ All submitted driver's licenses have been reviewed and verified.
                            </div>
                        @endforelse
                    </div>
                </div>

                <!-- Operator Host Accreditation -->
                <div class="pt-4">
                    <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
                        <div class="flex items-center gap-2">
                            <span class="flex h-5 w-5 items-center justify-center rounded bg-[#1A1A1A] text-[10px] font-bold text-[#FEC103]">2</span>
                            <h2 class="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Operator & Commercial Host Accreditation</h2>
                        </div>
                        <span class="rounded-full bg-[#FFF6DA] border border-[#FDE68A] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E]">
                            {{ $operators->count() }} Awaiting Audit
                        </span>
                    </div>

                    <div class="grid grid-cols-1 gap-5">
                        @forelse ($operators as $operator)
                            <article class="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
                                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] bg-[#FAFBFD] px-5 py-3">
                                    <div class="flex items-center gap-2.5">
                                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEC103] font-black text-xs text-[#1A1A1A]">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                        </div>
                                        <div>
                                            <p class="text-xs font-bold text-[#0F172A]">
                                                {{ $operator->operatorProfile?->business_name ?: 'Unnamed Commercial Host' }}
                                            </p>
                                            <p class="text-[10.5px] text-[#64748B]">Representative: {{ trim($operator->first_name . ' ' . $operator->last_name) }} · {{ $operator->email }}</p>
                                        </div>
                                    </div>
                                    <div class="text-[11px] text-[#64748B]">
                                        Applied: <span class="font-semibold text-[#0F172A]">{{ $operator->created_at?->format('M j, Y h:i A') }}</span>
                                    </div>
                                </div>

                                <div class="grid gap-5 p-5 lg:grid-cols-[1fr_1.4fr_1fr]">
                                    <!-- Business Info -->
                                    <div class="rounded-xl border border-[#F1F5F9] bg-[#FAFBFD] p-4 text-xs">
                                        <p class="font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2.5">Business Credentials</p>
                                        <dl class="space-y-2">
                                            <div>
                                                <dt class="text-[#64748B]">Trade Name:</dt>
                                                <dd class="font-bold text-[#0F172A]">{{ $operator->operatorProfile?->business_name }}</dd>
                                            </div>
                                            <div>
                                                <dt class="text-[#64748B]">Address:</dt>
                                                <dd class="font-medium text-[#0F172A]">
                                                    {{ $operator->operatorProfile?->street_address }}, {{ $operator->operatorProfile?->barangay }}, {{ $operator->operatorProfile?->municipality }}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt class="text-[#64748B]">Contact Phone:</dt>
                                                <dd class="font-bold text-[#0F172A]">{{ $operator->mobile_number ?: 'None' }}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <!-- Documents -->
                                    <div>
                                        <p class="font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2.5">Submitted Official Documents</p>
                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                            @foreach (['government_id_front' => 'Gov ID (Front)', 'government_id_back' => 'Gov ID (Back)', 'business_permit_front' => 'Permit (Front)', 'business_permit_back' => 'Permit (Back)'] as $field => $label)
                                                @if ($operator->operatorProfile?->{$field})
                                                    <button 
                                                        type="button"
                                                        onclick="openImageModal('{{ \App\Services\PrivateDocumentService::url($operator->operatorProfile->{$field}) }}', '{{ addslashes($label) }} - {{ addslashes($operator->operatorProfile?->business_name ?: trim($operator->first_name . ' ' . $operator->last_name)) }}')"
                                                        class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold text-[#0F172A] hover:border-[#FEC103] hover:bg-white flex items-center justify-between cursor-pointer w-full text-left transition"
                                                    >
                                                        <span class="flex items-center gap-1.5 truncate">
                                                            <svg class="h-3.5 w-3.5 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                            <span class="truncate">{{ $label }}</span>
                                                        </span>
                                                        <span class="text-[#FEC103] font-bold text-xs">View</span>
                                                    </button>
                                                @else
                                                    <div class="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F1F5F9] px-3 py-2 text-[11px] text-[#94A3B8]">
                                                        {{ $label }} (Missing)
                                                    </div>
                                                @endif
                                            @endforeach
                                        </div>
                                    </div>

                                    <!-- Decision -->
                                    <div class="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-4 text-xs">
                                        <div>
                                            <p class="font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">Accreditation Decision</p>
                                            <form method="POST" action="{{ route('admin.operators.approve', $operator) }}">
                                                @csrf
                                                <button 
                                                    class="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer" 
                                                    type="submit"
                                                    onclick="return confirm('Accredit operator {{ addslashes($operator->operatorProfile?->business_name ?: $operator->first_name) }}?')"
                                                >
                                                    ✓ Accredit Operator
                                                </button>
                                            </form>

                                            <div class="my-3 border-t border-[#E2E8F0]"></div>

                                            <form method="POST" action="{{ route('admin.operators.reject', $operator) }}" class="space-y-2">
                                                @csrf
                                                <textarea 
                                                    class="min-h-16 w-full resize-y rounded-xl border border-[#CBD5E1] bg-white p-2 text-xs text-[#0F172A] outline-none focus:border-red-400" 
                                                    name="rejection_reason" 
                                                    placeholder="Reason for declining application" 
                                                    required
                                                ></textarea>
                                                <button class="w-full rounded-xl border border-red-200 bg-white hover:bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition cursor-pointer" type="submit">
                                                    ✕ Decline Permit
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        @empty
                            <div class="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center text-xs text-[#64748B]">
                                ✓ No pending vehicle host operator accreditation requests.
                            </div>
                        @endforelse
                    </div>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- SECTION 2: MEMBER DIRECTORY & GOVERNANCE                -->
            <!-- ======================================================== -->
            <div id="section-users" class="hidden space-y-5">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="relative flex-1 max-w-md">
                        <input 
                            type="text" 
                            id="user-search-input" 
                            onkeyup="filterUserTable()" 
                            placeholder="Filter members by name, email, or mobile..." 
                            class="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-xs text-[#0F172A] outline-none focus:border-[#FEC103]"
                        />
                        <svg class="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>

                    <div class="flex items-center gap-1.5 text-xs">
                        <button onclick="setRoleFilter('all')" id="role-all-btn" class="rounded-lg bg-[#0F172A] text-white px-3 py-1.5 text-xs font-bold transition">All ({{ $allUsers->count() }})</button>
                        <button onclick="setRoleFilter('customer')" id="role-customer-btn" class="rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 text-xs font-bold hover:bg-[#F8FAFC] transition">Renters ({{ $stats['total_renters'] }})</button>
                        <button onclick="setRoleFilter('operator')" id="role-operator-btn" class="rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 text-xs font-bold hover:bg-[#F8FAFC] transition">Hosts ({{ $stats['total_operators'] }})</button>
                    </div>
                </div>

                <div class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
                    <table class="w-full text-left border-collapse text-xs" id="users-directory-table">
                        <thead>
                            <tr class="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[#64748B] uppercase font-bold text-[10px] tracking-wider">
                                <th class="py-3 px-5">Member</th>
                                <th class="py-3 px-5">Contact</th>
                                <th class="py-3 px-5">Role</th>
                                <th class="py-3 px-5">KYC Verified</th>
                                <th class="py-3 px-5">Account Status</th>
                                <th class="py-3 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#F1F5F9]">
                            @forelse ($allUsers as $u)
                                <tr class="user-row hover:bg-[#FAFBFD] transition" data-role="{{ in_array($u->role, ['customer', 'renter']) ? 'customer' : $u->role }}" data-search="{{ strtolower(trim($u->first_name . ' ' . $u->last_name . ' ' . $u->email . ' ' . $u->mobile_number)) }}">
                                    <td class="py-3.5 px-5">
                                        <div class="flex items-center gap-2.5">
                                            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F5F9] font-bold text-[#0F172A] text-[11px] border border-[#E2E8F0]">
                                                {{ strtoupper(substr($u->first_name ?: 'U', 0, 1) . substr($u->last_name ?: '', 0, 1)) }}
                                            </div>
                                            <div>
                                                <p class="font-bold text-[#0F172A]">{{ trim($u->first_name . ' ' . $u->last_name) }}</p>
                                                <p class="text-[10px] text-[#94A3B8]">ID #{{ $u->id }}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-3.5 px-5">
                                        <p class="font-semibold text-[#0F172A]">{{ $u->email }}</p>
                                        <p class="text-[#64748B] text-[10.5px]">{{ $u->mobile_number ?: 'No phone' }}</p>
                                    </td>
                                    <td class="py-3.5 px-5">
                                        @if ($u->role === 'operator')
                                            <span class="rounded bg-[#FFF6DA] border border-[#FDE68A] px-2 py-0.5 text-[10px] font-bold uppercase text-[#92400E]">Host</span>
                                        @else
                                            <span class="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">Renter</span>
                                        @endif
                                    </td>
                                    <td class="py-3.5 px-5">
                                        @if ($u->is_drivers_license_verified)
                                            <span class="text-emerald-700 font-semibold text-[11px]">✓ Verified</span>
                                        @elseif ($u->role === 'operator' && $u->account_status === 'active')
                                            <span class="text-emerald-700 font-semibold text-[11px]">✓ Accredited</span>
                                        @else
                                            <span class="text-[#94A3B8] text-[11px]">Unverified</span>
                                        @endif
                                    </td>
                                    <td class="py-3.5 px-5">
                                        @if ($u->account_status === 'active')
                                            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                                                <span class="h-1 w-1 rounded-full bg-emerald-500"></span> Active
                                            </span>
                                        @elseif ($u->account_status === 'suspended')
                                            <span class="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10.5px] font-bold text-red-700">
                                                <span class="h-1 w-1 rounded-full bg-red-500"></span> Suspended
                                            </span>
                                        @else
                                            <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">
                                                {{ ucfirst($u->account_status) }}
                                            </span>
                                        @endif
                                    </td>
                                    <td class="py-3.5 px-5 text-right">
                                        <div class="flex items-center justify-end gap-1.5">
                                            <button 
                                                onclick="openProfileViewModal({{ json_encode([
                                                    'id' => $u->id,
                                                    'name' => trim($u->first_name . ' ' . $u->middle_name . ' ' . $u->last_name . ' ' . $u->suffix),
                                                    'email' => $u->email,
                                                    'mobile_number' => $u->mobile_number ?: 'Not provided',
                                                    'date_of_birth' => $u->date_of_birth ? $u->date_of_birth->format('F j, Y') : 'Not provided',
                                                    'sex' => $u->sex ? ucfirst($u->sex) : 'Not specified',
                                                    'role' => $u->role === 'operator' ? 'Operator (Fleet Host)' : 'Renter (Customer)',
                                                    'account_status' => ucfirst($u->account_status),
                                                    'license_verified' => $u->is_drivers_license_verified ? 'Verified' : 'Unverified',
                                                    'created_at' => $u->created_at?->format('F j, Y h:i A'),
                                                    'business_name' => $u->operatorProfile?->business_name,
                                                    'business_address' => $u->operatorProfile ? ($u->operatorProfile->street_address . ', ' . $u->operatorProfile->barangay . ', ' . $u->operatorProfile->municipality) : null,
                                                ]) }})" 
                                                class="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-[11px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                                            >
                                                Inspect
                                            </button>

                                            <button 
                                                onclick="openStatusModal({{ $u->id }}, '{{ addslashes(trim($u->first_name . ' ' . $u->last_name)) }}', '{{ $u->email }}', '{{ $u->account_status }}')" 
                                                class="rounded-lg border border-[#E2E8F0] px-2 py-1 text-[11px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                                            >
                                                Status
                                            </button>

                                            <form method="POST" action="{{ route('admin.users.toggle-status', $u) }}" class="inline">
                                                @csrf
                                                <button 
                                                    class="rounded-lg border {{ $u->account_status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' }} px-2 py-1 text-[11px] font-semibold"
                                                    type="submit"
                                                >
                                                    {{ $u->account_status === 'active' ? 'Suspend' : 'Activate' }}
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="6" class="py-6 text-center text-xs text-[#64748B]">No members registered yet.</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- SECTION 3: AUDIT TRAIL LOGS                             -->
            <!-- ======================================================== -->
            <div id="section-audit" class="hidden space-y-4">
                <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                    <div>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Administrative Action Log & Compliance Audit</h2>
                        <p class="text-xs text-[#64748B]">Permanent, chronological record of all administrative verifications, status changes, announcements, and policy edits.</p>
                    </div>
                    <a href="{{ route('admin.exports.audit-logs') }}" class="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] hover:bg-[#F8FAFC]">
                        Download CSV ↓
                    </a>
                </div>

                <div class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
                    <table class="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                            <tr class="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[#64748B] uppercase font-bold text-[10px] tracking-wider font-sans">
                                <th class="py-2.5 px-4">Timestamp</th>
                                <th class="py-2.5 px-4">Admin</th>
                                <th class="py-2.5 px-4">Action</th>
                                <th class="py-2.5 px-4">Target</th>
                                <th class="py-2.5 px-4">Details / Justification</th>
                                <th class="py-2.5 px-4 text-right">IP</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#F1F5F9] text-[11px]">
                            @forelse ($auditLogs as $l)
                                <tr class="hover:bg-[#FAFBFD] transition">
                                    <td class="py-3 px-4 text-[#64748B] whitespace-nowrap">{{ $l->created_at?->format('Y-m-d H:i:s') }}</td>
                                    <td class="py-3 px-4 font-bold text-[#0F172A] font-sans">{{ $l->admin_name ?: 'System Admin' }}</td>
                                    <td class="py-3 px-4">
                                        <span class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase font-sans {{ str_contains($l->action, 'approved') ? 'bg-emerald-100 text-emerald-800' : (str_contains($l->action, 'rejected') ? 'bg-red-100 text-red-800' : 'bg-[#FFF6DA] text-[#92400E]') }}">
                                            {{ str_replace('_', ' ', $l->action) }}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 font-sans text-[#0F172A] font-semibold">{{ $l->target_name ?: $l->target_type }}</td>
                                    <td class="py-3 px-4 text-[#64748B] font-sans max-w-sm truncate" title="{{ $l->details }}">{{ $l->details ?: '—' }}</td>
                                    <td class="py-3 px-4 text-right text-[#94A3B8]">{{ $l->ip_address }}</td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="6" class="py-6 text-center text-xs font-sans text-[#64748B]">No administrative actions recorded yet.</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- SECTION 4: REVIEW MODERATION                            -->
            <!-- ======================================================== -->
            <div id="section-reviews" class="hidden space-y-4">
                <div class="border-b border-[#E2E8F0] pb-3">
                    <h2 class="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Public Feedback & Community Review Moderation</h2>
                    <p class="text-xs text-[#64748B]">Review member ratings and comments submitted for vehicles. Flag or hide content violating community decency guidelines.</p>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    @forelse ($reviews as $rev)
                        <div class="rounded-xl border {{ $rev->is_review_hidden ? 'border-red-200 bg-red-50/50' : 'border-[#E2E8F0] bg-white' }} p-4 shadow-xs flex flex-col justify-between">
                            <div>
                                <div class="flex items-start justify-between">
                                    <div>
                                        <p class="font-bold text-xs text-[#0F172A]">{{ $rev->vehicle?->name ?: 'Vehicle Listing' }}</p>
                                        <p class="text-[10px] text-[#64748B]">By {{ $rev->renter ? trim($rev->renter->first_name . ' ' . $rev->renter->last_name) : 'Renter' }}</p>
                                    </div>
                                    <span class="rounded bg-[#FFF6DA] border border-[#FDE68A] px-1.5 py-0.2 text-xs font-bold text-[#92400E]">
                                        ★ {{ $rev->rating ?: 'N/A' }}
                                    </span>
                                </div>

                                <p class="mt-2.5 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] p-2.5 text-xs text-[#334155] italic">
                                    "{{ $rev->review ?: 'No comment provided.' }}"
                                </p>

                                @if ($rev->is_review_hidden)
                                    <p class="mt-2 flex items-center gap-1 text-[10.5px] font-bold text-red-600"><svg class="h-3.5 w-3.5 inline text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>Hidden from Public Catalog</p>
                                @endif
                            </div>

                            <div class="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between">
                                <span class="text-[10px] text-[#94A3B8]">{{ $rev->updated_at?->format('M j, Y') }}</span>
                                <form method="POST" action="{{ route('admin.reviews.toggle-visibility', $rev) }}" class="inline">
                                    @csrf
                                    <button class="rounded-lg border {{ $rev->is_review_hidden ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-600' }} px-2.5 py-1 text-[11px] font-bold cursor-pointer" type="submit">
                                        {{ $rev->is_review_hidden ? 'Restore' : 'Hide Review' }}
                                    </button>
                                </form>
                            </div>
                        </div>
                    @empty
                        <div class="col-span-full rounded-xl border border-dashed border-[#CBD5E1] bg-white p-6 text-center text-xs text-[#64748B]">
                            No reviews submitted on the platform yet.
                        </div>
                    @endforelse
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- SECTION 5: DISPUTES & INCIDENTS                         -->
            <!-- ======================================================== -->
            <div id="section-disputes" class="hidden space-y-4">
                <div class="border-b border-[#E2E8F0] pb-3">
                    <h2 class="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Trip Incident & Dispute Resolution Desk</h2>
                    <p class="text-xs text-[#64748B]">Inspect rentals with cancelled states, damage fees, fuel claims, or late return surcharges. Log official administrative resolution memos.</p>
                </div>

                <div class="space-y-3">
                    @forelse ($disputes as $disp)
                        <div class="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                            <div class="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                                <div>
                                    <p class="font-bold text-xs text-[#0F172A]">Booking #{{ $disp->id }} · {{ $disp->vehicle?->name }}</p>
                                    <p class="text-[10.5px] text-[#64748B]">
                                        Renter: <span class="font-semibold text-[#0F172A]">{{ $disp->renter ? trim($disp->renter->first_name . ' ' . $disp->renter->last_name) : 'N/A' }}</span> · 
                                        Host: <span class="font-semibold text-[#0F172A]">{{ $disp->operator ? trim($disp->operator->first_name . ' ' . $disp->operator->last_name) : 'N/A' }}</span>
                                    </p>
                                </div>
                                <span class="rounded bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#64748B]">
                                    {{ strtoupper($disp->status) }}
                                </span>
                            </div>

                            <div class="mt-3 grid grid-cols-4 gap-2 text-xs">
                                <div class="rounded-lg bg-[#FAFBFD] p-2">
                                    <span class="text-[#64748B] text-[10px]">Damage:</span>
                                    <p class="font-bold text-red-600">₱{{ number_format($disp->damage_charge ?: 0, 2) }}</p>
                                </div>
                                <div class="rounded-lg bg-[#FAFBFD] p-2">
                                    <span class="text-[#64748B] text-[10px]">Fuel:</span>
                                    <p class="font-bold text-amber-600">₱{{ number_format($disp->fuel_charge ?: 0, 2) }}</p>
                                </div>
                                <div class="rounded-lg bg-[#FAFBFD] p-2">
                                    <span class="text-[#64748B] text-[10px]">Late Fee:</span>
                                    <p class="font-bold text-amber-600">₱{{ number_format($disp->late_fee ?: 0, 2) }}</p>
                                </div>
                                <div class="rounded-lg bg-[#FAFBFD] p-2">
                                    <span class="text-[#64748B] text-[10px]">Total Surcharges:</span>
                                    <p class="font-bold text-[#0F172A]">₱{{ number_format(($disp->damage_charge + $disp->fuel_charge + $disp->late_fee + $disp->other_charges), 2) }}</p>
                                </div>
                            </div>

                            <div class="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between">
                                <div class="text-[11px] text-[#64748B] truncate max-w-lg">
                                    <span class="font-bold text-[#0F172A]">Memo:</span> {{ $disp->admin_memo ?: 'No memo recorded.' }}
                                </div>
                                <button onclick="openDisputeMemoModal({{ $disp->id }}, '{{ addslashes($disp->admin_memo ?: '') }}')" class="rounded-lg bg-[#0F172A] text-white px-3 py-1.5 text-[11px] font-bold cursor-pointer">
                                    Log Memo
                                </button>
                            </div>
                        </div>
                    @empty
                        <div class="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-6 text-center text-xs text-[#64748B]">
                            ✓ No disputed bookings or surcharge incidents recorded.
                        </div>
                    @endforelse
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- SECTION 6: PLATFORM SETTINGS                            -->
            <!-- ======================================================== -->
            <div id="section-settings" class="hidden space-y-4">
                <div class="border-b border-[#E2E8F0] pb-3">
                    <h2 class="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Platform Governance & Operational Controls</h2>
                    <p class="text-xs text-[#64748B]">Configure platform-wide policies, verification strictness, emergency contacts, and fee structures.</p>
                </div>

                <form method="POST" action="{{ route('admin.settings.update') }}" class="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs space-y-4 text-xs">
                    @csrf
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-3.5 flex items-center justify-between">
                            <div>
                                <p class="font-bold text-[#0F172A]">Strict KYC Enforcement</p>
                                <p class="text-[10.5px] text-[#64748B]">Require approved license before placing booking</p>
                            </div>
                            <select name="require_kyc_for_booking" class="rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-bold text-[#0F172A]">
                                <option value="1" {{ $platformSettings['require_kyc_for_booking'] == '1' ? 'selected' : '' }}>Enforced</option>
                                <option value="0" {{ $platformSettings['require_kyc_for_booking'] == '0' ? 'selected' : '' }}>Flexible</option>
                            </select>
                        </div>

                        <div class="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-3.5 flex items-center justify-between">
                            <div>
                                <p class="font-bold text-[#0F172A]">System Maintenance Mode</p>
                                <p class="text-[10.5px] text-[#64748B]">Display operational alert banner on clients</p>
                            </div>
                            <select name="maintenance_mode" class="rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-bold text-[#0F172A]">
                                <option value="0" {{ $platformSettings['maintenance_mode'] == '0' ? 'selected' : '' }}>Live (Normal)</option>
                                <option value="1" {{ $platformSettings['maintenance_mode'] == '1' ? 'selected' : '' }}>Maintenance Alert</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-[#0F172A] mb-1" for="support_phone">Platform Emergency Hotline</label>
                            <input class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#FEC103]" type="text" id="support_phone" name="support_phone" value="{{ $platformSettings['support_phone'] }}" required>
                        </div>

                        <div>
                            <label class="block font-bold text-[#0F172A] mb-1" for="support_email">Official Compliance Support Email</label>
                            <input class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#FEC103]" type="email" id="support_email" name="support_email" value="{{ $platformSettings['support_email'] }}" required>
                        </div>

                        <div>
                            <label class="block font-bold text-[#0F172A] mb-1" for="max_advance_days">Max Advance Reservation Window (Days)</label>
                            <input class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#FEC103]" type="number" id="max_advance_days" name="max_advance_days" value="{{ $platformSettings['max_advance_days'] }}" required>
                        </div>

                        <div>
                            <label class="block font-bold text-[#0F172A] mb-1" for="platform_fee_percent">Platform Service Fee Rate (%)</label>
                            <input class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#FEC103]" type="number" step="0.5" id="platform_fee_percent" name="platform_fee_percent" value="{{ $platformSettings['platform_fee_percent'] }}" required>
                        </div>
                    </div>

                    <div class="pt-3 border-t border-[#F1F5F9] flex justify-end">
                        <button type="submit" class="rounded-xl bg-[#FEC103] hover:bg-[#EAB308] px-5 py-2.5 text-xs font-bold text-[#1A1A1A] shadow-xs cursor-pointer">
                            Save Operational Controls
                        </button>
                    </div>
                </form>
            </div>

            <!-- ======================================================== -->
            <!-- SECTION 7: COMPLIANCE EXPORTS                           -->
            <!-- ======================================================== -->
            <div id="section-exports" class="hidden space-y-4">
                <div class="border-b border-[#E2E8F0] pb-3">
                    <h2 class="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Regulatory Compliance & Data Exports Hub</h2>
                    <p class="text-xs text-[#64748B]">Generate formal data spreadsheets formatted for government agencies (LTO, LGUs, DTI) and platform audits.</p>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div class="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs flex flex-col justify-between">
                        <div>
                            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF6DA] text-[#92400E]">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                            </div>
                            <h3 class="font-bold text-sm text-[#0F172A] mt-2">Renter KYC Audit Registry</h3>
                            <p class="text-[11px] text-[#64748B] mt-1">Spreadsheet of verified and unverified renters with government ID records.</p>
                        </div>
                        <a href="{{ route('admin.exports.renters-kyc') }}" class="mt-4 inline-flex items-center justify-center rounded-xl bg-[#0F172A] text-white py-2 text-xs font-bold hover:bg-[#1E293B]">
                            Download CSV ↓
                        </a>
                    </div>

                    <div class="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs flex flex-col justify-between">
                        <div>
                            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF6DA] text-[#92400E]">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                            </div>
                            <h3 class="font-bold text-sm text-[#0F172A] mt-2">Fleet Operator Registry</h3>
                            <p class="text-[11px] text-[#64748B] mt-1">Directory of commercial host businesses, municipal addresses, and permits.</p>
                        </div>
                        <a href="{{ route('admin.exports.operators') }}" class="mt-4 inline-flex items-center justify-center rounded-xl bg-[#0F172A] text-white py-2 text-xs font-bold hover:bg-[#1E293B]">
                            Download CSV ↓
                        </a>
                    </div>

                    <div class="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs flex flex-col justify-between">
                        <div>
                            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF6DA] text-[#92400E]">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                            </div>
                            <h3 class="font-bold text-sm text-[#0F172A] mt-2">Administrative Audit Trail</h3>
                            <p class="text-[11px] text-[#64748B] mt-1">Chronological history of admin approvals, suspensions, and notices.</p>
                        </div>
                        <a href="{{ route('admin.exports.audit-logs') }}" class="mt-4 inline-flex items-center justify-center rounded-xl bg-[#0F172A] text-white py-2 text-xs font-bold hover:bg-[#1E293B]">
                            Download CSV ↓
                        </a>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- ======================================================== -->
    <!-- MODALS                                                   -->
    <!-- ======================================================== -->
    
    <!-- Modal 1: Status Modal -->
    <div id="status-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
        <div class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8F0]">
            <div class="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <h3 class="text-sm font-bold text-[#0F172A]">Manage Member Account Status</h3>
                <button onclick="closeStatusModal()" class="text-[#94A3B8] hover:text-[#0F172A]">✕</button>
            </div>
            <form id="status-form" method="POST" action="" class="mt-4 space-y-3.5 text-xs">
                @csrf
                @method('PUT')
                <div class="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                    <p id="status-target-name" class="font-bold text-[#0F172A]"></p>
                    <p id="status-target-email" class="text-[11px] text-[#64748B]"></p>
                </div>
                <div>
                    <label class="block font-bold text-[#0F172A] mb-1" for="account_status_select">Account Status</label>
                    <select class="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 outline-none" id="account_status_select" name="account_status" required>
                        <option value="active">Active (Normal Access)</option>
                        <option value="suspended">Suspended (Access Restricted)</option>
                        <option value="pending">Pending Review</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-[#0F172A] mb-1" for="status_reason">Reason for Status Change</label>
                    <textarea class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 outline-none" id="status_reason" name="status_reason" placeholder="Optional explanation sent to user"></textarea>
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" onclick="closeStatusModal()" class="rounded-xl border border-[#E2E8F0] px-3.5 py-2 font-semibold text-[#64748B]">Cancel</button>
                    <button type="submit" class="rounded-xl bg-[#FEC103] hover:bg-[#EAB308] px-4 py-2 font-bold text-[#1A1A1A]">Update Status</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal 2: Profile View Modal -->
    <div id="profile-view-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
        <div class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8F0] text-xs">
            <div class="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <h3 class="text-sm font-bold text-[#0F172A]">Member Profile & KYC Record</h3>
                <button onclick="closeProfileViewModal()" class="text-[#94A3B8] hover:text-[#0F172A]">✕</button>
            </div>
            <div class="mt-4 space-y-2.5">
                <div class="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 flex items-center gap-3">
                    <div id="view-avatar-badge" class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-white font-bold text-sm">U</div>
                    <div>
                        <p id="view-user-name" class="font-bold text-sm text-[#0F172A]"></p>
                        <p id="view-user-role" class="text-[#64748B] text-[11px]"></p>
                    </div>
                </div>
                <dl class="space-y-2">
                    <div class="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                        <dt class="text-[#64748B]">Email:</dt>
                        <dd id="view-user-email" class="font-bold text-[#0F172A]"></dd>
                    </div>
                    <div class="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                        <dt class="text-[#64748B]">Mobile:</dt>
                        <dd id="view-user-phone" class="font-bold text-[#0F172A]"></dd>
                    </div>
                    <div class="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                        <dt class="text-[#64748B]">Birthdate:</dt>
                        <dd id="view-user-dob" class="font-bold text-[#0F172A]"></dd>
                    </div>
                    <div class="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                        <dt class="text-[#64748B]">Gender:</dt>
                        <dd id="view-user-sex" class="font-bold text-[#0F172A]"></dd>
                    </div>
                    <div class="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                        <dt class="text-[#64748B]">Status:</dt>
                        <dd id="view-user-status" class="font-bold"></dd>
                    </div>
                    <div class="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                        <dt class="text-[#64748B]">KYC License:</dt>
                        <dd id="view-user-kyc" class="font-bold"></dd>
                    </div>
                </dl>
                <div id="view-operator-block" class="hidden rounded-lg bg-[#FFF6DA] border border-[#FDE68A] p-2.5">
                    <p class="font-bold text-[#92400E]">Commercial Host Credentials</p>
                    <p class="text-[#64748B] mt-0.5">Name: <span id="view-biz-name" class="font-semibold text-[#0F172A]"></span></p>
                    <p class="text-[#64748B]">Address: <span id="view-biz-address" class="font-medium text-[#0F172A]"></span></p>
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-[#F1F5F9] flex justify-end">
                <button type="button" onclick="closeProfileViewModal()" class="rounded-xl bg-[#F1F5F9] px-4 py-2 font-bold text-[#0F172A]">Close</button>
            </div>
        </div>
    </div>

    <!-- Modal 3: Broadcast Announcement -->
    <div id="broadcast-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
        <div class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8F0] text-xs">
            <div class="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <h3 class="text-sm font-bold text-[#0F172A]">Broadcast Platform Announcement</h3>
                <button onclick="closeBroadcastModal()" class="text-[#94A3B8] hover:text-[#0F172A]">✕</button>
            </div>
            <form method="POST" action="{{ route('admin.announcements.broadcast') }}" class="mt-4 space-y-3.5">
                @csrf
                <div class="grid grid-cols-2 gap-2.5">
                    <div>
                        <label class="block font-bold text-[#0F172A] mb-1" for="target_audience">Target</label>
                        <select class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2 outline-none" id="target_audience" name="target_audience" required>
                            <option value="all">All Members</option>
                            <option value="customer">Renters Only</option>
                            <option value="operator">Hosts Only</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-[#0F172A] mb-1" for="announcement_type">Type</label>
                        <select class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2 outline-none" id="announcement_type" name="type" required>
                            <option value="info">Info</option>
                            <option value="warning">Advisory</option>
                            <option value="success">Milestone</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block font-bold text-[#0F172A] mb-1" for="announcement_title">Title</label>
                    <input class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2 outline-none" type="text" id="announcement_title" name="title" placeholder="Notice headline" required>
                </div>
                <div>
                    <label class="block font-bold text-[#0F172A] mb-1" for="announcement_message">Message</label>
                    <textarea class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2 outline-none min-h-20" id="announcement_message" name="message" placeholder="Message content" required></textarea>
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" onclick="closeBroadcastModal()" class="rounded-xl border border-[#E2E8F0] px-3.5 py-2 font-semibold text-[#64748B]">Cancel</button>
                    <button type="submit" class="rounded-xl bg-[#FEC103] hover:bg-[#EAB308] px-4 py-2 font-bold text-[#1A1A1A]">Broadcast Notice</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal 4: Dispute Memo Modal -->
    <div id="dispute-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
        <div class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8F0] text-xs">
            <div class="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <h3 class="text-sm font-bold text-[#0F172A]">Log Official Dispute Resolution Memo</h3>
                <button onclick="closeDisputeMemoModal()" class="text-[#94A3B8] hover:text-[#0F172A]">✕</button>
            </div>
            <form id="dispute-form" method="POST" action="" class="mt-4 space-y-3.5">
                @csrf
                <div>
                    <label class="block font-bold text-[#0F172A] mb-1" for="admin_memo_input">Resolution Findings & Action</label>
                    <textarea class="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 outline-none min-h-20" id="admin_memo_input" name="admin_memo" placeholder="Document administrative resolution findings..." required></textarea>
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" onclick="closeDisputeMemoModal()" class="rounded-xl border border-[#E2E8F0] px-3.5 py-2 font-semibold text-[#64748B]">Cancel</button>
                    <button type="submit" class="rounded-xl bg-[#0F172A] text-white px-4 py-2 font-bold">Save Memo</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal 5: Image Lightbox -->
    <div id="image-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onclick="closeImageModal(event)">
        <div class="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-[#0F172A] p-4 text-white shadow-2xl border border-white/10" onclick="event.stopPropagation()">
            <div class="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                <h4 id="modal-title" class="text-xs font-bold text-white truncate max-w-md">Document Inspection</h4>
                <div class="flex items-center gap-2">
                    <a id="modal-open-link" href="#" target="_blank" rel="noreferrer" class="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#FEC103]">Open Tab</a>
                    <button onclick="closeImageModal()" class="rounded-lg p-1 text-[#94A3B8] hover:text-white">✕</button>
                </div>
            </div>
            <div class="flex items-center justify-center max-h-[75vh] overflow-auto">
                <img id="modal-image" src="" alt="Preview" class="max-h-[75vh] w-auto rounded object-contain" />
            </div>
        </div>
    </div>

    <!-- JavaScript Handlers -->
    <script>
        const tabMeta = {
            'moderation': { title: 'Moderation & Verification Queue', sub: "Driver's license reviews and commercial operator accreditation" },
            'users': { title: 'Platform Member Directory', sub: 'Inspect renter and vehicle host accounts and govern access standing' },
            'audit': { title: 'Administrative Action Audit Log', sub: 'Chronological immutable record of administrator actions and system decisions' },
            'reviews': { title: 'Public Review Moderation Desk', sub: 'Monitor member vehicle ratings and enforce community decency guidelines' },
            'disputes': { title: 'Trip Incident & Dispute Desk', sub: 'Examine cancelled bookings, damage surcharges, fuel claims, and log resolution memos' },
            'settings': { title: 'Platform Operational Controls', sub: 'Configure global policies, KYC strictness, emergency contacts, and fee rates' },
            'exports': { title: 'Regulatory Compliance Exports Hub', sub: 'Generate and download official CSV spreadsheets for government and audit reports' }
        };

        function switchTab(tabId) {
            Object.keys(tabMeta).forEach(t => {
                const btn = document.getElementById('nav-' + t);
                const sec = document.getElementById('section-' + t);
                if (btn && sec) {
                    if (t === tabId) {
                        btn.className = 'nav-item-active flex w-full items-center justify-between rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer';
                        sec.classList.remove('hidden');
                    } else {
                        btn.className = 'nav-item-inactive flex w-full items-center justify-between rounded-r-xl px-3 py-2.5 transition text-left cursor-pointer';
                        sec.classList.add('hidden');
                    }
                }
            });

            if (tabMeta[tabId]) {
                document.getElementById('topbar-section-title').textContent = tabMeta[tabId].title;
                document.getElementById('topbar-section-sub').textContent = tabMeta[tabId].sub;
            }

            // Close mobile sidebar if open
            const sidebar = document.getElementById('admin-sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            if (!sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
            }
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('admin-sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            sidebar.classList.toggle('-translate-x-full');
            backdrop.classList.toggle('hidden');
        }

        // Live User Search & Filter
        let activeRole = 'all';

        function setRoleFilter(role) {
            activeRole = role;
            ['all', 'customer', 'operator'].forEach(r => {
                const b = document.getElementById('role-' + r + '-btn');
                if (b) {
                    if (r === role) {
                        b.className = 'rounded-lg bg-[#0F172A] text-white px-3 py-1.5 text-xs font-bold transition';
                    } else {
                        b.className = 'rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 text-xs font-bold hover:bg-[#F8FAFC] transition';
                    }
                }
            });
            filterUserTable();
        }

        function filterUserTable() {
            const query = (document.getElementById('user-search-input').value || '').toLowerCase();
            const rows = document.querySelectorAll('#users-directory-table tbody tr.user-row');

            rows.forEach(row => {
                const rowRole = row.getAttribute('data-role');
                const rowSearch = row.getAttribute('data-search') || '';

                const matchesRole = (activeRole === 'all') || (rowRole === activeRole);
                const matchesQuery = !query || rowSearch.includes(query);

                row.style.display = (matchesRole && matchesQuery) ? '' : 'none';
            });
        }

        // Modals
        function openStatusModal(userId, name, email, currentStatus) {
            document.getElementById('status-form').action = '/admin/users/' + userId + '/status';
            document.getElementById('status-target-name').textContent = name;
            document.getElementById('status-target-email').textContent = email;
            document.getElementById('account_status_select').value = currentStatus || 'active';
            document.getElementById('status_reason').value = '';

            document.getElementById('status-modal').classList.remove('hidden');
            document.getElementById('status-modal').classList.add('flex');
        }

        function closeStatusModal() {
            document.getElementById('status-modal').classList.add('hidden');
            document.getElementById('status-modal').classList.remove('flex');
        }

        function openProfileViewModal(data) {
            document.getElementById('view-avatar-badge').textContent = data.name.charAt(0).toUpperCase() || 'U';
            document.getElementById('view-user-name').textContent = data.name;
            document.getElementById('view-user-role').textContent = data.role;
            document.getElementById('view-user-email').textContent = data.email;
            document.getElementById('view-user-phone').textContent = data.mobile_number;
            document.getElementById('view-user-dob').textContent = data.date_of_birth;
            document.getElementById('view-user-sex').textContent = data.sex;
            document.getElementById('view-user-status').textContent = data.account_status;
            document.getElementById('view-user-kyc').textContent = data.license_verified;

            const bizBlock = document.getElementById('view-operator-block');
            if (data.business_name) {
                bizBlock.classList.remove('hidden');
                document.getElementById('view-biz-name').textContent = data.business_name;
                document.getElementById('view-biz-address').textContent = data.business_address || 'Not specified';
            } else {
                bizBlock.classList.add('hidden');
            }

            document.getElementById('profile-view-modal').classList.remove('hidden');
            document.getElementById('profile-view-modal').classList.add('flex');
        }

        function closeProfileViewModal() {
            document.getElementById('profile-view-modal').classList.add('hidden');
            document.getElementById('profile-view-modal').classList.remove('flex');
        }

        function openBroadcastModal() {
            document.getElementById('broadcast-modal').classList.remove('hidden');
            document.getElementById('broadcast-modal').classList.add('flex');
        }

        function closeBroadcastModal() {
            document.getElementById('broadcast-modal').classList.add('hidden');
            document.getElementById('broadcast-modal').classList.remove('flex');
        }

        function openDisputeMemoModal(bookingId, memo) {
            document.getElementById('dispute-form').action = '/admin/disputes/' + bookingId + '/memo';
            document.getElementById('admin_memo_input').value = memo || '';
            document.getElementById('dispute-modal').classList.remove('hidden');
            document.getElementById('dispute-modal').classList.add('flex');
        }

        function closeDisputeMemoModal() {
            document.getElementById('dispute-modal').classList.add('hidden');
            document.getElementById('dispute-modal').classList.remove('flex');
        }

        function openImageModal(src, title) {
            document.getElementById('modal-image').src = src;
            document.getElementById('modal-title').textContent = title || 'Document Inspection';
            document.getElementById('modal-open-link').href = src;
            document.getElementById('image-modal').classList.remove('hidden');
            document.getElementById('image-modal').classList.add('flex');
        }

        function closeImageModal(e) {
            document.getElementById('image-modal').classList.add('hidden');
            document.getElementById('image-modal').classList.remove('flex');
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeImageModal();
                closeStatusModal();
                closeProfileViewModal();
                closeBroadcastModal();
                closeDisputeMemoModal();
            }
        });

        function showAdminToast(title, message, type = 'success') {
            const container = document.getElementById('admin-toast-container');
            if (!container) return;

            const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
            const toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'pointer-events-auto transform transition-all duration-300 ease-out translate-x-full opacity-0 flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl';

            let iconHtml = '';
            let borderColor = 'border-[#E2E8F0]';
            let titleColor = 'text-[#0F172A]';

            if (type === 'success') {
                borderColor = 'border-emerald-200';
                iconHtml = '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm">✓</div>';
            } else if (type === 'error') {
                borderColor = 'border-rose-200';
                iconHtml = '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold text-sm">✕</div>';
            } else if (type === 'warning') {
                borderColor = 'border-amber-200';
                iconHtml = '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold text-sm">!</div>';
            } else {
                borderColor = 'border-sky-200';
                iconHtml = '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 font-bold text-sm">i</div>';
            }

            toast.classList.add(borderColor);
            toast.innerHTML = `
                ${iconHtml}
                <div class="flex-1 min-w-0 pt-0.5">
                    <h5 class="text-xs font-bold ${titleColor} truncate">${title}</h5>
                    ${message ? `<p class="mt-0.5 text-[11.5px] leading-relaxed text-[#64748B]">${message}</p>` : ''}
                </div>
                <button type="button" onclick="dismissToast('${toastId}')" class="shrink-0 text-[#94A3B8] hover:text-[#0F172A] p-1 text-sm font-bold cursor-pointer">✕</button>
            `;

            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.remove('translate-x-full', 'opacity-0');
                toast.classList.add('translate-x-0', 'opacity-100');
            });

            setTimeout(() => {
                dismissToast(toastId);
            }, 4500);
        }

        function dismissToast(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => el.remove(), 300);
        }

        document.addEventListener('DOMContentLoaded', function() {
            @if (session('status'))
                showAdminToast('Action Completed', '{{ addslashes(session('status')) }}', 'success');
            @endif
            @if (isset($errors) && $errors->any())
                showAdminToast('Notice', '{{ addslashes($errors->first()) }}', 'error');
            @endif
        });
    </script>

    <!-- Global Floating Toast Notification Stack -->
    <div id="admin-toast-container" class="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none sm:max-w-md"></div>
</body>
</html>
