
import React, { useState, useEffect } from 'react';
import { Patient } from '../../types';
import { inputClass } from '../utils';

interface UnderlyingDiseasesTabProps {
    patient: Patient;
    onUpdatePatient: (patient: Patient) => void;
}

const DISEASE_OPTIONS = [
    'โรคความดันโลหิตสูง (Hypertension)',
    'โรคเบาหวาน (Diabetes Mellitus)',
    'โรคไขมันในเลือดสูง (Dyslipidemia)',
    'โรคหัวใจขาดเลือด (Ischemic Heart Disease)',
    'โรคหลอดเลือดสมอง (Stroke)',
    'โรคไตเรื้อรัง (Chronic Kidney Disease)',
    'โรคระบบทางเดินหายใจเรื้อรัง (Asthma, COPD)',
    'โรคข้อเสื่อมและเก๊าท์ (Gout)',
    'โรคไทรอยด์เป็นพิษ (Hyperthyroid)',
    'โรคพร่องฮอร์โมนไทรอยด์ (Hypothyroid)',
    'โรคมะเร็ง (Cancer)',
];

export const UnderlyingDiseasesTab: React.FC<UnderlyingDiseasesTabProps> = ({ patient, onUpdatePatient }) => {
    const [selectedDiseases, setSelectedDiseases] = useState<Set<string>>(new Set());
    const [isOtherChecked, setIsOtherChecked] = useState(false);
    const [otherText, setOtherText] = useState('');
    const [isChanged, setIsChanged] = useState(false);

    useEffect(() => {
        const initialDiseases = new Set<string>();
        let foundOther = false;
        let otherStr = '';

        (patient.underlyingDiseases || []).forEach(d => {
            if (DISEASE_OPTIONS.includes(d)) {
                initialDiseases.add(d);
            } else if (d.startsWith('อื่นๆ: ')) {
                foundOther = true;
                otherStr = d.replace('อื่นๆ: ', '');
            }
        });

        setSelectedDiseases(initialDiseases);
        setIsOtherChecked(foundOther);
        setOtherText(otherStr);
        setIsChanged(false);
    }, [patient]);

    const handleCheckboxChange = (disease: string, checked: boolean) => {
        setSelectedDiseases(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(disease);
            } else {
                newSet.delete(disease);
            }
            return newSet;
        });
        setIsChanged(true);
    };

    const handleOtherCheckChange = (checked: boolean) => {
        setIsOtherChecked(checked);
        if (!checked) setOtherText('');
        setIsChanged(true);
    };

    const handleOtherTextChange = (val: string) => {
        setOtherText(val);
        setIsChanged(true);
    };

    const handleSave = () => {
        const finalDiseases = Array.from(selectedDiseases);
        if (isOtherChecked && otherText.trim()) {
            finalDiseases.push(`อื่นๆ: ${otherText.trim()}`);
        }
        
        onUpdatePatient({ ...patient, underlyingDiseases: finalDiseases });
        setIsChanged(false);
    };

    const displayDiseases = Array.from(selectedDiseases);
    if (isOtherChecked && otherText.trim()) {
        displayDiseases.push(`อื่นๆ: ${otherText.trim()}`);
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            {/* Left Column: Selection Form */}
            <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">เลือกโรคประจำตัว</h3>
                
                <div className="space-y-3 flex-grow overflow-y-auto max-h-[600px] pr-2">
                    {DISEASE_OPTIONS.map(disease => (
                        <label key={disease} className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedDiseases.has(disease)}
                                onChange={(e) => handleCheckboxChange(disease, e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="ml-3 text-gray-700">{disease}</span>
                        </label>
                    ))}

                    <div className="pt-2 border-t mt-2">
                         <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                            <input
                                type="checkbox"
                                checked={isOtherChecked}
                                onChange={(e) => handleOtherCheckChange(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="ml-3 text-gray-700 font-medium">อื่นๆ ระบุ (Other)</span>
                        </label>
                        {isOtherChecked && (
                            <div className="ml-9 mt-2">
                                <input 
                                    type="text" 
                                    value={otherText}
                                    onChange={(e) => handleOtherTextChange(e.target.value)}
                                    placeholder="ระบุโรคอื่นๆ..."
                                    className={inputClass}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end">
                    <button 
                        onClick={handleSave} 
                        disabled={!isChanged}
                        className={`px-6 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all ${isChanged ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        {isChanged ? 'บันทึกข้อมูล' : 'บันทึกแล้ว'}
                    </button>
                </div>
            </div>

            {/* Right Column: Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">สรุปโรคประจำตัว</h3>
                {displayDiseases.length > 0 ? (
                    <ul className="space-y-3">
                        {displayDiseases.map((d, idx) => (
                            <li key={idx} className="flex items-start p-3 bg-emerald-50 rounded-md border border-emerald-100 text-emerald-900">
                                <span className="mr-2">•</span>
                                <span>{d}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        <p>ไม่มีโรคประจำตัว</p>
                        <p className="text-sm mt-1">เลือกรายการจากฝั่งซ้าย</p>
                    </div>
                )}
            </div>
        </div>
    );
};
