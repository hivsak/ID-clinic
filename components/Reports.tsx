
import React, { useMemo, useState } from 'react';
import { Patient, MedicalEventType } from '../types';
import { determineHbvStatus, determineHcvStatus } from './utils';
import { SearchIcon, ChevronDownIcon } from './icons';

interface ReportsProps {
    patients: Patient[];
}

const Card: React.FC<{ title: string; value: number | string; subtitle?: string; className?: string }> = ({ title, value, subtitle, className = "bg-white" }) => (
    <div className={`p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center ${className}`}>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
);

// --- Donut Chart Component ---
const DonutChart: React.FC<{ data: { label: string; count: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, cur) => acc + cur.count, 0);
    const radius = 70;
    const innerRadius = 50;
    const center = 100;
    let accumulatedAngle = 0;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400">
                ไม่มีข้อมูล
            </div>
        );
    }

    const slices = data.map((item, index) => {
        if (item.count === 0) return null;
        
        const percentage = item.count / total;
        const startAngle = accumulatedAngle;
        const endAngle = accumulatedAngle + percentage;
        accumulatedAngle += percentage;

        // Handle single item taking up 100% (360 degrees)
        if (percentage > 0.999) {
             return (
                <circle
                    key={item.label}
                    cx={center}
                    cy={center}
                    r={(radius + innerRadius) / 2}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={radius - innerRadius}
                />
            );
        }

        const getCoords = (percent: number, r: number) => {
             const x = center + r * Math.cos(2 * Math.PI * percent - Math.PI / 2);
             const y = center + r * Math.sin(2 * Math.PI * percent - Math.PI / 2);
             return [x, y];
        };

        const [startX, startY] = getCoords(startAngle, radius);
        const [endX, endY] = getCoords(endAngle, radius);
        const [startInnerX, startInnerY] = getCoords(startAngle, innerRadius);
        const [endInnerX, endInnerY] = getCoords(endAngle, innerRadius);

        const largeArcFlag = percentage > 0.5 ? 1 : 0;

        const pathData = [
            `M ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L ${endInnerX} ${endInnerY}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInnerX} ${startInnerY}`,
            `Z`
        ].join(' ');

        return (
            <path
                key={item.label}
                d={pathData}
                fill={item.color}
                className="transition-all duration-300 hover:opacity-80"
            >
                <title>{`${item.label}: ${item.count} (${(percentage * 100).toFixed(1)}%)`}</title>
            </path>
        );
    });

    return (
        <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-48 h-48">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                    {slices}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-gray-700">{total}</span>
                    <span className="text-xs text-gray-500">Cases</span>
                </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 w-full">
                {data.map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                            <span className="text-gray-600 truncate max-w-[140px]" title={item.label}>{item.label}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{item.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Charts Commons ---

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const GENERAL_LABELS = ['HIV', 'HBV', 'TPT', 'PrEP', 'PEP'];
const GENERAL_COLORS = {
    HIV: '#3b82f6', // Blue
    HBV: '#10b981', // Emerald
    TPT: '#f97316', // Orange
    PrEP: '#6366f1', // Indigo
    PEP: '#a855f7', // Purple
};

// --- General Trend Chart ---

const GeneralTrendChart: React.FC<{ patients: Patient[] }> = ({ patients }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
    const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(GENERAL_LABELS));

    const toggleCategory = (cat: string) => {
        setVisibleCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cat)) {
                newSet.delete(cat);
            } else {
                newSet.add(cat);
            }
            return newSet;
        });
    };

    const { years, dataByYear } = useMemo(() => {
        const yrs = new Set<number>();
        // Structure: Year -> Month -> Category -> Count
        const db: Record<number, Record<number, Record<string, number>>> = {};

        const add = (dateStr: string | undefined, category: string) => {
            if (!dateStr) return;
            const parts = dateStr.split('-');
            let y: number, m: number;
            if (parts.length >= 2) {
                 y = parseInt(parts[0], 10);
                 m = parseInt(parts[1], 10) - 1;
            } else {
                const d = new Date(dateStr);
                y = d.getFullYear();
                m = d.getMonth();
            }
            if (isNaN(y) || isNaN(m)) return;

            yrs.add(y);
            if (!db[y]) db[y] = {};
            if (!db[y][m]) db[y][m] = {};
            db[y][m][category] = (db[y][m][category] || 0) + 1;
        };

        patients.forEach(p => {
            // HIV
            const hivDiag = p.medicalHistory.find(e => e.type === MedicalEventType.DIAGNOSIS);
            if (hivDiag) add(hivDiag.date, 'HIV');

            // HBV (Positive tests)
            p.hbvInfo?.hbsAgTests?.forEach(t => {
                if (t.result === 'Positive') add(t.date, 'HBV');
            });

            // TPT
            p.medicalHistory.forEach(e => {
                if (e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT) {
                    add(e.date, 'TPT');
                }
            });

            // PrEP
            p.prepInfo?.records?.forEach(r => {
                add(r.dateStart, 'PrEP');
            });

            // PEP
            p.pepInfo?.records?.forEach(r => {
                add(r.date, 'PEP');
            });
        });

        return { years: Array.from(yrs).sort((a, b) => b - a), dataByYear: db };
    }, [patients]);

    React.useEffect(() => {
        if (years.length > 0 && !years.includes(selectedYear)) {
            setSelectedYear(years[0]);
        }
    }, [years, selectedYear]);

    const { monthlyData, maxCount } = useMemo(() => {
        const currentYearData = dataByYear[selectedYear] || {};
        let max = 0;

        const mData = Array.from({ length: 12 }, (_, i) => {
            const counts = currentYearData[i] || {};
            GENERAL_LABELS.forEach(cat => {
                // Only calculate max for visible categories
                if (visibleCategories.has(cat)) {
                    const c = counts[cat] || 0;
                    if (c > max) max = c;
                }
            });
            return { monthIndex: i, counts };
        });

        return { monthlyData: mData, maxCount: Math.max(max, 4) };
    }, [selectedYear, dataByYear, visibleCategories]);

    const svgHeight = 320;
    const svgWidth = 800;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const getX = (monthIndex: number) => padding.left + (monthIndex * (chartWidth / 11));
    const getY = (count: number) => padding.top + chartHeight - ((count / maxCount) * chartHeight);

    const getPath = (category: string) => {
        let d = '';
        monthlyData.forEach((data, i) => {
            const count = data.counts[category] || 0;
            const x = getX(i);
            const y = getY(count);
            if (i === 0) d += `M ${x} ${y}`;
            else d += ` L ${x} ${y}`;
        });
        return d;
    };

    return (
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">แนวโน้มรายเดือน (Monthly Trends)</h3>
                {years.length > 0 && (
                    <div className="relative mt-2 sm:mt-0">
                         <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 pr-8"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <ChevronDownIcon />
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-2 mb-6">
                {GENERAL_LABELS.map(cat => {
                    const color = GENERAL_COLORS[cat as keyof typeof GENERAL_COLORS];
                    const isActive = visibleCategories.has(cat);
                    return (
                        <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border shadow-sm flex items-center gap-2 ${
                                isActive 
                                ? `text-white border-transparent` 
                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                            }`}
                            style={{ 
                                backgroundColor: isActive ? color : undefined,
                                borderColor: isActive ? color : undefined
                            }}
                        >
                             <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-gray-300'}`}></span>
                            {cat}
                        </button>
                    );
                })}
            </div>

            {years.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p>ไม่มีข้อมูลประวัติในระบบ</p>
                </div>
            ) : (
                 <div className="relative w-full overflow-hidden">
                     {/* Tooltip */}
                     {hoveredMonth !== null && (
                         <div 
                            className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs min-w-[120px] pointer-events-none"
                            style={{ 
                                left: `${(hoveredMonth / 11) * 80}%`, 
                                top: '10%',
                                transform: hoveredMonth > 8 ? 'translateX(-100%)' : 'translateX(0)' 
                            }}
                         >
                             <p className="font-bold text-gray-800 mb-2 border-b pb-1">{THAI_MONTHS[hoveredMonth]} {selectedYear}</p>
                             <ul className="space-y-1">
                                 {GENERAL_LABELS.filter(c => visibleCategories.has(c)).map(cat => (
                                     <li key={cat} className="flex justify-between items-center">
                                          <div className="flex items-center">
                                             <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: GENERAL_COLORS[cat as keyof typeof GENERAL_COLORS] }}></span>
                                             <span className="text-gray-600">{cat}</span>
                                         </div>
                                         <span className="font-bold text-gray-900 ml-2">{monthlyData[hoveredMonth].counts[cat] || 0}</span>
                                     </li>
                                 ))}
                                 {GENERAL_LABELS.filter(c => visibleCategories.has(c)).length === 0 && (
                                     <li className="text-gray-400 italic">ไม่ได้เลือกกราฟ</li>
                                 )}
                             </ul>
                         </div>
                     )}
                     
                     <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto font-sans text-xs">
                         {/* Grid & Y-Axis */}
                        {Array.from({ length: 6 }).map((_, i) => {
                            const val = (maxCount / 5) * i;
                            const y = getY(val);
                            return (
                                <g key={i}>
                                    <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                                    <text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#9ca3af">{Math.round(val)}</text>
                                </g>
                            );
                        })}

                        {/* X-Axis */}
                        {THAI_MONTHS.map((m, i) => {
                            const x = getX(i);
                            return <text key={m} x={x} y={svgHeight - 10} textAnchor="middle" fill="#6b7280">{m}</text>;
                        })}

                        {/* Lines */}
                        {GENERAL_LABELS.map(cat => {
                            if (!visibleCategories.has(cat)) return null;
                            return (
                                <path
                                    key={cat}
                                    d={getPath(cat)}
                                    fill="none"
                                    stroke={GENERAL_COLORS[cat as keyof typeof GENERAL_COLORS]}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-300"
                                />
                            );
                        })}

                        {/* Dots */}
                        {GENERAL_LABELS.map(cat => {
                            if (!visibleCategories.has(cat)) return null;
                            return (
                                <g key={`dots-${cat}`}>
                                    {monthlyData.map((d, i) => {
                                        const count = d.counts[cat];
                                        if (count === undefined || count === 0) return null;
                                        return (
                                            <circle 
                                                key={i} 
                                                cx={getX(i)} 
                                                cy={getY(count)} 
                                                r="3" 
                                                fill={GENERAL_COLORS[cat as keyof typeof GENERAL_COLORS]} 
                                                stroke="white" 
                                                strokeWidth="1"
                                            />
                                        );
                                    })}
                                </g>
                            );
                        })}

                         {/* Interactive Area */}
                        {monthlyData.map((_, i) => (
                            <rect
                                key={`overlay-${i}`}
                                x={getX(i) - (chartWidth / 22)}
                                y={padding.top}
                                width={chartWidth / 11}
                                height={chartHeight}
                                fill="transparent"
                                className="cursor-pointer hover:bg-gray-500 hover:bg-opacity-5 transition-colors"
                                onMouseEnter={() => setHoveredMonth(i)}
                                onMouseLeave={() => setHoveredMonth(null)}
                            />
                        ))}
                     </svg>
                 </div>
            )}
         </div>
    );
};

