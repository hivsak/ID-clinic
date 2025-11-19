import React, { useState, useEffect } from 'react';
import { Patient, MedicalEvent, MedicalEventType } from '../../types';
import { DiagnosisIcon, ArtStartIcon, ProphylaxisIcon, MissedMedsIcon, ArtChangeIcon, InfectionIcon, LabResultIcon, OtherIcon, EditIcon, TrashIcon } from '../icons';
import { DisplayField, formatThaiDateBE, inputClass, labelClass, textareaClass } from '../utils';

// These definitions are copied from HivTreatmentTab as they are needed for the Add/Edit forms
const eventTypes = [
    { type: MedicalEventType.DIAGNOSIS, label: 'ได้รับการวินิจฉัย', color: 'bg-gray-500', icon: <DiagnosisIcon className="h-5 w-5 text-white" /> },
    { type: MedicalEventType.ART_START, label: 'เริ่มยา', color: 'bg-green-500', icon: <ArtStartIcon className="h-5 w-5 text-white" /> },
    { type: MedicalEventType.PROPHYLAXIS, label: 'การป้องกัน', color: 'bg-orange-500', icon: <ProphylaxisIcon className="h-5 w-5 text-white" /> },
    { type: MedicalEventType.MISSED_MEDS, label: 'ประวัติขาดยา', color: 'bg-rose-500', icon: <MissedMedsIcon className="h-5 w-5 text-white" /> },
    { type: MedicalEventType.ART_CHANGE, label: 'เปลี่ยนสูตรยา', color: 'bg-lime-500', icon: <ArtChangeIcon className="h-5 w-5 text-white" /> },
    { type: MedicalEventType.OPPORTUNISTIC_INFECTION, label: 'การติดเชื้อ', color: 'bg-red-500', icon: <InfectionIcon className="h-5 w-5 text-white" /> },
    { type: MedicalEventType.LAB_RESULT, label: 'CD4, Viral load', color: 'bg-sky-500', icon: <LabResultIcon className="h-5 w-5 text-white" /> },
    { type: MedicalEventType.OTHER, label: 'อื่นๆ', color: 'bg-yellow-500', icon: <OtherIcon className="h-5 w-5 text-white" /> },
];

const renderEventDetailForm = (type: MedicalEventType, details: Record<string, any>, handleDetailChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void) => {
    if (type === MedicalEventType.PROPHYLAXIS) {
         return (
             <div className="space-y-4">
                <div className="flex items-center"><input type="checkbox" name="TPT" id="tpt" checked={!!details.TPT} onChange={handleDetailChange} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" /><label htmlFor="tpt" className="ml-2 block text-sm text-gray-900">ให้ TPT</label></div>
                {details.TPT && (
                    <div>
                        <label htmlFor="tptRegimen" className={labelClass}>ระบุสูตร TPT</label>
                        <select name="สูตร TPT" id="tptRegimen" value={details['สูตร TPT'] || ''} onChange={handleDetailChange} className={inputClass}>
                            <option value="">-- เลือกสูตรยา --</option>
                            <option value="3HP">3HP</option>
                            <option value="1HP">1HP</option>
                            <option value="3HR">3HR</option>
                            <option value="6INH">6INH</option>
                            <option value="9INH">9INH</option>
                            <option value="4R">4R</option>
                        </select>
                    </div>
                )}
                <div className="flex items-center"><input type="checkbox" name="PJP Prophylaxis" id="pjp" checked={!!details['PJP Prophylaxis']} onChange={handleDetailChange} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" /><label htmlFor="pjp" className="ml-2 block text-sm text-gray-900">PJP Prophylaxis</label></div>
                <div><label htmlFor="other" className={labelClass}>อื่นๆ</label><input type="text" name="อื่นๆ" id="other" value={details['อื่นๆ'] || ''} onChange={handleDetailChange} className={inputClass} /></div>
            </div>
        );
    }
    return <p>This form is for Prophylaxis events only.</p>;
};

