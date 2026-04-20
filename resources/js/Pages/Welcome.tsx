export default function Welcome() {
    return (
        <div className="antialiased selection:bg-primary-container selection:text-on-primary-container bg-surface text-on-surface font-body">
            <nav className="bg-[#faf9f6]/90 dark:bg-[#1a1c1a]/90 backdrop-blur-xl full-width top-0 z-50 sticky shadow-[0px_10px_40px_rgba(80,100,71,0.08)]">
                <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
                    <div className="text-2xl font-bold text-[#506447] dark:text-[#d2eac5] font-headline tracking-tight">
                        Gontor Alumni
                    </div>
                    <div className="hidden md:flex gap-8 items-center font-headline tracking-tight font-semibold">
                        <a href="#" className="text-[#444840] dark:text-[#c4c8bd] hover:text-[#775a19] transition-colors duration-300">Directory</a>
                        <a href="#" className="text-[#444840] dark:text-[#c4c8bd] hover:text-[#775a19] transition-colors duration-300">Events</a>
                        <a href="#" className="text-[#444840] dark:text-[#c4c8bd] hover:text-[#775a19] transition-colors duration-300">Baitul Maal</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="/auth/google/redirect" className="hidden md:flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label font-medium hover:bg-primary-container hover:text-on-primary-container transition-all">
                            Login
                        </a>
                    </div>
                </div>
            </nav>

            <main>
                <section className="relative pt-32 pb-40 overflow-hidden bg-surface">
                    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                        <img alt="background illustration" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf_onnKJ-eERSHHImdAU3WjTLjLekMUn_PjnJcBm9XVKyRzRX59U6h7YKdtO2rbbypm_GigUcvevI5zUi97eXi7PqwSH7goWtkSID9uZQNwHb3dBMepVMpKcYpxu5TEIBlWaoDFzkHsjXSozdCApNTqZMVJP8e4D0fDHlY9jVTFMXYPVIkoHvIPddROl9TRr69Luod0_37iQh-YMuOkhmOfs9lffWWbvOL7fZGJwTvO_eAcLaOOctNC49s4He-MXUslJPotideYRUi" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/95 to-surface z-0"></div>
                    <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-16">
                        <div className="w-full md:w-3/5 text-left md:pr-12">
                            <span className="inline-block py-1.5 px-4 mb-6 rounded-full bg-secondary-container text-on-surface-variant font-label text-sm font-medium">
                                The Academic Sanctuary
                            </span>
                            <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-on-surface leading-[1.1] tracking-tight mb-8">
                                Sambung Rasa,<br />
                                <span className="text-primary">Bangun Karya</span>
                            </h1>
                            <p className="text-xl text-on-surface-variant font-body leading-relaxed mb-10 max-w-2xl">
                                Portal Alumni Gontor. A quiet lounge where legacy meets future opportunity. Reconnect with brothers, support the community, and grow your network.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a href="/auth/google/redirect" className="flex items-center justify-center gap-3 bg-tertiary text-on-tertiary px-8 py-4 rounded-full font-label font-semibold text-lg hover:bg-tertiary-container hover:text-on-tertiary transition-all shadow-[0px_10px_40px_rgba(119,90,25,0.2)]">
                                    <img alt="Google Logo" className="w-6 h-6 bg-white rounded-full p-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC778clsHZURkyI2GEselrJF_U6JUWPJV1EHLoo2Q3R23y8mtt4yiMCe8NNlGqETfiFghEgbouV8h1Flj1k4PgN9qRRoxik4yAQj1FUOPnNKPjh0-_iL3rpS53fl6y_HOVomryZ3eYocXteuti9QY__h12a78cyJOx-93pcRXRFoCcvsXrsG9Q0dKgFTKmm-Kr-qvckNq9IRa0m6cCIBOV7SYYCpLH3C8yOjsgicCsoD_47vHgj9QjRZuThXtS1w0a0M57cCU0FczJR" />
                                    Gabung dengan Google
                                </a>
                            </div>
                        </div>
                        <div className="w-full md:w-2/5 relative">
                            <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-[0px_20px_60px_rgba(80,100,71,0.15)]">
                                <img alt="Students gathering" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWRZHgH5vjwGheQFpqSzGm6R9F2bs7Xr9wWLL-Ol-mA1FgX9l4xh4tXn0dQ3Be8_aTLW-EwExmj4_MgZ_WDuzhW4nPA1ee55F_yuY8B15OvYJw3zSynkM3_vHszGgmFCFTe19l4vE0qpCw6QJxjmmYfBDaJblqLYVI2qUJrHQaOuprYXdrt6-CJ2zGfdSC62Q_MB20n3vnefB-iNa6lrAG9nRXyuy2pXjkxH6egWVngPm_9wrGvNajfR_k8p2ptiY41mbAJkzPtwcx" />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 w-full p-8">
                                    <p className="text-surface-bright font-headline font-bold text-2xl mb-2">Preserving Legacy</p>
                                    <p className="text-surface-bright/80 font-body text-sm">Empowering the next generation of leaders.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-24 bg-surface-container-low relative">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="mb-16">
                            <h2 className="text-3xl font-headline font-bold text-on-surface mb-4">Discover Your Network</h2>
                            <p className="text-on-surface-variant font-body max-w-2xl">Explore opportunities, connect with peers, and contribute to the growth of our shared legacy.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col justify-between group hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] transition-all duration-300">
                                <div>
                                    <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center mb-6 text-primary">
                                        <span className="material-symbols-outlined text-2xl">group</span>
                                    </div>
                                    <h3 className="text-xl font-headline font-bold text-on-surface mb-3">Directory</h3>
                                    <p className="text-on-surface-variant font-body text-sm mb-6">Find and connect with alumni across different generations and professions worldwide.</p>
                                </div>
                                <a href="#" className="inline-flex items-center text-primary font-label font-semibold group-hover:text-tertiary transition-colors">
                                    Explore Network <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
                                </a>
                            </div>

                            <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col justify-between group hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] transition-all duration-300">
                                <div>
                                    <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center mb-6 text-primary">
                                        <span className="material-symbols-outlined text-2xl">event</span>
                                    </div>
                                    <h3 className="text-xl font-headline font-bold text-on-surface mb-3">Latest Events</h3>
                                    <p className="text-on-surface-variant font-body text-sm mb-6">Stay updated on upcoming gatherings, seminars, and community events.</p>
                                </div>
                                <a href="#" className="inline-flex items-center text-primary font-label font-semibold group-hover:text-tertiary transition-colors">
                                    View Calendar <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
                                </a>
                            </div>

                            <div className="bg-primary-container rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary rounded-full opacity-20 blur-2xl"></div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-full bg-surface-bright/30 flex items-center justify-center mb-6 text-on-primary-container">
                                        <span className="material-symbols-outlined text-2xl">volunteer_activism</span>
                                    </div>
                                    <h3 className="text-xl font-headline font-bold text-on-primary-container mb-2">Baitul Maal Funds</h3>
                                    <p className="text-on-primary-container/80 font-body text-sm mb-6">Supporting scholarships and community welfare initiatives.</p>
                                    <div className="mb-6">
                                        <span className="text-3xl font-headline font-extrabold text-on-primary-container">Rp 2.4B+</span>
                                        <span className="block text-xs font-label text-on-primary-container/70 mt-1 uppercase tracking-wider">Total Raised This Year</span>
                                    </div>
                                </div>
                                <a href="#" className="inline-flex items-center justify-center w-full py-3 bg-tertiary text-on-tertiary rounded-xl font-label font-semibold hover:bg-tertiary-container transition-colors relative z-10">
                                    Contribute Now
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-[#506447] dark:bg-[#131a12] full-width py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center gap-6">
                    <div className="font-headline text-white font-bold text-2xl mb-4">
                        Gontor Alumni
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 mb-8">
                        <a href="#" className="font-body text-sm text-[#d2eac5] hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="font-body text-sm text-[#d2eac5] hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="font-body text-sm text-[#d2eac5] hover:text-white transition-colors">Contact Us</a>
                        <a href="#" className="font-body text-sm text-[#d2eac5] hover:text-white transition-colors">Alumni Network</a>
                    </div>
                    <p className="font-body text-xs text-[#d2eac5]/70">
                        © 2024 IKPM Gontor. Preserving Legacy, Empowering Future.
                    </p>
                </div>
            </footer>
        </div>
    );
}
