import React from 'react';
import { Patient, PatientStatus, HcvTest, HcvInfo } from '../types';

export const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// Helper to format date as YYYY-MM-DD using local time to prevent timezone shifts
export const toLocalISOString = (date?: Date | string): string => {
    if (!date) return '';
    
    // Fix: Prevent timezone shift for existing YYYY-MM-DD strings
    // If it is already a date string, keep it as is to avoid UTC conversion
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const calculateAge = (dob?: string) => {
  if (!dob) return '-';
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return '-';
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const calculateAgeBreakdown = (dobString?: string) => {
    if (!dobString) return { years: '', months: '', days: '' };
    const dob = new Date(dobString);
    const today = new Date();
    // Reset hours to ensure date calculations are based on calendar days
    dob.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    if (isNaN(dob.getTime())) return { years: '', months: '', days: '' };

    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
        months--;
        // Days in the previous month of today
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0); 
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    return {
        years: years.toString(),
        months: months.toString(),
        days: days.toString()
    };
};

export const calculateDobFromAge = (yStr: string, mStr: string, dStr: string) => {
    const y = parseInt(yStr) || 0;
    const m = parseInt(mStr) || 0;
    const d = parseInt(dStr) || 0;
    
    if (!yStr && !mStr && !dStr) return '';

    const today = new Date();
    today.setHours(0,0,0,0);
    
    const targetDate = new Date(today.getFullYear() - y, today.getMonth() - m, today.getDate() - d);
    
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const calculatePatientStatus = (patient: Partial<Patient>): PatientStatus | null => {
    // 1. Death
    if (patient.deathDate) return PatientStatus.EXPIRED;
    
    // 2. Refer Out
    if (patient.referOutDate) return PatientStatus.TRANSFERRED;
    
    // 3. Appointment Logic
    if (patient.nextAppointmentDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const apptDate = new Date(patient.nextAppointmentDate);
        apptDate.setHours(0, 0, 0, 0);
        
        if (apptDate < today) {
            return PatientStatus.LTFU;
        }

        // If explicitly marked as Restart in DB, keep it as Restart while they are Active (have valid appt)
        if (patient.status === PatientStatus.RESTART) {
            return PatientStatus.RESTART;
        }

        return PatientStatus.ACTIVE;
    }
    
    // 4. Default (No conditions met)
    return null;
};

export const formatThaiDateBE = (isoDate: string) => {
    if (!isoDate) return '-';
    
    // Handle YYYY-MM-DD strictly to prevent timezone shift issues
    if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        const [y, m, d] = isoDate.split('-').map(Number);
        const thaiYear = y + 543;
        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${thaiYear}`;
    }

    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '-';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear() + 543;
    
    return `${day}/${month}/${year}`;
};

export const formatThaiDateShort = (isoDate: string) => {
    return formatThaiDateBE(isoDate);
};

// Modern UI Classes
export const inputClass = "mt-1 block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all sm:text-sm";
export const labelClass = "block text-sm font-semibold text-slate-700 mb-1";
export const textareaClass = `${inputClass} min-h-[100px] resize-y`;

export const DisplayField: React.FC<{ label: string; value?: string | React.ReactNode | null }> = ({ label, value }) => {
    return React.createElement(
        'div',
        { className: "bg-slate-50 p-3 rounded-xl border border-slate-100" },
        React.createElement('p', { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1" }, label),
        React.createElement('div', { className: "text-base font-medium text-slate-900" }, value || '-')
    );
};

// --- Analytics / Status Determination Helpers ---

export const determineHbvStatus = (patient: Patient): { text: string; color: string } => {
    // 1. Manual Override
    if (patient.hbvInfo?.manualSummary) {
        const summary = patient.hbvInfo.manualSummary;
        let color = 'bg-slate-100 text-slate-800';
        if (summary === 'ไม่เป็น HBV') color = 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/20';
        else if (summary === 'เป็น HBV') color = 'bg-red-100 text-red-800 ring-1 ring-red-500/20';
        else if (summary === 'รอตรวจเพิ่มเติม') color = 'bg-amber-100 text-amber-800 ring-1 ring-amber-500/20';
        return { text: summary, color };
    }

    // 2. Automatic Logic based on latest HBsAg
    const hbvData = patient.hbvInfo || { hbsAgTests: [] };
    const latestHbsAgTest = [...(hbvData.hbsAgTests || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!latestHbsAgTest) return { text: 'ไม่มีข้อมูล', color: 'bg-slate-100 text-slate-600' };
    
    switch (latestHbsAgTest.result) {
        case 'Negative': return { text: 'ไม่เป็น HBV', color: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/20' };
        case 'Positive': return { text: 'เป็น HBV', color: 'bg-red-100 text-red-800 ring-1 ring-red-500/20' };
        case 'Inconclusive': return { text: 'รอตรวจเพิ่มเติม', color: 'bg-amber-100 text-amber-800 ring-1 ring-amber-500/20' };
        default: return { text: 'ไม่มีข้อมูล', color: 'bg-slate-100 text-slate-600' };
    }
};

export const determineHcvDiagnosticStatus = (tests: HcvTest[]): 'POSITIVE' | 'INCONCLUSIVE' | 'NEGATIVE' | 'UNKNOWN' => {
    if (!tests || tests.length === 0) return 'UNKNOWN';
    const sortedTests = [...tests].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sortedTests[0];
    
    if (latest.result === 'Positive') return 'POSITIVE';
    if (latest.result === 'Inconclusive') return 'INCONCLUSIVE';
    return 'NEGATIVE';
};

export const determineHcvStatus = (patient: Patient): { text: string; color: string } => {
    const hcvInfo = patient.hcvInfo || { hcvTests: [] };
    const hcvDiagnosticStatus = determineHcvDiagnosticStatus(hcvInfo.hcvTests || []);
    
    const latestPreVl = [...(hcvInfo.preTreatmentVls || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const latestPostVl = [...(hcvInfo.postTreatmentVls || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const latestTreatment = [...(hcvInfo.treatments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const parseVl = (vlString?: string): number | null => {
        if (!vlString) return null;
        const lowerVl = vlString.toLowerCase();
        if (lowerVl.includes('not detected') || lowerVl.includes('undetected')) {
            return 0;
        }
        
        const cleanedString = vlString.replace(/,/g, '');
        const isLessThan = cleanedString.includes('<');
        
        const numericMatch = cleanedString.match(/(\d+(\.\d+)?)/);
        if (numericMatch) {
            const value = parseFloat(numericMatch[0]);
            if (isLessThan) {
                return value - 1; // Treat <15 as 14
            }
            return value;
        }
        return null;
    };
    
    const preVlValue = latestPreVl ? parseVl(latestPreVl.result) : null;
    const postVlValue = latestPostVl ? parseVl(latestPostVl.result) : null;

    // Rule 1: Patient is Negative
    if (hcvDiagnosticStatus === 'NEGATIVE') {
        return { text: 'ไม่เป็น HCV', color: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/20' };
    }

    if (hcvDiagnosticStatus === 'POSITIVE' || hcvDiagnosticStatus === 'INCONCLUSIVE') {
        // Rule 5: Has post-treatment data
        if (preVlValue !== null && preVlValue > 15 && latestTreatment && postVlValue !== null) {
            if (postVlValue < 15) {
                return { text: 'เคยเป็น HCV รักษาหายแล้ว', color: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/20' };
            } else {
                return { text: 'เป็น HCV รักษาแล้วไม่หาย', color: 'bg-red-100 text-red-800 ring-1 ring-red-500/20' };
            }
        }

        // Rule 4: Currently in treatment
        if (preVlValue !== null && preVlValue > 15 && latestTreatment) {
            return { text: 'กำลังรักษา HCV', color: 'bg-amber-100 text-amber-800 ring-1 ring-amber-500/20' };
        }

        // Rule 3: Has pre-treatment data only (Spontaneous clearance check)
        if (preVlValue !== null) {
            if (preVlValue < 15) {
                return { text: 'เคยเป็น HCV หายเอง', color: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/20' };
            } else {
                return { text: 'เป็น HCV', color: 'bg-red-100 text-red-800 ring-1 ring-red-500/20' };
            }
        }

        // Rule 2: Positive/Inconclusive but no further VL data
        return { text: 'รอการตรวจเพิ่มเติม', color: 'bg-amber-100 text-amber-800 ring-1 ring-amber-500/20' };
    }

    // Default/Unknown case
    return { text: 'ไม่มีข้อมูล', color: 'bg-slate-100 text-slate-600' };
};