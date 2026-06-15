import { dataService } from "@/services/dataService";
import RedemptionClient from "./RedemptionClient";

export default async function RedemptionPage() {
    const [cards, link] = await Promise.all([
        dataService.getRedemptionCards(),
        dataService.getRedemptionLink()
    ]);

    return <RedemptionClient initialCards={cards || []} initialRedeemLink={link || ""} />;
}
