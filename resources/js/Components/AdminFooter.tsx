export default function AdminFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#0f1117]/50 py-3 px-6">
      <div className="flex items-center justify-between text-xs text-white/40">
        <p>© {new Date().getFullYear()} Marhalaty Open Source</p>
        <a
          href="https://www.satutera.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-white/60 transition-colors group"
        >
          <span>provided by </span>
          <img
            src="https://www.satutera.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsatutera-logo.e95c72b9.png&w=384&q=75"
            alt="Satutera"
            className="h-4 opacity-60 group-hover:opacity-80 transition-opacity"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </a>
      </div>
    </footer>
  );
}
