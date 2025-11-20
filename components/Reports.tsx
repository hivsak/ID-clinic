
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
    const stats = useMemo(() => {
        const s = {
            totalPatients: patients.length,
            hbv: {
                positive: 0,
                // Breakdown if needed, but request just asked for "Total HBV (Summary: เป็น HBV)"
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

        patients.forEach(p => {
            // 1. HBV
            const hbvStatus = determineHbvStatus(p);
            if (hbvStatus.text === 'เป็น HBV') {
                s.hbv.positive++;
            }

            // 2. HCV
            const hcvStatus = determineHcvStatus(p);
            if (hcvStatus.text !== 'ไม่เป็น HCV' && hcvStatus.text !== 'ไม่มีข้อมูล') {
                s.hcv.totalPositiveDiagnostic++; // Rough count of relevant cases
            }
            
            switch (hcvStatus.text) {
                case 'รอการตรวจเพิ่มเติม': s.hcv.waitForTest++; break;
                case 'เคยเป็น HCV หายเอง': s.hcv.clearedSpontaneously++; break;
                case 'กำลังรักษา HCV': s.hcv.treating++; break;
                case 'เป็น HCV รักษาแล้วไม่หาย': s.hcv.treatmentFailed++; break;
                case 'เคยเป็น HCV รักษาหายแล้ว': s.hcv.cured++; break;
                case 'เป็น HCV': s.hcv.activeHcv++; break; // Catches high VL no treatment
            }

            // 3. TPT
            // Check if patient has any TPT event
            const hasTpt = p.medicalHistory.some(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT);
            if (hasTpt) s.tpt++;

            // 4. STD
            if (p.stdInfo?.records) {
                p.stdInfo.records.forEach(rec => {
                    rec.diseases.forEach(d => {
                        s.std.totalDiagnoses++;
                        s.std.breakdown[d] = (s.std.breakdown[d] || 0) + 1;
                    });
                });
            }

            // 5. PrEP
            // Count if they have any PrEP record
            if (p.prepInfo?.records && p.prepInfo.records.length > 0) {
                s.prep++;
            }

            // 6. PEP
            if (p.pepInfo?.records && p.pepInfo.records.length > 0) {
                s.pep++;
            }
        });

        return s;
    }, [patients]);

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">รายงานสรุป (Clinic Reports)</h1>
                <p className="text-gray-500">ข้อมูลสถิติและตัวชี้วัดสำคัญ</p>
            </div>

            {/* Top Level Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card title="ผู้ป่วย HIV ทั้งหมด" value={stats.totalPatients} className="bg-blue-50 border-blue-100 text-blue-900" />
                <Card title="ผู้ป่วย HBV" value={stats.hbv.positive} subtitle="(สรุปผล: เป็น HBV)" className="bg-emerald-50 border-emerald-100 text-emerald-900" />
                <Card title="ได้รับ TPT" value={stats.tpt} className="bg-orange-50 border-orange-100 text-orange-900" />
                <Card title="ผู้รับ PrEP" value={stats.prep} className="bg-indigo-50 border-indigo-100 text-indigo-900" />
                <Card title="ผู้รับ PEP" value={stats.pep} className="bg-purple-50 border-purple-100 text-purple-900" />
                <Card title="วินิจฉัย STD" value={stats.std.totalDiagnoses} subtitle="(จำนวนครั้ง)" className="bg-pink-50 border-pink-100 text-pink-900" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* HCV Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b">สรุปสถานการณ์ HCV</h3>
                    <div className="space-y-4">
                        <BarChartRow label="รอการตรวจเพิ่มเติม" count={stats.hcv.waitForTest} total={stats.totalPatients} colorClass="bg-amber-400" />
                        <BarChartRow label="เคยเป็น HCV หายเอง" count={stats.hcv.clearedSpontaneously} total={stats.totalPatients} colorClass="bg-emerald-400" />
                        <BarChartRow label="กำลังรักษา HCV" count={stats.hcv.treating} total={stats.totalPatients} colorClass="bg-blue-500" />
                        <BarChartRow label="เป็น HCV รักษาแล้วไม่หาย" count={stats.hcv.treatmentFailed} total={stats.totalPatients} colorClass="bg-red-500" />
                        <BarChartRow label="เคยเป็น HCV รักษาหายแล้ว" count={stats.hcv.cured} total={stats.totalPatients} colorClass="bg-emerald-600" />
                        <BarChartRow label="เป็น HCV (ยังไม่เริ่มรักษา)" count={stats.hcv.activeHcv} total={stats.totalPatients} colorClass="bg-red-400" />
                    </div>
                    <p className="text-xs text-gray-400 mt-4 text-right">* Percentage calculated against total patient population</p>
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
                            <p>ยังไม่มีข้อมูลการวินิจฉัย STD</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
