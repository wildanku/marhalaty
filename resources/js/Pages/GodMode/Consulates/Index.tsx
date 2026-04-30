import { Head, router, useForm } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { useState } from "react";
import AsyncSelect from "react-select/async";

interface ConsulateCity {
  id: number;
  consulate_id: number;
  city_id: string;
  city: {
    id: string;
    name: string;
  } | null;
}

interface Consulate {
  id: number;
  name: string;
  notes: string | null;
  created_by: string | null;
  cities_count: number;
  cities: ConsulateCity[];
  created_at: string;
}

interface ConsulatesIndexProps {
  admin: any;
  consulates: Consulate[];
}

interface SelectOption {
  value: string;
  label: string;
}

export default function ConsulatesIndex({ admin, consulates }: ConsulatesIndexProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCities, setSelectedCities] = useState<SelectOption[]>([]);

  const { data, setData, post, patch, processing, reset, errors, clearErrors } = useForm({
    name: "",
    notes: "",
    city_ids: [] as string[],
  });

  const loadCityOptions = async (inputValue: string): Promise<SelectOption[]> => {
    if (!inputValue || inputValue.length < 2) return [];
    
    try {
      const response = await fetch(`/api/locations/cities?search=${inputValue}`);
      const json = await response.json();
      return json.map((item: any) => ({
        value: item.id,
        label: item.label
      }));
    } catch (error) {
      console.error("Failed to fetch cities", error);
      return [];
    }
  };

  const openCreateModal = () => {
    clearErrors();
    reset();
    setEditingId(null);
    setSelectedCities([]);
    setIsModalOpen(true);
  };

  const openEditModal = (consulate: Consulate) => {
    clearErrors();
    
    const prefilledCities = consulate.cities
      .filter(c => c.city)
      .map(c => ({
        value: c.city!.id,
        label: c.city!.name
      }));
      
    setSelectedCities(prefilledCities);
    
    setData({
      name: consulate.name,
      notes: consulate.notes || "",
      city_ids: prefilledCities.map(c => c.value),
    });
    setEditingId(consulate.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      patch(`/god-mode/consulates/${editingId}`, {
        onSuccess: () => closeModal(),
      });
    } else {
      post("/god-mode/consulates", {
        onSuccess: () => closeModal(),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this consulate?")) {
      router.delete(`/god-mode/consulates/${id}`);
    }
  };
  
  // Custom styles for react-select dark mode
  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: '#0f1117',
      borderColor: state.isFocused ? '#10b981' : 'rgba(255,255,255,0.1)',
      '&:hover': {
        borderColor: state.isFocused ? '#10b981' : 'rgba(255,255,255,0.2)'
      },
      boxShadow: state.isFocused ? '0 0 0 1px #10b981' : 'none',
      color: 'white',
      borderRadius: '0.5rem',
      padding: '2px 0',
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: '#161b22',
      border: '1px solid rgba(255,255,255,0.1)',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? 'rgba(255,255,255,0.05)' : 'transparent',
      color: 'white',
      '&:hover': {
        backgroundColor: 'rgba(255,255,255,0.05)'
      }
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald tint
      borderRadius: '4px',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: '#34d399', // Emerald 400
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: '#34d399',
      '&:hover': {
        backgroundColor: 'rgba(16, 185, 129, 0.4)',
        color: 'white',
      }
    }),
    input: (base: any) => ({
      ...base,
      color: 'white',
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'rgba(255,255,255,0.4)',
    }),
  };

  return (
    <GodModeLayout admin={admin} title="Consulate Management">
      <Head title="God Mode - Consulates" />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-headline">Consulates</h2>
          <p className="text-sm text-white/50">Manage alumni consulates and associated cities.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Consulate
        </button>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Attached Cities</th>
                <th className="px-6 py-4 font-semibold">Created By</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {consulates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-white/40">
                    No consulates registered.
                  </td>
                </tr>
              ) : (
                consulates.map((consulate) => (
                  <tr key={consulate.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{consulate.name}</div>
                      <div className="text-xs text-white/40 truncate max-w-xs">{consulate.notes || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {consulate.cities.slice(0, 3).map(c => c.city && (
                          <span key={c.id} className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs">
                            {c.city.name}
                          </span>
                        ))}
                        {consulate.cities.length > 3 && (
                          <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-xs">
                            +{consulate.cities.length - 3} more
                          </span>
                        )}
                        {consulate.cities.length === 0 && (
                          <span className="text-white/30 text-xs italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {consulate.created_by || 'System'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(consulate)}
                          className="p-2 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(consulate.id)}
                          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? "Edit Consulate" : "Add New Consulate"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                  Consulate Name
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData("name", e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                  Attach Cities
                </label>
                <AsyncSelect
                  isMulti
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCityOptions}
                  value={selectedCities}
                  onChange={(selected: any) => {
                    setSelectedCities(selected);
                    setData("city_ids", selected.map((s: SelectOption) => s.value));
                  }}
                  placeholder="Search city..."
                  styles={selectStyles}
                  classNamePrefix="react-select"
                />
                {errors.city_ids && <p className="mt-1 text-sm text-red-400">{errors.city_ids}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                  Notes
                </label>
                <textarea
                  value={data.notes}
                  onChange={(e) => setData("notes", e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  rows={2}
                />
                {errors.notes && <p className="mt-1 text-sm text-red-400">{errors.notes}</p>}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {processing ? "Saving..." : "Save Consulate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GodModeLayout>
  );
}