const EditEventModal: React.FC<{isOpen: boolean; event: MedicalEvent | null; onClose: () => void; onSave: (event: MedicalEvent) => void;}> = ({ isOpen, event, onClose, onSave }) => {
    const [formData, setFormData] = useState<MedicalEvent | null>(null);

    useEffect(() => {
        if (event) {
            setFormData({ ...event, date: event.date.split('T')[0] });
        }
    }, [event]);

    if (!isOpen || !event || !formData) return null;

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const newDetails = { ...formData.details, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value };
        setFormData(prev => prev ? { ...prev, details: newDetails } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><h3 className="text-xl font-semibold text-gray-800">Edit Prophylaxis Event</h3></div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="eventDateEdit" className={labelClass}>Date</label>
                            <input type="date" id="eventDateEdit" value={formData.date} onChange={(e) => setFormData(prev => prev ? { ...prev, date: e.target.value } : null)} className={inputClass} />
                        </div>
                        {renderEventDetailForm(MedicalEventType.PROPHYLAXIS, formData.details, handleDetailChange)}
                    </div>
                    <div className="p-6 border-t flex justify-end gap-x-3"><button onClick={onClose} type="button" className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button><button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Save Changes</button></div>
                </form>
            </div>
        </div>
    );
};

const AddEventForm: React.FC<{onSave: (event: Omit<MedicalEvent, 'id'>) => void; forceEventType: MedicalEventType; formTitle: string;}> = ({ onSave, forceEventType, formTitle }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [details, setDetails] = useState<Record<string, any>>({ TPT: true });

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setDetails(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const eventTypeInfo = eventTypes.find(et => et.type === forceEventType);
        const newEvent = { date, type: forceEventType, title: eventTypeInfo?.label || 'Event', details };
        onSave(newEvent);
        setDetails({ TPT: true });
        setDate(new Date().toISOString().split('T')[0]);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-emerald-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">{formTitle}</h3>
            <div className="space-y-6">
                <div><label htmlFor="eventDate" className={labelClass}>Date</label><input type="date" id="eventDate" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} style={{ maxWidth: '200px' }} /></div>
                <div>{renderEventDetailForm(forceEventType, details, handleDetailChange)}</div>
                <div className="flex justify-end pt-4"><button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Save Event</button></div>
            </div>
        </form>
    );
};

interface TPTTabProps {
    patient: Patient;
    onSaveEvent: (event: Omit<MedicalEvent, 'id'> | MedicalEvent) => void;
    onDeleteEvent: (eventId: string) => void;
}

export const TPTTab: React.FC<TPTTabProps> = ({ patient, onSaveEvent, onDeleteEvent }) => {
    const [eventToEdit, setEventToEdit] = useState<MedicalEvent | null>(null);

    const tptHistory = patient.medicalHistory
        .filter(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const tbHistory = patient.medicalHistory
        .filter(e => e.type === MedicalEventType.OPPORTUNISTIC_INFECTION && (e.details.infections?.includes('Tuberculosis')))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleSaveModal = (updatedEvent: MedicalEvent) => {
        onSaveEvent(updatedEvent);
        setEventToEdit(null);
    };

    const handleSaveNewEvent = (newEvent: Omit<MedicalEvent, 'id'>) => {
        onSaveEvent(newEvent);
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                 <AddEventForm
                    onSave={handleSaveNewEvent}
                    forceEventType={MedicalEventType.PROPHYLAXIS}
                    formTitle="เพิ่มประวัติการให้ TPT"
                />
            </div>
            <div className="space-y-6">
                 <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">ประวัติการให้ TPT</h3>
                    {tptHistory.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {tptHistory.map(event => (
                                <div key={event.id} className="p-3 bg-gray-50 rounded-md group flex justify-between items-center relative">
                                    <div>
                                        <p className="font-semibold text-gray-800">{event.details['สูตร TPT'] || 'N/A'}</p>
                                        <p className="text-sm text-gray-500">วันที่เริ่ม: {formatThaiDateBE(event.date)}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <button 
                                            type="button"
                                            onClick={() => setEventToEdit(event)} 
                                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" 
                                            aria-label="Edit TPT event"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteEvent(event.id); }} 
                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-1 relative z-20" 
                                            aria-label="Delete TPT event"
                                            title="ลบข้อมูล"
                                        >
                                            <TrashIcon className="h-4 w-4 pointer-events-none" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">ยังไม่มีประวัติการให้ TPT</p>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">ประวัติการป่วยเป็นวัณโรค (TB)</h3>
                    {tbHistory.length > 0 ? (
                        <ul className="space-y-2">
                            {tbHistory.map(event => (
                                <li key={event.id} className="p-2 bg-gray-50 rounded-md">
                                    วินิจฉัยเมื่อวันที่: {formatThaiDateBE(event.date)}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">ไม่มีประวัติการป่วยเป็นวัณโรค</p>
                    )}
                </div>
            </div>
             <EditEventModal
                isOpen={!!eventToEdit}
                event={eventToEdit}
                onClose={() => setEventToEdit(null)}
                onSave={handleSaveModal}
            />
        </div>
    );
};