@extends('emails.layout')

@section('email_title', 'Pendaftaran Dikonfirmasi – ' . $event->title)
@section('header_icon', '✅')

@section('content')
    <h1 class="greeting">Selamat, {{ $user->name ?? 'Ikhwan' }}!</h1>
    <p class="lead-text">
        Pendaftaranmu pada acara di bawah ini telah <strong>dikonfirmasi</strong>.
        Kami sangat senang menyambutmu. Sampai jumpa di acara! 🎉
    </p>

    {{-- CONFIRMATION BADGE --}}
    <div class="success-box" style="text-align:center;padding:20px;">
        <p style="font-size:36px;margin:0 0 8px;">✅</p>
        <p style="font-family:Georgia,serif;font-size:18px;font-weight:bold;color:#2D4228;margin:0 0 4px;">
            Keikutsertaan Dikonfirmasi
        </p>
        <p style="font-size:13px;color:#3D5936;margin:0;">ID RSVP: #{{ $rsvp->id }}</p>
    </div>

    {{-- EVENT CARD --}}
    <div class="event-card">
        <p class="event-title">{{ $event->title }}</p>
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td class="event-meta-row" style="font-size:13px;color:#49454F;padding:4px 0;">
                    <span style="font-weight:bold;color:#3D5936;display:inline-block;width:80px;">📅 Tanggal</span>
                    {{ \Carbon\Carbon::parse($event->event_date)->translatedFormat('l, d F Y') }}
                </td>
            </tr>
            <tr>
                <td class="event-meta-row" style="font-size:13px;color:#49454F;padding:4px 0;">
                    <span style="font-weight:bold;color:#3D5936;display:inline-block;width:80px;">🕐 Waktu</span>
                    {{ \Carbon\Carbon::parse($event->event_date)->format('H:i') }} WIB
                </td>
            </tr>
            @if($event->location)
            <tr>
                <td class="event-meta-row" style="font-size:13px;color:#49454F;padding:4px 0;">
                    <span style="font-weight:bold;color:#3D5936;display:inline-block;width:80px;">📍 Lokasi</span>
                    {{ $event->location }}
                </td>
            </tr>
            @endif
            @if($rsvp->package)
            <tr>
                <td class="event-meta-row" style="font-size:13px;color:#49454F;padding:4px 0;">
                    <span style="font-weight:bold;color:#3D5936;display:inline-block;width:80px;">🎟️ Paket</span>
                    {{ $rsvp->package->name }}
                </td>
            </tr>
            @endif
        </table>
    </div>

    {{-- ADDONS INCLUDED --}}
    @if(!empty($rsvp->add_ons_snapshot))
    <p style="font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#2D4228;margin:0 0 10px;">
        Rincian Item
    </p>
    <table class="info-table" cellpadding="0" cellspacing="0">
        @foreach($rsvp->add_ons_snapshot as $addon)
        <tr>
            <td>
                {{ $addon['name'] }} &times; {{ $addon['quantity'] }}
                @if($addon['is_included'] ?? false)
                    <span style="font-size:11px;background:#EFF4EE;color:#3D5936;padding:2px 6px;border-radius:4px;margin-left:4px;">Termasuk</span>
                @endif
            </td>
            <td align="right" style="color:{{ ($addon['is_included'] ?? false) ? '#3D5936' : '#1C1B1F' }};">
                {{ ($addon['is_included'] ?? false) ? 'Gratis' : 'Rp '.number_format($addon['total'], 0, ',', '.') }}
            </td>
        </tr>
        @endforeach
        @if((float)$rsvp->total_amount > 0)
        <tr class="total-row">
            <td>Total Dibayar</td>
            <td align="right" style="color:#3D5936;">Rp {{ number_format($rsvp->total_amount, 0, ',', '.') }}</td>
        </tr>
        @endif
    </table>
    @endif

    {{-- CALENDAR INVITE NOTICE --}}
    <div class="notice-box" style="background:#EFF4EE;border-color:#A8C5A0;color:#2D4228;">
        📅 <strong>Calendar Invitation:</strong> Kami telah melampirkan undangan kalender (.ics) pada email ini.
        Buka attachment tersebut untuk menambahkan acara ke Google Calendar, Apple Calendar, atau Outlook-mu.
    </div>

    {{-- CTA --}}
    <div class="cta-wrapper">
        <a href="{{ config('app.url') }}/events/{{ $event->slug }}" class="cta-button">
            Lihat Detail Acara →
        </a>
    </div>

    <div class="divider"></div>

    <p style="font-size:13px;color:#49454F;line-height:1.7;margin:0;">
        Jika ada pertanyaan atau perubahan, silakan hubungi panitia melalui platform Marhalaty.
        <br><br>
        Barakallah fiikum. Semoga acaranya bermanfaat dan penuh berkah! 🤲
    </p>
@endsection
