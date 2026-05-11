import { Head, usePage } from "@inertiajs/react";

export default function Login() {
  const { errors } = usePage().props as any;

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6 font-body">
      <Head title="God Mode - Login" />

      <div className="w-full max-w-md bg-[#161b22] border border-white/5 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <span
              className="material-symbols-outlined text-white text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white font-headline tracking-tight">
            God Mode
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Restricted Access. Admins Only.
          </p>
        </div>

        <div className="space-y-6">
          <div className="text-center text-white/60 text-sm">
            Silakan masuk menggunakan akun Google admin yang telah terdaftar di sistem.
          </div>

          <a
            href="/god-mode/auth/google"
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-100 text-[#0f1117] font-bold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk dengan Google</span>
          </a>

          {errors.email && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-start">
              <span className="material-symbols-outlined text-red-400 text-[20px] shrink-0">
                error
              </span>
              <p className="text-sm text-red-400 font-medium leading-normal">{errors.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
