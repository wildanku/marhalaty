import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import { Campaign } from './Index';

interface DonationDetails {
    id: number;
    amount: string;
    is_anonymous: boolean;
    created_at: string;
    user: User | null;
}

interface CampaignUpdate {
    id: number;
    title: string;
    content: string;
    created_at: string;
}

interface ShowCampaign extends Campaign {
    updates: CampaignUpdate[];
}

interface Props extends PageProps {
    campaign: ShowCampaign;
    recentDonations: DonationDetails[];
}

// Simple internal Zakat Calculator
function ZakatCalculatorModal({ onClose, onApply }: { onClose: () => void, onApply: (amount: number) => void }) {
    const [income, setIncome] = useState<string>('');
    const zakatAmount = (parseFloat(income) || 0) * 0.025;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl w-full max-w-md p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline font-bold text-xl text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined">calculate</span>
                        Zakat Calculator
                    </h3>
                    <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block font-body text-sm font-medium text-on-surface-variant mb-1">Monthly Income (Rp)</label>
                        <input 
                            type="number" 
                            className="w-full border-surface-container-high rounded-lg p-3 bg-surface-container-highest focus:ring-primary focus:border-primary"
                            placeholder="e.g. 10000000"
                            value={income}
                            onChange={(e) => setIncome(e.target.value)}
                            min="0"
                        />
                    </div>
                    
                    <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                        <p className="font-body text-xs text-on-surface-variant mb-1">Nishab: 2.5% applied</p>
                        <p className="font-headline font-bold text-2xl text-primary">Rp {zakatAmount.toLocaleString()}</p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-surface-container">
                        <button onClick={onClose} className="flex-1 py-3 text-on-surface-variant font-label font-medium bg-surface-container hover:bg-surface-container-high rounded-full transition">Cancel</button>
                        <button 
                            onClick={() => onApply(Math.round(zakatAmount))}
                            disabled={zakatAmount <= 0}
                            className="flex-1 py-3 text-white font-label font-medium bg-tertiary hover:bg-tertiary/90 rounded-full transition disabled:opacity-50"
                        >
                            Apply Zakat Value
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Show({ auth, campaign, recentDonations }: Props) {
    const target = parseFloat(campaign.target_amount);
    const collected = parseFloat(campaign.collected_amount);
    const progress = target > 0 ? Math.min((collected / target) * 100, 100) : 0;

    const [showCalculator, setShowCalculator] = useState(false);

    const presetAmounts = [50000, 100000, 250000, 500000];

    const { data, setData, post, processing, errors } = useForm({
        amount: '',
        is_anonymous: false,
        donatable_type: 'campaign',
        donatable_id: campaign.id
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/maal/donate');
    };

    return (
        <div className="bg-surface text-on-surface antialiased min-h-screen">
            <Head title={`${campaign.title} - Campaign`} />
            
            <header className="bg-surface-container-low border-b border-surface-container-high py-4 px-6 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link href="/maal" className="inline-flex items-center text-primary font-medium hover:underline text-sm font-label gap-1">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back to Hub
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-8">
                
                {/* Left Column: Details */}
                <div className="flex-1 flex flex-col gap-8">
                    {campaign.image_url && (
                        <div className="w-full h-72 rounded-2xl overflow-hidden shadow-sm">
                            <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    <div>
                        <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full mb-4 ${campaign.status === 'active' ? 'bg-primary/20 text-on-primary-container' : 'bg-surface-container-high'}`}>
                            {campaign.status.toUpperCase()}
                        </span>
                        <h1 className="font-headline font-bold text-3xl md:text-4xl text-on-surface leading-tight mb-4">{campaign.title}</h1>
                        <p className="font-body text-on-surface-variant leading-relaxed text-lg">{campaign.description}</p>
                    </div>

                    {/* Updates Sections */}
                    {campaign.updates.length > 0 && (
                        <div className="mt-8 border-t border-surface-container pt-8">
                            <h2 className="font-headline font-bold text-xl mb-6">Campaign Updates</h2>
                            <div className="space-y-6">
                                {campaign.updates.map(update => (
                                    <div key={update.id} className="relative pl-6 border-l-2 border-primary/30 pb-4 last:pb-0">
                                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary/80"></div>
                                        <div className="text-xs text-on-surface-variant font-medium mb-1">{new Date(update.created_at).toLocaleDateString()}</div>
                                        <h3 className="font-headline font-bold text-lg">{update.title}</h3>
                                        <p className="font-body text-sm mt-2 text-on-surface-variant whitespace-pre-wrap">{update.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Donor Wall */}
                    <div className="mt-8 border-t border-surface-container pt-8">
                        <h2 className="font-headline font-bold text-xl mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-tertiary">favorite</span>
                            Recent Donors
                        </h2>
                        {recentDonations.length > 0 ? (
                            <div className="bg-surface-container-lowest rounded-xl border border-surface-container overflow-hidden">
                                {recentDonations.map((donation, idx) => (
                                    <div key={donation.id} className={`p-4 flex items-center justify-between ${idx !== recentDonations.length - 1 ? 'border-b border-surface-container' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-surface-container-high rounded-full overflow-hidden flex items-center justify-center text-outline">
                                                {donation.user?.avatar_url ? (
                                                    <img src={donation.user.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[20px]">person</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`font-headline text-sm font-bold ${donation.is_anonymous ? 'text-on-surface-variant italic' : 'text-on-surface'}`}>
                                                    {donation.user?.name || 'Anonymous Donor'}
                                                </p>
                                                <p className="font-body text-[10px] text-on-surface-variant">
                                                    {new Date(donation.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="font-body font-bold text-primary">Rp {parseFloat(donation.amount).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-on-surface-variant font-body text-sm italic">Be the first to donate to this campaign!</p>
                        )}
                    </div>
                </div>

                {/* Right Column: Donation Form / Sidebar */}
                <div className="w-full lg:w-[400px] shrink-0">
                    <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high p-6 sticky top-24">
                        
                        <div className="mb-6">
                            <p className="text-sm font-label text-on-surface-variant mb-1">Funds Collected</p>
                            <h3 className="font-headline font-bold text-3xl text-primary">Rp {collected.toLocaleString()}</h3>
                            <p className="text-xs font-body text-on-surface-variant mt-1.5 flex justify-between">
                                <span>{progress.toFixed(1)}% achieved</span>
                                <span>Target: Rp {target.toLocaleString()}</span>
                            </p>
                            <div className="w-full bg-surface-container-high rounded-full h-2.5 mt-3 overflow-hidden">
                                <div className="bg-tertiary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        <form onSubmit={submit} className="border-t border-surface-container pt-6">
                            <h4 className="font-headline font-bold text-lg mb-4">Make a Contribution</h4>
                            
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {presetAmounts.map(preset => (
                                    <button 
                                        type="button"
                                        key={preset}
                                        onClick={() => setData('amount', String(preset))}
                                        className={`py-2 px-3 rounded-lg border font-label text-sm transition-all text-center ${data.amount === String(preset) ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-surface border-surface-container-high hover:border-outline-variant text-on-surface'}`}
                                    >
                                        Rp {(preset / 1000).toLocaleString()}k
                                    </button>
                                ))}
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-on-surface-variant mb-1">Custom Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant">Rp</span>
                                    <input 
                                        type="number"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                        className="w-full bg-surface border border-outline-variant/50 rounded-lg py-3 pl-10 pr-3 focus:ring-primary focus:border-primary font-bold text-on-surface"
                                        placeholder="Min 10.000"
                                        min="10000"
                                    />
                                </div>
                                {errors.amount && <p className="text-error text-xs mt-1">{errors.amount}</p>}
                                {errors.donatable_type && <p className="text-error text-xs mt-1">{errors.donatable_type}</p>}
                            </div>

                            <div className="flex items-center justify-between mb-6 bg-surface-container p-3 rounded-xl">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={data.is_anonymous}
                                        onChange={(e) => setData('is_anonymous', e.target.checked)}
                                        className="w-5 h-5 rounded border-outline focus:ring-primary text-primary"
                                    />
                                    <div>
                                        <p className="font-headline font-bold text-sm text-on-surface">Donate Anonymously</p>
                                        <p className="font-body text-[10px] text-on-surface-variant">Hide my name as "Hamba Allah"</p>
                                    </div>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={processing || parseFloat(data.amount) < 10000}
                                className="w-full bg-tertiary hover:bg-tertiary/90 text-white font-headline font-bold uppercase tracking-widest py-4 rounded-full shadow-md transition disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {processing ? 'Processing...' : 'Complete Donation'}
                            </button>
                            
                            <div className="mt-4 text-center">
                                <button type="button" onClick={() => setShowCalculator(true)} className="text-xs font-label text-primary font-semibold hover:underline flex items-center justify-center gap-1 w-full mt-2">
                                    <span className="material-symbols-outlined text-[16px]">calculate</span>
                                    Calculate my Zakat automatically
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </main>

            {/* Zustand/React Zakat Component Modal rendering */}
            {showCalculator && (
                <ZakatCalculatorModal 
                    onClose={() => setShowCalculator(false)} 
                    onApply={(amt) => {
                        setData('amount', String(amt));
                        setShowCalculator(false);
                    }} 
                />
            )}
        </div>
    );
}
