
import { createClient } from '@supabase/supabase-js';

const isClient = typeof window !== 'undefined';

const supabaseUrl = isClient
    ? `${window.location.origin}/api/supabase`
    : (process.env["SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"] || 'https://placeholder.supabase.co');

const supabaseKey = isClient
    ? 'proxy-dummy-key'
    : (process.env["SUPABASE_ANON_KEY"] || process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || 'placeholder-key');

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: isClient
    },
    global: {
        fetch: (url, options) => {
            return fetch(url, {
                ...options,
                cache: !isClient ? 'force-cache' : 'no-store'
            });
        }
    }
});
