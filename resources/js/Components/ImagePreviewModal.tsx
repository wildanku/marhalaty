import React from "react";

interface ImagePreviewModalProps {
  imagePath: string;
  fileName: string;
  onClose: () => void;
}

export default function ImagePreviewModal({
  imagePath,
  fileName,
  onClose,
}: ImagePreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-w-3xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#161b22]">
          <div className="flex-1">
            <p className="text-sm font-semibold text-white truncate">{fileName}</p>
            <p className="text-xs text-white/40 mt-0.5">Bukti Transfer</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          <img
            src={imagePath}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const errorDiv = document.createElement("div");
              errorDiv.className = "text-center text-white/60";
              errorDiv.innerHTML =
                '<span class="material-symbols-outlined text-5xl block mb-3">image_not_supported</span><p>Gambar tidak dapat dimuat</p>';
              (e.target as HTMLImageElement).parentElement?.appendChild(errorDiv);
            }}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 bg-[#161b22] p-4 flex gap-3">
          <a
            href={imagePath}
            download={fileName}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Download
          </a>
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
