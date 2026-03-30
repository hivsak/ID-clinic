
import React, { useMemo, useState } from 'react';
import { Patient, MedicalEventType } from '../types';
import { determineHbvStatus, determineHcvStatus, formatThaiDateBE } from './utils';
import { SearchIcon, ChevronDownIcon, ChevronLeftIcon } from './icons';
import { DateInput } from './DateInput';

interface ReportsProps {
    patients: Patient[];
}

const Card: React.FC<{ title: string; value: number | string; subtitle?: string; className?: string; onClick?: () => void }> = ({ title, value, subtitle, className = "bg-white", onClick }) => (
    <div 
        onClick={onClick}
        className={`p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95' : ''} ${className}`}
    >
        <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
    </div>
);

// --- Donut Chart Component ---
const DonutChart: React.FC<{ data: { label: string; count: number; color: string; id?: string }[]; onSliceClick?: (id: string) => void }> = ({ data, onSliceClick }) => {
    const total = data.reduce((acc, cur) => acc + cur.count, 0);
    const radius = 70;
    const innerRadius = 50;
    const center = 100;
    let accumulatedAngle = 0;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400 italic">
                ไม่มีข้อมูลในช่วงเวลาที่เลือก
            </div>
        );
    }

    const slices = data.map((item) => {
        if (item.count === 0) return null;
        
        const percentage = item.count / total;
        const startAngle = accumulatedAngle;
        const endAngle = accumulatedAngle + percentage;
        accumulatedAngle += percentage;

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
                    onClick={() => item.id && onSliceClick?.(item.id)}
                    className="cursor-pointer transition-opacity hover:opacity-80"
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
                onClick={() => item.id && onSliceClick?.(item.id)}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
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
            <div className="mt-6 grid grid-cols-1 gap-y-2 w-full max-w-xs mx-auto">
                {data.map((item) => (
                    <button 
                        key={item.label} 
                        onClick={() => item.id && onSliceClick?.(item.id)}
                        className={`flex justify-between items-center text-sm p-1.5 rounded-lg hover:bg-gray-50 transition-colors ${item.count === 0 ? 'opacity-40 grayscale' : ''}`}
                    >
                        <div className="flex items-center overflow-hidden">
                            <span className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                            <span className="text-gray-600 truncate" title={item.label}>{item.label}</span>
                        </div>
                        <span className="font-semibold text-gray-800 ml-2">{item.count}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Constants & Utils ---
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const GENERAL_LABELS = ['HIV', 'HBV', 'TPT', 'PrEP', 'PEP'];
const GENERAL_COLORS = { HIV: '#3b82f6', HBV: '#10b981', TPT: '#f97316', PrEP: '#6366f1', PEP: '#a855f7' };
const SYPHILIS_SUBTYPES = ['Primary Syphilis', 'Secondary Syphilis', 'Early Syphilis', 'Late Latent Syphilis', 'Neuro Syphilis', 'Cardiovascular Syphilis', 'Congenital Syphilis', 'Syphilis (ไม่ทราบ)'];
const TB_SUBTYPES = ["Disemminated TB", "TB lung", "TB larynx", "TB lymphadinitis", "TB pleuritis", "TB pericarditis", "TB peritonitis", "Tb colitis", "TB meningitis", "Tuberculoma", "TB spine", "TB arthritis", "TB endophthalmitis", "TB Liver abscess", "TB splenic abscess", "TB muscle abscess", "TB Nephritis"];
const STD_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#881337'];

// --- General Trend Chart ---
const GeneralTrendChart: React.FC<{ patients: Patient[] }> = ({ patients }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
    const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(GENERAL_LABELS));

    const toggleCategory = (cat: string) => {
        setVisibleCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cat)) newSet.delete(cat);
            else newSet.add(cat);
            return newSet;
        });
    };

    const { years, dataByYear } = useMemo(() => {
        const yrs = new Set<number>();
        const currentY = new Date().getFullYear();
        yrs.add(currentY);
        yrs.add(2025);
        yrs.add(2026); // Ensure 2569 BE is present

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
            const hivDiag = p.medicalHistory.find(e => e.type === MedicalEventType.DIAGNOSIS);
            if (hivDiag) add(hivDiag.date, 'HIV');
            p.hbvInfo?.hbsAgTests?.forEach(t => { if (t.result === 'Positive') add(t.date, 'HBV'); });
            p.medicalHistory.forEach(e => { if (e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT) add(e.date, 'TPT'); });
            p.prepInfo?.records?.forEach(r => add(r.dateStart, 'PrEP'));
            p.pepInfo?.records?.forEach(r => add(r.date, 'PEP'));
        });
        return { years: Array.from(yrs).sort((a, b) => b - a), dataByYear: db };
    }, [patients]);

    const { monthlyData, maxCount } = useMemo(() => {
        const currentYearData = dataByYear[selectedYear] || {};
        let max = 0;
        const mData = Array.from({ length: 12 }, (_, i) => {
            const counts = currentYearData[i] || {};
            GENERAL_LABELS.forEach(cat => {
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
                    <div className="relative mt-2 sm:mt-0 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500 whitespace-nowrap">ปี พ.ศ.</span>
                         <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 pr-8 min-w-[100px]">
                            {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
                        </select>
                        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 flex items-center px-2 text-gray-700 mt-3 sm:mt-0"><ChevronDownIcon /></div>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
                {GENERAL_LABELS.map(cat => {
                    const color = GENERAL_COLORS[cat as keyof typeof GENERAL_COLORS];
                    const isActive = visibleCategories.has(cat);
                    return (
                        <button key={cat} onClick={() => toggleCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border shadow-sm flex items-center gap-2 ${isActive ? `text-white border-transparent` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`} style={{ backgroundColor: isActive ? color : undefined, borderColor: isActive ? color : undefined }}>
                             <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-gray-300'}`}></span>{cat}
                        </button>
                    );
                })}
            </div>
            <div className="relative w-full overflow-hidden">
                {hoveredMonth !== null && (
                    <div className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs min-w-[120px] pointer-events-none" style={{ left: `${(hoveredMonth / 11) * 80}%`, top: '10%', transform: hoveredMonth > 8 ? 'translateX(-100%)' : 'translateX(0)' }}>
                        <p className="font-bold text-gray-800 mb-2 border-b pb-1">{THAI_MONTHS[hoveredMonth]} {selectedYear + 543}</p>
                        <ul className="space-y-1">
                            {GENERAL_LABELS.filter(c => visibleCategories.has(c)).map(cat => (
                                <li key={cat} className="flex justify-between items-center"><div className="flex items-center"><span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: GENERAL_COLORS[cat as keyof typeof GENERAL_COLORS] }}></span><span className="text-gray-600">{cat}</span></div><span className="font-bold text-gray-900 ml-2">{monthlyData[hoveredMonth].counts[cat] || 0}</span></li>
                            ))}
                        </ul>
                    </div>
                )}
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto font-sans text-xs">
                {Array.from({ length: 6 }).map((_, i) => {
                    const val = (maxCount / 5) * i;
                    const y = getY(val);
                    return (
                        <g key={i}><line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" /><text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#9ca3af">{Math.round(val)}</text></g>
                    );
                })}
                {THAI_MONTHS.map((m, i) => <text key={m} x={getX(i)} y={svgHeight - 10} textAnchor="middle" fill="#6b7280">{m}</text>)}
                {GENERAL_LABELS.map(cat => visibleCategories.has(cat) && <path key={cat} d={getPath(cat)} fill="none" stroke={GENERAL_COLORS[cat as keyof typeof GENERAL_COLORS]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />)}
                {GENERAL_LABELS.map(cat => visibleCategories.has(cat) && <g key={`dots-${cat}`}>{monthlyData.map((d, i) => d.counts[cat] && <circle key={i} cx={getX(i)} cy={getY(d.counts[cat])} r="3" fill={GENERAL_COLORS[cat as keyof typeof GENERAL_COLORS]} stroke="white" strokeWidth="1" />)}</g>)}
                {monthlyData.map((_, i) => <rect key={`overlay-${i}`} x={getX(i) - (chartWidth / 22)} y={padding.top} width={chartWidth / 11} height={chartHeight} fill="transparent" className="cursor-pointer hover:bg-gray-500 hover:bg-opacity-5 transition-colors" onMouseEnter={() => setHoveredMonth(i)} onMouseLeave={() => setHoveredMonth(null)} />)}
                </svg>
            </div>
         </div>
    );
};

// --- STD Chart Component ---
const StdLineChart: React.FC<{ patients: Patient[] }> = ({ patients }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
    const [visibleDiseases, setVisibleDiseases] = useState<Set<string>>(new Set());

    const { years, dataByYear, allFoundDiseases } = useMemo(() => {
        const yrs = new Set<number>();
        const currentY = new Date().getFullYear();
        yrs.add(currentY);
        yrs.add(2025);
        yrs.add(2026); // Ensure 2569 BE is present

        const db: Record<number, Record<number, Record<string, number>>> = {};
        const diseaseSet = new Set<string>();

        patients.forEach(p => {
            p.stdInfo?.records?.forEach(r => {
                if (!r.date) return;
                const d = new Date(r.date);
                const y = d.getFullYear(), m = d.getMonth();
                if (isNaN(y) || isNaN(m)) return;
                yrs.add(y);
                if (!db[y]) db[y] = {};
                if (!db[y][m]) db[y][m] = {};
                r.diseases.forEach(disease => {
                    let dName = disease;
                    if (SYPHILIS_SUBTYPES.includes(disease)) dName = 'Syphilis';
                    db[y][m][dName] = (db[y][m][dName] || 0) + 1;
                    diseaseSet.add(dName);
                });
            });
        });
        return { 
            years: Array.from(yrs).sort((a, b) => b - a), 
            dataByYear: db,
            allFoundDiseases: Array.from(diseaseSet).sort()
        };
    }, [patients]);

    const { monthlyData } = useMemo(() => {
        const currentYearData = dataByYear[selectedYear] || {};
        const mData = Array.from({ length: 12 }, (_, i) => {
            return { monthIndex: i, details: currentYearData[i] || {} };
        });
        
        // Initial setup: Show all diseases by default if none are hidden yet
        if (visibleDiseases.size === 0 && allFoundDiseases.length > 0) {
            setVisibleDiseases(new Set(allFoundDiseases));
        }

        return { monthlyData: mData };
    }, [selectedYear, dataByYear, allFoundDiseases]);

    const toggleDisease = (d: string) => {
        setVisibleDiseases(prev => {
            const next = new Set(prev);
            if (next.has(d)) next.delete(d);
            else next.add(d);
            return next;
        });
    };

    const maxCount = useMemo(() => {
        let max = 0;
        monthlyData.forEach(m => {
             allFoundDiseases.forEach(d => {
                 if (visibleDiseases.has(d)) {
                    const count = m.details[d] || 0;
                    if (count > max) max = count;
                 }
             });
        });
        return Math.max(max, 4);
    }, [monthlyData, allFoundDiseases, visibleDiseases]);

    const svgHeight = 320;
    const svgWidth = 800;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const getX = (monthIndex: number) => padding.left + (monthIndex * (chartWidth / 11));
    const getY = (count: number) => padding.top + chartHeight - ((count / maxCount) * chartHeight);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">แนวโน้มโรคติดต่อทางเพศสัมพันธ์ (STD Trend)</h3>
                {years.length > 0 && (
                    <div className="relative mt-2 sm:mt-0 flex items-center gap-2">
                         <span className="text-sm font-medium text-gray-500 whitespace-nowrap">ปี พ.ศ.</span>
                         <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 pr-8 min-w-[100px]">
                            {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
                        </select>
                        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 flex items-center px-2 text-gray-700 mt-3 sm:mt-0"><ChevronDownIcon /></div>
                    </div>
                )}
            </div>

            {allFoundDiseases.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {allFoundDiseases.map((d, idx) => {
                        const color = STD_COLORS[idx % STD_COLORS.length];
                        const isActive = visibleDiseases.has(d);
                        return (
                            <button 
                                key={d} 
                                onClick={() => toggleDisease(d)} 
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border shadow-sm flex items-center gap-2 ${isActive ? `text-white border-transparent` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`} 
                                style={{ backgroundColor: isActive ? color : undefined, borderColor: isActive ? color : undefined }}
                            >
                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-gray-300'}`}></span>{d}
                            </button>
                        );
                    })}
                </div>
            )}

            {allFoundDiseases.length === 0 ? <div className="h-64 flex items-center justify-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed">ไม่มีข้อมูล STD ในฐานข้อมูล</div> : (
                <div className="relative overflow-hidden">
                    {hoveredMonth !== null && (
                         <div className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs min-w-[120px] pointer-events-none" style={{ left: `${(hoveredMonth / 11) * 80}%`, top: '10%', transform: hoveredMonth > 8 ? 'translateX(-100%)' : 'translateX(0)' }}>
                             <p className="font-bold text-gray-800 mb-2 border-b pb-1">{THAI_MONTHS[hoveredMonth]} {selectedYear + 543}</p>
                             <ul className="space-y-1">
                                 {allFoundDiseases.filter(d => visibleDiseases.has(d)).map((d, idx) => (
                                     <li key={d} className="flex justify-between items-center">
                                         <div className="flex items-center">
                                             <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: STD_COLORS[allFoundDiseases.indexOf(d) % STD_COLORS.length] }}></span>
                                             <span className="text-gray-600">{d}</span>
                                         </div>
                                         <span className="font-bold text-gray-900 ml-2">{monthlyData[hoveredMonth].details[d] || 0}</span>
                                     </li>
                                 ))}
                             </ul>
                         </div>
                     )}
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto font-sans text-xs">
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
                        {THAI_MONTHS.map((m, i) => <text key={m} x={getX(i)} y={svgHeight - 10} textAnchor="middle" fill="#6b7280">{m}</text>)}
                        {allFoundDiseases.map((disease, idx) => {
                            if (!visibleDiseases.has(disease)) return null;
                            const color = STD_COLORS[idx % STD_COLORS.length];
                            return (
                                <g key={disease}>
                                    <path 
                                        d={monthlyData.map((m, i) => (i === 0 ? 'M' : 'L') + ` ${getX(i)} ${getY(m.details[disease] || 0)}`).join(' ')} 
                                        fill="none" 
                                        stroke={color} 
                                        strokeWidth="2.5" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        className="transition-all duration-500" 
                                    />
                                    {monthlyData.map((m, i) => m.details[disease] > 0 && (
                                        <circle key={i} cx={getX(i)} cy={getY(m.details[disease])} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />
                                    ))}
                                </g>
                            );
                        })}
                        {monthlyData.map((_, i) => <rect key={`overlay-${i}`} x={getX(i) - (chartWidth / 22)} y={padding.top} width={chartWidth / 11} height={chartHeight} fill="transparent" className="cursor-pointer hover:bg-gray-500 hover:bg-opacity-5 transition-colors" onMouseEnter={() => setHoveredMonth(i)} onMouseLeave={() => setHoveredMonth(null)} />)}
                    </svg>
                </div>
            )}
        </div>
    );
};

// --- Patient List View for Reports ---
const PatientGroupList: React.FC<{ title: string; patients: any[]; onBack: () => void; type?: string }> = ({ title, patients, onBack, type }) => (
    <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ChevronLeftIcon />
                </button>
                <h3 className="text-xl font-bold text-gray-800">{title} ({patients.length} ราย)</h3>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4">HN</th>
                        <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                        {type === 'HBV' ? (
                            <>
                                <th className="px-6 py-4">วันตรวจ HBsAg</th>
                                <th className="px-6 py-4 text-center">ผลตรวจ</th>
                            </>
                        ) : type === 'TPT' ? (
                            <>
                                <th className="px-6 py-4">วันเริ่ม TPT</th>
                                <th className="px-6 py-4">สูตรยา</th>
                            </>
                        ) : type === 'STD' ? (
                            <>
                                <th className="px-6 py-4">วันที่วินิจฉัย</th>
                                <th className="px-6 py-4">โรคที่พบ</th>
                            </>
                        ) : type === 'PREP' || type === 'PEP' ? (
                            <>
                                <th className="px-6 py-4">วันที่รับบริการ</th>
                                <th className="px-6 py-4">ประเภท/รายละเอียด</th>
                            </>
                        ) : (
                            <>
                                <th className="px-6 py-4">วันวินิจฉัย HIV</th>
                                <th className="px-6 py-4">วันเริ่มยา ART</th>
                                <th className="px-6 py-4 text-center">ระยะเวลา (วัน)</th>
                                <th className="px-6 py-4">สถานะ OI</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {patients.map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-emerald-700">{p.hn}</td>
                            <td className="px-6 py-4 font-semibold text-gray-800">{p.name}</td>
                            {type === 'HBV' ? (
                                <>
                                    <td className="px-6 py-4 text-gray-600">{formatThaiDateBE(p.date)}</td>
                                    <td className="px-6 py-4 text-center"><span className="px-2 py-1 rounded bg-red-50 text-red-700 font-bold text-xs">{p.result}</span></td>
                                </>
                            ) : type === 'TPT' ? (
                                <>
                                    <td className="px-6 py-4 text-gray-600">{formatThaiDateBE(p.date)}</td>
                                    <td className="px-6 py-4 font-medium text-blue-700">{p.regimen}</td>
                                </>
                            ) : type === 'STD' ? (
                                <>
                                    <td className="px-6 py-4 text-gray-600">{formatThaiDateBE(p.date)}</td>
                                    <td className="px-6 py-4 text-gray-800">{p.diseases?.join(', ')}</td>
                                </>
                            ) : type === 'PREP' || type === 'PEP' ? (
                                <>
                                    <td className="px-6 py-4 text-gray-600">{formatThaiDateBE(p.date)}</td>
                                    <td className="px-6 py-4 font-medium text-indigo-700">{p.detail}</td>
                                </>
                            ) : (
                                <>
                                    <td className="px-6 py-4 text-gray-600">{formatThaiDateBE(p.diagDate)}</td>
                                    <td className="px-6 py-4 text-gray-600">{formatThaiDateBE(p.startDate)}</td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-900 bg-gray-50/50">{p.diffDays}</td>
                                    <td className="px-6 py-4">
                                        {p.hasOi ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">มีประวัติ OI</span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">ไม่มี OI</span>
                                        )}
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
export const Reports: React.FC<ReportsProps> = ({ patients }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeGroup, setActiveGroup] = useState<{ title: string; patients: any[]; type?: string } | null>(null);

    const stats = useMemo(() => {
        const s = {
            totalPatients: patients.length,
            lists: {
                hivNew: [] as any[],
                hbv: [] as any[],
                tpt: [] as any[],
                prep: [] as any[],
                pep: [] as any[],
                std: [] as any[]
            },
            totalHiv: 0,
            hbv: { positive: 0 },
            hcv: { waitForTest: 0, clearedSpontaneously: 0, treating: 0, treatmentFailed: 0, cured: 0, activeHcv: 0, totalPositiveDiagnostic: 0 },
            tpt: 0,
            std: { totalDiagnoses: 0, syphilisBreakdown: {} as Record<string, number> },
            tbBreakdown: {} as Record<string, number>,
            oiBreakdown: {} as Record<string, number>,
            prep: 0,
            pep: 0,
            earlyArt: {
                totalDays: 0,
                validCount: 0,
                groups: {
                    early: [] as any[],
                    lateWithOi: [] as any[],
                    lateTrue: [] as any[], // Late without OIs
                    elsewhere: [] as any[]
                },
                sums: {
                    earlyDays: 0,
                    lateWithOiDays: 0,
                    lateTrueDays: 0
                }
            },
            referredElsewhere: [] as any[]
        };

        const isInRange = (dateStr?: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr).getTime();
            const start = startDate ? new Date(startDate).getTime() : -Infinity;
            const endFinal = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
            return d >= start && d <= endFinal;
        };

        patients.forEach(p => {
            const hivDiagEvent = p.medicalHistory.find(e => e.type === MedicalEventType.DIAGNOSIS);
            const firstArtEvent = [...p.medicalHistory].filter(e => e.type === MedicalEventType.ART_START).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            const hasOiHistory = p.medicalHistory.some(e => e.type === MedicalEventType.OPPORTUNISTIC_INFECTION);

            if (hivDiagEvent && isInRange(hivDiagEvent.date)) {
                s.totalHiv++;
                const pData = { hn: p.hn, name: `${p.firstName} ${p.lastName}`, diagDate: hivDiagEvent.date, startDate: firstArtEvent?.date || '', diffDays: '-', hasOi: hasOiHistory };
                
                // Check if treatment started elsewhere
                if (p.hivTreatmentStartLocation === 'ที่อื่น') {
                    s.earlyArt.groups.elsewhere.push(pData);
                    s.referredElsewhere.push(pData);
                } else {
                    // Treatment at Mahasarakham (or not specified yet, default to Mahasarakham)
                    const isMhs = p.hivTreatmentStartLocation === 'โรงพยาบาลมหาสารคาม' || !p.hivTreatmentStartLocation;

                    if (isMhs && firstArtEvent) {
                        const diagDate = new Date(hivDiagEvent.date), startDateObj = new Date(firstArtEvent.date);
                        const diffTime = startDateObj.getTime() - diagDate.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        pData.diffDays = diffDays.toString();

                        if (diffDays >= 0) {
                            s.earlyArt.totalDays += diffDays;
                            s.earlyArt.validCount++;

                            // Calculate category automatically
                            // 1. Early (MHS): <= 7 days
                            // 2. Late (OIs) (MHS): > 7 days AND had OI before or on ART start date
                            // 3. Late (No OIs) (MHS): > 7 days AND no OI before or on ART start date
                            
                            const hasOiAtInitiation = p.medicalHistory.some(e => 
                                e.type === MedicalEventType.OPPORTUNISTIC_INFECTION && 
                                new Date(e.date).getTime() <= startDateObj.getTime()
                            );

                            if (diffDays <= 7) {
                                s.earlyArt.groups.early.push(pData);
                                s.earlyArt.sums.earlyDays += diffDays;
                            } else if (hasOiAtInitiation) {
                                s.earlyArt.groups.lateWithOi.push(pData);
                                s.earlyArt.sums.lateWithOiDays += diffDays;
                            } else {
                                s.earlyArt.groups.lateTrue.push(pData);
                                s.earlyArt.sums.lateTrueDays += diffDays;
                            }
                        }
                    }
                }
                s.lists.hivNew.push(pData);
            }

            const hbvTestsInRange = p.hbvInfo?.hbsAgTests?.filter(t => t.result === 'Positive' && isInRange(t.date)) || [];
            if (determineHbvStatus(p).text === 'เป็น HBV' && (hbvTestsInRange.length > 0 || (!startDate && !endDate))) {
                s.hbv.positive++;
                const latestTest = [...(p.hbvInfo?.hbsAgTests || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                s.lists.hbv.push({ hn: p.hn, name: `${p.firstName} ${p.lastName}`, date: latestTest?.date || '', result: latestTest?.result || 'Positive' });
            }
            
            const hcvStatus = determineHcvStatus(p);
            let countThisHcv = !startDate && !endDate;
            if (!countThisHcv) {
                const latestTest = [...(p.hcvInfo?.hcvTests || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                if (latestTest && isInRange(latestTest.date)) countThisHcv = true;
            }
            if (countThisHcv && hcvStatus.text !== 'ไม่มีข้อมูล' && hcvStatus.text !== 'ไม่เป็น HCV') {
                s.hcv.totalPositiveDiagnostic++;
                if (hcvStatus.text === 'รอการตรวจเพิ่มเติม') s.hcv.waitForTest++;
                else if (hcvStatus.text === 'เคยเป็น HCV หายเอง') s.hcv.clearedSpontaneously++;
                else if (hcvStatus.text === 'กำลังรักษา HCV') s.hcv.treating++;
                else if (hcvStatus.text === 'เป็น HCV รักษาแล้วไม่หาย') s.hcv.treatmentFailed++;
                else if (hcvStatus.text === 'เคยเป็น HCV รักษาหายแล้ว') s.hcv.cured++;
                else if (hcvStatus.text === 'เป็น HCV') s.hcv.activeHcv++;
            }

            const tptEventsInRange = p.medicalHistory.filter(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT && isInRange(e.date));
            if (tptEventsInRange.length > 0) {
                s.tpt += tptEventsInRange.length;
                tptEventsInRange.forEach(e => {
                    s.lists.tpt.push({ hn: p.hn, name: `${p.firstName} ${p.lastName}`, date: e.date, regimen: e.details['สูตร TPT'] || 'ได้รับ TPT' });
                });
            }

            p.medicalHistory.filter(e => e.type === MedicalEventType.OPPORTUNISTIC_INFECTION && isInRange(e.date)).forEach(e => {
                const infections = e.details.infections || []; if (e.details.โรค) infections.push(e.details.โรค);
                const uniqueInfs = new Set(infections);
                uniqueInfs.forEach((inf: any) => {
                    if (TB_SUBTYPES.includes(inf)) s.tbBreakdown[inf] = (s.tbBreakdown[inf] || 0) + 1;
                    if (TB_SUBTYPES.includes(inf) || inf === 'Tuberculosis') s.oiBreakdown['Tuberculosis'] = (s.oiBreakdown['Tuberculosis'] || 0) + 1;
                    else s.oiBreakdown[inf] = (s.oiBreakdown[inf] || 0) + 1;
                });
            });

            const stdRecordsInRange = p.stdInfo?.records?.filter(rec => isInRange(rec.date)) || [];
            if (stdRecordsInRange.length > 0) {
                stdRecordsInRange.forEach(rec => {
                    s.std.totalDiagnoses += rec.diseases.length;
                    rec.diseases.forEach(d => { if (SYPHILIS_SUBTYPES.includes(d)) s.std.syphilisBreakdown[d] = (s.std.syphilisBreakdown[d] || 0) + 1; });
                    s.lists.std.push({ hn: p.hn, name: `${p.firstName} ${p.lastName}`, date: rec.date, diseases: rec.diseases });
                });
            }

            const prepInRange = p.prepInfo?.records?.filter(r => isInRange(r.dateStart)) || [];
            if (prepInRange.length > 0) {
                s.prep += prepInRange.length;
                prepInRange.forEach(r => s.lists.prep.push({ hn: p.hn, name: `${p.firstName} ${p.lastName}`, date: r.dateStart, detail: 'เริ่มรับ PrEP' }));
            }

            const pepInRange = p.pepInfo?.records?.filter(r => isInRange(r.date)) || [];
            if (pepInRange.length > 0) {
                s.pep += pepInRange.length;
                pepInRange.forEach(r => s.lists.pep.push({ hn: p.hn, name: `${p.firstName} ${p.lastName}`, date: r.date, detail: `ได้รับ PEP (${r.type || 'N/A'})` }));
            }
        });

        return s;
    }, [patients, startDate, endDate]);

    const clearFilter = () => { setStartDate(''); setEndDate(''); setActiveGroup(null); };

    const avg = {
        total: stats.earlyArt.validCount > 0 ? (stats.earlyArt.totalDays / stats.earlyArt.validCount).toFixed(1) : '-',
        early: stats.earlyArt.groups.early.length > 0 ? (stats.earlyArt.sums.earlyDays / stats.earlyArt.groups.early.length).toFixed(1) : '-',
        lateWithOi: stats.earlyArt.groups.lateWithOi.length > 0 ? (stats.earlyArt.sums.lateWithOiDays / stats.earlyArt.groups.lateWithOi.length).toFixed(1) : '-',
        lateTrue: stats.earlyArt.groups.lateTrue.length > 0 ? (stats.earlyArt.sums.lateTrueDays / stats.earlyArt.groups.lateTrue.length).toFixed(1) : '-',
    };

    const adjustedDenominator = stats.earlyArt.groups.early.length + stats.earlyArt.groups.lateTrue.length;
    const achievementRate = adjustedDenominator > 0 ? ((stats.earlyArt.groups.early.length / adjustedDenominator) * 100).toFixed(0) : 0;

    const earlyArtChartData = [
        { label: 'ภายใน 7 วัน (Early)', count: stats.earlyArt.groups.early.length, color: '#10b981', id: 'early' },
        { label: 'เกิน 7 วัน (มี OIs)', count: stats.earlyArt.groups.lateWithOi.length, color: '#f97316', id: 'lateWithOi' },
        { label: 'เกิน 7 วัน (Late จริง)', count: stats.earlyArt.groups.lateTrue.length, color: '#ef4444', id: 'lateTrue' },
        { label: 'เริ่มรักษาที่อื่น (Elsewhere)', count: stats.earlyArt.groups.elsewhere.length, color: '#94a3b8', id: 'elsewhere' },
    ];

    const handleSliceClick = (id: string) => {
        let groupTitle = "";
        let patientsList = [];
        if (id === 'early') { groupTitle = "กลุ่มเริ่มยา ART ภายใน 7 วัน (Early)"; patientsList = stats.earlyArt.groups.early; }
        else if (id === 'lateWithOi') { groupTitle = "กลุ่มเริ่มยา ART เกิน 7 วัน (เนื่องจากพบ OIs)"; patientsList = stats.earlyArt.groups.lateWithOi; }
        else if (id === 'lateTrue') { groupTitle = "กลุ่มเริ่มยา ART เกิน 7 วัน (Late จริง/ไม่มี OIs)"; patientsList = stats.earlyArt.groups.lateTrue; }
        else if (id === 'elsewhere') { groupTitle = "กลุ่มที่เริ่มการรักษาที่อื่น"; patientsList = stats.earlyArt.groups.elsewhere; }
        setActiveGroup({ title: groupTitle, patients: patientsList });
    };

    const handleCardClick = (type: string, title: string, list: any[]) => {
        setActiveGroup({ title, patients: list, type });
    };

    if (activeGroup) return <div className="p-6 md:p-8"><PatientGroupList title={activeGroup.title} patients={activeGroup.patients} type={activeGroup.type} onBack={() => setActiveGroup(null)} /></div>;

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">รายงานสรุป (Clinic Reports)</h1>
                    <p className="text-gray-500">{startDate || endDate ? `ข้อมูลวินิจฉัยระหว่างวันที่ ${startDate || '...'} ถึง ${endDate || '...'}` : 'ข้อมูลทั้งหมด (Cumulative)'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
                     <div className="flex flex-row gap-2 items-end">
                        <div className="flex-1 min-w-0"><label className="block text-xs font-medium text-gray-500 mb-1 truncate">จากวันวินิจฉัย</label><DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                        <div className="flex-1 min-w-0"><label className="block text-xs font-medium text-gray-500 mb-1 truncate">ถึงวันวินิจฉัย</label><DateInput value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                        {(startDate || endDate) && <button onClick={clearFilter} className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 h-[38px]">ล้าง</button>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card title="ผู้ป่วย HIV ใหม่" value={stats.totalHiv} onClick={() => handleCardClick('HIV_NEW', 'รายชื่อผู้ป่วย HIV ใหม่', stats.lists.hivNew)} className="bg-blue-50 border-blue-100 text-blue-900" />
                <Card title="ตรวจพบ HBV" value={stats.hbv.positive} onClick={() => handleCardClick('HBV', 'รายชื่อผู้ป่วยตรวจพบ HBV', stats.lists.hbv)} className="bg-emerald-50 border-emerald-100 text-emerald-900" />
                <Card title="ได้รับ TPT" value={stats.tpt} onClick={() => handleCardClick('TPT', 'รายชื่อผู้ป่วยได้รับ TPT', stats.lists.tpt)} className="bg-orange-50 border-orange-100 text-orange-900" />
                <Card title="เริ่ม PrEP" value={stats.prep} onClick={() => handleCardClick('PREP', 'รายชื่อผู้ป่วยเริ่ม PrEP', stats.lists.prep)} className="bg-indigo-50 border-indigo-100 text-indigo-900" />
                <Card title="ได้รับ PEP" value={stats.pep} onClick={() => handleCardClick('PEP', 'รายชื่อผู้ป่วยได้รับ PEP', stats.lists.pep)} className="bg-purple-50 border-purple-100 text-purple-900" />
                <Card title="วินิจฉัย STD" value={stats.std.totalDiagnoses} onClick={() => handleCardClick('STD', 'รายชื่อการวินิจฉัย STD', stats.lists.std)} className="bg-pink-50 border-pink-100 text-pink-900" />
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">การเริ่มยาต้านไวรัส (Early ART Analysis)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-center items-center text-center">
                        <p className="text-xs uppercase tracking-widest opacity-60">เฉลี่ยรวมทั้งหมด</p>
                        <p className="text-5xl font-bold mt-2">{avg.total}</p>
                        <p className="text-sm mt-1 opacity-70">วัน</p>
                    </div>
                    <div onClick={() => handleSliceClick('early')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-emerald-50 transition-colors">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">เฉลี่ยกลุ่ม Early</p>
                        <p className="text-4xl font-bold text-gray-800 mt-2">{avg.early}</p>
                        <p className="text-sm text-gray-400 mt-1">วัน (≤ 7 วัน)</p>
                    </div>
                    <div onClick={() => handleSliceClick('lateWithOi')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-orange-50 transition-colors">
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">เฉลี่ยกลุ่ม Late (มี OIs)</p>
                        <p className="text-4xl font-bold text-gray-800 mt-2">{avg.lateWithOi}</p>
                        <p className="text-sm text-gray-400 mt-1">วัน (ความล่าช้าจากอาการ)</p>
                    </div>
                    <div onClick={() => handleSliceClick('lateTrue')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-red-50 transition-colors">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-widest">เฉลี่ยกลุ่ม Late จริง</p>
                        <p className="text-4xl font-bold text-gray-800 mt-2">{avg.lateTrue}</p>
                        <p className="text-sm text-gray-400 mt-1">วัน (ไม่มี OIs)</p>
                    </div>
                    <div onClick={() => handleSliceClick('elsewhere')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-slate-50 transition-colors">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">เริ่มรักษาที่อื่น</p>
                        <p className="text-4xl font-bold text-gray-800 mt-2">{stats.referredElsewhere.length}</p>
                        <p className="text-sm text-gray-400 mt-1">ราย (Elsewhere)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-between">
                            <span>สัดส่วนระยะเวลาเริ่มยา (Early vs Late)</span>
                            <span className="text-xs font-normal text-gray-400 italic">คลิกที่กราฟเพื่อดูรายชื่อ</span>
                        </h3>
                        < DonutChart data={earlyArtChartData} onSliceClick={handleSliceClick} />
                     </div>
                     <div className="bg-emerald-600 text-white p-8 rounded-2xl shadow-lg flex flex-col items-start justify-between">
                        <div>
                             <h3 className="text-xl font-bold">Performance Goal</h3>
                             <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
                                วัดประสิทธิภาพการเริ่มยาต้านไวรัสโดยเปรียบเทียบสัดส่วนระหว่างกลุ่ม Early กับกลุ่ม Late จริง 
                                <br/><span className="text-xs font-bold opacity-80 underline">(ไม่นับรวมกลุ่มที่มี OIs)</span>
                             </p>
                        </div>
                        <div className="w-full mt-8">
                            <div className="flex justify-between text-xs font-bold mb-2"><span>ACHIEVEMENT RATE (Adjusted)</span><span>{achievementRate}%</span></div>
                            <div className="w-full bg-emerald-700/50 rounded-full h-3"><div className="bg-white h-3 rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${achievementRate}%` }}></div></div>
                            <p className="text-[10px] mt-4 opacity-70 italic font-medium">* Achievement = Early / (Early + Late จริง)</p>
                        </div>
                     </div>
                </div>
            </div>

            <GeneralTrendChart patients={patients} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b"><span>สรุปสถานการณ์ HCV</span></h3><DonutChart data={[{ label: 'รอตรวจเพิ่ม', count: stats.hcv.waitForTest, color: '#fbbf24' }, { label: 'หายเอง', count: stats.hcv.clearedSpontaneously, color: '#34d399' }, { label: 'กำลังรักษา', count: stats.hcv.treating, color: '#3b82f6' }, { label: 'รักษาไม่หาย', count: stats.hcv.treatmentFailed, color: '#ef4444' }, { label: 'หายแล้ว', count: stats.hcv.cured, color: '#059669' }, { label: 'Active (ไม่รักษา)', count: stats.hcv.activeHcv, color: '#f87171' }].filter(d => d.count > 0)} /></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b"><span>สรุปสถานการณ์ Syphilis</span></h3><DonutChart data={Object.entries(stats.std.syphilisBreakdown).map(([label, count], index) => ({ label, count: count as number, color: STD_COLORS[index % STD_COLORS.length] })).filter(d => d.count > 0)} /></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b"><span>สรุปการติดเชื้อฉวยโอกาส (OI)</span></h3><DonutChart data={Object.entries(stats.oiBreakdown).map(([label, count], index) => ({ label, count: count as number, color: STD_COLORS[(index + 5) % STD_COLORS.length] })).filter(d => d.count > 0)} /></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b"><span>รายละเอียดประเภทวัณโรค (TB)</span></h3><DonutChart data={Object.entries(stats.tbBreakdown).map(([label, count], index) => ({ label, count: count as number, color: STD_COLORS[(index + 3) % STD_COLORS.length] })).filter(d => d.count > 0)} /></div>
            </div>

            <StdLineChart patients={patients} />
        </div>
    );
};
