@extends('emails.layout')

@section('email_title', 'Pesanan Dikirim – ' . $order->order_number)
@section('header_icon', '📦')

@section('content')
    <h1 class="greeting">Kabar baik, {{ $buyer->name ?? 'Ikhwan' }}!</h1>
    <p class="lead-text">
        Pesanan <strong>{{ $order->order_number }}</strong> dari toko
        <strong>{{ $order->store->name ?? '' }}</strong> sudah dikirim.
    </p>

    <div class="success-box" style="text-align:center;padding:20px;">
        <p style="font-size:13px;color:#3D5936;margin:0 0 6px;">
            {{ $order->shipping_courier_name }} · {{ $order->shipping_service }}
        </p>
        <p style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#2D4228;margin:0;">
            {{ $order->tracking_number }}
        </p>
    </div>

    <div class="cta-wrapper">
        <a href="{{ config('app.url') }}/store/orders/{{ $order->id }}" class="cta-button">Lihat Pesanan</a>
    </div>
@endsection
