import React, { useState, useEffect } from 'react';
import { Patient, PregnancyRecord } from '../../types';
import { PlusIcon, TrashIcon, EditIcon } from '../icons';
import { formatThaiDateBE, inputClass, labelClass, textareaClass } from '../utils';

const calculateVlTestDate = (ga: string, gaDateStr: string): Date | null => {
    if (!ga || !gaDateStr || !/^\d+\+\d+$/.test(ga)) {
        return null;
    }
    
    const [weeks, days] = ga.split('+').map(Number);
    const measuredDate = new Date(gaDateStr);
    
    if (isNaN(measuredDate.getTime())) {
        return null;
    }

    const currentGestationInDays = weeks * 7 + days;
    const targetGestationInDays = 32 * 7;
    const daysUntilTarget = targetGestationInDays - currentGestationInDays;
    
    const targetDate = new Date(measuredDate);
    targetDate.setDate(targetDate.getDate() + daysUntilTarget);
    
    return targetDate;
};

const calculateCurrentGa = (currentGa: string, currentGaDateStr: string): { ga: string; weeks: number } | null => {
    if (!currentGa || !currentGaDateStr || !/^\d+\+\d+$/.test(currentGa)) return null;

    const [startWeeks, startDays] = currentGa.split('+').map(Number);
    const startDate = new Date(currentGaDateStr);
    const today = new Date();
    
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff < 0) return { ga: `${startWeeks}+${startDays}`, weeks: startWeeks };

    const totalStartDays = (startWeeks * 7) + startDays;
    const totalCurrentDays = totalStartDays + daysDiff;
    
    const currentWeeks = Math.floor(totalCurrentDays / 7);
    const currentRemainingDays = totalCurrentDays % 7;

    return { ga: `${currentWeeks}+${currentRemainingDays}`, weeks: currentWeeks };
};

