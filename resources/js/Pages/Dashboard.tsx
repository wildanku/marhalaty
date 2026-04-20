import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Dashboard() {
    const { auth } = usePage<PageProps>().props;

    return (
        <div className="min-h-screen bg-surface">
            <Head title="Dashboard" />

            <header className="bg-surface-container-lowest shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <h2 className="font-headline font-semibold text-xl text-on-surface leading-tight">Dashboard</h2>
                </div>
            </header>

            <main>
                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-surface-container-lowest overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 text-on-surface">You're logged in as {auth?.user?.name}!</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
