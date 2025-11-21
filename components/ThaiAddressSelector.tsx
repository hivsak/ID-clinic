
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { labelClass } from './utils';
import { ChevronDownIcon } from './icons';

interface ThaiAddressSource {
    district: string; // Tambon
    amphoe: string;   // Amphoe
    province: string; // Changwat
    zipcode: number;
}

interface ThaiAddressSelectorProps {
    subdistrict: string;
    district: string;
    province: string;
    onChange: (key: 'subdistrict' | 'district' | 'province', value: string) => void;
}

// Cache data outside component to avoid re-fetching
let cachedData: ThaiAddressSource[] | null = null;

// --- Reusable Searchable Select Component ---
interface SearchableSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ label, value, onChange, options, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(value);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync internal search state with external value prop
    useEffect(() => {
        setSearch(value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                
                // Logic when clicking outside
                if (search === '') {
                     // If input is cleared, clear the value
                    if (value !== '') onChange('');
                } else if (search !== value) {
                    // If text differs from saved value
                    // Check for exact match in options (case-insensitive)
                    const exactMatch = options.find(o => o.toLowerCase() === search.toLowerCase());
                    if (exactMatch) {
                        onChange(exactMatch);
                        setSearch(exactMatch); // fix casing if needed
                    } else {
                        // No match, revert to saved value
                        setSearch(value);
                    }
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [value, search, onChange, options]);

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        // Simple includes check
        return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    const handleSelect = (opt: string) => {
        onChange(opt);
        setSearch(opt);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className={labelClass}>{label}</label>
            <div className="relative mt-1">
                <input
                    ref={inputRef}
                    type="text"
                    className={`block w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'text-gray-900'}`}
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                    autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </div>
            </div>

            {isOpen && !disabled && (
                <ul className="absolute z-20 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm mt-1">
                    {filteredOptions.length === 0 ? (
                        <li className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500 italic">
                            ไม่พบข้อมูล "{search}"
                        </li>
                    ) : (
                        filteredOptions.map((opt, idx) => (
                            <li
                                key={`${opt}-${idx}`}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-emerald-50 text-gray-900 ${opt === value ? 'bg-emerald-50 font-medium text-emerald-700' : ''}`}
                                onClick={() => handleSelect(opt)}
                            >
                                <span className="block truncate">
                                    {opt}
                                </span>
                                {opt === value && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-emerald-600">
                                       <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                       </svg>
                                    </span>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export const ThaiAddressSelector: React.FC<ThaiAddressSelectorProps> = ({ subdistrict, district, province, onChange }) => {
    const [data, setData] = useState<ThaiAddressSource[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (cachedData) {
            setData(cachedData);
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const response = await fetch('https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json');
                if (!response.ok) throw new Error('Failed to fetch address data');
                const json = await response.json();
                cachedData = json;
                setData(json);
            } catch (error) {
                console.error("Error loading Thai address data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const provinces = useMemo(() => {
        if (!data.length) return [];
        const unique = new Set(data.map(d => d.province));
        return Array.from(unique).sort((a, b) => a.localeCompare(b, 'th'));
    }, [data]);

    const amphoes = useMemo(() => {
        if (!province || !data.length) return [];
        const filtered = data.filter(d => d.province === province);
        const unique = new Set(filtered.map(d => d.amphoe));
        return Array.from(unique).sort((a, b) => a.localeCompare(b, 'th'));
    }, [data, province]);

    const tambons = useMemo(() => {
        if (!province || !district || !data.length) return [];
        const filtered = data.filter(d => d.province === province && d.amphoe === district);
        const unique = new Set(filtered.map(d => d.district)); // Note: source uses 'district' key for Tambon
        return Array.from(unique).sort((a, b) => a.localeCompare(b, 'th'));
    }, [data, province, district]);

    const handleProvinceChange = (val: string) => {
        onChange('province', val);
        onChange('district', ''); 
        onChange('subdistrict', ''); 
    };

    const handleDistrictChange = (val: string) => {
        onChange('district', val);
        onChange('subdistrict', ''); 
    };

    const handleSubdistrictChange = (val: string) => {
        onChange('subdistrict', val);
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                <div><label className={labelClass}>จังหวัด</label><div className="h-10 bg-gray-200 rounded mt-1"></div></div>
                <div><label className={labelClass}>อำเภอ</label><div className="h-10 bg-gray-200 rounded mt-1"></div></div>
                <div><label className={labelClass}>ตำบล</label><div className="h-10 bg-gray-200 rounded mt-1"></div></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SearchableSelect
                label="จังหวัด"
                value={province}
                onChange={handleProvinceChange}
                options={provinces}
                placeholder="ค้นหาจังหวัด..."
            />
            <SearchableSelect
                label="อำเภอ"
                value={district}
                onChange={handleDistrictChange}
                options={amphoes}
                disabled={!province}
                placeholder="ค้นหาอำเภอ..."
            />
            <SearchableSelect
                label="ตำบล"
                value={subdistrict}
                onChange={handleSubdistrictChange}
                options={tambons}
                disabled={!district}
                placeholder="ค้นหาตำบล..."
            />
        </div>
    );
};
