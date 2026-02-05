

import { supabase } from "@/lib/supabaseClient";
import { R2_DOMAIN } from "@/lib/constants";

// --- Types ---

export interface HeroSlide {
    id: string;
    imageUrl: string;
    title: string;
    subtitle: string;
    objectFit: "cover" | "contain";
    timer: number;
}

export interface AboutContent {
    title: string;
    description: string;
    slides: string[];
    cards: { title: string; description: string }[];
    richContent?: ContentBlock[];
}

export interface ContentBlock {
    id: string;
    type: "heading" | "paragraph" | "image" | "double_image";
    content: string; // For double_image: "url1|||url2"
    style?: {
        align?: "left" | "center" | "right";
        width?: number; // percentage
        layout?: "normal" | "wide"; // wide = max-w-7xl, normal = max-w-4xl (default)
        aspectRatio?: "auto" | "cover"; // auto = natural, cover = fixed height (default)
    };
}

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    imageUrl: string;
    email: string;
    linkedin: string;
    details: string;
    category?: "Senior Team" | "Junior Team" | "Faculty Mentor";
}

export interface Magazine {
    id: string;
    title: string;
    issueDate: string;
    issueMonth: string;
    issueYear: string;
    coverUrl: string;
    pdfUrl: string;
    flipUrl?: string;
}

export interface Event {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    type: "Upcoming" | "Live" | "Past";
    imageUrl: string;
    orientation?: "landscape" | "portrait" | "square";
    meetingLink?: string;
    isOnline: boolean;
}

export interface NAVData {
    id: string;
    date: string;
    value: number;
}

export interface NIFMetrics {
    annualizedReturn: string;
    totalAUM: string;
    ytdReturn: string;
    fundUnits?: string; // New field for auto AUM calc
    isAutoReturn?: boolean; // New field for auto CAGR calc
    assetAllocation: { name: string; value: number; color: string }[];
}

export interface SocialLink {
    id: string;
    platform: "linkedin" | "instagram" | "facebook" | "twitter" | "youtube" | "email" | "other" | string;
    url: string;
    label?: string; // For custom platform names
    isActive: boolean;
}

export interface Notice {
    id: string;
    title: string;
    category: "General" | "Promotion" | "Reminder" | "Urgent" | string;
    content: string;
    date: string;
    time?: string;
    expiryDate?: string;
    imageUrl?: string;
    link?: string;
    linkLabel?: string;
}

export interface SiteSettings {
    socialLinks: SocialLink[];
}

export interface Resource {
    id: string;
    title: string;
    description: string;
    type: "file" | "link" | "folder";
    url: string;
    coverImage: string;
    date: string;
    parentId?: string | null;
}

// --- Defaults (Fallbacks) ---

const DEFAULT_HERO: HeroSlide[] = [{ id: "1", imageUrl: "/hero_background.png", title: "Niveshak Supabase", subtitle: "Connecting...", objectFit: "cover", timer: 5 }];
const DEFAULT_ABOUT: AboutContent = { title: "About Niveshak", description: "Loading content...", slides: [], cards: [], richContent: [] };
const DEFAULT_NIF: NIFMetrics = { annualizedReturn: "0", totalAUM: "0", ytdReturn: "0", fundUnits: "0", isAutoReturn: false, assetAllocation: [] };

// --- Helper for R2 Resolution ---
const resolveUrl = (legacyUrl: string, mediaKey?: string | null, provider?: string | null) => {
    if (provider === 'r2' && mediaKey) {
        return `${R2_DOMAIN}/${mediaKey}`;
    }
    return legacyUrl;
};

// --- Service ---

