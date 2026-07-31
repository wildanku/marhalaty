import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

const ALLOWED_TAGS_HINT =
  "Tag yang didukung: p, strong, em, u, s, ul, ol, li, a, h2, h3, blockquote";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Visual theme: "light" matches the Material surface tokens (default, e.g. Store pages);
   *  "dark" matches GodMode's dark admin palette (bg-[#0d1117], border-white/10, emerald accent). */
  variant?: "light" | "dark";
  /** Adds an Editor/HTML mode toggle so power users can paste or hand-edit raw markup. Off by
   *  default so existing callers (Store product form) are unaffected. */
  allowHtmlMode?: boolean;
}

interface ToolbarButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  variant: "light" | "dark";
}

function ToolbarButton({ label, icon, active, onClick, variant }: ToolbarButtonProps) {
  const activeClass =
    variant === "dark"
      ? "bg-emerald-500/10 text-emerald-400"
      : "bg-primary-container text-on-primary-container";
  const inactiveClass =
    variant === "dark"
      ? "text-white/50 hover:bg-white/5 hover:text-white"
      : "text-on-surface-variant hover:bg-surface-container-highest";

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${active ? activeClass : inactiveClass}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

// Allowed marks/nodes are kept in lockstep with HtmlSanitizerService's allow-list
// (p,br,strong,b,em,i,u,s,ul,ol,li,a[href],h2,h3,blockquote) — anything else (code, hr, ...)
// is disabled here so formatting never silently disappears after the server sanitizes it.
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  variant = "light",
  allowHtmlMode = false,
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [mode, setMode] = useState<"editor" | "html">("editor");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener nofollow", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Tulis deskripsi produk..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `rich-text min-h-[140px] px-4 py-3 focus:outline-none ${variant === "dark" ? "rich-text--dark text-white" : ""}`,
      },
    },
  });

  // The HTML textarea edits `value` directly, bypassing the editor — resync the editor's
  // document from `value` when switching back so it reflects any hand-edited markup (Tiptap's
  // schema silently drops anything outside the allow-list above, same as the server sanitizer).
  useEffect(() => {
    if (mode === "editor" && editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [mode]);

  if (!editor) return null;

  const toggleLinkInput = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setLinkUrl("");
    setShowLinkInput((current) => !current);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const wrapperClass =
    variant === "dark"
      ? "rounded-lg bg-[#0d1117] border border-white/10 focus-within:border-emerald-500 transition-colors"
      : "rounded-t-DEFAULT bg-surface-container-high border-0 border-b-2 border-transparent focus-within:border-primary transition-colors";
  const dividerClass =
    variant === "dark" ? "w-px h-5 bg-white/10 mx-1" : "w-px h-5 bg-outline-variant/40 mx-1";
  const linkInputClass =
    variant === "dark"
      ? "flex-1 py-1.5 px-3 bg-[#0f1117] rounded-lg border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
      : "flex-1 py-1.5 px-3 bg-surface rounded-lg border border-outline text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const applyLinkClass = `text-xs font-label font-medium px-2 py-1.5 shrink-0 ${variant === "dark" ? "text-emerald-400" : "text-primary"}`;
  const modeToggleContainerClass =
    variant === "dark"
      ? "flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5"
      : "flex items-center gap-0.5 rounded-lg bg-surface-container-highest p-0.5";
  const modeTabClass = (isActive: boolean) =>
    `px-2.5 py-1 rounded-md text-xs font-label font-medium transition-colors ${
      isActive
        ? variant === "dark"
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-primary-container text-on-primary-container"
        : variant === "dark"
          ? "text-white/40 hover:text-white/70"
          : "text-on-surface-variant/60 hover:text-on-surface-variant"
    }`;
  const htmlTextareaClass =
    variant === "dark"
      ? "w-full min-h-[140px] px-4 py-3 bg-transparent text-white/90 font-mono text-xs focus:outline-none resize-y"
      : "w-full min-h-[140px] px-4 py-3 bg-transparent text-on-surface font-mono text-xs focus:outline-none resize-y";
  const htmlHintClass =
    variant === "dark"
      ? "px-4 pb-3 text-[11px] text-white/30"
      : "px-4 pb-3 text-[11px] text-on-surface-variant/60";

  return (
    <div className={wrapperClass}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2">
        <div className="flex flex-wrap items-center gap-1">
          {mode === "editor" && (
            <>
              <ToolbarButton
                label="Tebal"
                icon="format_bold"
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
                variant={variant}
              />
              <ToolbarButton
                label="Miring"
                icon="format_italic"
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                variant={variant}
              />
              <ToolbarButton
                label="Coret"
                icon="format_strikethrough"
                active={editor.isActive("strike")}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                variant={variant}
              />
              <span className={dividerClass} />
              <ToolbarButton
                label="Judul"
                icon="format_h2"
                active={editor.isActive("heading", { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                variant={variant}
              />
              <ToolbarButton
                label="Sub judul"
                icon="format_h3"
                active={editor.isActive("heading", { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                variant={variant}
              />
              <span className={dividerClass} />
              <ToolbarButton
                label="Daftar poin"
                icon="format_list_bulleted"
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                variant={variant}
              />
              <ToolbarButton
                label="Daftar bernomor"
                icon="format_list_numbered"
                active={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                variant={variant}
              />
              <ToolbarButton
                label="Kutipan"
                icon="format_quote"
                active={editor.isActive("blockquote")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                variant={variant}
              />
              <span className={dividerClass} />
              <ToolbarButton
                label="Tautan"
                icon="link"
                active={editor.isActive("link")}
                onClick={toggleLinkInput}
                variant={variant}
              />
            </>
          )}
        </div>

        {allowHtmlMode && (
          <div className={modeToggleContainerClass}>
            <button
              type="button"
              onClick={() => setMode("editor")}
              className={modeTabClass(mode === "editor")}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setMode("html")}
              className={modeTabClass(mode === "html")}
            >
              HTML
            </button>
          </div>
        )}
      </div>

      {mode === "editor" && showLinkInput && (
        <div className="flex items-center gap-2 px-3 pb-2 pt-1">
          <input
            type="url"
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setShowLinkInput(false);
            }}
            placeholder="https://..."
            className={linkInputClass}
          />
          <button type="button" onClick={applyLink} className={applyLinkClass}>
            Terapkan
          </button>
        </div>
      )}

      {mode === "editor" ? (
        <EditorContent editor={editor} />
      ) : (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="<p>Tulis HTML mentah di sini...</p>"
            spellCheck={false}
            className={htmlTextareaClass}
          />
          <p className={htmlHintClass}>{ALLOWED_TAGS_HINT}</p>
        </>
      )}
    </div>
  );
}
