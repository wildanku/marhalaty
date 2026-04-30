import Header from "@/Components/Header";
import UpcomingEvents from "@/Components/UpcomingEvents";
import { useTranslate } from "@/hooks/useTranslate";
import { GontorEvent, PageProps } from "@/types";

interface WelcomeProps extends PageProps {
  upcomingEvents: GontorEvent[];
}

export default function Welcome({ upcomingEvents }: WelcomeProps) {
  const { t } = useTranslate();

  return (
    <div className="antialiased selection:bg-primary-container selection:text-on-primary-container bg-surface text-on-surface font-body">
      <Header />

      <main>
        <section className="relative pt-32 pb-40 overflow-hidden bg-surface">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <img
              alt="background illustration"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf_onnKJ-eERSHHImdAU3WjTLjLekMUn_PjnJcBm9XVKyRzRX59U6h7YKdtO2rbbypm_GigUcvevI5zUi97eXi7PqwSH7goWtkSID9uZQNwHb3dBMepVMpKcYpxu5TEIBlWaoDFzkHsjXSozdCApNTqZMVJP8e4D0fDHlY9jVTFMXYPVIkoHvIPddROl9TRr69Luod0_37iQh-YMuOkhmOfs9lffWWbvOL7fZGJwTvO_eAcLaOOctNC49s4He-MXUslJPotideYRUi"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/95 to-surface z-0"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-16">
            <div className="w-full md:w-3/5 text-left md:pr-12">
              <span className="inline-block py-1.5 px-4 mb-6 rounded-full bg-secondary-container text-on-surface-variant font-label text-sm font-medium">
                Gontor 2013 | Dynamic
              </span>
              <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-on-surface leading-[1.1] tracking-tight mb-8">
                Sambung Rasa,
                <br />
                <span className="text-primary">Bangun Karya</span>
              </h1>
              <p className="text-xl text-on-surface-variant font-body leading-relaxed mb-10 max-w-2xl">
                {t("Portal Alumni Gontor. A quiet lounge where legacy meets future opportunity. Reconnect with brothers, support the community, and grow your network.")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/auth/google/redirect"
                  className="flex items-center justify-center gap-3 bg-gray-800 text-gray-100 pr-8 pl-4 py-4 rounded-full font-label font-semibold text-lg hover:bg-gray-900 hover:text-on-tertiary transition-all shadow-[0px_10px_40px_rgba(119,90,25,0.2)]"
                >
                  <img
                    alt="Google Logo"
                    className="w-6 h-6 rounded-full p-0"
                    src="/google.svg"
                  />
                  {t("Gabung dengan Google")}
                </a>
              </div>
            </div>
            <div className="w-full md:w-2/5 relative">
              <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-[0px_20px_60px_rgba(80,100,71,0.15)]">
                <img
                  alt="Dynamic Gontor 2013"
                  className="w-full h-full object-cover"
                  src="/main-image.jpeg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-8">
                  <p className="text-surface-bright font-headline font-bold text-2xl mb-2">
                    {t("Preserving Legacy")}
                  </p>
                  <p className="text-surface-bright/80 font-body text-sm">
                    {t("Empowering the next generation of leaders.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-surface-container-low relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-3xl font-headline font-bold text-on-surface mb-4">
                {t("Discover Your Network")}
              </h2>
              <p className="text-on-surface-variant font-body max-w-2xl">
                {t("Explore opportunities, connect with peers, and contribute to the growth of our shared legacy.")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col justify-between group hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] transition-all duration-300">
                <div>
                  <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center mb-6 text-primary">
                    <span className="material-symbols-outlined text-2xl">group</span>
                  </div>
                  <h3 className="text-xl font-headline font-bold text-on-surface mb-3">
                    {t("Directory")}
                  </h3>
                  <p className="text-on-surface-variant font-body text-sm mb-6">
                    {t("Find and connect with alumni across different generations and professions worldwide.")}
                  </p>
                </div>
                <a
                  href="/directory"
                  className="inline-flex items-center text-primary font-label font-semibold group-hover:text-tertiary transition-colors"
                >
                  {t("Explore Network")}{" "}
                  <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
                </a>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col justify-between group hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] transition-all duration-300">
                <div>
                  <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center mb-6 text-primary">
                    <span className="material-symbols-outlined text-2xl">event</span>
                  </div>
                  <h3 className="text-xl font-headline font-bold text-on-surface mb-3">
                    {t("Latest Events")}
                  </h3>
                  <p className="text-on-surface-variant font-body text-sm mb-6">
                    {t("Stay updated on upcoming gatherings, seminars, and community events.")}
                  </p>
                </div>
                <a
                  href="/events"
                  className="inline-flex items-center text-primary font-label font-semibold group-hover:text-tertiary transition-colors"
                >
                  {t("View Calendar")}{" "}
                  <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
                </a>
              </div>

              {/* <div className="bg-primary-container rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary rounded-full opacity-20 blur-2xl"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-surface-bright/30 flex items-center justify-center mb-6 text-on-primary-container">
                    <span className="material-symbols-outlined text-2xl">volunteer_activism</span>
                  </div>
                  <h3 className="text-xl font-headline font-bold text-on-primary-container mb-2">
                    {t("Baitul Maal Funds")}
                  </h3>
                  <p className="text-on-primary-container/80 font-body text-sm mb-6">
                    {t("Supporting scholarships and community welfare initiatives.")}
                  </p>
                  <div className="mb-6">
                    <span className="text-3xl font-headline font-extrabold text-on-primary-container">
                      Rp 2.4B+
                    </span>
                    <span className="block text-xs font-label text-on-primary-container/70 mt-1 uppercase tracking-wider">
                      {t("Total Raised This Year")}
                    </span>
                  </div>
                </div>
                <a
                  href="/donation"
                  className="inline-flex items-center justify-center w-full py-3 bg-tertiary text-on-tertiary rounded-xl font-label font-semibold hover:bg-tertiary-container transition-colors relative z-10"
                >
                  {t("Contribute Now")}
                </a>
              </div> */}
            </div>
          </div>
        </section>
      </main>
      
      <UpcomingEvents events={upcomingEvents} />

      <footer className="bg-[#506447] dark:bg-[#131a12] full-width py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center gap-6">
          <div className="font-headline text-white font-bold text-2xl mb-4">Dynamic Everywhere</div>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <a
              href="#"
              className="font-body text-sm text-[#d2eac5] hover:text-white transition-colors"
            >
              {t("Privacy Policy")}
            </a>
            <a
              href="#"
              className="font-body text-sm text-[#d2eac5] hover:text-white transition-colors"
            >
              {t("Terms of Service")}
            </a>
            <a
              href="#"
              className="font-body text-sm text-[#d2eac5] hover:text-white transition-colors"
            >
              {t("Contact Us")}
            </a>
            <a
              href="#"
              className="font-body text-sm text-[#d2eac5] hover:text-white transition-colors"
            >
              {t("Alumni Network")}
            </a>
          </div>
          <p className="font-body text-xs text-[#d2eac5]/70">
            © {new Date().getFullYear()} Dyanamic Everywhere. {t("Powered by Marhalaty an Open Source for Alumni Platform.")}
          </p>
        </div>
      </footer>
    </div>
  );
}
