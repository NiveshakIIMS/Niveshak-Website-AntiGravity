import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.370.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.370.0";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Verify User
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Parse Body
        const { filename, contentType } = await req.json();
        if (!filename || !contentType) {
            throw new Error("Missing filename or contentType");
        }

        // 3. Configure R2 (S3 Compatible)
        const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID");
        const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
        const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
        const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME");
        const R2_PUBLIC_DOMAIN = Deno.env.get("R2_PUBLIC_DOMAIN");

        const S3 = new S3Client({
            region: "auto",
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID!,
                secretAccessKey: R2_SECRET_ACCESS_KEY!,
            },
        });

        // 4. Generate Key & Signed URL
        const fileExt = filename.split(".").pop();
        const key = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        // Generate Pre-signed URL (Valid for 15 mins)
        const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 900 });

        // 5. Return Details
        return new Response(
            JSON.stringify({
                uploadUrl, // Frontend PUTs to this
                publicUrl: `${R2_PUBLIC_DOMAIN}/${key}`,
                key,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
