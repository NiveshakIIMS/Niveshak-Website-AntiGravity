
export const formatDateIndian = (isoDate: string) => {
    if (!isoDate) return "";
    // Handle yyyy-mm-dd
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate; // Fallback
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
};
