import { Head, Link } from "@inertiajs/react";
import { useTranslate } from "@/hooks/useTranslate";

export default function Login() {
  const { t } = useTranslate();

  return (
    <div className="min-h-screen bg-surface antialiased flex font-body">
      <Head title="Masuk — Dynamic Foundation" />

      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-[500px] h-[500px] rounded-full bg-tertiary/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-bold text-white font-headline tracking-tight hover:opacity-80 transition-opacity"
          >
            Dynamic Foundation
          </Link>

          {/* Center content */}
          <div className="flex flex-col gap-6">
            <span className="inline-block w-fit px-4 py-1.5 rounded-full bg-white/10 text-white/80 font-label text-sm tracking-wider uppercase">
              Gontor 2013 · Dynamic
            </span>
            <h2 className="font-headline text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Sambung Rasa,
              <br />
              <span className="text-tertiary-fixed">Bangun Karya</span>
            </h2>
            <p className="text-white/70 font-body text-lg max-w-sm leading-relaxed">
              Portal terpadu untuk alumni Gontor 2013 agar tetap terhubung, berkolaborasi, dan
              berkontribusi.
            </p>
          </div>

          {/* Bottom quote */}
          <blockquote className="border-l-2 border-white/30 pl-5">
            <p className="text-white/60 font-body italic text-sm leading-relaxed">
              "Berkhidmat kepada masyarakat adalah bagian dari iman."
            </p>
          </blockquote>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden mb-12 text-center">
          <Link href="/" className="text-2xl font-bold text-primary font-headline tracking-tight">
            Dynamic Foundation
          </Link>
          <p className="text-on-surface-variant text-sm mt-1 font-body">Gontor 2013 · Dynamic</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-headline text-3xl font-extrabold text-on-surface mb-2 tracking-tight">
              {t("Selamat Datang")} 👋
            </h1>
            <p className="text-on-surface-variant font-body text-sm leading-relaxed">
              Masuk menggunakan akun Google kamu untuk mengakses platform alumni.
            </p>
          </div>

          {/* Google Login Button */}
          <a
            href="/auth/google/redirect"
            className="group w-full flex items-center justify-center gap-4 bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 hover:shadow-[0px_4px_24px_rgba(80,100,71,0.12)] px-6 py-4 rounded-2xl font-label font-semibold text-on-surface transition-all duration-300"
          >
            {/* Google SVG icon */}
            <svg
              className="w-5 h-5 shrink-0"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="group-hover:text-primary transition-colors">
              {t("Masuk dengan Google")}
            </span>
          </a>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-outline-variant/30"></div>
            <span className="text-xs text-on-surface-variant font-body uppercase tracking-wider">
              Hanya untuk alumni Gontor 2013
            </span>
            <div className="flex-1 h-px bg-outline-variant/30"></div>
          </div>

          {/* Info notice */}
          <div className="bg-secondary-container/40 rounded-2xl p-5 flex gap-3">
            <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5">
              info
            </span>
            <p className="text-on-surface-variant font-body text-sm leading-relaxed">
              Platform ini hanya dapat diakses oleh alumni yang terdaftar. Setelah masuk, kamu akan
              diminta melengkapi profil jika ini pertama kali.
            </p>
          </div>

          {/* Back to home */}
          <div className="mt-10 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-body"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Kembali ke beranda
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-16 text-xs text-on-surface-variant/50 font-body text-center">
          © {new Date().getFullYear()} Dynamic Foundation · Powered by Marhalaty
        </p>
      </div>
    </div>
  );
}
