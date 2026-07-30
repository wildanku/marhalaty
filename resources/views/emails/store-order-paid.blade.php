@extends('emails.layout')

@section('email_title', 'Pembayaran Diterima – ' . $order->order_number)
@section('header_icon', '✅')

@section('content')
    <h1 class="greeting">Terima kasih, {{ $buyer->name ?? 'Ikhwan' }}!</h1>
    <p class="lead-text">
        Pembayaran untuk pesanan <strong>{{ $order->order_number }}</strong> di toko
        <strong>{{ $order->store->name ?? '' }}</strong> sudah kami terima.
        @if ($order->requires_shipping)
            Penjual akan segera memproses dan mengirim pesananmu.
        @else
            Akses produk digitalmu akan segera dikirimkan.
        @endif
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

    @if (! empty($downloadLinks))
        <p style="font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#2D4228;margin:24px 0 10px;">
            Unduh Produk Digital
        </p>
        @foreach ($downloadLinks as $link)
            <div class="cta-wrapper" style="margin:8px 0;">
                <a href="{{ $link['url'] }}" class="cta-button">Unduh {{ $link['name'] }}</a>
            </div>
        @endforeach
    @endif

    <div class="cta-wrapper">
        <a href="{{ config('app.url') }}/store/orders/{{ $order->id }}" class="cta-button">Lihat Pesanan</a>
    </div>
@endsection
