"use client";

import { useEffect, useState } from "react";
import { dataService, Notice } from "@/services/dataService";
import NoticesClient from "./NoticesClient";
import { Loader2 } from "lucide-react";

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getNotices().then(setNotices).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </main>
        );
    }

    return <NoticesClient initialNotices={notices} />;
}
