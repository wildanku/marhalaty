@extends('emails.layout')

@section('email_title', 'Pesanan Kedaluwarsa – ' . $order->order_number)
@section('header_icon', '⏰')

@section('content')
    <h1 class="greeting">Halo, {{ $buyer->name ?? 'Ikhwan' }}</h1>
    <p class="lead-text">
        Waktu pembayaran untuk pesanan <strong>{{ $order->order_number }}</strong> di toko
        <strong>{{ $order->store->name ?? '' }}</strong> telah habis, sehingga pesanan ini
        dibatalkan otomatis. Kamu bisa memesan ulang kapan saja.
    </p>

    @if ($order->store?->slug)
        <div class="cta-wrapper">
            <a href="{{ config('app.url') }}/stores/{{ $order->store->slug }}" class="cta-button">Pesan Ulang</a>
        </div>
    @endif
@endsection
