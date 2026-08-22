import { ChangeEvent, FormEventHandler, useRef, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { PageProps, Store } from "@/types";
import StoreManageLayout from "@/Layouts/StoreManageLayout";
import { storeManagementUrl } from "@/Helpers/storeManagementUrl";

interface ProductImportProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
}

const EXAMPLE_JSON = `{
  "products": [
    {
      "name": "Kaos Reuni 87",
      "description": "<p>Kaos cotton combed edisi reuni.</p>",
      "type": "physical",
      "sku": "KRS-87",
      "status": "active",
      "has_variants": true,
      "options": [
        { "name": "Ukuran", "values": ["M", "L", "XL"] },
        { "name": "Warna", "values": ["Hitam", "Putih"] }
      ],
      "variants": [
        { "option1_value": "M", "option2_value": "Hitam", "sku": "KRS-87-M-H", "price": 85000, "stock_quantity": 10, "weight_grams": 250 },
        { "option1_value": "M", "option2_value": "Putih", "sku": "KRS-87-M-P", "price": 85000, "stock_quantity": 8, "weight_grams": 250 },
        { "option1_value": "L", "option2_value": "Hitam", "sku": "KRS-87-L-H", "price": 85000, "stock_quantity": 12, "weight_grams": 250 }
      ]
    },
    {
      "name": "Tote Bag Reuni",
      "description": "Tote bag kanvas.",
      "type": "physical",
      "sku": "TOTE-87",
      "status": "draft",
      "has_variants": false,
      "price": 45000,
      "stock_quantity": 25,
      "weight_grams": 300,
      "options": [],
      "variants": []
    }
  ]
}`;

export default function ProductImport() {
  const { store, role } = usePage<ProductImportProps>().props;
  const baseUrl = storeManagementUrl(store.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const { data, setData, post, processing, errors } = useForm({ payload: EXAMPLE_JSON });
  const [fileName, setFileName] = useState<string | null>(null);

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setData("payload", typeof reader.result === "string" ? reader.result : "");
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const submit: FormEventHandler = (event) => {
    event.preventDefault();
    post(`${baseUrl}/products/import`, { preserveScroll: true });
  };

  return (
    <StoreManageLayout store={store} role={role} activeNav="products">
      <Head title={`Impor Produk - ${store.name}`} />

      <div className="max-w-4xl">
        <Link
          href={`${baseUrl}/products`}
          className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mb-4"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Produk
        </Link>
        <h1 className="font-headline text-2xl font-bold text-on-surface">Tambah Produk dari JSON</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Impor hingga 200 produk fisik sekaligus. Seluruh impor bersifat atomik: bila ada satu
          data tidak valid, tidak ada produk yang ditambahkan.
        </p>

        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-on-surface">
          <p className="font-semibold">Batasan impor JSON</p>
          <p className="mt-1 text-on-surface-variant">
            Gambar produk dan file digital tidak dapat diimpor. Setelah produk dibuat, unggah
            gambar melalui menu Edit. Produk digital harus dibuat lewat formulir biasa karena
            memerlukan file unduhan yang aman.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-highest"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Pilih berkas .json
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={readFile} />
            {fileName && <span className="text-sm text-on-surface-variant">{fileName}</span>}
            <button
              type="button"
              onClick={() => { setData("payload", EXAMPLE_JSON); setFileName(null); }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Isi contoh format
            </button>
          </div>

          <textarea
            value={data.payload}
            onChange={(event) => setData("payload", event.target.value)}
            spellCheck={false}
            rows={28}
            className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 font-mono text-xs leading-5 text-on-surface focus:border-primary focus:ring-primary"
            aria-label="JSON produk"
          />
          {Object.keys(errors).length > 0 && (
            <div role="alert" className="rounded-2xl bg-error-container px-5 py-4 text-sm text-on-error-container">
              <p className="font-semibold">Impor belum dapat dilakukan:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {Object.entries(errors).map(([field, message]) => <li key={field}>{message}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-label font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-[18px]">playlist_add</span>
              {processing ? "Mengimpor..." : "Impor Produk"}
            </button>
          </div>
        </form>
      </div>
    </StoreManageLayout>
  );
}
