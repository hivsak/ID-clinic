
import React from 'react';
import { Patient, PatientStatus } from '../types';
import { PlusIcon, SearchIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { calculateAge } from './utils';

interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (id: number) => void;
  onAddNew: () => void;
}

const getStatusBadge = (status: PatientStatus) => {
  switch (status) {
    case PatientStatus.ACTIVE:
      return <span className="px-2 py-1 text-xs font-medium text-emerald-800 bg-emerald-100 rounded-full">Active</span>;
    case PatientStatus.LTFU:
      return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">LTFU</span>;
    case PatientStatus.TRANSFERRED:
      return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">Transferred</span>;
    case PatientStatus.EXPIRED:
      return <span className="px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-full">Expired</span>;
    case PatientStatus.RESTART:
        return <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">Restart</span>;
    default:
      return null;
  }
};

const formatThaiDate = (isoDate?: string) => {
    if (!isoDate) return '-';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const FilterButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <button className="flex items-center justify-between w-full md:w-auto px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
        {children}
        <ChevronDownIcon className="ml-2" />
    </button>
);


export const PatientList: React.FC<PatientListProps> = ({ patients, onSelectPatient, onAddNew }) => {
  const totalPatients = patients.length;
  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">รายชื่อผู้ป่วยทั้งหมด</h1>
        <button onClick={onAddNew} className="flex items-center mt-4 md:mt-0 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
          <PlusIcon className="mr-2 h-4 w-4" />
          เพิ่มผู้ป่วยใหม่
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SearchIcon className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="ค้นหาจาก HN, ชื่อ, นามสกุล..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <FilterButton>สถานะการรักษา</FilterButton>
             <FilterButton>เพศ</FilterButton>
             <FilterButton>แพทย์ผู้ดูแล</FilterButton>
             <FilterButton>วันที่นัดหมาย</FilterButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">HN</th>
                <th scope="col" className="px-6 py-3">ชื่อ-สกุล</th>
                <th scope="col" className="px-6 py-3">อายุ</th>
                <th scope="col" className="px-6 py-3">เบอร์โทร</th>
                <th scope="col" className="px-6 py-3">สิทธิ์การรักษา</th>
                <th scope="col" className="px-6 py-3">วันนัดหมาย</th>
                <th scope="col" className="px-6 py-3">สถานะ</th>
                <th scope="col" className="px-6 py-3">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-emerald-600">{patient.hn}</td>
                  <td className="px-6 py-4">{`${patient.firstName || '-'} ${patient.lastName || ''}`}</td>
                  <td className="px-6 py-4">{calculateAge(patient.dob)}</td>
                  <td className="px-6 py-4">{patient.phone || '-'}</td>
                  <td className="px-6 py-4">{patient.healthcareScheme || '-'}</td>
                  <td className="px-6 py-4">{formatThaiDate(patient.nextAppointmentDate)}</td>
                  <td className="px-6 py-4">{getStatusBadge(patient.status)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => onSelectPatient(patient.id)} className="font-medium text-emerald-600 hover:underline">
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm text-gray-600">
            <p>Showing 1 to {Math.min(5, totalPatients)} of {totalPatients} results</p>
            <div className="flex items-center mt-4 md:mt-0">
                <button className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50" disabled>
                    <ChevronLeftIcon />
                </button>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-md mx-1">1</span>
                <span className="px-3 py-1 hover:bg-gray-100 rounded-md mx-1">2</span>
                <span className="px-3 py-1 hover:bg-gray-100 rounded-md mx-1">3</span>
                <span className="px-3 py-1 mx-1">...</span>
                <span className="px-3 py-1 hover:bg-gray-100 rounded-md mx-1">12</span>
                <button className="p-2 rounded-md hover:bg-gray-100">
                    <ChevronRightIcon />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
