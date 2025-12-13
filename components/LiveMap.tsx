'use client';
import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { getLiveDonors } from '@/app/actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Dark Mode Style
const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
];

export default function LiveMap() {
    const [donors, setDonors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Cinematic Camera
    const [camera, setCamera] = useState({
        center: { lat: 12.9716, lng: 77.5946 }, // Default Bangalore
        zoom: 13,
        tilt: 45,
        heading: 0
    });

    // 1. Fetch Donors & User Location
    useEffect(() => {
        async function init() {
            // Get Data
            const data = await getLiveDonors();
            setDonors(data);
            setLoading(false);

            // Get User Location to Center Map
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setCamera(prev => ({
                        ...prev,
                        center: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                        zoom: 14
                    }));
                });
            }
        }
        init();
    }, []);

    return (
        <div className="fixed inset-0 bg-black z-0">

            {/* 1. Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
                <Link href="/" className="pointer-events-auto inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2">
                    <ArrowLeft size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                </Link>
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg">
                    Live Network
                </h1>
                {/* <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-[0.2em]">
                        {loading ? "Scanning..." : `${donors.length} Lifelines Active`}
                    </p>
                </div> */}
            </div>

            {/* 2. The Map */}
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                <Map
                    {...camera}
                    onCameraChanged={(ev) => setCamera(ev.detail)}
                    mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
                    styles={darkMapStyle}
                    disableDefaultUI={true}
                    gestureHandling={'greedy'}
                    reuseMaps={true}
                >
                    {/* RENDER THE LIFELINES */}
                    {donors.map((donor) => (
                        <AdvancedMarker
                            key={donor.id}
                            position={{ lat: donor.lat, lng: donor.lng }}
                            title={`Blood Group: ${donor.blood}`}
                        >
                            {/* Custom HTML Marker: A Glowing Red Dot */}
                            <div className="relative group cursor-pointer">
                                <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white/10 shadow-[0_0_20px_rgba(220,38,38,0.8)]"></div>
                                {/* Pulse Effect */}
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>

                                {/* Hover Tooltip (Cinematic) */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 border border-gray-800 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {donor.blood}
                                </div>
                            </div>
                        </AdvancedMarker>
                    ))}
                </Map>
            </APIProvider>

            {/* 3. Loading Screen */}
            {loading && (
                <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
                    <Loader2 className="animate-spin text-red-600" size={32} />
                </div>
            )}

        </div>
    );
}