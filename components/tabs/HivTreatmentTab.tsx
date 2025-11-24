
import React, { useState, useEffect } from 'react';
import { Patient, MedicalEvent, MedicalEventType } from '../../types';
import { 
    ArtChangeIcon, MissedMedsIcon, InfectionIcon, ArtStartIcon, DiagnosisIcon, 
    ProphylaxisIcon, LabResultIcon, OtherIcon, PlusIcon, EditIcon, TrashIcon
} from '../icons';
import { inputClass, labelClass, textareaClass, formatThaiDateBE, toLocalISOString } from '../utils';
import { DateInput } from '../DateInput';

// --- ARV Constants & Helper Components ---

const ARV_DRUGS = [
    'TDF', 'TAF', 'AZT', 'ABC', '3TC', 'FTC', 'DTG', 
    'DRV/r', 'DRV/c', 'RPV', 'EFV', 'NVP', 'D4T', 
    'BIC', 'RAL', 'LPV/r', 'ATV/r'
];

const ARV_SHORTCUTS = [
    { label: 'TLD', drugs: ['TDF', '3TC', 'DTG'] },
    { label: 'Kocitaf', drugs: ['TAF', 'FTC', 'DTG'] },
    { label: 'Goivir-T', drugs: ['TDF', 'FTC', 'EFV'] },
    { label: 'Zilavir', drugs: ['AZT', '3TC'] },
    { label: 'Teno-EM', drugs: ['TDF', 'FTC'] },
];

interface ArvRegimenSelectorProps {
    value: string;
    onChange: (newValue: string) => void;
    name: string;
}

const ArvRegimenSelector: React.FC<ArvRegimenSelectorProps> = ({ value, onChange, name }) => {
    // Parse current string "A + B" into array ["A", "B"]
    const selectedDrugs = value ? value.split(' + ').filter(d => d.trim() !== '') : [];

    const handleAddDrug = (drug: string) => {
        if (selectedDrugs.length >= 5) return;
        const newDrugs = [...selectedDrugs, drug];
        onChange(newDrugs.join(' + '));
    };

    const handleRemoveDrug = (index: number) => {
        const newDrugs = [...selectedDrugs];
        newDrugs.splice(index, 1);
        onChange(newDrugs.join(' + '));
    };

    const handleShortcut = (drugs: string[]) => {
        onChange(drugs.join(' + '));
    };

    // Filter out drugs already selected
    const availableDrugs = ARV_DRUGS.filter(d => !selectedDrugs.includes(d));

    return (
        <div className="space-y-3">
            {/* Shortcuts */}
            <div className="flex flex-wrap gap-2">
                {ARV_SHORTCUTS.map(sc => (
                    <button
                        key={sc.label}
                        type="button"
                        onClick={() => handleShortcut(sc.drugs)}
                        className="px-3 py-1 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-full transition-colors shadow-sm"
                    >
                        {sc.label}
                    </button>
                ))}
            </div>

            {/* Selected Drugs Tags (The "Slots") */}
            <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-gray-50 border border-gray-300 rounded-md items-center">
                {selectedDrugs.length === 0 && <span className="text-gray-400 text-sm italic ml-1">ยังไม่ได้เลือกยา...</span>}
                {selectedDrugs.map((drug, idx) => (
                    <span key={`${drug}-${idx}`} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {drug}
                        <button
                            type="button"
                            onClick={() => handleRemoveDrug(idx)}
                            className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-emerald-600 hover:bg-emerald-200 focus:outline-none"
                        >
                            <span className="sr-only">Remove</span>
                            &times;
                        </button>
                    </span>
                ))}
            </div>

            {/* Add Drug Dropdown */}
            {selectedDrugs.length < 5 && (
                <div className="relative">
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                handleAddDrug(e.target.value);
                                e.target.value = ""; // Reset select
                            }
                        }}
                        className={inputClass}
                        defaultValue=""
                    >
                        <option value="" disabled>+ เพิ่มยาในสูตร ({selectedDrugs.length}/5)</option>
                        {availableDrugs.map(drug => (
                            <option key={drug} value={drug}>{drug}</option>
                        ))}
                    </select>
                </div>
            )}
            
            {/* Hidden input to ensure form data is passed correctly if needed by generic handlers, though we use onChange prop */}
            <input type="hidden" name={name} value={value} />
        </div>
    );
};

