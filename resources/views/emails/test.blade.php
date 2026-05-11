@extends('emails.layout')

@section('email_title', '[TEST] Email dari Dynamic Foundation GodMode')
@section('header_icon', '🧪')

@section('content')
    <h1 class="greeting">Test Email Berhasil! 🎉</h1>
    <p class="lead-text">
        Ini adalah email pengujian dari panel <strong>GodMode</strong> Dynamic Foundation.
        Jika kamu menerima email ini, artinya konfigurasi SMTP sudah berjalan dengan baik.
    </p>

    <div class="event-card">
        <p class="event-title">📬 Informasi Test</p>
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="font-size:13px;color:#49454F;padding:4px 0;">
                    <span style="font-weight:bold;color:#3D5936;display:inline-block;width:100px;">Dikirim dari</span>
                    {{ config('mail.from.address') }}
                </td>
            </tr>
            <tr>
                <td style="font-size:13px;color:#49454F;padding:4px 0;">
                    <span style="font-weight:bold;color:#3D5936;display:inline-block;width:100px;">Mailer</span>
                    {{ config('mail.default') }}
                </td>
            </tr>
            <tr>
                <td style="font-size:13px;color:#49454F;padding:4px 0;">
                    <span style="font-weight:bold;color:#3D5936;display:inline-block;width:100px;">SMTP Host</span>
                    {{ config('mail.mailers.smtp.host') }}:{{ config('mail.mailers.smtp.port') }}
                </td>
            </tr>
            <tr>
                <td style="font-size:13px;color:#49454F;padding:4px 0;">
                    <span style="font-weight:bold;color:#3D5936;display:inline-block;width:100px;">Timestamp</span>
                    {{ now()->format('d M Y, H:i:s') }} WIB
                </td>
            </tr>
        </table>
    </div>

    @if($note)
    <div class="notice-box">
        <strong>Catatan dari Admin:</strong><br>
        {{ $note }}
    </div>
    @endif

    <div class="success-box">
        ✅ Konfigurasi email berjalan normal. Template desain Dynamic Foundation juga berhasil di-render.
    </div>

    <p style="font-size:13px;color:#49454F;line-height:1.7;margin:0;">
        Email ini hanya untuk keperluan testing. Tidak perlu ditindaklanjuti.
    </p>
@endsection
