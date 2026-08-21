import { Head, Link, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import type { Admin, PaginatedPages, PageSummary } from "./types";

interface PagesIndexProps {
  admin: Admin;
  pages: PaginatedPages;
}

const formatDate = (date: string | null): string => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export default function PagesIndex({ admin, pages }: PagesIndexProps) {
  const deletePage = (page: PageSummary) => {
    if (!window.confirm(`Hapus page “${page.title}”? Tindakan ini tidak dapat dibatalkan.`)) return;

    router.delete(`/god-mode/pages/${page.id}`);
  };

  return (
    <GodModeLayout admin={admin} title="Pages">
      <Head title="God Mode - Pages" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline text-xl font-bold text-white">Pages</h2>
          <p className="mt-1 text-sm text-white/50">
            Buat landing page dengan editor Basic atau dokumen Full HTML mandiri.
          </p>
        </div>
        <Link
          href="/god-mode/pages/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-[#0f1117] shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Page
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#161b22]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="border-b border-white/5 bg-white/5 text-xs uppercase text-white/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Page</th>
                <th className="px-6 py-4 font-semibold">Mode</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Last updated</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pages.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-white/20">
                      web_asset
                    </span>
                    <p className="mt-2 font-medium text-white/55">Belum ada page.</p>
                    <p className="mt-1 text-xs text-white/35">
                      Buat page pertama untuk mendapatkan URL publik baru.
                    </p>
                  </td>
                </tr>
              ) : (
                pages.data.map((page) => (
                  <tr key={page.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{page.title}</div>
                      <a
                        href={page.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400/80 hover:text-emerald-300"
                      >
                        /{page.slug}
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                          page.mode === "full_html"
                            ? "bg-violet-500/10 text-violet-300"
                            : "bg-blue-500/10 text-blue-300"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {page.mode === "full_html" ? "html" : "edit_note"}
                        </span>
                        {page.mode === "full_html" ? "Full HTML" : "Basic"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          page.is_published ? "text-emerald-400" : "text-white/40"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            page.is_published ? "bg-emerald-400" : "bg-white/30"
                          }`}
                        />
                        {page.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>{formatDate(page.updated_at)}</div>
                      {page.updated_by && (
                        <div className="mt-1 text-xs text-white/35">by {page.updated_by}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/god-mode/pages/${page.id}/edit`}
                          className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => deletePage(page)}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages.meta.last_page > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-6 py-4">
            <p className="text-xs text-white/40">{pages.meta.total} pages</p>
            <div className="flex flex-wrap gap-1">
              {pages.links.map((link) => (
                <Link
                  key={`${link.label}-${link.url ?? "disabled"}`}
                  href={link.url ?? "#"}
                  preserveScroll
                  className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                    link.active
                      ? "bg-emerald-500 text-[#0f1117]"
                      : link.url
                        ? "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                        : "pointer-events-none text-white/20"
                  }`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
