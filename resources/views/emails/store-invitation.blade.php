@extends('emails.layout')

@section('email_title', 'Undangan Mengelola Toko – ' . $store->name)
@section('header_icon', '🤝')

@section('content')
    <h1 class="greeting">Halo, {{ $invitee->name ?? 'Ikhwan' }}</h1>
    <p class="lead-text">
        Kamu diundang untuk ikut mengelola toko <strong>{{ $store->name }}</strong> di Marhalaty.
        Undangan ini berlaku selama 7 hari.
    </p>

    <div class="cta-wrapper">
        <a href="{{ $acceptUrl }}" class="cta-button">Terima Undangan</a>
    </div>

    <p class="lead-text" style="font-size:13px;">
        Jika kamu tidak mengenali toko ini, abaikan saja email ini.
    </p>
@endsection
