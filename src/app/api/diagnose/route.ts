import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const diagnostics = {
        hasUrl: !!url,
        urlValue: url || "missing",
        hasKey: !!anonKey,
        keyLength: anonKey ? anonKey.length : 0,
        envKeys: Object.keys(process.env).filter(k => k.includes("SUPABASE")),
        timestamp: new Date().toISOString(),
        requestUrl: request.url,
    };

    // Try a direct fetch to check connectivity
    let fetchStatus = "not_attempted";
    let fetchError = null;
    let fetchBodySnippet = "";

    if (url && anonKey) {
        try {
            const res = await fetch(`${url}/rest/v1/hero_slides?select=*`, {
                headers: {
                    "apikey": anonKey,
                    "Authorization": `Bearer ${anonKey}`
                }
            });
            fetchStatus = `response_status_${res.status}`;
            const text = await res.text();
            fetchBodySnippet = text.substring(0, 200);
        } catch (err: any) {
            fetchStatus = "failed";
            fetchError = err.message || String(err);
        }
    }

    return NextResponse.json({
        diagnostics,
        connectivity: {
            status: fetchStatus,
            error: fetchError,
            bodySnippet: fetchBodySnippet
        }
    });
}