// --- STD Chart Component ---

const STD_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#f43f5e', // Rose
    '#881337'  // Dark Red
];

const StdLineChart: React.FC<{ patients: Patient[] }> = ({ patients }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

    // 1. Process Data
    const { years, dataByYear } = useMemo(() => {
        const yrs = new Set<number>();
        // Structure: Year -> Month (0-11) -> Disease -> Count
        const db: Record<number, Record<number, Record<string, number>>> = {};

        patients.forEach(p => {
            p.stdInfo?.records?.forEach(r => {
                if (!r.date) return;
                
                // Robust date parsing (YYYY-MM-DD) to avoid timezone issues
                const parts = r.date.split('-');
                let y: number, m: number;
                
                if (parts.length >= 2) {
                    y = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                } else {
                    // Fallback if not standard YYYY-MM-DD
                    const d = new Date(r.date);
                    y = d.getFullYear();
                    m = d.getMonth();
                }

                if (isNaN(y) || isNaN(m)) return;

                yrs.add(y);

                if (!db[y]) db[y] = {};
                if (!db[y][m]) db[y][m] = {};

                r.diseases.forEach(disease => {
                    db[y][m][disease] = (db[y][m][disease] || 0) + 1;
                });
            });
        });

        const sortedYears = Array.from(yrs).sort((a, b) => b - a);
        return { years: sortedYears, dataByYear: db };
    }, [patients]);

    // Ensure selected year is valid (or fallback to latest)
    React.useEffect(() => {
        if (years.length > 0 && !years.includes(selectedYear)) {
            setSelectedYear(years[0]);
        }
    }, [years, selectedYear]);

    // 2. Prepare Data for Selected Year
    const { monthlyData, activeDiseases, maxCount } = useMemo(() => {
        const currentYearData = dataByYear[selectedYear] || {};
        const diseasesSet = new Set<string>();
        let max = 0;

        // Initialize 12 months
        const mData = Array.from({ length: 12 }, (_, i) => {
            const monthRecs = (currentYearData[i] || {}) as Record<string, number>;
            const diseaseCounts = Object.entries(monthRecs);
            
            // Track max for Y-axis scaling
            diseaseCounts.forEach(([d, c]) => {
                diseasesSet.add(d);
                if ((c as number) > max) max = (c as number);
            });

            return { monthIndex: i, details: monthRecs };
        });

        return { 
            monthlyData: mData, 
            activeDiseases: Array.from(diseasesSet).sort(),
            maxCount: Math.max(max, 4) // Minimum Y-axis of 4
        };
    }, [selectedYear, dataByYear]);

    // 3. SVG Dimensions & Scales
    const svgHeight = 320;
    const svgWidth = 800; // Viewbox width
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const getX = (monthIndex: number) => padding.left + (monthIndex * (chartWidth / 11));
    const getY = (count: number) => padding.top + chartHeight - ((count / maxCount) * chartHeight);

    // Generate Path for a disease
    const getPath = (disease: string) => {
        let d = '';
        monthlyData.forEach((data, i) => {
            const count = data.details[disease] || 0;
            const x = getX(i);
            const y = getY(count);
            if (i === 0) d += `M ${x} ${y}`;
            else d += ` L ${x} ${y}`;
        });
        return d;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">สถิติโรคติดต่อทางเพศสัมพันธ์ (STD)</h3>
                
                {years.length > 0 && (
                    <div className="relative mt-2 sm:mt-0">
                         <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 pr-8"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <ChevronDownIcon />
                        </div>
                    </div>
                )}
            </div>

            {years.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p>ไม่มีข้อมูลประวัติ STD ในระบบ</p>
                </div>
            ) : (
                <>
                    <div className="relative w-full overflow-hidden">
                         {/* Tooltip */}
                         {hoveredMonth !== null && (
                             <div 
                                className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs min-w-[120px] pointer-events-none"
                                style={{ 
                                    left: `${(hoveredMonth / 11) * 80}%`, 
                                    top: '10%',
                                    transform: hoveredMonth > 8 ? 'translateX(-100%)' : 'translateX(0)' 
                                }}
                             >
                                 <p className="font-bold text-gray-800 mb-2 border-b pb-1">{THAI_MONTHS[hoveredMonth]} {selectedYear}</p>
                                 {Object.entries(monthlyData[hoveredMonth].details).length > 0 ? (
                                     <ul className="space-y-1">
                                         {Object.entries(monthlyData[hoveredMonth].details).map(([dis, count]) => {
                                             const colorIndex = activeDiseases.indexOf(dis) % STD_COLORS.length;
                                             return (
                                                 <li key={dis} className="flex justify-between items-center">
                                                     <div className="flex items-center">
                                                         <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: STD_COLORS[colorIndex] }}></span>
                                                         <span className="text-gray-600">{dis}</span>
                                                     </div>
                                                     <span className="font-bold text-gray-900 ml-2">{count}</span>
                                                 </li>
                                             );
                                         })}
                                     </ul>
                                 ) : (
                                     <p className="text-gray-400">ไม่มีรายการ</p>
                                 )}
                             </div>
                         )}

                        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto font-sans text-xs">
                            {/* Grid Lines (Horizontal) */}
                            {Array.from({ length: 6 }).map((_, i) => {
                                const val = (maxCount / 5) * i;
                                const y = getY(val);
                                return (
                                    <g key={i}>
                                        <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                                        <text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#9ca3af">{Math.round(val)}</text>
                                    </g>
                                );
                            })}

                            {/* X-Axis Labels */}
                            {THAI_MONTHS.map((m, i) => {
                                const x = getX(i);
                                return (
                                    <text key={m} x={x} y={svgHeight - 10} textAnchor="middle" fill="#6b7280">{m}</text>
                                );
                            })}

                            {/* Data Lines */}
                            {activeDiseases.map((disease, idx) => (
                                <path
                                    key={disease}
                                    d={getPath(disease)}
                                    fill="none"
                                    stroke={STD_COLORS[idx % STD_COLORS.length]}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-300 ease-in-out"
                                />
                            ))}

                            {/* Data Points (Dots) */}
                            {activeDiseases.map((disease, idx) => (
                                <g key={`dots-${disease}`}>
                                    {monthlyData.map((d, i) => {
                                        const count = d.details[disease];
                                        if (count === undefined || count === 0) return null;
                                        return (
                                            <circle 
                                                key={i} 
                                                cx={getX(i)} 
                                                cy={getY(count)} 
                                                r="3" 
                                                fill={STD_COLORS[idx % STD_COLORS.length]} 
                                                stroke="white" 
                                                strokeWidth="1"
                                            />
                                        );
                                    })}
                                </g>
                            ))}

                            {/* Interactive Overlay Columns */}
                            {monthlyData.map((_, i) => (
                                <rect
                                    key={`overlay-${i}`}
                                    x={getX(i) - (chartWidth / 22)} // Center the rect on the tick
                                    y={padding.top}
                                    width={chartWidth / 11}
                                    height={chartHeight}
                                    fill="transparent"
                                    className="cursor-pointer hover:bg-gray-500 hover:bg-opacity-5 transition-colors"
                                    onMouseEnter={() => setHoveredMonth(i)}
                                    onMouseLeave={() => setHoveredMonth(null)}
                                />
                            ))}
                        </svg>
                    </div>

                    {/* Legend */}
                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                        {activeDiseases.map((disease, idx) => (
                            <div key={disease} className="flex items-center text-xs sm:text-sm bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                <span 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: STD_COLORS[idx % STD_COLORS.length] }}
                                ></span>
                                <span className="text-gray-700 font-medium">{disease}</span>
                            </div>
                        ))}
                        {activeDiseases.length === 0 && (
                            <p className="text-sm text-gray-400">ไม่มีการวินิจฉัยโรคในปีนี้</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};


export const Reports: React.FC<ReportsProps> = ({ patients }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const stats = useMemo(() => {
        const s = {
            totalPatients: patients.length,
            totalHiv: 0,
            hbv: { positive: 0 },
            hcv: {
                waitForTest: 0,
                clearedSpontaneously: 0,
                treating: 0,
                treatmentFailed: 0,
                cured: 0,
                activeHcv: 0,
                totalPositiveDiagnostic: 0
            },
            tpt: 0,
            std: { totalDiagnoses: 0 },
            prep: 0,
            pep: 0
        };

        const isInRange = (dateStr?: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr).getTime();
            const start = startDate ? new Date(startDate).getTime() : -Infinity;
            const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
            return d >= start && d <= endFinal;
        };
        
        // Helper for endDate calculation in range check
        const endFinal = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

        patients.forEach(p => {
            // HIV
            const hivDiagEvent = p.medicalHistory.find(e => e.type === MedicalEventType.DIAGNOSIS);
            if (hivDiagEvent && isInRange(hivDiagEvent.date)) s.totalHiv++;

            // HBV
            const hbvStatus = determineHbvStatus(p);
            if (hbvStatus.text === 'เป็น HBV') {
                const positiveTestInRange = p.hbvInfo?.hbsAgTests?.some(t => t.result === 'Positive' && isInRange(t.date));
                if (positiveTestInRange || (!startDate && !endDate)) s.hbv.positive++;
            }

            // HCV
            const hcvStatus = determineHcvStatus(p);
            const hcvInfo = p.hcvInfo || { hcvTests: [] };
            const latestAntiHcv = [...(hcvInfo.hcvTests || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const latestPreVl = [...(hcvInfo.preTreatmentVls || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const latestPostVl = [...(hcvInfo.postTreatmentVls || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const latestTreatment = [...(hcvInfo.treatments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            let countThisHcv = false;
            switch (hcvStatus.text) {
                case 'รอการตรวจเพิ่มเติม': if (latestAntiHcv && isInRange(latestAntiHcv.date)) countThisHcv = true; break;
                case 'เคยเป็น HCV หายเอง': if (latestPreVl && isInRange(latestPreVl.date)) countThisHcv = true; break;
                case 'กำลังรักษา HCV': if (latestTreatment && isInRange(latestTreatment.date)) countThisHcv = true; break;
                case 'เป็น HCV รักษาแล้วไม่หาย': 
                case 'เคยเป็น HCV รักษาหายแล้ว': if (latestPostVl && isInRange(latestPostVl.date)) countThisHcv = true; break;
                case 'เป็น HCV': if (latestPreVl && isInRange(latestPreVl.date)) countThisHcv = true; break;
            }
            if (!startDate && !endDate) countThisHcv = true;

            if (countThisHcv) {
                if (hcvStatus.text !== 'ไม่เป็น HCV' && hcvStatus.text !== 'ไม่มีข้อมูล') s.hcv.totalPositiveDiagnostic++; 
                switch (hcvStatus.text) {
                    case 'รอการตรวจเพิ่มเติม': s.hcv.waitForTest++; break;
                    case 'เคยเป็น HCV หายเอง': s.hcv.clearedSpontaneously++; break;
                    case 'กำลังรักษา HCV': s.hcv.treating++; break;
                    case 'เป็น HCV รักษาแล้วไม่หาย': s.hcv.treatmentFailed++; break;
                    case 'เคยเป็น HCV รักษาหายแล้ว': s.hcv.cured++; break;
                    case 'เป็น HCV': s.hcv.activeHcv++; break;
                }
            }

            // TPT
            const tptEvents = p.medicalHistory.filter(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT && isInRange(e.date));
            if (tptEvents.length > 0) s.tpt++;

            // STD Total Count
            if (p.stdInfo?.records) {
                p.stdInfo.records.forEach(rec => {
                    if (isInRange(rec.date)) {
                        rec.diseases.forEach(d => {
                            s.std.totalDiagnoses++;
                        });
                    }
                });
            }

            // PrEP & PEP
            if (p.prepInfo?.records?.some(r => isInRange(r.dateStart))) s.prep++;
            if (p.pepInfo?.records?.some(r => isInRange(r.date))) s.pep++;
        });

        return s;
    }, [patients, startDate, endDate]);

    const hcvChartData = [
        { label: 'รอการตรวจเพิ่มเติม', count: stats.hcv.waitForTest, color: '#fbbf24' },
        { label: 'หายเอง (Spontaneous)', count: stats.hcv.clearedSpontaneously, color: '#34d399' },
        { label: 'กำลังรักษา (Treating)', count: stats.hcv.treating, color: '#3b82f6' },
        { label: 'รักษาไม่หาย (Failed)', count: stats.hcv.treatmentFailed, color: '#ef4444' },
        { label: 'รักษาหายแล้ว (Cured)', count: stats.hcv.cured, color: '#059669' },
        { label: 'Active HCV (ยังไม่รักษา)', count: stats.hcv.activeHcv, color: '#f87171' },
    ].filter(d => d.count > 0);

    const clearFilter = () => {
        setStartDate('');
        setEndDate('');
    };

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">รายงานสรุป (Clinic Reports)</h1>
                    <p className="text-gray-500">
                        {startDate || endDate 
                            ? `แสดงข้อมูลระหว่างวันที่ ${startDate || '...'} ถึง ${endDate || '...'}` 
                            : 'แสดงข้อมูลทั้งหมด (Cumulative)'}
                    </p>
                </div>
                
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
                     <div className="flex flex-row gap-2 items-end">
                        <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium text-gray-500 mb-1 truncate">ตั้งแต่วันที่</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="block w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 min-w-0" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium text-gray-500 mb-1 truncate">ถึงวันที่</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="block w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 min-w-0" />
                        </div>
                        {(startDate || endDate) && (
                             <div className="flex-none">
                                <button onClick={clearFilter} className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors h-[34px] whitespace-nowrap">
                                    ล้าง
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Level Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card title="ผู้ป่วย HIV (รายใหม่)" value={stats.totalHiv} subtitle={startDate ? "ในช่วงเวลาที่เลือก" : "ทั้งหมด"} className="bg-blue-50 border-blue-100 text-blue-900" />
                <Card title="ตรวจพบ HBV" value={stats.hbv.positive} subtitle="(HBsAg + ในช่วงเวลา)" className="bg-emerald-50 border-emerald-100 text-emerald-900" />
                <Card title="ได้รับ TPT" value={stats.tpt} className="bg-orange-50 border-orange-100 text-orange-900" />
                <Card title="เริ่ม PrEP" value={stats.prep} className="bg-indigo-50 border-indigo-100 text-indigo-900" />
                <Card title="ได้รับ PEP" value={stats.pep} className="bg-purple-50 border-purple-100 text-purple-900" />
                <Card title="วินิจฉัย STD" value={stats.std.totalDiagnoses} subtitle="(จำนวนครั้ง)" className="bg-pink-50 border-pink-100 text-pink-900" />
            </div>

            {/* General Monthly Trends */}
            <GeneralTrendChart patients={patients} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* HCV Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b flex justify-between">
                        <span>สรุปสถานการณ์ HCV</span>
                        <span className="text-xs font-normal text-gray-500 self-end">อิงตามวันที่เกิดผล/การรักษา</span>
                    </h3>
                    <DonutChart data={hcvChartData} />
                </div>

                {/* STD Chart */}
                <StdLineChart patients={patients} />
            </div>
        </div>
    );
};
