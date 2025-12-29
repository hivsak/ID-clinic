
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { labelClass, inputClass } from './utils';
import { ChevronDownIcon } from './icons';

export const HOSPITALS = [
    'โรงพยาบาลกันทรวิชัย',
    'โรงพยาบาลกุดรัง',
    'โรงพยาบาลแกดำ',
    'โรงพยาบาลโกสุมพิสัย',
    'โรงพยาบาลชื่นชม',
    'โรงพยาบาลเชียงยืน',
    'โรงพยาบาลนาเชือก',
    'โรงพยาบาลนาดูน',
    'โรงพยาบาลบรบือ',
    'โรงพยาบาลพยัคฆภูมิพิสัย',
    'โรงพยาบาลยางสีสุราช',
    'โรงพยาบาลวาปีปทุม',
    'โรงพยาบาลสุทธาเวช',
    'โรงพยาบาลร้อยเอ็ด',
    'โรงพยาบาลขอนแก่น',
    'โรงพยาบาลศรีนครินทร์'
];

interface HospitalSearchableSelectProps {
    label: string;
    selectedValue: string;
    onSelect: (value: string) => void;
    placeholder?: string;
}

export const HospitalSearchableSelect: React.FC<HospitalSearchableSelectProps> = ({ 
    label, 
    selectedValue, 
    onSelect, 
    placeholder = "ค้นหาหรือเลือกโรงพยาบาล..." 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Determine UI mode: Predefined, Other, or Empty
    const isOtherSelected = selectedValue !== '' && !HOSPITALS.includes(selectedValue);
    const displayValue = isOtherSelected ? 'อื่นๆ ระบุ' : selectedValue;

    useEffect(() => {
        setSearchTerm(displayValue);
    }, [displayValue]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(displayValue);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [displayValue]);

    const options = useMemo(() => [...HOSPITALS, 'อื่นๆ ระบุ'], []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm || searchTerm === displayValue) return options;
        return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm, displayValue]);

    const handleOptionClick = (opt: string) => {
        if (opt === 'อื่นๆ ระบุ') {
            onSelect(''); // Clear to let user type in the text field
        } else {
            onSelect(opt);
        }
        setIsOpen(false);
    };

    return (
        <div className="space-y-2" ref={wrapperRef}>
            <div className="relative">
                <label className={labelClass}>{label}</label>
                <div className="relative mt-1">
                    <input
                        type="text"
                        className={inputClass + " pr-10"}
                        placeholder={placeholder}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        autoComplete="off"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </div>
                </div>

                {isOpen && (
                    <ul className="absolute z-50 w-full bg-white shadow-xl max-h-60 rounded-xl py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none mt-1 border border-slate-100">
                        {filteredOptions.length === 0 ? (
                            <li className="px-4 py-2 text-slate-400 italic">ไม่พบตัวเลือก</li>
                        ) : (
                            filteredOptions.map((opt, idx) => (
                                <li
                                    key={`${opt}-${idx}`}
                                    className={`cursor-pointer select-none relative py-2.5 px-4 hover:bg-emerald-50 transition-colors ${opt === displayValue ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700'}`}
                                    onClick={() => handleOptionClick(opt)}
                                >
                                    {opt}
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            {/* If "Other" is active (either selected explicitly or current value isn't in list) */}
            {(isOtherSelected || (searchTerm === 'อื่นๆ ระบุ' && !isOpen)) && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block px-1">โปรดระบุชื่อโรงพยาบาลอื่นๆ</label>
                    <input
                        type="text"
                        className={inputClass}
                        placeholder="พิมพ์ชื่อโรงพยาบาล..."
                        value={isOtherSelected ? selectedValue : ''}
                        onChange={(e) => onSelect(e.target.value)}
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
};
