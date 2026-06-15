import { dataService } from "@/services/dataService";
import HallOfFameClient from "./HallOfFameClient";

export default async function HallOfFamePage() {
    const members = await dataService.getHallOfFame();

    return <HallOfFameClient initialMembers={members || []} />;
}
