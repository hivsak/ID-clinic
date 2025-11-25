
import React, { useEffect, useState, useRef } from 'react';
import { THAI_MONTHS } from './utils';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface DateInputProps {
  value?: string; // ISO date YYYY-MM-DD
  onChange: (e: { target: { name: string; value: string } }) => void;
  name?: string;
  id?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, name = '', id, required, className, disabled, placeholder = "dd/mm/yyyy" }) => {
    const [displayText, setDisplayText] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Calendar State
    const [viewDate, setViewDate] = useState(new Date()); // Current month/year viewing

    // Sync display text from ISO prop
    useEffect(() => {
        if (value) {
            // Fix: Parse YYYY-MM-DD explicitly as local date to prevent timezone shift
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                const [y, m, d] = value.split('-').map(Number);
                // Create local date at 00:00:00
                const date = new Date(y, m - 1, d);
                 if (!isNaN(date.getTime())) {
                    const dStr = String(date.getDate()).padStart(2, '0');
                    const mStr = String(date.getMonth() + 1).padStart(2, '0');
                    const yStr = date.getFullYear() + 543; // Convert to BE
                    setDisplayText(`${dStr}/${mStr}/${yStr}`);
                    setViewDate(date);
                }
            } else {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    const d = String(date.getDate()).padStart(2, '0');
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const y = date.getFullYear() + 543; // Convert to BE
                    setDisplayText(`${d}/${m}/${y}`);
                    setViewDate(date);
                } else {
                    setDisplayText('');
                }
            }
        } else {
            setDisplayText('');
        }
    }, [value]);

    // Handle click outside to close calendar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowCalendar(false);
                // Revert invalid text on blur if needed? For now, keep as is or reset to value
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        
        // Simple masking logic for /
        // Remove non-digit non-slash
        val = val.replace(/[^0-9\/]/g, '');
        
        setDisplayText(val);

        // Attempt parse
        // Regex for DD/MM/YYYY
        const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const yearBE = parseInt(match[3], 10);
            const yearAD = yearBE - 543;

            // Validate date
            const checkDate = new Date(yearAD, month - 1, day);
            if (
                checkDate.getFullYear() === yearAD &&
                checkDate.getMonth() === month - 1 &&
                checkDate.getDate() === day &&
                yearBE > 2400 && yearBE < 2600 // Reasonable range check
            ) {
                const iso = `${yearAD}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                onChange({ target: { name, value: iso } });
                setViewDate(checkDate);
            }
        } else if (val === '') {
             onChange({ target: { name, value: '' } });
        }
    };

    const selectDate = (date: Date) => {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const yAD = date.getFullYear();
        const yBE = yAD + 543;
        
        const iso = `${yAD}-${m}-${d}`;
        onChange({ target: { name, value: iso } });
        setDisplayText(`${d}/${m}/${yBE}`);
        setShowCalendar(false);
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };
    
    const handleYearSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYearBE = parseInt(e.target.value, 10);
        const newYearAD = newYearBE - 543;
        const newDate = new Date(viewDate);
        newDate.setFullYear(newYearAD);
        setViewDate(newDate);
    };
    
    const handleMonthSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMonth = parseInt(e.target.value, 10);
        const newDate = new Date(viewDate);
        newDate.setMonth(newMonth);
        setViewDate(newDate);
    };

    // Calendar rendering logic
    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // 0 = Sunday, 1 = Monday...
        const startDay = firstDayOfMonth.getDay(); 
        
        const days = [];
        // Pad empty start days
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
        }
        
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const isSelected = value && new Date(value).toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();
            
            days.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => selectDate(date)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm hover:bg-emerald-100 
                        ${isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                        ${isToday && !isSelected ? 'border border-emerald-500 text-emerald-600' : 'text-gray-700'}
                    `}
                >
                    {d}
                </button>
            );
        }

        // Generate Year Options (Range +/- 100 years from now)
        const currentYearBE = new Date().getFullYear() + 543;
        const yearsBE = [];
        for (let i = currentYearBE + 10; i >= currentYearBE - 100; i--) {
            yearsBE.push(i);
        }

        return (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg p-4 z-50 min-w-[280px]">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-600">
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    
                    <div className="flex gap-1">
                        <select 
                            value={viewDate.getMonth()} 
                            onChange={handleMonthSelectChange}
                            className="text-sm font-medium text-gray-700 border-none bg-transparent focus:ring-0 cursor-pointer py-0 pr-6"
                        >
                            {THAI_MONTHS.map((m, idx) => (
                                <option key={idx} value={idx}>{m}</option>
                            ))}
                        </select>
                        <select 
                            value={viewDate.getFullYear() + 543} 
                            onChange={handleYearSelectChange}
                            className="text-sm font-medium text-gray-700 border-none bg-transparent focus:ring-0 cursor-pointer py-0 pr-6"
                        >
                            {yearsBE.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-600">
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                        <span key={d} className="text-xs font-medium text-gray-400">{d}</span>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 place-items-center">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    value={displayText}
                    onChange={handleInputChange}
                    onClick={() => setShowCalendar(true)}
                    disabled={disabled}
                    required={required}
                    placeholder={placeholder}
                    className="block w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    autoComplete="off"
                />
                <button
                    type="button"
                    onClick={() => !disabled && setShowCalendar(!showCalendar)}
                    className={`absolute inset-y-0 right-0 flex items-center pr-3 ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-500 hover:text-emerald-600'}`}
                    tabIndex={-1}
                >
                    <CalendarIcon className="h-5 w-5" />
                </button>
            </div>
            {showCalendar && !disabled && renderCalendar()}
        </div>
    );
};
