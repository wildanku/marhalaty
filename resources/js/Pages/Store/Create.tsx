import { FormEventHandler, useState } from "react";
import { Head, useForm } from "@inertiajs/react";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import RegionPicker from "@/Components/Store/RegionPicker";

export default function Create() {
  const { data, setData, post, processing, errors } = useForm({
    name: "",
    description: "",
    contact_phone: "",
    contact_email: "",
    logo: null as File | null,
    recipient_name: "",
    phone: "",
    address_line: "",
    village_id: "",
    lat: "",
    lng: "",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post("/my/stores");
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title="Ajukan Toko" />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface">Ajukan Toko Baru</h1>
          <p className="text-on-surface-variant mt-2">
            Toko akan tampil publik setelah disetujui admin. Kamu akan menerima email setelah
            ditinjau.
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl p-8 md:p-12 shadow-[0px_20px_60px_rgba(80,100,71,0.05)] border border-surface-container-high">
          <form onSubmit={submit} className="space-y-8">
            <section>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-4 border-b border-surface-container pb-3">
                Profil Toko
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    Nama Toko
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData("name", e.target.value)}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                    placeholder="mis. Dapur Nyai"
                  />
                  {errors.name && <p className="mt-2 text-xs text-error">{errors.name}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    value={data.description}
                    onChange={(e) => setData("description", e.target.value)}
                    rows={4}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                    placeholder="Ceritakan produk/jasa yang kamu jual"
                  />
                  {errors.description && <p className="mt-2 text-xs text-error">{errors.description}</p>}
                </div>

                <div>
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    No. WhatsApp Toko
                  </label>
                  <input
                    type="tel"
                    value={data.contact_phone}
                    onChange={(e) => setData("contact_phone", e.target.value)}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                    placeholder="081234567890"
                  />
                  {errors.contact_phone && <p className="mt-2 text-xs text-error">{errors.contact_phone}</p>}
                </div>

                <div>
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    Email Toko (opsional)
                  </label>
                  <input
                    type="email"
                    value={data.contact_email}
                    onChange={(e) => setData("contact_email", e.target.value)}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                    placeholder="toko@email.com"
                  />
                  {errors.contact_email && <p className="mt-2 text-xs text-error">{errors.contact_email}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">Logo Toko</label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <img src={logoPreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-outline-variant/30" />
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setData("logo", file);
                        setLogoPreview(file ? URL.createObjectURL(file) : null);
                      }}
                      className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary-container file:text-on-primary-container file:font-label file:font-medium"
                    />
                  </div>
                  {errors.logo && <p className="mt-2 text-xs text-error">{errors.logo}</p>}
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-4 border-b border-surface-container pb-3">
                Alamat Pengiriman (Asal Barang)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    value={data.recipient_name}
                    onChange={(e) => setData("recipient_name", e.target.value)}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                  />
                  {errors.recipient_name && <p className="mt-2 text-xs text-error">{errors.recipient_name}</p>}
                </div>
                <div>
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    No. Telepon
                  </label>
                  <input
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData("phone", e.target.value)}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                  />
                  {errors.phone && <p className="mt-2 text-xs text-error">{errors.phone}</p>}
                </div>

                <div className="sm:col-span-2">
                  <RegionPicker
                    onSelectVillage={(village) => setData("village_id", village.id)}
                  />
                  {errors.village_id && <p className="mt-2 text-xs text-error">{errors.village_id}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    Alamat Lengkap
                  </label>
                  <textarea
                    value={data.address_line}
                    onChange={(e) => setData("address_line", e.target.value)}
                    rows={3}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                    placeholder="Nama jalan, RT/RW, patokan"
                  />
                  {errors.address_line && <p className="mt-2 text-xs text-error">{errors.address_line}</p>}
                </div>
              </div>
            </section>

            <div className="pt-4 flex items-center justify-end gap-6 border-t border-outline-variant/20">
              <button
                type="submit"
                disabled={processing}
                className="bg-primary text-on-primary px-8 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                Kirim Pengajuan
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
