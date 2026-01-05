
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { labelClass, inputClass } from './utils';
import { ChevronDownIcon } from './icons';

export const HEALTHCARE_SCHEMES = [
    'บัตรทอง ในเขต',
    'บัตรทอง นอกเขต',
    'ประกันสังคม ในเขต',
    'ประกันสังคม นอกเขต',
    'จ่ายตรง กรมบัญชีกลาง',
    'จ่ายตรง ท้องถิ่น',
    'ชำระเงินเอง'
];

interface HealthcareSchemeSearchableSelectProps {
    label: string;
    selectedValue: string;
    onSelect: (value: string) => void;
    placeholder?: string;
}

export const HealthcareSchemeSearchableSelect: React.FC<HealthcareSchemeSearchableSelectProps> = ({ 
    label, 
    selectedValue, 
    onSelect, 
    placeholder = "ค้นหาหรือเลือกสิทธิการรักษา..." 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isManualMode, setIsManualMode] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // ตรวจสอบว่าค่าปัจจุบันคือค่าที่มีในรายการหรือไม่
    const isInList = useMemo(() => HEALTHCARE_SCHEMES.includes(selectedValue), [selectedValue]);

    useEffect(() => {
        if (selectedValue !== '' && !isInList) {
            setIsManualMode(true);
            setSearchTerm('อื่นๆ ระบุ');
        } else {
            setSearchTerm(selectedValue);
            if (selectedValue !== '') setIsManualMode(false);
        }
    }, [selectedValue, isInList]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(isManualMode ? 'อื่นๆ ระบุ' : selectedValue);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [selectedValue, isManualMode]);

    const options = useMemo(() => [...HEALTHCARE_SCHEMES, 'อื่นๆ ระบุ'], []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm || searchTerm === selectedValue || (isManualMode && searchTerm === 'อื่นๆ ระบุ')) return options;
        return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm, selectedValue, isManualMode]);

    const handleOptionClick = (opt: string) => {
        if (opt === 'อื่นๆ ระบุ') {
            setIsManualMode(true);
            onSelect('');
        } else {
            setIsManualMode(false);
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
                                    className={`cursor-pointer select-none relative py-2.5 px-4 hover:bg-emerald-50 transition-colors ${((opt === 'อื่นๆ ระบุ' && isManualMode) || (opt === selectedValue && !isManualMode)) ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700'}`}
                                    onClick={() => handleOptionClick(opt)}
                                >
                                    {opt}
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            {isManualMode && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 ring-1 ring-emerald-500/10">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1.5 block px-1 tracking-wider">โปรดระบุสิทธิการรักษา</label>
                    <input
                        type="text"
                        className={inputClass + " border-emerald-200 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"}
                        placeholder="ระบุสิทธิการรักษาที่นี่..."
                        value={selectedValue}
                        onChange={(e) => onSelect(e.target.value)}
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
};
