"use client";

import { useEffect, useState } from "react";
import { dataService, HallOfFameMember } from "@/services/dataService";
import HallOfFameClient from "./HallOfFameClient";
import { Loader2 } from "lucide-react";

export default function HallOfFamePage() {
    const [members, setMembers] = useState<HallOfFameMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getHallOfFame().then(setMembers).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </main>
        );
    }

    return <HallOfFameClient initialMembers={members} />;
}
