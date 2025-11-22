
import React, { useState, useMemo } from 'react';
import { Patient, PatientStatus, MedicalEventType } from '../types';
import { PlusIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from './icons';
import { calculateAge, calculatePatientStatus, determineHbvStatus, determineHcvStatus, formatThaiDateShort } from './utils';
import { DateInput } from './DateInput';

interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (id: number) => void;
  onAddNew: () => void;
  onDeletePatient: (id: number) => void;
}

const getStatusBadge = (status: PatientStatus | null) => {
  if (!status) {
      return <span>-</span>;
  }
  switch (status) {
    case PatientStatus.ACTIVE:
      return <span className="px-2 py-1 text-xs font-medium text-emerald-800 bg-emerald-100 rounded-full">Active</span>;
    case PatientStatus.LTFU:
      return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">LTFU</span>;
    case PatientStatus.TRANSFERRED:
      return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">Transferred</span>;
    case PatientStatus.EXPIRED:
      return <span className="px-2 py-1 text-xs font-medium text-white bg-black rounded-full">Expired</span>;
    case PatientStatus.RESTART:
        return <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">Restart</span>;
    default:
      return <span>-</span>;
  }
};

// Common STDs for dropdown
const STD_DISEASE_OPTIONS = [
    'Syphilis', 'Gonorrhea', 'Chlamydia', 'Non-Gonorrhea', 
    'HSV', 'HPV', 'Trichomoniasis', 'PID', 'LGV', 'Chancroid'
];

const HBV_STATUS_OPTIONS = ['ไม่เป็น HBV', 'เป็น HBV', 'รอตรวจเพิ่มเติม', 'ไม่มีข้อมูล'];
const HCV_STATUS_OPTIONS = [
    'ไม่เป็น HCV', 'รอการตรวจเพิ่มเติม', 'เคยเป็น HCV หายเอง', 
    'เป็น HCV', 'กำลังรักษา HCV', 'เคยเป็น HCV รักษาหายแล้ว', 'เป็น HCV รักษาแล้วไม่หาย'
];

