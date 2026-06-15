
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: typeof window !== 'undefined'
    },
    global: {
        fetch: (url, options) => {
            return fetch(url, {
                ...options,
                cache: typeof window === 'undefined' ? 'force-cache' : 'no-store'
            });
        }
    }
});
