
export const formatDateIndian = (isoDate: string) => {
    if (!isoDate) return "";
    // Handle yyyy-mm-dd
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate; // Fallback
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
};

export interface UTCDateInfo {
    day: number;
    monthShort: string;
    monthLong: string;
    year: number;
    weekdayShort: string;
    weekdayLong: string;
    ordinal: string;
}

export const getUTCDateInfo = (isoDate: string): UTCDateInfo => {
    if (!isoDate) {
        return { day: 1, monthShort: "", monthLong: "", year: 2000, weekdayShort: "", weekdayLong: "", ordinal: "" };
    }
    const parts = isoDate.split("-");
    if (parts.length !== 3) {
        return { day: 1, monthShort: "", monthLong: "", year: 2000, weekdayShort: "", weekdayLong: "", ordinal: "" };
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    const date = new Date(Date.UTC(year, month - 1, day));
    
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekdaysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekdaysLong = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    const d = date.getUTCDate();
    const mShort = monthsShort[date.getUTCMonth()] || "";
    const mLong = monthsLong[date.getUTCMonth()] || "";
    const y = date.getUTCFullYear();
    const wShort = weekdaysShort[date.getUTCDay()] || "";
    const wLong = weekdaysLong[date.getUTCDay()] || "";
    
    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };
    
    return {
        day: d,
        monthShort: mShort,
        monthLong: mLong,
        year: y,
        weekdayShort: wShort,
        weekdayLong: wLong,
        ordinal: getOrdinal(d)
    };
};

export const formatTimeUTC = (timeStr: string): string => {
    if (!timeStr) return "";
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${hours}:${minutes} ${ampm}`;
};
