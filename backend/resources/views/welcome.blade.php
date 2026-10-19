<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="scroll-smooth">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ride4Rent — Self-Drive & Chauffeur Car Rental Mobile App</title>
    <meta name="description" content="Mindoro's premier car and van rental app. Rent verified cars, SUVs, and vans with zero broker fees, live host chat, digital inspections, and instant GCash deposits.">
    <link rel="icon" type="image/png" href="{{ asset('images/ride4rent.png') }}">

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">

    <!-- FontAwesome 6 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        display: ['"Space Grotesk"', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            50: '#fffbeb',
                            100: '#fef3c7',
                            200: '#fde68a',
                            300: '#fcd34d',
                            400: '#fbbf24',
                            500: '#f59e0b',
                            600: '#d97706',
                            700: '#b45309',
                            dark: '#0f172a',
                            darker: '#090d16',
                            card: '#1e293b',
                            cardlight: '#243046',
                        }
                    }
                }
            }
        }
    </script>

    <style>
        .glow-brand {
            box-shadow: 0 0 50px -10px rgba(245, 158, 11, 0.35);
        }
        .glow-card:hover {
            box-shadow: 0 10px 30px -10px rgba(245, 158, 11, 0.2);
        }
        .phone-bezel {
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 10px #1e293b, 0 0 0 12px #334155;
        }
        /* Custom subtle scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #0f172a;
        }
        ::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #f59e0b;
        }
    </style>
</head>
<body class="bg-brand-darker text-slate-100 font-sans antialiased selection:bg-brand-500 selection:text-brand-darker">

    <!-- =========================================================================
         1. TOP STICKY NAVIGATION BAR
    ========================================================================== -->
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-brand-darker/85 border-b border-slate-800/80 transition-all duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-20">
                
                <!-- Logo & Brand Name -->
                <a href="/" class="flex items-center gap-3 group">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-amber-300 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
                        <i class="fa-solid fa-car-side text-brand-darker text-xl"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-display font-bold text-2xl tracking-tight text-white group-hover:text-brand-400 transition-colors">Ride<span class="text-brand-500">4</span>Rent</span>
                            <span class="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">Mindoro</span>
                        </div>
                        <p class="text-[11px] text-slate-400 font-medium">Rental Marketplace App</p>
                    </div>
                </a>

                <!-- Desktop Navigation Links -->
                <nav class="hidden md:flex items-center gap-8">
                    <a href="#features" class="text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors">Features</a>
                    <a href="#how-it-works" class="text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors">How It Works</a>
                    <a href="#app-screens" class="text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors">App Screens</a>
                    <a href="#fleet" class="text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors">Featured Fleet</a>
                    <a href="#hosts" class="text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors">For Hosts</a>
                    <a href="#faq" class="text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors">FAQ</a>
                </nav>

                <!-- Actions: Admin Login & Download APK -->
                <div class="flex items-center gap-3">
                    <a href="{{ route('admin.login') }}" class="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-colors">
                        <i class="fa-solid fa-shield-halved text-brand-400"></i>
                        <span>Admin</span>
                    </a>

                    <a href="#download" onclick="openDownloadModal()" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-brand-darker bg-gradient-to-r from-brand-400 via-brand-500 to-amber-500 hover:from-brand-300 hover:to-brand-400 rounded-xl shadow-md shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        <i class="fa-brands fa-android text-base"></i>
                        <span>Get App</span>
                    </a>
                </div>

            </div>
        </div>
    </header>

    <!-- =========================================================================
         2. HERO SECTION
    ========================================================================== -->
    <section class="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
        <!-- Radial ambient glow background -->
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand-500/10 blur-[130px] pointer-events-none rounded-full"></div>
        <div class="absolute top-1/3 right-10 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none rounded-full"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                
                <!-- Left Column: Copy, Headlines & CTA -->
                <div class="lg:col-span-7 text-center lg:text-left">
                    
                    <!-- Pill Tag -->
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-slate-200 mb-6 shadow-sm">
                        <span class="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
                        <span class="text-brand-400 font-bold">Mindoro's #1</span> Car & Van Rental App
                        <span class="text-slate-500">|</span>
                        <span class="text-slate-300 font-normal">Self-Drive & With Driver</span>
                    </div>

                    <!-- Main Catchy Headline -->
                    <h1 class="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.12] mb-6">
                        Rent the Ride You Deserve. <span class="bg-gradient-to-r from-brand-400 via-amber-300 to-brand-500 bg-clip-text text-transparent">Fast, Verified & Fair.</span>
                    </h1>

                    <!-- Descriptive Subtitle -->
                    <p class="text-base sm:text-lg text-slate-300 font-normal max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-8">
                        Skip tedious paperwork and broker markups. Browse fuel-efficient sedans, rugged 4x4 SUVs, and family passenger vans. Book with direct host chat, digital handover inspection, and secure GCash reservation.
                    </p>

                    <!-- CTA Buttons -->
                    <div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
                        <a href="#download" onclick="openDownloadModal()" class="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 text-base font-bold text-brand-darker bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-300 hover:to-brand-400 rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all">
                            <i class="fa-brands fa-android text-xl"></i>
                            <span>Download Android APK</span>
                        </a>

                        <button onclick="openDownloadModal()" class="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 text-base font-semibold text-white bg-slate-800 hover:bg-slate-700/90 border border-slate-700 rounded-xl hover:-translate-y-0.5 transition-all">
                            <i class="fa-solid fa-qrcode text-brand-400 text-lg"></i>
                            <span>Scan QR Code</span>
                        </button>
                    </div>

                    <!-- Trust Checklist Bar -->
                    <div class="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-300 font-medium">
                        <div class="flex items-center gap-2 justify-center lg:justify-start">
                            <i class="fa-solid fa-circle-check text-brand-400"></i>
                            <span>Verified Local Hosts</span>
                        </div>
                        <div class="flex items-center gap-2 justify-center lg:justify-start">
                            <i class="fa-solid fa-circle-check text-brand-400"></i>
                            <span>Digital Pre-Trip Check</span>
                        </div>
                        <div class="flex items-center gap-2 justify-center lg:justify-start col-span-2 sm:col-span-1">
                            <i class="fa-solid fa-circle-check text-brand-400"></i>
                            <span>Zero Hidden Broker Fees</span>
                        </div>
                    </div>

                </div>

                <!-- Right Column: Interactive Real Smartphone Showcase -->
                <div class="lg:col-span-5 flex flex-col items-center justify-center relative">
                    
                    <!-- Ambient Glow Behind Phone -->
                    <div class="absolute -inset-4 bg-gradient-to-tr from-brand-500/25 via-amber-400/10 to-transparent blur-3xl rounded-[40px] pointer-events-none"></div>

                    <!-- Screen Switcher Tabs -->
                    <div class="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md mb-6 z-20 shadow-xl">
                        <button type="button" onclick="switchHeroScreen(1)" id="btn-screen1" class="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all bg-brand-500 text-brand-darker shadow-md shadow-brand-500/30">
                            <i class="fa-solid fa-car"></i>
                            <span>Vehicle Marketplace</span>
                        </button>
                        <button type="button" onclick="switchHeroScreen(2)" id="btn-screen2" class="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-slate-300 hover:text-white transition-all">
                            <i class="fa-solid fa-robot text-brand-400"></i>
                            <span>AI Assistant</span>
                        </button>
                    </div>

                    <!-- Phone Display Container -->
                    <div class="relative z-10 w-[285px] sm:w-[325px] mx-auto min-h-[580px] sm:min-h-[640px] flex flex-col items-center">
                        
                        <!-- Screen 1: Marketplace & Vehicle Search -->
                        <div id="screen-display-1" class="w-full flex flex-col items-center transition-all duration-300 transform opacity-100 scale-100">
                            <img src="{{ asset('images/screen1.png') }}" 
                                 alt="Ride4Rent Marketplace Screen" 
                                 class="w-full h-auto max-h-[630px] object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.75)] hover:scale-[1.02] transition-transform duration-300">
                            
                            <!-- Screen Caption -->
                            <div class="mt-3 text-center">
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[11px] font-semibold text-brand-400">
                                    <i class="fa-solid fa-bolt text-brand-400"></i> Live Vehicle Catalog & Instant Booking
                                </span>
                            </div>
                        </div>

                        <!-- Screen 2: AI Assistant -->
                        <div id="screen-display-2" class="w-full hidden flex flex-col items-center transition-all duration-300 transform opacity-0 scale-95">
                            <img src="{{ asset('images/screen2.png') }}" 
                                 alt="Ride4Rent AI Assistant Screen" 
                                 class="w-full h-auto max-h-[630px] object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.75)] hover:scale-[1.02] transition-transform duration-300">
                            
                            <!-- Screen Caption -->
                            <div class="mt-3 text-center">
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
                                    <i class="fa-solid fa-sparkles text-emerald-400"></i> 24/7 AI Guide in English & Tagalog
                                </span>
                            </div>
                        </div>

                    </div>

                    <!-- Floating Micro-Badge Left -->
                    <div class="hidden sm:flex absolute -left-10 top-36 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-xl items-center gap-3 z-20 animate-bounce" style="animation-duration: 4s;">
                        <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                            <i class="fa-solid fa-id-card"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-white">Verified KYC</p>
                            <p class="text-[10px] text-slate-400">Driver's License Approved</p>
                        </div>
                    </div>

                    <!-- Floating Micro-Badge Right -->
                    <div class="hidden sm:flex absolute -right-6 bottom-24 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-xl items-center gap-3 z-20 animate-bounce" style="animation-duration: 5s;">
                        <div class="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center text-lg">
                            <i class="fa-solid fa-shield-heart"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-white">₱0 Hidden Charges</p>
                            <p class="text-[10px] text-slate-400">Direct Host Rates</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </section>

    <!-- =========================================================================
         3. KEY METRICS & TRUST STATS BAR
    ========================================================================== -->
    <section class="border-y border-slate-800 bg-brand-dark/60 py-12 relative">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                
                <div class="pt-4 lg:pt-0">
                    <p class="font-display font-bold text-3xl sm:text-4xl text-brand-400 mb-1">{{ $stats['vehicles_count'] }}+</p>
                    <p class="text-xs sm:text-sm font-medium text-slate-300">Verified Rental Units</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">Sedans, 4x4 SUVs, & Vans</p>
                </div>

                <div class="pt-4 lg:pt-0">
                    <p class="font-display font-bold text-3xl sm:text-4xl text-white mb-1">{{ $stats['operators_count'] }}+</p>
                    <p class="text-xs sm:text-sm font-medium text-slate-300">Accredited Local Hosts</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">Permit & Identity Verified</p>
                </div>

                <div class="pt-4 lg:pt-0">
                    <p class="font-display font-bold text-3xl sm:text-4xl text-brand-400 mb-1">{{ $stats['trips_completed'] }}+</p>
                    <p class="text-xs sm:text-sm font-medium text-slate-300">Completed Trips</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">Across Oriental Mindoro</p>
                </div>

                <div class="pt-4 lg:pt-0">
                    <p class="font-display font-bold text-3xl sm:text-4xl text-emerald-400 mb-1">{{ $stats['satisfaction_rate'] }}%</p>
                    <p class="text-xs sm:text-sm font-medium text-slate-300">Satisfaction Score</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">Transparent & Reliable</p>
                </div>

            </div>
        </div>
    </section>

    <!-- =========================================================================
         4. CORE VALUE PROPOSITION / FEATURES
    ========================================================================== -->
    <section id="features" class="py-20 lg:py-28 relative">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="inline-block text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">Engineered for Mobility</span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">Everything You Need for a Seamless Rental Experience</h2>
                <p class="text-slate-400 text-sm sm:text-base mt-4">We removed the headaches of traditional car rentals: unverified cars, shady contracts, and lost deposits.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <!-- Feature 1 -->
                <div class="bg-brand-card p-6 rounded-2xl border border-slate-700/80 glow-card transition-all group">
                    <div class="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-car-burst"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">Zero Broker Markups</h3>
                    <p class="text-slate-400 text-xs sm:text-sm leading-relaxed">Book directly from accredited vehicle hosts. No middlemen, no unexpected add-on costs, and no inflated prices.</p>
                </div>

                <!-- Feature 2 -->
                <div class="bg-brand-card p-6 rounded-2xl border border-slate-700/80 glow-card transition-all group">
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-clipboard-check"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">Digital Handover Inspection</h3>
                    <p class="text-slate-400 text-xs sm:text-sm leading-relaxed">Pre-trip walkaround photos, odometer readings, and fuel gauge logs are recorded in the app, protecting both renter and host.</p>
                </div>

                <!-- Feature 3 -->
                <div class="bg-brand-card p-6 rounded-2xl border border-slate-700/80 glow-card transition-all group">
                    <div class="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-comments"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">Host Chat & In-App Voice Call</h3>
                    <p class="text-slate-400 text-xs sm:text-sm leading-relaxed">Coordinate pickup spot, flight arrival, or road directions directly with your host through fast real-time messaging and calls.</p>
                </div>

                <!-- Feature 4 -->
                <div class="bg-brand-card p-6 rounded-2xl border border-slate-700/80 glow-card transition-all group">
                    <div class="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-wallet"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">GCash & Maya Fast Deposits</h3>
                    <p class="text-slate-400 text-xs sm:text-sm leading-relaxed">Lock your desired vehicle schedule instantly with automated receipt verification and non-cash deposit options.</p>
                </div>

                <!-- Feature 5 -->
                <div class="bg-brand-card p-6 rounded-2xl border border-slate-700/80 glow-card transition-all group">
                    <div class="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-id-card-clip"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">Multi-Vehicle & 2nd Driver</h3>
                    <p class="text-slate-400 text-xs sm:text-sm leading-relaxed">Planning a family road trip or company event? Reserve multiple vehicles at once and designate authorized secondary drivers in minutes.</p>
                </div>

                <!-- Feature 6 -->
                <div class="bg-brand-card p-6 rounded-2xl border border-slate-700/80 glow-card transition-all group">
                    <div class="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-rose-300 transition-colors">Strict Host Accreditation</h3>
                    <p class="text-slate-400 text-xs sm:text-sm leading-relaxed">Every host must undergo LTO, DTI/SEC, and business permit validation by our Admin team before their fleet can be listed.</p>
                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         5. HOW IT WORKS (4 SIMPLE STEPS)
    ========================================================================== -->
    <section id="how-it-works" class="py-20 bg-slate-900/50 border-y border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="inline-block text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">4 Simple Steps</span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">How Ride4Rent Works</h2>
                <p class="text-slate-400 text-sm sm:text-base mt-4">From reservation to ignition in minutes right from your smartphone.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                
                <!-- Step 1 -->
                <div class="bg-brand-card/90 border border-slate-800 p-6 rounded-2xl relative">
                    <div class="w-10 h-10 rounded-full bg-brand-500 text-brand-darker font-extrabold flex items-center justify-center text-base mb-4 shadow-md shadow-brand-500/30">
                        1
                    </div>
                    <h4 class="text-base font-bold text-white mb-2">Browse the Fleet</h4>
                    <p class="text-xs text-slate-400 leading-relaxed">Search vehicles by date, location, transmission, fuel, and seating capacity in Calapan & Oriental Mindoro.</p>
                </div>

                <!-- Step 2 -->
                <div class="bg-brand-card/90 border border-slate-800 p-6 rounded-2xl relative">
                    <div class="w-10 h-10 rounded-full bg-brand-500 text-brand-darker font-extrabold flex items-center justify-center text-base mb-4 shadow-md shadow-brand-500/30">
                        2
                    </div>
                    <h4 class="text-base font-bold text-white mb-2">Host Verification</h4>
                    <p class="text-xs text-slate-400 leading-relaxed">Submit your booking request with your driver's license. The host reviews and approves your reservation promptly.</p>
                </div>

                <!-- Step 3 -->
                <div class="bg-brand-card/90 border border-slate-800 p-6 rounded-2xl relative">
                    <div class="w-10 h-10 rounded-full bg-brand-500 text-brand-darker font-extrabold flex items-center justify-center text-base mb-4 shadow-md shadow-brand-500/30">
                        3
                    </div>
                    <h4 class="text-base font-bold text-white mb-2">Lock Deposit</h4>
                    <p class="text-xs text-slate-400 leading-relaxed">Settle the reservation fee via GCash or Maya to lock the vehicle and prevent competing bookings.</p>
                </div>

                <!-- Step 4 -->
                <div class="bg-brand-card/90 border border-slate-800 p-6 rounded-2xl relative">
                    <div class="w-10 h-10 rounded-full bg-brand-500 text-brand-darker font-extrabold flex items-center justify-center text-base mb-4 shadow-md shadow-brand-500/30">
                        4
                    </div>
                    <h4 class="text-base font-bold text-white mb-2">Inspect & Drive</h4>
                    <p class="text-xs text-slate-400 leading-relaxed">Meet your host at the pickup spot, complete the digital walkaround inspection, take the keys, and enjoy the trip!</p>
                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         5.5 APP SCREENSHOTS & IN-APP EXPERIENCE
    ========================================================================== -->
    <section id="app-screens" class="py-20 lg:py-28 relative bg-brand-dark/40 border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="inline-block text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">Mobile App Showcase</span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">Crafted for Simplicity, Speed & Safety</h2>
                <p class="text-slate-400 text-sm sm:text-base mt-4">Take a look inside the Ride4Rent Android app. Clean design, instant vehicle booking, and 24/7 AI-driven customer support.</p>
            </div>

            <!-- App Screens Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch">
                
                <!-- Screen 1 Feature Card -->
                <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 group hover:border-brand-500/40 transition-all duration-300">
                    <div class="w-full sm:w-[210px] flex-shrink-0 flex justify-center">
                        <img src="{{ asset('images/screen1.png') }}" 
                             alt="Ride4Rent Marketplace" 
                             class="w-[190px] sm:w-[210px] h-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300">
                    </div>
                    <div class="flex-1 space-y-4 text-left">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                            <i class="fa-solid fa-compass"></i> Marketplace & Discovery
                        </div>
                        <h3 class="font-display font-bold text-xl sm:text-2xl text-white">Find Your Next Ride in Seconds</h3>
                        <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Search scooters, sedans, 4x4 SUVs, and passenger vans near you in Oriental Mindoro. View high-demand ratings, host accreditations, and transparent daily rates starting at ₱430/day.
                        </p>
                        <ul class="space-y-2 text-xs text-slate-400">
                            <li class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-brand-400"></i> 20% OFF first-time booking promotion
                            </li>
                            <li class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-brand-400"></i> Instant view of vehicle specs & fuel type
                            </li>
                            <li class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-brand-400"></i> Direct booking without intermediary markups
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Screen 2 Feature Card -->
                <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 group hover:border-emerald-500/40 transition-all duration-300">
                    <div class="w-full sm:w-[210px] flex-shrink-0 flex justify-center">
                        <img src="{{ asset('images/screen2.png') }}" 
                             alt="Ride4Rent AI Assistant" 
                             class="w-[190px] sm:w-[210px] h-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300">
                    </div>
                    <div class="flex-1 space-y-4 text-left">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                            <i class="fa-solid fa-robot"></i> 24/7 Smart AI Guide
                        </div>
                        <h3 class="font-display font-bold text-xl sm:text-2xl text-white">Bilingual AI Rental Assistance</h3>
                        <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Have questions before booking? Chat with the built-in Ride4Rent AI Assistant anytime in English or Tagalog. Get quick guidance on rental requirements, payment procedures, and policies.
                        </p>
                        <ul class="space-y-2 text-xs text-slate-400">
                            <li class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-400"></i> Instant answers on driver's license rules
                            </li>
                            <li class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-400"></i> Step-by-step reservation instructions
                            </li>
                            <li class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-400"></i> Zero waiting time — always online
                            </li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    </section>

    <!-- =========================================================================
         6. FEATURED FLEET SHOWCASE
    ========================================================================== -->
    <section id="fleet" class="py-20 lg:py-28 relative">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-12">
                <div>
                    <span class="inline-block text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">Live Fleet</span>
                    <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">Popular Vehicles Ready to Rent</h2>
                    <p class="text-slate-400 text-sm mt-2">Available right now on the Ride4Rent mobile app.</p>
                </div>
                <div class="mt-4 md:mt-0">
                    <button onclick="openDownloadModal()" class="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-brand-400 font-bold text-xs rounded-xl border border-slate-700 transition-colors">
                        <span>See All in Mobile App</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>

            <!-- Vehicle Grid (Pulls from DB or Demo Fallbacks) -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                @if(isset($featuredVehicles) && $featuredVehicles->count() > 0)
                    @foreach($featuredVehicles as $v)
                        <div class="bg-brand-card rounded-2xl border border-slate-700/80 overflow-hidden glow-card transition-all flex flex-col">
                            
                            <div class="relative h-48 bg-slate-800 overflow-hidden">
                                <img src="{{ $v->image_url ?: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60' }}" 
                                     alt="{{ $v->name }}" 
                                     class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                                
                                <div class="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-brand-400 border border-slate-800">
                                    {{ $v->vehicleType?->name ?? 'Standard' }}
                                </div>
                                <div class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-amber-300 flex items-center gap-1 border border-slate-800">
                                    <i class="fa-solid fa-star text-[10px]"></i> {{ number_format($v->rating ?? 5.0, 1) }}
                                </div>
                            </div>

                            <div class="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                    <div class="flex items-center justify-between gap-2 mb-1">
                                        <h4 class="font-bold text-white text-base truncate">{{ $v->name }}</h4>
                                        <span class="font-extrabold text-brand-400 text-sm whitespace-nowrap">₱{{ number_format((float)$v->daily_rate, 2) }}<span class="text-[10px] font-normal text-slate-400">/day</span></span>
                                    </div>
                                    <p class="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                                        <i class="fa-solid fa-location-dot text-brand-500 text-xs"></i>
                                        <span class="truncate">{{ $v->pickup_address ?: 'Calapan City, Oriental Mindoro' }}</span>
                                    </p>

                                    <!-- Spec Badges -->
                                    <div class="flex items-center gap-2 text-[11px] text-slate-300 font-medium mb-4 flex-wrap">
                                        <span class="px-2.5 py-1 bg-slate-800/80 rounded-md border border-slate-700/60">
                                            <i class="fa-solid fa-users text-brand-400 mr-1"></i>{{ $v->seating_capacity ?: 5 }} Seats
                                        </span>
                                        <span class="px-2.5 py-1 bg-slate-800/80 rounded-md border border-slate-700/60">
                                            <i class="fa-solid fa-gear text-brand-400 mr-1"></i>{{ $v->transmissionType?->name ?? 'Auto' }}
                                        </span>
                                        <span class="px-2.5 py-1 bg-slate-800/80 rounded-md border border-slate-700/60">
                                            <i class="fa-solid fa-gas-pump text-brand-400 mr-1"></i>{{ $v->fuelType?->name ?? 'Diesel' }}
                                        </span>
                                    </div>
                                </div>

                                <button onclick="openDownloadModal()" class="w-full py-2.5 bg-slate-800 hover:bg-brand-500 hover:text-brand-darker text-white font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2">
                                    <i class="fa-solid fa-calendar-plus"></i>
                                    <span>Rent on Mobile App</span>
                                </button>
                            </div>

                        </div>
                    @endforeach
                @else
                    <!-- Fallback High-Quality Demo Cards if DB is Empty -->
                    <div class="bg-brand-card rounded-2xl border border-slate-700/80 overflow-hidden glow-card transition-all flex flex-col">
                        <div class="relative h-48 bg-slate-800 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60" alt="Toyota Fortuner" class="w-full h-full object-cover">
                            <div class="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 text-[11px] font-bold text-brand-400">Mid-size SUV</div>
                            <div class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-slate-950/80 text-[11px] font-bold text-amber-300 flex items-center gap-1"><i class="fa-solid fa-star text-[10px]"></i> 4.9</div>
                        </div>
                        <div class="p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <h4 class="font-bold text-white text-base">Toyota Fortuner 4x4</h4>
                                    <span class="font-extrabold text-brand-400 text-sm">₱2,800/day</span>
                                </div>
                                <p class="text-xs text-slate-400 mb-4"><i class="fa-solid fa-location-dot text-brand-500 mr-1"></i> Calapan City</p>
                                <div class="flex gap-2 text-[11px] text-slate-300 font-medium mb-4">
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">7 Seats</span>
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">Automatic</span>
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">Diesel</span>
                                </div>
                            </div>
                            <button onclick="openDownloadModal()" class="w-full py-2.5 bg-slate-800 hover:bg-brand-500 hover:text-brand-darker text-white font-bold text-xs rounded-xl transition-all">Rent on Mobile App</button>
                        </div>
                    </div>

                    <div class="bg-brand-card rounded-2xl border border-slate-700/80 overflow-hidden glow-card transition-all flex flex-col">
                        <div class="relative h-48 bg-slate-800 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&auto=format&fit=crop&q=60" alt="Toyota Vios" class="w-full h-full object-cover">
                            <div class="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 text-[11px] font-bold text-brand-400">Sedan</div>
                            <div class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-slate-950/80 text-[11px] font-bold text-amber-300 flex items-center gap-1"><i class="fa-solid fa-star text-[10px]"></i> 5.0</div>
                        </div>
                        <div class="p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <h4 class="font-bold text-white text-base">Toyota Vios 1.5G</h4>
                                    <span class="font-extrabold text-brand-400 text-sm">₱1,800/day</span>
                                </div>
                                <p class="text-xs text-slate-400 mb-4"><i class="fa-solid fa-location-dot text-brand-500 mr-1"></i> Puerto Galera / Calapan</p>
                                <div class="flex gap-2 text-[11px] text-slate-300 font-medium mb-4">
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">5 Seats</span>
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">Automatic</span>
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">Gasoline</span>
                                </div>
                            </div>
                            <button onclick="openDownloadModal()" class="w-full py-2.5 bg-slate-800 hover:bg-brand-500 hover:text-brand-darker text-white font-bold text-xs rounded-xl transition-all">Rent on Mobile App</button>
                        </div>
                    </div>

                    <div class="bg-brand-card rounded-2xl border border-slate-700/80 overflow-hidden glow-card transition-all flex flex-col">
                        <div class="relative h-48 bg-slate-800 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60" alt="Nissan Urvan" class="w-full h-full object-cover">
                            <div class="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 text-[11px] font-bold text-brand-400">Passenger Van</div>
                            <div class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-slate-950/80 text-[11px] font-bold text-amber-300 flex items-center gap-1"><i class="fa-solid fa-star text-[10px]"></i> 4.9</div>
                        </div>
                        <div class="p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <h4 class="font-bold text-white text-base">Nissan NV350 Urvan</h4>
                                    <span class="font-extrabold text-brand-400 text-sm">₱3,500/day</span>
                                </div>
                                <p class="text-xs text-slate-400 mb-4"><i class="fa-solid fa-location-dot text-brand-500 mr-1"></i> Calapan Hub</p>
                                <div class="flex gap-2 text-[11px] text-slate-300 font-medium mb-4">
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">15 Seats</span>
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">Manual</span>
                                    <span class="px-2.5 py-1 bg-slate-800 rounded-md">Diesel</span>
                                </div>
                            </div>
                            <button onclick="openDownloadModal()" class="w-full py-2.5 bg-slate-800 hover:bg-brand-500 hover:text-brand-darker text-white font-bold text-xs rounded-xl transition-all">Rent on Mobile App</button>
                        </div>
                    </div>
                @endif

            </div>

        </div>
    </section>

    <!-- =========================================================================
         7. FOR VEHICLE HOSTS & OPERATORS ("MONETIZE YOUR CAR")
    ========================================================================== -->
    <section id="hosts" class="py-20 lg:py-24 bg-gradient-to-b from-slate-900 to-brand-darker border-t border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-gradient-to-tr from-brand-card via-slate-800 to-slate-900 rounded-3xl border border-slate-700/80 p-8 sm:p-12 lg:p-16 relative overflow-hidden">
                
                <div class="absolute -right-20 -bottom-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                    <div class="lg:col-span-8">
                        <span class="inline-block text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 mb-4">Host Partnership Program</span>
                        <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-4">Turn Your Idle Vehicles Into Reliable Monthly Income</h2>
                        <p class="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
                            Have extra cars or run an existing rental fleet? List on Ride4Rent. Keep 90% of your rental gross, get full schedule control, and enjoy built-in host protection including renter license verification and no-show fee protection.
                        </p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-200 mb-8 font-medium">
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-circle-check text-brand-400 text-base"></i>
                                <span>Low 10% platform commission fee</span>
                            </div>
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-circle-check text-brand-400 text-base"></i>
                                <span>48-Hour end-of-month remittance grace</span>
                            </div>
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-circle-check text-brand-400 text-base"></i>
                                <span>No-Show protection compensation</span>
                            </div>
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-circle-check text-brand-400 text-base"></i>
                                <span>Automated monthly revenue tracking</span>
                            </div>
                        </div>

                        <button onclick="openDownloadModal()" class="inline-flex items-center gap-3 px-7 py-3.5 bg-brand-500 hover:bg-brand-400 text-brand-darker font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:scale-[1.02] transition-all">
                            <i class="fa-solid fa-car"></i>
                            <span>Register as Host in App</span>
                        </button>
                    </div>

                    <div class="lg:col-span-4 flex justify-center">
                        <div class="bg-slate-950/80 backdrop-blur-md p-6 rounded-2xl border border-slate-700/80 text-center max-w-xs w-full shadow-xl">
                            <div class="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/40 text-brand-400 flex items-center justify-center text-3xl mx-auto mb-4">
                                <i class="fa-solid fa-coins"></i>
                            </div>
                            <h4 class="text-xl font-extrabold text-white mb-1">90% Net Earnings</h4>
                            <p class="text-xs text-slate-400 mb-4">Lowest platform fee in Mindoro</p>
                            <div class="p-3 bg-slate-900 rounded-xl text-left text-xs border border-slate-800 space-y-1.5">
                                <div class="flex justify-between text-slate-400">
                                    <span>Average Host Revenue:</span>
                                    <span class="text-white font-bold">₱45,000/mo</span>
                                </div>
                                <div class="flex justify-between text-slate-400">
                                    <span>Host Payout Timing:</span>
                                    <span class="text-brand-400 font-bold">Direct to GCash</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </section>

    <!-- =========================================================================
         8. DEDICATED APP DOWNLOAD & QR SCAN SECTION
    ========================================================================== -->
    <section id="download" class="py-20 lg:py-28 relative">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-gradient-to-b from-brand-card to-slate-900 border border-brand-500/30 rounded-3xl p-8 sm:p-12 text-center glow-brand relative overflow-hidden">
                
                <span class="inline-block text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 mb-4">Instant Installation</span>
                <h2 class="font-display font-extrabold text-3xl sm:text-5xl text-white tracking-tight mb-4">Get Ride4Rent on Your Phone Today</h2>
                <p class="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-10">Scan the QR code with your mobile camera or click the direct APK download button to get started immediately.</p>

                <div class="flex flex-col md:flex-row items-center justify-center gap-10 max-w-xl mx-auto mb-10">
                    
                    <!-- QR Code Card -->
                    <div class="bg-white p-4 rounded-2xl shadow-xl border-4 border-brand-500/40">
                        <!-- Dynamic QR code pointing to current domain's APK download -->
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={{ urlencode(url('/download-app')) }}&color=0f172a&bgcolor=ffffff" 
                             alt="Scan QR to Download" 
                             class="w-44 h-44 object-contain">
                        <p class="text-[11px] font-bold text-slate-800 mt-2">Scan with Smartphone</p>
                    </div>

                    <!-- Direct Download Details -->
                    <div class="text-center md:text-left space-y-4">
                        <div class="space-y-1">
                            <h4 class="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
                                <i class="fa-brands fa-android text-brand-400 text-xl"></i>
                                <span>Android Application</span>
                            </h4>
                            <p class="text-xs text-slate-400">Compatible with Android 8.0 & above</p>
                        </div>

                        <a href="{{ route('app.download') }}" class="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-300 hover:to-brand-400 text-brand-darker font-extrabold text-sm rounded-xl shadow-lg shadow-brand-500/30 hover:scale-[1.02] transition-all">
                            <i class="fa-solid fa-download text-lg"></i>
                            <span>Direct Download APK</span>
                        </a>

                        <div class="text-[11px] text-slate-400 space-y-1">
                            <p><i class="fa-solid fa-check text-emerald-400 mr-1"></i> Fast & Virus-free installation</p>
                            <p><i class="fa-solid fa-check text-emerald-400 mr-1"></i> Direct local server updates</p>
                        </div>
                    </div>

                </div>

                <!-- 3 Easy Install Steps -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-800 text-left text-xs">
                    <div class="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                        <span class="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0">1</span>
                        <p class="text-slate-300">Download the <strong>Ride4Rent.apk</strong> file to your device.</p>
                    </div>
                    <div class="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                        <span class="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0">2</span>
                        <p class="text-slate-300">Tap the notification and enable <strong>Allow from this source</strong> if asked.</p>
                    </div>
                    <div class="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                        <span class="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0">3</span>
                        <p class="text-slate-300">Open Ride4Rent, create your account, and start booking!</p>
                    </div>
                </div>

            </div>
        </div>
    </section>

    <!-- =========================================================================
         9. FREQUENTLY ASKED QUESTIONS (FAQ)
    ========================================================================== -->
    <section id="faq" class="py-20 border-t border-slate-800 bg-slate-900/40">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="text-center mb-16">
                <span class="inline-block text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">Got Questions?</span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">Frequently Asked Questions</h2>
            </div>

            <div class="space-y-4">
                
                <!-- Q1 -->
                <div class="bg-brand-card p-5 rounded-2xl border border-slate-800">
                    <h4 class="font-bold text-white text-base mb-2">What documents are required to rent a vehicle?</h4>
                    <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">Renters must provide a valid Philippine or International Driver's License (front & back) uploaded directly in the app. Your host reviews and validates your license before confirming the rental.</p>
                </div>

                <!-- Q2 -->
                <div class="bg-brand-card p-5 rounded-2xl border border-slate-800">
                    <h4 class="font-bold text-white text-base mb-2">How does the reservation fee work?</h4>
                    <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">To lock your booking dates and prevent other renters from taking the vehicle, you settle a partial reservation fee via GCash, Maya, or cash. This fee is automatically deducted from your total rental bill.</p>
                </div>

                <!-- Q3 -->
                <div class="bg-brand-card p-5 rounded-2xl border border-slate-800">
                    <h4 class="font-bold text-white text-base mb-2">What happens if I'm running late or can't make it?</h4>
                    <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">Always use the in-app chat to inform your host immediately. If a renter fails to communicate and does not show up within the agreed pickup buffer, the booking is declared a No-Show, and the reservation fee is forfeited to compensate the host for reserved downtime.</p>
                </div>

                <!-- Q4 -->
                <div class="bg-brand-card p-5 rounded-2xl border border-slate-800">
                    <h4 class="font-bold text-white text-base mb-2">Can I rent multiple vehicles at once?</h4>
                    <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">Yes! If you are planning an event, wedding, or team trip and need multiple vehicles, you simply designate an authorized secondary licensed driver during the booking process.</p>
                </div>

                <!-- Q5 -->
                <div class="bg-brand-card p-5 rounded-2xl border border-slate-800">
                    <h4 class="font-bold text-white text-base mb-2">How do vehicle hosts get paid?</h4>
                    <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">Hosts collect rental payments directly from renters via their registered GCash, Maya, or cash. At the end of every calendar month, hosts remit the fair 10% platform fee to Ride4Rent with an automated 48-hour grace window.</p>
                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         10. FOOTER
    ========================================================================== -->
    <footer class="bg-slate-950 border-t border-slate-800/80 py-12 text-slate-400 text-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col md:flex-row items-center justify-between gap-6">
                
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-brand-500 text-brand-darker flex items-center justify-center font-bold text-sm">
                        <i class="fa-solid fa-car-side"></i>
                    </div>
                    <div>
                        <span class="font-display font-bold text-base text-white">Ride<span class="text-brand-500">4</span>Rent</span>
                        <p class="text-[11px] text-slate-500">Car & Van Rental Marketplace</p>
                    </div>
                </div>

                <div class="flex items-center gap-6 text-xs font-medium text-slate-400">
                    <a href="#features" class="hover:text-white transition-colors">Features</a>
                    <a href="#how-it-works" class="hover:text-white transition-colors">How It Works</a>
                    <a href="#fleet" class="hover:text-white transition-colors">Fleet</a>
                    <a href="#hosts" class="hover:text-white transition-colors">For Hosts</a>
                    <a href="{{ route('admin.login') }}" class="text-brand-400 hover:text-brand-300 font-bold transition-colors">Admin Console</a>
                </div>

                <p class="text-[11px] text-slate-500">
                    &copy; 2026 Ride4Rent. All rights reserved. Calapan City, Oriental Mindoro.
                </p>

            </div>
        </div>
    </footer>

    <!-- =========================================================================
         11. DOWNLOAD MODAL (QR CODE & APK LINK)
    ========================================================================== -->
    <div id="downloadModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md hidden transition-opacity">
        <div class="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-center">
            
            <button onclick="closeDownloadModal()" class="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center text-2xl mx-auto mb-3">
                <i class="fa-brands fa-android"></i>
            </div>

            <h3 class="font-display font-bold text-2xl text-white mb-1">Get Ride4Rent App</h3>
            <p class="text-xs text-slate-400 mb-6">Scan the QR code below or click the button to download the APK file directly to your Android device.</p>

            <div class="bg-white p-3 rounded-2xl inline-block shadow-md border-2 border-brand-500/30 mb-6">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={{ urlencode(url('/download-app')) }}&color=0f172a&bgcolor=ffffff" 
                     alt="Download QR" 
                     class="w-40 h-40 object-contain">
            </div>

            <a href="{{ route('app.download') }}" class="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-500 hover:bg-brand-400 text-brand-darker font-extrabold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition-all">
                <i class="fa-solid fa-download"></i>
                <span>Download APK File Now</span>
            </a>

            <p class="text-[10px] text-slate-500 mt-4">
                Version 1.0.0 (Release) • Requires Android 8.0+
            </p>
        </div>
    </div>

    <!-- Script for Modal Toggle & Hero Screen Switcher -->
    <script>
        function openDownloadModal() {
            const modal = document.getElementById('downloadModal');
            modal.classList.remove('hidden');
        }

        function closeDownloadModal() {
            const modal = document.getElementById('downloadModal');
            modal.classList.add('hidden');
        }

        function switchHeroScreen(screenNum) {
            const s1 = document.getElementById('screen-display-1');
            const s2 = document.getElementById('screen-display-2');
            const b1 = document.getElementById('btn-screen1');
            const b2 = document.getElementById('btn-screen2');

            if (!s1 || !s2 || !b1 || !b2) return;

            if (screenNum === 1) {
                s2.classList.add('hidden', 'opacity-0', 'scale-95');
                s2.classList.remove('opacity-100', 'scale-100');
                s1.classList.remove('hidden');
                setTimeout(() => {
                    s1.classList.remove('opacity-0', 'scale-95');
                    s1.classList.add('opacity-100', 'scale-100');
                }, 20);

                b1.className = 'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all bg-brand-500 text-brand-darker shadow-md shadow-brand-500/30';
                b2.className = 'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-slate-300 hover:text-white transition-all';
            } else {
                s1.classList.add('hidden', 'opacity-0', 'scale-95');
                s1.classList.remove('opacity-100', 'scale-100');
                s2.classList.remove('hidden');
                setTimeout(() => {
                    s2.classList.remove('opacity-0', 'scale-95');
                    s2.classList.add('opacity-100', 'scale-100');
                }, 20);

                b2.className = 'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all bg-brand-500 text-brand-darker shadow-md shadow-brand-500/30';
                b1.className = 'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-slate-300 hover:text-white transition-all';
            }
        }

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeDownloadModal();
        });

        // Close on clicking backdrop
        document.getElementById('downloadModal').addEventListener('click', function(e) {
            if (e.target === this) closeDownloadModal();
        });
    </script>

</body>
</html>
