import { dataService } from "@/services/dataService";
import CalculatorClient from "@/components/dashboard/CalculatorClient";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function CalculatorPage() {
    const navData = await dataService.getNAVData();
    const investments = await dataService.getNIFInvestments();

    return <CalculatorClient initialNAVData={navData} initialInvestments={investments} />;
}
