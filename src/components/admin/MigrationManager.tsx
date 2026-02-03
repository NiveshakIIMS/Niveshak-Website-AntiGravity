"use client";

import { useState } from "react";
import { uploadService } from "@/services/uploadService";
import { dataService } from "@/services/dataService";
import { Loader2, Check, AlertTriangle, Database } from "lucide-react";

export default function MigrationManager() {
    const [status, setStatus] = useState<string>("");
    const [isMigrating, setIsMigrating] = useState(false);
    const [progress, setProgress] = useState(0);

    const migrateSlides = async () => {
        setStatus("Migrating Hero Slides...");
        const slides = await dataService.getHeroSlides();
        let count = 0;

        const updatedSlides = await Promise.all(slides.map(async (slide) => {
            if (slide.imageUrl.startsWith("data:image")) {
                try {
                    const blob = uploadService.base64ToBlob(slide.imageUrl);
                    const publicUrl = await uploadService.uploadFile(blob, `hero-${slide.id}-${Date.now()}.jpg`);
                    count++;
                    return { ...slide, imageUrl: publicUrl };
                } catch (e) {
                    console.error(`Failed to migrate slide ${slide.id}`, e);
                    return slide;
                }
            }
            return slide;
        }));

        if (count > 0) {
            await dataService.saveHeroSlides(updatedSlides);
        }
        return count;
    };

    const migrateTeam = async () => {
        setStatus("Migrating Team Members...");
        const members = await dataService.getTeam();
        let count = 0;

        const updatedMembers = await Promise.all(members.map(async (member) => {
            if (member.imageUrl.startsWith("data:image")) {
                try {
                    const blob = uploadService.base64ToBlob(member.imageUrl);
                    const publicUrl = await uploadService.uploadFile(blob, `team-${member.id}-${Date.now()}.jpg`);
                    count++;
                    return { ...member, imageUrl: publicUrl };
                } catch (e) {
                    console.error(`Failed to migrate member ${member.id}`, e);
                    return member;
                }
            }
            return member;
        }));

        if (count > 0) {
            await dataService.saveTeam(updatedMembers);
        }
        return count;
    };

    const migrateEvents = async () => {
        setStatus("Migrating Events...");
        const events = await dataService.getEvents();
        let count = 0;

        const updatedEvents = await Promise.all(events.map(async (event) => {
            if (event.imageUrl.startsWith("data:image")) {
                try {
                    const blob = uploadService.base64ToBlob(event.imageUrl);
                    const publicUrl = await uploadService.uploadFile(blob, `event-${event.id}-${Date.now()}.jpg`);
                    count++;
                    return { ...event, imageUrl: publicUrl };
                } catch (e) {
                    console.error(`Failed to migrate event ${event.id}`, e);
                    return event;
                }
            }
            return event;
        }));

        if (count > 0) {
            await dataService.saveEvents(updatedEvents);
        }
        return count;
    };

    const migrateNotices = async () => {
        setStatus("Migrating Notices...");
        const notices = await dataService.getNotices();
        let count = 0;

        const updatedNotices = await Promise.all(notices.map(async (notice) => {
            if (notice.imageUrl && notice.imageUrl.startsWith("data:image")) {
                try {
                    const blob = uploadService.base64ToBlob(notice.imageUrl);
                    const publicUrl = await uploadService.uploadFile(blob, `notice-${notice.id}-${Date.now()}.jpg`);
                    count++;
                    return { ...notice, imageUrl: publicUrl };
                } catch (e) {
                    console.error(`Failed to migrate notice ${notice.id}`, e);
                    return notice;
                }
            }
            return notice;
        }));

        if (count > 0) {
            await dataService.saveNotices(updatedNotices);
        }
        return count;
    };

    const handleMigration = async () => {
        if (!confirm("This will scan your database for Base64 images and move them to Cloudflare R2. Continue?")) return;

        setIsMigrating(true);
        setProgress(0);

        try {
            let totalMoved = 0;

            const c1 = await migrateSlides();
            setProgress(25);
            totalMoved += c1;

            const c2 = await migrateTeam();
            setProgress(50);
            totalMoved += c2;

            const c3 = await migrateEvents();
            setProgress(75);
            totalMoved += c3;

            const c4 = await migrateNotices();
            setProgress(100);
            totalMoved += c4;

            setStatus(`Migration Complete! Moved ${totalMoved} files to R2.`);
            alert(`Migration Success! Moved ${totalMoved} files to Cloudflare R2.`);
        } catch (error) {
            console.error(error);
            setStatus("Migration Failed. Check console.");
            alert("Migration Failed. Ensure your Edge Function and Secrets are set up correctly.");
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="p-8 space-y-6 bg-background">
            <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 rounded-lg">
                        <Database className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-foreground">Database Optimization (R2 Migration)</h3>
                        <p className="text-muted-foreground text-sm max-w-2xl">
                            Your database currently stores images directly as text (Base64). This slows down performance.
                            Use this tool to move all existing images to Cloudflare R2 Storage.
                        </p>

                        <div className="pt-4">
                            <button
                                onClick={handleMigration}
                                disabled={isMigrating}
                                className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                {isMigrating ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing... {progress}%</>
                                ) : (
                                    <><AlertTriangle className="w-5 h-5 text-yellow-500" /> Start Migration</>
                                )}
                            </button>
                        </div>

                        {status && (
                            <p className={`text-sm font-semibold mt-2 ${status.includes("Fail") ? "text-red-500" : "text-green-600"}`}>
                                {status}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-card border border-border rounded-xl">
                    <h4 className="font-bold mb-2">Instructions</h4>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        <li>Ensure <code>R2_ACCESS_KEY_ID</code> and other secrets are set in Vercel.</li>
                        <li>This tool only moves images stored as Base64 strings.</li>
                        <li>It will automatically update your site to point to the new URLs.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
