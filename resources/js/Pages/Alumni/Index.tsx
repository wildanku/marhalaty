import { useState, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { PageProps, User } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import AsyncSelect from "@/Components/AsyncSelect";

interface Pagination<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

interface IndexProps extends PageProps {
  users: Pagination<User>;
  filters?: {
    search?: string;
    city_id?: string;
    foreign_city?: string;
    profession_id?: string;
    marhalah_year?: string;
  };
  filterOptions?: {
    cities: { id: string; name: string }[];
    professions: { id: number; name: string }[];
    marhalahYears: number[];
  };
}

export default function Index({ auth, users, filters = {}, filterOptions }: IndexProps) {
  const [alumniList, setAlumniList] = useState<User[]>(users.data);
  const [currentPage, setCurrentPage] = useState(users.current_page);
  const [lastPage, setLastPage] = useState(users.last_page);
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [selectedCityId, setSelectedCityId] = useState(filters.city_id || "");
  const [selectedForeignCity, setSelectedForeignCity] = useState(filters.foreign_city || "");
  const [selectedProfessionId, setSelectedProfessionId] = useState(filters.profession_id || "");
  const [selectedMarhalahYear, setSelectedMarhalahYear] = useState(filters.marhalah_year || "");
  const [locationScope, setLocationScope] = useState<"indonesia" | "luar_negeri">(
    filters.foreign_city ? "luar_negeri" : "indonesia"
  );

  useEffect(() => {
    setAlumniList(users.data);
    setCurrentPage(users.current_page);
    setLastPage(users.last_page);
  }, [users]);

  const buildFilterPayload = (
    overrides?: Partial<{
      search: string;
      city_id: string;
      foreign_city: string;
      profession_id: string;
      marhalah_year: string;
    }>
  ) => {
    const scope =
      overrides?.foreign_city !== undefined || overrides?.city_id !== undefined
        ? overrides?.foreign_city
          ? "luar_negeri"
          : locationScope
        : locationScope;

    const payload = {
      search: overrides?.search ?? searchQuery,
      city_id: scope === "indonesia" ? (overrides?.city_id ?? selectedCityId) : "",
      foreign_city: scope === "luar_negeri" ? (overrides?.foreign_city ?? selectedForeignCity) : "",
      profession_id: overrides?.profession_id ?? selectedProfessionId,
      marhalah_year: overrides?.marhalah_year ?? selectedMarhalahYear,
    };

    return {
      search: payload.search || undefined,
      city_id: payload.city_id || undefined,
      foreign_city: payload.foreign_city || undefined,
      profession_id: payload.profession_id || undefined,
      marhalah_year: payload.marhalah_year || undefined,
    };
  };

  const applyFilters = (
    overrides?: Partial<{
      search: string;
      city_id: string;
      foreign_city: string;
      profession_id: string;
      marhalah_year: string;
    }>,
    page = 1
  ) => {
    router.get(
      "/directory",
      { ...buildFilterPayload(overrides), page },
      {
        preserveState: true,
        replace: true,
        onSuccess: (page) => {
          const newUsers = page.props.users as unknown as Pagination<User>;
          setAlumniList(newUsers.data);
          setCurrentPage(newUsers.current_page);
          setLastPage(newUsers.last_page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      }
    );
  };

  // Quick debounce for search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== filters.search) {
        applyFilters({ search: searchQuery }, 1);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [
    searchQuery,
    filters.search,
    selectedCityId,
    selectedForeignCity,
    selectedProfessionId,
    selectedMarhalahYear,
    locationScope,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setLocationScope("indonesia");
    setSelectedCityId("");
    setSelectedForeignCity("");
    setSelectedProfessionId("");
    setSelectedMarhalahYear("");
    applyFilters(
      {
        search: "",
        city_id: "",
        foreign_city: "",
        profession_id: "",
        marhalah_year: "",
      },
      1
    );
  };

  const goToPage = (page: number) => {
    applyFilters({}, page);
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col antialiased">
      <Head title="Alumni Directory" />

      <Header />

      <div className="bg-surface-container-low py-8 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
              Alumni Directory
            </h2>
            <p className="font-body text-on-surface-variant text-sm max-w-xl">
              Connect with fellow Gontor alumni across the globe. Search by name, profession, or
              marhalah.
            </p>
          </div>
          <div className="w-full md:w-auto flex-1 max-w-md relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-high border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg pl-12 pr-4 py-3 font-body text-sm text-on-surface transition-colors"
              placeholder="Search alumni..."
            />
          </div>
        </div>
      </div>

      <main className="flex-1 pb-24 md:pb-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 shrink-0 space-y-8">
            <div className="rounded-2xl bg-surface-container-lowest border border-surface-container-high p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-semibold text-on-surface">Filters</h3>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Reset
                </button>
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Marhalah</label>
                <select
                  value={selectedMarhalahYear}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedMarhalahYear(value);
                    applyFilters({ marhalah_year: value }, 1);
                  }}
                  className="w-full bg-surface-container-high border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface"
                >
                  <option value="">Semua Marhalah</option>
                  {filterOptions?.marhalahYears?.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Profesi</label>
                <select
                  value={selectedProfessionId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedProfessionId(value);
                    applyFilters({ profession_id: value }, 1);
                  }}
                  className="w-full bg-surface-container-high border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface"
                >
                  <option value="">Semua Profesi</option>
                  {filterOptions?.professions?.map((profession) => (
                    <option key={profession.id} value={String(profession.id)}>
                      {profession.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Domisili</label>
                <div className="flex items-center gap-4 mb-3">
                  <label className="inline-flex items-center gap-2 text-sm text-on-surface">
                    <input
                      type="radio"
                      name="location_scope"
                      value="indonesia"
                      checked={locationScope === "indonesia"}
                      onChange={() => {
                        setLocationScope("indonesia");
                        setSelectedForeignCity("");
                        applyFilters({ foreign_city: "" }, 1);
                      }}
                      className="text-primary focus:ring-primary"
                    />
                    Indonesia
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-on-surface">
                    <input
                      type="radio"
                      name="location_scope"
                      value="luar_negeri"
                      checked={locationScope === "luar_negeri"}
                      onChange={() => {
                        setLocationScope("luar_negeri");
                        setSelectedCityId("");
                        applyFilters({ city_id: "" }, 1);
                      }}
                      className="text-primary focus:ring-primary"
                    />
                    Luar Negeri
                  </label>
                </div>

                {locationScope === "indonesia" ? (
                  <AsyncSelect
                    endpoint="/api/locations/cities"
                    value={selectedCityId}
                    onChange={(val) => {
                      const value = String(val);
                      setSelectedCityId(value);
                      applyFilters({ city_id: value, foreign_city: "" }, 1);
                    }}
                    placeholder="Cari kota atau provinsi..."
                  />
                ) : (
                  <AsyncSelect
                    endpoint="/api/locations/foreign-cities"
                    value={selectedForeignCity}
                    onChange={(val) => {
                      const value = String(val);
                      setSelectedForeignCity(value);
                      applyFilters({ foreign_city: value, city_id: "" }, 1);
                    }}
                    placeholder="Cari kota luar negeri..."
                  />
                )}
              </div>
            </div>
          </aside>

          {/* Cards Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
              {alumniList.map((alumnus) => (
                <div
                  key={alumnus.id}
                  className="bg-surface-container-lowest rounded-xl p-6 flex flex-col items-center text-center group hover:bg-surface-container-low transition-colors duration-300 shadow-[0px_10px_40px_rgba(80,100,71,0.04)] hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] relative overflow-hidden"
                >
                  {alumnus.is_verified && (
                    <div className="absolute top-4 right-4 text-tertiary">
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        verified
                      </span>
                    </div>
                  )}
                  <img
                    src={
                      alumnus.avatar_url ||
                      "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                    }
                    alt="Alumni portrait"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-surface"
                  />
                  <h4 className="font-headline text-lg font-bold text-on-surface">
                    {alumnus.name}
                  </h4>
                  <p className="font-body text-sm text-on-surface-variant mt-1">
                    Marhalah {alumnus.marhalah_year}
                  </p>

                  <div className="mt-4 mb-6">
                    {alumnus.profession && (
                      <span className="inline-block bg-secondary-container text-on-surface font-body text-xs px-3 py-1 rounded-full">
                        {typeof alumnus.profession === "object"
                          ? alumnus.profession.name
                          : alumnus.profession}
                      </span>
                    )}
                    {alumnus.city && (
                      <span className="inline-block bg-secondary-container text-on-surface font-body text-xs px-3 py-1 rounded-full mt-2 ml-2">
                        {typeof alumnus.city === "object" ? alumnus.city.name : alumnus.city}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/p/${alumnus.slug}`}
                    className="w-full mt-auto py-2 px-4 rounded-full border border-primary/20 text-primary font-body text-sm font-medium hover:bg-primary-container/20 transition-colors text-center"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {lastPage > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 pb-4">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-surface-container-highest text-sm font-medium text-on-surface disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                >
                  ← Prev
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: lastPage }, (_, i) => i + 1).map((page) => {
                    const isCurrentPage = page === currentPage;
                    const isNearby = Math.abs(page - currentPage) <= 1;
                    const isEnd = page === 1 || page === lastPage;

                    if (!isNearby && !isEnd) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isCurrentPage
                            ? "bg-primary text-on-primary"
                            : "border border-surface-container-highest text-on-surface hover:bg-surface-container-high"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === lastPage}
                  className="px-3 py-2 rounded-lg border border-surface-container-highest text-sm font-medium text-on-surface disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
