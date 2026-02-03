import { supabase } from "@/lib/supabaseClient";

interface UploadResponse {
    uploadUrl: string;
    publicUrl: string;
    key: string;
}

export const uploadService = {
    /**
     * Uploads a file to Cloudflare R2 via Supabase Edge Function
     */
    uploadFile: async (file: File | Blob, path?: string): Promise<string> => {
        try {
            // 1. Get Presigned URL
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("User not authenticated");

            const response = await fetch('https://rnoucamaqlptwtsjxuge.supabase.co/functions/v1/r2-presigned-url', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: path || `upload-${Date.now()}.jpg`,
                    contentType: file.type,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Edge Function Failed (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const { uploadUrl, publicUrl } = data;

            // 2. Upload to R2 (Direct PUT)
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadRes.ok) {
                console.error("R2 Upload Error", uploadRes.statusText);
                throw new Error("Failed to upload to storage");
            }

            return publicUrl;
        } catch (err) {
            console.error("Upload Service Error:", err);
            throw err;
        }
    },

    /**
     * Convert Base64 Data URL to Blob
     */
    base64ToBlob: (dataUrl: string): Blob => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
};