// --- End ARV Helpers ---

const getFirstEventDate = (history: MedicalEvent[], type: MedicalEventType): string => {
    const event = history.find(e => e.type === type);
    return event ? formatThaiDateBE(event.date) : '-';
};

const getCurrentArv = (history: MedicalEvent[]): string => {
    const arvEvents = history
        .filter(e => e.type === MedicalEventType.ART_START || e.type === MedicalEventType.ART_CHANGE)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (arvEvents.length > 0) {
        return arvEvents[0].details['เป็น'] || arvEvents[0].details['สูตรยา'] || 'N/A';
    }
    return '-';
}

const InfoCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-green-600 mt-2">{value}</p>
    </div>
);

const getIconInfo = (type: MedicalEventType) => {
    switch (type) {
        case MedicalEventType.DIAGNOSIS:
            return { icon: <DiagnosisIcon />, color: 'bg-gray-200 text-gray-700' };
        case MedicalEventType.ART_START:
            return { icon: <ArtStartIcon />, color: 'bg-green-100 text-green-600' };
        case MedicalEventType.PROPHYLAXIS:
            return { icon: <ProphylaxisIcon />, color: 'bg-orange-100 text-orange-600' };
        case MedicalEventType.MISSED_MEDS:
            return { icon: <MissedMedsIcon />, color: 'bg-rose-100 text-rose-600' };
        case MedicalEventType.ART_CHANGE:
            return { icon: <ArtChangeIcon />, color: 'bg-lime-100 text-lime-600' };
        case MedicalEventType.OPPORTUNISTIC_INFECTION:
            return { icon: <InfectionIcon />, color: 'bg-red-100 text-red-600' };
        case MedicalEventType.LAB_RESULT:
            return { icon: <LabResultIcon />, color: 'bg-sky-100 text-sky-600' };
        case MedicalEventType.OTHER:
            return { icon: <OtherIcon />, color: 'bg-yellow-100 text-yellow-600' };
        default:
            return { icon: <div />, color: 'bg-gray-100' };
    }
};

const TimelineIcon: React.FC<{ type: MedicalEventType }> = ({ type }) => {
    const { icon, color } = getIconInfo(type);
    return (
        <div className={`flex items-center justify-center h-10 w-10 rounded-full ${color}`}>
            {icon}
        </div>
    );
};

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

const infections = {
  "เชื้อรา (Fungal)": [ "Oral and Esophageal Candidiasis", "Pneumocystis Pneumonia (PJP)", "Cryptococcosis", "Histoplasmosis", "Talaromycosis" ],
  "เชื้อแบคทีเรีย (Bacterial)": [ "Tuberculosis", "Mycobacterium Avium Complex (MAC)", "Recurrent Salmonella Septicemia" ],
  "เชื้อไวรัส (Viral)": [ "Cytomegalovirus", "Progressive Multifocal Leukoencephalopathy (PML)", "Chronic Herpes Simplex Virus (HSV)", "Varicella Zoster Virus (VZV)" ],
  "โปรโตซัว/ปรสิต (Protozoa/Parasite)": [ "Toxoplasmosis", "Cryptosporidiosis", "Isosporiasis", "Cyclosporiasis" ],
  "มะเร็ง (Cancers)": [ "Kaposi’s Sarcoma (KS)", "Non-Hodgkin’s Lymphoma (NHL)", "Invasive Cervical Cancer" ],
};


