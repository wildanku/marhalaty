const DONATION_QRIS_IMAGE_URL =
  "https://storage.googleapis.com/hala-storage-public/qris-dynamic.jpeg";

/**
 * A post-payment invitation displayed only after a payment has succeeded or a manual transfer
 * proof has been submitted. The QRIS is intentionally a public image so checkout flows do not
 * need another authenticated API request.
 */
export default function DonationNotice() {
  return (
    <section
      aria-labelledby="donation-notice-title"
      className="mb-6 overflow-hidden rounded-3xl border border-primary/20 bg-primary-container/20"
    >
      <div className="p-6 text-center sm:p-8">
        <span className="material-symbols-outlined text-4xl text-primary">volunteer_activism</span>
        <h2
          id="donation-notice-title"
          className="mt-2 font-headline text-xl font-bold text-on-surface"
        >
          Wakaf / Donasi
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">
          Terima kasih telah menyelesaikan transaksi. Jika berkenan, lanjutkan kebaikan dengan wakaf
          atau donasi melalui QRIS berikut.
        </p>

        <div className="mx-auto mt-5 w-fit rounded-2xl bg-surface-container-lowest p-3 shadow-sm">
          <img
            src={DONATION_QRIS_IMAGE_URL}
            alt="QRIS untuk wakaf dan donasi"
            width={240}
            height={240}
            loading="lazy"
            className="h-56 w-56 rounded-xl object-contain sm:h-60 sm:w-60"
          />
        </div>
        <p className="mt-3 text-xs font-label font-semibold uppercase tracking-wider text-primary">
          Scan QRIS untuk berdonasi
        </p>
      </div>
    </section>
  );
}
