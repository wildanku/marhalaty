import { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { validateFile, MAX_FILE_SIZE_MB } from "@/Helpers/fileValidation";
import { ProductOption } from "@/types";
import AddonVariantEditor, { AddonVariantDraft } from "@/Components/Event/AddonVariantEditor";

interface AddonVariant {
  id: number;
  option1_name: string;
  option1_value: string;
  option2_name: string | null;
  option2_value: string | null;
  price: string;
  label: string;
}

interface Addon {
  id: number;
  name: string;
  price: string | null;
  stock_quantity: number | null;
  has_variants: boolean;
  options: ProductOption[] | null;
  form_fields: unknown[] | null;
  variants: AddonVariant[];
  display_price: string;
  image_url: string | null;
  is_product_linked: boolean;
  available_stock: number | null;
  product?: { id: string; name: string; store?: { id: string; name: string } | null } | null;
  variant?: { id: string; label: string } | null;
}

interface ProductVariantOption {
  id: string;
  label: string;
  price: string;
  stock_quantity: number;
  option1_name: string;
  option1_value: string;
  option2_name: string | null;
  option2_value: string | null;
}

interface ProductSearchResult {
  id: string;
  label: string;
  name: string;
  store_name: string | null;
  type: "physical" | "digital";
  status: string;
  has_variants: boolean;
  display_price: string;
  available_stock: number;
  image_url: string | null;
  variants: ProductVariantOption[];
}

interface LinkedVariantDraft {
  product_variant_id: string;
  price: string;
}

interface AddonsIndexProps {
  admin: any;
  event: any;
  addons: Addon[];
}

export default function AddonsIndex({ admin, event, addons }: AddonsIndexProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
    _method: "POST", // Default, will change to PUT if editing
    name: "",
    price: "",
    stock_quantity: "",
    has_variants: false,
    options: [] as ProductOption[],
    variants: [] as AddonVariantDraft[],
    form_fields: "", // Stringified JSON — small/legacy feature, kept as raw JSON like before
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
      has_variants: false,
      options: [],
      variants: [],
      form_fields: "",
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
      price: addon.price ? parseFloat(addon.price).toString() : "",
      stock_quantity: addon.stock_quantity?.toString() || "",
      has_variants: addon.has_variants,
      options: addon.options ?? [],
      variants: addon.variants.map((v) => ({
        option1_value: v.option1_value,
        option2_value: v.option2_value,
        price: v.price,
      })),
      form_fields: addon.form_fields ? JSON.stringify(addon.form_fields, null, 2) : "",
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

    let parsedFormFields: unknown = null;
    if (data.form_fields.trim()) {
      try {
        parsedFormFields = JSON.parse(data.form_fields);
      } catch {
        alert("Format JSON pada Form Tambahan tidak valid.");
        return;
      }
    }

    const url = editingAddon
      ? `/god-mode/events/${event.id}/addons/${editingAddon.id}`
      : `/god-mode/events/${event.id}/addons`;

    transform((formData) => ({ ...formData, form_fields: parsedFormFields }));
    post(url, {
      forceFormData: true,
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Ambil dari Produk Toko
          </button>
          <button
            onClick={openCreateModal}
            className="bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Addon
          </button>
        </div>
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
                    <td className="px-6 py-4 font-semibold text-white">
                      {addon.name}
                      {addon.is_product_linked && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <span className="material-symbols-outlined text-[12px]">storefront</span>
                            Dari toko: {addon.product?.store?.name ?? "—"}
                            {addon.variant && ` · Terkunci ke ${addon.variant.label}`}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">
                      {addon.has_variants ? (
                        <>
                          mulai Rp {parseInt(addon.display_price).toLocaleString("id-ID")}
                        </>
                      ) : (
                        <>Rp {parseInt(addon.display_price).toLocaleString("id-ID")}</>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {addon.is_product_linked
                        ? `${addon.available_stock ?? 0} (dari produk)`
                        : addon.stock_quantity !== null
                          ? addon.stock_quantity
                          : "Unlimited"}
                    </td>
                    <td className="px-6 py-4">
                      {addon.has_variants && addon.options ? (
                        <div className="flex flex-wrap gap-1">
                          {addon.options.map((group) => (
                            <span
                              key={group.name}
                              className="bg-white/5 text-white/80 px-2 py-0.5 rounded text-[10px] font-semibold"
                            >
                              {group.name}
                            </span>
                          ))}
                        </div>
                      ) : addon.is_product_linked ? (
                        <span className="text-white/40 text-xs italic">Terkunci ke satu varian</span>
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

                  {!data.has_variants && (
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
                  )}

                  {editingAddon?.is_product_linked ? (
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Stock</label>
                      <div className="w-full bg-[#0d1117]/50 border border-white/5 rounded-lg px-4 py-2 text-white/40 text-sm">
                        {editingAddon.available_stock ?? 0} — dibaca dari produk toko, tidak bisa diubah di sini
                      </div>
                    </div>
                  ) : (
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
                  )}

                  {editingAddon?.is_product_linked ? (
                    editingAddon.has_variants ? (
                      <div className="md:col-span-2 space-y-2">
                        <div className="bg-sky-500/5 border border-sky-500/20 rounded-lg px-4 py-3 text-xs text-sky-300">
                          Addon ini tertaut ke produk "{editingAddon.product?.name}". Kombinasi varian
                          mengikuti produk — harga tiap kombinasi boleh ditimpa di sini.
                        </div>
                        <AddonVariantEditor
                          options={data.options}
                          variants={data.variants}
                          onChange={(options, variants) => {
                            setData("options", options);
                            setData("variants", variants);
                          }}
                          locked
                        />
                      </div>
                    ) : (
                      <div className="md:col-span-2 bg-sky-500/5 border border-sky-500/20 rounded-lg px-4 py-3 text-xs text-sky-300">
                        Addon ini tertaut ke produk "{editingAddon.product?.name}", dikunci ke satu
                        varian ({editingAddon.variant?.label}) — tidak ada pilihan varian untuk pembeli.
                      </div>
                    )
                  ) : (
                    <div className="md:col-span-2 space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                        <input
                          type="checkbox"
                          checked={data.has_variants}
                          onChange={(e) => setData("has_variants", e.target.checked)}
                          className="rounded border-white/20 bg-[#0d1117] text-emerald-500 focus:ring-emerald-500"
                        />
                        Punya Varian? (harga bisa beda per kombinasi, maks 2 grup opsi)
                      </label>

                      {data.has_variants && (
                        <AddonVariantEditor
                          options={data.options}
                          variants={data.variants}
                          onChange={(options, variants) => {
                            setData("options", options);
                            setData("variants", variants);
                          }}
                        />
                      )}
                      {(errors.options || errors.variants) && (
                        <div className="text-red-400 text-xs">{errors.options || errors.variants}</div>
                      )}
                    </div>
                  )}

                  {!editingAddon?.is_product_linked && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Form Tambahan (JSON, opsional)
                      </label>
                      <textarea
                        value={data.form_fields}
                        onChange={(e) => setData("form_fields", e.target.value)}
                        rows={3}
                        placeholder='[{"label": "Nomor Punggung", "key": "nomor_punggung", "type": "text", "required": true}]'
                        className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                      />
                      {errors.form_fields && (
                        <div className="text-red-400 text-xs mt-1">{errors.form_fields}</div>
                      )}
                    </div>
                  )}

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

      {isLinkModalOpen && (
        <LinkProductModal eventId={event.id} onClose={() => setIsLinkModalOpen(false)} />
      )}
    </GodModeLayout>
  );
}

function LinkProductModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ProductSearchResult | null>(null);

  const { data, setData, post, processing, errors, reset } = useForm({
    product_id: "",
    product_variant_id: "",
    name: "",
    price: "",
    variants: [] as LinkedVariantDraft[],
  });

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/god-mode/api/products/search?search=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const selectProduct = (product: ProductSearchResult) => {
    setSelected(product);
    reset();
    setData({
      product_id: product.id,
      product_variant_id: "",
      name: product.name,
      price: product.has_variants ? "" : product.display_price,
      // Default value = the product's own per-variant price (user requirement) — admin can still
      // override each one before saving (D24).
      variants: product.has_variants
        ? product.variants.map((v) => ({ product_variant_id: v.id, price: v.price }))
        : [],
    });
  };

  const lockToVariant = (variantId: string) => {
    setData("product_variant_id", variantId);
    if (variantId) {
      const variant = selected?.variants.find((v) => v.id === variantId);
      if (variant) setData("price", variant.price);
    }
  };

  const updateVariantPrice = (productVariantId: string, price: string) => {
    setData(
      "variants",
      data.variants.map((v) => (v.product_variant_id === productVariantId ? { ...v, price } : v))
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/god-mode/events/${eventId}/addons/from-product`, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Ambil dari Produk Toko</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!selected ? (
            <>
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama produk, SKU, atau nama toko..."
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />

              {loading && <p className="text-white/40 text-sm">Mencari...</p>}

              <div className="space-y-2">
                {results.map((product) => {
                  const isDigital = product.type === "digital";
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isDigital}
                      onClick={() => selectProduct(product)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        isDigital
                          ? "border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed"
                          : "border-white/10 hover:border-emerald-500/50 hover:bg-white/5"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-md bg-white/5 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-white/20 text-[18px]">image</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                        <p className="text-xs text-white/40">
                          {product.store_name} · Rp {parseInt(product.display_price).toLocaleString("id-ID")}
                          {product.has_variants ? " (varian)" : ""} · Stok {product.available_stock}
                        </p>
                        {isDigital && (
                          <p className="text-[10px] text-red-400 mt-0.5">
                            Produk digital tidak bisa dipakai di event — diambil saat acara, bukan diunduh.
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {!loading && query.trim().length >= 2 && results.length === 0 && (
                  <p className="text-white/40 text-sm">Tidak ada produk ditemukan.</p>
                )}
              </div>
            </>
          ) : (
            <form id="linkProductForm" onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-12 h-12 rounded-md bg-white/5 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                  {selected.image_url ? (
                    <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-white/20 text-[18px]">image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{selected.name}</p>
                  <p className="text-xs text-white/40">{selected.store_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-xs text-white/50 hover:text-white shrink-0"
                >
                  Ganti
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Nama Addon</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData("name", e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                {errors.name && <div className="text-red-400 text-xs mt-1">{errors.name}</div>}
              </div>

              {!selected.has_variants && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Harga Event (Rp) — boleh beda dari harga produk
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.price}
                    onChange={(e) => setData("price", e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  {errors.price && <div className="text-red-400 text-xs mt-1">{errors.price}</div>}
                </div>
              )}

              {selected.has_variants && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Kunci ke satu varian (opsional)
                  </label>
                  <select
                    value={data.product_variant_id}
                    onChange={(e) => lockToVariant(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Biarkan pembeli memilih varian</option>
                    {selected.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label} — Rp {parseInt(v.price).toLocaleString("id-ID")} (stok {v.stock_quantity})
                      </option>
                    ))}
                  </select>
                  {errors.product_variant_id && (
                    <div className="text-red-400 text-xs mt-1">{errors.product_variant_id}</div>
                  )}
                </div>
              )}

              {selected.has_variants && data.product_variant_id && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Harga Event (Rp) — boleh beda dari harga produk, berlaku untuk varian terkunci ini
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.price}
                    onChange={(e) => setData("price", e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  {errors.price && <div className="text-red-400 text-xs mt-1">{errors.price}</div>}
                </div>
              )}

              {selected.has_variants && !data.product_variant_id && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Harga per Varian — default disalin dari harga produk, boleh ditimpa
                  </label>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-white/50 text-xs uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Varian</th>
                          <th className="px-3 py-2 text-left font-semibold">Harga Produk</th>
                          <th className="px-3 py-2 text-left font-semibold">Harga Event</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selected.variants.map((v) => {
                          const row = data.variants.find((row) => row.product_variant_id === v.id);
                          return (
                            <tr key={v.id}>
                              <td className="px-3 py-2 font-medium text-white whitespace-nowrap">{v.label}</td>
                              <td className="px-3 py-2 text-white/40">
                                Rp {parseInt(v.price).toLocaleString("id-ID")}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={row?.price ?? ""}
                                  onChange={(e) => updateVariantPrice(v.id, e.target.value)}
                                  className="w-28 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {errors.variants && <div className="text-red-400 text-xs mt-1">{errors.variants}</div>}
                </div>
              )}

              <p className="text-xs text-white/40">
                Diambil saat acara — tidak ada pengiriman untuk produk yang dijual lewat event.
              </p>
            </form>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-[#161b22]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Batal
          </button>
          {selected && (
            <button
              form="linkProductForm"
              type="submit"
              disabled={processing}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {processing ? "Menyimpan..." : "Tautkan Addon"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
