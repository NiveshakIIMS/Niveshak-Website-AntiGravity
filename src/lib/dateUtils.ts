/**
 * Helper to get the ordinal suffix for a number (e.g. 1st, 2nd, 3rd, 4th)
 */
export const getOrdinal = (n: number): string => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

/**
 * Formats a Date object or string (YYYY-MM-DD) deterministically in Indian style (e.g. "24 Apr 2026").
 * Timezone-agnostic: if a string is provided, it extracts the components directly to prevent shifting.
 */
export const formatDateSafe = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return "";

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (typeof dateInput === 'string') {
        const parts = dateInput.split('T')[0].split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const monthIdx = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
                return `${day} ${months[monthIdx]} ${year}`;
            }
        }
        // Fallback to normal parsing if string format is different
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return dateInput;
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    const d = dateInput;
    if (isNaN(d.getTime())) return "";
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatDateIndian = formatDateSafe;

/**
 * Formats a Date object or string (YYYY-MM-DD) deterministically with full month and weekday (e.g. "Friday, April 24, 2026").
 */
export const formatDateFullSafe = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return "";

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : "";

    const weekday = weekdays[d.getDay()];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();

    return `${weekday}, ${month} ${day}, ${year}`;
};

/**
 * Formats a 24-hour time string (e.g., "14:30") or any time string deterministically to 12-hour AM/PM format (e.g. "2:30 pm").
 */
export const formatTimeSafe = (timeStr: string | undefined | null): string => {
    if (!timeStr) return "";
    
    // Check if it matches HH:MM format
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return timeStr;

    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${ampm}`;
};

/**
 * Formats a month number or index (0-11) to its full English month name (e.g., "January").
 */
export const getFullMonthName = (monthIdx: number): string => {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return months[monthIdx] || "";
};

/**
 * Formats a month number or index (0-11) to its short English month name (e.g., "Jan").
 */
export const getShortMonthName = (monthIdx: number): string => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[monthIdx] || "";
};

/**
 * Formats a day index (0-6) to its short weekday name (e.g., "Fri").
 */
export const getShortWeekdayName = (dayIdx: number): string => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return weekdays[dayIdx] || "";
};
