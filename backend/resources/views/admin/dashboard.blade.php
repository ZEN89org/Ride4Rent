<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Operator review | Ride4Rent</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-[#f3f5f2] text-[#17231d] antialiased">
    <header class="border-b border-[#dfe5df] bg-[#fffdf8]">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
            <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-[#e1744d]">Ride4Rent admin</p>
                <h1 class="mt-1 text-2xl font-semibold tracking-tight">Operator review</h1>
            </div>
            <form method="POST" action="{{ route('admin.logout') }}">
                @csrf
                <button class="rounded-lg border border-[#cbd5cc] px-4 py-2 text-sm font-semibold text-[#365047] transition hover:border-[#e1744d] hover:text-[#c95f3c]" type="submit">Sign out</button>
            </form>
        </div>
    </header>

    <main class="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        @if (session('status'))
            <div class="mb-6 rounded-xl border border-[#b7d4bc] bg-[#eaf5eb] px-4 py-3 text-sm text-[#27633a]">{{ session('status') }}</div>
        @endif

        <div class="flex items-end justify-between gap-4">
            <div>
                <p class="text-sm text-[#68736c]">Applications awaiting a decision</p>
                <p class="mt-2 text-4xl font-semibold tracking-tight">{{ $operators->count() }}</p>
            </div>
            <span class="rounded-full bg-[#f7dfbd] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#89552c]">Pending</span>
        </div>

        <section class="mt-8 space-y-5">
            @forelse ($operators as $operator)
                <article class="overflow-hidden rounded-2xl border border-[#dfe5df] bg-[#fffdf8] shadow-sm">
                    <div class="grid gap-8 p-6 lg:grid-cols-[1fr_1.1fr_0.8fr] lg:p-8">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#e1744d]">Applicant</p>
                            <h2 class="mt-3 text-2xl font-semibold">{{ trim($operator->first_name . ' ' . $operator->last_name) }}</h2>
                            <dl class="mt-5 space-y-2 text-sm text-[#68736c]">
                                <div><dt class="inline font-medium text-[#365047]">Email:</dt> <dd class="inline">{{ $operator->email }}</dd></div>
                                <div><dt class="inline font-medium text-[#365047]">Mobile:</dt> <dd class="inline">{{ $operator->mobile_number ?: 'Not provided' }}</dd></div>
                                <div><dt class="inline font-medium text-[#365047]">Submitted:</dt> <dd class="inline">{{ $operator->created_at?->format('M j, Y') }}</dd></div>
                            </dl>
                        </div>

                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#e1744d]">Business</p>
                            <h3 class="mt-3 text-lg font-semibold">{{ $operator->operatorProfile?->business_name }}</h3>
                            <p class="mt-2 text-sm leading-6 text-[#68736c]">{{ $operator->operatorProfile?->street_address }}, {{ $operator->operatorProfile?->barangay }}, {{ $operator->operatorProfile?->municipality }}</p>
                            <p class="mt-3 text-sm text-[#68736c]">{{ $operator->operatorProfile?->business_email }}</p>
                            <div class="mt-5 flex flex-wrap gap-2 text-xs text-[#365047]">
                                @foreach (['government_id_front' => 'ID front', 'government_id_back' => 'ID back', 'business_permit_front' => 'Permit front', 'business_permit_back' => 'Permit back'] as $field => $label)
                                    @if ($operator->operatorProfile?->{$field})
                                        <a class="rounded-md bg-[#e8eee8] px-2.5 py-1.5 font-medium hover:bg-[#d7e3d8]" href="{{ asset('storage/' . $operator->operatorProfile->{$field}) }}" target="_blank" rel="noreferrer">{{ $label }}</a>
                                    @endif
                                @endforeach
                            </div>
                        </div>

                        <div class="flex flex-col justify-end gap-3 lg:justify-center">
                            <form method="POST" action="{{ route('admin.operators.approve', $operator) }}">
                                @csrf
                                <button class="w-full rounded-xl bg-[#28734b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#205d3d]" type="submit">Approve operator</button>
                            </form>
                            <form method="POST" action="{{ route('admin.operators.reject', $operator) }}" class="space-y-2">
                                @csrf
                                <label class="sr-only" for="rejection_reason_{{ $operator->id }}">Rejection reason</label>
                                <textarea class="min-h-24 w-full resize-y rounded-xl border border-[#d8ded8] bg-white px-3 py-2 text-sm outline-none focus:border-[#e1744d] focus:ring-2 focus:ring-[#e1744d]/20" id="rejection_reason_{{ $operator->id }}" name="rejection_reason" placeholder="Reason for rejection" required></textarea>
                                <button class="w-full rounded-xl border border-[#d98b7c] px-4 py-3 text-sm font-semibold text-[#a44939] transition hover:bg-[#fff0ed]" type="submit">Reject application</button>
                            </form>
                        </div>
                    </div>
                </article>
            @empty
                <div class="rounded-2xl border border-dashed border-[#cbd5cc] bg-[#fffdf8] px-6 py-16 text-center">
                    <p class="text-lg font-semibold">No pending applications</p>
                    <p class="mt-2 text-sm text-[#68736c]">New operator applications will appear here.</p>
                </div>
            @endforelse
        </section>
    </main>
</body>
</html>
