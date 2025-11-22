
import React, { useEffect, useState } from 'react';
import { THAI_MONTHS } from './utils';

interface DateInputProps {
  value?: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  name?: string;
  id?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, name = '', id, required, className, disabled }) => {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setDay(String(date.getDate()));
                setMonth(String(date.getMonth() + 1));
                setYear(String(date.getFullYear() + 543));
            }
        } else {
            setDay('');
            setMonth('');
            setYear('');
        }
    }, [value]);

    const handleDateChange = (d: string, m: string, y: string) => {
        setDay(d);
        setMonth(m);
        setYear(y);

        if (d && m && y && y.length === 4) {
             const yearAD = parseInt(y) - 543;
             
             // Construct date string manually to ensure ISO format YYYY-MM-DD
             const paddedM = m.padStart(2, '0');
             const paddedD = d.padStart(2, '0');
             const isoDate = `${yearAD}-${paddedM}-${paddedD}`;
             
             // Validate simple date constraints (e.g. Feb 31) by creating a Date object and checking back
             const checkDate = new Date(isoDate);
             if (!isNaN(checkDate.getTime()) && checkDate.getDate() === parseInt(d)) {
                onChange({ target: { name, value: isoDate } });
             }
        } else if (!d && !m && !y) {
             // Allow clearing
             onChange({ target: { name, value: '' } });
        }
    };

    const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

    return (
        <div className={`flex gap-1 items-center ${className}`}>
            {/* Day */}
            <select
                id={id ? `${id}_day` : undefined}
                value={day}
                onChange={(e) => handleDateChange(e.target.value, month, year)}
                disabled={disabled}
                required={required}
                className="block w-[60px] px-1 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            >
                <option value="">วัน</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Month */}
            <select
                value={month}
                onChange={(e) => handleDateChange(day, e.target.value, year)}
                disabled={disabled}
                required={required}
                className="block w-[80px] px-1 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            >
                 <option value="">เดือน</option>
                 {THAI_MONTHS.map((m, idx) => <option key={m} value={String(idx + 1)}>{m}</option>)}
            </select>

            {/* Year (BE) */}
            <input
                type="number"
                placeholder="ปี พ.ศ."
                value={year}
                onChange={(e) => handleDateChange(day, month, e.target.value)}
                disabled={disabled}
                required={required}
                min="2400"
                max="2600"
                className="block w-[80px] px-2 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            />
        </div>
    );
};
