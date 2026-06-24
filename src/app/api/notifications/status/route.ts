import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function GET(request: NextRequest) {
    try {
        // 1. Authorize Admin
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized: Missing authentication header" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];

        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Database configuration missing" }, { status: 500 });
        }

        // Initialize Supabase Client with the token so the select runs on behalf of the admin
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        // Verify token with Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
        }

        // 2. Fetch all subscriptions (including creation time and endpoint for debugging)
        const { data: subscriptions, error: fetchError } = await supabase
            .from("push_subscriptions")
            .select("id, subscription, created_at");

        if (fetchError) {
            console.error("Failed to fetch subscriptions status:", fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            count: subscriptions ? subscriptions.length : 0,
            subscriptions: subscriptions ? subscriptions.map((row) => ({
                id: row.id,
                endpoint: row.subscription?.endpoint || "unknown",
                createdAt: row.created_at
            })) : []
        });
    } catch (err: any) {
        console.error("Status route error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
