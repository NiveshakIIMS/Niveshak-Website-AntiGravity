import { dataService } from "@/services/dataService";
import CalculatorClient from "@/components/dashboard/CalculatorClient";

export default async function CalculatorPage() {
    const [navData, investments] = await Promise.all([
        dataService.getNAVData(),
        dataService.getNIFInvestments()
    ]);

    return <CalculatorClient initialNAVData={navData || []} initialInvestments={investments || []} />;
}
