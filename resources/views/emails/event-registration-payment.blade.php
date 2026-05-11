@extends('emails.layout')

@section('email_title', 'Segera Selesaikan Pembayaran – ' . $rsvp->event->title)
@section('header_icon', '💳')

@section('content')
    <h1 class="greeting">Halo, {{ $rsvp->user->name ?? 'Ikhwan'}}!</h1>
    <p class="lead-text">
        Terima kasih telah mendaftar pada acara berikut. Untuk mengkonfirmasi keikutsertaanmu,
        silakan selesaikan pembayaran sesuai nominal di bawah ini.
    </p>

    {{-- EVENT CARD --}}
    <div class="event-card">
        <p class="event-title">{{ $rsvp->event->title }}</p>
        <table class="event-meta" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td class="event-meta-row">
                    <span class="meta-label">📅 Tanggal</span>
                    <span>{{ \Carbon\Carbon::parse($rsvp->event->event_date)->translatedFormat('l, d F Y · H:i') }} WIB</span>
                </td>
            </tr>
            @if($rsvp->event->location)
            <tr>
                <td class="event-meta-row" style="padding-top:6px;">
                    <span class="meta-label">📍 Lokasi</span>
                    <span>{{ $rsvp->event->location }}</span>
                </td>
            </tr>
            @endif
        </table>
    </div>

    {{-- ORDER BREAKDOWN --}}
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:bold;color:#2D4228;margin:0 0 12px;">Rincian Pembayaran</p>
    <table class="info-table" cellpadding="0" cellspacing="0">
        @if($rsvp->package)
        <tr>
            <td>Paket – {{ $rsvp->package->name }}</td>
            <td align="right">Rp {{ number_format($rsvp->package_amount, 0, ',', '.') }}</td>
        </tr>
        @endif

        @if(!empty($rsvp->add_ons_snapshot))
            @foreach($rsvp->add_ons_snapshot as $addon)
                @if(!($addon['is_included'] ?? false))
                <tr>
                    <td>{{ $addon['name'] }} &times; {{ $addon['quantity'] }}</td>
                    <td align="right">Rp {{ number_format($addon['total'], 0, ',', '.') }}</td>
                </tr>
                @endif
            @endforeach
        @endif

        @if((float)$rsvp->infak_amount > 0)
        <tr>
            <td>Infak Sukarela</td>
            <td align="right">Rp {{ number_format($rsvp->infak_amount, 0, ',', '.') }}</td>
        </tr>
        @endif

        <tr class="total-row">
            <td>Total Tagihan</td>
            <td align="right" style="color:#3D5936;">Rp {{ number_format($rsvp->total_amount, 0, ',', '.') }}</td>
        </tr>
    </table>

    {{-- PAYMENT METHODS --}}
    @php
        $paymentHash = $transaction->payment_hash;
        $paymentPageUrl = $paymentHash ? url('/payment/' . $paymentHash) : null;
        $confirmationUrl = $paymentHash ? url('/payment-confirmation/' . $paymentHash) : null;
        $isIpaymu = $transaction->payment_provider === 'ipaymu';
        $channel = $transaction->payment_channel ?? '';
        $channelNames = [
            'qris' => 'QRIS', 'bca' => 'BCA Virtual Account', 'bni' => 'BNI Virtual Account',
            'bri' => 'BRI Virtual Account', 'mandiri' => 'Mandiri Virtual Account',
            'bsi' => 'BSI Virtual Account', 'btn' => 'BTN Virtual Account',
            'permata' => 'Permata Virtual Account', 'cimb' => 'CIMB Niaga Virtual Account',
        ];
        $channelName = $channelNames[$channel] ?? strtoupper($channel);
    @endphp

    @if($isIpaymu)
        <p style="font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#2D4228;margin:0 0 8px;">
            Pembayaran Otomatis via iPaymu — {{ $channelName }}
        </p>

        @if($transaction->va_number && $channel !== 'qris')
            <div class="bank-card" style="margin-bottom:16px;">
                <p class="bank-name">{{ $channelName }}</p>
                <p class="account-number">{{ $transaction->va_number }}</p>
                <p class="account-name">Nomor Virtual Account</p>
            </div>
            <div class="notice-box">
                💡 Transfer tepat sesuai nominal ke nomor VA di atas. Pembayaran akan
                terkonfirmasi otomatis setelah transfer berhasil.
            </div>
        @elseif($channel === 'qris')
            <div class="notice-box">
                📱 <strong>QRIS</strong> — Scan QR Code di halaman pembayaran menggunakan
                aplikasi e-wallet atau m-banking kamu. Pembayaran terkonfirmasi otomatis.
            </div>
        @else
            <div class="notice-box">
                ⏳ Informasi pembayaran iPaymu sedang diproses. Klik tombol di bawah untuk
                melihat detail terkini.
            </div>
        @endif

        @if($paymentPageUrl)
            <div class="cta-wrapper">
                <a href="{{ $paymentPageUrl }}" class="cta-button">
                    Lihat Detail Pembayaran →
                </a>
                <p style="font-size:12px;color:#49454F;margin-top:12px;word-break:break-all;">
                    Atau klik link di bawah:
                </p>
                <p style="font-family:'Courier New',monospace;font-size:11px;background:#F5F2EE;padding:8px 12px;border-radius:6px;color:#3D5936;margin:8px 0;word-break:break-all;">
                    {{ $paymentPageUrl }}
                </p>
            </div>
        @endif

        <div class="notice-box">
            ⏰ <strong>Perhatian:</strong> Selesaikan pembayaran sebelum batas waktu yang
            ditentukan. Jika ada kendala, silakan hubungi panitia.
        </div>
    @else
        <p style="font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#2D4228;margin:0 0 12px;">
            Transfer Manual ke Rekening Berikut:
        </p>
        @if(!empty($bankAccounts))
            @foreach($bankAccounts as $bank)
            <div class="bank-card">
                <p class="bank-name">{{ $bank['bank'] ?? 'Bank' }}</p>
                <p class="account-number">{{ $bank['account_number'] ?? '-' }}</p>
                <p class="account-name">a.n. {{ $bank['account_holder'] ?? '-' }}</p>
            </div>
            @endforeach
        @else
            <div class="notice-box">
                Informasi rekening belum tersedia. Silakan hubungi panitia untuk konfirmasi.
            </div>
        @endif

        @if($confirmationUrl)
            <div class="cta-wrapper">
                <a href="{{ $confirmationUrl }}" class="cta-button">
                    Upload Bukti Pembayaran →
                </a>
                <p style="font-size:12px;color:#49454F;margin-top:12px;word-break:break-all;">
                    Atau klik link di bawah:
                </p>
                <p style="font-family:'Courier New',monospace;font-size:11px;background:#F5F2EE;padding:8px 12px;border-radius:6px;color:#3D5936;margin:8px 0;word-break:break-all;">
                    {{ $confirmationUrl }}
                </p>
            </div>
        @elseif($paymentPageUrl)
            <div class="cta-wrapper">
                <a href="{{ $paymentPageUrl }}" class="cta-button">
                    Lihat Halaman Pembayaran →
                </a>
                <p style="font-size:12px;color:#49454F;margin-top:12px;word-break:break-all;">
                    Atau klik link di bawah:
                </p>
                <p style="font-family:'Courier New',monospace;font-size:11px;background:#F5F2EE;padding:8px 12px;border-radius:6px;color:#3D5936;margin:8px 0;word-break:break-all;">
                    {{ $paymentPageUrl }}
                </p>
            </div>
        @endif

        <div class="notice-box">
            ✅ <strong>Gratis biaya admin.</strong> Setelah transfer, upload bukti pembayaran
            agar admin dapat memverifikasi segera.
        </div>
    @endif

    <div class="divider"></div>

    <p style="font-size:13px;color:#49454F;line-height:1.7;margin:0;">
        Butuh bantuan? Hubungi panitia melalui dashboard atau balas ke email ini.
        Kami senang membantu kamu, Ikhwan! 🤝
    </p>
@endsection