export const dataService = {
    // --- Hero ---
    getHeroSlides: async (): Promise<HeroSlide[]> => {
        const { data, error } = await supabase.from('hero_slides').select('*');
        if (error || !data || data.length === 0) return DEFAULT_HERO;

        // Map snake_case DB to camelCase Types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((d: any) => ({
            id: d.id,
            imageUrl: resolveUrl(d.image_url, d.media_key, d.storage_provider),
            title: d.title,
            subtitle: d.subtitle,
            objectFit: d.object_fit,
            timer: d.timer
        }));
    },
    saveHeroSlides: async (slides: HeroSlide[]) => {
        // Full replace logic can be complex in SQL. Simple strategy: Upsert all. 
        // Note: This doesn't delete removed slides. For verify simple app, we can Delete All then Insert All transactionally or just Upsert.
        // Let's trying "Delete not in list" or just simple upsert for now.
        // Better: Delete all rows and re-insert? A bit heavy but clean for "List Management".

        // Strategy: Delete All -> Insert All (Cleanest for re-ordering)
        await supabase.from('hero_slides').delete().neq('id', '0');

        const rows = slides.map(s => {
            // Check if URL is R2 to preserve metadata (simple check)
            const isR2 = s.imageUrl.startsWith(R2_DOMAIN);
            const mediaKey = isR2 ? s.imageUrl.replace(`${R2_DOMAIN}/`, '') : null;
            return {
                id: s.id,
                image_url: s.imageUrl,
                title: s.title,
                subtitle: s.subtitle,
                object_fit: s.objectFit,
                timer: s.timer,
                storage_provider: isR2 ? 'r2' : 'legacy',
                media_key: mediaKey
            };
        });

        const { error } = await supabase.from('hero_slides').insert(rows);
        if (error) console.error("Save Hero Error", error);
    },

    // --- About (Singleton ID='about') ---
    getAbout: async (): Promise<AboutContent> => {
        const { data, error } = await supabase.from('about_content').select('*').eq('id', 'about').single();
        if (error || !data) return DEFAULT_ABOUT;

        return {
            title: data.title,
            description: data.description,
            slides: data.slides,
            cards: data.cards,
            richContent: data.rich_content
        };
    },
    saveAbout: async (data: AboutContent) => {
        const row = {
            id: 'about',
            title: data.title,
            description: data.description,
            slides: data.slides,
            cards: data.cards,
            rich_content: data.richContent
        };
        const { error } = await supabase.from('about_content').upsert(row);
        if (error) console.error("Save About Error", error);
    },

    // --- Team ---
    getTeam: async (): Promise<TeamMember[]> => {
        const { data, error } = await supabase.from('team_members').select('*');
        if (error || !data) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            role: d.role,
            imageUrl: resolveUrl(d.image_url, d.media_key, d.storage_provider),
            email: d.email,
            linkedin: d.linkedin,
            details: d.details,
            category: d.category
        }));
    },
    saveTeam: async (members: TeamMember[]) => {
        await supabase.from('team_members').delete().neq('id', '0');
        const rows = members.map(m => {
            const isR2 = m.imageUrl.startsWith(R2_DOMAIN);
            const mediaKey = isR2 ? m.imageUrl.replace(`${R2_DOMAIN}/`, '') : null;
            return {
                id: m.id,
                name: m.name,
                role: m.role,
                image_url: m.imageUrl,
                email: m.email,
                linkedin: m.linkedin,
                details: m.details,
                category: m.category,
                storage_provider: isR2 ? 'r2' : 'legacy',
                media_key: mediaKey
            };
        });
        const { error } = await supabase.from('team_members').insert(rows);
        if (error) console.error("Save Team Error", error);
    },

    // --- Magazines ---
    getMagazines: async (): Promise<Magazine[]> => {
        const { data, error } = await supabase.from('magazines').select('*');
        if (error || !data) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((d: any) => ({
            id: d.id,
            title: d.title,
            issueDate: d.issue_date,
            issueMonth: d.issue_month,
            issueYear: d.issue_year,
            coverUrl: resolveUrl(d.cover_url, d.media_key, d.storage_provider),
            pdfUrl: resolveUrl(d.pdf_url, d.pdf_media_key, d.storage_provider),
            flipUrl: d.flip_url
        }));
    },
    saveMagazines: async (mags: Magazine[]) => {
        await supabase.from('magazines').delete().neq('id', '0');
        const rows = mags.map(m => {
            const isR2Cover = m.coverUrl.startsWith(R2_DOMAIN);
            const coverKey = isR2Cover ? m.coverUrl.replace(`${R2_DOMAIN}/`, '') : null;

            const isR2Pdf = m.pdfUrl.startsWith(R2_DOMAIN);
            const pdfKey = isR2Pdf ? m.pdfUrl.replace(`${R2_DOMAIN}/`, '') : null;

            return {
                id: m.id,
                title: m.title,
                issue_date: m.issueDate,
                issue_month: m.issueMonth,
                issue_year: m.issueYear,
                cover_url: m.coverUrl,
                pdf_url: m.pdfUrl,
                flip_url: m.flipUrl,
                storage_provider: (isR2Cover || isR2Pdf) ? 'r2' : 'legacy', // Simplified logic, ideally granular but schema has one provider column usually? 
                // Wait, schema has one storage_provider. We assume if one is R2, we mark as R2. 
                // Actually for read, we check media_key presence. Provider column is mostly metadata.
                media_key: coverKey,
                pdf_media_key: pdfKey
            };
        });
        const { error } = await supabase.from('magazines').insert(rows);
        if (error) console.error("Save Mags Error", error);
    },

    // --- Events ---
    getEvents: async (): Promise<Event[]> => {
        const { data, error } = await supabase.from('events').select('*');
        if (error || !data) return [];

        const today = new Date();
        // Format YYYY-MM-DD manually to avoid timezone issues
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((d: any) => {
            let calculatedType = d.type;

            // Auto-categorize based on date
            if (d.date === todayStr) {
                calculatedType = "Live";
            } else if (d.date < todayStr) {
                calculatedType = "Past";
            } else if (d.date > todayStr) {
                // Keep existing "Upcoming" or if it was manually set to something else, reset to "Upcoming" if it wasn't already "Live" (admin override?)
                // Actually, simple logic: Future = Upcoming, Today = Live, Past = Past.
                // Unless we want to support "Live" for future? Unlikely.
                calculatedType = "Upcoming";
            }

            return {
                id: d.id,
                title: d.title,
                date: d.date,
                time: d.time,
                location: d.location,
                type: calculatedType, // Use calculated type
                imageUrl: resolveUrl(d.image_url, d.media_key, d.storage_provider),
                orientation: d.orientation,
                meetingLink: d.meeting_link,
                isOnline: d.is_online
            };
        });
    },
    saveEvents: async (events: Event[]) => {
        await supabase.from('events').delete().neq('id', '0');
        const rows = events.map(e => {
            const isR2 = e.imageUrl.startsWith(R2_DOMAIN);
            const mediaKey = isR2 ? e.imageUrl.replace(`${R2_DOMAIN}/`, '') : null;
            return {
                id: e.id,
                title: e.title,
                date: e.date,
                time: e.time,
                location: e.location,
                type: e.type,
                image_url: e.imageUrl,
                orientation: e.orientation,
                meeting_link: e.meetingLink,
                is_online: e.isOnline,
                storage_provider: isR2 ? 'r2' : 'legacy',
                media_key: mediaKey
            };
        });
        const { error } = await supabase.from('events').insert(rows);
        if (error) console.error("Save Events Error", error);
    },

    // --- NIF ---
    getNAVData: async (): Promise<NAVData[]> => {
        const { data, error } = await supabase.from('nav_data').select('*').order('date', { ascending: true });
        if (error || !data) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((d: any) => ({
            id: d.id,
            date: d.date,
            value: d.value
        }));
    },
    saveNAVData: async (data: NAVData[]) => {
        await supabase.from('nav_data').delete().neq('id', '0');
        const rows = data.map(d => ({
            id: d.id,
            date: d.date,
            value: d.value
        }));
        await supabase.from('nav_data').insert(rows);
    },

    getNIFMetrics: async (): Promise<NIFMetrics> => {
        const { data, error } = await supabase.from('nif_metrics').select('*').eq('id', 'metrics').single();
        if (error || !data) return DEFAULT_NIF;
        return {
            annualizedReturn: data.annualized_return,
            totalAUM: data.total_aum,
            ytdReturn: data.ytd_return,
            fundUnits: data.fund_units, // Load from DB
            isAutoReturn: data.is_auto_return, // Load from DB
            assetAllocation: data.asset_allocation
        };
    },
    saveNIFMetrics: async (data: NIFMetrics) => {
        const row = {
            id: 'metrics',
            annualized_return: data.annualizedReturn,
            total_aum: data.totalAUM,
            ytd_return: data.ytdReturn,
            fund_units: data.fundUnits, // Save to DB
            is_auto_return: data.isAutoReturn, // Save to DB
            asset_allocation: data.assetAllocation
        };
        await supabase.from('nif_metrics').upsert(row);
    },

    // --- Site Settings (Socials) ---
    getSiteSettings: async (): Promise<SiteSettings> => {
        const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'settings').single();

        if (error) {
            if (error.code !== 'PGRST116') {
                console.error("Get Settings Error:", error);
            }
            return { socialLinks: [] };
        }

        if (!data) return { socialLinks: [] };

        return {
            socialLinks: data.social_links
        };
    },
    saveSiteSettings: async (settings: SiteSettings) => {
        const row = {
            id: 'settings',
            social_links: settings.socialLinks
        };

        const { error } = await supabase.from('site_settings').upsert(row);

        if (error) {
            console.error("Save Settings Error:", error);
            throw error;
        }
    },

    // --- Notices ---
    getNotices: async (): Promise<Notice[]> => {
        const { data, error } = await supabase.from('notices').select('*').order('date', { ascending: false });
        if (error || !data) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((d: any) => ({
            id: d.id,
            title: d.title,
            category: d.category,
            content: d.content,
            date: d.date,
            time: d.time, // Map time
            expiryDate: d.expiry_date,
            imageUrl: resolveUrl(d.image_url, d.media_key, d.storage_provider),
            link: d.link,
            linkLabel: d.link_label
        }));
    },
    saveNotices: async (notices: Notice[]) => {
        // Full replace strategy for simplicity in Admin UI list management
        // Note: For large datasets, upsert is better. For this scale, delete-insert is fine to keep order/cleanups easy.
        await supabase.from('notices').delete().neq('id', '0');

        const rows = notices.map(n => {
            const isR2 = n.imageUrl && n.imageUrl.startsWith(R2_DOMAIN);
            const mediaKey = isR2 && n.imageUrl ? n.imageUrl.replace(`${R2_DOMAIN}/`, '') : null;
            return {
                id: n.id,
                title: n.title,
                category: n.category,
                content: n.content,
                date: n.date,
                time: n.time,
                expiry_date: n.expiryDate,
                image_url: n.imageUrl,
                link: n.link,
                link_label: n.linkLabel,
                storage_provider: isR2 ? 'r2' : 'legacy',
                media_key: mediaKey
            };
        });

        const { error } = await supabase.from('notices').insert(rows);
        if (error) console.error("Save Notices Error", error);
    },

    // --- Resources ---
    getResources: async (parentId?: string | null): Promise<Resource[]> => {
        let query = supabase.from('resources').select('*').order('type', { ascending: false }).order('date', { ascending: false });

        if (parentId !== undefined) {
            if (parentId === null) {
                query = query.is('parent_id', null);
            } else {
                query = query.eq('parent_id', parentId);
            }
        }

        const { data, error } = await query;
        if (error || !data) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            type: d.type,
            url: d.url, // Resources usually new, use direct url
            coverImage: d.cover_image,
            date: d.date,
            parentId: d.parent_id
        }));
    },

    createResource: async (resource: Omit<Resource, "id">) => {
        const row = {
            title: resource.title,
            description: resource.description,
            type: resource.type,
            url: resource.url,
            cover_image: resource.coverImage,
            date: resource.date,
            parent_id: resource.parentId
        };
        const { error } = await supabase.from('resources').insert(row);
        if (error) {
            console.error("Create Resource Error", error);
            throw error;
        }
    },

    updateResource: async (resource: Resource) => {
        const row = {
            title: resource.title,
            description: resource.description,
            type: resource.type,
            url: resource.url,
            cover_image: resource.coverImage,
            date: resource.date,
            parent_id: resource.parentId
        };
        const { error } = await supabase.from('resources').update(row).eq('id', resource.id);
        if (error) {
            console.error("Update Resource Error", error);
            throw error;
        }
    },

    deleteResource: async (id: string) => {
        const { error } = await supabase.from('resources').delete().eq('id', id);
        if (error) {
            console.error("Delete Resource Error", error);
            throw error;
        }
    },

    saveResources: async (resources: Resource[]) => {
        console.warn("saveResources is deprecated. Use granular operations.");
    }
};
