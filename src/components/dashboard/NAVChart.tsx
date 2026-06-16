"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
    nifty: number | null;
    fullDate: Date;
    sortKey?: number;
    niftyIndexed?: number | null;
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
                nifty: d.nifty50 ?? null,
                fullDate: new Date(d.date)
            }));
    }

    // 2. MONTHS: Show monthly averages for a specific Year
    if (filterMode === "MONTHS") {
        filtered = filtered.filter(d => new Date(d.date).getFullYear().toString() === selectedYear);
        const groups: { [key: number]: { navSum: number, navCount: number, niftySum: number, niftyCount: number } } = {};

        for (const d of filtered) {
            const month = new Date(d.date).getMonth();
            if (!groups[month]) groups[month] = { navSum: 0, navCount: 0, niftySum: 0, niftyCount: 0 };
            groups[month].navSum += d.value;
            groups[month].navCount += 1;
            if (d.nifty50 !== undefined && d.nifty50 !== null) {
                groups[month].niftySum += d.nifty50;
                groups[month].niftyCount += 1;
            }
        }

        return Object.entries(groups)
            .map(([monthIdx, g]) => {
                const date = new Date();
                date.setMonth(parseInt(monthIdx));
                return {
                    label: date.toLocaleString('default', { month: 'short' }), // "Jan", "Feb"
                    value: parseFloat((g.navSum / g.navCount).toFixed(2)),
                    nifty: g.niftyCount > 0 ? parseFloat((g.niftySum / g.niftyCount).toFixed(2)) : null,
                    fullDate: date,
                    sortKey: parseInt(monthIdx)
                };
            })
            .sort((a, b) => (a.sortKey ?? 0) - (b.sortKey ?? 0));
    }

    // 3. YEARS: Show yearly averages for all time
    if (filterMode === "YEARS") {
        const groups: { [key: string]: { navSum: number, navCount: number, niftySum: number, niftyCount: number } } = {};

        for (const d of filtered) {
            const year = new Date(d.date).getFullYear().toString();
            if (!groups[year]) groups[year] = { navSum: 0, navCount: 0, niftySum: 0, niftyCount: 0 };
            groups[year].navSum += d.value;
            groups[year].navCount += 1;
            if (d.nifty50 !== undefined && d.nifty50 !== null) {
                groups[year].niftySum += d.nifty50;
                groups[year].niftyCount += 1;
            }
        }

        return Object.entries(groups)
            .map(([year, g]) => ({
                label: year, // "2025", "2026"
                value: parseFloat((g.navSum / g.navCount).toFixed(2)),
                nifty: g.niftyCount > 0 ? parseFloat((g.niftySum / g.niftyCount).toFixed(2)) : null,
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
                nifty: d.nifty50 ?? null,
                fullDate: new Date(d.date)
            }));
    }

    return [];
};


// --- Main Component ---
export default function NAVChart({ data }: NAVChartProps) {
    const { theme } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);

    // Default to OVERALL and Indexed comparison
    const [filterMode, setFilterMode] = useState<FilterMode>("OVERALL");
    const [chartType, setChartType] = useState<"indexed" | "comparison" | "nif" | "nifty">("indexed");

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
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
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
                        chartType={chartType}
                        setChartType={setChartType}
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

                {/* Chart Container - Reduced height for tighter fit */}
                <div className="h-[340px] md:h-[350px] w-full">
                    {mounted ? (
                        <ChartView processedData={processedData} filterMode={filterMode} chartType={chartType} />
                    ) : (
                        <div className="h-full w-full rounded-xl bg-gray-100 dark:bg-navy-800 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
                            Loading Chart...
                        </div>
                    )}
                </div>
                {chartType === "indexed" && (
                    <p className="text-[11px] md:text-xs text-muted-foreground mt-3 italic text-center leading-relaxed">
                        * Note: Nifty 50 data is normalized/indexed with NIF NAV data for comparison purpose. This provides a direct, relative comparison of performance starting from the same baseline.
                    </p>
                )}
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
                                    chartType={chartType}
                                    setChartType={setChartType}
                                />
                                <div className="flex-1 w-full min-h-[400px] flex flex-col justify-between">
                                    <div className="flex-1 w-full">
                                        <ChartView processedData={processedData} filterMode={filterMode} chartType={chartType} />
                                    </div>
                                    {chartType === "indexed" && (
                                        <p className="text-xs text-muted-foreground mt-4 italic text-center leading-relaxed">
                                            * Note: Nifty 50 data is normalized/indexed with NIF NAV data for comparison purpose. This provides a direct, relative comparison of performance starting from the same baseline.
                                        </p>
                                    )}
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

