
import React, { useMemo } from 'react';
import { Patient, MedicalEventType } from '../types';
import { determineHbvStatus, determineHcvStatus } from './utils';

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

    const slices = data.map((item) => {
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

export const Reports: React.FC<ReportsProps> = ({ patients }) => {
    // Basic stats calculation
    const stats = useMemo(() => {
        const result = {
            total: patients.length,
            active: 0,
            hbv: 0,
            hcv: 0,
            tpt: 0,
            prep: 0,
            pep: 0,
            std: 0,
            gender: { male: 0, female: 0, other: 0 },
            scheme: {} as Record<string, number>
        };

        patients.forEach(p => {
             // Active status (simplified check, real logic might be more complex)
             if (p.status === 'Active' || p.status === 'Restart') result.active++;

             // Gender
             if (p.sex === 'ชาย') result.gender.male++;
             else if (p.sex === 'หญิง') result.gender.female++;
             else result.gender.other++;

             // Scheme
             const scheme = p.healthcareScheme || 'Unspecified';
             result.scheme[scheme] = (result.scheme[scheme] || 0) + 1;

             // Comorbidities / Programs
             if (determineHbvStatus(p).text === 'เป็น HBV') result.hbv++;
             const hcvText = determineHcvStatus(p).text;
             if (hcvText !== 'ไม่เป็น HCV' && hcvText !== 'ไม่มีข้อมูล') result.hcv++;
             
             if (p.medicalHistory.some(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT)) result.tpt++;
             if (p.prepInfo?.records && p.prepInfo.records.length > 0) result.prep++;
             if (p.pepInfo?.records && p.pepInfo.records.length > 0) result.pep++;
             if (p.stdInfo?.records && p.stdInfo.records.length > 0) result.std++;
        });

        return result;
    }, [patients]);

    const genderData = [
        { label: 'ชาย', count: stats.gender.male, color: '#3b82f6' }, // blue-500
        { label: 'หญิง', count: stats.gender.female, color: '#ec4899' }, // pink-500
        { label: 'อื่นๆ', count: stats.gender.other, color: '#9ca3af' }, // gray-400
    ];

    const schemeData = Object.entries(stats.scheme)
        .map(([label, count], idx) => ({
            label, 
            count, 
            color: ['#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'][idx % 5]
        }))
        .sort((a, b) => b.count - a.count); // sort by count desc

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">รายงานสรุป (Reports)</h1>
                <p className="text-gray-500">สรุปข้อมูลเชิงสถิติของผู้ป่วยในคลินิก</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <Card title="ผู้ป่วยทั้งหมด" value={stats.total} className="bg-white border-l-4 border-l-gray-800" />
                 <Card title="กำลังรักษา (Active)" value={stats.active} className="bg-white border-l-4 border-l-emerald-500" />
                 <Card title="รับบริการ PrEP" value={stats.prep} className="bg-white border-l-4 border-l-indigo-500" />
                 <Card title="รับบริการ PEP" value={stats.pep} className="bg-white border-l-4 border-l-purple-500" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <Card title="ติดเชื้อ HBV" value={stats.hbv} subtitle="Co-infection" className="bg-emerald-50 border-emerald-100" />
                 <Card title="ติดเชื้อ HCV" value={stats.hcv} subtitle="Co-infection" className="bg-orange-50 border-orange-100" />
                 <Card title="ได้รับ TPT" value={stats.tpt} subtitle="Prevention" className="bg-amber-50 border-amber-100" />
                 <Card title="ประวัติ STD" value={stats.std} subtitle="History" className="bg-rose-50 border-rose-100" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gender Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">สัดส่วนเพศ</h3>
                    <DonutChart data={genderData} />
                </div>

                {/* Healthcare Scheme Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">สิทธิการรักษา</h3>
                    <DonutChart data={schemeData} />
                </div>
            </div>
        </div>
    );
};
