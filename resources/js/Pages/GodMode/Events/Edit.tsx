import { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";

interface EventEditProps {
  admin: any;
  event: any;
  current_image_url: string | null;
}

export default function EventEdit({ admin, event, current_image_url }: EventEditProps) {
  const { data, setData, post, processing, errors } = useForm({
    _method: "PUT",
    title: event.title || "",
    slug: event.slug || "",
    description: event.description || "",
    location: event.location || "",
    event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
    visibility_scope: event.visibility_scope || "global",
    infak_rules: event.infak_rules ? JSON.stringify(event.infak_rules, null, 2) : "",
    metadata: event.metadata ? JSON.stringify(event.metadata, null, 2) : "",
    image: null as File | null,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(current_image_url);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData("image", file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/god-mode/events/${event.id}`);
  };

  return (
    <GodModeLayout admin={admin} title={`Edit Event: ${event.title}`}>
      <Head title={`Edit Event - ${event.title}`} />

      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/god-mode/events/${event.id}`}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Event Details
        </Link>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Edit Event Details</h3>
        </div>

        <form onSubmit={submit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Title</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => setData("title", e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {errors.title && <div className="text-red-400 text-sm mt-1">{errors.title}</div>}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Slug</label>
              <input
                type="text"
                value={data.slug}
                onChange={(e) => setData("slug", e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {errors.slug && <div className="text-red-400 text-sm mt-1">{errors.slug}</div>}
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Event Date</label>
              <input
                type="datetime-local"
                value={data.event_date}
                onChange={(e) => setData("event_date", e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {errors.event_date && <div className="text-red-400 text-sm mt-1">{errors.event_date}</div>}
            </div>

            {/* Visibility Scope */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Visibility Scope</label>
              <select
                value={data.visibility_scope || 'global'}
                onChange={(e) => setData("visibility_scope", e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              >
                <option value="global">Global (Public)</option>
                <option value="private">Private</option>
              </select>
              {errors.visibility_scope && <div className="text-red-400 text-sm mt-1">{errors.visibility_scope}</div>}
            </div>
            
            {/* Location */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-2">Location</label>
              <input
                type="text"
                value={data.location}
                onChange={(e) => setData("location", e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {errors.location && <div className="text-red-400 text-sm mt-1">{errors.location}</div>}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
              <textarea
                value={data.description}
                onChange={(e) => setData("description", e.target.value)}
                rows={4}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {errors.description && <div className="text-red-400 text-sm mt-1">{errors.description}</div>}
            </div>

            {/* Infak Rules */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-2">Infak Rules (JSON Format)</label>
              <textarea
                value={data.infak_rules}
                onChange={(e) => setData("infak_rules", e.target.value)}
                rows={4}
                placeholder='[{"amount": 50000, "label": "Minimal"}]'
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {errors.infak_rules && <div className="text-red-400 text-sm mt-1">{errors.infak_rules}</div>}
            </div>

            {/* Metadata */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-2">Metadata (JSON Format)</label>
              <textarea
                value={data.metadata}
                onChange={(e) => setData("metadata", e.target.value)}
                rows={4}
                placeholder='{"external_link": "https..."}'
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {errors.metadata && <div className="text-red-400 text-sm mt-1">{errors.metadata}</div>}
            </div>

            {/* Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-2">Event Image / Poster</label>
              <div className="flex items-center gap-6">
                {imagePreview && (
                  <div className="shrink-0">
                    <img src={imagePreview} alt="Event Preview" className="h-32 w-32 object-cover rounded-xl border border-white/10" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 transition-all cursor-pointer"
                  />
                  <p className="mt-2 text-xs text-white/40">Upload a new image to replace the current one. Max size: 5MB.</p>
                  {errors.image && <div className="text-red-400 text-sm mt-1">{errors.image}</div>}
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={processing}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </GodModeLayout>
  );
}
