<?php

namespace App\Domains\Shared\Services;

use App\Contracts\PaymentProviderInterface;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * iPaymu v2 Redirect Payment integration.
 *
 * Docs: https://documenter.getpostman.com/view/7508325/SzmcZJ79
 *
 * Signature algorithm (per iPaymu spec):
 *   stringToSign = "POST:{va}:{sha256(json_body)}:{api_key}"
 *   signature    = hash_hmac('sha256', stringToSign, api_key)
 */
class IPaymuService implements PaymentProviderInterface
{
    private string $va;
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->va = config('services.ipaymu.va');
        $this->apiKey = config('services.ipaymu.api_key');
        $this->baseUrl = config('services.ipaymu.sandbox')
            ? 'https://sandbox.ipaymu.com/api/v2'
            : 'https://my.ipaymu.com/api/v2';
    }

    /**
     * Create a direct payment (VA / QRIS) on iPaymu without redirecting user away.
     *
     * @param  string $channel  e.g. 'qris', 'bca', 'mandiri', 'bni', 'bri', 'bsi', 'btn', 'cimb'
     * @return array{external_reference:string, va_number:string|null, qr_string:string|null}
     */
    public function initiateDirectPayment(Transaction $transaction, Rsvp $rsvp, string $channel): array
    {
        $rsvp->loadMissing(['event', 'user']);

        $paymentMethod = $channel === 'qris' ? 'qris' : 'va';

        $body = [
            'product'        => [$rsvp->event->title],
            'qty'            => [1],
            'price'          => [(int) round((float) $transaction->amount)],
            'description'    => ["RSVP #{$rsvp->id} - {$rsvp->event->title}"],
            'referenceId'    => (string) $transaction->id,
            'notifyUrl'      => route('payments.ipaymu.webhook'),
            'returnUrl'      => url('/payment/' . $transaction->payment_hash),
            'cancelUrl'      => route('events.show', $rsvp->event->slug),
            'buyerName'      => $rsvp->user->name,
            'buyerEmail'     => $rsvp->user->email,
            'buyerPhone'     => $rsvp->user->phone_number ?? '08000000000',
            'paymentMethod'  => $paymentMethod,
            'paymentChannel' => $channel,
        ];

        $signature = $this->buildSignature($body);
        $timestamp = now()->format('YmdHis');

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'va'           => $this->va,
            'signature'    => $signature,
            'timestamp'    => $timestamp,
        ])->post($this->baseUrl . '/direct-payment', $body);

        $data = $response->json();

        if (($data['Status'] ?? null) !== 200) {
            Log::error('iPaymu direct payment failed', [
                'transaction_id' => $transaction->id,
                'channel'        => $channel,
                'response'       => $data,
            ]);
            throw new \Exception('iPaymu Error: ' . ($data['Message'] ?? 'Unknown error'));
        }

        return [
            'external_reference' => (string) ($data['Data']['SessionID'] ?? ''),
            'va_number'          => $data['Data']['No'] ?? null,
            'qr_string'          => $data['Data']['QRString'] ?? null,
        ];
    }

    /**
     * Create a redirect payment session on iPaymu and return payment URL.
     */
    public function initiatePayment(Transaction $transaction, Rsvp $rsvp): array
    {
        $rsvp->loadMissing(['event', 'user']);

        $body = [
            'product' => [$rsvp->event->title],
            'qty' => [1],
            'price' => [(int) round((float) $transaction->amount)],
            'description' => ["RSVP #{$rsvp->id} - {$rsvp->event->title}"],
            'referenceId' => (string) $transaction->id,
            'notifyUrl' => route('payments.ipaymu.webhook'),
            'returnUrl' => route('payments.show', $transaction->id),
            'cancelUrl' => route('events.show', $rsvp->event->slug),
            'buyerName' => $rsvp->user->name,
            'buyerEmail' => $rsvp->user->email,
            'buyerPhone' => $rsvp->user->phone_number ?? '08000000000',
            'paymentMethod' => 'redirect',
        ];

        $signature = $this->buildSignature($body);
        $timestamp = now()->format('YmdHis');

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'va' => $this->va,
            'signature' => $signature,
            'timestamp' => $timestamp,
        ])->post($this->baseUrl . '/payment', $body);

        $data = $response->json();

        if (($data['Status'] ?? null) !== 200) {
            Log::error('iPaymu payment initiation failed', [
                'transaction_id' => $transaction->id,
                'response' => $data,
            ]);
            throw new \Exception('iPaymu Error: ' . ($data['Message'] ?? 'Unknown error'));
        }

        return [
            'payment_url' => $data['Data']['Url'],
            'external_reference' => (string) $data['Data']['SessionID'],
            'va_number' => null,
        ];
    }

    /**
     * Parse incoming iPaymu webhook payload into a normalised format.
     *
     * iPaymu webhook fields (POST form-urlencoded):
     *   - referenceId  → our transaction ID
     *   - sid          → session ID (external_reference)
     *   - status_code  → "1" = paid, "2" = failed, "3" = expired
     *   - status       → "berhasil" | "gagal" | "kadaluarsa"
     *   - trx_id       → iPaymu internal transaction ID
     */
    public function parseWebhook(Request $request): array
    {
        $statusMap = [
            'berhasil' => 'paid',
            'paid' => 'paid',
            '1' => 'paid',
            'gagal' => 'failed',
            'failed' => 'failed',
            '2' => 'failed',
            'kadaluarsa' => 'expired',
            'expired' => 'expired',
            '3' => 'expired',
        ];

        $rawStatus = strtolower((string) $request->input('status', ''));
        $rawStatusCode = (string) $request->input('status_code', '');
        $mappedStatus = $statusMap[$rawStatus] ?? $statusMap[$rawStatusCode] ?? 'pending';

        return [
            'external_reference' => (string) $request->input('sid', ''),
            'reference_id' => (string) $request->input('referenceId', ''), // our transaction ID
            'status' => $mappedStatus,
            'trx_id' => $request->input('trx_id'),
        ];
    }

    /**
     * Basic verification: check required webhook fields are present.
     *
     * iPaymu does not send an HMAC signature header on webhooks by default,
     * so we rely on IP whitelisting at the infrastructure level.
     */
    public function verifyWebhook(Request $request): bool
    {
        return $request->has('referenceId') && $request->has('status');
    }

    // ─── Private ─────────────────────────────────────────────────────

    /**
     * Build HMAC-SHA256 signature required by iPaymu v2 API.
     */
    private function buildSignature(array $body): string
    {
        $bodyHash = hash('sha256', json_encode($body));
        $stringSign = 'POST:' . $this->va . ':' . $bodyHash . ':' . $this->apiKey;
        return hash_hmac('sha256', $stringSign, $this->apiKey);
    }

    /**
     * Get payment channels config translated from TypeScript structure.
     */
    public function getPaymentChannels(): array
    {
        return [
            [
                'method' => 'qris',
                'channels' => [
                    [
                        'code' => 'qris',
                        'name' => 'QRIS',
                        'fee' => 1,
                        'fee_type' => 'percentage',
                        'image' => 'https://storage.googleapis.com/hala-storage-public/qris.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'Aplikasi e-Wallet / Mobile Banking',
                                    'steps' => [
                                        'Buka aplikasi e-Wallet atau Mobile Banking pilihanmu yang mendukung QRIS.',
                                        'Pilih menu Scan QR atau Bayar.',
                                        'Scan QR Code yang tampil pada layar.',
                                        'Pastikan nama merchant adalah TitikMula dan nominal tagihan atas nama {payerName} sudah sesuai.',
                                        'Masukkan PIN untuk konfirmasi pembayaran.',
                                        'Pembayaran berhasil.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'method' => 'va',
                'channels' => [
                    [
                        'code' => 'bca',
                        'name' => 'BCA',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/bca.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'm-BCA',
                                    'steps' => [
                                        'Silahkan login pada aplikasi BCA Mobile.',
                                        'Pilih "m-BCA", lalu masukkan kode akses m-BCA.',
                                        'Pilih "m-Transfer".',
                                        'Lanjut ke "BCA Virtual Account".',
                                        'Masukkan nomor BCA Virtual Account Anda.',
                                        'Lalu, masukkan jumlah yang akan dibayarkan.',
                                        'Periksa kembali informasi pembayaran, pastikan nama ({payerName}) dan jumlah tagihan benar.',
                                        'Masukkan PIN m-BCA Anda.',
                                        'Lanjutkan transaksi sampai selesai.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM BCA',
                                    'steps' => [
                                        'Masukkan kartu ke mesin ATM.',
                                        'Masukkan 6 digit PIN Anda.',
                                        'Pilih "Transaksi Lainnya".',
                                        'Pilih "Transfer".',
                                        'Lanjut ke "ke Rekening BCA Virtual Account".',
                                        'Masukkan nomor BCA Virtual Account Anda, kemudian tekan "Benar".',
                                        'Masukkan jumlah yang akan dibayarkan, selanjutnya tekan "Benar".',
                                        'Periksa kembali informasi pembayaran, pastikan nama ({payerName}) dan jumlah tagihan benar.',
                                        'Jika sudah benar, lanjutkan transaksi sampai selesai.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'code' => 'mandiri',
                        'name' => 'Mandiri',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/mandiri.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'Mandiri Mobile Banking',
                                    'steps' => [
                                        'Pilih menu Bayar.',
                                        'Pilih E-Commerce.',
                                        'Pilih Penyedia Jasa Perusahaan Ipaymu - 89008.',
                                        'Masukkan Nomer VA (Virtual Account) tertuju.',
                                        'Masukkan nominal pembayaran sesuai dengan tagihan.',
                                        'Konfirmasi pembayaran akan muncul berupa pembayaran ke Ipaymu, nomor VA, dan total tagihan. Pastikan nama ({payerName}) sesuai, lalu pilih "YA" jika benar.',
                                        'Transaksi selesai.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM Mandiri',
                                    'steps' => [
                                        'Pilih menu Bayar/Beli.',
                                        'Pilih Lainnya dan pilih Lainnya kembali.',
                                        'Pilih Multi Payment.',
                                        'Masukkan Kode Perusahaan Ipaymu - 89008.',
                                        'Masukkan Nomer VA (Virtual Account) tertuju.',
                                        'Masukkan nominal pembayaran sesuai dengan tagihan.',
                                        'Konfirmasi pembayaran akan muncul berupa pembayaran ke Ipaymu, nomor VA, dan total tagihan. Pastikan nama ({payerName}) sesuai dan pilih YA jika benar.',
                                        'Transaksi selesai.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'code' => 'bni',
                        'name' => 'BNI',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/bni.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'BNI Mobile Banking',
                                    'steps' => [
                                        'Pilih menu Transfer.',
                                        'Pilih menu Virtual Account Billing kemudian pilih Rekening Debet.',
                                        'Masukkan nomor Virtual Account tertuju pada menu input baru.',
                                        'Tagihan yang harus dibayarkan ({payerName}) akan muncul pada layar konfirmasi.',
                                        'Konfirmasi transaksi and masukkan Password Transaksi.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM BNI',
                                    'steps' => [
                                        'Pilih Menu Lainnya lalu pilih menu Transfer.',
                                        'Pilih jenis rekening yang akan digunakan.',
                                        'Pilih Virtual Account Billing.',
                                        'Masukan Nomor Virtual Account tertuju.',
                                        'Tagihan yang harus dibayarkan ({payerName}) akan muncul pada layar konfirmasi.',
                                        'Pilih Konfirmasi apabila telah sesuai dengan pesanan and tagihan Anda, lanjutkan transaksi.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'code' => 'bri',
                        'name' => 'BRI',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/bri.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'Mobile Banking BRI',
                                    'steps' => [
                                        'Login ke Mobile Banking BRI.',
                                        'Pilih menu Pembayaran.',
                                        'Pilih menu BRIVA.',
                                        'Masukkan Nomor Virtual Account, tekan BENAR.',
                                        'Periksa kembali informasi pembayaran ({payerName}) dan jumlah tagihan.',
                                        'Apabila sudah sesuai, masukkan PIN.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM BRI',
                                    'steps' => [
                                        'Masukkan kartu ATM, input PIN.',
                                        'Pilih menu TRANSAKSI LAIN, kemudian LAINNYA.',
                                        'Pilih menu PEMBAYARAN kemudian pilih BRIVA.',
                                        'Masukkan Nomor Virtual Account tekan BENAR.',
                                        'Periksa kembali informasi pembayaran ({payerName}) dan jumlah tagihan.',
                                        'Apabila sudah sesuai, tekan YA.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'code' => 'cimb',
                        'name' => 'CIMB Niaga',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/niaga.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'Go Mobile CIMB Niaga',
                                    'steps' => [
                                        'Pilih menu Transfer.',
                                        'Pilih Transfer ke Rekening CIMB Niaga lainya.',
                                        'Pilih sumber rekening Anda: Rekening Ponsel atau Rekening Tabungan & Koran.',
                                        'Masukan nomor Virtual Account tertuju.',
                                        'Masukan jumlah pembayaran sesuai dengan tagihan.',
                                        'Pastikan tagihan atas nama {payerName}, lalu masukan Pin Mobile Banking Anda.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM CIMB Niaga',
                                    'steps' => [
                                        'Pilih menu Pembayaran > Lanjut > Virtual Account.',
                                        'Masukkan nomor Virtual Account tertuju.',
                                        'Pilih rekening debit.',
                                        'Masukan Nomor, nama virtual account ({payerName}) and jumlah billing yang akan dibayarkan.',
                                        'Pilih OK untuk melakukan pembayaran.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'code' => 'permata',
                        'name' => 'Permata',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/permata.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'Mobile Banking Permata',
                                    'steps' => [
                                        'Login ke Mobile Banking Permata.',
                                        'Pilih menu Pembayaran Tagihan.',
                                        'Pilih menu Virtual Account.',
                                        'Masukkan Nomor Virtual Account.',
                                        'Periksa informasi pembayaran, pastikan nama ({payerName}) dan jumlah tagihan benar.',
                                        'Apabila sudah sesuai, masukkan TOKEN.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM Permata',
                                    'steps' => [
                                        'Masukkan kartu ATM, input PIN.',
                                        'Pilih menu Transaksi Lainnya.',
                                        'Pilih menu Pembayaran kemudian pilih Pembayaran Lainnya.',
                                        'Pilih menu Virtual Account.',
                                        'Masukkan Nomor Virtual Account.',
                                        'Periksa informasi pembayaran, pastikan nama ({payerName}) dan jumlah tagihan benar.',
                                        'Apabila sudah sesuai, tekan YA.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'code' => 'bsi',
                        'name' => 'BSI',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/bsi.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'BSI Mobile',
                                    'steps' => [
                                        'Pilih Menu Payment / Pembayaran.',
                                        'Pilih Institusi/Akademik/Wakaf.',
                                        'Masukkan kode institusi: 9042.',
                                        'Masukkan no VA pembayaran Anda tanpa diikuti kode institusi, lalu klik "setuju".',
                                        'Tekan tombol Selanjutnya, Kemudian tampil informasi data transaksi anda, pastikan kembali nama tujuan ({payerName}) and jumlah pembayaran sesuai tagihan Anda, lalu klik Selanjutnya.',
                                        'Masukan PIN.',
                                        'Tekan tombol Selanjutnya untuk Submit.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM BSI',
                                    'steps' => [
                                        'Pilih Menu Payment/Pembayaran/Pembelian.',
                                        'Pilih Institusi/Akademik/Wakaf.',
                                        'Masukkan kode institusi: 9042 disertai no VA pembayaran Anda.',
                                        'Tekan tombol Benar/Selanjutnya.',
                                        'Kemudian tampil informasi data transaksi anda, pastikan kembali nama tujuan ({payerName}) and jumlah pembayaran sesuai tagihan Anda.',
                                        'Jika data sudah benar pilih BENAR/YA.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'code' => 'btn',
                        'name' => 'BTN',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/btn.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'Mobile Banking BTN',
                                    'steps' => [
                                        'Login ke Mobile Banking BTN.',
                                        'Pilih menu Pembayaran.',
                                        'Pilih menu Akun Virtual.',
                                        'Masukkan nomor Virtual Account.',
                                        'Periksa informasi pembayaran, pastikan nama ({payerName}) dan jumlah tagihan benar.',
                                        'Apabila sudah sesuai, klik Lanjut hingga bukti transfer ditampilkan.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM BTN',
                                    'steps' => [
                                        'Masukkan kartu ATM, input PIN.',
                                        'Pilih menu Transaksi Lainnya.',
                                        'Pilih menu Pembayaran kemudian pilih Multipayment.',
                                        'Pilih menu Virtual Account.',
                                        'Masukkan nomor Virtual Account.',
                                        'Apabila sudah sesuai, tekan BENAR.',
                                        'Periksa informasi pembayaran, pastikan nama ({payerName}) dan jumlah tagihan benar.',
                                        'Apabila sudah sesuai, tekan YA.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'code' => 'bmi',
                        'name' => 'Muamalat',
                        'fee' => 5000,
                        'fee_type' => 'fixed',
                        'image' => 'https://storage.googleapis.com/ipaymu-docs/assets/bmi.png',
                        'metadata' => [
                            'instructions' => [
                                [
                                    'title' => 'Mobile Banking Muamalat',
                                    'steps' => [
                                        'Login ke Mobile Banking Muamalat.',
                                        'Pilih menu Bayar & Isi Ulang.',
                                        'Cari Lainnya and pilih Virtual Account.',
                                        'Masukkan Nomor Virtual Account, klik PROSES.',
                                        'Periksa kembali informasi pembayaran ({payerName}) dan jumlah tagihan.',
                                        'Apabila sudah sesuai, masukkan PIN/TIN lalu klik PROSES.',
                                    ],
                                ],
                                [
                                    'title' => 'ATM Muamalat',
                                    'steps' => [
                                        'Masukkan kartu ATM, input PIN.',
                                        'Pilih menu TRANSAKSI LAIN.',
                                        'Pilih menu PEMBAYARAN kemudian pilih VIRTUAL ACCOUNT.',
                                        'Masukkan Nomor Virtual Account tekan BAYAR.',
                                        'Periksa kembali informasi pembayaran ({payerName}) dan jumlah tagihan.',
                                        'Apabila sudah sesuai, tekan BENAR, lalu tekan BAYAR.',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