const EditPregnancyModal: React.FC<{
    isOpen: boolean;
    record: PregnancyRecord | null;
    onClose: () => void;
    onSave: (record: PregnancyRecord) => void;
}> = ({ isOpen, record, onClose, onSave }) => {
    const [gaDate, setGaDate] = useState('');
    const [gaWeeks, setGaWeeks] = useState('');
    const [gaDays, setGaDays] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endReason, setEndReason] = useState('');

    useEffect(() => {
        if (record) {
            setGaDate(record.gaDate);
            const [w, d] = record.ga.split('+');
            setGaWeeks(w || '');
            setGaDays(d || '');
            setEndDate(record.endDate || '');
            setEndReason(record.endReason || '');
        }
    }, [record]);

    if (!isOpen || !record) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
         if (gaWeeks === '' || gaDays === '') {
            alert("กรุณาระบุอายุครรภ์ให้ครบถ้วน");
            return;
        }
        const weeks = parseInt(gaWeeks);
        const days = parseInt(gaDays);
         if (days < 0 || days > 6) {
             alert("จำนวนวันต้องอยู่ระหว่าง 0-6");
             return;
        }

        onSave({
            ...record,
            gaDate,
            ga: `${weeks}+${days}`,
            endDate: endDate || undefined,
            endReason: endReason || undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">แก้ไขข้อมูลการตั้งครรภ์</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                     <div>
                        <label className={labelClass}>วันที่มาตรวจ</label>
                        <input type="date" value={gaDate} onChange={e => setGaDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>อายุครรภ์ (GA)</label>
                         <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input type="number" min="0" value={gaWeeks} onChange={(e) => setGaWeeks(e.target.value)} className={inputClass} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pt-1">wk</span>
                            </div>
                            <span>+</span>
                            <div className="relative w-24">
                                <input type="number" min="0" max="6" value={gaDays} onChange={(e) => setGaDays(e.target.value)} className={inputClass} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pt-1">d</span>
                            </div>
                        </div>
                    </div>
                    <div className="pt-2 border-t mt-2">
                        <h4 className="text-sm font-semibold mb-2">ข้อมูลการสิ้นสุด (ถ้ามี)</h4>
                        <div className="space-y-2">
                            <div>
                                <label className={labelClass}>วันที่สิ้นสุด</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
                            </div>
                             <div>
                                <label className={labelClass}>เหตุผล</label>
                                <textarea value={endReason} onChange={e => setEndReason(e.target.value)} className={textareaClass} rows={2}></textarea>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                        <button type="submit" className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface PregnancyTabProps {
    patient: Patient;
    onUpdatePatient: (patient: Patient) => void;
}

export const PregnancyTab: React.FC<PregnancyTabProps> = ({ patient, onUpdatePatient }) => {
    const [gaWeeks, setGaWeeks] = useState('');
    const [gaDays, setGaDays] = useState('');
    const [gaDate, setGaDate] = useState(new Date().toISOString().split('T')[0]);
    const [isEnding, setIsEnding] = useState<PregnancyRecord | null>(null);
    const [endReason, setEndReason] = useState('');
    const [editingRecord, setEditingRecord] = useState<PregnancyRecord | null>(null);

    const activePregnancy = (patient.pregnancies || [])
        .filter(p => !p.endDate)
        .sort((a, b) => new Date(b.gaDate).getTime() - new Date(a.gaDate).getTime())[0];

    const sortedHistory = [...(patient.pregnancies || [])].sort((a,b) => new Date(b.gaDate).getTime() - new Date(a.gaDate).getTime());

    const handleAddPregnancy = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (gaWeeks === '' || gaDays === '') {
            alert("กรุณาระบุอายุครรภ์ให้ครบถ้วน (สัปดาห์และวัน)");
            return;
        }

        const weeks = parseInt(gaWeeks);
        const days = parseInt(gaDays);

        if (isNaN(weeks) || isNaN(days)) {
             alert("กรุณากรอกตัวเลขเท่านั้น");
             return;
        }
        
        if (days < 0 || days > 6) {
             alert("จำนวนวันต้องอยู่ระหว่าง 0-6");
             return;
        }

        const gaString = `${weeks}+${days}`;

        const newPregnancy: PregnancyRecord = { id: `preg-${Date.now()}`, ga: gaString, gaDate };
        const updatedPregnancies = [...(patient.pregnancies || []), newPregnancy];
        onUpdatePatient({ ...patient, pregnancies: updatedPregnancies });
        
        setGaWeeks('');
        setGaDays('');
        setGaDate(new Date().toISOString().split('T')[0]);
    };

    const handleUpdatePregnancy = (updatedRecord: PregnancyRecord) => {
        const updatedPregnancies = (patient.pregnancies || []).map(p => p.id === updatedRecord.id ? updatedRecord : p);
        onUpdatePatient({ ...patient, pregnancies: updatedPregnancies });
        setEditingRecord(null);
    };

    const handleDelete = (idToDelete: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการตั้งครรภ์นี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            const updatedPregnancies = (patient.pregnancies || []).filter(p => p.id !== idToDelete);
            onUpdatePatient({ ...patient, pregnancies: updatedPregnancies });
        }
    };
    
    const handleEndPregnancy = () => {
        if (!isEnding || !endReason.trim()) {
            alert('กรุณาระบุเหตุผลที่สิ้นสุดการตั้งครรภ์');
            return;
        }
        const updatedPregnancies = (patient.pregnancies || []).map(p => 
            p.id === isEnding.id 
            ? { ...p, endDate: new Date().toISOString().split('T')[0], endReason: endReason.trim() }
            : p
        );
        onUpdatePatient({ ...patient, pregnancies: updatedPregnancies });
        setIsEnding(null);
        setEndReason('');
    };

    const PregnancySummaryCard: React.FC<{ record: PregnancyRecord }> = ({ record }) => {
        const currentGaResult = !record.endDate ? calculateCurrentGa(record.ga, record.gaDate) : null;
        const vlTestDate = calculateVlTestDate(record.ga, record.gaDate);
        const isPregnancyCompleted = currentGaResult && currentGaResult.weeks > 42;

        return (
            <div className="bg-white p-4 rounded-lg border border-gray-200 group relative">
                 <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingRecord(record); }}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                        title="แก้ไข"
                    >
                        <EditIcon className="h-4 w-4" />
                    </button>
                    <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(record.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors relative z-20"
                        title="ลบข้อมูล"
                    >
                        <TrashIcon className="h-4 w-4 pointer-events-none" />
                    </button>
                </div>
                <p className="text-sm font-semibold text-gray-500">
                    บันทึกเมื่อ: {formatThaiDateBE(record.gaDate)} (GA: {record.ga})
                </p>

                {record.endDate ? (
                    <div className="mt-2 bg-gray-50 p-3 rounded-md">
                        <p className="font-bold text-gray-700">สิ้นสุดการตั้งครรภ์แล้ว</p>
                        <p className="text-sm text-gray-600">วันที่: {formatThaiDateBE(record.endDate)}</p>
                        <p className="text-sm text-gray-600">เหตุผล: {record.endReason}</p>
                    </div>
                ) : isPregnancyCompleted ? (
                    <div className="mt-2 bg-amber-50 p-3 rounded-md">
                        <p className="font-bold text-amber-800">ครบกำหนดคลอดแล้ว</p>
                    </div>
                ) : currentGaResult ? (
                    <div className="mt-2 space-y-2">
                        <div className="bg-emerald-50 p-3 rounded-md">
                            <p className="text-sm font-medium text-emerald-700">อายุครรภ์ปัจจุบัน</p>
                            <p className="text-2xl font-bold text-emerald-600">{currentGaResult.ga}</p>
                        </div>
                        {vlTestDate && (
                            <div className="bg-blue-50 p-3 rounded-md">
                                <p className="text-sm font-medium text-blue-700">นัดเจาะ HIV VL (GA 32 wk)</p>
                                <p className="text-lg font-bold text-blue-600">{formatThaiDateBE(vlTestDate.toISOString())}</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Form & Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
                <h3 className="text-xl font-semibold text-gray-800">บันทึกข้อมูลการตั้งครรภ์</h3>
                <form onSubmit={handleAddPregnancy} className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <div>
                        <label htmlFor="gaDate" className={labelClass}>วันที่มาตรวจ</label>
                        <input type="date" name="gaDate" id="gaDate" value={gaDate} onChange={(e) => setGaDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>
                            อายุครรภ์ (GA) <span className="text-gray-400 font-normal text-xs">(สัปดาห์ + วัน)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="สัปดาห์"
                                    value={gaWeeks} 
                                    onChange={(e) => setGaWeeks(e.target.value)} 
                                    className={inputClass} 
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none pt-1">wk</span>
                            </div>
                            <span className="text-gray-500 font-bold mt-1">+</span>
                            <div className="relative w-24">
                                <input 
                                    type="number" 
                                    min="0"
                                    max="6"
                                    placeholder="วัน"
                                    value={gaDays} 
                                    onChange={(e) => setGaDays(e.target.value)} 
                                    className={inputClass} 
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none pt-1">d</span>
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-x-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                        <PlusIcon className="h-4 w-4" /> เพิ่มบันทึกการตั้งครรภ์
                    </button>
                </form>

                {activePregnancy && !isEnding && (
                    <div className="pt-4 border-t">
                        <button onClick={() => setIsEnding(activePregnancy)} className="w-full text-left px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-200 rounded-lg hover:bg-red-200">
                            สิ้นสุดการตั้งครรภ์ (สำหรับรอบล่าสุด)
                        </button>
                    </div>
                )}
                
                {isEnding && (
                    <div className="pt-4 border-t space-y-3">
                        <h4 className="font-semibold text-gray-800">ระบุเหตุผลที่สิ้นสุดการตั้งครรภ์</h4>
                        <p className="text-sm text-gray-500">
                            สำหรับรอบวันที่ {formatThaiDateBE(isEnding.gaDate)} (GA {isEnding.ga})
                        </p>
                        <textarea value={endReason} onChange={(e) => setEndReason(e.target.value)} className={textareaClass} placeholder="เช่น คลอด, แท้ง, ..."></textarea>
                        <div className="flex justify-end gap-x-2">
                             <button onClick={() => setIsEnding(null)} className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                ยกเลิก
                            </button>
                            <button onClick={handleEndPregnancy} className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">
                                บันทึก
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: History */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">ประวัติและสรุปผลการตั้งครรภ์</h3>
                {sortedHistory.length > 0 ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {sortedHistory.map(rec => <PregnancySummaryCard key={rec.id} record={rec} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        ไม่มีประวัติการตั้งครรภ์
                    </div>
                )}
            </div>

            <EditPregnancyModal 
                isOpen={!!editingRecord} 
                record={editingRecord}
                onClose={() => setEditingRecord(null)}
                onSave={handleUpdatePregnancy}
            />
        </div>
    );
};