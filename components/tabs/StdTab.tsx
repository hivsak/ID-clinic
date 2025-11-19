import React, { useState, useEffect } from 'react';
import { Patient, StdRecord } from '../../types';
import { EditIcon, StdIcon, TrashIcon } from '../icons';
import { formatThaiDateBE, inputClass, labelClass } from '../utils';

interface StdTabProps {
    patient: Patient;
    onUpdatePatient: (patient: Patient) => void;
}

const stdDiseaseList = [
    'Gonorrhea', 'Non-Gonorrhea', 'PID', 'Trichomoniasis', 'HSV', 'Chancroid',
    'Primary Syphilis', 'Secondary Syphilis', 'Early Syphilis', 'Late latent syphilis',
    'LGV', 'Donovanosis', 'HPV', 'Contact GC', 'Contact Non-Gonorrhea', 'Contact Syphilis'
];

const EditStdModal: React.FC<{
    isOpen: boolean;
    record: StdRecord | null;
    onClose: () => void;
    onSave: (record: StdRecord) => void;
}> = ({ isOpen, record, onClose, onSave }) => {
    const [date, setDate] = useState('');
    const [selectedDiseases, setSelectedDiseases] = useState<Set<string>>(new Set());
    const [isOtherChecked, setIsOtherChecked] = useState(false);
    const [otherDiseaseText, setOtherDiseaseText] = useState('');

    useEffect(() => {
        if (record) {
            setDate(record.date);
            const newSelectedDiseases = new Set<string>();
            let otherText = '';
            let otherChecked = false;

            record.diseases.forEach(disease => {
                if (stdDiseaseList.includes(disease)) {
                    newSelectedDiseases.add(disease);
                } else {
                    otherChecked = true;
                    otherText = disease;
                }
            });

            setSelectedDiseases(newSelectedDiseases);
            setIsOtherChecked(otherChecked);
            setOtherDiseaseText(otherText);
        }
    }, [record]);

    if (!isOpen || !record) return null;

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
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalDiseases = [...selectedDiseases];
        if (isOtherChecked && otherDiseaseText.trim()) {
            finalDiseases.push(otherDiseaseText.trim());
        }
        if (finalDiseases.length === 0) return; // Prevent empty save

        onSave({ ...record, date, diseases: finalDiseases });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                    <h3 className="text-xl font-semibold text-gray-800">แก้ไขข้อมูล STD</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                     <div>
                        <label htmlFor="stdDateEdit" className={labelClass}>วันที่</label>
                        <input type="date" id="stdDateEdit" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} style={{ maxWidth: '200px' }} />
                    </div>
                    <div>
                        <label className={labelClass}>โรค (เลือกได้หลายข้อ)</label>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                            {stdDiseaseList.map(disease => (
                                <div key={disease} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`std-edit-${disease}`}
                                        checked={selectedDiseases.has(disease)}
                                        onChange={(e) => handleCheckboxChange(disease, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <label htmlFor={`std-edit-${disease}`} className="ml-2 text-sm text-gray-700">{disease}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="pt-2 border-t mt-4">
                        <div className="flex items-center">
                             <input type="checkbox" id="std-other-check-edit" checked={isOtherChecked} onChange={e => setIsOtherChecked(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                             <label htmlFor="std-other-check-edit" className="ml-2 text-sm font-semibold text-gray-800">อื่นๆ</label>
                        </div>
                        {isOtherChecked && (
                           <div className="mt-2 pl-6">
                               <label htmlFor="std-other-text-edit" className={labelClass}>ระบุโรคอื่นๆ</label>
                               <input type="text" id="std-other-text-edit" value={otherDiseaseText} onChange={e => setOtherDiseaseText(e.target.value)} className={inputClass} />
                           </div>
                        )}
                    </div>
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
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDiseases, setSelectedDiseases] = useState<Set<string>>(new Set());
    const [isOtherChecked, setIsOtherChecked] = useState(false);
    const [otherDiseaseText, setOtherDiseaseText] = useState('');
    
    const [editingRecord, setEditingRecord] = useState<StdRecord | null>(null);

    const resetForm = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedDiseases(new Set());
        setIsOtherChecked(false);
        setOtherDiseaseText('');
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
        if (isOtherChecked && otherDiseaseText.trim()) {
            finalDiseases.push(otherDiseaseText.trim());
        }

        if (finalDiseases.length === 0) return;

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
                        <input type="date" id="stdDate" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} style={{ maxWidth: '200px' }} />
                    </div>
                    <div>
                        <label className={labelClass}>โรค (เลือกได้หลายข้อ)</label>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                            {stdDiseaseList.map(disease => (
                                <div key={disease} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`std-${disease}`}
                                        checked={selectedDiseases.has(disease)}
                                        onChange={(e) => handleCheckboxChange(disease, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <label htmlFor={`std-${disease}`} className="ml-2 text-sm text-gray-700">{disease}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="pt-2 border-t mt-4">
                        <div className="flex items-center">
                             <input type="checkbox" id="std-other-check" checked={isOtherChecked} onChange={e => setIsOtherChecked(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                             <label htmlFor="std-other-check" className="ml-2 text-sm font-semibold text-gray-800">อื่นๆ</label>
                        </div>
                        {isOtherChecked && (
                           <div className="mt-2 pl-6">
                               <label htmlFor="std-other-text" className={labelClass}>ระบุโรคอื่นๆ</label>
                               <input type="text" id="std-other-text" value={otherDiseaseText} onChange={e => setOtherDiseaseText(e.target.value)} className={inputClass} />
                           </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-x-3 pt-4 border-t">
                       <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
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