export const PatientList: React.FC<PatientListProps> = ({ patients, onSelectPatient, onAddNew, onDeletePatient }) => {
  // --- Filter States ---
  const [searchText, setSearchText] = useState('');
  
  // Appointment Date Range
  const [apptStartDate, setApptStartDate] = useState('');
  const [apptEndDate, setApptEndDate] = useState('');
  
  // Dropdown Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hbvFilter, setHbvFilter] = useState<string>('');
  const [hcvFilter, setHcvFilter] = useState<string>('');
  const [stdFilter, setStdFilter] = useState<string>('');

  // Boolean Toggles
  const [tptFilter, setTptFilter] = useState(false);
  const [prepFilter, setPrepFilter] = useState(false);
  const [pepFilter, setPepFilter] = useState(false);

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Filtering Logic ---
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
        // Use strictly calculated status. If no date, this is null.
        const calculatedStatus = calculatePatientStatus(p);

        // 1. Text Search (HN, Name, Phone)
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
            const matches = 
                p.hn.toLowerCase().includes(searchLower) ||
                fullName.includes(searchLower) ||
                (p.phone && p.phone.includes(searchLower));
            if (!matches) return false;
        }

        // 2. Status Filter
        if (statusFilter && calculatedStatus !== statusFilter) {
            return false;
        }

        // 3. Appointment Date Range
        if (apptStartDate || apptEndDate) {
            if (!p.nextAppointmentDate) return false;
            const apptDate = new Date(p.nextAppointmentDate);
            apptDate.setHours(0,0,0,0);

            if (apptStartDate) {
                const start = new Date(apptStartDate);
                start.setHours(0,0,0,0);
                if (apptDate < start) return false;
            }
            if (apptEndDate) {
                const end = new Date(apptEndDate);
                end.setHours(0,0,0,0);
                if (apptDate > end) return false;
            }
        }

        // 4. HBV Status
        if (hbvFilter) {
            const status = determineHbvStatus(p).text;
            if (status !== hbvFilter) return false;
        }

        // 5. HCV Status
        if (hcvFilter) {
            const status = determineHcvStatus(p).text;
            if (status !== hcvFilter) return false;
        }

        // 6. STD Filter (Specific Disease)
        if (stdFilter) {
            const hasStd = p.stdInfo?.records?.some(r => 
                r.diseases.some(d => d.toLowerCase().includes(stdFilter.toLowerCase()))
            );
            if (!hasStd) return false;
        }

        // 7. TPT Filter
        if (tptFilter) {
            const receivedTpt = p.medicalHistory.some(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT);
            if (!receivedTpt) return false;
        }

        // 8. PrEP Filter (Ever received)
        if (prepFilter) {
            const hasPrep = p.prepInfo?.records && p.prepInfo.records.length > 0;
            if (!hasPrep) return false;
        }

        // 9. PEP Filter (Ever received)
        if (pepFilter) {
            const hasPep = p.pepInfo?.records && p.pepInfo.records.length > 0;
            if (!hasPep) return false;
        }

        return true;
    }).sort((a, b) => {
        // Sort by updatedAt descending (newest first)
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
    });
  }, [patients, searchText, statusFilter, apptStartDate, apptEndDate, hbvFilter, hcvFilter, stdFilter, tptFilter, prepFilter, pepFilter]);

  // --- Pagination Logic ---
  const totalPatients = filteredPatients.length;
  const totalPages = Math.ceil(totalPatients / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  const resetFilters = () => {
      setSearchText('');
      setApptStartDate('');
      setApptEndDate('');
      setStatusFilter('');
      setHbvFilter('');
      setHcvFilter('');
      setStdFilter('');
      setTptFilter(false);
      setPrepFilter(false);
      setPepFilter(false);
      setCurrentPage(1);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">รายชื่อผู้ป่วยทั้งหมด</h1>
        <button onClick={onAddNew} className="flex items-center mt-4 md:mt-0 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
          <PlusIcon className="mr-2 h-4 w-4" />
          เพิ่มผู้ป่วยใหม่
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        
        {/* --- Advanced Filters Section --- */}
        <div className="space-y-4 mb-6">
            
            {/* Row 1: Search & Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <SearchIcon className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="ค้นหา HN, ชื่อ, เบอร์โทร..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                </div>
                <div className="md:col-span-8 flex flex-col md:flex-row items-start md:items-center gap-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                         <span className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0 pt-2 sm:pt-0">วันนัด:</span>
                         <div className="flex flex-col sm:flex-row gap-2 w-full">
                             <DateInput 
                                value={apptStartDate} 
                                onChange={(e) => setApptStartDate(e.target.value)} 
                            />
                            <span className="text-sm text-gray-500 flex-shrink-0 self-center hidden sm:block">-</span>
                            <span className="text-sm text-gray-500 flex-shrink-0 sm:hidden">ถึง</span>
                            <DateInput 
                                value={apptEndDate} 
                                onChange={(e) => setApptEndDate(e.target.value)} 
                            />
                         </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Categorical Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                 >
                     <option value="">สถานะการรักษา (ทั้งหมด)</option>
                     {Object.values(PatientStatus).map(s => <option key={s} value={s}>{s}</option>)}
                 </select>

                 <select 
                    value={hbvFilter} 
                    onChange={(e) => setHbvFilter(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                 >
                     <option value="">สรุปผล HBV (ทั้งหมด)</option>
                     {HBV_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>

                 <select 
                    value={hcvFilter} 
                    onChange={(e) => setHcvFilter(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                 >
                     <option value="">สรุปผล HCV (ทั้งหมด)</option>
                     {HCV_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>

                 <select 
                    value={stdFilter} 
                    onChange={(e) => setStdFilter(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                 >
                     <option value="">ประวัติ STD (โรค)</option>
                     {STD_DISEASE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
            </div>

            {/* Row 3: Toggles & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setTptFilter(!tptFilter)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${tptFilter ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                    >
                        {tptFilter ? '✓ เฉพาะได้รับ TPT' : 'ได้รับ TPT'}
                    </button>
                    <button 
                        onClick={() => setPrepFilter(!prepFilter)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${prepFilter ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                    >
                        {prepFilter ? '✓ เฉพาะรับ PrEP' : 'รับ PrEP'}
                    </button>
                    <button 
                        onClick={() => setPepFilter(!pepFilter)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${pepFilter ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                    >
                        {pepFilter ? '✓ เฉพาะรับ PEP' : 'รับ PEP'}
                    </button>
                </div>

                <button onClick={resetFilters} className="text-sm text-red-600 hover:underline">
                    ล้างตัวกรอง
                </button>
            </div>
        </div>

        {/* --- Table --- */}
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
              {paginatedPatients.length > 0 ? paginatedPatients.map((patient) => {
                // Use strictly calculated status
                const calculatedStatus = calculatePatientStatus(patient);
                return (
                    <tr key={patient.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-emerald-600">{patient.hn}</td>
                        <td className="px-6 py-4">{`${patient.firstName || '-'} ${patient.lastName || ''}`}</td>
                        <td className="px-6 py-4">{calculateAge(patient.dob)}</td>
                        <td className="px-6 py-4">{patient.phone || '-'}</td>
                        <td className="px-6 py-4 truncate max-w-[150px]" title={patient.healthcareScheme}>{patient.healthcareScheme || '-'}</td>
                        <td className="px-6 py-4">{formatThaiDateShort(patient.nextAppointmentDate || '')}</td>
                        <td className="px-6 py-4">{getStatusBadge(calculatedStatus)}</td>
                        <td className="px-6 py-4">
                            <div className="flex items-center justify-between w-full min-w-[100px]">
                                <button onClick={() => onSelectPatient(patient.id)} className="font-medium text-emerald-600 hover:underline">
                                    ดูรายละเอียด
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation(); 
                                        onDeletePatient(patient.id); 
                                    }} 
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="ลบผู้ป่วย"
                                >
                                    <TrashIcon className="h-5 w-5 pointer-events-none" />
                                </button>
                            </div>
                        </td>
                    </tr>
                );
              }) : (
                  <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                          ไม่พบข้อมูลผู้ป่วยที่ตรงกับเงื่อนไข
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* --- Pagination Controls --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm text-gray-600 border-t pt-4">
            <p>แสดง {filteredPatients.length > 0 ? startIndex + 1 : 0} ถึง {Math.min(startIndex + itemsPerPage, totalPatients)} จาก {totalPatients} รายการ</p>
            <div className="flex items-center mt-4 md:mt-0 space-x-2">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeftIcon />
                </button>
                
                {/* Simplified Pagination for brevity */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Logic to show pages around current page could be added here for large lists
                    // For now, showing first 5 or fewer
                    let pNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                        pNum = currentPage - 2 + i;
                    }
                    if (pNum > totalPages) return null;

                    return (
                         <button 
                            key={pNum}
                            onClick={() => handlePageChange(pNum)}
                            className={`px-3 py-1 rounded-md ${currentPage === pNum ? 'bg-emerald-100 text-emerald-700 font-bold' : 'hover:bg-gray-100'}`}
                        >
                            {pNum}
                        </button>
                    );
                })}

                <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronRightIcon />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
