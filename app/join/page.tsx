'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Heart, ShieldCheck, ArrowRight, Loader2, Building, User, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import LocationPicker from '@/components/LocationPicker';


// Connect to Database
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const maskLocation = (lat: number, lng: number) => {
    const jitter = 0.005;
    return {
        lat: lat + (Math.random() - 0.5) * jitter,
        lng: lng + (Math.random() - 0.5) * jitter
    };
};

export default function JoinPulse() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [pickerMode, setPickerMode] = useState<'home' | 'office' | null>(null);

    // Form Data State
    const [data, setData] = useState({
        name: '',
        age: '',
        blood: '',
        phone: '',
        home_lat: 0,
        home_lng: 0,
        office_lat: 0,
        office_lng: 0,
        consent: false
    });

    const handleLocationConfirm = (lat: number, lng: number) => {
        if (!pickerMode) return;

        // Apply privacy jitter ONLY if it's Home
        const isHome = pickerMode === 'home';
        const { lat: finalLat, lng: finalLng } = isHome
            ? maskLocation(lat, lng)
            : { lat, lng };

        setData(prev => ({
            ...prev,
            [`${pickerMode}_lat`]: finalLat,
            [`${pickerMode}_lng`]: finalLng
        }));

        setPickerMode(null); // Close picker
    };

    const submitData = async () => {
        if (!data.consent) return;
        setLoading(true);

        const { error } = await supabase.from('donors').insert({
            name: data.name,
            age: parseInt(data.age),
            blood_group: data.blood,
            phone_number: data.phone,
            latitude: data.home_lat,
            longitude: data.home_lng,
            office_latitude: data.office_lat,
            office_longitude: data.office_lng,
            consent_timestamp: new Date().toISOString(),
            is_active: true
        });

        if (error) {
            alert("Error: " + error.message);
            setLoading(false);
        } else {
            setTimeout(() => {
                // Pass name and blood to the success page
                router.push(`/success?name=${encodeURIComponent(data.name)}&blood=${encodeURIComponent(data.blood)}`);
            }, 1000);
        }
    };

    const variants = {
        enter: { x: 20, opacity: 0, filter: 'blur(4px)' },
        center: { x: 0, opacity: 1, filter: 'blur(0px)' },
        exit: { x: -20, opacity: 0, filter: 'blur(4px)' }
    };
    const transition = { duration: 0.5 }; // Smooth transition

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden selection:bg-red-900">

            {/* Refined Progress Line */}
            <div className="fixed top-0 left-0 w-full h-0.5 bg-gray-900 z-50">
                <motion.div
                    className="h-full bg-red-600 shadow-[0_0_8px_#EF4444]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / 4) * 100}%` }}
                    transition={{ duration: 0.8 }}
                />
            </div>

            {/* Location Picker Modal */}
            {pickerMode && (
                <LocationPicker
                    mode='home'
                    onConfirm={handleLocationConfirm}
                    onCancel={() => setPickerMode(null)}
                />
            )}

            <AnimatePresence mode='wait'>

                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                    <motion.div key="step1" variants={variants} initial="enter" animate="center" exit="exit" transition={transition} className="w-full max-w-sm space-y-6">
                        <div>
                            <h1 className="text-3xl font-semibold text-white mb-1 tracking-tight">Identity</h1>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Step 1 of 4</p>
                        </div>

                        <div className="space-y-4">
                            <div className="group">
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block group-focus-within:text-red-500 transition-colors">
                                    Full Name
                                </label>
                                <input
                                    autoFocus
                                    placeholder="e.g. Aditi Sharma"
                                    className="w-full bg-transparent border-b border-gray-800 py-2 text-lg font-normal focus:border-red-500 focus:outline-none transition-all placeholder:text-gray-800"
                                    value={data.name}
                                    onChange={e => setData({ ...data, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Age</label>
                                    <input
                                        type="number"
                                        placeholder="25"
                                        className="w-full bg-transparent border-b border-gray-800 py-2 text-lg font-normal focus:border-red-500 focus:outline-none"
                                        value={data.age}
                                        onChange={e => setData({ ...data, age: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Blood Type</label>
                                    <select
                                        className="w-full bg-black border-b border-gray-800 py-2 text-lg font-normal focus:border-red-500 focus:outline-none text-white appearance-none"
                                        value={data.blood}
                                        onChange={e => setData({ ...data, blood: e.target.value })}
                                    >
                                        <option value="" className="text-gray-600">Select</option>
                                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => (data.name && data.age && data.blood) ? setStep(2) : alert("Please fill all details.")}
                            className="mt-8 w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                        >
                            Continue <ChevronRight size={14} />
                        </button>
                    </motion.div>
                )}

                {/* STEP 2: CONTACT */}
                {step === 2 && (
                    <motion.div key="step2" variants={variants} initial="enter" animate="center" exit="exit" transition={transition} className="w-full max-w-sm space-y-6">
                        <div>
                            <h1 className="text-3xl font-semibold text-white mb-1 tracking-tight">Contact</h1>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Secure Line</p>
                        </div>

                        <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800/50">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase mb-2">
                                <Phone size={12} /> WhatsApp Number
                            </label>
                            <input
                                autoFocus
                                type="tel"
                                placeholder="+91 98765 XXXXX"
                                className="w-full bg-transparent text-xl font-mono tracking-wide focus:outline-none placeholder:text-gray-700 text-white"
                                value={data.phone}
                                onChange={e => setData({ ...data, phone: e.target.value })}
                            />
                        </div>

                        <p className="text-[10px] text-gray-500 text-center px-4">
                            Your number is encrypted. You are never contacted directly by strangers, only by the system.
                        </p>

                        <button onClick={() => data.phone ? setStep(3) : alert("Phone required")} className="mt-8 w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors">
                            Next Step
                        </button>
                    </motion.div>
                )}

                {/* STEP 3: LOCATION */}
                {step === 3 && (
                    <motion.div key="step3" variants={variants} initial="enter" animate="center" exit="exit" transition={transition} className="w-full max-w-sm space-y-6">
                        <div>
                            <h1 className="text-3xl font-semibold text-white mb-1 tracking-tight">Base</h1>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Location Data</p>
                        </div>

                        <div className="space-y-3">
                            {/* Home */}
                            <button
                                onClick={() => setPickerMode('home')}
                                className={`w-full p-4 rounded-xl border text-left transition-all duration-300 group ${data.home_lat ? 'border-green-500 bg-green-500/5' : 'border-gray-800 hover:border-gray-600 bg-gray-900/20'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-base font-medium flex items-center gap-3"><MapPin size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" /> Home</span>
                                    {data.home_lat !== 0 && <span className="text-[10px] text-green-500 font-bold">SECURED</span>}
                                </div>
                                <p className="text-[10px] text-gray-500 pl-7 opacity-80">
                                    {data.home_lat ? "Coordinates masked (Privacy active)." : "Tap to set for weekends/nights."}
                                </p>
                            </button>

                            {/* Office */}
                            <button
                                onClick={() => setPickerMode('office')}
                                className={`w-full p-4 rounded-xl border text-left transition-all duration-300 group ${data.office_lat ? 'border-green-500 bg-green-500/5' : 'border-gray-800 hover:border-gray-600 bg-gray-900/20'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-base font-medium flex items-center gap-3"><Building size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" /> Office</span>
                                    {data.office_lat !== 0 && <span className="text-[10px] text-green-500 font-bold">LOCKED</span>}
                                </div>
                                <p className="text-[10px] text-gray-500 pl-7 opacity-80">
                                    Tap to set for weekdays. (Optional)
                                </p>
                            </button>
                        </div>

                        <button onClick={() => data.home_lat ? setStep(4) : alert("Home Location Required")} className="mt-8 w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors">
                            Review Pact
                        </button>
                    </motion.div>
                )}

                {/* STEP 4: CONSENT */}
                {step === 4 && (
                    <motion.div key="step4" variants={variants} initial="enter" animate="center" exit="exit" transition={transition} className="w-full max-w-sm space-y-6">
                        <div>
                            <h1 className="text-3xl font-semibold text-white mb-1 tracking-tight">The Pact</h1>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Final Consent</p>
                        </div>

                        <div className="bg-gray-900/30 p-5 rounded-2xl border border-gray-800 space-y-4">
                            <div className="flex gap-4">
                                <ShieldCheck className="text-green-500 shrink-0" size={20} />
                                <p className="text-xs text-gray-400 leading-relaxed font-light">
                                    I voluntarily join <span className="text-white font-medium">Pulse</span>.
                                    My location is used solely to match me with colleagues in critical need. My data is never shared externally.
                                </p>
                            </div>

                            <div
                                onClick={() => setData({ ...data, consent: !data.consent })}
                                className="flex items-center gap-3 pt-4 border-t border-gray-800 cursor-pointer group select-none"
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-300 ${data.consent ? 'bg-red-600 border-red-600' : 'border-gray-600 group-hover:border-white'}`}>
                                    {data.consent && <Heart size={10} fill="white" className="text-white" />}
                                </div>
                                <span className={`text-sm font-medium transition-colors ${data.consent ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>I Agree & Join</span>
                            </div>
                        </div>

                        <button
                            onClick={submitData}
                            disabled={!data.consent || loading}
                            className={`mt-8 w-full py-4 text-xs font-bold uppercase tracking-widest rounded-full transition-all duration-300 ${data.consent ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-900 text-gray-700 cursor-not-allowed'}`}
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Confirm'}
                        </button>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}