import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.370.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.370.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");

        // 1. Setup Supabase Client
        // We explicitly turn OFF persistSession for Edge Functions
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: { headers: { Authorization: authHeader! } },
                auth: {
                    persistSession: false
                }
            }
        );

        // 2. Explicitly verify the token
        // Extract "Bearer <token>" -> "<token>"
        const token = authHeader?.replace("Bearer ", "");

        // pass token directly to getUser to avoid session confusion
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth Error:", authError);
            return new Response(JSON.stringify({
                error: "Unauthorized",
                details: authError?.message || "User is null/missing",
                debug: {
                    tokenReceived: !!token,
                    tokenLen: token?.length,
                    sbUrl: Deno.env.get("SUPABASE_URL")?.substring(0, 15) + "...",
                }
            }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Parse Body
        const { filename, contentType } = await req.json();
        if (!filename || !contentType) {
            throw new Error("Missing filename or contentType");
        }

        // 4. Configure R2
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

        // 5. Generate Key & Signed URL
        const fileExt = filename.split(".").pop();
        const key = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 900 });

        return new Response(
            JSON.stringify({
                uploadUrl,
                publicUrl: `${R2_PUBLIC_DOMAIN}/${key}`,
                key,
                user: user.id // Return user ID to confirm auth worked
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
