import { dataService } from "@/services/dataService";
import HallOfFameClient from "./HallOfFameClient";

export const revalidate = 60; // Revalidate every 60s

export default async function HallOfFamePage() {
    const members = await dataService.getHallOfFame();

    return <HallOfFameClient initialMembers={members} />;
}
