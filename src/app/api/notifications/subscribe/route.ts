import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { subscription } = body;
        
        if (!subscription) {
            return NextResponse.json({ error: "Missing subscription data" }, { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Database configuration missing" }, { status: 500 });
        }

        // Initialize Supabase Client. We prioritize the service role key on the server
        // to securely bypass client-side RLS insert constraints.
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { error } = await supabase
            .from("push_subscriptions")
            .insert({ subscription });

        if (error) {
            // Postgres unique constraint violation is '23505'
            if (error.code === "23505") {
                return NextResponse.json({ success: true, message: "Subscription already registered" });
            }
            console.error("Failed to save push subscription:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Subscribe route error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
