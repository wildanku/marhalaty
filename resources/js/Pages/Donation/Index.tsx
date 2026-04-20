import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

export interface Fund {
    id: number;
    name: string;
    slug: string;
    description: string;
    collected_amount: string;
}

export interface Campaign {
    id: number;
    title: string;
    slug: string;
    description: string;
    image_url: string;
    target_amount: string;
    collected_amount: string;
    end_date: string;
    status: string;
}

interface MaalProps extends PageProps {
    funds: Fund[];
    campaigns: Campaign[];
}

export default function Index({ auth, funds, campaigns }: MaalProps) {
    const totalCollected = funds.reduce((acc, curr) => acc + parseFloat(curr.collected_amount), 0) + 
                           campaigns.reduce((acc, curr) => acc + parseFloat(curr.collected_amount), 0);

    return (
        <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col md:flex-row">
            <Head title="Baitul Maal - Gontor Alumni" />
            
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
                    <Link href="/directory" className="flex items-center gap-3 text-[#444840] dark:text-[#c4c8bd] px-4 py-3 mx-2 hover:bg-[#e6e2d7] dark:hover:bg-[#323632] rounded-lg transition-all font-body text-sm font-medium">
                        <span className="material-symbols-outlined">person_search</span>
                        Directory
                    </Link>
                    <Link href="/events" className="flex items-center gap-3 text-[#444840] dark:text-[#c4c8bd] px-4 py-3 mx-2 hover:bg-[#e6e2d7] dark:hover:bg-[#323632] rounded-lg transition-all font-body text-sm font-medium">
                        <span className="material-symbols-outlined">calendar_month</span>
                        Events
                    </Link>
                    <Link href="/maal" className="flex items-center gap-3 bg-[#8da382] text-white rounded-lg mx-2 px-4 py-3 shadow-sm transition-all duration-200 font-body text-sm font-medium translate-x-1">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                        Baitul Maal
                    </Link>
                </div>
            </nav>

            <main className="flex-1 md:ml-64 pb-24 md:pb-0 min-h-screen">
                <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Hero Section */}
                    <section className="mb-16 relative rounded-xl overflow-hidden bg-surface-container-low p-8 md:p-16 flex flex-col md:flex-row items-center gap-8 shadow-[0px_10px_40px_rgba(80,100,71,0.08)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary-container/10"></div>
                        <div className="relative z-10 flex-1">
                            <span className="text-tertiary font-label font-bold tracking-widest uppercase text-xs mb-4 block">Baitul Maal Hub</span>
                            <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface mb-6 leading-tight tracking-tight">Empowering Legacy Through Generosity</h1>
                            <p className="text-on-surface-variant font-body text-lg mb-8 max-w-xl leading-relaxed">Join hands with thousands of alumni to support education, infrastructure, and community welfare.</p>
                            <div className="flex flex-wrap gap-4">
                                <Link href="#campaigns" className="bg-tertiary text-on-tertiary px-8 py-4 rounded-full font-label font-bold shadow-sm hover:opacity-90 transition-all">Support Campaigns</Link>
                            </div>
                        </div>

                        <div className="relative z-10 flex-1 w-full max-w-md">
                            <div className="bg-surface-container-highest rounded-2xl p-6 shadow-sm relative overflow-hidden backdrop-blur-sm border border-surface-variant">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary opacity-10 rounded-full blur-2xl"></div>
                                <h3 className="font-headline font-bold text-xl text-on-surface mb-2">Total Managed Funds</h3>
                                <p className="font-headline font-extrabold text-3xl text-primary mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined">account_balance</span>
                                    Rp {totalCollected.toLocaleString()}
                                </p>
                            </div>
                            
                            {/* Zakat & Global Funds Quick Access */}
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {funds.map(fund => (
                                    <div key={fund.id} className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-low flex flex-col">
                                        <h4 className="font-headline font-bold text-sm">{fund.name}</h4>
                                        <p className="text-[10px] text-on-surface-variant mt-1 line-clamp-2">{fund.description}</p>
                                        <div className="mt-auto pt-3">
                                            <span className="inline-block py-1.5 w-full text-center text-primary font-medium text-xs border border-primary/20 hover:bg-primary/5 rounded-full transition-colors cursor-pointer">Donate to {fund.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Active Campaigns Bento Grid */}
                    <section id="campaigns" className="mb-16">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight">Active Campaigns</h2>
                                <p className="text-on-surface-variant font-body mt-2">Projects requiring immediate attention and support.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map((campaign, idx) => {
                                const target = parseFloat(campaign.target_amount);
                                const collected = parseFloat(campaign.collected_amount);
                                const progress = target > 0 ? Math.min((collected / target) * 100, 100) : 0;
                                const isLarge = idx === 0;

                                return (
                                    <Link key={campaign.id} href={`/maal/campaigns/${campaign.slug}`} className={`${isLarge ? 'md:col-span-2 lg:col-span-2 flex-row' : 'flex-col'} bg-surface-container-lowest rounded-xl p-6 md:p-8 flex gap-6 hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] transition-all duration-300 border border-surface-container`}>
                                        {campaign.image_url && (
                                            <img src={campaign.image_url} alt={campaign.title} className={`${isLarge ? 'w-full md:w-1/3' : 'w-full h-40'} object-cover rounded-lg`} />
                                        )}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className={`${isLarge ? 'text-2xl' : 'text-xl'} font-headline font-bold text-on-surface mb-2 leading-tight`}>{campaign.title}</h3>
                                                <p className="text-on-surface-variant font-body text-sm mb-6 line-clamp-2">{campaign.description}</p>
                                            </div>
                                            <div>
                                                <div className="flex justify-between font-label text-sm mb-2">
                                                    <span className="text-on-surface font-semibold shrink-0">Rp {collected.toLocaleString()}</span>
                                                    <span className="text-on-surface-variant shrink-0 relative mr-[-4px]">Target: Rp {target.toLocaleString()}</span>
                                                </div>
                                                <div className="w-full bg-surface-container-high rounded-full h-2 mb-4">
                                                    <div className="bg-tertiary h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <button className="w-full py-2 bg-primary text-on-primary rounded-full font-label text-sm font-semibold hover:bg-primary-container transition-colors">Contribute</button>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
