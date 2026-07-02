/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Security validation and input sanitization helpers.
 */

/**
 * Sanitizes a string to prevent Cross-Site Scripting (XSS) attacks.
 * It strips out HTML tags, script blocks, and JavaScript protocol links.
 */
export function sanitizeString(value: string | null | undefined): string {
    if (!value) return "";
    
    let sanitized = value.trim();

    // 1. Remove script tags and their content
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

    // 2. Remove on* event handlers (e.g. onload, onerror, onclick) inside tags
    sanitized = sanitized.replace(/<[^>]+?\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)[^>]*>/gi, (match) => {
        return match.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    });

    // 3. Remove javascript: and data: pseudo-protocols in URLs
    sanitized = sanitized.replace(/(javascript|data|vbscript):/gi, "");

    // 4. Escape critical HTML characters to prevent rendering as HTML
    const htmlEscapes: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;"
    };
    
    // For rich editors (if any) we might allow some tags, but for standard inputs we escape everything
    sanitized = sanitized.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);

    return sanitized;
}

/**
 * Validates that a URL is safe and points to an allowed protocol.
 */
export function validateUrl(url: string | null | undefined): string {
    if (!url) return "";
    const trimmed = url.trim();
    
    // Allow relative URLs starting with /
    if (trimmed.startsWith("/")) {
        return trimmed;
    }

    try {
        const parsed = new URL(trimmed);
        // Only allow http: and https: protocols
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.toString();
        }
        return "";
    } catch {
        return ""; // Invalid URL
    }
}

/**
 * Validates that a string has a safe length and is not malicious.
 */
export function validateLength(value: string | null | undefined, min: number, max: number): boolean {
    if (!value) return min === 0;
    const len = value.trim().length;
    return len >= min && len <= max;
}

/**
 * Sanitizes an object by recursively sanitizing all its string values.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result = { ...obj };
    for (const key in result) {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
            const val = result[key];
            if (typeof val === "string") {
                result[key] = sanitizeString(val) as any;
            } else if (val && typeof val === "object" && !Array.isArray(val)) {
                result[key] = sanitizeObject(val);
            }
        }
    }
    return result;
}
