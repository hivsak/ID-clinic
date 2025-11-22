
import React, { useState, useEffect, useRef } from 'react';
import { isoToThaiDateString, thaiDateStringToIso, inputClass } from './utils';

interface ThaiDateInputProps {
    value?: string; // ISO Date String (YYYY-MM-DD)
    onChange: (e: { target: { name: string; value: string; type?: string } }) => void;
    name?: string;
    id?: string;
    className?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    style?: React.CSSProperties;
}

export const ThaiDateInput: React.FC<ThaiDateInputProps> = ({
    value,
    onChange,
    name = '',
    id,
    className = inputClass,
    required = false,
    disabled = false,
    placeholder = "วว/ดด/ปปปป",
    style
}) => {
    const [displayValue, setDisplayValue] = useState('');
    const [error, setError] = useState(false);

    // Sync internal state with external value prop
    useEffect(() => {
        if (value) {
            const thaiDate = isoToThaiDateString(value);
            setDisplayValue(thaiDate);
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let inputValue = e.target.value;
        
        // Remove non-numeric chars except slash
        inputValue = inputValue.replace(/[^0-9/]/g, '');

        // Auto-add slashes
        if (inputValue.length === 2 && displayValue.length === 1) {
            inputValue += '/';
        } else if (inputValue.length === 5 && displayValue.length === 4) {
            inputValue += '/';
        }
        
        // Limit length to 10 (DD/MM/YYYY)
        if (inputValue.length > 10) {
            inputValue = inputValue.slice(0, 10);
        }

        setDisplayValue(inputValue);

        // If incomplete, do not trigger ISO update yet, OR send empty if cleared
        if (inputValue === '') {
            onChange({ target: { name, value: '' } });
            setError(false);
            return;
        }

        // Validate format and year range
        if (inputValue.length === 10) {
             const parts = inputValue.split('/');
             if (parts.length === 3) {
                 const day = parseInt(parts[0]);
                 const month = parseInt(parts[1]);
                 const yearBE = parseInt(parts[2]);

                 // Basic validation
                 const isValidDate = month >= 1 && month <= 12 && day >= 1 && day <= 31 && yearBE > 2400;
                 
                 if (isValidDate) {
                     const isoString = thaiDateStringToIso(inputValue);
                     onChange({ target: { name, value: isoString } });
                     setError(false);
                 } else {
                     setError(true);
                 }
             }
        }
    };
    
    const handleBlur = () => {
        if (displayValue.length > 0 && displayValue.length < 10) {
            setError(true);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                id={id}
                name={name}
                className={`${className} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                value={displayValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                style={style}
                maxLength={10}
                autoComplete="off"
            />
            {error && <p className="text-xs text-red-500 absolute -bottom-5 left-0">รูปแบบวันที่ไม่ถูกต้อง (วว/ดด/ปปปป)</p>}
        </div>
    );
};
