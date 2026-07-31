<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Shared\Services\IPaymuService;
use App\Domains\Shared\Services\PaymentSettingsService;
use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\PaymentGateway;
use App\Models\PaymentManualAccount;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PaymentSettingController extends Controller
{
    public function __construct(private PaymentSettingsService $settings) {}

    public function index()
    {
        $gateways = PaymentGateway::orderBy('sort_order')
            ->get()
            ->reject(fn (PaymentGateway $gateway) => in_array($gateway->code, config('payments.hidden_in_admin', []), true))
            ->map(function (PaymentGateway $gateway) {
                $driver = config("payments.drivers.{$gateway->code}", []);
                $credentials = $this->settings->credentials($gateway->code);

                return [
                    'id' => $gateway->id,
                    'code' => $gateway->code,
                    'label' => $gateway->label,
                    'description' => $gateway->description,
                    'is_enabled' => $gateway->is_enabled,
                    'contexts' => $gateway->contexts ?? [],
                    'supported_contexts' => $driver['contexts'] ?? [],
                    'credential_fields' => $driver['credential_fields'] ?? [],
                    // Masked previews only — the real values never reach the client (DoD, plan §9).
                    'credential_previews' => collect($credentials)->map(fn ($value) => $this->mask($value))->all(),
                    'last_verified_at' => $gateway->last_verified_at,
                    'sort_order' => $gateway->sort_order,
                ];
            })
            // reject() preserves original array keys — without this, a non-sequential collection
            // (e.g. ipaymu was index 1) serializes to a JSON object instead of an array, and the
            // frontend's gateways.map() breaks.
            ->values();

        $manualAccounts = PaymentManualAccount::orderBy('sort_order')->get();

        return Inertia::render('GodMode/Settings/Payments', [
            'admin' => auth('admin')->user(),
            'gateways' => $gateways,
            'manualAccounts' => $manualAccounts,
        ]);
    }

    public function update(Request $request, string $code)
    {
        $gateway = PaymentGateway::where('code', $code)->firstOrFail();
        $driver = config("payments.drivers.{$code}");

        abort_if(! $driver, 404);

        $validated = $request->validate([
            'label' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'contexts' => 'array',
            'contexts.*' => Rule::in($driver['contexts']),
            'is_enabled' => 'boolean',
            'credentials' => 'array',
        ]);

        // Blank field in the submitted form means "don't change" (plan §5), never "clear it" —
        // otherwise a UI re-render showing the masked placeholder would wipe real credentials the
        // moment an admin saves anything else on the same form.
        $submittedCredentials = collect($request->input('credentials', []))
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->all();

        $credentials = $submittedCredentials
            ? array_merge($this->settings->credentials($code), $submittedCredentials)
            : null; // null = leave the stored value untouched entirely

        $changedFields = array_keys($submittedCredentials);
        $wantsEnabled = (bool) ($validated['is_enabled'] ?? false);
        $requiresCredentials = ! empty($driver['credential_fields']);

        // D23 (plan §2): a gateway can't be switched on without a prior successful "Tes koneksi" —
        // and changing credentials invalidates any earlier test, since that test verified a value
        // that's about to no longer be the one actually in use.
        if ($wantsEnabled && $requiresCredentials && ($changedFields || $gateway->last_verified_at === null)) {
            return back()->withErrors([
                'is_enabled' => 'Uji koneksi dulu sebelum mengaktifkan gateway ini'.($changedFields ? ' (kredensial baru saja berubah).' : '.'),
            ]);
        }

        $wasEnabled = $gateway->is_enabled;

        $gateway->update(array_filter([
            'label' => $validated['label'],
            'description' => $validated['description'] ?? null,
            'contexts' => $validated['contexts'] ?? [],
            'is_enabled' => $wantsEnabled,
        ], fn ($v) => $v !== null)
            + ($credentials !== null ? ['credentials' => $credentials] : [])
            + ($changedFields ? ['last_verified_at' => null] : []));

        $this->settings->flush();

        AdminActivityLog::create([
            'admin_id' => auth('admin')->id(),
            'action' => "update_payment_gateway:{$code}".($changedFields ? (':fields='.implode(',', $changedFields)) : ''),
        ]);

        if ($wasEnabled !== $wantsEnabled) {
            AdminActivityLog::create([
                'admin_id' => auth('admin')->id(),
                'action' => "toggle_payment_gateway:{$code}:".($wantsEnabled ? 'on' : 'off'),
            ]);
        }

        return back()->with('success', "Pengaturan \"{$gateway->label}\" berhasil disimpan.");
    }

    public function test(string $code, SatuteraPaymentService $satutera, IPaymuService $ipaymu)
    {
        $gateway = PaymentGateway::where('code', $code)->firstOrFail();

        $result = match ($code) {
            'satutera' => $satutera->testConnection(),
            'ipaymu' => $ipaymu->testConnection(),
            'manual' => ['ok' => true, 'message' => 'Transfer manual tidak butuh kredensial pihak ketiga.'],
            default => ['ok' => false, 'message' => 'Driver tidak dikenal.'],
        };

        if ($result['ok']) {
            $gateway->update(['last_verified_at' => now()]);
            $this->settings->flush();
        }

        AdminActivityLog::create([
            'admin_id' => auth('admin')->id(),
            'action' => "test_payment_gateway:{$code}:".($result['ok'] ? 'ok' : 'failed'),
        ]);

        return back()->with($result['ok'] ? 'success' : 'error', $result['message']);
    }

    public function storeManualAccount(Request $request)
    {
        $validated = $this->validateManualAccount($request);

        PaymentManualAccount::create($validated);

        $this->settings->flush();

        AdminActivityLog::create([
            'admin_id' => auth('admin')->id(),
            'action' => "create_manual_account:{$validated['bank_name']}",
        ]);

        return back()->with('success', 'Rekening berhasil ditambahkan.');
    }

    public function updateManualAccount(Request $request, string $id)
    {
        $account = PaymentManualAccount::findOrFail($id);

        $validated = $this->validateManualAccount($request);

        $account->update($validated);

        $this->settings->flush();

        AdminActivityLog::create([
            'admin_id' => auth('admin')->id(),
            'action' => "update_manual_account:{$account->id}",
        ]);

        return back()->with('success', 'Rekening berhasil diperbarui.');
    }

    public function destroyManualAccount(string $id)
    {
        $account = PaymentManualAccount::findOrFail($id);
        $account->delete();

        $this->settings->flush();

        AdminActivityLog::create([
            'admin_id' => auth('admin')->id(),
            'action' => "delete_manual_account:{$id}",
        ]);

        return back()->with('success', 'Rekening berhasil dihapus.');
    }

    private function validateManualAccount(Request $request): array
    {
        return $request->validate([
            'bank_name' => 'required|string|max:100',
            'account_number' => 'required|string|max:50',
            'account_holder' => 'required|string|max:100',
            'branch' => 'nullable|string|max:100',
            'instructions' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0|max:999',
        ]);
    }

    private function mask(string $value): ?string
    {
        if ($value === '') {
            return null;
        }

        $tail = substr($value, -4);

        return str_repeat('•', 6).$tail;
    }
}
