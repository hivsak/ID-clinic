import React, { useState } from 'react';
import { Patient, MedicalEvent } from '../types';
import { ChevronLeftIcon, PrepPepIcon, ActivityIcon } from './icons';
import { calculateAge } from './utils';

// Import tab components
import { GeneralInfoTab } from './tabs/GeneralInfoTab';
import { HivTreatmentTab } from './tabs/HivTreatmentTab';
import { HbvHcvTab } from './tabs/HbvHcvTab';
import { TPTTab } from './tabs/TptTab';
import { StdTab } from './tabs/StdTab';
import { PregnancyTab } from './tabs/PregnancyTab';
import { PrepTab } from './tabs/PrepTab';
import { PepTab } from './tabs/PepTab';
import { UnderlyingDiseasesTab } from './tabs/UnderlyingDiseasesTab';


interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
  onUpdate: (patient: Patient) => void;
}

type Tab = 'GENERAL' | 'HIV' | 'HBV_HCV' | 'TPT' | 'STD' | 'PREGNANCY' | 'PREP' | 'PEP' | 'DISEASES';

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('GENERAL');

  const handleUpdatePatient = (updatedPatient: Patient) => {
    onUpdate(updatedPatient);
  };

  const handleSaveEvent = (eventData: Omit<MedicalEvent, 'id'> | MedicalEvent) => {
    let newHistory: MedicalEvent[];
    if ('id' in eventData) {
      // It's an update
      newHistory = patient.medicalHistory.map(e => e.id === eventData.id ? eventData : e);
    } else {
      // It's a new event
      const newEvent: MedicalEvent = {
        ...eventData,
        id: `evt-${Date.now()}`,
      };
      newHistory = [newEvent, ...patient.medicalHistory];
    }
    handleUpdatePatient({ ...patient, medicalHistory: newHistory });
  };
  
  const handleDeleteEvent = (eventId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        return;
    }

    let updatedPatient = { ...patient };
    let found = false;

    // Handle Virtual Events from HBV/HCV Tabs being deleted from Timeline
    if (eventId.startsWith('hbv-') || eventId.startsWith('hcv-')) {
        const hbvInfo = patient.hbvInfo || { hbsAgTests: [], viralLoads: [], ultrasounds: [], ctScans: [] };
        const hcvInfo = patient.hcvInfo || { hcvTests: [], preTreatmentVls: [], treatments: [], postTreatmentVls: [] };
        
        // HBV Parsers
        if (eventId.startsWith('hbv-hbsag-')) {
            const realId = eventId.replace('hbv-hbsag-', '');
            updatedPatient.hbvInfo = { ...hbvInfo, hbsAgTests: (hbvInfo.hbsAgTests || []).filter(x => x.id !== realId) };
            found = true;
        } else if (eventId.startsWith('hbv-vl-')) {
            const realId = eventId.replace('hbv-vl-', '');
            updatedPatient.hbvInfo = { ...hbvInfo, viralLoads: (hbvInfo.viralLoads || []).filter(x => x.id !== realId) };
            found = true;
        } else if (eventId.startsWith('hbv-us-')) {
            const realId = eventId.replace('hbv-us-', '');
            updatedPatient.hbvInfo = { ...hbvInfo, ultrasounds: (hbvInfo.ultrasounds || []).filter(x => x.id !== realId) };
            found = true;
        } else if (eventId.startsWith('hbv-ct-')) {
            const realId = eventId.replace('hbv-ct-', '');
            updatedPatient.hbvInfo = { ...hbvInfo, ctScans: (hbvInfo.ctScans || []).filter(x => x.id !== realId) };
            found = true;
        }
        // HCV Parsers
        else if (eventId.startsWith('hcv-test-')) {
            const realId = eventId.replace('hcv-test-', '');
            updatedPatient.hcvInfo = { ...hcvInfo, hcvTests: (hcvInfo.hcvTests || []).filter(x => x.id !== realId) };
            found = true;
        } else if (eventId.startsWith('hcv-prevl-')) {
            const realId = eventId.replace('hcv-prevl-', '');
            updatedPatient.hcvInfo = { ...hcvInfo, preTreatmentVls: (hcvInfo.preTreatmentVls || []).filter(x => x.id !== realId) };
            found = true;
        } else if (eventId.startsWith('hcv-treat-')) {
            const realId = eventId.replace('hcv-treat-', '');
            updatedPatient.hcvInfo = { ...hcvInfo, treatments: (hcvInfo.treatments || []).filter(x => x.id !== realId) };
            found = true;
        } else if (eventId.startsWith('hcv-postvl-')) {
            const realId = eventId.replace('hcv-postvl-', '');
            updatedPatient.hcvInfo = { ...hcvInfo, postTreatmentVls: (hcvInfo.postTreatmentVls || []).filter(x => x.id !== realId) };
            found = true;
        }

        if (found) {
            onUpdate(updatedPatient);
            return;
        }
    }

    // Default: Delete from Medical History (includes HIV, TPT, OI, etc.)
    const currentHistory = patient.medicalHistory || [];
    const newHistory = currentHistory.filter(e => e.id !== eventId);
    onUpdate({ ...patient, medicalHistory: newHistory });
  };

  const tabs = [
    { id: 'GENERAL', label: 'ข้อมูลทั่วไป' },
    { id: 'HIV', label: 'HIV Treatment' },
    { id: 'HBV_HCV', label: 'HBV/HCV' },
    { id: 'TPT', label: 'TPT' },
    { id: 'STD', label: 'STD' },
    { id: 'PREGNANCY', label: 'Pregnancy', show: patient.sex === 'หญิง' },
    { id: 'PREP', label: 'PrEP' },
    { id: 'PEP', label: 'PEP', icon: <PrepPepIcon /> },
    { id: 'DISEASES', label: 'โรคประจำตัว', icon: <ActivityIcon /> },
  ].filter(tab => tab.show !== false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'GENERAL':
        return <GeneralInfoTab patient={patient} onUpdate={handleUpdatePatient} />;
      case 'HIV':
        return <HivTreatmentTab patient={patient} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} />;
      case 'HBV_HCV':
        return <HbvHcvTab patient={patient} onUpdatePatient={handleUpdatePatient} />;
      case 'STD':
          return <StdTab patient={patient} onUpdatePatient={handleUpdatePatient} />;
      case 'PREGNANCY':
          return <PregnancyTab patient={patient} onUpdatePatient={handleUpdatePatient} />;
      case 'TPT':
          return <TPTTab patient={patient} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} />;
      case 'PREP':
        return <PrepTab patient={patient} onUpdatePatient={handleUpdatePatient} />;
      case 'PEP':
        return <PepTab patient={patient} onUpdatePatient={handleUpdatePatient} />;
      case 'DISEASES':
        return <UnderlyingDiseasesTab patient={patient} onUpdatePatient={handleUpdatePatient} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Back Button & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <button 
                onClick={onBack} 
                className="group flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors mb-2"
            >
                <div className="p-1 rounded-full bg-slate-100 group-hover:bg-emerald-100 mr-2 transition-colors">
                    <ChevronLeftIcon className="h-4 w-4" />
                </div>
                กลับไปที่รายชื่อผู้ป่วย
            </button>
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{`${patient.firstName || ''} ${patient.lastName || ''}`}</h1>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${patient.sex === 'ชาย' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                    {patient.sex || '-'}
                </span>
            </div>
            <div className="flex items-center gap-x-6 text-sm text-slate-500 mt-2 font-medium">
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-300 mr-2"></span>HN: {patient.hn}</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-300 mr-2"></span>อายุ: {calculateAge(patient.dob)} ปี</span>
            </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 mb-8 overflow-x-auto">
        <nav className="-mb-px flex space-x-1" aria-label="Tabs">
          {tabs.map(tab => {
            const hasIcon = 'icon' in tab;
            const tabShouldHaveIcon = !['GENERAL', 'HIV', 'HBV_HCV', 'TPT', 'STD', 'PREP', 'PREGNANCY'].includes(tab.id);
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`
                    whitespace-nowrap py-4 px-5 font-medium text-sm border-b-2 transition-all duration-200 flex items-center justify-center gap-2 outline-none
                    ${isActive 
                        ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'}
                `}
              >
                {hasIcon && tabShouldHaveIcon && (
                    <span className={`${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {tab.icon}
                    </span>
                )}
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {renderTabContent()}
      </div>
    </div>
  );
};