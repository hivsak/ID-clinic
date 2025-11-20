
import React, { useMemo, useState } from 'react';
import { Patient, MedicalEventType } from '../types';
import { determineHbvStatus, determineHcvStatus } from './utils';
import { SearchIcon } from './icons';

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

const BarChartRow: React.FC<{ label: string; count: number; total: number; colorClass: string }> = ({ label, count, total, colorClass }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="mb-3">
            <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

export const Reports: React.FC<ReportsProps> = ({ patients }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const stats = useMemo(() => {
        const s = {
            totalPatients: patients.length, // Total count (filtered or unfiltered base on context, here usually usually context population)
            totalHiv: 0,
            hbv: {
                positive: 0,
            },
            hcv: {
                waitForTest: 0, // รอการตรวจเพิ่มเติม
                clearedSpontaneously: 0, // เคยเป็น HCV หายเอง
                treating: 0, // กำลังรักษา HCV
                treatmentFailed: 0, // เป็น HCV รักษาแล้วไม่หาย
                cured: 0, // เคยเป็น HCV รักษาหายแล้ว
                activeHcv: 0, // เป็น HCV (General category for high VL but no treatment history)
                totalPositiveDiagnostic: 0
            },
            tpt: 0,
            std: {
                totalDiagnoses: 0,
                breakdown: {} as Record<string, number>
            },
            prep: 0,
            pep: 0
        };

        // Helper to check date range
        const isInRange = (dateStr?: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr).getTime();
            const start = startDate ? new Date(startDate).getTime() : -Infinity;
            const end = endDate ? new Date(endDate).getTime() : Infinity;
            
            // Normalize end date to end of day if manually selected
            const endFinal = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

            return d >= start && d <= endFinal;
        };

        patients.forEach(p => {
            // 0. HIV Diagnosis Check (Based on Diagnosis Date)
            const hivDiagEvent = p.medicalHistory.find(e => e.type === MedicalEventType.DIAGNOSIS);
            if (hivDiagEvent) {
                 if (isInRange(hivDiagEvent.date)) {
                     s.totalHiv++;
                 }
            }

            // 1. HBV (Based on Positive Result Date)
            // To be accurate with the "Range", we look for a Positive Test Result within the range.
            // If we rely on status logic, we need to check if the defining test matches range.
            const hbvStatus = determineHbvStatus(p);
            if (hbvStatus.text === 'เป็น HBV') {
                // Find the positive test that defines this
                const positiveTestInRange = p.hbvInfo?.hbsAgTests?.some(t => t.result === 'Positive' && isInRange(t.date));
                if (positiveTestInRange || (!startDate && !endDate)) {
                     s.hbv.positive++;
                } else if (startDate || endDate) {
                    // Edge case: User selected range, patient is HBV+, but test was outside range. 
                    // Depending on report requirement: "Active HBV patients" vs "New HBV cases".
                    // Based on other metrics like PEP/STD, this looks like an "Activity Report" (New Cases).
                    // So we strictly filter by test date.
                }
            }

            // 2. HCV Breakdown
            const hcvStatus = determineHcvStatus(p);
            const hcvInfo = p.hcvInfo || { hcvTests: [] };
            
            // Helper to find defining event dates
            const latestAntiHcv = [...(hcvInfo.hcvTests || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const latestPreVl = [...(hcvInfo.preTreatmentVls || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const latestPostVl = [...(hcvInfo.postTreatmentVls || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const latestTreatment = [...(hcvInfo.treatments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            let countThisHcv = false;

            // Determine if the status event falls in range
            switch (hcvStatus.text) {
                case 'รอการตรวจเพิ่มเติม': 
                    // Based on Anti-HCV+ date
                    if (latestAntiHcv && isInRange(latestAntiHcv.date)) countThisHcv = true;
                    break;
                case 'เคยเป็น HCV หายเอง': 
                    // Based on Pre-Treatment VL date (undetected/low)
                    if (latestPreVl && isInRange(latestPreVl.date)) countThisHcv = true;
                    break;
                case 'กำลังรักษา HCV': 
                    // Based on Treatment Start Date
                    if (latestTreatment && isInRange(latestTreatment.date)) countThisHcv = true;
                    break;
                case 'เป็น HCV รักษาแล้วไม่หาย': 
                case 'เคยเป็น HCV รักษาหายแล้ว': 
                    // Based on Post-Treatment VL Date
                    if (latestPostVl && isInRange(latestPostVl.date)) countThisHcv = true;
                    break;
                case 'เป็น HCV': 
                    // Based on Pre-Treatment VL Date (High)
                    if (latestPreVl && isInRange(latestPreVl.date)) countThisHcv = true;
                    break;
            }

            // If no dates selected, count everyone based on current status
            if (!startDate && !endDate) countThisHcv = true;

            if (countThisHcv) {
                if (hcvStatus.text !== 'ไม่เป็น HCV' && hcvStatus.text !== 'ไม่มีข้อมูล') {
                    s.hcv.totalPositiveDiagnostic++; 
                }
                switch (hcvStatus.text) {
                    case 'รอการตรวจเพิ่มเติม': s.hcv.waitForTest++; break;
                    case 'เคยเป็น HCV หายเอง': s.hcv.clearedSpontaneously++; break;
                    case 'กำลังรักษา HCV': s.hcv.treating++; break;
                    case 'เป็น HCV รักษาแล้วไม่หาย': s.hcv.treatmentFailed++; break;
                    case 'เคยเป็น HCV รักษาหายแล้ว': s.hcv.cured++; break;
                    case 'เป็น HCV': s.hcv.activeHcv++; break;
                }
            }

            // 3. TPT (Based on Event Date)
            const tptEvents = p.medicalHistory.filter(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT && isInRange(e.date));
            if (tptEvents.length > 0) s.tpt++;

            // 4. STD (Based on Record Date)
            if (p.stdInfo?.records) {
                p.stdInfo.records.forEach(rec => {
                    if (isInRange(rec.date)) {
                        rec.diseases.forEach(d => {
                            s.std.totalDiagnoses++;
                            s.std.breakdown[d] = (s.std.breakdown[d] || 0) + 1;
                        });
                    }
                });
            }

            // 5. PrEP (New Initiations in Range)
            // Count if they have any PrEP record starting in range
            const prepStarts = p.prepInfo?.records?.filter(r => isInRange(r.dateStart));
            if (prepStarts && prepStarts.length > 0) {
                s.prep++;
            }

            // 6. PEP (Received in Range)
            const pepRecords = p.pepInfo?.records?.filter(r => isInRange(r.date));
            if (pepRecords && pepRecords.length > 0) {
                s.pep++;
            }
        });

        return s;
    }, [patients, startDate, endDate]);

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
                
                {/* Date Filter Controls */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-end md:items-center gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">ตั้งแต่วันที่</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="block w-full md:w-40 px-2 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">ถึงวันที่</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="block w-full md:w-40 px-2 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(startDate || endDate) && (
                            <button 
                                onClick={clearFilter}
                                className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
                            >
                                ล้างตัวกรอง
                            </button>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* HCV Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b flex justify-between">
                        <span>สรุปสถานการณ์ HCV</span>
                        <span className="text-xs font-normal text-gray-500 self-end">อิงตามวันที่เกิดผล/การรักษา</span>
                    </h3>
                    <div className="space-y-4">
                        <BarChartRow label="รอการตรวจเพิ่มเติม (Anti-HCV+)" count={stats.hcv.waitForTest} total={stats.totalPatients} colorClass="bg-amber-400" />
                        <BarChartRow label="เคยเป็น HCV หายเอง" count={stats.hcv.clearedSpontaneously} total={stats.totalPatients} colorClass="bg-emerald-400" />
                        <BarChartRow label="กำลังรักษา HCV (เริ่มยา)" count={stats.hcv.treating} total={stats.totalPatients} colorClass="bg-blue-500" />
                        <BarChartRow label="เป็น HCV รักษาแล้วไม่หาย" count={stats.hcv.treatmentFailed} total={stats.totalPatients} colorClass="bg-red-500" />
                        <BarChartRow label="เคยเป็น HCV รักษาหายแล้ว" count={stats.hcv.cured} total={stats.totalPatients} colorClass="bg-emerald-600" />
                        <BarChartRow label="เป็น HCV (ยังไม่เริ่มรักษา)" count={stats.hcv.activeHcv} total={stats.totalPatients} colorClass="bg-red-400" />
                    </div>
                    {/* Note: Total patients usage in percentage might be skewed if filtering by date, but kept for relative visualization */}
                </div>

                {/* STD Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b">สถิติโรคติดต่อทางเพศสัมพันธ์ (STD)</h3>
                    
                    {Object.keys(stats.std.breakdown).length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {Object.entries(stats.std.breakdown)
                                .sort(([, a], [, b]) => (b as number) - (a as number)) // Sort by count descending
                                .map(([disease, count]) => (
                                    <div key={disease} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="font-medium text-gray-700">{disease}</span>
                                        <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-bold">{count}</span>
                                    </div>
                                ))
                            }
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <p>ไม่มีข้อมูลการวินิจฉัย STD ในช่วงเวลานี้</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
