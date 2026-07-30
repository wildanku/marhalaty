@extends('emails.layout')

@section('email_title', 'Toko Disetujui – ' . $store->name)
@section('header_icon', '✅')

@section('content')
    <h1 class="greeting">Selamat, {{ $owner->name ?? 'Ikhwan' }}!</h1>
    <p class="lead-text">
        Pengajuan toko kamu telah <strong>disetujui</strong> oleh admin. Toko kamu sekarang tampil
        di direktori publik dan siap menerima pesanan.
    </p>

    <div class="success-box" style="text-align:center;padding:20px;">
        <p style="font-size:36px;margin:0 0 8px;">🏪</p>
        <p style="font-family:Georgia,serif;font-size:18px;font-weight:bold;color:#2D4228;margin:0 0 4px;">
            {{ $store->name }}
        </p>
        <p style="font-size:13px;color:#3D5936;margin:0;">Status: Disetujui</p>
    </div>

    <div class="cta-wrapper">
        <a href="{{ config('app.url') }}/my/stores/{{ $store->id }}" class="cta-button">Kelola Toko</a>
    </div>
@endsection
