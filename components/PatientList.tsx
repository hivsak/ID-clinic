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
      return <span className="text-slate-400">-</span>;
  }
  switch (status) {
    case PatientStatus.ACTIVE:
      return <span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-lg">Active</span>;
    case PatientStatus.LTFU:
      return <span className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 rounded-lg">LTFU</span>;
    case PatientStatus.TRANSFERRED:
      return <span className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg">Transferred</span>;
    case PatientStatus.EXPIRED:
      return <span className="px-2.5 py-1 text-xs font-bold text-white bg-slate-700 border border-slate-600 rounded-lg">Expired</span>;
    case PatientStatus.RESTART:
        return <span className="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 rounded-lg">Restart</span>;
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

        // 1. Text Search (HN, Name, Phone, CID)
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
            const matches = 
                p.hn.toLowerCase().includes(searchLower) ||
                (p.cid && p.cid.includes(searchLower)) ||
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
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">รายชื่อผู้ป่วยทั้งหมด</h1>
            <p className="text-slate-500 mt-1">จัดการข้อมูลและสถานะผู้ป่วย</p>
        </div>
        <button 
            onClick={onAddNew} 
            className="flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          เพิ่มผู้ป่วยใหม่
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* --- Advanced Filters Section --- */}
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 space-y-5">
            
            {/* Row 1: Search & Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <SearchIcon className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="ค้นหา HN, เลขบัตรปชช, ชื่อ, เบอร์โทร..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <div className="md:col-span-8 flex flex-col md:flex-row items-start md:items-center gap-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                         <span className="text-sm font-medium text-slate-500 whitespace-nowrap pl-2">วันนัด:</span>
                         <div className="flex flex-col sm:flex-row gap-2 w-full items-center">
                             <div className="w-full"><DateInput value={apptStartDate} onChange={(e) => setApptStartDate(e.target.value)} className="w-full" /></div>
                            <span className="text-slate-400 hidden sm:block">→</span>
                            <div className="w-full"><DateInput value={apptEndDate} onChange={(e) => setApptEndDate(e.target.value)} className="w-full" /></div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Categorical Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)} 
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
                 >
                     <option value="">สถานะการรักษา (ทั้งหมด)</option>
                     {Object.values(PatientStatus).map(s => <option key={s} value={s}>{s}</option>)}
                 </select>

                 <select 
                    value={hbvFilter} 
                    onChange={(e) => setHbvFilter(e.target.value)} 
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
                 >
                     <option value="">สรุปผล HBV (ทั้งหมด)</option>
                     {HBV_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>

                 <select 
                    value={hcvFilter} 
                    onChange={(e) => setHcvFilter(e.target.value)} 
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
                 >
                     <option value="">สรุปผล HCV (ทั้งหมด)</option>
                     {HCV_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>

                 <select 
                    value={stdFilter} 
                    onChange={(e) => setStdFilter(e.target.value)} 
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
                 >
                     <option value="">ประวัติ STD (โรค)</option>
                     {STD_DISEASE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
            </div>

            {/* Row 3: Toggles & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex gap-2 flex-wrap">
                    <button 
                        onClick={() => setTptFilter(!tptFilter)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${tptFilter ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                        {tptFilter ? '✓ TPT' : 'TPT'}
                    </button>
                    <button 
                        onClick={() => setPrepFilter(!prepFilter)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${prepFilter ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                        {prepFilter ? '✓ PrEP' : 'PrEP'}
                    </button>
                    <button 
                        onClick={() => setPepFilter(!pepFilter)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${pepFilter ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                        {pepFilter ? '✓ PEP' : 'PEP'}
                    </button>
                </div>

                <button onClick={resetFilters} className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline px-2 transition-colors">
                    ล้างตัวกรอง (Reset)
                </button>
            </div>
        </div>

        {/* --- Table --- */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4">HN</th>
                <th scope="col" className="px-6 py-4">ชื่อ-สกุล</th>
                <th scope="col" className="px-6 py-4">อายุ</th>
                <th scope="col" className="px-6 py-4">เบอร์โทร</th>
                <th scope="col" className="px-6 py-4">สิทธิ์การรักษา</th>
                <th scope="col" className="px-6 py-4">วันนัดหมาย</th>
                <th scope="col" className="px-6 py-4">สถานะ</th>
                <th scope="col" className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPatients.length > 0 ? paginatedPatients.map((patient) => {
                // Use strictly calculated status
                const calculatedStatus = calculatePatientStatus(patient);
                return (
                    <tr key={patient.id} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-emerald-700">{patient.hn}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{`${patient.firstName || '-'} ${patient.lastName || ''}`}</td>
                        <td className="px-6 py-4">{calculateAge(patient.dob)}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{patient.phone || '-'}</td>
                        <td className="px-6 py-4 truncate max-w-[150px]" title={patient.healthcareScheme}>{patient.healthcareScheme || '-'}</td>
                        <td className="px-6 py-4">
                            {patient.nextAppointmentDate ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    {formatThaiDateShort(patient.nextAppointmentDate)}
                                </span>
                            ) : '-'}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(calculatedStatus)}</td>
                        <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center space-x-3">
                                <button onClick={() => onSelectPatient(patient.id)} className="font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
                                    ดูข้อมูล
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation(); 
                                        onDeletePatient(patient.id); 
                                    }} 
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                    title="ลบผู้ป่วย"
                                >
                                    <TrashIcon className="h-4 w-4 pointer-events-none" />
                                </button>
                            </div>
                        </td>
                    </tr>
                );
              }) : (
                  <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400 bg-slate-50/30">
                          <div className="flex flex-col items-center justify-center">
                              <SearchIcon className="h-10 w-10 text-slate-300 mb-2" />
                              <p>ไม่พบข้อมูลผู้ป่วยที่ตรงกับเงื่อนไข</p>
                          </div>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* --- Pagination Controls --- */}
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-4 bg-white border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-4 md:mb-0">
                แสดง <span className="font-semibold text-slate-800">{filteredPatients.length > 0 ? startIndex + 1 : 0}</span> ถึง <span className="font-semibold text-slate-800">{Math.min(startIndex + itemsPerPage, totalPatients)}</span> จาก <span className="font-semibold text-slate-800">{totalPatients}</span> รายการ
            </p>
            <div className="flex items-center space-x-2">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-600"
                >
                    <ChevronLeftIcon />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                        pNum = currentPage - 2 + i;
                    }
                    if (pNum > totalPages) return null;

                    return (
                         <button 
                            key={pNum}
                            onClick={() => handlePageChange(pNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === pNum ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            {pNum}
                        </button>
                    );
                })}

                <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-600"
                >
                    <ChevronRightIcon />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};