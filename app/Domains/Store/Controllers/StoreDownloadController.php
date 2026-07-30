<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\DigitalDelivery;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Digital product delivery. The token is the only thing ever exposed to the client — never the
 * underlying media URL, since `product-digital-file` lives on a private disk (fase 2).
 */
class StoreDownloadController extends Controller
{
    public function show(Request $request, string $token)
    {
        $delivery = DigitalDelivery::where('download_token', $token)
            ->with(['orderItem.order', 'media'])
            ->first();

        abort_unless($delivery && $delivery->orderItem && $delivery->orderItem->order, 404);

        $order = $delivery->orderItem->order;

        abort_unless($request->user()?->id === $order->buyer_user_id, 403, 'Tautan unduhan ini bukan untuk akun kamu.');
        abort_if($delivery->isExpired(), 410, 'Tautan unduhan sudah kedaluwarsa.');
        abort_if($delivery->isQuotaExhausted(), 403, 'Kuota unduhan sudah habis.');
        abort_unless(in_array($order->status, ['paid', 'completed'], true), 403, 'Pesanan belum lunas.');

        $media = $delivery->media;
        abort_unless($media, 404, 'File tidak ditemukan.');

        $delivery->increment('download_count');
        $delivery->update(['last_downloaded_at' => now()]);

        return response()->download($media->getPath(), $media->file_name);
    }
}
