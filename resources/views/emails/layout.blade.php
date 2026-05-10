<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>@yield('email_title', 'Marhalaty – Dynamic Foundation')</title>
    <style>
        /* ────────────────────────────────────────────
           Reset & Base
        ──────────────────────────────────────────── */
        body, html {
            margin: 0; padding: 0;
            background-color: #F5F2EE;
            font-family: Arial, Helvetica, sans-serif;
            color: #1C1B1F;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        a { color: #4A6741; text-decoration: none; }
        a:hover { text-decoration: underline; }

        /* ────────────────────────────────────────────
           Wrapper
        ──────────────────────────────────────────── */
        .email-wrapper {
            width: 100%;
            background-color: #F5F2EE;
            padding: 40px 16px;
        }
        .email-container {
            max-width: 620px;
            margin: 0 auto;
            background-color: #FAFAF8;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(74, 103, 65, 0.10);
        }

        /* ────────────────────────────────────────────
           Header
        ──────────────────────────────────────────── */
        .email-header {
            background: linear-gradient(135deg, #3D5936 0%, #4A6741 60%, #5A7A50 100%);
            padding: 36px 40px 32px;
            text-align: center;
        }
        .email-header .brand-name {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 26px;
            font-weight: bold;
            color: #FFFFFF;
            letter-spacing: 0.5px;
            margin: 0 0 4px;
        }
        .email-header .brand-tagline {
            font-size: 12px;
            color: rgba(255,255,255,0.70);
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 0;
        }
        .email-header .header-icon {
            display: inline-block;
            width: 52px; height: 52px;
            background: rgba(255,255,255,0.15);
            border-radius: 50%;
            line-height: 52px;
            font-size: 26px;
            margin-bottom: 16px;
        }

        /* ────────────────────────────────────────────
           Body
        ──────────────────────────────────────────── */
        .email-body {
            padding: 40px 40px 32px;
        }
        .greeting {
            font-family: Georgia, serif;
            font-size: 22px;
            font-weight: bold;
            color: #1C1B1F;
            margin: 0 0 12px;
        }
        .lead-text {
            font-size: 15px;
            line-height: 1.7;
            color: #49454F;
            margin: 0 0 28px;
        }

        /* ────────────────────────────────────────────
           Event Card
        ──────────────────────────────────────────── */
        .event-card {
            background: #EFF4EE;
            border: 1px solid #C8D9C5;
            border-left: 4px solid #4A6741;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 28px;
        }
        .event-card .event-title {
            font-family: Georgia, serif;
            font-size: 18px;
            font-weight: bold;
            color: #2D4228;
            margin: 0 0 12px;
        }
        .event-meta {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .event-meta-row {
            font-size: 13px;
            color: #49454F;
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }
        .event-meta-row .meta-label {
            font-weight: bold;
            color: #3D5936;
            min-width: 80px;
        }

        /* ────────────────────────────────────────────
           CTA Button
        ──────────────────────────────────────────── */
        .cta-wrapper {
            text-align: center;
            margin: 28px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3D5936, #4A6741);
            color: #FFFFFF !important;
            font-size: 15px;
            font-weight: bold;
            padding: 14px 36px;
            border-radius: 50px;
            text-decoration: none !important;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 16px rgba(74, 103, 65, 0.30);
        }
        .cta-button:hover { opacity: 0.92; }

        /* ────────────────────────────────────────────
           Info Table (payment / order breakdown)
        ──────────────────────────────────────────── */
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        .info-table td {
            font-size: 14px;
            padding: 10px 0;
            border-bottom: 1px solid #E6EAE5;
            color: #49454F;
            vertical-align: top;
        }
        .info-table td:first-child {
            color: #3D5936;
            font-weight: 600;
            width: 42%;
        }
        .info-table .total-row td {
            border-bottom: none;
            font-weight: bold;
            font-size: 16px;
            color: #1C1B1F;
            padding-top: 14px;
        }

        /* ────────────────────────────────────────────
           Bank Account Card
        ──────────────────────────────────────────── */
        .bank-card {
            background: #FAFAF8;
            border: 1px solid #C8D9C5;
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 12px;
        }
        .bank-card .bank-name {
            font-size: 13px;
            font-weight: bold;
            color: #3D5936;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 4px;
        }
        .bank-card .account-number {
            font-family: 'Courier New', Courier, monospace;
            font-size: 20px;
            font-weight: bold;
            color: #1C1B1F;
            letter-spacing: 2px;
            margin: 4px 0;
        }
        .bank-card .account-name {
            font-size: 13px;
            color: #49454F;
            margin: 0;
        }

        /* ────────────────────────────────────────────
           Alert / Notice Box
        ──────────────────────────────────────────── */
        .notice-box {
            background: #FFF8E7;
            border: 1px solid #F5D782;
            border-radius: 10px;
            padding: 14px 18px;
            font-size: 13px;
            color: #7A5D00;
            line-height: 1.6;
            margin-bottom: 24px;
        }
        .success-box {
            background: #EFF4EE;
            border: 1px solid #A8C5A0;
            border-radius: 10px;
            padding: 14px 18px;
            font-size: 13px;
            color: #2D4228;
            line-height: 1.6;
            margin-bottom: 24px;
        }

        /* ────────────────────────────────────────────
           Divider
        ──────────────────────────────────────────── */
        .divider {
            height: 1px;
            background: #E6EAE5;
            margin: 28px 0;
        }

        /* ────────────────────────────────────────────
           Footer
        ──────────────────────────────────────────── */
        .email-footer {
            background: #2D4228;
            padding: 28px 40px;
            text-align: center;
        }
        .email-footer .footer-brand {
            font-family: Georgia, serif;
            font-size: 16px;
            font-weight: bold;
            color: #FFFFFF;
            margin: 0 0 8px;
        }
        .email-footer .footer-sub {
            font-size: 12px;
            color: rgba(255,255,255,0.55);
            line-height: 1.6;
            margin: 0 0 16px;
        }
        .email-footer .footer-links a {
            font-size: 12px;
            color: rgba(255,255,255,0.60);
            margin: 0 8px;
        }
        .email-footer .footer-links a:hover { color: #FFFFFF; }

        /* ────────────────────────────────────────────
           Responsive
        ──────────────────────────────────────────── */
        @media only screen and (max-width: 640px) {
            .email-body { padding: 28px 24px 20px; }
            .email-header { padding: 28px 24px; }
            .email-footer { padding: 24px; }
            .cta-button { padding: 13px 24px; font-size: 14px; }
            .event-card { padding: 16px 18px; }
        }
    </style>
</head>
<body>
<div class="email-wrapper">
    <table class="email-container" width="100%" cellpadding="0" cellspacing="0" role="presentation">
        {{-- ══ HEADER ══ --}}
        <tr>
            <td class="email-header">
                <p class="header-icon">@yield('header_icon', '🌿')</p>
                <p class="brand-name">Marhalaty</p>
                <p class="brand-tagline">Dynamic Foundation · Gontor 2013</p>
            </td>
        </tr>

        {{-- ══ BODY ══ --}}
        <tr>
            <td class="email-body">
                @yield('content')
            </td>
        </tr>

        {{-- ══ FOOTER ══ --}}
        <tr>
            <td class="email-footer">
                <p class="footer-brand">Dynamic Foundation</p>
                <p class="footer-sub">
                    Email ini dikirim otomatis oleh sistem Marhalaty.<br>
                    Jangan membalas email ini.
                </p>
                <div class="footer-links">
                    <a href="{{ config('app.url') }}">Website</a>
                    <a href="{{ config('app.url') }}/dashboard">Dashboard</a>
                    <a href="{{ config('app.url') }}/events">Events</a>
                </div>
                <p style="font-size:11px;color:rgba(255,255,255,0.35);margin:16px 0 0;">
                    © {{ date('Y') }} Marhalaty · Powered by Dynamic Foundation
                </p>
            </td>
        </tr>
    </table>
</div>
</body>
</html>
