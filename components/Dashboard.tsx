import React, { useMemo } from 'react';
import { Patient, PatientStatus } from '../types';
import { PatientsIcon } from './icons';
import { calculatePatientStatus } from './utils';

interface DashboardProps {
    patients: Patient[];
    onNavigateToPatients: () => void;
}

const StatCard = ({ title, value, icon, colorClass, onClick, bgGradient }: any) => (
    <div 
        onClick={onClick} 
        className={`relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-300' : ''}`}
    >
        <div className={`p-4 rounded-xl shadow-inner ${colorClass}`}>
            {icon}
        </div>
        <div className="relative z-10">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        {/* Decorative background blob */}
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${bgGradient}`}></div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ patients, onNavigateToPatients }) => {
    const stats = useMemo(() => {
        const s = {
            total: patients.length,
            active: 0,
            ltfu: 0,
            transferred: 0,
            expired: 0,
            restart: 0,
            male: 0,
            female: 0,
            nap: 0
        };

        patients.forEach(p => {
            // Use calculated status to ensure real-time accuracy. 
            // If calculatePatientStatus returns null (no date), we treat it as No Data/Inactive.
            const status = calculatePatientStatus(p);

            if (status === PatientStatus.ACTIVE) s.active++;
            else if (status === PatientStatus.LTFU) s.ltfu++;
            else if (status === PatientStatus.TRANSFERRED) s.transferred++;
            else if (status === PatientStatus.EXPIRED) s.expired++;
            else if (status === PatientStatus.RESTART) s.restart++;

            if (p.sex === 'ชาย') s.male++;
            else if (p.sex === 'หญิง') s.female++;

            if (p.napId) s.nap++;
        });
        return s;
    }, [patients]);

    // Calculate percentages for bars
    const getPercent = (val: number) => stats.total > 0 ? (val / stats.total) * 100 : 0;

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
                <p className="text-slate-500 mt-2 text-lg">ภาพรวมข้อมูลผู้ป่วยในคลินิก</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="ผู้ป่วยทั้งหมด" 
                    value={stats.total} 
                    icon={<PatientsIcon className="h-6 w-6 text-blue-600" />} 
                    colorClass="bg-blue-50"
                    bgGradient="bg-blue-500"
                    onClick={onNavigateToPatients}
                />
                <StatCard 
                    title="กำลังรักษา (Active)" 
                    value={stats.active + stats.restart} 
                    icon={<div className="h-6 w-6 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />} 
                    colorClass="bg-emerald-50"
                    bgGradient="bg-emerald-500"
                />
                <StatCard 
                    title="ขาดนัด (LTFU)" 
                    value={stats.ltfu} 
                    icon={<div className="h-6 w-6 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />}
                    colorClass="bg-red-50"
                    bgGradient="bg-red-500"
                />
                <StatCard 
                    title="เสียชีวิต" 
                    value={stats.expired} 
                    icon={<div className="h-6 w-6 rounded-full bg-slate-800 shadow-lg" />}
                    colorClass="bg-slate-100"
                    bgGradient="bg-slate-800"
                />
            </div>

            {/* Detailed Charts / Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Status Breakdown */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">สถานะการรักษา</h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Active (กำลังรักษา)', value: stats.active, color: 'bg-emerald-500' },
                            { label: 'Restart (เริ่มยาใหม่)', value: stats.restart, color: 'bg-emerald-400' },
                            { label: 'LTFU (ขาดนัด)', value: stats.ltfu, color: 'bg-red-500' },
                            { label: 'Transferred (ย้ายออก)', value: stats.transferred, color: 'bg-orange-400' },
                            { label: 'Expired (เสียชีวิต)', value: stats.expired, color: 'bg-slate-600' },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-sm font-medium mb-2">
                                    <span className="text-slate-600">{item.label}</span>
                                    <span className="text-slate-900">{item.value} <span className="text-slate-400 text-xs ml-1">({getPercent(item.value).toFixed(1)}%)</span></span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div className={`h-3 rounded-full ${item.color} shadow-sm`} style={{ width: `${getPercent(item.value)}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Demographics */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">ข้อมูลประชากร</h3>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-indigo-50 p-6 rounded-2xl text-center border border-indigo-100">
                            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-1">ชาย</p>
                            <p className="text-4xl font-bold text-indigo-900">{stats.male}</p>
                        </div>
                        <div className="bg-pink-50 p-6 rounded-2xl text-center border border-pink-100">
                            <p className="text-sm font-semibold text-pink-600 uppercase tracking-wide mb-1">หญิง</p>
                            <p className="text-4xl font-bold text-pink-900">{stats.female}</p>
                        </div>
                    </div>
                    <div className="mt-auto p-6 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-600 font-medium">ผู้ป่วย HIV ที่มี NAP ID</span>
                            <span className="font-bold text-slate-800 text-lg">{stats.nap} ราย</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                             <div className="h-3 rounded-full bg-blue-600 shadow-sm" style={{ width: `${getPercent(stats.nap)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};