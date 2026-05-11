import { Head, useForm, usePage } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { FormEvent, useState, useEffect } from "react";

interface Template {
  key: string;
  label: string;
  desc: string;
}

interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface MailConfig {
  mailer: string;
  host: string;
  port: number;
  from: string;
  scheme: string | null;
}

interface PageFlash {
  success?: string;
  error?: string;
}

interface Props {
  admin: Admin;
  templates: Template[];
  mailConfig?: MailConfig;
}

export default function EmailTesterIndex({ admin, templates, mailConfig }: Props) {
  const { props } = usePage<{ flash: PageFlash }>();
  const flash = props.flash ?? {};

  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0]?.key ?? "test");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { data, setData, post, processing, reset } = useForm({
    email: "",
    template: templates[0]?.key ?? "test",
    note: "",
  });

  const handleTemplateSelect = (key: string) => {
    setSelectedTemplate(key);
    setData("template", key);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    post("/god-mode/email-tester/send", {
      onSuccess: (page: any) => {
        const response = page.props;
        if (response?.message) {
          setSuccessMessage(response.message);
          reset("email", "note");
          setTimeout(() => setSuccessMessage(""), 5000);
        }
      },
      onError: (errors: any) => {
        if (errors?.message) {
          setErrorMessage(errors.message);
        } else {
          setErrorMessage("Terjadi kesalahan saat mengirim email.");
        }
        setTimeout(() => setErrorMessage(""), 5000);
      },
    });
  };

  const activeTemplate = templates.find((t) => t.key === selectedTemplate);

  return (
    <GodModeLayout admin={admin} title="Email Tester">
      <Head title="God Mode – Email Tester" />

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">mail</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-headline">Email Tester</h1>
            <p className="text-white/50 text-sm">
              Kirim test email untuk memverifikasi SMTP dan template desain.
            </p>
          </div>
        </div>
      </div>

      {/* ── Flash Messages ── */}
      {(flash.success || successMessage) && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-emerald-400 text-[20px] mt-0.5">
            check_circle
          </span>
          <p className="text-emerald-400 text-sm leading-relaxed">
            {successMessage || flash.success}
          </p>
        </div>
      )}
      {(flash.error || errorMessage) && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-400 text-[20px] mt-0.5">error</span>
          <p className="text-red-400 text-sm leading-relaxed">{errorMessage || flash.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Template Selector ── */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
            Pilih Template
          </h2>
          {templates.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => handleTemplateSelect(tpl.key)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                selectedTemplate === tpl.key
                  ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_0_1px_rgba(52,211,153,0.2)]"
                  : "bg-[#161b22] border-white/5 hover:border-white/10 hover:bg-[#1c2128]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedTemplate === tpl.key
                      ? "border-emerald-400 bg-emerald-400"
                      : "border-white/20"
                  }`}
                >
                  {selectedTemplate === tpl.key && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      selectedTemplate === tpl.key ? "text-emerald-300" : "text-white/80"
                    }`}
                  >
                    {tpl.label}
                  </p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{tpl.desc}</p>
                </div>
              </div>
            </button>
          ))}

          {/* SMTP Status card */}
          <div className="mt-6 p-4 bg-[#161b22] border border-white/5 rounded-xl">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
              SMTP Config
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/60">
                  Mailer: <code className="text-emerald-300">{mailConfig?.mailer || "—"}</code>
                </span>
              </div>
              <div className="text-white/50">
                {mailConfig?.host && (
                  <>
                    <p>
                      Host: <code className="text-amber-300">{mailConfig.host}</code>
                    </p>
                    <p>
                      Port: <code className="text-amber-300">{mailConfig.port}</code>
                    </p>
                    {mailConfig.scheme && (
                      <p>
                        Scheme: <code className="text-amber-300">{mailConfig.scheme}</code>
                      </p>
                    )}
                  </>
                )}
              </div>
              <p className="text-white/30 text-xs leading-relaxed pt-2">
                {mailConfig?.mailer === "log" && (
                  <span className="text-amber-400">
                    ⚠️ Email dikirim ke log, bukan SMTP. Ubah MAIL_MAILER di .env
                  </span>
                )}
                {mailConfig?.mailer === "smtp" && (
                  <span className="text-emerald-400">✓ SMTP mode aktif</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Send Form ── */}
        <div className="lg:col-span-3">
          <form
            onSubmit={handleSubmit}
            className="bg-[#161b22] border border-white/5 rounded-2xl p-6"
          >
            <h2 className="text-white font-bold text-base mb-6 font-headline">Kirim Test Email</h2>

            {/* Active template badge */}
            <div className="mb-6 p-3 bg-[#0d1117] rounded-xl border border-white/5">
              <p className="text-xs text-white/40 mb-1">Template aktif:</p>
              <p className="text-sm text-emerald-300 font-semibold">
                {activeTemplate?.label ?? "—"}
              </p>
            </div>

            {/* Email input */}
            <div className="mb-5">
              <label htmlFor="email-input" className="block text-sm font-medium text-white/70 mb-2">
                Alamat Email Tujuan <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/30 text-[18px]">
                  alternate_email
                </span>
                <input
                  id="email-input"
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={data.email}
                  onChange={(e) => setData("email", e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            {/* Note input (for test template) */}
            {selectedTemplate === "test" && (
              <div className="mb-5">
                <label
                  htmlFor="note-input"
                  className="block text-sm font-medium text-white/70 mb-2"
                >
                  Catatan Admin <span className="text-white/30 text-xs">(opsional)</span>
                </label>
                <textarea
                  id="note-input"
                  rows={3}
                  placeholder="Tambahkan catatan yang akan muncul di email test..."
                  value={data.note}
                  onChange={(e) => setData("note", e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none"
                />
              </div>
            )}

            {/* Info note for dummy templates */}
            {selectedTemplate !== "test" && (
              <div className="mb-5 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[16px] mt-0.5">
                    info
                  </span>
                  <p className="text-xs text-amber-400/80 leading-relaxed">
                    Template ini menggunakan data nyata dari database (RSVP/Transaksi terbaru). Jika
                    database kosong, akan dikirim plain test email sebagai fallback.
                  </p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={processing || !data.email}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm shadow-[0_4px_16px_rgba(52,211,153,0.15)]"
            >
              {processing ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    autorenew
                  </span>
                  Mengirim...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Kirim Test Email
                </>
              )}
            </button>

            <p className="text-xs text-white/25 text-center mt-4">
              Email dikirim synchronous (tidak melalui queue) agar hasilnya langsung terlihat.
            </p>
          </form>

          {/* How-to card */}
          <div className="mt-4 p-5 bg-[#161b22] border border-white/5 rounded-2xl">
            <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-white/40">help</span>
              Cara Penggunaan
            </h3>
            <ol className="space-y-2 text-xs text-white/40 leading-relaxed list-none">
              <li className="flex gap-2">
                <span className="text-emerald-400/60 font-bold">1.</span>
                Pilih template email di sebelah kiri.
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400/60 font-bold">2.</span>
                Masukkan alamat email tujuan (inbox Mailtrap atau email asli saat produksi).
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400/60 font-bold">3.</span>
                Klik "Kirim Test Email" dan cek inbox Mailtrap di{" "}
                <a
                  href="https://mailtrap.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400/60 hover:text-emerald-400 underline"
                >
                  mailtrap.io
                </a>
                .
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400/60 font-bold">4.</span>
                Ganti <code className="text-emerald-400/60">MAIL_USERNAME</code> dan{" "}
                <code className="text-emerald-400/60">MAIL_PASSWORD</code> di{" "}
                <code className="text-emerald-400/60">.env</code> dengan kredensial Mailtrap kamu.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </GodModeLayout>
  );
}
