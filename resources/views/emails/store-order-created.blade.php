@extends('emails.layout')

@section('email_title', 'Pesanan Dibuat – ' . $order->order_number)
@section('header_icon', '🧾')

@section('content')
    <h1 class="greeting">Halo, {{ $buyer->name ?? 'Ikhwan' }}</h1>
    <p class="lead-text">
        Pesananmu di toko <strong>{{ $order->store->name ?? '' }}</strong> sudah dibuat. Selesaikan
        pembayaran sebelum batas waktu agar pesanan tidak dibatalkan otomatis.
    </p>

    <table class="info-table" width="100%" cellpadding="0" cellspacing="0">
        @foreach ($order->items as $item)
            <tr>
                <td>{{ $item->name_snapshot }}{{ $item->variant_label_snapshot ? " ({$item->variant_label_snapshot})" : '' }} × {{ $item->quantity }}</td>
                <td>Rp {{ number_format((float) $item->subtotal, 0, ',', '.') }}</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td>Total</td>
            <td>Rp {{ number_format((float) $order->total, 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="cta-wrapper">
        <a href="{{ $paymentUrl }}" class="cta-button">Selesaikan Pembayaran</a>
    </div>
@endsection
