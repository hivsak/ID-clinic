
import React, { useState, useEffect } from 'react';
import { Patient, PepRecord } from '../../types';
import { PlusIcon, TrashIcon, EditIcon } from '../icons';
import { formatThaiDateBE, inputClass, labelClass, toLocalISOString } from '../utils';
import { DateInput } from '../DateInput';

interface PepTabProps {
    patient: Patient;
    onUpdatePatient: (patient: Patient) => void;
}

type PepType = 'oPEP' | 'nPEP';

const EditPepModal: React.FC<{
    isOpen: boolean;
    record: PepRecord | null;
    onClose: () => void;
    onSave: (record: PepRecord) => void;
}> = ({ isOpen, record, onClose, onSave }) => {
    const [date, setDate] = useState('');
    const [type, setType] = useState<PepType>('nPEP');

    useEffect(() => {
        if (record) {
            setDate(record.date);
            setType(record.type || 'nPEP');
        }
    }, [record]);

    if (!isOpen || !record) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">แก้ไขข้อมูล PEP</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={labelClass}>วันที่มาตรวจ</label>
                        <DateInput value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>ประเภท PEP</label>
                        <div className="flex gap-4 mt-2">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="pepTypeEdit" 
                                    value="nPEP" 
                                    checked={type === 'nPEP'} 
                                    onChange={() => setType('nPEP')}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">nPEP</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="pepTypeEdit" 
                                    value="oPEP" 
                                    checked={type === 'oPEP'} 
                                    onChange={() => setType('oPEP')}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">oPEP</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                        <button 
                            onClick={() => onSave({ ...record, date, type })} 
                            className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                            บันทึก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PepTab: React.FC<PepTabProps> = ({ patient, onUpdatePatient }) => {
    const [newDate, setNewDate] = useState(toLocalISOString(new Date()));
    const [newType, setNewType] = useState<PepType>('nPEP');
    const [editingRecord, setEditingRecord] = useState<PepRecord | null>(null);

    const handleAddPepRecord = () => {
        if (!newDate) return;

        const newRecord: PepRecord = {
            id: `pep-${Date.now()}`,
            date: newDate,
            type: newType,
        };
        
        const updatedRecords = [...(patient.pepInfo?.records || []), newRecord];
        onUpdatePatient({ ...patient, pepInfo: { records: updatedRecords } });
        setNewDate(toLocalISOString(new Date()));
        setNewType('nPEP'); // Reset to default
    };

    const handleUpdatePepRecord = (updatedRecord: PepRecord) => {
        const updatedRecords = (patient.pepInfo?.records || []).map(r => r.id === updatedRecord.id ? updatedRecord : r);
        onUpdatePatient({ ...patient, pepInfo: { records: updatedRecords } });
        setEditingRecord(null);
    };

    const handleDeletePepRecord = (id: string) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) return;
        const updatedRecords = (patient.pepInfo?.records || []).filter(r => r.id !== id);
        onUpdatePatient({ ...patient, pepInfo: { records: updatedRecords } });
    };

    const sortedRecords = [...(patient.pepInfo?.records || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Form */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">บันทึกประวัติการรับ PEP</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="pepDate" className={labelClass}>วันที่มาตรวจ</label>
                        <DateInput id="pepDate" value={newDate} onChange={e => setNewDate(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>ประเภท PEP</label>
                        <div className="flex gap-4 mt-2">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="pepType" 
                                    value="nPEP" 
                                    checked={newType === 'nPEP'} 
                                    onChange={() => setNewType('nPEP')}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">nPEP</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="pepType" 
                                    value="oPEP" 
                                    checked={newType === 'oPEP'} 
                                    onChange={() => setNewType('oPEP')}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">oPEP</span>
                            </label>
                        </div>
                    </div>
                    <button onClick={handleAddPepRecord} className="w-full flex items-center justify-center gap-x-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                        <PlusIcon className="h-4 w-4" /> บันทึกข้อมูล
                    </button>
                </div>
            </div>

            {/* Right Column: History */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">
                    ประวัติการรับ PEP ({sortedRecords.length} ครั้ง)
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {sortedRecords.length > 0 ? (
                        sortedRecords.map(rec => (
                            <div key={rec.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md text-sm group relative">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${rec.type === 'oPEP' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {rec.type || 'nPEP'}
                                        </span>
                                    </div>
                                    <p className="text-gray-600">
                                        วันที่: <span className="font-medium text-gray-800">{formatThaiDateBE(rec.date)}</span>
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingRecord(rec); }} 
                                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors ml-2"
                                        title="แก้ไข"
                                    >
                                        <EditIcon className="h-4 w-4"/>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePepRecord(rec.id); }} 
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-1 relative z-20" 
                                        title="ลบข้อมูล"
                                    >
                                        <TrashIcon className="h-4 w-4 pointer-events-none"/>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">ไม่มีประวัติการรับ PEP</p>
                    )}
                </div>
            </div>
            
            <EditPepModal 
                isOpen={!!editingRecord}
                record={editingRecord}
                onClose={() => setEditingRecord(null)}
                onSave={handleUpdatePepRecord}
            />
        </div>
    );
};
