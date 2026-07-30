export type ManageTab = "dashboard" | "settings" | "address" | "members";

interface ManageNavProps {
  active: ManageTab;
  onChange: (tab: ManageTab) => void;
  showMembers: boolean;
}

const TABS: { key: ManageTab; label: string; icon: string }[] = [
  { key: "dashboard", label: "Ringkasan", icon: "space_dashboard" },
  { key: "settings", label: "Profil Toko", icon: "storefront" },
  { key: "address", label: "Alamat", icon: "location_on" },
  { key: "members", label: "Anggota", icon: "group" },
];

export default function ManageNav({ active, onChange, showMembers }: ManageNavProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-8 bg-surface-container-lowest p-1.5 rounded-full border border-surface-container-high w-fit">
      {TABS.filter((tab) => tab.key !== "members" || showMembers).map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-label font-medium transition-colors ${
              isActive ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
