import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isVideoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    const cleanUrl = url.split(/[?#]/)[0];
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(cleanUrl);
}

