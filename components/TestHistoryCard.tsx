
import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon } from './icons';
import { inputClass, formatThaiDateBE, toLocalISOString } from './utils';
import { DateInput } from './DateInput';

interface TestHistoryCardProps<T extends {id: string; date: string} & Record<K, any> & Record<S, any>, K extends string, S extends string> {
    title: string;
    records: T[];
    onAdd: (newRecord: { date: string } & Record<K, string> & Partial<Record<S, string>>) => void;
    onDelete: (id: string) => void;
    onEdit?: (updatedRecord: T) => void;
    recordKey: K;
    resultLabel: string;
    resultInputType: 'text' | 'select';
    resultOptions?: string[];
    resultPlaceholder?: string;
    // Secondary field support (e.g. for HCV Type)
    secondaryKey?: S;
    secondaryLabel?: string;
    secondaryOptions?: string[];
}

interface EditModalProps {
    isOpen: boolean;
    record: any;
    onClose: () => void;
    onSave: (data: any) => void;
    recordKey: string;
    resultLabel: string;
    resultInputType: 'text' | 'select';
    resultOptions?: string[];
    resultPlaceholder?: string;
    secondaryKey?: string;
    secondaryLabel?: string;
    secondaryOptions?: string[];
}

const EditModal: React.FC<EditModalProps> = ({ 
    isOpen, record, onClose, onSave, recordKey, resultLabel, resultInputType, resultOptions, resultPlaceholder,
    secondaryKey, secondaryLabel, secondaryOptions
}) => {
    const [date, setDate] = useState('');
    const [result, setResult] = useState('');
    const [secondary, setSecondary] = useState('');

    useEffect(() => {
        if (record) {
            setDate(record.date);
            setResult(record[recordKey]);
            if (secondaryKey) setSecondary(record[secondaryKey]);
        }
    }, [record, recordKey, secondaryKey]);

    if (!isOpen || !record) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedData = { ...record, date, [recordKey]: result };
        if (secondaryKey) updatedData[secondaryKey] = secondary;
        onSave(updatedData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-lg">แก้ไขข้อมูล</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">วันที่</label>
                        <DateInput value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    {secondaryKey && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{secondaryLabel}</label>
                            <select value={secondary} onChange={e => setSecondary(e.target.value)} className={inputClass}>
                                {secondaryOptions?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">{resultLabel}</label>
                        {resultInputType === 'select' ? (
                            <select value={result} onChange={e => setResult(e.target.value)} className={inputClass}>
                                {resultOptions?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : (
                            <input type="text" value={result} onChange={e => setResult(e.target.value)} placeholder={resultPlaceholder} className={inputClass} />
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">ยกเลิก</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-colors">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const TestHistoryCard = <T extends {id: string; date: string} & Record<K, any> & Record<S, any>, K extends string, S extends string>({
    title, records, onAdd, onDelete, onEdit, recordKey, resultLabel, resultInputType, resultOptions = [], resultPlaceholder,
    secondaryKey, secondaryLabel, secondaryOptions = []
}: TestHistoryCardProps<T, K, S>) => {

    const [isAdding, setIsAdding] = useState(false);
    const [newDate, setNewDate] = useState(toLocalISOString(new Date()));
    const [newResult, setNewResult] = useState(resultInputType === 'select' ? (resultOptions[0] || '') : '');
    const [newSecondary, setNewSecondary] = useState(secondaryOptions[0] || '');
    
    const [editingRecord, setEditingRecord] = useState<T | null>(null);

    const handleAddClick = () => {
        if (!newDate || !newResult) return;
        const recordPart = { 
            [recordKey]: newResult,
            ...(secondaryKey ? { [secondaryKey]: newSecondary } : {})
        } as Record<K, string> & Record<S, string>;
        
        onAdd({ date: newDate, ...recordPart });
        
        // Reset
        setNewDate(toLocalISOString(new Date()));
        setNewResult(resultInputType === 'select' ? (resultOptions[0] || '') : '');
        setNewSecondary(secondaryOptions[0] || '');
        setIsAdding(false);
    };

    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-2">
                <h4 className="font-bold text-slate-800">{title}</h4>
                <button 
                    type="button"
                    onClick={() => setIsAdding(!isAdding)}
                    className={`flex items-center gap-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${isAdding ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
                >
                    <PlusIcon className="h-3.5 w-3.5" />
                    {isAdding ? 'ยกเลิก' : 'เพิ่มผล'}
                </button>
            </div>
            
            <div className="flex-grow space-y-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
                {sortedRecords.length > 0 ? sortedRecords.map(rec => (
                    <div key={rec.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-transparent hover:border-slate-200 transition-colors group">
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-400">{formatThaiDateBE(rec.date)}</span>
                            <span className="text-sm font-medium text-slate-800">
                                {secondaryKey ? <><span className="text-slate-500 font-normal">{rec[secondaryKey]}: </span>{rec[recordKey]}</> : rec[recordKey]}
                            </span>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {onEdit && (
                                <button 
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingRecord(rec); }}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                    title="แก้ไข"
                                >
                                    <EditIcon className="h-4 w-4" />
                                </button>
                            )}
                            <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(rec.id); }} 
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-1"
                                title="ลบข้อมูล"
                            >
                                <TrashIcon className="h-4 w-4 pointer-events-none" />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
                        <p className="text-xs text-slate-400 text-center">ยังไม่มีข้อมูล</p>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">วันที่</label>
                            <DateInput value={newDate} onChange={e => setNewDate(e.target.value)} className="text-sm py-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {secondaryKey && (
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">{secondaryLabel}</label>
                                    <select value={newSecondary} onChange={e => setNewSecondary(e.target.value)} className={inputClass + " text-sm py-2"}>
                                        {secondaryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className={secondaryKey ? "" : "col-span-2"}>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">{resultLabel}</label>
                                {resultInputType === 'select' ? (
                                    <select value={newResult} onChange={e => setNewResult(e.target.value)} className={inputClass + " text-sm py-2"}>
                                        {resultOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" value={newResult} onChange={e => setNewResult(e.target.value)} placeholder={resultPlaceholder} className={inputClass + " text-sm py-2"}/>
                                )}
                            </div>
                        </div>
                        <button type="button" onClick={handleAddClick} className="w-full flex items-center justify-center gap-x-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm transition-all">
                            <PlusIcon className="h-4 w-4" /> บันทึก
                        </button>
                    </div>
                </div>
            )}

            <EditModal 
                isOpen={!!editingRecord}
                record={editingRecord}
                onClose={() => setEditingRecord(null)}
                onSave={(updated) => {
                    if(onEdit) onEdit(updated);
                    setEditingRecord(null);
                }}
                recordKey={recordKey}
                resultLabel={resultLabel}
                resultInputType={resultInputType}
                resultOptions={resultOptions}
                resultPlaceholder={resultPlaceholder}
                secondaryKey={secondaryKey}
                secondaryLabel={secondaryLabel}
                secondaryOptions={secondaryOptions}
            />
        </div>
    );
};
