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

    // Test 1: Direct fetch to Supabase downstream
    let directFetchStatus = "not_attempted";
    let directFetchError = null;
    let directFetchSnippet = "";

    if (url && anonKey) {
        try {
            const res = await fetch(`${url}/rest/v1/hero_slides?select=*`, {
                headers: {
                    "apikey": anonKey,
                    "Authorization": `Bearer ${anonKey}`
                }
            });
            directFetchStatus = `status_${res.status}`;
            const text = await res.text();
            directFetchSnippet = text.substring(0, 200);
        } catch (err: any) {
            directFetchStatus = "failed";
            directFetchError = err.message || String(err);
        }
    }

    // Test 2: Fetch through the Proxy endpoint on the same host
    let proxyFetchStatus = "not_attempted";
    let proxyFetchError = null;
    let proxyFetchSnippet = "";
    let proxyHeaders: Record<string, string> = {};

    try {
        const origin = new URL(request.url).origin;
        // Simulating browser client fetch
        const res = await fetch(`${origin}/api/supabase/rest/v1/hero_slides?select=*`, {
            headers: {
                "apikey": "proxy-dummy-key",
                "Authorization": "Bearer proxy-dummy-key"
            }
        });
        proxyFetchStatus = `status_${res.status}`;
        
        // Read response headers to check if anything is weird
        res.headers.forEach((val, key) => {
            proxyHeaders[key] = val;
        });

        const text = await res.text();
        proxyFetchSnippet = text.substring(0, 200);
    } catch (err: any) {
        proxyFetchStatus = "failed";
        proxyFetchError = err.message || String(err);
    }

    return NextResponse.json({
        diagnostics,
        directFetch: {
            status: directFetchStatus,
            error: directFetchError,
            bodySnippet: directFetchSnippet
        },
        proxyFetch: {
            status: proxyFetchStatus,
            error: proxyFetchError,
            bodySnippet: proxyFetchSnippet,
            headers: proxyHeaders
        }
    });
}
