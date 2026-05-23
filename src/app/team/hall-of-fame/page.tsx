import { dataService } from "@/services/dataService";
import HallOfFameClient from "./HallOfFameClient";

export const dynamic = 'force-dynamic';

export default async function HallOfFamePage() {
    const members = await dataService.getHallOfFame();

    return <HallOfFameClient initialMembers={members} />;
}
