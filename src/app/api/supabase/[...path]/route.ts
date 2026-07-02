/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return handleProxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return handleProxy(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return handleProxy(request, context);
}

async function handleProxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    const pathStr = path.join("/");
    
    // Resolve downstream Supabase URL
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
        console.error("Configuration Error: Downstream Supabase URL is not defined.");
        return NextResponse.json({ error: "Configuration Error: Supabase URL is missing." }, { status: 500 });
    }

    // Build the target url, stripping Next.js internal route params from the query string
    const requestUrl = new URL(request.url);
    const searchParams = new URLSearchParams(requestUrl.search);
    searchParams.delete("path");
    const queryString = searchParams.toString();
    const targetUrl = `${supabaseUrl}/${pathStr}${queryString ? `?${queryString}` : ""}`;

    const headers = new Headers(request.headers);

    // 1. Content-Length / Size Constraint Verification (DDoS / Resource Exhaustion)
    const contentLength = headers.get("content-length");
    if (contentLength) {
        const sizeInBytes = parseInt(contentLength, 10);
        if (sizeInBytes > 1024 * 1024) { // 1MB Limit
            return NextResponse.json({ error: "Payload too large. Maximum allowed size is 1MB." }, { status: 413 });
        }
    }

    // 2. Real Client IP Forwarding using sb-forwarded-for
    // CF-Connecting-IP is populated by Cloudflare. Fallback to X-Forwarded-For client.
    const clientIp = headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    headers.set("sb-forwarded-for", clientIp);

    // 3. Prevent Host and connection header issues downstream
    headers.delete("host");
    headers.delete("connection");

    // 4. Inject Server-side Anon Key if not present (helps hide key from front-end bundle)
    const serverAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (serverAnonKey) {
        const apiKeyHeader = headers.get("apikey");
        const authHeader = headers.get("authorization");

        // If client uses a placeholder/dummy key, or lacks the headers, replace them with the server-side anon key
        if (!apiKeyHeader || apiKeyHeader === "proxy-dummy-key" || apiKeyHeader === "placeholder-key") {
            headers.set("apikey", serverAnonKey);
        }
        if (!authHeader || authHeader === "Bearer proxy-dummy-key" || authHeader === "Bearer placeholder-key") {
            headers.set("authorization", `Bearer ${serverAnonKey}`);
        }
    }

    // 5. Long Password DoS Mitigation (Edge Validation)
    // Intercept auth sign-in / signup / reset-password calls and limit password field lengths
    let body: ReadableStream | null = null;
    const isAuthPath = pathStr.includes("auth/v1/token") || pathStr.includes("auth/v1/signup") || pathStr.includes("auth/v1/user");
    const isWriteMethod = ["POST", "PUT", "PATCH"].includes(request.method);

    if (isWriteMethod && isAuthPath && contentLength && parseInt(contentLength, 10) > 0) {
        try {
            // Clone to avoid draining the stream before downstream forwarding
            const clonedRequest = request.clone();
            const jsonBody = await clonedRequest.json() as Record<string, any>;
            
            const password = jsonBody.password || jsonBody.new_password;
            if (password && typeof password === "string" && password.length > 72) {
                return NextResponse.json({
                    error: "Password length exceeds security constraint (maximum 72 characters)."
                }, { status: 400 });
            }
            body = request.body;
        } catch {
            // Non-JSON or malformed payloads fallback
            body = request.body;
        }
    } else {
        body = request.body;
    }

    // 6. Support WebSocket upgrade for Supabase Realtime (Cloudflare Worker native tunnel)
    if (request.headers.get("Upgrade") === "websocket") {
        try {
            const wsResponse = await fetch(targetUrl, {
                headers,
                // Cloudflare handles websocket upgrades natively via fetch
            });
            return wsResponse;
        } catch (err) {
            console.error("WebSocket proxy error:", err);
            return NextResponse.json({ error: "WebSocket upgrade connection failed." }, { status: 502 });
        }
    }

    // 7. Forward standard HTTP Requests
    try {
        const fetchOptions: RequestInit = {
            method: request.method,
            headers,
            redirect: "manual"
        };

        // GET and HEAD requests must not have a body property in fetch, otherwise it throws a TypeError.
        if (!["GET", "HEAD"].includes(request.method)) {
            fetchOptions.body = body;
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Filter out downstream transfer-encoding / content-encoding so Cloudflare can compress properly
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete("content-encoding");

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
    } catch (error) {
        console.error("Downstream Supabase gateway error:", error);
        return NextResponse.json({ error: "Failed to communicate with database gateway." }, { status: 502 });
    }
}
