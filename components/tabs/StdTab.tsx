
import React, { useState, useEffect } from 'react';
import { Patient, StdRecord } from '../../types';
import { EditIcon, StdIcon, TrashIcon, ChevronDownIcon } from '../icons';
import { formatThaiDateBE, inputClass, labelClass, toLocalISOString } from '../utils';
import { DateInput } from '../DateInput';

interface StdTabProps {
    patient: Patient;
    onUpdatePatient: (patient: Patient) => void;
}

// 1. Standalone STDs (Single Checkbox)
const STD_STANDALONE = [
    'Gonorrhea', 
    'Non-Gonorrhea', 
    'PID', 
    'Trichomoniasis', 
    'HSV', 
    'Chancroid', 
    'LGV', 
    'Donovanosis', 
    'HPV'
];

// 2. Syphilis Options (Dropdown/Radio under Syphilis)
const SYPHILIS_OPTIONS = [
    'Primary Syphilis',
    'Secondary Syphilis',
    'Early Syphilis',
    'Late Latent Syphilis',
    'Neuro Syphilis',
    'Cardiovascular Syphilis',
    'Congenital Syphilis',
    'Syphilis (ไม่ทราบประเภท)'
];

// 3. Contact STD Options (Dropdown/Radio under Contact STD)
const CONTACT_STD_OPTIONS = [
    'Contact GC',
    'Contact Non-Gonorrhea',
    'Contact Syphilis',
    'Contact PID',
    'Contact Trichomoniasis',
    'Contact Chancroid',
    'Contact LGV',
    'Contact Other'
];

interface StdSelectionFormProps {
    selectedDiseases: Set<string>;
    onToggleDisease: (disease: string, isChecked: boolean) => void;
    
    // Syphilis State
    isSyphilisChecked: boolean;
    syphilisType: string;
    onToggleSyphilis: (isChecked: boolean) => void;
    onSyphilisTypeChange: (val: string) => void;

    // Contact STD State
    isContactChecked: boolean;
    contactType: string;
    onToggleContact: (isChecked: boolean) => void;
    onContactTypeChange: (val: string) => void;

    // Other State
    isOtherChecked: boolean;
    otherText: string;
    onToggleOther: (isChecked: boolean) => void;
    onOtherTextChange: (val: string) => void;
}

