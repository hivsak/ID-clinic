
import React from 'react';
import { Patient, PatientStatus } from '../types';

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
        return PatientStatus.ACTIVE;
    }
    
    // 4. Default (No conditions met)
    return null;
};

export const formatThaiDateBE = (isoDate: string) => {
    if (!isoDate) return '-';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
};

export const formatThaiDateShort = (isoDate: string) => {
    if (!isoDate) return '-';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

export const inputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm";
export const labelClass = "block text-sm font-medium text-gray-700";
export const textareaClass = `${inputClass} min-h-[80px]`;

export const DisplayField: React.FC<{ label: string; value?: string | React.ReactNode | null }> = ({ label, value }) => {
    return React.createElement(
        'div',
        null,
        React.createElement('p', { className: "text-sm font-medium text-gray-500" }, label),
        React.createElement('div', { className: "mt-1 text-gray-900" }, value || '-')
    );
};
