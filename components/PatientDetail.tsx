
import React, { useState } from 'react';
import { Patient, MedicalEvent } from '../types';
import { EditIcon, ChevronLeftIcon, PrepPepIcon } from './icons';
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


interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
  onUpdate: (patient: Patient) => void;
}

type Tab = 'GENERAL' | 'HIV' | 'HBV_HCV' | 'TPT' | 'STD' | 'PREGNANCY' | 'PREP' | 'PEP';

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('GENERAL');
  const [isEditingGeneralInfo, setIsEditingGeneralInfo] = useState(false);

  const handleUpdatePatient = (updatedPatient: Patient) => {
    onUpdate(updatedPatient);
    setIsEditingGeneralInfo(false); // Assume edit is finished
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
  ].filter(tab => tab.show !== false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'GENERAL':
        return <GeneralInfoTab patient={patient} isEditing={isEditingGeneralInfo} onUpdate={handleUpdatePatient} onCancelEdit={() => setIsEditingGeneralInfo(false)} />;
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
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
            <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="text-sm text-gray-500 hover:underline flex items-center mb-2">
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                กลับไปที่รายชื่อผู้ป่วย
            </a>
            <h1 className="text-2xl font-bold text-gray-800">{`${patient.firstName || ''} ${patient.lastName || ''}`}</h1>
            <div className="flex items-center gap-x-4 text-sm text-gray-500 mt-2">
                <span>HN: {patient.hn}</span>
                <span>อายุ: {calculateAge(patient.dob)} ปี</span>
                <span>เพศ: {patient.sex || '-'}</span>
            </div>
        </div>
        {activeTab === 'GENERAL' && !isEditingGeneralInfo && (
            <button 
                onClick={() => setIsEditingGeneralInfo(true)}
                className="flex items-center mt-4 md:mt-0 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
                <EditIcon className="mr-2 h-4 w-4" />
                แก้ไขข้อมูล
            </button>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => {
            const hasIcon = 'icon' in tab;
            const tabShouldHaveIcon = !['GENERAL', 'HIV', 'HBV_HCV', 'TPT', 'STD', 'PREP', 'PREGNANCY'].includes(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center justify-center ${ (hasIcon && tabShouldHaveIcon) ? 'gap-x-2' : '' } ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {hasIcon && tabShouldHaveIcon && tab.icon}
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};
