import { useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { validateFile, MAX_FILE_SIZE_MB } from "@/Helpers/fileValidation";

interface Addon {
  id: number;
  name: string;
  image_url: string | null;
}

interface IncludedAddon {
  id: number;
  name: string;
  pivot: { included_quantity: number };
}

interface Package {
  id: number;
  name: string;
  description: string | null;
  price: string;
  quota: number | null;
  booked_count: number;
  available_quota: number | null;
  is_available: boolean;
  image_url: string | null;
  included_addons: IncludedAddon[];
}

interface PackagesIndexProps {
  admin: any;
  event: any;
  packages: Package[];
  addons: Addon[];
}

export default function PackagesIndex({ admin, event, packages, addons }: PackagesIndexProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
    _method: "POST", // Default to POST, will switch to PUT on edit
    name: "",
    description: "",
    price: "",
    quota: "",
    image: null as File | null,
    included_addons: [] as { id: number; quantity: number }[],
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  const openCreateModal = () => {
    clearErrors();
    setFileValidationError(null);
    setEditingPackage(null);
    setData({
      _method: "POST",
      name: "",
      description: "",
      price: "",
      quota: "",
      image: null,
      included_addons: [],
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: Package) => {
    clearErrors();
    setFileValidationError(null);
    setEditingPackage(pkg);
    setData({
      _method: "PUT",
      name: pkg.name,
      description: pkg.description || "",
      price: parseFloat(pkg.price).toString(),
      quota: pkg.quota?.toString() || "",
      image: null,
      included_addons: pkg.included_addons.map((a) => ({
        id: a.id,
        quantity: a.pivot.included_quantity,
      })),
    });
    setImagePreview(pkg.image_url);
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

  const toggleAddon = (addonId: number) => {
    const exists = data.included_addons.find((a) => a.id === addonId);
    if (exists) {
      setData(
        "included_addons",
        data.included_addons.filter((a) => a.id !== addonId)
      );
    } else {
      setData("included_addons", [...data.included_addons, { id: addonId, quantity: 1 }]);
    }
  };

  const updateAddonQuantity = (addonId: number, quantity: number) => {
    if (quantity < 1) return;
    setData(
      "included_addons",
      data.included_addons.map((a) => (a.id === addonId ? { ...a, quantity } : a))
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingPackage
      ? `/god-mode/events/${event.id}/packages/${editingPackage.id}`
      : `/god-mode/events/${event.id}/packages`;

    post(url, {
      onSuccess: () => closeModal(),
    });
  };

  const deletePackage = (pkg: Package) => {
    if (confirm(`Are you sure you want to delete the package ${pkg.name}?`)) {
      router.delete(`/god-mode/events/${event.id}/packages/${pkg.id}`);
    }
  };

  return (
    <GodModeLayout admin={admin} title={`Manage Packages: ${event.title}`}>
      <Head title={`Packages - ${event.title}`} />

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
          className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Package
        </button>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Event Packages (Ticketing / Tiering)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold w-16">Image</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Stok</th>
                <th className="px-6 py-4 font-semibold">Bundled Addons</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    No packages found. Create one above.
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      {pkg.image_url ? (
                        <img
                          src={pkg.image_url}
                          alt={pkg.name}
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
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{pkg.name}</div>
                      {pkg.description && (
                        <div className="text-[10px] text-white/40 mt-0.5 line-clamp-1 max-w-[200px]">
                          {pkg.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-blue-400 font-semibold">
                      Rp {parseInt(pkg.price).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4">
                      {pkg.quota !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {pkg.booked_count}/{pkg.quota}
                          </span>
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                pkg.booked_count >= pkg.quota
                                  ? "bg-red-500"
                                  : pkg.booked_count >= pkg.quota * 0.8
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min((pkg.booked_count / pkg.quota) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-white/50 italic">Unlimited</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {pkg.included_addons && pkg.included_addons.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {pkg.included_addons.map((ia) => (
                            <span
                              key={ia.id}
                              className="bg-white/5 text-white/80 px-2 py-0.5 rounded text-[10px] font-semibold"
                            >
                              {ia.name} &times;{ia.pivot.included_quantity}
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
                          onClick={() => openEditModal(pkg)}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePackage(pkg)}
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
          <div className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingPackage ? "Edit Package" : "Create New Package"}
              </h3>
              <button onClick={closeModal} className="text-white/50 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="packageForm" onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Package Name
                    </label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => setData("name", e.target.value)}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
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
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                    {errors.price && (
                      <div className="text-red-400 text-xs mt-1">{errors.price}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Quota Total (Leave blank for unlimited)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={data.quota}
                      onChange={(e) => setData("quota", e.target.value)}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-white/40 mt-1">
                      Tidak bisa dikurangi, hanya bisa ditambah atau dibiarkan unlimited
                    </p>
                    {errors.quota && (
                      <div className="text-red-400 text-xs mt-1">{errors.quota}</div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Description
                    </label>
                    <textarea
                      value={data.description}
                      onChange={(e) => setData("description", e.target.value)}
                      rows={3}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    {errors.description && (
                      <div className="text-red-400 text-xs mt-1">{errors.description}</div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Package Image / Poster
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
                          className="block w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                        />
                        {errors.image && (
                          <div className="text-red-400 text-xs mt-1">{errors.image}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bundled Addons */}
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-white/5">
                    <label className="block text-sm font-medium text-white/70 mb-3">
                      Bundled Addons / Merchandise
                    </label>
                    {addons.length === 0 ? (
                      <p className="text-xs text-white/40 italic">
                        No addons available. Create addons first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {addons.map((addon) => {
                          const included = data.included_addons.find((a) => a.id === addon.id);
                          const isSelected = !!included;
                          return (
                            <div
                              key={addon.id}
                              className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "border-blue-500 bg-blue-500/5"
                                  : "border-white/5 bg-[#0d1117]"
                              }`}
                            >
                              <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleAddon(addon.id)}
                                  className="w-4 h-4 rounded bg-black/50 border-white/20 text-blue-500 focus:ring-blue-500"
                                />
                                <span className="text-sm font-semibold text-white/90">
                                  {addon.name}
                                </span>
                              </label>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase text-white/40">Qty:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={included.quantity}
                                    onChange={(e) =>
                                      updateAddonQuantity(addon.id, parseInt(e.target.value))
                                    }
                                    className="w-16 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                form="packageForm"
                type="submit"
                disabled={processing}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? "Saving..." : "Save Package"}
              </button>
            </div>
          </div>
        </div>
      )}
    </GodModeLayout>
  );
}
