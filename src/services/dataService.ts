

import { supabase } from "@/lib/supabaseClient";

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
        width?: number;
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

// --- Defaults (Fallbacks) ---

const DEFAULT_HERO: HeroSlide[] = [{ id: "1", imageUrl: "/hero_background.png", title: "Niveshak Supabase", subtitle: "Connecting...", objectFit: "cover", timer: 5 }];
const DEFAULT_ABOUT: AboutContent = { title: "About Niveshak", description: "Loading content...", slides: [], cards: [], richContent: [] };
const DEFAULT_NIF: NIFMetrics = { annualizedReturn: "0", totalAUM: "0", ytdReturn: "0", assetAllocation: [] };

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
            imageUrl: d.image_url,
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

        const rows = slides.map(s => ({
            id: s.id,
            image_url: s.imageUrl,
            title: s.title,
            subtitle: s.subtitle,
            object_fit: s.objectFit,
            timer: s.timer
        }));

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
            imageUrl: d.image_url,
            email: d.email,
            linkedin: d.linkedin,
            details: d.details,
            category: d.category
        }));
    },
    saveTeam: async (members: TeamMember[]) => {
        await supabase.from('team_members').delete().neq('id', '0');
        const rows = members.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role,
            image_url: m.imageUrl,
            email: m.email,
            linkedin: m.linkedin,
            details: m.details,
            category: m.category
        }));
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
            coverUrl: d.cover_url,
            pdfUrl: d.pdf_url,
            flipUrl: d.flip_url
        }));
    },
    saveMagazines: async (mags: Magazine[]) => {
        await supabase.from('magazines').delete().neq('id', '0');
        const rows = mags.map(m => ({
            id: m.id,
            title: m.title,
            issue_date: m.issueDate,
            issue_month: m.issueMonth,
            issue_year: m.issueYear,
            cover_url: m.coverUrl,
            pdf_url: m.pdfUrl,
            flip_url: m.flipUrl
        }));
        const { error } = await supabase.from('magazines').insert(rows);
        if (error) console.error("Save Mags Error", error);
    },

    // --- Events ---
    getEvents: async (): Promise<Event[]> => {
        const { data, error } = await supabase.from('events').select('*');
        if (error || !data) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((d: any) => ({
            id: d.id,
            title: d.title,
            date: d.date,
            time: d.time,
            location: d.location,
            type: d.type,
            imageUrl: d.image_url,
            orientation: d.orientation,
            meetingLink: d.meeting_link,
            isOnline: d.is_online
        }));
    },
    saveEvents: async (events: Event[]) => {
        await supabase.from('events').delete().neq('id', '0');
        const rows = events.map(e => ({
            id: e.id,
            title: e.title,
            date: e.date,
            time: e.time,
            location: e.location,
            type: e.type,
            image_url: e.imageUrl,
            orientation: e.orientation,
            meeting_link: e.meetingLink,
            is_online: e.isOnline
        }));
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
            assetAllocation: data.asset_allocation
        };
    },
    saveNIFMetrics: async (data: NIFMetrics) => {
        const row = {
            id: 'metrics',
            annualized_return: data.annualizedReturn,
            total_aum: data.totalAUM,
            ytd_return: data.ytdReturn,
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
            imageUrl: d.image_url,
            link: d.link,
            linkLabel: d.link_label
        }));
    },
    saveNotices: async (notices: Notice[]) => {
        // Full replace strategy for simplicity in Admin UI list management
        // Note: For large datasets, upsert is better. For this scale, delete-insert is fine to keep order/cleanups easy.
        await supabase.from('notices').delete().neq('id', '0');

        const rows = notices.map(n => ({
            id: n.id,
            title: n.title,
            category: n.category,
            content: n.content,
            date: n.date,
            time: n.time, // Save time
            expiry_date: n.expiryDate,
            image_url: n.imageUrl,
            link: n.link,
            link_label: n.linkLabel
        }));

        const { error } = await supabase.from('notices').insert(rows);
        if (error) console.error("Save Notices Error", error);
    }
};
