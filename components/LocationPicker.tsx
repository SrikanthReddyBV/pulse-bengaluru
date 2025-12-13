'use client';
import { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, MapCameraChangedEvent, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Check, Search, X } from 'lucide-react';

// Dark Mode Map Style
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

interface LocationPickerProps {
    mode: 'home' | 'office';
    onConfirm: (lat: number, lng: number) => void;
    onCancel: () => void;
}

// INTERNAL COMPONENT: Search Box Logic
function SearchBox({ onSelectLocation }: { onSelectLocation: (lat: number, lng: number) => void }) {
    const map = useMap();
    const placesLib = useMapsLibrary('places');
    const inputRef = useRef<HTMLInputElement>(null);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    // Initialize Autocomplete
    useEffect(() => {
        if (!placesLib || !inputRef.current) return;

        const ac = new placesLib.Autocomplete(inputRef.current, {
            fields: ['geometry', 'name'],
            types: ['geocode', 'establishment'], // Search everything
        });

        setAutocomplete(ac);

        return () => {
            google.maps.event.clearInstanceListeners(ac);
        };
    }, [placesLib]);

    // Handle Place Selection
    useEffect(() => {
        if (!autocomplete || !map) return;

        const listener = autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();

                // Cinematic Fly-To Animation
                map.moveCamera({
                    center: { lat, lng },
                    zoom: 17,
                    tilt: 45
                });

                // Optional: Close keyboard on mobile
                inputRef.current?.blur();
            }
        });

        return () => listener.remove();
    }, [autocomplete, map]);

    return (
        <div className="absolute top-24 left-6 right-6 z-[502]">
            <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-400 group-focus-within:text-white transition-colors" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search address, office, or landmark..."
                    className="w-full bg-gray-800/90 backdrop-blur-md border border-gray-700 text-white rounded-xl py-4 pl-10 pr-4 shadow-2xl focus:outline-none focus:border-red-500 transition-all placeholder:text-gray-500 text-sm font-medium"
                />
            </div>
        </div>
    );
}

// MAIN COMPONENT
export default function LocationPicker({ mode, onConfirm, onCancel }: LocationPickerProps) {
    // Default Camera
    const [cameraProps, setCameraProps] = useState({
        center: { lat: 12.9716, lng: 77.5946 },
        zoom: 15,
        tilt: 45,
        heading: 0
    });

    // 1. Get Real GPS Location on Mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setCameraProps(prev => ({
                    ...prev,
                    center: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                }));
            });
        }
    }, []);

    // 2. Handle Dragging
    const handleCameraChange = (ev: MapCameraChangedEvent) => {
        setCameraProps(ev.detail);
    };

    // 3. Locate Me Function
    const handleLocateMe = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setCameraProps(prev => ({
                    ...prev,
                    center: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                    zoom: 18,
                    tilt: 50
                }));
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-[501] p-6 pt-8 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none h-40">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-lg">
                    {mode === 'home' ? "Set Home Base" : "Set Work Base"}
                </h2>
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">
                    Drag map or search to pinpoint
                </p>
            </div>

            {/* The Map Engine */}
            <div className="flex-1 relative bg-gray-900">
                <APIProvider
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                    libraries={['places']} // <--- CRITICAL: Loads the Search Logic
                >

                    <Map
                        {...cameraProps}
                        onCameraChanged={handleCameraChange}
                        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
                        styles={darkMapStyle}
                        disableDefaultUI={true}
                        gestureHandling={'greedy'}
                        reuseMaps={true}
                    />

                    {/* The Search Bar (Now inside APIProvider context) */}
                    <SearchBox onSelectLocation={(lat, lng) => console.log(lat, lng)} />

                </APIProvider>

                {/* The Fixed Target Pin */}
                <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
                    <div className="relative -mt-8 flex flex-col items-center">
                        <MapPin size={48} className="text-red-500 fill-red-500/20 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] animate-bounce" />
                        <div className="w-4 h-1 bg-black/50 blur-[2px] rounded-full mt-1"></div>
                    </div>
                </div>

                {/* Locate Me Button */}
                <button
                    onClick={handleLocateMe}
                    className="absolute bottom-32 right-6 z-[500] bg-gray-800/90 backdrop-blur-md p-4 rounded-full border border-gray-700 shadow-2xl text-white hover:bg-gray-700 transition-colors"
                >
                    <Navigation size={24} className="fill-white" />
                </button>
            </div>

            {/* Action Bar */}
            <div className="bg-black border-t border-gray-800 p-6 pb-10 flex gap-4 z-[501]">
                <button
                    onClick={onCancel}
                    className="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onConfirm(cameraProps.center.lat, cameraProps.center.lng)}
                    className="flex-[2] py-4 bg-white text-black font-black uppercase tracking-widest rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                >
                    <Check size={18} /> Confirm Location
                </button>
            </div>

        </div>
    );
}