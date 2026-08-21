import { FormEvent, useEffect, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import RichTextEditor from "@/Components/RichTextEditor";
import GodModeLayout from "@/Layouts/GodModeLayout";
import type { Admin, ManagedPage, PageMode } from "./types";

interface PageFormData {
  title: string;
  slug: string;
  mode: PageMode;
  content: string;
  is_published: boolean;
}

interface SlugCheckResponse {
  available: boolean;
  message: string;
}

type AvailabilityState =
  | { status: "idle" | "checking" | "error"; message: string | null }
  | { status: "available" | "unavailable"; message: string };

interface PageFormProps {
  admin: Admin;
  baseUrl: string;
  page?: ManagedPage;
}

const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function PageForm({ admin, baseUrl, page }: PageFormProps) {
  const isEditing = page !== undefined;
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);
  const [availability, setAvailability] = useState<AvailabilityState>({
    status: "idle",
    message: null,
  });

  const { data, setData, post, put, processing, errors } = useForm<PageFormData>({
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    mode: page?.mode ?? "basic",
    content: page?.content ?? "",
    is_published: page?.is_published ?? false,
  });

  useEffect(() => {
    if (data.slug.length === 0) {
      setAvailability({ status: "idle", message: null });
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      setAvailability({
        status: "unavailable",
        message: "Gunakan huruf kecil, angka, dan tanda hubung saja.",
      });
      return;
    }

    const controller = new AbortController();
    setAvailability({ status: "checking", message: "Memeriksa URL..." });

    const timeoutId = window.setTimeout(async () => {
      const params = new URLSearchParams({ slug: data.slug });
      if (page) params.set("page_id", String(page.id));

      try {
        const response = await fetch(`/god-mode/pages/check-slug?${params.toString()}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Slug check failed");

        const result = (await response.json()) as SlugCheckResponse;
        setAvailability({
          status: result.available ? "available" : "unavailable",
          message: result.message,
        });
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailability({
          status: "error",
          message: "Pengecekan otomatis gagal. URL tetap akan dicek saat disimpan.",
        });
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [data.slug, page]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (page) {
      put(`/god-mode/pages/${page.id}`);
      return;
    }

    post("/god-mode/pages");
  };

  const handleTitleChange = (title: string) => {
    setData((current) => ({
      ...current,
      title,
      slug: slugManuallyEdited ? current.slug : slugify(title),
    }));
  };

  const availabilityColor =
    availability.status === "available"
      ? "text-emerald-400"
      : availability.status === "unavailable"
        ? "text-red-400"
        : "text-white/40";

  return (
    <GodModeLayout admin={admin} title={isEditing ? "Edit Page" : "Create Page"}>
      <Head title={`God Mode - ${isEditing ? "Edit Page" : "Create Page"}`} />

      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/god-mode/pages"
            className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Pages
          </Link>

          {page?.is_published && (
            <a
              href={page.public_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              View published page
              <span className="material-symbols-outlined text-base">open_in_new</span>
            </a>
          )}
        </div>

        <form onSubmit={submit} className="space-y-6">
          <section className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
            <div className="mb-6">
              <h2 className="font-headline text-xl font-bold text-white">
                {isEditing ? "Page details" : "New page"}
              </h2>
              <p className="mt-1 text-sm text-white/45">
                Atur judul, alamat publik, mode tampilan, dan status page.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="page-title"
                  className="mb-2 block text-sm font-medium text-white/70"
                >
                  Title
                </label>
                <input
                  id="page-title"
                  type="text"
                  value={data.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-4 py-2.5 text-white transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Tentang Kami"
                />
                {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="page-slug" className="mb-2 block text-sm font-medium text-white/70">
                  Public URL
                </label>
                <div className="flex overflow-hidden rounded-lg border border-white/10 bg-[#0d1117] focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                  <span className="max-w-[55%] truncate border-r border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/35">
                    {baseUrl}/
                  </span>
                  <input
                    id="page-slug"
                    type="text"
                    value={data.slug}
                    onChange={(event) => {
                      setSlugManuallyEdited(true);
                      setData("slug", slugify(event.target.value));
                    }}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white focus:outline-none"
                    placeholder="tentang-kami"
                  />
                </div>
                <div className="mt-1.5 flex min-h-5 items-start justify-between gap-2">
                  <p className={`text-xs ${availabilityColor}`}>{availability.message}</p>
                  {slugManuallyEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setSlugManuallyEdited(false);
                        setData("slug", slugify(data.title));
                      }}
                      className="shrink-0 text-xs text-white/40 hover:text-emerald-400"
                    >
                      Generate ulang
                    </button>
                  )}
                </div>
                {errors.slug && <p className="mt-1 text-sm text-red-400">{errors.slug}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
            <h3 className="font-headline text-base font-bold text-white">Rendering mode</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setData("mode", "basic")}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  data.mode === "basic"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-white/10 bg-[#0d1117] hover:border-white/20"
                }`}
              >
                <span className="material-symbols-outlined text-emerald-400">edit_note</span>
                <span className="mt-2 block text-sm font-bold text-white">Basic editor</span>
                <span className="mt-1 block text-xs leading-5 text-white/45">
                  Konten aman dengan format teks, heading, list, kutipan, dan tautan.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setData("mode", "full_html")}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  data.mode === "full_html"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-white/10 bg-[#0d1117] hover:border-white/20"
                }`}
              >
                <span className="material-symbols-outlined text-emerald-400">html</span>
                <span className="mt-2 block text-sm font-bold text-white">Full HTML</span>
                <span className="mt-1 block text-xs leading-5 text-white/45">
                  Dokumen HTML utuh dengan style dan script sendiri, terisolasi dari CSS aplikasi.
                </span>
              </button>
            </div>
            {errors.mode && <p className="mt-2 text-sm text-red-400">{errors.mode}</p>}
          </section>

          <section className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-headline text-base font-bold text-white">Content</h3>
                <p className="mt-1 text-sm text-white/45">
                  {data.mode === "basic"
                    ? "Tulis dan format konten page menggunakan editor."
                    : "Paste dokumen lengkap mulai dari <!DOCTYPE html> bila tersedia."}
                </p>
              </div>
              <span className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/45">
                {data.mode === "basic" ? "Basic" : "Full HTML"}
              </span>
            </div>

            {data.mode === "basic" ? (
              <RichTextEditor
                value={data.content}
                onChange={(content) => setData("content", content)}
                placeholder="Mulai tulis konten page..."
                variant="dark"
              />
            ) : (
              <>
                <div className="mb-3 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200/80">
                  <span className="material-symbols-outlined text-xl text-amber-400">warning</span>
                  <p>
                    Full HTML disimpan apa adanya. Pastikan hanya menggunakan kode dari sumber yang
                    tepercaya. Halaman publik berjalan dalam sandbox dan tidak memuat CSS aplikasi.
                  </p>
                </div>
                <textarea
                  value={data.content}
                  onChange={(event) => setData("content", event.target.value)}
                  rows={24}
                  spellCheck={false}
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 font-mono text-xs leading-6 text-white/90 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder={
                    "<!DOCTYPE html>\n<html>\n<head>\n  <style>/* style sendiri */</style>\n</head>\n<body>...</body>\n</html>"
                  }
                />
              </>
            )}
            {errors.content && <p className="mt-2 text-sm text-red-400">{errors.content}</p>}
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#161b22] p-6 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={data.is_published}
                onChange={(event) => setData("is_published", event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#0d1117] text-emerald-500 focus:ring-emerald-500"
              />
              <span>
                <span className="block text-sm font-semibold text-white">Publish page</span>
                <span className="block text-xs text-white/40">
                  Jika nonaktif, URL publik akan mengembalikan halaman 404.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={processing || availability.status === "unavailable"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-[#0f1117] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {processing ? "Saving..." : isEditing ? "Save changes" : "Create page"}
            </button>
          </section>
        </form>
      </div>
    </GodModeLayout>
  );
}
