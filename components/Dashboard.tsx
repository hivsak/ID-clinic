
import React, { useMemo } from 'react';
import { Patient, PatientStatus } from '../types';
import { PatientsIcon } from './icons';

interface DashboardProps {
    patients: Patient[];
    onNavigateToPatients: () => void;
}

const StatCard = ({ title, value, icon, colorClass, onClick }: any) => (
    <div onClick={onClick} className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
        <div className={`p-3 rounded-full ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
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
            if (p.status === PatientStatus.ACTIVE) s.active++;
            else if (p.status === PatientStatus.LTFU) s.ltfu++;
            else if (p.status === PatientStatus.TRANSFERRED) s.transferred++;
            else if (p.status === PatientStatus.EXPIRED) s.expired++;
            else if (p.status === PatientStatus.RESTART) s.restart++;

            if (p.sex === 'ชาย') s.male++;
            else if (p.sex === 'หญิง') s.female++;

            if (p.napId) s.nap++;
        });
        return s;
    }, [patients]);

    // Calculate percentages for bars
    const getPercent = (val: number) => stats.total > 0 ? (val / stats.total) * 100 : 0;

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-500">ภาพรวมข้อมูลผู้ป่วยในคลินิก</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="ผู้ป่วยทั้งหมด" 
                    value={stats.total} 
                    icon={<PatientsIcon className="h-6 w-6 text-blue-600" />} 
                    colorClass="bg-blue-50"
                    onClick={onNavigateToPatients}
                />
                <StatCard 
                    title="กำลังรักษา (Active)" 
                    value={stats.active + stats.restart} 
                    icon={<div className="h-6 w-6 rounded-full bg-emerald-500" />} // Simple dot
                    colorClass="bg-emerald-50"
                />
                <StatCard 
                    title="ขาดนัด (LTFU)" 
                    value={stats.ltfu} 
                    icon={<div className="h-6 w-6 rounded-full bg-red-500" />}
                    colorClass="bg-red-50"
                />
                <StatCard 
                    title="เสียชีวิต" 
                    value={stats.expired} 
                    icon={<div className="h-6 w-6 rounded-full bg-gray-800" />}
                    colorClass="bg-gray-100"
                />
            </div>

            {/* Detailed Charts / Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Status Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">สถานะการรักษา</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Active (กำลังรักษา)', value: stats.active, color: 'bg-emerald-500' },
                            { label: 'Restart (เริ่มยาใหม่)', value: stats.restart, color: 'bg-emerald-400' },
                            { label: 'LTFU (ขาดนัด)', value: stats.ltfu, color: 'bg-red-500' },
                            { label: 'Transferred (ย้ายออก)', value: stats.transferred, color: 'bg-orange-400' },
                            { label: 'Expired (เสียชีวิต)', value: stats.expired, color: 'bg-gray-700' },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-medium text-gray-900">{item.value} ({getPercent(item.value).toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                    <div className={`h-2.5 rounded-full ${item.color}`} style={{ width: `${getPercent(item.value)}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Demographics */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">ข้อมูลประชากร</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-indigo-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-indigo-600 font-medium">ชาย</p>
                            <p className="text-2xl font-bold text-indigo-900">{stats.male}</p>
                        </div>
                        <div className="bg-pink-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-pink-600 font-medium">หญิง</p>
                            <p className="text-2xl font-bold text-pink-900">{stats.female}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">มี NAP ID</span>
                            <span className="font-bold text-gray-800">{stats.nap} ราย</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                             <div className="h-2 rounded-full bg-blue-600" style={{ width: `${getPercent(stats.nap)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
