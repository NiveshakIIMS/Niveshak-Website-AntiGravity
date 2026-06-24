import "@/lib/bindCrypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPushHTTPRequest } from "@pushforge/builder";

export const runtime = "edge";

const VAPID_PRIVATE_JWK = {
    alg: "ES256",
    key_ops: ["sign"],
    ext: true,
    kty: "EC",
    x: "pXca9fapcMVai8QnHOYlNrO9Q96zIR1SXXzeo-nuedU",
    y: "ViZOdy8kXTlWVnE-2Dr9mb0xCjJ9IBZtO338dXfBAdI",
    crv: "P-256",
    d: "-gnPL4dV3Ycg8c9PjTlxHY0_tbsMAmABNtyofNM9qus"
};

export async function POST(request: NextRequest) {
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

        // Initialize Supabase Client with the admin's token so queries run on behalf of the admin.
        // This allows RLS select and delete checks on tables (like push_subscriptions) to succeed
        // even when SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.
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

        // 2. Parse request payload
        const { title, body, url } = await request.json();
        if (!title || !body) {
            return NextResponse.json({ error: "Missing required fields: title and body" }, { status: 400 });
        }

        // 3. Fetch all subscriptions
        const { data: subscriptions, error: fetchError } = await supabase
            .from("push_subscriptions")
            .select("id, subscription");

        if (fetchError) {
            console.error("Failed to fetch subscriptions:", fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: "No active subscriptions found" });
        }

        let successCount = 0;
        let failureCount = 0;
        const toDeleteIds: string[] = [];
        const debugLogs: any[] = [];

        // 4. Send dispatches concurrently
        const pushPromises = subscriptions.map(async (row) => {
            const sub = row.subscription;
            try {
                const { endpoint, headers, body: pushBody } = await buildPushHTTPRequest({
                    privateJWK: VAPID_PRIVATE_JWK,
                    subscription: sub,
                    message: {
                        payload: {
                            title,
                            body,
                            url: url || "/"
                        },
                        adminContact: "mailto:financeclub@iimshillong.ac.in"
                    }
                });

                const pushResponse = await fetch(endpoint, {
                    method: "POST",
                    headers,
                    body: pushBody
                });

                const status = pushResponse.status;
                const responseText = await pushResponse.text();
                debugLogs.push({
                    id: row.id,
                    endpoint: endpoint.substring(0, 45) + "...",
                    status,
                    response: responseText
                });

                if (pushResponse.ok) {
                    successCount++;
                } else {
                    failureCount++;
                    // Cleanup expired subscriptions (404 Not Found, 410 Gone)
                    if (pushResponse.status === 404 || pushResponse.status === 410) {
                        toDeleteIds.push(row.id);
                    }
                }
            } catch (err: any) {
                console.error(`Error sending push notification to row ${row.id}:`, err);
                failureCount++;
                debugLogs.push({
                    id: row.id,
                    error: err.message || String(err)
                });
            }
        });

        await Promise.all(pushPromises);

        // 5. Cleanup dead subscriptions
        if (toDeleteIds.length > 0) {
            const { error: deleteError } = await supabase
                .from("push_subscriptions")
                .delete()
                .in("id", toDeleteIds);

            if (deleteError) {
                console.error("Failed to clean up expired subscriptions:", deleteError);
            }
        }

        return NextResponse.json({
            success: true,
            dispatched: successCount,
            failed: failureCount,
            cleanedUp: toDeleteIds.length,
            debugLogs
        });
    } catch (err: any) {
        console.error("Dispatch route error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
