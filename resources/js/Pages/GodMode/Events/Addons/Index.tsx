import { useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { validateFile, MAX_FILE_SIZE_MB } from "@/Helpers/fileValidation";

interface Addon {
  id: number;
  name: string;
  price: string;
  stock_quantity: number | null;
  variants: Record<string, string[]> | null;
  image_url: string | null;
}

interface AddonsIndexProps {
  admin: any;
  event: any;
  addons: Addon[];
}

export default function AddonsIndex({ admin, event, addons }: AddonsIndexProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
    _method: "POST", // Default, will change to PUT if editing
    name: "",
    price: "",
    stock_quantity: "",
    variants: "", // Stringified JSON
    image: null as File | null,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  const openCreateModal = () => {
    clearErrors();
    setFileValidationError(null);
    setEditingAddon(null);
    setData({
      _method: "POST",
      name: "",
      price: "",
      stock_quantity: "",
      variants: "",
      image: null,
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (addon: Addon) => {
    clearErrors();
    setFileValidationError(null);
    setEditingAddon(addon);
    setData({
      _method: "PUT",
      name: addon.name,
      price: parseFloat(addon.price).toString(),
      stock_quantity: addon.stock_quantity?.toString() || "",
      variants: addon.variants ? JSON.stringify(addon.variants, null, 2) : "",
      image: null,
    });
    setImagePreview(addon.image_url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file, ["image/jpeg", "image/png", "image/webp"], MAX_FILE_SIZE_MB);
      if (error) {
        setFileValidationError(error.message);
        setData("image", null);
        return;
      }
      setFileValidationError(null);
      setData("image", file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingAddon
      ? `/god-mode/events/${event.id}/addons/${editingAddon.id}`
      : `/god-mode/events/${event.id}/addons`;

    post(url, {
      onSuccess: () => closeModal(),
    });
  };

  const deleteAddon = (addon: Addon) => {
    if (confirm(`Are you sure you want to delete ${addon.name}?`)) {
      router.delete(`/god-mode/events/${event.id}/addons/${addon.id}`);
    }
  };

  return (
    <GodModeLayout admin={admin} title={`Manage Addons: ${event.title}`}>
      <Head title={`Addons - ${event.title}`} />

      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/god-mode/events/${event.id}`}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Event Details
        </Link>
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Addon
        </button>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Event Addons (Merchandise/Extras)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold w-16">Image</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Stock</th>
                <th className="px-6 py-4 font-semibold">Variants</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {addons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    No addons found. Create one above.
                  </td>
                </tr>
              ) : (
                addons.map((addon) => (
                  <tr key={addon.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      {addon.image_url ? (
                        <img
                          src={addon.image_url}
                          alt={addon.name}
                          className="w-10 h-10 object-cover rounded-md border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-white/5 rounded-md flex items-center justify-center border border-white/10">
                          <span className="material-symbols-outlined text-white/20 text-[20px]">
                            image
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">{addon.name}</td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">
                      Rp {parseInt(addon.price).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4">
                      {addon.stock_quantity !== null ? addon.stock_quantity : "Unlimited"}
                    </td>
                    <td className="px-6 py-4">
                      {addon.variants ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(addon.variants).map((key) => (
                            <span
                              key={key}
                              className="bg-white/5 text-white/80 px-2 py-0.5 rounded text-[10px] font-semibold"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(addon)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteAddon(addon)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-semibold"
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
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingAddon ? "Edit Addon" : "Create New Addon"}
              </h3>
              <button onClick={closeModal} className="text-white/50 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="addonForm" onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Addon Name
                    </label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => setData("name", e.target.value)}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                    {errors.name && <div className="text-red-400 text-xs mt-1">{errors.name}</div>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Price (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={data.price}
                      onChange={(e) => setData("price", e.target.value)}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                    {errors.price && (
                      <div className="text-red-400 text-xs mt-1">{errors.price}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Stock Quantity (Leave blank for unlimited)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={data.stock_quantity}
                      onChange={(e) => setData("stock_quantity", e.target.value)}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                    {errors.stock_quantity && (
                      <div className="text-red-400 text-xs mt-1">{errors.stock_quantity}</div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Variants (JSON Format)
                    </label>
                    <textarea
                      value={data.variants}
                      onChange={(e) => setData("variants", e.target.value)}
                      rows={3}
                      placeholder='{"size": ["S", "M", "L", "XL"]}'
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-white/40 mt-1">
                      Example:{" "}
                      <code className="bg-white/10 px-1 py-0.5 rounded">
                        {'{"size": ["S", "M"], "warna": ["Hitam"]}'}
                      </code>
                    </p>
                    {errors.variants && (
                      <div className="text-red-400 text-xs mt-1">{errors.variants}</div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Addon Image
                    </label>
                    <div className="flex items-center gap-4">
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded-lg border border-white/10 shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="block w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer"
                        />
                        {fileValidationError && (
                          <div className="text-red-400 text-xs mt-1">{fileValidationError}</div>
                        )}
                        {errors.image && (
                          <div className="text-red-400 text-xs mt-1">{errors.image}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-[#161b22]">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                form="addonForm"
                type="submit"
                disabled={processing}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? "Saving..." : "Save Addon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </GodModeLayout>
  );
}
