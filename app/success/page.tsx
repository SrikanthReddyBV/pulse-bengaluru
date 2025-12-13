'use client';
import { useSearchParams } from 'next/navigation';
import LifelineBadge from '@/components/LifelineBadge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const name = searchParams.get('name') || 'Donor';
    const blood = searchParams.get('blood') || 'O+';

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">

            {/* Human Welcome */}
            <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                <h1 className="text-xl font-medium text-white mb-2 tracking-tight">Thank you, {name}.</h1>
                <p className="text-gray-500 text-xs font-light tracking-wide">
                    You are now part of the Pulse.
                </p>
            </div>

            <LifelineBadge name={name} bloodGroup={blood} />

            <Link href="/" className="mt-16 text-gray-600 hover:text-white flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors opacity-50 hover:opacity-100">
                <ArrowLeft size={12} /> Return Home
            </Link>

        </div>
    );
}