import { useTranslate } from "@/hooks/useTranslate";

export default function Footer() {
  const { t } = useTranslate();

  return (
    <footer className="bg-primary dark:bg-[#150203] full-width py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center gap-6">
        <div className="font-headline text-white font-bold text-2xl mb-4">
          Dynamic Foundation
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <a
            href="#"
            className="font-body text-sm text-white/80 hover:text-white transition-colors"
          >
            {t("Privacy Policy")}
          </a>
          <a
            href="#"
            className="font-body text-sm text-white/80 hover:text-white transition-colors"
          >
            {t("Terms of Service")}
          </a>
          <a
            href="#"
            className="font-body text-sm text-white/80 hover:text-white transition-colors"
          >
            {t("Contact Us")}
          </a>
          <a
            href="#"
            className="font-body text-sm text-white/80 hover:text-white transition-colors"
          >
            {t("Alumni Network")}
          </a>
        </div>

        <p className="font-body text-xs text-white/60">
          © {new Date().getFullYear()} Dynamic Everywhere.{" "}
          {t("Powered by Marhalaty an Open Source for Alumni Platform.")}
        </p>

        {/* Satutera Attribution */}
        <div className="mt-4 pt-6 border-t border-white/10 w-full flex flex-col items-center gap-3">
          <p className="font-body text-xs text-white/50">
            {t("Developed and designed by")}
          </p>
          <a
            href="https://www.satutera.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white/90 hover:bg-white/20 border border-white/15 hover:border-white/30 px-5 py-2.5 rounded-full transition-all duration-300 group"
            aria-label="Satutera - Digital Studio in Bali, Indonesia"
          >
            <img
              src="https://www.satutera.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsatutera-logo.e95c72b9.png&w=256&q=75"
              alt="Satutera Logo"
              className="h-5 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <span className="font-body text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
              {/* Satutera */}
            </span>
            <span className="font-body text-xs text-white/40 group-hover:text-white/60 transition-colors hidden sm:inline">
              · Bali, Indonesia
            </span>
            {/* <span className="material-symbols-outlined text-[14px] text-white/40 group-hover:text-white/70 transition-colors">
              open_in_new
            </span> */}
          </a>
        </div>
      </div>
    </footer>
  );
}
