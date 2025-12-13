'use server';
import { createClient } from '@supabase/supabase-js';


// Safe Backend Client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function getLiveDonors() {
    try {
        // 1. Fetch all active donors
        const { data, error } = await supabase
            .from('donors')
            .select('id, latitude, longitude, blood_group') // ONLY fetch these columns
            .eq('is_active', true);

        if (error) {
            console.error("Pulse Database Error:", error);
            return [];
        }

        if (!data) {
            console.log("Pulse: No donor data returned");
            return [];
        }

        // 2. Return the clean list
        return data.map(d => ({
            id: d.id,
            lat: d.latitude,
            lng: d.longitude,
            blood: d.blood_group
        }));

    } catch (err) {
        console.error("Pulse Network Error:", err);
        return [];
    }
}