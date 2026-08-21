import { Head, Link } from "@inertiajs/react";

interface PublicPage {
  title: string;
  content: string;
}

interface PublicPageProps {
  page: PublicPage;
}

export default function PublicPageShow({ page }: PublicPageProps) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <Head title={page.title} />

      <header className="border-b border-outline-variant/40 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-headline text-sm font-bold text-primary">
            Marhalaty
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-base">home</span>
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <article className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm md:p-10">
          <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface md:text-5xl">
            {page.title}
          </h1>
          <div
            className="rich-text mt-8 text-base leading-7 text-on-surface-variant md:text-lg"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </article>
      </main>
    </div>
  );
}
