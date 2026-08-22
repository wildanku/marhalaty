import { FormEventHandler } from "react";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { PageProps, Store } from "@/types";
import StatusBadge from "@/Components/Store/StatusBadge";
import StoreManageLayout from "@/Layouts/StoreManageLayout";
import { storeManagementUrl } from "@/Helpers/storeManagementUrl";

interface MembersPageProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
}

export default function StoreMembers() {
  const { store, role } = usePage<MembersPageProps>().props;
  const baseUrl = storeManagementUrl(store.id);
  const isOwner = role === "owner";
  const { data, setData, post, processing, errors, reset } = useForm({ email: "" });
  const members = store.members ?? [];

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(`${baseUrl}/members`, { onSuccess: () => reset("email") });
  };

  const revoke = (memberId: number) => {
    if (!confirm("Cabut anggota ini dari toko?")) return;
    router.delete(`${baseUrl}/members/${memberId}`);
  };

  return (
    <StoreManageLayout store={store} role={role} activeNav="members">
      <Head title={`Anggota - ${store.name}`} />
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-6">Anggota</h1>
      <div className="space-y-6">
      {isOwner && (
        <form
          onSubmit={submit}
          className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high flex flex-col sm:flex-row items-start sm:items-end gap-4"
        >
          <div className="flex-1 w-full">
            <label className="block font-label text-sm font-medium text-on-surface mb-2">
              Undang anggota baru (email alumni terverifikasi)
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              placeholder="nama@email.com"
              className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
            />
            {errors.email && <p className="mt-2 text-xs text-error">{errors.email}</p>}
          </div>
          <button
            type="submit"
            disabled={processing}
            className="bg-primary text-on-primary px-6 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-75 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Kirim Undangan
          </button>
        </form>
      )}

      <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden">
        <ul className="divide-y divide-outline-variant/10">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-4 p-5">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                {member.user?.avatar_url ? (
                  <img src={member.user.avatar_url} alt={member.user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-semibold text-on-surface truncate">
                  {member.user?.name ?? "—"}
                  {member.role === "owner" && (
                    <span className="ml-2 text-xs text-primary font-label uppercase">Owner</span>
                  )}
                </p>
                <p className="text-sm text-on-surface-variant truncate">{member.user?.email}</p>
              </div>
              <StatusBadge status={member.status} />
              {isOwner && member.role !== "owner" && member.status !== "revoked" && (
                <button
                  onClick={() => revoke(member.id)}
                  className="text-error hover:bg-error/10 rounded-full p-2 transition-colors"
                  title="Cabut anggota"
                >
                  <span className="material-symbols-outlined text-[18px]">person_remove</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      </div>
    </StoreManageLayout>
  );
}
