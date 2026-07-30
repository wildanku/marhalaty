import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface ToolbarButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, icon, active, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
        active ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container-highest"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

// Allowed marks/nodes are kept in lockstep with HtmlSanitizerService's allow-list
// (p,br,strong,b,em,i,u,s,ul,ol,li,a[href],h2,h3,blockquote) — anything else (code, hr, ...)
// is disabled here so formatting never silently disappears after the server sanitizes it.
export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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
        class: "rich-text min-h-[140px] px-4 py-3 focus:outline-none",
      },
    },
  });

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

  return (
    <div className="rounded-t-DEFAULT bg-surface-container-high border-0 border-b-2 border-transparent focus-within:border-primary transition-colors">
      <div className="flex flex-wrap items-center gap-1 px-2 pt-2">
        <ToolbarButton label="Tebal" icon="format_bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton
          label="Miring"
          icon="format_italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Coret"
          icon="format_strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <span className="w-px h-5 bg-outline-variant/40 mx-1" />
        <ToolbarButton
          label="Judul"
          icon="format_h2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="Sub judul"
          icon="format_h3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <span className="w-px h-5 bg-outline-variant/40 mx-1" />
        <ToolbarButton
          label="Daftar poin"
          icon="format_list_bulleted"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Daftar bernomor"
          icon="format_list_numbered"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Kutipan"
          icon="format_quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <span className="w-px h-5 bg-outline-variant/40 mx-1" />
        <ToolbarButton label="Tautan" icon="link" active={editor.isActive("link")} onClick={toggleLinkInput} />
      </div>

      {showLinkInput && (
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
            className="flex-1 py-1.5 px-3 bg-surface rounded-lg border border-outline text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="button" onClick={applyLink} className="text-xs font-label font-medium text-primary px-2 py-1.5 shrink-0">
            Terapkan
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