const renderEventDetailForm = (type: MedicalEventType, details: Record<string, any>, handleDetailChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void, handleArvChange: (name: string, value: string) => void) => {
    switch (type) {
        case MedicalEventType.DIAGNOSIS:
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label htmlFor="initialCd4" className={labelClass}>Initial CD4 count</label><input type="number" name="Initial CD4 count" id="initialCd4" value={details['Initial CD4 count'] || ''} onChange={handleDetailChange} className={inputClass} /></div>
                    <div><label htmlFor="initialCd4Percent" className={labelClass}>Initial CD4 %</label><input type="number" name="Initial CD4 %" id="initialCd4Percent" value={details['Initial CD4 %'] || ''} step="0.1" onChange={handleDetailChange} className={inputClass} /></div>
                    <div><label htmlFor="reason" className={labelClass}>สาเหตุที่ตรวจพบ</label><input type="text" name="สาเหตุที่ตรวจพบ" id="reason" value={details['สาเหตุที่ตรวจพบ'] || ''} onChange={handleDetailChange} className={inputClass} /></div>
                </div>
            );
        case MedicalEventType.ART_START:
             return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="regimen" className={labelClass}>สูตรยา</label>
                        <ArvRegimenSelector 
                            name="สูตรยา" 
                            value={details['สูตรยา'] || ''} 
                            onChange={(val) => handleArvChange('สูตรยา', val)} 
                        />
                    </div>
                    <div><label htmlFor="reason" className={labelClass}>เหตุผล</label><textarea name="เหตุผล" id="reason" value={details['เหตุผล'] || ''} onChange={handleDetailChange} className={textareaClass}></textarea></div>
                </div>
            );
        case MedicalEventType.PROPHYLAXIS:
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
        case MedicalEventType.MISSED_MEDS:
             return <div><label htmlFor="reason" className={labelClass}>เหตุผล</label><textarea name="เหตุผล" id="reason" value={details['เหตุผล'] || ''} onChange={handleDetailChange} className={textareaClass}></textarea></div>;
        case MedicalEventType.ART_CHANGE:
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="fromRegimen" className={labelClass}>จากสูตร</label>
                        <input type="text" name="จาก" id="fromRegimen" value={details['จาก'] || ''} onChange={handleDetailChange} className={inputClass} placeholder="ระบุหรือเลือกจากประวัติ" />
                    </div>
                    <div>
                        <label htmlFor="toRegimen" className={labelClass}>เป็นสูตร</label>
                        <ArvRegimenSelector 
                            name="เป็น" 
                            value={details['เป็น'] || ''} 
                            onChange={(val) => handleArvChange('เป็น', val)} 
                        />
                    </div>
                    <div><label htmlFor="reason" className={labelClass}>เหตุผล</label><textarea name="เหตุผล" id="reason" value={details['เหตุผล'] || ''} onChange={handleDetailChange} className={textareaClass}></textarea></div>
                </div>
            );
        case MedicalEventType.OPPORTUNISTIC_INFECTION:
             return (
                <div className="space-y-4">
                    {Object.entries(infections).map(([group, list]) => (
                        <div key={group}>
                            <p className="font-semibold text-gray-800">{group}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-2 pl-4">
                                {list.map(infection => (
                                    <div key={infection} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={infection}
                                            name={infection}
                                            data-group="infections"
                                            checked={(details.infections || []).includes(infection)}
                                            onChange={handleDetailChange}
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <label htmlFor={infection} className="ml-2 text-sm text-gray-700">{infection}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="pt-2 border-t mt-4">
                        <div className="flex items-center">
                             <input type="checkbox" id="otherInfectionCheck" name="อื่นๆ" checked={!!details['อื่นๆ']} onChange={handleDetailChange} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                             <label htmlFor="otherInfectionCheck" className="ml-2 text-sm font-semibold text-gray-800">อื่นๆ</label>
                        </div>
                        {details['อื่นๆ'] && (
                           <div className="mt-2 pl-4">
                               <label htmlFor="otherInfection" className={labelClass}>ระบุการติดเชื้ออื่นๆ</label>
                               <input type="text" name="การติดเชื้ออื่นๆ" id="otherInfection" value={details['การติดเชื้ออื่นๆ'] || ''} onChange={handleDetailChange} className={inputClass} />
                           </div>
                        )}
                    </div>
                </div>
            );
        case MedicalEventType.LAB_RESULT:
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label htmlFor="cd4" className={labelClass}>CD4</label><input type="number" name="CD4" id="cd4" value={details.CD4 || ''} onChange={handleDetailChange} className={inputClass} /></div>
                    <div><label htmlFor="cd4Percent" className={labelClass}>CD4 %</label><input type="number" name="CD4 %" id="cd4Percent" value={details['CD4 %'] || ''} step="0.1" onChange={handleDetailChange} className={inputClass} /></div>
                    <div><label htmlFor="viralLoad" className={labelClass}>Viral load</label><input type="text" name="Viral load" id="viralLoad" value={details['Viral load'] || ''} onChange={handleDetailChange} className={inputClass} /></div>
                </div>
            );
        case MedicalEventType.OTHER:
            return <div><label htmlFor="details" className={labelClass}>รายละเอียด</label><textarea name="รายละเอียด" id="details" value={details['รายละเอียด'] || ''} onChange={handleDetailChange} className={textareaClass}></textarea></div>;
        default:
            return null;
    }
};

interface EditEventModalProps {
    isOpen: boolean;
    event: MedicalEvent | null;
    onClose: () => void;
    onSave: (event: MedicalEvent) => void;
}

const EditEventModal: React.FC<EditEventModalProps> = ({ isOpen, event, onClose, onSave }) => {
    const [formData, setFormData] = useState<MedicalEvent | null>(null);

    useEffect(() => {
        if (event) {
             // Data migration for old infection events
            if (event.type === MedicalEventType.OPPORTUNISTIC_INFECTION && event.details.โรค && !event.details.infections) {
                const migratedEvent = { ...event, details: { ...event.details, infections: [event.details.โรค] } };
                setFormData({ ...migratedEvent, date: toLocalISOString(migratedEvent.date) });
            } else {
                setFormData({ ...event, date: toLocalISOString(event.date) });
            }
        }
    }, [event]);

    if (!isOpen || !event || !formData) return null;

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const newDetails = { ...formData.details };

        if (e.currentTarget.dataset.group === 'infections') {
            const { checked } = e.currentTarget as HTMLInputElement;
            const currentInfections = newDetails.infections || [];
            newDetails.infections = checked
                ? [...currentInfections, name]
                : currentInfections.filter(i => i !== name);
        } else if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            newDetails[name] = checked;
            if (name === 'อื่นๆ' && !checked) {
                delete newDetails['การติดเชื้ออื่นๆ'];
            }
        } else {
            newDetails[name] = value;
        }
        setFormData(prev => prev ? { ...prev, details: newDetails } : null);
    };

    const handleArvChange = (name: string, value: string) => {
        const newDetails = { ...formData.details };
        newDetails[name] = value;
        setFormData(prev => prev ? { ...prev, details: newDetails } : null);
    };

    const handleDateChange = (e: { target: { value: string } }) => {
        setFormData(prev => prev ? { ...prev, date: e.target.value } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            const cleanedData = { ...formData };
            if (cleanedData.type === MedicalEventType.OPPORTUNISTIC_INFECTION) {
                delete cleanedData.details['โรค']; // remove old key on save
            }
            onSave(cleanedData);
        }
    };

    const eventTypeInfo = eventTypes.find(et => et.type === event.type);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800">แก้ไขเหตุการณ์: {eventTypeInfo?.label}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="eventDateEdit" className={labelClass}>ลงวันที่</label>
                            <DateInput id="eventDateEdit" value={formData.date} onChange={handleDateChange} />
                        </div>
                        {renderEventDetailForm(event.type, formData.details, handleDetailChange, handleArvChange)}
                    </div>
                    <div className="p-6 border-t flex justify-end gap-x-3 bg-gray-50 rounded-b-lg sticky bottom-0">
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

interface AddEventFormProps {
    onSave: (event: Omit<MedicalEvent, 'id'>) => void;
    patientHistory: MedicalEvent[];
    onEditDiagnosis: (event: MedicalEvent) => void;
    forceEventType?: MedicalEventType;
    formTitle?: string;
    onCancel?: () => void;
}

const AddEventForm: React.FC<AddEventFormProps> = ({ onSave, patientHistory, onEditDiagnosis, forceEventType, formTitle, onCancel }) => {
    const [date, setDate] = useState(toLocalISOString(new Date()));
    const [eventType, setEventType] = useState<MedicalEventType | null>(null);
    const [details, setDetails] = useState<Record<string, any>>({});

    useEffect(() => {
        if (forceEventType) {
            setEventType(forceEventType);
        }
    }, [forceEventType]);

    const existingDiagnosis = patientHistory.find(e => e.type === MedicalEventType.DIAGNOSIS);
    
    const resetForm = () => {
        setDate(toLocalISOString(new Date()));
        setEventType(forceEventType || null);
        setDetails({});
        if (onCancel) {
            onCancel();
        }
    };
    
    const handleEventTypeSelect = (type: MedicalEventType) => {
        if (type === MedicalEventType.DIAGNOSIS && existingDiagnosis) {
            onEditDiagnosis(existingDiagnosis);
            return;
        }
        
        // Removed setDate(toLocalISOString(new Date())) to keep user selection
        setEventType(type);

        let newDetails: Record<string, any> = {};
        
        // Auto-populate based on event type
        if (type === MedicalEventType.ART_CHANGE) {
             const currentRegimen = getCurrentArv(patientHistory);
             if (currentRegimen && currentRegimen !== '-' && currentRegimen !== 'N/A') {
                 newDetails['จาก'] = currentRegimen;
             }
        }

        setDetails(newDetails);
    };

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';

        if (e.currentTarget.dataset.group === 'infections') {
            const { checked } = e.currentTarget as HTMLInputElement;
            setDetails(prev => {
                const currentInfections = prev.infections || [];
                const newInfections = checked
                    ? [...currentInfections, name]
                    : currentInfections.filter(i => i !== name);
                return { ...prev, infections: newInfections };
            });
            return;
        }

        if (isCheckbox) {
            const { checked } = e.target as HTMLInputElement;
             setDetails(prev => ({...prev, [name]: checked}));
             if (name === 'อื่นๆ' && !checked) {
                setDetails(prev => {
                    const newDetails = {...prev};
                    delete newDetails['การติดเชื้ออื่นๆ'];
                    return newDetails;
                });
            }
        } else {
             setDetails(prev => ({...prev, [name]: value}));
        }
    };

    const handleArvChange = (name: string, value: string) => {
        setDetails(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventType || !date) return;
        
        const eventTypeInfo = eventTypes.find(et => et.type === eventType);

         const newEvent: Omit<MedicalEvent, 'id'> = {
            date,
            type: eventType,
            title: eventTypeInfo?.label || 'Unknown Event',
            details,
        };
        onSave(newEvent);
        resetForm();
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-emerald-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">{formTitle || 'เพิ่มเหตุการณ์ใหม่'}</h3>
            <div className="space-y-6">
                <div>
                    <label htmlFor="eventDate" className={labelClass}>ลงวันที่</label>
                    <DateInput id="eventDate" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                {!forceEventType && (
                    <div>
                        <label className={labelClass}>เลือกเหตุการณ์</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                            {eventTypes.map(et => {
                                const isDiagnosisAndExists = et.type === MedicalEventType.DIAGNOSIS && !!existingDiagnosis;
                                return (
                                    <button
                                        key={et.type}
                                        type="button"
                                        onClick={() => handleEventTypeSelect(et.type)}
                                        className={`relative flex flex-col items-center justify-center p-3 border rounded-lg hover:shadow-md transition-all text-center ${eventType === et.type ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'bg-white'} ${isDiagnosisAndExists ? 'border-amber-400 bg-amber-50' : ''}`}
                                    >
                                        {isDiagnosisAndExists && (
                                            <span className="absolute -top-2 -right-2 text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow">EDIT</span>
                                         )}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${et.color}`}>
                                            {et.icon}
                                        </div>
                                        <span className="mt-2 text-xs font-medium text-gray-700">{et.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                 {eventType && (
                    <div className={!forceEventType ? "pt-6 border-t" : ""}>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">
                            {eventTypes.find(e => e.type === eventType)?.label}
                        </h4>
                        {renderEventDetailForm(eventType, details, handleDetailChange, handleArvChange)}
                         <div className="flex justify-end gap-x-3 mt-6">
                            <button onClick={resetForm} type="button" className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                               ยกเลิก
                           </button>
                           <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                               บันทึกเหตุการณ์
                           </button>
                        </div>
                    </div>
                )}
            </div>
        </form>
    );
};


interface HivTreatmentTabProps {
    patient: Patient;
    onSaveEvent: (event: Omit<MedicalEvent, 'id'> | MedicalEvent) => void;
    onDeleteEvent: (eventId: string) => void;
}

export const HivTreatmentTab: React.FC<HivTreatmentTabProps> = ({ patient, onSaveEvent, onDeleteEvent }) => {
    const [editingEvent, setEditingEvent] = useState<MedicalEvent | null>(null);
    const [isDiagnosing, setIsDiagnosing] = useState(false);

    const hasDiagnosis = patient.medicalHistory.some(e => e.type === MedicalEventType.DIAGNOSIS);

    const handleSaveDiagnosis = (eventData: Omit<MedicalEvent, 'id'>) => {
        onSaveEvent(eventData);
        setIsDiagnosing(false);
    };

    if (!hasDiagnosis) {
        if (isDiagnosing) {
            return (
                <AddEventForm 
                    onSave={handleSaveDiagnosis} 
                    patientHistory={patient.medicalHistory} 
                    onEditDiagnosis={() => {}} // This won't be called as there's no diagnosis to edit
                    forceEventType={MedicalEventType.DIAGNOSIS}
                    formTitle="บันทึกการวินิจฉัย HIV"
                    onCancel={() => setIsDiagnosing(false)}
                />
            );
        }

        return (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">ผู้ป่วยรายนี้ยังไม่ได้รับการวินิจฉัยว่าเป็น HIV</h3>
                <p className="text-gray-600 mt-2 mb-6">กดปุ่มเพื่อเปิดการวินิจฉัย HIV</p>
                <button 
                    onClick={() => setIsDiagnosing(true)} 
                    className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    เปิดการวินิจฉัย HIV
                </button>
            </div>
        );
    }
    
    const virtualEvents: MedicalEvent[] = [];

    // HBV Events
    if (patient.hbvInfo) {
        patient.hbvInfo.hbsAgTests?.forEach(test => {
            virtualEvents.push({
                id: `hbv-hbsag-${test.id}`,
                type: MedicalEventType.OTHER,
                date: test.date,
                title: 'ผลตรวจ HBsAg',
                details: { 'ผล': test.result }
            });
        });
        patient.hbvInfo.viralLoads?.forEach(test => {
            virtualEvents.push({
                id: `hbv-vl-${test.id}`,
                type: MedicalEventType.OTHER,
                date: test.date,
                title: 'ผลตรวจ HBV Viral Load',
                details: { 'ผล': test.result }
            });
        });
        patient.hbvInfo.ultrasounds?.forEach(test => {
            virtualEvents.push({
                id: `hbv-us-${test.id}`,
                type: MedicalEventType.OTHER,
                date: test.date,
                title: 'ผลตรวจ Ultrasound ตับ',
                details: { 'ผล': test.result }
            });
        });
        patient.hbvInfo.ctScans?.forEach(test => {
            virtualEvents.push({
                id: `hbv-ct-${test.id}`,
                type: MedicalEventType.OTHER,
                date: test.date,
                title: 'ผลตรวจ CT Upper Abdomen',
                details: { 'ผล': test.result }
            });
        });
    }

    // HCV Events
    if (patient.hcvInfo) {
        patient.hcvInfo.hcvTests?.forEach(test => {
            virtualEvents.push({
                id: `hcv-test-${test.id}`,
                type: MedicalEventType.OTHER,
                date: test.date,
                title: `ผลตรวจ ${test.type}`,
                details: { 'ผล': test.result }
            });
        });
        patient.hcvInfo.preTreatmentVls?.forEach(test => {
            virtualEvents.push({
                id: `hcv-prevl-${test.id}`,
                type: MedicalEventType.OTHER,
                date: test.date,
                title: 'ผลตรวจ HCV Viral Load (ก่อนรักษา)',
                details: { 'ผล': test.result }
            });
        });
        patient.hcvInfo.treatments?.forEach(treatment => {
            virtualEvents.push({
                id: `hcv-treat-${treatment.id}`,
                type: MedicalEventType.ART_START,
                date: treatment.date,
                title: 'เริ่มการรักษา HCV',
                details: { 'สูตรยา': treatment.regimen }
            });
        });
        patient.hcvInfo.postTreatmentVls?.forEach(test => {
            virtualEvents.push({
                id: `hcv-postvl-${test.id}`,
                type: MedicalEventType.OTHER,
                date: test.date,
                title: 'ผลตรวจ HCV Viral Load (หลังรักษา)',
                details: { 'ผล': test.result }
            });
        });
    }

    const combinedHistory = [...patient.medicalHistory, ...virtualEvents];
    const sortedHistory = combinedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const latestTptEvent = patient.medicalHistory
        .filter(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];


    const handleEditEvent = (event: MedicalEvent) => {
        setEditingEvent(event);
    };

    const handleSaveModal = (updatedEvent: MedicalEvent) => {
        if (updatedEvent.id.startsWith('hbv-') || updatedEvent.id.startsWith('hcv-')) {
            setEditingEvent(null);
            return; // Do not save virtual events
        }
        onSaveEvent(updatedEvent);
        setEditingEvent(null);
    }
    
    const renderTimelineEventDetails = (event: MedicalEvent) => {
        if (event.type === MedicalEventType.OPPORTUNISTIC_INFECTION) {
            const infectionsList = event.details.infections || [];
            const otherInfection = event.details['การติดเชื้ออื่นๆ'] || '';
            let fullInfectionList = [...infectionsList];
            if (otherInfection) fullInfectionList.push(otherInfection);

            // Handle old data format for display
            if (fullInfectionList.length === 0 && event.details.โรค) {
                fullInfectionList.push(event.details.โรค);
            }

            if (fullInfectionList.length > 0) {
                 return <p className="whitespace-pre-line"><span className="font-medium text-gray-800">การติดเชื้อ:</span> {fullInfectionList.join(', ')}</p>;
            }
        }
        
        // Default rendering for other event types
        return Object.entries(event.details).map(([key, value]) => {
            if (key === 'infections' || key === 'การติดเชื้ออื่นๆ' || key === 'อื่นๆ') return null; // Already handled for OI
            if (value === true) {
                return <p key={key}><span className="font-medium text-gray-800">{key}</span></p>;
            }
            if (value) {
                 return <p key={key} className="whitespace-pre-line"><span className="font-medium text-gray-800">{key}:</span> {String(value)}</p>;
            }
            return null;
        });
    }


    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <InfoCard title="วันที่ทราบผลตรวจครั้งแรก" value={getFirstEventDate(patient.medicalHistory, MedicalEventType.DIAGNOSIS)} />
                <InfoCard title="วันที่ได้รับยา ARV ครั้งแรก" value={getFirstEventDate(patient.medicalHistory, MedicalEventType.ART_START)} />
                <InfoCard title="สูตรยา ARV ปัจจุบัน" value={getCurrentArv(patient.medicalHistory)} />
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500">TPT</p>
                    <p className="text-2xl font-bold text-green-600 mt-2 truncate" title={latestTptEvent ? `${latestTptEvent.details['สูตร TPT']} (${formatThaiDateBE(latestTptEvent.date)})` : '-'}>
                        {latestTptEvent
                            ? <span className="whitespace-nowrap">{latestTptEvent.details['สูตร TPT']} ({formatThaiDateBE(latestTptEvent.date)})</span>
                            : '-'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Left Column: Add Event Form */}
                <div>
                     <AddEventForm 
                        onSave={onSaveEvent} 
                        patientHistory={patient.medicalHistory} 
                        onEditDiagnosis={handleEditEvent}
                    />
                </div>

                {/* Right Column: Timeline */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                     <h3 className="text-xl font-semibold text-gray-800 mb-6">ประวัติการรักษา (เรียงจากล่าสุด)</h3>

                    {sortedHistory.length > 0 ? (
                        <div className="relative pl-5 max-h-[800px] overflow-y-auto pr-2">
                            <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200" aria-hidden="true"></div>
                            <div className="space-y-8">
                                {sortedHistory.map((event) => {
                                    const isVirtualEvent = event.id.startsWith('hbv-') || event.id.startsWith('hcv-');
                                    return (
                                        <div key={event.id} className="relative flex items-start group">
                                            <div className="absolute top-0 -left-5 z-10">
                                                 <TimelineIcon type={event.type} />
                                            </div>
                                            <div className="ml-8 flex-grow bg-white p-4 rounded-lg border border-gray-200">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-semibold text-gray-900 text-md">{event.title}</h3>
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <span>{formatThaiDateBE(event.date)}</span>
                                                        {/* Allow deleting everything, including virtual events */}
                                                        {!isVirtualEvent && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleEditEvent(event)} 
                                                                className="ml-3 p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" 
                                                                aria-label={`Edit event ${event.title}`}
                                                            >
                                                                <EditIcon />
                                                            </button>
                                                        )}
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteEvent(event.id); }} 
                                                            className="ml-1 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors relative z-20"
                                                            aria-label={`Delete event ${event.title}`}
                                                            title="ลบข้อมูล"
                                                        >
                                                            <TrashIcon className="h-4 w-4 pointer-events-none" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600 mt-2 space-y-1">
                                                   {renderTimelineEventDetails(event)}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500">ยังไม่มีประวัติการรักษา</p>
                        </div>
                    )}
                </div>
            </div>

            <EditEventModal
                isOpen={!!editingEvent}
                event={editingEvent}
                onClose={() => setEditingEvent(null)}
                onSave={handleSaveModal}
            />
        </div>
    );
};
