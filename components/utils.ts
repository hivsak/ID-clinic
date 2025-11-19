
import React from 'react';

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
