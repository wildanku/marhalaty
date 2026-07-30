import { Head, router, usePage } from "@inertiajs/react";
import { PageProps, StoreMember } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";

interface InvitationAcceptProps extends PageProps {
  member: StoreMember | null;
  token: string;
  expired: boolean;
}

export default function InvitationAccept() {
  const { auth, member, token, expired } = usePage<InvitationAcceptProps>().props;

  const accept = () => {
    router.post(`/store-invitations/${token}`);
  };

  const renderState = () => {
    if (!member) {
      return {
        icon: "link_off",
        title: "Undangan tidak ditemukan",
        message: "Tautan undangan ini tidak valid atau sudah pernah digunakan.",
      };
    }

    if (expired) {
      return {
        icon: "hourglass_disabled",
        title: "Undangan kedaluwarsa",
        message: "Undangan ini sudah lewat masa berlaku 7 hari. Minta owner toko mengirim undangan baru.",
      };
    }

    if (!auth.user) {
      return {
        icon: "login",
        title: "Masuk untuk melanjutkan",
        message: "Kamu perlu masuk dengan akun Google yang diundang untuk menerima undangan ini.",
        action: (
          <a
            href="/auth/google/redirect"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all"
          >
            Masuk dengan Google
          </a>
        ),
      };
    }

    if (auth.user.id !== member.user_id) {
      return {
        icon: "block",
        title: "Undangan bukan untukmu",
        message: "Undangan ini ditujukan untuk akun email lain. Masuk dengan akun yang benar untuk menerimanya.",
      };
    }

    return {
      icon: "storefront",
      title: `Undangan mengelola ${member.store?.name ?? "toko"}`,
      message: "Kamu diundang untuk ikut mengelola toko ini sebagai admin toko.",
      action: (
        <button
          onClick={accept}
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all"
        >
          Terima Undangan
        </button>
      ),
    };
  };

  const state = renderState();

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title="Undangan Toko" />

      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="bg-surface-container-lowest rounded-3xl p-10 border border-surface-container-high">
          <span className="material-symbols-outlined text-5xl text-primary">{state.icon}</span>
          <h1 className="font-headline text-2xl font-bold text-on-surface mt-4">{state.title}</h1>
          <p className="text-on-surface-variant mt-2">{state.message}</p>
          {"action" in state && state.action && <div className="mt-6">{state.action}</div>}
        </div>
      </div>
      <Footer />
    </div>
  );
}
