import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Caching client for public static content (hero, about, magazines, team, etc.)
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
    },
    global: {
        fetch: (url, options) => {
            return fetch(url, {
                ...options,
                next: { revalidate: 60 },
            });
        },
    },
});

// Dynamic/non-caching client for live/realtime dashboard metrics
export const supabaseDynamic = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
    },
    global: {
        fetch: (url, options) => {
            // Safely resolve the URL string
            let urlString = '';
            if (typeof url === 'string') {
                urlString = url;
            } else if (url && typeof url === 'object' && 'url' in url) {
                urlString = (url as any).url;
            } else {
                urlString = String(url);
            }
            
            const separator = urlString.includes('?') ? '&' : '?';
            const cacheBusterUrl = `${urlString}${separator}cb=${Date.now()}`;
            return fetch(cacheBusterUrl, {
                ...options,
                cache: 'no-store',
            });
        },
    },
});
