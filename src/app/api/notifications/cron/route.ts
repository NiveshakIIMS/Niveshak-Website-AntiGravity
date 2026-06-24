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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get("secret");
        const expectedSecret = process.env.CRON_SECRET || "niveshak_cron_secret";

        if (secret !== expectedSecret) {
            return NextResponse.json({ error: "Unauthorized: Invalid secret" }, { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        // Use service role key to bypass RLS for write operations if available, fallback to anon
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Database configuration missing" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false }
        });

        // 1. Fetch Notification Configuration
        const { data: configRow, error: configError } = await supabase
            .from("site_settings")
            .select("value")
            .eq("id", "notification_config")
            .single();

        if (configError || !configRow || !configRow.value) {
            return NextResponse.json({ message: "Auto timer configurations not found, skipping." });
        }

        const config = JSON.parse(configRow.value);
        if (!config.autoTimerEnabled || !config.autoTimerTime) {
            return NextResponse.json({ message: "Auto timer not enabled, skipping." });
        }

        // 2. Determine IST Time and Date (Indian Standard Time: UTC + 5:30)
        const nowUtc = new Date();
        const nowIst = new Date(nowUtc.getTime() + (5.5 * 60 * 60 * 1000));
        const currentHr = nowIst.getUTCHours();
        const currentMin = nowIst.getUTCMinutes();
        
        // Format as YYYY-MM-DD
        const todayStr = `${nowIst.getUTCFullYear()}-${String(nowIst.getUTCMonth() + 1).padStart(2, "0")}-${String(nowIst.getUTCDate()).padStart(2, "0")}`;

        // 3. Verify Scheduled Time is Reached
        const [targetHr, targetMin] = config.autoTimerTime.split(":").map(Number);
        const isPastTime = currentHr > targetHr || (currentHr === targetHr && currentMin >= targetMin);

        if (!isPastTime) {
            return NextResponse.json({ message: `Scheduled time (${config.autoTimerTime}) not reached yet. Current IST time: ${String(currentHr).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}.` });
        }

        // 4. Verify if Already Sent Today
        const { data: sentRow } = await supabase
            .from("site_settings")
            .select("value")
            .eq("id", "last_daily_timer_sent_date")
            .maybeSingle();

        if (sentRow && sentRow.value === todayStr) {
            return NextResponse.json({ message: `Notification already sent today (${todayStr}), skipping.` });
        }

        // 5. Fetch Latest NIF NAV entry
        const { data: navData, error: navError } = await supabase
            .from("nav_data")
            .select("*")
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (navError || !navData) {
            return NextResponse.json({ error: "Latest NAV entry not found." }, { status: 404 });
        }

        // Format date as DD-MM-YYYY
        const parts = navData.date.split("T")[0].split("-");
        const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : navData.date;
        const formattedValue = Number(navData.value).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const title = "Daily NIF NAV Update 📊";
        const body = `NIF NAV as of ${formattedDate} is ₹ ${formattedValue}`;

        // 6. Fetch Active Subscriptions
        const { data: subscriptions, error: fetchSubsError } = await supabase
            .from("push_subscriptions")
            .select("id, subscription");

        if (fetchSubsError) {
            console.error("Failed to fetch subscriptions:", fetchSubsError);
            return NextResponse.json({ error: fetchSubsError.message }, { status: 500 });
        }

        // 7. Dispatch Web Push notifications
        let successCount = 0;
        let failureCount = 0;
        const toDeleteIds: string[] = [];

        if (subscriptions && subscriptions.length > 0) {
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
                                url: "/"
                            },
                            adminContact: "mailto:financeclub@iimshillong.ac.in"
                        }
                    });

                    const pushResponse = await fetch(endpoint, {
                        method: "POST",
                        headers,
                        body: pushBody
                    });

                    if (pushResponse.ok) {
                        successCount++;
                    } else {
                        failureCount++;
                        if (pushResponse.status === 404 || pushResponse.status === 410) {
                            toDeleteIds.push(row.id);
                        }
                    }
                } catch (err) {
                    console.error(`Error sending push notification to row ${row.id}:`, err);
                    failureCount++;
                }
            });

            await Promise.all(pushPromises);
        }

        // 8. Update in-app trigger so active users get it
        const payload = {
            type: "auto_nav",
            title,
            body,
            timestamp: Date.now()
        };

        const updateTriggerPromise = supabase.from("site_settings").upsert(
            { id: "notification_trigger", value: JSON.stringify(payload), updated_at: new Date().toISOString() },
            { onConflict: "id" }
        );

        // 9. Mark as sent today
        const markSentPromise = supabase.from("site_settings").upsert(
            { id: "last_daily_timer_sent_date", value: todayStr, updated_at: new Date().toISOString() },
            { onConflict: "id" }
        );

        // 10. Clean up dead subscriptions
        if (toDeleteIds.length > 0) {
            const { error: deleteError } = await supabase
                .from("push_subscriptions")
                .delete()
                .in("id", toDeleteIds);
            if (deleteError) {
                console.error("Cron failed to clean up expired subscriptions:", deleteError);
            }
        }

        await Promise.all([updateTriggerPromise, markSentPromise]);

        return NextResponse.json({
            success: true,
            message: "Cron dispatched successfully",
            dispatched: successCount,
            failed: failureCount,
            cleanedUp: toDeleteIds.length,
            dateSent: todayStr
        });
    } catch (err: any) {
        console.error("Cron route error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
