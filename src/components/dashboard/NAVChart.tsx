"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Maximize2, X } from "lucide-react";
import { NAVData } from "@/services/dataService";
import { useTheme } from "@/components/ThemeProvider";

// --- Types ---
interface NAVChartProps {
    data: NAVData[];
}

type FilterMode = "DAYS" | "MONTHS" | "YEARS" | "OVERALL";

interface ChartData {
    label: string | number; // String for category views, Number (timestamp) for OVERALL
    value: number;
    fullDate: Date;
    sortKey?: number;
}

// --- Helper Functions (Pure) ---
const processChartData = (
    data: NAVData[],
    filterMode: FilterMode,
    selectedYear: string,
    selectedMonth: string,
    availableMonths: string[]
): ChartData[] => {
    if (!data || data.length === 0) return [];

    let filtered = [...data];

    // 1. DAYS: Show daily data for a specific Month of a specific Year
    if (filterMode === "DAYS") {
        const monthIndex = availableMonths.indexOf(selectedMonth);
        if (monthIndex === -1) return [];

        filtered = filtered.filter(d => {
            const date = new Date(d.date);
            return date.getFullYear().toString() === selectedYear &&
                date.getMonth() === monthIndex;
        });

        return filtered
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(d => ({
                label: new Date(d.date).getDate().toString(), // "1", "2", "31"
                value: d.value,
                fullDate: new Date(d.date)
            }));
    }

    // 2. MONTHS: Show monthly averages for a specific Year
    if (filterMode === "MONTHS") {
        filtered = filtered.filter(d => new Date(d.date).getFullYear().toString() === selectedYear);
        const groups: { [key: number]: { sum: number, count: number } } = {};

        for (const d of filtered) {
            const month = new Date(d.date).getMonth();
            if (!groups[month]) groups[month] = { sum: 0, count: 0 };
            groups[month].sum += d.value;
            groups[month].count += 1;
        }

        return Object.entries(groups)
            .map(([monthIdx, g]) => {
                const date = new Date();
                date.setMonth(parseInt(monthIdx));
                return {
                    label: date.toLocaleString('default', { month: 'short' }), // "Jan", "Feb"
                    value: parseFloat((g.sum / g.count).toFixed(2)),
                    fullDate: date,
                    sortKey: parseInt(monthIdx)
                };
            })
            .sort((a, b) => (a.sortKey ?? 0) - (b.sortKey ?? 0));
    }

    // 3. YEARS: Show yearly averages for all time
    if (filterMode === "YEARS") {
        const groups: { [key: string]: { sum: number, count: number } } = {};

        for (const d of filtered) {
            const year = new Date(d.date).getFullYear().toString();
            if (!groups[year]) groups[year] = { sum: 0, count: 0 };
            groups[year].sum += d.value;
            groups[year].count += 1;
        }

        return Object.entries(groups)
            .map(([year, g]) => ({
                label: year, // "2025", "2026"
                value: parseFloat((g.sum / g.count).toFixed(2)),
                fullDate: new Date(parseInt(year), 0, 1),
                sortKey: parseInt(year)
            }))
            .sort((a, b) => (a.sortKey ?? 0) - (b.sortKey ?? 0));
    }

    // 4. OVERALL: Show all data points with continuous time axis
    if (filterMode === "OVERALL") {
        return filtered
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(d => ({
                label: new Date(d.date).getTime(), // Timestamp for continuous X-axis
                value: d.value,
                fullDate: new Date(d.date)
            }));
    }

    return [];
};


