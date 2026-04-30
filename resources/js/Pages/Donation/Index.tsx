import { Head, Link } from "@inertiajs/react";
import { PageProps } from "@/types";
import Header from "@/Components/Header";

export interface Fund {
  id: number;
  name: string;
  slug: string;
  description: string;
  collected_amount: string;
}

export interface Campaign {
  id: number;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  target_amount: string;
  collected_amount: string;
  end_date: string;
  status: string;
}

export default function Index(_props: PageProps) {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col">
      <Header />
      <Head title="Baitul Maal - Dynamic Everywhere" />

      <main className="flex-1 flex items-center justify-center pb-24 md:pb-0">
        <div className="w-full max-w-lg mx-auto px-6 py-20 flex flex-col items-center text-center">
          {/* COMING SOON PLACEHOLDER */}
          <div className="mb-8 flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-5xl">volunteer_activism</span>
          </div>

          <span className="mb-4 inline-block px-4 py-1 rounded-full bg-tertiary/10 text-tertiary font-label font-bold tracking-widest uppercase text-xs">
            Baitul Maal
          </span>

          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface mb-4 leading-tight tracking-tight">
            Coming Soon
          </h1>

          <p className="font-body text-on-surface-variant text-base md:text-lg mb-10 max-w-sm leading-relaxed">
            Kami sedang mempersiapkan fitur Baitul Maal untuk mendukung program donasi dan
            pengelolaan zakat alumni. Pantau terus perkembangannya!
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-full font-label font-bold shadow-sm hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Kembali ke Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