const ChartView = ({
    processedData,
    filterMode,
    chartType
}: {
    processedData: ChartData[];
    filterMode: FilterMode;
    chartType: "indexed" | "comparison" | "nif" | "nifty";
}) => {
    // Determine Axis and Data configurations based on mode
    const isOverall = filterMode === "OVERALL";
    const showNIF = chartType === "indexed" || chartType === "comparison" || chartType === "nif";
    const showNifty = chartType === "indexed" || chartType === "comparison" || chartType === "nifty";
    const isComparison = chartType === "comparison";

    // 1. Calculate indexed/normalized Nifty 50 data starting from NIF NAV baseline
    const chartDataWithIndexed = useMemo(() => {
        if (!processedData || processedData.length === 0) return [];
        
        // Find the first data point with both valid NAV and Nifty 50
        const firstValid = processedData.find(d => 
            d.value !== undefined && d.value !== null && 
            d.nifty !== undefined && d.nifty !== null
        );
        
        if (!firstValid) {
            return processedData.map(d => ({ ...d, niftyIndexed: d.nifty }));
        }
        
        const baseNAV = firstValid.value;
        const baseNifty = firstValid.nifty!;
        
        return processedData.map(d => {
            const niftyIndexed = d.nifty !== null && d.nifty !== undefined && baseNifty !== 0
                ? parseFloat((d.nifty * (baseNAV / baseNifty)).toFixed(2))
                : null;
            return {
                ...d,
                niftyIndexed
            };
        });
    }, [processedData]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartDataWithIndexed}
                    margin={{ top: 5, right: 10, left: 10, bottom: 10 }}
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

                            ticks.push(minTime);

                            for (let y = minYear + 1; y <= maxYear; y++) {
                                ticks.push(new Date(y, 0, 1).getTime());
                            }

                            return ticks;
                        })() : undefined}
                    />
                    
                    {/* Left YAxis (for NIF NAV and Shared Indexed Axis) */}
                    {showNIF && (
                        <YAxis
                            yAxisId={isComparison ? "left" : undefined}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 10 }}
                            tickFormatter={(value) => `₹${value}`}
                            domain={['auto', 'auto']}
                            width={45}
                            hide={true}
                        />
                    )}

                    {/* Right YAxis (for Nifty 50 - only used in dual-axis Comparison/Nifty Performance mode) */}
                    {(chartType === "comparison" || chartType === "nifty") && (
                        <YAxis
                            yAxisId={isComparison ? "right" : undefined}
                            orientation={isComparison ? "right" : "left"}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 10 }}
                            tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                            domain={['auto', 'auto']}
                            width={60}
                            hide={true}
                        />
                    )}

                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)'
                        }}
                        itemStyle={{ fontWeight: 'bold' }}
                        labelFormatter={(label) => {
                            if (isOverall) return new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                            return label;
                        }}
                        formatter={(value: any, name?: string, props?: any) => {
                            if (name === "NIF") return [`₹ ${Number(value).toFixed(2)}`, name];
                            if (chartType === "indexed" && name === "Nifty 50") {
                                const actualNifty = props?.payload?.nifty;
                                const actualStr = actualNifty !== null && actualNifty !== undefined
                                    ? ` (Actual: ₹ ${Number(actualNifty).toLocaleString('en-IN')})`
                                    : "";
                                return [`₹ ${Number(value).toFixed(2)}${actualStr}`, name];
                            }
                            return [`₹ ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, name ?? ""];
                        }}
                        labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                    />
                    
                    <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span className="text-foreground font-bold text-xs ml-1.5">{value}</span>}
                    />

                    {showNIF && (
                        <Line
                            yAxisId={isComparison ? "left" : undefined}
                            type="monotone"
                            dataKey="value"
                            name="NIF"
                            stroke="#00A8E8"
                            strokeWidth={3}
                            dot={!isOverall ? { r: 4, fill: '#00A8E8', strokeWidth: 2, stroke: '#fff' } : false}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            animationDuration={800}
                            isAnimationActive={false}
                        />
                    )}

                    {showNifty && (
                        <Line
                            yAxisId={isComparison ? "right" : undefined}
                            type="monotone"
                            dataKey={chartType === "indexed" ? "niftyIndexed" : "nifty"}
                            name="Nifty 50"
                            stroke="#F97316"
                            strokeWidth={3}
                            dot={!isOverall ? { r: 4, fill: '#F97316', strokeWidth: 2, stroke: '#fff' } : false}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            animationDuration={800}
                            isAnimationActive={false}
                            connectNulls={true}
                        />
                    )}
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
    chartType: "indexed" | "comparison" | "nif" | "nifty";
    setChartType: (val: "indexed" | "comparison" | "nif" | "nifty") => void;
}

const Controls = ({
    filterMode, setFilterMode, theme, availableYears, availableMonths,
    selectedYear, setSelectedYear, selectedMonth, setSelectedMonth,
    chartType, setChartType
}: ControlsProps) => (
    <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Chart Type Dropdown */}
        <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className="p-2.5 text-xs font-bold border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground cursor-pointer shadow-sm transition-colors duration-300"
            style={{
                borderColor: theme === 'dark' ? '#334155' : '#e5e7eb'
            }}
        >
            <option value="indexed">Comparison of NIF and Nifty50</option>
            <option value="comparison">NIF NAV vs Nifty 50 (Dual Axis)</option>
            <option value="nif">NIF NAV Performance</option>
            <option value="nifty">Nifty 50 Performance</option>
        </select>

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
                    className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${filterMode === mode
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
    </div>
);