// --- Main Component ---
export default function NAVChart({ data }: NAVChartProps) {
    const { theme } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);

    // Default to OVERALL
    const [filterMode, setFilterMode] = useState<FilterMode>("OVERALL");

    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));

    const availableYears = useMemo(() => {
        const years = new Set(data.map(d => new Date(d.date).getFullYear().toString()));
        if (years.size === 0) years.add(new Date().getFullYear().toString());
        return Array.from(years).sort().reverse();
    }, [data]);

    const availableMonths = useMemo(() => [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ], []);

    // Memoize the data processing to prevent recalc on every render unless deps change
    const processedData = useMemo(() =>
        processChartData(data, filterMode, selectedYear, selectedMonth, availableMonths),
        [data, filterMode, selectedYear, selectedMonth, availableMonths]
    );

    // Client-side mounted check for Portal
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Lock body scroll when expanded
    useEffect(() => {
        if (isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isExpanded]);

    return (
        <>
            {/* Inline Chart */}
            <div className="relative">
                {/* Controls and Maximize Button */}
                <div className="flex flex-col items-center gap-2 mb-5">
                    <div className="flex items-center justify-between w-full">
                        <Controls
                            filterMode={filterMode}
                            setFilterMode={setFilterMode}
                            theme={theme}
                            availableYears={availableYears}
                            availableMonths={availableMonths}
                            selectedYear={selectedYear}
                            setSelectedYear={setSelectedYear}
                            selectedMonth={selectedMonth}
                            setSelectedMonth={setSelectedMonth}
                        />
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="p-2 bg-accent text-white hover:bg-blue-600 rounded-md transition-all shadow-sm flex-shrink-0"
                            title="Maximize Chart"
                            aria-label="Maximize Chart"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Chart Container - Tighter height for minimal X-axis spacing */}
                <div className="h-[320px] md:h-[350px] w-full">
                    {mounted ? (
                        <ChartView processedData={processedData} filterMode={filterMode} />
                    ) : (
                        <div className="h-full w-full rounded-xl bg-gray-100 dark:bg-navy-800 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
                            Loading Chart...
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Modal (Portal) */}
            {mounted && isExpanded && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
                    {/* Modal Content */}
                    <div
                        className={`w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-200 ${theme === 'dark' ? 'dark' : ''}`}
                        style={{ backgroundColor: theme === 'dark' ? '#1B263B' : '#ffffff' }}
                    >
                        {/* Header */}
                        <div
                            className="p-6 border-b flex justify-between items-center"
                            style={{ borderColor: theme === 'dark' ? '#415A77' : '#e5e7eb' }}
                        >
                            <div>
                                <h2 className="text-2xl font-bold text-navy-900 dark:text-white">NAV Performance Analytics</h2>
                                <p className="text-gray-500">Detailed historical performance analysis</p>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-2 bg-gray-100 dark:bg-navy-700 text-gray-500 hover:text-red-500 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div
                            className="p-6 flex-1 flex flex-col"
                            style={{ backgroundColor: theme === 'dark' ? 'rgba(13, 27, 42, 0.2)' : 'rgba(249, 250, 251, 0.5)' }}
                        >
                            <div
                                className="p-6 rounded-xl border shadow-sm flex-1 flex flex-col"
                                style={{
                                    backgroundColor: theme === 'dark' ? '#0D1B2A' : '#ffffff',
                                    borderColor: theme === 'dark' ? '#415A77' : '#f3f4f6'
                                }}
                            >
                                <Controls
                                    filterMode={filterMode}
                                    setFilterMode={setFilterMode}
                                    theme={theme}
                                    availableYears={availableYears}
                                    availableMonths={availableMonths}
                                    selectedYear={selectedYear}
                                    setSelectedYear={setSelectedYear}
                                    selectedMonth={selectedMonth}
                                    setSelectedMonth={setSelectedMonth}
                                />
                                <div className="flex-1 w-full min-h-[400px]">
                                    <ChartView processedData={processedData} filterMode={filterMode} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

// --- Sub-components ---

const ChartView = ({ processedData, filterMode }: { processedData: ChartData[]; filterMode: FilterMode }) => {
    // Determine Axis configuration based on mode
    const isOverall = filterMode === "OVERALL";

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={processedData}
                    margin={{ top: 5, right: 15, left: 0, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis
                        dataKey="label"
                        axisLine={true}
                        tickLine={true}
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        interval={isOverall ? "preserveStartEnd" : 0}
                        padding={{ left: 10, right: 10 }}
                        height={45}
                        type={isOverall ? "number" : "category"}
                        domain={isOverall ? ['dataMin', 'dataMax'] : undefined}
                        tickFormatter={(val) => {
                            if (isOverall) return new Date(val).getFullYear().toString();
                            return val;
                        }}
                        ticks={isOverall ? (() => {
                            if (processedData.length === 0) return [];
                            const minTime = Number(processedData[0].label);
                            const maxTime = Number(processedData[processedData.length - 1].label);
                            const minYear = new Date(minTime).getFullYear();
                            const maxYear = new Date(maxTime).getFullYear();

                            const ticks = [];

                            // Always add the exact start date as the first tick so "202X" appears at the start
                            ticks.push(minTime);

                            // Add Jan 1st for subsequent years
                            for (let y = minYear + 1; y <= maxYear; y++) {
                                ticks.push(new Date(y, 0, 1).getTime());
                            }

                            return ticks;
                        })() : undefined}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickFormatter={(value) => `₹${value}`}
                        domain={['auto', 'auto']}
                        width={45}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)'
                        }}
                        itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                        // Handle formatting for timestamp label in Overall mode vs string in others
                        labelFormatter={(label) => {
                            if (isOverall) return new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                            return label;
                        }}
                        formatter={(value: number | undefined) => [`₹ ${value || 0}`, "NAV"]}
                        labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#00A8E8"
                        strokeWidth={3}
                        dot={!isOverall ? { r: 4, fill: '#00A8E8', strokeWidth: 2, stroke: '#fff' } : false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        animationDuration={800}
                        isAnimationActive={false} // Disable animation to prevent potential freezing during rapid updates
                    />
                </LineChart>
            </ResponsiveContainer>
            {processedData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-white/50 dark:bg-black/20 backdrop-blur-sm z-10 pointer-events-none">
                    No data available for this selection
                </div>
            )}
        </div>
    );
};

interface ControlsProps {
    filterMode: FilterMode;
    setFilterMode: (mode: FilterMode) => void;
    theme: string | undefined;
    availableYears: string[];
    availableMonths: string[];
    selectedYear: string;
    setSelectedYear: (val: string) => void;
    selectedMonth: string;
    setSelectedMonth: (val: string) => void;
}

const Controls = ({
    filterMode, setFilterMode, theme, availableYears, availableMonths,
    selectedYear, setSelectedYear, selectedMonth, setSelectedMonth
}: ControlsProps) => (
    <div className="flex flex-wrap items-center gap-2">
        <div
            className="flex border rounded-lg p-1 shadow-sm transition-colors duration-300 flex-shrink-0"
            style={{
                backgroundColor: theme === 'dark' ? '#0D1B2A' : '#ffffff',
                borderColor: theme === 'dark' ? '#334155' : '#e5e7eb'
            }}
        >
            {(["OVERALL", "DAYS", "MONTHS", "YEARS"] as FilterMode[]).map((mode) => (
                <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-2.5 py-2 md:px-4 md:py-2.5 text-[10px] md:text-xs font-bold rounded-md transition-all ${filterMode === mode
                        ? "bg-[#00A8E8] text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-navy-800 dark:hover:text-gray-200"
                        }`}
                >
                    {mode}
                </button>
            ))}
        </div>

        {/* Days Logic: Show Year AND Month Selects */}
        {filterMode === "DAYS" && (
            <>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="p-1.5 text-sm border border-gray-200 dark:border-navy-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                        backgroundColor: theme === 'dark' ? '#1B263B' : '#ffffff',
                        color: theme === 'dark' ? '#ffffff' : '#1f2937',
                        borderColor: theme === 'dark' ? '#334155' : '#e5e7eb'
                    }}
                >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="p-1.5 text-sm border border-gray-200 dark:border-navy-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                        backgroundColor: theme === 'dark' ? '#1B263B' : '#ffffff',
                        color: theme === 'dark' ? '#ffffff' : '#1f2937',
                        borderColor: theme === 'dark' ? '#334155' : '#e5e7eb'
                    }}
                >
                    {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </>
        )}

        {/* Months Logic: Show Year Select ONLY */}
        {filterMode === "MONTHS" && (
            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="p-1.5 text-sm border border-gray-200 dark:border-navy-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                    backgroundColor: theme === 'dark' ? '#1B263B' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#1f2937',
                    borderColor: theme === 'dark' ? '#334155' : '#e5e7eb'
                }}
            >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        )}

        {/* OVERALL & YEARS Logic: No dropdowns needed */}
    </div>
);
