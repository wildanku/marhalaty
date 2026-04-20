import { useState, useEffect, useRef, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps, User } from '@/types';

interface Pagination<T> {
    data: T[];
    next_page_url: string | null;
    current_page: number;
}

interface IndexProps extends PageProps {
    users: Pagination<User>;
    filters?: {
        search?: string;
        city?: string;
        profession?: string;
    };
}

export default function Index({ auth, users, filters = {} }: IndexProps) {
    const [alumniList, setAlumniList] = useState<User[]>(users.data);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    
    // Quick debounce for search input
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchQuery !== filters.search) {
                router.get('/directory', { filter: { search: searchQuery } }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onSuccess: (page) => {
                        const newUsers = page.props.users as unknown as Pagination<User>;
                        setAlumniList(newUsers.data);
                    }
                });
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Infinite Scroll Implementation
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && users.next_page_url) {
                router.get(users.next_page_url, {}, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: (page) => {
                        const newUsers = page.props.users as unknown as Pagination<User>;
                        // Append uniquely
                        setAlumniList(prev => {
                            const newIds = newUsers.data.map(u => u.id);
                            const filteredPrev = prev.filter(p => !newIds.includes(p.id));
                            return [...filteredPrev, ...newUsers.data];
                        });
                    }
                });
            }
        });
        
        if (node) observer.current.observe(node);
    }, [users.next_page_url]);

    return (
        <div className="bg-background text-on-background font-body min-h-screen flex flex-col md:flex-row antialiased">
            <Head title="Alumni Directory" />

            {/* Mobile Header */}
            <header className="md:hidden flex justify-between items-center w-full px-6 py-4 bg-[#faf9f6]/90 dark:bg-[#1a1c1a]/90 backdrop-blur-xl border-b border-surface-container-high sticky top-0 z-40">
                <div className="text-2xl font-bold text-[#506447] dark:text-[#d2eac5] font-headline tracking-tight">Gontor Alumni</div>
                <button className="text-on-surface-variant p-2">
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </header>

            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 py-8 gap-2 bg-[#f4f3f1] dark:bg-[#1a1c1a] border-r border-surface-container-high z-50">
                <div className="px-6 mb-8">
                    <h1 className="font-headline text-xl font-bold text-[#506447] tracking-tight">The Academic Sanctuary</h1>
                    <p className="font-body text-xs text-on-surface-variant mt-1">Legacy of Gontor</p>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    <Link href="/dashboard" className="flex items-center gap-3 text-[#444840] dark:text-[#c4c8bd] px-4 py-3 mx-2 hover:bg-[#e6e2d7] dark:hover:bg-[#323632] rounded-lg transition-all font-body text-sm font-medium">
                        <span className="material-symbols-outlined">home</span>
                        Home
                    </Link>
                    <Link href="/directory" className="flex items-center gap-3 bg-[#8da382] text-white rounded-lg mx-2 px-4 py-3 shadow-sm transition-all duration-200 font-body text-sm font-medium translate-x-1">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person_search</span>
                        Directory
                    </Link>
                    <Link href="#" className="flex items-center gap-3 text-[#444840] dark:text-[#c4c8bd] px-4 py-3 mx-2 hover:bg-[#e6e2d7] dark:hover:bg-[#323632] rounded-lg transition-all font-body text-sm font-medium">
                        <span className="material-symbols-outlined">volunteer_activism</span>
                        Baitul Maal
                    </Link>
                </div>

                <div className="px-6 mt-auto mb-4">
                    <div className="text-xs font-label text-on-surface-variant mb-4">Logged in as {auth.user?.name}</div>
                </div>
            </nav>

            <main className="flex-1 md:ml-64 bg-background min-h-screen pb-24 md:pb-12">
                <div className="bg-surface-container-low py-8 px-6 lg:px-12">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div>
                            <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">Alumni Directory</h2>
                            <p className="font-body text-on-surface-variant text-sm max-w-xl">Connect with fellow Gontor alumni across the globe. Search by name, profession, or marhalah.</p>
                        </div>
                        <div className="w-full md:w-auto flex-1 max-w-md relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-surface-container-high border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg pl-12 pr-4 py-3 font-body text-sm text-on-surface transition-colors" 
                                placeholder="Search alumni..." 
                            />
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
                        <div>
                            <h3 className="font-headline font-semibold text-on-surface mb-4">Filters can go here</h3>
                            <p className="text-sm font-body text-on-surface-variant">Extend Spatie Query Builder parameters automatically</p>
                        </div>
                    </aside>

                    {/* Cards Grid */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
                        {alumniList.map((alumnus, index) => {
                            const isLast = index === alumniList.length - 1;
                            return (
                                <div 
                                    key={alumnus.id} 
                                    ref={isLast ? lastElementRef : null}
                                    className="bg-surface-container-lowest rounded-xl p-6 flex flex-col items-center text-center group hover:bg-surface-container-low transition-colors duration-300 shadow-[0px_10px_40px_rgba(80,100,71,0.04)] hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] relative overflow-hidden"
                                >
                                    {alumnus.is_verified && (
                                        <div className="absolute top-4 right-4 text-tertiary">
                                            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                        </div>
                                    )}
                                    <img 
                                        src={alumnus.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"} 
                                        alt="Alumni portrait" 
                                        className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-surface" 
                                    />
                                    <h4 className="font-headline text-lg font-bold text-on-surface">{alumnus.name}</h4>
                                    <p className="font-body text-sm text-on-surface-variant mt-1">Marhalah {alumnus.marhalah_year}</p>
                                    
                                    <div className="mt-4 mb-6">
                                        {alumnus.profession && (
                                            <span className="inline-block bg-secondary-container text-on-surface font-body text-xs px-3 py-1 rounded-full">{alumnus.profession}</span>
                                        )}
                                        {alumnus.city && (
                                            <span className="inline-block bg-secondary-container text-on-surface font-body text-xs px-3 py-1 rounded-full mt-2 ml-2">{alumnus.city}</span>
                                        )}
                                    </div>
                                    <Link href={`/p/${alumnus.slug}`} className="w-full mt-auto py-2 px-4 rounded-full border border-primary/20 text-primary font-body text-sm font-medium hover:bg-primary-container/20 transition-colors text-center">
                                        View Profile
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
