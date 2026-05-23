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
            // Append timestamp to URL to bust any CDN or Next.js fetch caches
            const urlString = typeof url === 'string' ? url : url.toString();
            const separator = urlString.includes('?') ? '&' : '?';
            const cacheBusterUrl = `${urlString}${separator}cb=${Date.now()}`;
            return fetch(cacheBusterUrl, {
                ...options,
                cache: 'no-store',
            });
        },
    },
});
