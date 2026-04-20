import { useState, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { PageProps, GontorEvent } from '@/types';
import { z } from 'zod';

interface SelectedAddon {
    id: number;
    quantity: number;
    variant?: string;
    price: number;
}

export default function Show({ auth, event }: PageProps<{ event: GontorEvent }>) {
    const isFlexible = event.payment_type === 'flexible';
    const isFixed = event.payment_type === 'fixed';
    const rules = event.pricing_rules;
    
    // Fallback parsing variables safely
    const minimumCustom = rules?.min_custom || 0;
    const defaultFixedPrice = rules?.amount || 0;
    const flexibleTiers = rules?.options || [];

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm<{
        base_amount: string;
        addons: SelectedAddon[];
    }>({
        base_amount: isFixed ? String(defaultFixedPrice) : (isFlexible && flexibleTiers[0] ? String(flexibleTiers[0]) : '0'),
        addons: [],
    });

    const totalCalculation = useMemo(() => {
        const base = parseFloat(data.base_amount) || 0;
        const addonsCost = data.addons.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        return base + addonsCost;
    }, [data]);

    const handleAddonChange = (addonId: number, priceStr: string, qtyStr: string, variant?: string) => {
        const price = parseFloat(priceStr);
        const qty = parseInt(qtyStr, 10) || 0;
        
        setData('addons', prev => {
            const filtered = prev.filter(p => !(p.id === addonId && p.variant === variant));
            if (qty > 0) {
                return [...filtered, { id: addonId, quantity: qty, variant, price }];
            }
            return filtered;
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        // Zod validation strictly on client bounds matching JSON rules dynamically
        const rsvpSchema = z.object({
            base_amount: z.number()
                .min(isFlexible && !rules.allow_custom ? minCustom : 0)
                .refine(val => {
                    if (isFlexible) {
                        return val >= minimumCustom;
                    }
                    if (isFixed) return val === defaultFixedPrice;
                    return val === 0;
                }, { message: isFlexible ? `Minimum infak is Rp ${minimumCustom.toLocaleString()}` : "Invalid ticket price" }),
        });

        const validationParams = rsvpSchema.safeParse({ base_amount: parseFloat(data.base_amount) || 0 });

        if (!validationParams.success) {
            setError('base_amount', validationParams.error.errors[0].message);
            return;
        }

        post(`/events/${event.slug}/rsvp`);
    };

    return (
        <div className="bg-surface text-on-surface antialiased min-h-screen">
            <Head title={`${event.title} - Event`} />
            
            <header className="bg-surface-container-low border-b border-surface-container-high py-4 px-6 fixed top-0 w-full z-10 flex items-center gap-4">
                <Link href="/events" className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="font-headline font-bold text-lg truncate">{event.title}</div>
            </header>

            <main className="pt-20 px-4 md:px-12 pb-32 max-w-5xl mx-auto flex flex-col md:flex-row gap-8 items-start">
                {/* Event Detail Render */}
                <div className="w-full md:w-3/5 flex flex-col gap-8">
                    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high">
                        <div className="p-6 md:p-8">
                            <span className="bg-tertiary/15 text-tertiary px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                                {event.visibility_scope === 'global' || !event.visibility_scope ? 'Global Event' : `Marhalah ${event.visibility_scope}`}
                            </span>
                            <h2 className="font-headline text-3xl font-bold text-on-surface leading-tight mb-6">{event.title}</h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                <div className="bg-surface-container px-4 py-3 rounded-xl flex items-start gap-3">
                                    <div className="text-primary mt-1"><span className="material-symbols-outlined">schedule</span></div>
                                    <div>
                                        <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">Date</p>
                                        <p className="font-body font-semibold text-on-surface text-sm">{new Date(event.event_date).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="bg-surface-container px-4 py-3 rounded-xl flex items-start gap-3">
                                    <div className="text-primary mt-1"><span className="material-symbols-outlined">location_on</span></div>
                                    <div>
                                        <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">Location</p>
                                        <p className="font-body font-semibold text-on-surface text-sm break-words">{event.location}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-p:text-on-surface-variant prose-p:font-body max-w-none">
                                <p>{event.description}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RSVP and Merchandise Render Sidebar */}
                <div className="w-full md:w-2/5 md:sticky md:top-24 space-y-6">
                    <form onSubmit={submit} className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high hover:border-primary-container transition-colors">
                        
                        {/* Dynamic Core Contribution Selection */}
                        <div className="mb-8">
                            <h3 className="font-headline text-xl font-bold text-on-surface mb-1">RSVP Contribution</h3>
                            <p className="font-body text-xs text-on-surface-variant mb-4">
                                {event.payment_type === 'free' && "This event is completely free."}
                                {event.payment_type === 'fixed' && "There is a standard ticketing fee for this event."}
                                {event.payment_type === 'flexible' && "Acara ini bersifat infak untuk mendukung penyelenggara."}
                            </p>

                            {isFlexible && (
                                <div className="space-y-3">
                                    {flexibleTiers.map(tier => (
                                        <label key={tier} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-all ${data.base_amount === String(tier) ? 'border-primary bg-primary/5' : 'border-surface-container hover:border-outline-variant'}`}>
                                            <span className="font-medium font-body text-on-surface">Tier Rp {tier.toLocaleString()}</span>
                                            <input 
                                                type="radio" 
                                                name="base_amount" 
                                                value={tier} 
                                                checked={data.base_amount === String(tier)}
                                                onChange={e => setData('base_amount', e.target.value)}
                                                className="text-primary focus:ring-primary"
                                            />
                                        </label>
                                    ))}
                                    
                                    {rules.allow_custom && (
                                        <label className={`flex flex-col p-4 rounded-xl cursor-pointer border-2 transition-all ${(data.base_amount !== "0" && !flexibleTiers.includes(Number(data.base_amount))) ? 'border-primary bg-primary/5' : 'border-surface-container hover:border-outline-variant'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium font-body text-on-surface">Custom Infak</span>
                                                <input 
                                                    type="radio" 
                                                    name="base_amount_custom" 
                                                    checked={(data.base_amount !== "0" && !flexibleTiers.includes(Number(data.base_amount)))}
                                                    onChange={e => setData('base_amount', String(rules.min_custom || 10000))}
                                                    className="text-primary focus:ring-primary"
                                                />
                                            </div>
                                            {(data.base_amount !== "0" && !flexibleTiers.includes(Number(data.base_amount))) && (
                                                <input 
                                                    type="number" 
                                                    value={data.base_amount} 
                                                    onChange={e => setData('base_amount', e.target.value)}
                                                    className="w-full bg-surface text-on-surface border border-outline rounded-lg px-3 py-2 text-sm mt-1 focus:ring-tertiary focus:border-tertiary"
                                                    placeholder={`Min. Rp ${minimumCustom.toLocaleString()}`}
                                                />
                                            )}
                                        </label>
                                    )}
                                </div>
                            )}

                            {isFixed && (
                                <div className="p-5 bg-surface-container rounded-xl flex justify-between items-center border border-outline-variant/30">
                                    <span className="font-headline font-bold text-on-surface">Standard Ticket</span>
                                    <span className="font-body font-bold text-primary">Rp {defaultFixedPrice.toLocaleString()}</span>
                                </div>
                            )}

                            {errors.base_amount && (
                                <p className="text-error text-xs font-medium mt-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">error</span>
                                    {errors.base_amount}
                                </p>
                            )}
                        </div>

                        {/* Merchandise / Add-Ons */}
                        {event.addons && event.addons.length > 0 && (
                            <div className="border-t border-surface-container pt-6 mb-8 mt-2">
                                <h3 className="font-headline text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">checkroom</span>
                                    Official Add-Ons
                                </h3>
                                <div className="space-y-4">
                                    {event.addons.map(addon => (
                                        <div key={addon.id} className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-headline font-bold text-sm text-on-surface">{addon.name}</p>
                                                    <p className="font-body text-xs text-primary font-medium mt-0.5">Rp {parseFloat(addon.price).toLocaleString()}</p>
                                                    <p className="font-body text-[10px] text-on-surface-variant mt-1">Stock: {addon.stock_quantity}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between gap-3 bg-surface-container-highest p-2 rounded-lg">
                                                {addon.variants?.sizes ? (
                                                    <select 
                                                        className="text-xs bg-surface border-0 rounded py-1 px-2 text-on-surface focus:ring-1 focus:ring-primary w-24"
                                                        onChange={(e) => {
                                                            // For simplicity on mockup logic, update variant
                                                            const currentEl = data.addons.find(a => a.id === addon.id);
                                                            handleAddonChange(addon.id, addon.price, String(currentEl?.quantity || 0), e.target.value);
                                                        }}
                                                    >
                                                        <option value="">Size</option>
                                                        {addon.variants.sizes.map(size => (
                                                            <option key={size} value={size}>{size}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs text-on-surface-variant italic px-2">No variants</span>
                                                )}
                                                
                                                <div className="flex items-center bg-surface rounded overflow-hidden shadow-sm">
                                                    <button type="button" onClick={() => {
                                                        const currentEl = data.addons.find(a => a.id === addon.id);
                                                        const q = Math.max(0, (currentEl?.quantity || 0) - 1);
                                                        handleAddonChange(addon.id, addon.price, String(q), currentEl?.variant);
                                                    }} className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors">-</button>
                                                    <span className="px-3 text-xs font-medium text-on-surface w-8 text-center">
                                                        {data.addons.find(a => a.id === addon.id)?.quantity || 0}
                                                    </span>
                                                    <button type="button" onClick={() => {
                                                        const currentEl = data.addons.find(a => a.id === addon.id);
                                                        const q = Math.min(addon.stock_quantity, (currentEl?.quantity || 0) + 1);
                                                        handleAddonChange(addon.id, addon.price, String(q), currentEl?.variant);
                                                    }} className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors">+</button>
                                                </div>
                                            </div>
                                            {errors[`addons.${addon.id}.quantity`] && <p className="text-error text-[10px]">{errors[`addons.${addon.id}.quantity`]}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border-t-2 border-surface-container pt-6">
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-body text-on-surface-variant font-medium">Total Estimasi</span>
                                <span className="font-headline text-2xl font-bold text-on-surface">Rp {totalCalculation.toLocaleString()}</span>
                            </div>

                            <button 
                                type="submit" 
                                disabled={processing}
                                className="w-full bg-tertiary hover:bg-tertiary-container hover:text-on-tertiary-fixed text-on-tertiary py-4 px-6 rounded-full font-headline font-bold uppercase tracking-wider transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Memproses...' : 'Submit RSVP'}
                                {!processing && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
                            </button>
                            <p className="text-center font-body text-[10px] text-on-surface-variant mt-3">You will be redirected to the secure payment portal</p>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
