'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, MapPin, FileText, Camera, CheckCircle, Loader2, Users, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Lazy Load Map Picker (Prevents server-side errors with Leaflet/Google Maps)
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-black z-50 flex items-center justify-center text-white font-mono animate-pulse">SATELLITE LINK...</div>
});

// Initialize Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RequestBlood() {
    const router = useRouter();

    // State Management
    const [step, setStep] = useState(1); // 1: Vitals, 2: Location, 3: Proof/Contact, 4: Results
    const [loading, setLoading] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // Results State
    const [donorsFound, setDonorsFound] = useState<any[]>([]);
    const [proofUrl, setProofUrl] = useState('');

    // Form Data
    const [form, setForm] = useState({
        patient: '',
        blood: 'O+',
        units: '1',
        hospital: '',
        lat: 0,
        lng: 0,
        attendant: '',
        contact: ''
    });

    // CORE LOGIC: Upload Proof -> Save Request -> Scan for Donors
    const handleSubmit = async () => {
        if (!file) return alert("Medical proof is required to verify this request.");
        setLoading(true);

        try {
            // 1. Upload Photo to Supabase Storage
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const { error: uploadError } = await supabase.storage
                .from('request-proofs')
                .upload(fileName, file);

            if (uploadError) throw new Error("Image Upload Failed: " + uploadError.message);

            // Generate Public URL for the Proof
            const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/request-proofs/${fileName}`;
            setProofUrl(publicUrl);

            // 2. Save Request to Database
            const { error: dbError } = await supabase.from('requests').insert({
                patient_name: form.patient,
                blood_group: form.blood,
                units_needed: parseInt(form.units),
                hospital_name: form.hospital,
                latitude: form.lat,
                longitude: form.lng,
                attendant_name: form.attendant,
                contact_number: form.contact,
                request_proof_url: publicUrl,
                status: 'open'
            });

            if (dbError) throw new Error("Database Error: " + dbError.message);

            // 3. Run Matching Algorithm (RPC Call)
            const { data: matches, error: matchError } = await supabase.rpc('find_matching_donors', {
                request_lat: form.lat,
                request_lng: form.lng,
                needed_blood: form.blood,
                radius_km: 15 // 15km Radius Scan
            });

            if (matchError) console.error("Matching Algo Error:", matchError);

            setDonorsFound(matches || []);
            setStep(4); // Success: Move to Mission Control

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    // BROADCAST LOGIC: Generate WhatsApp Link
    const triggerBroadcast = (donorPhone?: string) => {
        const text = `🚨 *PULSE EMERGENCY ALERT* 🚨%0A%0A` +
            `*Blood Needed:* ${form.blood} (${form.units} Units)%0A` +
            `*Hospital:* ${form.hospital}%0A` +
            `*Patient:* ${form.patient}%0A` +
            `*Attendant:* ${form.attendant} (${form.contact})%0A%0A` +
            `📄 *Medical Proof:* ${proofUrl}%0A%0A` +
            `You were identified as a nearby donor. Please help.`;

        // If specific donor, DM them. If broadcast, let user pick group/contact.
        const url = donorPhone
            ? `https://wa.me/${donorPhone}?text=${text}`
            : `https://wa.me/?text=${text}`;

        window.open(url, '_blank');
    };

    // UI ANIMATIONS
    const slideVariants = {
        enter: { x: 20, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -20, opacity: 0 }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans selection:bg-red-900">

            {/* HEADER */}
            <div className="w-full max-w-md mb-8 flex items-center justify-between">
                <h1 className="text-xl font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
                    <AlertCircle className="animate-pulse" /> New Request
                </h1>
                <span className="text-gray-600 font-mono text-xs">Step {step}/4</span>
            </div>

            <AnimatePresence mode='wait'>

                {/* STEP 1: PATIENT VITALS */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        variants={slideVariants} initial="enter" animate="center" exit="exit"
                        className="w-full max-w-md space-y-6"
                    >
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block font-mono">Patient Name</label>
                            <input
                                autoFocus
                                className="w-full bg-gray-900 border border-gray-800 p-4 rounded-xl text-lg focus:border-red-500 outline-none placeholder:text-gray-700"
                                value={form.patient}
                                onChange={e => setForm({ ...form, patient: e.target.value })}
                                placeholder="Who needs help?"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block font-mono">Blood Group</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-800 p-4 rounded-xl text-lg focus:border-red-500 outline-none appearance-none"
                                    value={form.blood}
                                    onChange={e => setForm({ ...form, blood: e.target.value })}
                                >
                                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block font-mono">Units Needed</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-900 border border-gray-800 p-4 rounded-xl text-lg focus:border-red-500 outline-none"
                                    value={form.units}
                                    onChange={e => setForm({ ...form, units: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => form.patient ? setStep(2) : alert("Patient name is required.")}
                            className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors"
                        >
                            Next Step
                        </button>
                    </motion.div>
                )}

                {/* STEP 2: HOSPITAL LOCATION */}
                {step === 2 && (
                    <motion.div
                        key="step2"
                        variants={slideVariants} initial="enter" animate="center" exit="exit"
                        className="w-full max-w-md space-y-6"
                    >
                        <button
                            onClick={() => setPickerOpen(true)}
                            className={`w-full p-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 ${form.lat ? 'border-green-500 bg-green-900/10' : 'border-gray-700 hover:border-gray-500 bg-gray-900/20'}`}
                        >
                            {form.lat ? (
                                <>
                                    <CheckCircle className="text-green-500" size={32} />
                                    <span className="text-green-500 font-bold mt-2">Location Locked</span>
                                </>
                            ) : (
                                <>
                                    <MapPin className="text-gray-400" size={32} />
                                    <span className="text-gray-400 uppercase font-bold text-xs mt-2">Pin Hospital on Map</span>
                                </>
                            )}
                        </button>

                        <input
                            className="w-full bg-gray-900 border border-gray-800 p-4 rounded-xl text-sm focus:border-red-500 outline-none placeholder:text-gray-700"
                            value={form.hospital}
                            onChange={e => setForm({ ...form, hospital: e.target.value })}
                            placeholder="Hospital Name (e.g. Apollo, Indiranagar)"
                        />

                        <button
                            onClick={() => form.lat && form.hospital ? setStep(3) : alert("Precise location is required.")}
                            className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors"
                        >
                            Next Step
                        </button>

                        {/* Map Picker Modal */}
                        {pickerOpen && (
                            <LocationPicker
                                mode="office"
                                onConfirm={(lat, lng) => {
                                    setForm({ ...form, lat, lng });
                                    setPickerOpen(false);
                                }}
                                onCancel={() => setPickerOpen(false)}
                            />
                        )}
                    </motion.div>
                )}

                {/* STEP 3: CONTACT & PROOF */}
                {step === 3 && (
                    <motion.div
                        key="step3"
                        variants={slideVariants} initial="enter" animate="center" exit="exit"
                        className="w-full max-w-md space-y-6"
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block font-mono">Attendant Name</label>
                                <input
                                    className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl focus:border-red-500 outline-none"
                                    value={form.attendant}
                                    onChange={e => setForm({ ...form, attendant: e.target.value })}
                                    placeholder="e.g. Rajesh (Brother)"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block font-mono">Contact Number</label>
                                <input
                                    type="tel"
                                    className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl font-mono focus:border-red-500 outline-none"
                                    value={form.contact}
                                    onChange={e => setForm({ ...form, contact: e.target.value })}
                                    placeholder="98765 XXXXX"
                                />
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                            <label className="text-[10px] font-bold text-red-500 uppercase mb-3 flex items-center gap-2">
                                <FileText size={12} /> Required: Medical Proof
                            </label>
                            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-gray-500 transition-colors hover:bg-gray-800/50">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {file ? (
                                        <>
                                            <CheckCircle className="w-8 h-8 mb-2 text-green-500" />
                                            <p className="text-xs text-green-500 font-bold">{file.name}</p>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-8 h-8 mb-2 text-gray-400" />
                                            <p className="text-xs text-gray-500">Tap to upload Request Form</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-4 bg-red-600 text-white font-bold uppercase tracking-widest rounded-full flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'INITIATE SCAN'}
                        </button>
                    </motion.div>
                )}

                {/* STEP 4: MISSION CONTROL (RESULTS) */}
                {step === 4 && (
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md text-center"
                    >
                        <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <Users className="text-red-500" size={40} />
                        </div>

                        <h1 className="text-3xl font-black uppercase text-white mb-2 font-mono">{donorsFound.length} Matches</h1>
                        <p className="text-gray-400 text-sm mb-8">
                            Found {donorsFound.length} registered <b>{form.blood}</b> donors within 15km.
                        </p>

                        {/* Matches List */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8 text-left max-h-60 overflow-y-auto font-mono">
                            {donorsFound.length === 0 ? (
                                <div className="p-8 text-center text-gray-600 text-sm">
                                    No direct matches nearby. <br /> Use the Broadcast button below to share widely.
                                </div>
                            ) : (
                                donorsFound.map((donor, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors">
                                        <div>
                                            <p className="text-xs font-bold text-white">{donor.donor_name || 'Lifeline'}</p>
                                            <p className="text-[10px] text-gray-500">{donor.distance_km.toFixed(1)}km away</p>
                                        </div>
                                        <button
                                            onClick={() => triggerBroadcast(donor.donor_phone)}
                                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-green-500"
                                        >
                                            Alert
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Mass Broadcast Button */}
                        <button
                            onClick={() => triggerBroadcast()}
                            className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-full hover:bg-gray-200 flex items-center justify-center gap-3 transition-colors"
                        >
                            <Send size={18} /> Broadcast to Groups
                        </button>

                        <p className="text-[10px] text-gray-600 mt-4 max-w-xs mx-auto">
                            This generates an urgent message with your contact details and medical proof link.
                        </p>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}