const StdSelectionForm: React.FC<StdSelectionFormProps> = ({
    selectedDiseases, onToggleDisease,
    isSyphilisChecked, syphilisType, onToggleSyphilis, onSyphilisTypeChange,
    isContactChecked, contactType, onToggleContact, onContactTypeChange,
    isOtherChecked, otherText, onToggleOther, onOtherTextChange
}) => {
    return (
        <div className="space-y-4">
            {/* Group 1: Standalone Diseases */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {STD_STANDALONE.map(disease => (
                    <div key={disease} className="flex items-center">
                        <input
                            type="checkbox"
                            id={`std-${disease}`}
                            checked={selectedDiseases.has(disease)}
                            onChange={(e) => onToggleDisease(disease, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor={`std-${disease}`} className="ml-2 text-sm text-gray-700">{disease}</label>
                    </div>
                ))}
            </div>

            <div className="border-t border-gray-100 my-2"></div>

            {/* Group 2: Syphilis Hierarchy */}
            <div className="bg-orange-50 p-3 rounded-md border border-orange-100">
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="std-syphilis-parent"
                        checked={isSyphilisChecked}
                        onChange={(e) => onToggleSyphilis(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="std-syphilis-parent" className="ml-2 text-sm font-semibold text-gray-800">Syphilis</label>
                </div>
                {isSyphilisChecked && (
                    <div className="mt-2 ml-6">
                        <label className="block text-xs text-gray-500 mb-1">ระบุประเภท Syphilis</label>
                        <select 
                            value={syphilisType} 
                            onChange={(e) => onSyphilisTypeChange(e.target.value)}
                            className={inputClass + " py-1.5 text-sm"}
                        >
                            <option value="">-- กรุณาเลือก --</option>
                            {SYPHILIS_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Group 3: Contact STD Hierarchy */}
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="std-contact-parent"
                        checked={isContactChecked}
                        onChange={(e) => onToggleContact(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="std-contact-parent" className="ml-2 text-sm font-semibold text-gray-800">Contact STD</label>
                </div>
                {isContactChecked && (
                    <div className="mt-2 ml-6">
                        <label className="block text-xs text-gray-500 mb-1">ระบุประเภท Contact</label>
                        <select 
                            value={contactType} 
                            onChange={(e) => onContactTypeChange(e.target.value)}
                            className={inputClass + " py-1.5 text-sm"}
                        >
                            <option value="">-- กรุณาเลือก --</option>
                            {CONTACT_STD_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="border-t border-gray-100 my-2"></div>

            {/* Group 4: Other */}
            <div>
                <div className="flex items-center">
                        <input type="checkbox" id="std-other-check" checked={isOtherChecked} onChange={e => onToggleOther(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                        <label htmlFor="std-other-check" className="ml-2 text-sm font-semibold text-gray-800">อื่นๆ</label>
                </div>
                {isOtherChecked && (
                    <div className="mt-2 pl-6">
                        <label htmlFor="std-other-text" className={labelClass}>ระบุโรคอื่นๆ</label>
                        <input type="text" id="std-other-text" value={otherText} onChange={e => onOtherTextChange(e.target.value)} className={inputClass} />
                    </div>
                )}
            </div>
        </div>
    );
}


const EditStdModal: React.FC<{
    isOpen: boolean;
    record: StdRecord | null;
    onClose: () => void;
    onSave: (record: StdRecord) => void;
}> = ({ isOpen, record, onClose, onSave }) => {
    const [date, setDate] = useState('');
    
    // Form States
    const [selectedDiseases, setSelectedDiseases] = useState<Set<string>>(new Set());
    
    const [isSyphilisChecked, setIsSyphilisChecked] = useState(false);
    const [syphilisType, setSyphilisType] = useState('');

    const [isContactChecked, setIsContactChecked] = useState(false);
    const [contactType, setContactType] = useState('');

    const [isOtherChecked, setIsOtherChecked] = useState(false);
    const [otherText, setOtherText] = useState('');

    useEffect(() => {
        if (record) {
            setDate(record.date);
            const newSelected = new Set<string>();
            let foundOther = false;
            let foundOtherText = '';
            
            let foundSyphilis = false;
            let foundSyphilisType = '';

            let foundContact = false;
            let foundContactType = '';

            record.diseases.forEach(d => {
                if (STD_STANDALONE.includes(d)) {
                    newSelected.add(d);
                } else if (SYPHILIS_OPTIONS.includes(d)) {
                    foundSyphilis = true;
                    foundSyphilisType = d;
                } else if (CONTACT_STD_OPTIONS.includes(d)) {
                    foundContact = true;
                    foundContactType = d;
                } else {
                    // Assuming anything else is 'Other'
                    foundOther = true;
                    foundOtherText = d;
                }
            });

            setSelectedDiseases(newSelected);
            
            setIsSyphilisChecked(foundSyphilis);
            setSyphilisType(foundSyphilisType);

            setIsContactChecked(foundContact);
            setContactType(foundContactType);

            setIsOtherChecked(foundOther);
            setOtherText(foundOtherText);
        }
    }, [record]);

    if (!isOpen || !record) return null;

    const handleToggleDisease = (disease: string, checked: boolean) => {
        setSelectedDiseases(prev => {
            const next = new Set(prev);
            if (checked) next.add(disease);
            else next.delete(disease);
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalDiseases = [...selectedDiseases];

        // Add Syphilis
        if (isSyphilisChecked) {
            if (syphilisType) finalDiseases.push(syphilisType);
            else {
                alert('กรุณาระบุประเภทของ Syphilis');
                return;
            }
        }

        // Add Contact
        if (isContactChecked) {
            if (contactType) finalDiseases.push(contactType);
            else {
                alert('กรุณาระบุประเภทของ Contact STD');
                return;
            }
        }

        // Add Other
        if (isOtherChecked && otherText.trim()) {
            finalDiseases.push(otherText.trim());
        }

        if (finalDiseases.length === 0) {
            alert('กรุณาเลือกโรคอย่างน้อย 1 รายการ');
            return;
        }

        onSave({ ...record, date, diseases: finalDiseases });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-semibold text-gray-800">แก้ไขข้อมูล STD</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                     <div>
                        <label htmlFor="stdDateEdit" className={labelClass}>วันที่</label>
                        <DateInput id="stdDateEdit" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    
                    <StdSelectionForm 
                        selectedDiseases={selectedDiseases}
                        onToggleDisease={handleToggleDisease}
                        isSyphilisChecked={isSyphilisChecked}
                        syphilisType={syphilisType}
                        onToggleSyphilis={setIsSyphilisChecked}
                        onSyphilisTypeChange={setSyphilisType}
                        isContactChecked={isContactChecked}
                        contactType={contactType}
                        onToggleContact={setIsContactChecked}
                        onContactTypeChange={setContactType}
                        isOtherChecked={isOtherChecked}
                        otherText={otherText}
                        onToggleOther={setIsOtherChecked}
                        onOtherTextChange={setOtherText}
                    />

                    <div className="flex justify-end gap-x-3 pt-4 border-t">
                       <button onClick={onClose} type="button" className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                           ยกเลิก
                       </button>
                       <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                           บันทึกการแก้ไข
                       </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const StdTab: React.FC<StdTabProps> = ({ patient, onUpdatePatient }) => {
    const [date, setDate] = useState(toLocalISOString(new Date()));
    
    // Form States
    const [selectedDiseases, setSelectedDiseases] = useState<Set<string>>(new Set());
    
    const [isSyphilisChecked, setIsSyphilisChecked] = useState(false);
    const [syphilisType, setSyphilisType] = useState('');

    const [isContactChecked, setIsContactChecked] = useState(false);
    const [contactType, setContactType] = useState('');

    const [isOtherChecked, setIsOtherChecked] = useState(false);
    const [otherText, setOtherText] = useState('');
    
    const [editingRecord, setEditingRecord] = useState<StdRecord | null>(null);

    const resetForm = () => {
        setDate(toLocalISOString(new Date()));
        setSelectedDiseases(new Set());
        setIsSyphilisChecked(false);
        setSyphilisType('');
        setIsContactChecked(false);
        setContactType('');
        setIsOtherChecked(false);
        setOtherText('');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            const updatedRecords = (patient.stdInfo?.records || []).filter(rec => rec.id !== id);
            onUpdatePatient({ ...patient, stdInfo: { records: updatedRecords } });
        }
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalDiseases = [...selectedDiseases];

        // Add Syphilis
        if (isSyphilisChecked) {
            if (syphilisType) finalDiseases.push(syphilisType);
            else {
                alert('กรุณาระบุประเภทของ Syphilis');
                return;
            }
        }

        // Add Contact
        if (isContactChecked) {
            if (contactType) finalDiseases.push(contactType);
            else {
                alert('กรุณาระบุประเภทของ Contact STD');
                return;
            }
        }

        // Add Other
        if (isOtherChecked && otherText.trim()) {
            finalDiseases.push(otherText.trim());
        }

        if (finalDiseases.length === 0) {
            alert('กรุณาเลือกโรคอย่างน้อย 1 รายการ');
            return;
        }

        const currentRecords = patient.stdInfo?.records || [];
        const newRecord: StdRecord = {
            id: `std-${Date.now()}`,
            date,
            diseases: finalDiseases
        };
        const updatedRecords = [...currentRecords, newRecord];

        onUpdatePatient({ ...patient, stdInfo: { records: updatedRecords } });
        resetForm();
    };
    
    const handleUpdateRecord = (updatedRecord: StdRecord) => {
        const currentRecords = patient.stdInfo?.records || [];
        const updatedRecords = currentRecords.map(rec => rec.id === updatedRecord.id ? updatedRecord : rec);
        onUpdatePatient({ ...patient, stdInfo: { records: updatedRecords } });
        setEditingRecord(null);
    }
    
    const handleToggleDisease = (disease: string, checked: boolean) => {
        setSelectedDiseases(prev => {
            const next = new Set(prev);
            if (checked) next.add(disease);
            else next.delete(disease);
            return next;
        });
    };

    const sortedRecords = [...(patient.stdInfo?.records || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Form */}
            <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">เพิ่มข้อมูล STD</h3>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="stdDate" className={labelClass}>วันที่</label>
                        <DateInput id="stdDate" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    
                    <div>
                        <label className={labelClass + " mb-2"}>เลือกโรคที่พบ</label>
                        <StdSelectionForm 
                            selectedDiseases={selectedDiseases}
                            onToggleDisease={handleToggleDisease}
                            isSyphilisChecked={isSyphilisChecked}
                            syphilisType={syphilisType}
                            onToggleSyphilis={setIsSyphilisChecked}
                            onSyphilisTypeChange={setSyphilisType}
                            isContactChecked={isContactChecked}
                            contactType={contactType}
                            onToggleContact={setIsContactChecked}
                            onContactTypeChange={setContactType}
                            isOtherChecked={isOtherChecked}
                            otherText={otherText}
                            onToggleOther={setIsOtherChecked}
                            onOtherTextChange={setOtherText}
                        />
                    </div>

                    <div className="flex justify-end gap-x-3 pt-4 border-t">
                       <button type="submit" className="w-full flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                           บันทึกข้อมูล
                       </button>
                    </div>
                </div>
            </form>

            {/* Right Column: History Timeline */}
             <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">ประวัติโรคติดต่อทางเพศสัมพันธ์</h3>
                {sortedRecords.length > 0 ? (
                    <div className="relative pl-5 max-h-[600px] overflow-y-auto pr-2">
                        <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200" aria-hidden="true"></div>
                        <div className="space-y-8">
                            {sortedRecords.map((record) => (
                                <div key={record.id} className="relative flex items-start group">
                                    <div className="absolute top-0 -left-5 z-10">
                                         <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600">
                                            <StdIcon />
                                        </div>
                                    </div>
                                    <div className="ml-8 flex-grow bg-white p-4 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold text-gray-900 text-md">วินิจฉัย STD</h3>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <span>{formatThaiDateBE(record.date)}</span>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingRecord(record); }} 
                                                    className="ml-3 p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" 
                                                    title="แก้ไข"
                                                >
                                                    <EditIcon className="h-4 w-4"/>
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(record.id); }} 
                                                    className="ml-1 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors relative z-20" 
                                                    title="ลบข้อมูล"
                                                >
                                                    <TrashIcon className="h-4 w-4 pointer-events-none"/>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-2 space-y-1">
                                            <ul className="list-disc list-inside">
                                                {record.diseases.map(d => <li key={d}>{d}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500">ยังไม่มีประวัติ</p>
                    </div>
                )}
            </div>

            <EditStdModal 
                isOpen={!!editingRecord}
                record={editingRecord}
                onClose={() => setEditingRecord(null)}
                onSave={handleUpdateRecord}
            />
        </div>
    );
};
