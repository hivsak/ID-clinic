
import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon } from './icons';
import { inputClass, formatThaiDateBE, toLocalISOString } from './utils';

interface TestHistoryCardProps<T extends {id: string; date: string} & Record<K, any>, K extends string> {
    title: string;
    records: T[];
    onAdd: (newRecord: { date: string } & Record<K, string>) => void;
    onDelete: (id: string) => void;
    onEdit?: (updatedRecord: T) => void;
    recordKey: K;
    resultLabel: string;
    resultInputType: 'text' | 'select';
    resultOptions?: string[];
    resultPlaceholder?: string;
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
}

const EditModal: React.FC<EditModalProps> = ({ 
    isOpen, record, onClose, onSave, recordKey, resultLabel, resultInputType, resultOptions, resultPlaceholder 
}) => {
    const [date, setDate] = useState('');
    const [result, setResult] = useState('');

    useEffect(() => {
        if (record) {
            setDate(record.date);
            setResult(record[recordKey]);
        }
    }, [record, recordKey]);

    if (!isOpen || !record) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...record, date, [recordKey]: result });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">แก้ไขข้อมูล</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">วันที่</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{resultLabel}</label>
                        {resultInputType === 'select' ? (
                            <select value={result} onChange={e => setResult(e.target.value)} className={inputClass}>
                                {resultOptions?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : (
                            <input type="text" value={result} onChange={e => setResult(e.target.value)} placeholder={resultPlaceholder} className={inputClass} />
                        )}
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

export const TestHistoryCard = <T extends {id: string; date: string} & Record<K, any>, K extends string>({
    title, records, onAdd, onDelete, onEdit, recordKey, resultLabel, resultInputType, resultOptions = [], resultPlaceholder
}: TestHistoryCardProps<T, K>) => {

    const [isAdding, setIsAdding] = useState(false);
    const [newDate, setNewDate] = useState(toLocalISOString(new Date()));
    const [newResult, setNewResult] = useState(resultInputType === 'select' ? (resultOptions[0] || '') : '');
    
    const [editingRecord, setEditingRecord] = useState<T | null>(null);

    const handleAddClick = () => {
        if (!newDate || !newResult) return;
        const recordPart = { [recordKey]: newResult } as Record<K, string>;
        const newRecord = { date: newDate, ...recordPart };
        onAdd(newRecord);
        // Reset form and close it
        setNewDate(toLocalISOString(new Date()));
        setNewResult(resultInputType === 'select' ? (resultOptions[0] || '') : '');
        setIsAdding(false);
    };

    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col">
            <div className="flex justify-between items-center pb-2">
                <h4 className="font-semibold text-gray-800">{title}</h4>
                <button 
                    type="button"
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-x-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 border border-emerald-200"
                >
                    <PlusIcon className="h-3 w-3" />
                    {isAdding ? 'ยกเลิก' : 'เพิ่มผล'}
                </button>
            </div>
            <div className="flex-grow mt-3 space-y-2 overflow-y-auto max-h-36 pr-2">
                {sortedRecords.length > 0 ? sortedRecords.map(rec => (
                    <div key={rec.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md text-sm group relative">
                        <span className="text-gray-500 w-24">{formatThaiDateBE(rec.date)}</span>
                        <span className="text-gray-800 font-medium truncate px-2 flex-1 text-right">{rec[recordKey]}</span>
                        <div className="flex items-center ml-2">
                            {onEdit && (
                                <button 
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingRecord(rec); }}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                    title="แก้ไข"
                                >
                                    <EditIcon className="h-4 w-4" />
                                </button>
                            )}
                            <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(rec.id); }} 
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-1 relative z-20"
                                title="ลบข้อมูล"
                            >
                                <TrashIcon className="h-4 w-4 pointer-events-none" />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-gray-400 text-center py-4">No results recorded.</p>
                    </div>
                )}
            </div>
            {isAdding && (
                <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex items-center gap-x-2">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500">Date</label>
                            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={inputClass + " py-1.5 text-sm"} />
                        </div>
                        <div className="flex-1">
                             <label className="text-xs text-gray-500">{resultLabel}</label>
                            {resultInputType === 'select' ? (
                                <select value={newResult} onChange={e => setNewResult(e.target.value)} className={inputClass + " py-1.5 text-sm"}>
                                    {resultOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : (
                                <input type="text" value={newResult} onChange={e => setNewResult(e.target.value)} placeholder={resultPlaceholder} className={inputClass + " py-1.5 text-sm"}/>
                            )}
                        </div>
                    </div>
                    <button type="button" onClick={handleAddClick} className="w-full flex items-center justify-center gap-x-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                        <PlusIcon className="h-4 w-4" /> บันทึกผล
                    </button>
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
            />
        </div>
    );
};
