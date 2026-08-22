import { FormEventHandler, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { PageProps, Product, ProductOption, Store } from "@/types";
import CurrencyInput from "@/Components/CurrencyInput";
import RichTextEditor from "@/Components/RichTextEditor";
import VariantEditor, { VariantDraft } from "@/Components/Store/VariantEditor";
import StoreManageLayout from "@/Layouts/StoreManageLayout";
import { storeManagementUrl } from "@/Helpers/storeManagementUrl";

interface ProductFormProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
  product: Product | null;
  errors: Record<string, string>;
}

export default function ProductForm() {
  const { store, role, product, errors: pageErrors } = usePage<ProductFormProps>().props;
  const isEdit = product !== null;
  const baseUrl = storeManagementUrl(store.id);
  const formKey = `store-product-form:${store.id}:${product?.id ?? "create"}`;

  const initialOptions: ProductOption[] = product?.options ?? [];
  const initialVariants: VariantDraft[] = (product?.variants ?? [])
    .filter((v) => v.is_active)
    .map((v) => ({
      option1_value: v.option1_value,
      option2_value: v.option2_value,
      price: v.price,
      stock_quantity: String(v.stock_quantity),
      weight_grams: v.weight_grams !== null ? String(v.weight_grams) : "",
      sku: v.sku ?? "",
    }));

  const {
    data,
    setData,
    post,
    processing,
    errors: formErrors,
  } = useForm(formKey, {
    _method: isEdit ? ("put" as const) : undefined,
    name: product?.name ?? "",
    description: product?.description ?? "",
    type: product?.type ?? "physical",
    sku: product?.sku ?? "",
    status: product?.status ?? "draft",
    has_variants: product?.has_variants ?? false,
    price: product?.price ?? "",
    stock_quantity:
      product?.stock_quantity !== null && product?.stock_quantity !== undefined
        ? String(product.stock_quantity)
        : "",
    weight_grams:
      product?.weight_grams !== null && product?.weight_grams !== undefined
        ? String(product.weight_grams)
        : "",
    options: initialOptions,
    variants: initialVariants,
    images: [] as File[],
    digital_file: null as File | null,
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const errors: Record<string, string | undefined> = { ...pageErrors, ...formErrors };
  const errorEntries = Object.entries(errors).filter(([, message]) => Boolean(message));

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    const url = isEdit
      ? `${baseUrl}/products/${product!.id}`
      : `${baseUrl}/products`;
    post(url, {
      forceFormData: true,
      preserveState: true,
      preserveScroll: true,
    });
  };

  return (
    <StoreManageLayout store={store} role={role} activeNav="products">
      <Head title={isEdit ? `Edit ${product!.name}` : "Tambah Produk"} />

      <div className="max-w-3xl">
        <Link
          href={`${baseUrl}/products`}
          className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mb-4"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Produk
        </Link>
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-8">
          {isEdit ? "Edit Produk" : "Tambah Produk"}
        </h1>

        {errorEntries.length > 0 && (
          <div
            role="alert"
            className="mb-6 rounded-2xl bg-error-container px-5 py-4 text-sm text-on-error-container"
          >
            <p className="font-semibold">Produk belum dapat disimpan. Periksa isian berikut:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errorEntries.map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={submit}
          className="bg-surface-container-lowest rounded-3xl p-8 border border-surface-container-high space-y-8"
        >
          <section className="space-y-6">
            <div>
              <label className="block font-label text-sm font-medium text-on-surface mb-2">
                Nama Produk
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData("name", e.target.value)}
                className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
              />
              {errors.name && <p className="mt-2 text-xs text-error">{errors.name}</p>}
            </div>

            <div>
              <label className="block font-label text-sm font-medium text-on-surface mb-2">
                Deskripsi
              </label>
              <RichTextEditor
                value={data.description}
                onChange={(html) => setData("description", html)}
              />
              {errors.description && (
                <p className="mt-2 text-xs text-error">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block font-label text-sm font-medium text-on-surface mb-2">
                  Tipe Produk
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={data.type === "physical"}
                      onChange={() => setData("type", "physical")}
                      className="text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm text-on-surface">Fisik</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={data.type === "digital"}
                      onChange={() => setData("type", "digital")}
                      className="text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm text-on-surface">Digital</span>
                  </label>
                </div>
                {errors.type && <p className="mt-2 text-xs text-error">{errors.type}</p>}
              </div>

              <div>
                <label className="block font-label text-sm font-medium text-on-surface mb-2">
                  SKU (opsional)
                </label>
                <input
                  type="text"
                  value={data.sku}
                  onChange={(e) => setData("sku", e.target.value)}
                  className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                />
                {errors.sku && <p className="mt-2 text-xs text-error">{errors.sku}</p>}
              </div>

              <div>
                <label className="block font-label text-sm font-medium text-on-surface mb-2">
                  Status
                </label>
                <select
                  value={data.status}
                  onChange={(e) => setData("status", e.target.value as Product["status"])}
                  className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Aktif</option>
                  <option value="archived">Diarsipkan</option>
                </select>
                {errors.status && <p className="mt-2 text-xs text-error">{errors.status}</p>}
              </div>
            </div>
          </section>

          <section className="border-t border-outline-variant/20 pt-6">
            <label className="flex items-center gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={data.has_variants}
                disabled={data.type === "digital"}
                onChange={(e) => setData("has_variants", e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="font-label text-sm font-medium text-on-surface">
                Produk ini punya varian (mis. Ukuran, Warna)
              </span>
            </label>

            {!data.has_variants ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    Harga
                  </label>
                  <CurrencyInput value={data.price} onChange={(v) => setData("price", v)} />
                  {errors.price && <p className="mt-2 text-xs text-error">{errors.price}</p>}
                </div>
                <div>
                  <label className="block font-label text-sm font-medium text-on-surface mb-2">
                    Stok
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={data.stock_quantity}
                    onChange={(e) => setData("stock_quantity", e.target.value)}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                  />
                  {errors.stock_quantity && (
                    <p className="mt-2 text-xs text-error">{errors.stock_quantity}</p>
                  )}
                </div>
                {data.type === "physical" && (
                  <div>
                    <label className="block font-label text-sm font-medium text-on-surface mb-2">
                      Berat (gram)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={data.weight_grams}
                      onChange={(e) => setData("weight_grams", e.target.value)}
                      className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                    />
                    {errors.weight_grams && (
                      <p className="mt-2 text-xs text-error">{errors.weight_grams}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <VariantEditor
                options={data.options}
                variants={data.variants}
                errors={errors}
                requireWeight={data.type === "physical"}
                onChange={(options, variants) => {
                  setData("options", options);
                  setData("variants", variants);
                }}
              />
            )}
            {errors.options && <p className="mt-2 text-xs text-error">{errors.options}</p>}
            {errors.variants && <p className="mt-2 text-xs text-error">{errors.variants}</p>}
          </section>

          <section className="border-t border-outline-variant/20 pt-6">
            <label className="block font-label text-sm font-medium text-on-surface mb-2">
              Gambar Produk (maks. 5)
            </label>
            {product && product.images.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {product.images.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover border border-outline-variant/30"
                  />
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).slice(0, 5);
                setData("images", files);
                setImagePreviews(files.map((f) => URL.createObjectURL(f)));
              }}
              className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary-container file:text-on-primary-container file:font-label file:font-medium"
            />
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {imagePreviews.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-outline-variant/30"
                  />
                ))}
              </div>
            )}
            {errors.images && <p className="mt-2 text-xs text-error">{errors.images}</p>}
          </section>

          {data.type === "digital" && (
            <section className="border-t border-outline-variant/20 pt-6">
              <label className="block font-label text-sm font-medium text-on-surface mb-2">
                File Unduhan
              </label>
              <p className="text-xs text-on-surface-variant mb-2">
                Dikirim ke pembeli sebagai tautan unduh setelah pembayaran lunas. Tidak bisa diakses
                publik.
              </p>
              <input
                type="file"
                accept=".pdf,.epub,.zip,.mp3,.mp4"
                onChange={(e) => setData("digital_file", e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary-container file:text-on-primary-container file:font-label file:font-medium"
              />
              {errors.digital_file && (
                <p className="mt-2 text-xs text-error">{errors.digital_file}</p>
              )}
            </section>
          )}

          <div className="flex justify-end pt-4 border-t border-outline-variant/20">
            <button
              type="submit"
              disabled={processing}
              className="bg-primary text-on-primary px-8 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isEdit ? "Simpan Perubahan" : "Buat Produk"}
            </button>
          </div>
        </form>
      </div>
    </StoreManageLayout>
  );
}
