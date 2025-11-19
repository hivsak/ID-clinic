import React, { useState, useEffect } from 'react';
import { Patient, PrepRecord } from '../../types';
import { PlusIcon, TrashIcon, EditIcon } from '../icons';
import { formatThaiDateBE, inputClass, labelClass } from '../utils';

interface PrepTabProps {
    patient: Patient;
    onUpdatePatient: (patient: Patient) => void;
}

const EditPrepModal: React.FC<{
    isOpen: boolean;
    record: PrepRecord | null;
    onClose: () => void;
    onSave: (record: PrepRecord) => void;
}> = ({ isOpen, record, onClose, onSave }) => {
    const [dateStart, setDateStart] = useState('');
    const [dateStop, setDateStop] = useState('');

    useEffect(() => {
        if (record) {
            setDateStart(record.dateStart);
            setDateStop(record.dateStop || '');
        }
    }, [record]);

    if (!isOpen || !record) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">แก้ไขข้อมูล PrEP</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={labelClass}>วันที่เริ่มรับ PrEP</label>
                        <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>วันที่หยุดรับ PrEP (ถ้ามี)</label>
                        <input type="date" value={dateStop} onChange={e => setDateStop(e.target.value)} className={inputClass} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                        <button 
                            onClick={() => onSave({ ...record, dateStart, dateStop: dateStop || undefined })} 
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

export const PrepTab: React.FC<PrepTabProps> = ({ patient, onUpdatePatient }) => {
    const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [stopDateForLatest, setStopDateForLatest] = useState(new Date().toISOString().split('T')[0]);
    const [editingRecord, setEditingRecord] = useState<PrepRecord | null>(null);

    const sortedRecords = [...(patient.prepInfo?.records || [])].sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
    const latestRecord = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1] : null;

    const isCurrentlyOnPrep = latestRecord && !latestRecord.dateStop;
    
    const handleStartPrep = () => {
        if (!newStartDate) return;

        const newRecord: PrepRecord = {
            id: `prep-${Date.now()}`,
            dateStart: newStartDate,
        };
        
        const updatedRecords = [...(patient.prepInfo?.records || []), newRecord];
        onUpdatePatient({ ...patient, prepInfo: { records: updatedRecords } });
        setNewStartDate(new Date().toISOString().split('T')[0]);
    };
    
    const handleStopPrep = () => {
        if (!latestRecord || !stopDateForLatest) return;
        
        const updatedRecord = { ...latestRecord, dateStop: stopDateForLatest };
        const updatedRecords = (patient.prepInfo?.records || []).map(r => r.id === latestRecord.id ? updatedRecord : r);
        
        onUpdatePatient({ ...patient, prepInfo: { records: updatedRecords } });
    };

    const handleUpdatePrepRecord = (updatedRecord: PrepRecord) => {
        const updatedRecords = (patient.prepInfo?.records || []).map(r => r.id === updatedRecord.id ? updatedRecord : r);
        onUpdatePatient({ ...patient, prepInfo: { records: updatedRecords } });
        setEditingRecord(null);
    };

    const handleDeleteRecord = (id: string) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) return;
        const updatedRecords = (patient.prepInfo?.records || []).filter(r => r.id !== id);
        onUpdatePatient({ ...patient, prepInfo: { records: updatedRecords } });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Form */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">ลงข้อมูลการรับ PrEP</h3>
                
                {/* Action Form */}
                <div className="p-4 border rounded-md bg-gray-50 space-y-3">
                    {isCurrentlyOnPrep && latestRecord ? (
                        <>
                            <p className="font-semibold">หยุดรับ PrEP (สำหรับรอบปัจจุบัน)</p>
                            <div>
                                <label htmlFor="startDateDisplay" className={labelClass}>วันที่เริ่ม</label>
                                <input type="text" id="startDateDisplay" value={formatThaiDateBE(latestRecord.dateStart)} className={inputClass + " bg-gray-200"} readOnly />
                            </div>
                            <div>
                                <label htmlFor="stopDate" className={labelClass}>วันที่หยุดรับ PrEP</label>
                                <input type="date" id="stopDate" value={stopDateForLatest} onChange={e => setStopDateForLatest(e.target.value)} className={inputClass} />
                            </div>
                            <button onClick={handleStopPrep} className="w-full flex items-center justify-center gap-x-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700">
                                บันทึกวันที่หยุด
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold">เริ่มรับ PrEP รอบใหม่</p>
                            <div>
                                <label htmlFor="startDate" className={labelClass}>วันที่เริ่มรับ PrEP</label>
                                <input type="date" id="startDate" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className={inputClass} />
                            </div>
                            <button onClick={handleStartPrep} className="w-full flex items-center justify-center gap-x-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                                <PlusIcon className="h-4 w-4" /> บันทึกวันที่เริ่ม
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Right Column: Status Summary and History */}
            <div className="space-y-6">
                <div className={`p-6 rounded-lg shadow-sm border ${isCurrentlyOnPrep ? 'bg-emerald-50 border-emerald-200' : 'bg-white'}`}>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">สถานะ PrEP ปัจจุบัน</h3>
                    {isCurrentlyOnPrep && latestRecord ? (
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">อยู่ระหว่างการรับ PrEP</p>
                            <p className="text-gray-600 mt-2">
                                ตั้งแต่ {formatThaiDateBE(latestRecord.dateStart)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-500">ไม่ได้อยู่ระหว่างการรับ PrEP</p>
                    )}
                </div>

                {/* History */}
                 <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h4 className="font-semibold text-gray-800 mb-3">ประวัติการรับ PrEP ทั้งหมด</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {sortedRecords.length > 0 ? (
                            [...sortedRecords].reverse().map(rec => ( // reverse for chronological display
                                <div key={rec.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md text-sm group relative">
                                    <div className="flex-1">
                                        <p>
                                            <span className="font-medium text-gray-600">เริ่ม: </span> 
                                            <span className="text-gray-800">{formatThaiDateBE(rec.dateStart)}</span>
                                        </p>
                                        <p>
                                            <span className="font-medium text-gray-600">หยุด: </span>
                                            <span className="text-gray-800">{rec.dateStop ? formatThaiDateBE(rec.dateStop) : 'ยังไม่หยุด'}</span>
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
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteRecord(rec.id); }} 
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-1 relative z-20"
                                            title="ลบข้อมูล"
                                        >
                                            <TrashIcon className="h-4 w-4 pointer-events-none"/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">ไม่มีประวัติ</p>
                        )}
                    </div>
                </div>
            </div>

            <EditPrepModal 
                isOpen={!!editingRecord}
                record={editingRecord}
                onClose={() => setEditingRecord(null)}
                onSave={handleUpdatePrepRecord}
            />
        </div>
    );
};