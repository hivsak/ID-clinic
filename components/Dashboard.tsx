
import React, { useState, useMemo } from 'react';
import { Patient, PatientStatus, MedicalEventType } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell 
} from 'recharts';
import { determineHcvStatus } from './utils';
import { HivIcon, TptIcon, PregnancyIcon, HbvHcvIcon, StdIcon, PrepPepIcon } from './icons';

interface DashboardProps {
    patients: Patient[];
}

type DateRange = 'TODAY' | 'MONTH' | 'YEAR' | 'CUSTOM';

export const Dashboard: React.FC<DashboardProps> = ({ patients }) => {
    const [dateRange, setDateRange] = useState<DateRange>('MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // --- Filter Logic ---
    const isDateInRange = (dateStr: string | undefined) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (dateRange === 'TODAY') {
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            return date >= start && date <= end;
        } else if (dateRange === 'MONTH') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return date >= start && date <= end;
        } else if (dateRange === 'YEAR') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            return date >= start && date <= end;
        } else if (dateRange === 'CUSTOM') {
            if (!customStart || !customEnd) return true; // Show all if invalid range? Or none? Let's show all or current.
            start = new Date(customStart);
            end = new Date(customEnd);
            end.setHours(23,59,59,999);
            return date >= start && date <= end;
        }
        return true;
    };

    // --- Statistics Calculations ---
    const stats = useMemo(() => {
        // 1. HIV Total & LTFU (Snapshot - usually doesn't filter by event date, but by current status)
        // However, for "New Registrations" we could use date filter. 
        // Prompt says "Number of HIV patients" within a period usually means ACTIVE caseload, or NEW cases.
        // Let's stick to TOTAL Snapshot for "Total Patients" to avoid confusion, 
        // but apply date filters to EVENTS (Service delivery).
        
        const totalHiv = patients.length;
        const ltfuHiv = patients.filter(p => p.status === PatientStatus.LTFU).length;
        
        // 2. TPT (Filter by Prophylaxis Date)
        const tptPatients = patients.filter(p => 
            p.medicalHistory.some(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT && isDateInRange(e.date))
        ).length;

        // 3. Pregnancy (Snapshot of currently active, OR new pregnancies in range? Let's do Active Pregnancies overlapping range)
        // Simplified: Patients with pregnancy record where GA Date is in range OR currently pregnant
        const pregnantPatients = patients.filter(p => 
            p.pregnancies?.some(preg => !preg.endDate || isDateInRange(preg.gaDate))
        ).length;

        // 4. HBV (Diagnosed - HBsAg Positive Date? Or just Status?)
        // Let's count patients who have a Positive HBsAg record in the date range
        const hbvDiagnosed = patients.filter(p => 
            p.hbvInfo?.hbsAgTests?.some(t => t.result === 'Positive' && isDateInRange(t.date))
        ).length;

        // 5. HCV Status Breakdown (Snapshot based on current logic, filtered by "Diagnosed Date" might be tricky)
        // We will categorize ALL patients based on their CURRENT HCV status. 
        // If we strictly filter by date, we look for tests in that date.
        // For the Chart, let's show the CURRENT STATUS distribution of the entire cohort (Snapshot).
        // It's more useful than "Patients who turned Cured this month" which is hard to track without event logs.
        const hcvStats = {
            waiting: 0,
            cleared: 0,
            cured: 0,
            failed: 0,
            treatment: 0,
            negative: 0,
            unknown: 0
        };

        patients.forEach(p => {
            // If we want to filter by range, we might check if they had an HCV test in range? 
            // But Status is a lifecycle property. Let's stick to Cohort Snapshot for Status.
            const status = determineHcvStatus(p.hcvInfo || { hcvTests: [] });
            switch (status.text) {
                case 'รอการตรวจเพิ่มเติม': hcvStats.waiting++; break;
                case 'เคยเป็น HCV หายเอง': hcvStats.cleared++; break;
                case 'เคยเป็น HCV รักษาหายแล้ว': hcvStats.cured++; break;
                case 'เป็น HCV รักษาแล้วไม่หาย': hcvStats.failed++; break;
                case 'เป็น HCV': hcvStats.waiting++; break; // Treat 'Being HCV' without treatment as waiting/active
                case 'กำลังรักษา HCV': hcvStats.treatment++; break;
                case 'ไม่เป็น HCV': hcvStats.negative++; break;
                default: hcvStats.unknown++;
            }
        });

        // 6. PrEP (Visits vs Persons) - Filtered by Date
        let prepVisits = 0;
        const prepPersons = new Set<number>();
        patients.forEach(p => {
            const validRecords = p.prepInfo?.records.filter(r => isDateInRange(r.dateStart));
            if (validRecords && validRecords.length > 0) {
                prepVisits += validRecords.length;
                prepPersons.add(p.id);
            }
        });

        // 7. PEP (oPEP vs nPEP) - Filtered by Date
        let opepCount = 0;
        let npepCount = 0;
        patients.forEach(p => {
            const validRecords = p.pepInfo?.records.filter(r => isDateInRange(r.date));
            validRecords?.forEach(r => {
                if (r.type === 'oPEP') opepCount++;
                else npepCount++;
            });
        });

        // 8. STD (Visits vs Persons) - Filtered by Date
        let stdVisits = 0;
        const stdPersons = new Set<number>();
        patients.forEach(p => {
            const validRecords = p.stdInfo?.records.filter(r => isDateInRange(r.date));
            if (validRecords && validRecords.length > 0) {
                stdVisits += validRecords.length;
                stdPersons.add(p.id);
            }
        });

        return {
            totalHiv,
            ltfuHiv,
            tptPatients,
            pregnantPatients,
            hbvDiagnosed,
            hcvStats,
            prep: { visits: prepVisits, persons: prepPersons.size },
            pep: { opep: opepCount, npep: npepCount },
            std: { visits: stdVisits, persons: stdPersons.size }
        };

    }, [patients, dateRange, customStart, customEnd]);

    // --- Chart Data Preparation ---
    const hcvChartData = [
        { name: 'รอตรวจ/Active', value: stats.hcvStats.waiting + stats.hcvStats.unknown }, // Group unknown into waiting for visualization
        { name: 'หายเอง', value: stats.hcvStats.cleared },
        { name: 'รักษาหาย', value: stats.hcvStats.cured },
        { name: 'รักษาไม่หาย', value: stats.hcvStats.failed },
        { name: 'กำลังรักษา', value: stats.hcvStats.treatment },
    ].filter(d => d.value > 0);
    
    const HCV_COLORS = ['#F59E0B', '#10B981', '#059669', '#EF4444', '#3B82F6'];

    const pepChartData = [
        { name: 'oPEP', value: stats.pep.opep },
        { name: 'nPEP', value: stats.pep.npep },
    ].filter(d => d.value > 0);
    const PEP_COLORS = ['#F97316', '#6366F1'];

    const serviceChartData = [
        { name: 'PrEP', Visits: stats.prep.visits, Persons: stats.prep.persons },
        { name: 'STD', Visits: stats.std.visits, Persons: stats.std.persons },
    ];

    const KPICard = ({ title, value, subtext, icon, colorClass }: any) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-full ${colorClass}`}>
                {icon}
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard ภาพรวม</h1>
                    <p className="text-sm text-gray-500">สถิติและข้อมูลสรุปการให้บริการ</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border">
                    {['TODAY', 'MONTH', 'YEAR'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setDateRange(r as DateRange)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                dateRange === r ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {r === 'TODAY' ? 'วันนี้' : r === 'MONTH' ? 'เดือนนี้' : 'ปีนี้'}
                        </button>
                    ))}
                     <button
                            onClick={() => setDateRange('CUSTOM')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                dateRange === 'CUSTOM' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            กำหนดเอง
                    </button>
                </div>
            </div>

            {dateRange === 'CUSTOM' && (
                <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-lg border">
                    <span className="text-sm font-medium text-gray-700">เลือกช่วงเวลา:</span>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border rounded-md px-3 py-1 text-sm"/>
                    <span>-</span>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border rounded-md px-3 py-1 text-sm"/>
                </div>
            )}

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard 
                    title="ผู้ป่วย HIV ทั้งหมด" 
                    value={stats.totalHiv} 
                    subtext={`ขาดนัด (LTFU): ${stats.ltfuHiv}`}
                    icon={<HivIcon className="h-6 w-6 text-emerald-600"/>}
                    colorClass="bg-emerald-100"
                />
                <KPICard 
                    title="ได้รับ TPT" 
                    value={stats.tptPatients} 
                    subtext="ในช่วงเวลาที่เลือก"
                    icon={<TptIcon className="h-6 w-6 text-orange-600"/>}
                    colorClass="bg-orange-100"
                />
                <KPICard 
                    title="ตั้งครรภ์ (Active)" 
                    value={stats.pregnantPatients} 
                    subtext="มารดา HIV"
                    icon={<PregnancyIcon className="h-6 w-6 text-pink-600"/>}
                    colorClass="bg-pink-100"
                />
                <KPICard 
                    title="วินิจฉัย HBV" 
                    value={stats.hbvDiagnosed} 
                    subtext="ผล HBsAg Positive"
                    icon={<HbvHcvIcon className="h-6 w-6 text-blue-600"/>}
                    colorClass="bg-blue-100"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* HCV Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">สถานะผู้ป่วย HCV (Cohort)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={hcvChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {hcvChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={HCV_COLORS[index % HCV_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* PrEP & STD Statistics */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">สถิติการให้บริการ PrEP และ STD</h3>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={serviceChartData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Legend />
                                <Bar dataKey="Visits" name="จำนวนครั้ง (Visits)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                                <Bar dataKey="Persons" name="จำนวนคน (Persons)" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* Bottom Row: PEP Breakdown */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">สัดส่วนผู้รับบริการ PEP</h3>
                        <PrepPepIcon className="text-gray-400" />
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                         <div className="h-48 w-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pepChartData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {pepChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PEP_COLORS[index % PEP_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                oPEP: <span className="font-bold">{stats.pep.opep}</span>
                            </p>
                             <p className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                nPEP: <span className="font-bold">{stats.pep.npep}</span>
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Placeholder for potential future charts or detail list */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                    <div className="text-center">
                        <StdIcon className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                        <p className="text-gray-500">เลือกช่วงเวลาเพื่อดูรายละเอียดข้อมูลการให้บริการ</p>
                    </div>
                </div>

             </div>

        </div>
    );
};
