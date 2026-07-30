@extends('emails.layout')

@section('email_title', 'Toko Belum Disetujui – ' . $store->name)
@section('header_icon', '📋')

@section('content')
    <h1 class="greeting">Halo, {{ $owner->name ?? 'Ikhwan' }}</h1>
    <p class="lead-text">
        Mohon maaf, pengajuan toko <strong>{{ $store->name }}</strong> belum bisa kami setujui saat
        ini. Kamu bisa mengajukan ulang setelah menyesuaikan hal berikut.
    </p>

    <div class="notice-box">
        <strong>Alasan:</strong><br>
        {{ $store->rejection_reason }}
    </div>

    <div class="cta-wrapper">
        <a href="{{ config('app.url') }}/my/stores/create" class="cta-button">Ajukan Ulang</a>
    </div>
@endsection
