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
            const { data, error } = await supabase.functions.invoke<UploadResponse>('r2-presigned-url', {
                body: {
                    filename: path || `upload-${Date.now()}.jpg`,
                    contentType: file.type,
                },
            });

            if (error || !data) {
                console.error("Presign Error", error);
                throw new Error(`Failed to get upload URL: ${error?.message || JSON.stringify(error) || "Unknown Error"}`);
            }

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
