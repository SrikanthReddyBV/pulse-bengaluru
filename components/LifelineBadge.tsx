'use client';
import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2, Activity } from 'lucide-react';
import QRCode from 'react-qr-code';

interface BadgeProps {
    name: string;
    bloodGroup: string;
}

export default function LifelineBadge({ name, bloodGroup }: BadgeProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    const downloadBadge = async () => {
        if (!cardRef.current) return;
        setLoading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
            const link = document.createElement('a');
            link.download = `Pulse-Card-${name}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            alert("Could not save image. Please screenshot.");
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center animate-in zoom-in duration-700">

            {/* THE ID CARD */}
            <div
                ref={cardRef}
                className="relative w-[320px] h-130 bg-black rounded-4xl overflow-hidden border border-gray-800/50 shadow-2xl flex flex-col items-center text-white"
                style={{ backgroundImage: 'linear-gradient(to bottom, #111 0%, #000 100%)' }}
            >

                {/* Subtle Header */}
                <div className="mt-10 flex items-center gap-2 opacity-50">
                    <Activity size={14} className="text-white" />
                    <span className="text-[10px] uppercase tracking-[0.4em] font-medium">Pulse</span>
                </div>

                {/* The Core Identity (Massive) */}
                <div className="mt-16 text-center relative z-10">
                    <h1 className="text-9xl font-black text-transparent bg-clip-text bg-linear-to-b from-red-500 to-red-900 tracking-tighter drop-shadow-2xl">
                        {bloodGroup}
                    </h1>
                    <p className="text-gray-500 text-[9px] uppercase tracking-[0.4em] mt-4 opacity-60">Blood Type</p>
                </div>

                {/* User Identity (Clean) */}
                <div className="mt-auto mb-10 text-center w-full px-8">
                    <h2 className="text-2xl font-medium tracking-tight text-white">{name}</h2>
                    <p className="text-red-500 text-[10px] uppercase tracking-widest mt-2 font-bold">Registered Donor</p>

                    <div className="mt-8 pt-8 border-t border-gray-900 flex flex-col items-center gap-4">
                        <div className="bg-white p-1.5 rounded-lg">
                            <QRCode
                                value="https://pulse-grid.pages.dev"
                                size={60}
                                fgColor="#000000"
                                bgColor="#FFFFFF"
                            />
                        </div>
                        <p className="text-[8px] text-gray-600 uppercase tracking-widest">Scan to join</p>
                    </div>
                </div>

                {/* Cinematic Ambient Light */}
                <div className="absolute -top-12.5 inset-x-0 h-50 bg-linear-to-b from-red-900/20 to-transparent blur-3xl pointer-events-none"></div>
            </div>

            {/* MINIMALIST ACTION BUTTONS */}
            <div className="flex gap-3 mt-8">
                <button
                    onClick={downloadBadge}
                    className="bg-white text-black px-8 py-3 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                    {loading ? "Saving..." : <><Download size={14} /> Save Card</>}
                </button>

                <button
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: 'Pulse Donor',
                                text: 'I pledged to donate on Pulse.',
                                url: 'https://pulse-grid.pages.dev'
                            });
                        }
                    }}
                    className="bg-gray-900 text-white px-5 py-3 rounded-full hover:bg-gray-800 transition-colors border border-gray-800"
                >
                    <Share2 size={16} />
                </button>
            </div>

        </div>
    );
}