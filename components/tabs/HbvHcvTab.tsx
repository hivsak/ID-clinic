
import React, { useState, useEffect } from 'react';
import { Patient, HcvInfo, HcvTest, HbvInfo } from '../../types';
import { EditIcon, PlusIcon, TrashIcon } from '../icons';
import { inputClass, formatThaiDateBE, determineHbvStatus, determineHcvStatus, determineHcvDiagnosticStatus, toLocalISOString } from '../utils';
import { TestHistoryCard } from '../TestHistoryCard';
import { DateInput } from '../DateInput';

interface HbvHcvTabProps {
    patient: Patient;
    onUpdatePatient: (patient: Patient) => void;
}

export const HbvHcvTab: React.FC<HbvHcvTabProps> = ({ patient, onUpdatePatient }) => {
    // --- HBV Logic ---
    const [isEditingHbvSummary, setIsEditingHbvSummary] = useState(false);
    const [editedHbvSummary, setEditedHbvSummary] = useState('');

    const handleAddOrUpdateHbvRecord = <T extends {id: string; date: string; result: string}>(
        recordType: keyof Omit<HbvInfo, 'manualSummary'>,
        newRecord: { date: string; result: string } | T,
    ) => {
        const currentHbvInfo = patient.hbvInfo || { hbsAgTests: [], viralLoads: [], ultrasounds: [], ctScans: [] };
        let updatedRecords;

        if ('id' in newRecord) { // Update existing
            updatedRecords = ((currentHbvInfo[recordType] as T[] | undefined) || []).map(r => r.id === newRecord.id ? newRecord : r);
        } else { // Add new
            const recordToAdd = { ...newRecord, id: `${recordType}-${Date.now()}` };
            const existingRecords = (currentHbvInfo[recordType] as T[] | undefined) || [];
            updatedRecords = [...existingRecords, recordToAdd];
        }

        updatedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const newHbvInfo = { ...currentHbvInfo, [recordType]: updatedRecords };
        onUpdatePatient({ ...patient, hbvInfo: newHbvInfo });
    };

    const handleDeleteHbvRecord = (recordType: keyof Omit<HbvInfo, 'manualSummary'>, idToDelete: string) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) return;
        
        const currentHbvInfo = patient.hbvInfo || { hbsAgTests: [], viralLoads: [], ultrasounds: [], ctScans: [] };
        const existingRecords = (currentHbvInfo[recordType] as {id: string}[] | undefined) || [];
        const updatedRecords = existingRecords.filter(rec => rec.id !== idToDelete);
        const newHbvInfo = { ...currentHbvInfo, [recordType]: updatedRecords };
        
        onUpdatePatient({ ...patient, hbvInfo: newHbvInfo });
    };
    
    const hbvData = patient.hbvInfo || { hbsAgTests: [], viralLoads: [], ultrasounds: [], ctScans: [] };
    const latestHbsAgTest = [...(hbvData.hbsAgTests || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const displaySummary = determineHbvStatus(patient);
    const manualSummaryOptions = ['ไม่เป็น HBV', 'เป็น HBV', 'รอตรวจเพิ่มเติม'];

    const handleEditHbvSummary = () => {
      setEditedHbvSummary(displaySummary.text);
      setIsEditingHbvSummary(true);
    };

    const handleSaveHbvSummary = () => {
      const newHbvInfo = { ...patient.hbvInfo, manualSummary: editedHbvSummary === 'automatic' ? undefined : editedHbvSummary };
      onUpdatePatient({ ...patient, hbvInfo: newHbvInfo });
      setIsEditingHbvSummary(false);
    };

    // --- HCV Logic ---
    const handleAddHcvRecord = <T extends { id: string, date: string }>(
        recordType: keyof Omit<HcvInfo, 'hcvVlNotTested' | 'hcvTests'>,
        newRecord: { date: string, [key: string]: string }
    ) => {
        const currentHcvInfo = patient.hcvInfo || { hcvTests: [] };
        const recordToAdd = { ...newRecord, id: `${recordType}-${Date.now()}` };
        const existingRecords = ((currentHcvInfo[recordType] as unknown) as T[] | undefined) || [];
        const updatedRecords = [...existingRecords, recordToAdd as T].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const newHcvInfo = { ...currentHcvInfo, [recordType]: updatedRecords };
        onUpdatePatient({ ...patient, hcvInfo: newHcvInfo });
    };
    
    const handleUpdateHcvRecord = <T extends { id: string, date: string }>(
        recordType: keyof Omit<HcvInfo, 'hcvVlNotTested' | 'hcvTests'>,
        updatedRecord: T
    ) => {
        const currentHcvInfo = patient.hcvInfo || { hcvTests: [] };
        const existingRecords = ((currentHcvInfo[recordType] as unknown) as T[] | undefined) || [];
        const updatedRecords = existingRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const newHcvInfo = { ...currentHcvInfo, [recordType]: updatedRecords };
        onUpdatePatient({ ...patient, hcvInfo: newHcvInfo });
    };

    const handleDeleteHcvRecord = (recordType: keyof Omit<HcvInfo, 'hcvVlNotTested' | 'hcvTests'>, idToDelete: string) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) return;
        const currentHcvInfo = patient.hcvInfo || { hcvTests: [] };
        const existingRecords = ((currentHcvInfo[recordType] as unknown) as {id: string}[] | undefined) || [];
        const updatedRecords = existingRecords.filter(rec => rec.id !== idToDelete);
        const newHcvInfo = { ...currentHcvInfo, [recordType]: updatedRecords };
        onUpdatePatient({ ...patient, hcvInfo: newHcvInfo });
    };

     const handleAddHcvTest = (newTestData: { date: string, result: string, type?: string }) => {
        const currentHcvInfo = patient.hcvInfo || { hcvTests: [] };
        const newTest: HcvTest = {
            id: `hcv-test-${Date.now()}`,
            date: newTestData.date,
            result: newTestData.result as any,
            type: (newTestData.type as any) || 'Anti-HCV'
        };
        const updatedTests = [...(currentHcvInfo.hcvTests || []), newTest].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onUpdatePatient({ ...patient, hcvInfo: { ...currentHcvInfo, hcvTests: updatedTests } });
    };
    
    const handleUpdateHcvTest = (updatedTest: HcvTest) => {
        const currentHcvInfo = patient.hcvInfo || { hcvTests: [] };
        const updatedTests = (currentHcvInfo.hcvTests || []).map(t => t.id === updatedTest.id ? updatedTest : t)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onUpdatePatient({ ...patient, hcvInfo: { ...currentHcvInfo, hcvTests: updatedTests } });
    };

     const handleDeleteHcvTest = (idToDelete: string) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) return;
        const currentHcvInfo = patient.hcvInfo || { hcvTests: [] };
        const currentTests = currentHcvInfo.hcvTests || [];
        const updatedTests = currentTests.filter(t => t.id !== idToDelete);
        onUpdatePatient({ ...patient, hcvInfo: { ...currentHcvInfo, hcvTests: updatedTests } });
    };
    
    // --- Summary Data ---
    const hcvInfo = patient.hcvInfo || { hcvTests: [] };
    const latestHcvTest = [...(hcvInfo.hcvTests || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const hcvDiagnosticStatus = determineHcvDiagnosticStatus(hcvInfo.hcvTests || []);
    const hcvTreatmentStatus = determineHcvStatus(patient);

    const latestPreVl = [...(hcvInfo.preTreatmentVls || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const latestPostVl = [...(hcvInfo.postTreatmentVls || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const latestTreatment = [...(hcvInfo.treatments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    let hcvDateText = 'ยังไม่เริ่มการรักษา';
    if (hcvTreatmentStatus.text === 'เคยเป็น HCV รักษาหายแล้ว' && latestPostVl) {
        hcvDateText = `ตรวจ VL ล่าสุด: ${formatThaiDateBE(latestPostVl.date)}`;
    } else if (hcvTreatmentStatus.text === 'กำลังรักษา HCV' && latestTreatment) {
        hcvDateText = `เริ่มยาล่าสุด: ${formatThaiDateBE(latestTreatment.date)}`;
    } else if (hcvTreatmentStatus.text === 'เคยเป็น HCV หายเอง' && latestPreVl) {
        hcvDateText = `ตรวจ VL ล่าสุด: ${formatThaiDateBE(latestPreVl.date)}`;
    } else if (hcvTreatmentStatus.text === 'เป็น HCV' || hcvTreatmentStatus.text === 'เป็น HCV รักษาแล้วไม่หาย') {
        const postDate = latestPostVl ? new Date(latestPostVl.date) : null;
        const preDate = latestPreVl ? new Date(latestPreVl.date) : null;
        if (postDate && (!preDate || postDate > preDate)) {
            hcvDateText = `ตรวจ VL ล่าสุด: ${formatThaiDateBE(latestPostVl.date)}`;
        } else if (preDate) {
            hcvDateText = `ตรวจ VL ล่าสุด: ${formatThaiDateBE(latestPreVl.date)}`;
        }
    } else if (hcvTreatmentStatus.text === 'ไม่เป็น HCV' && latestHcvTest) {
        hcvDateText = `ตรวจล่าสุด: ${formatThaiDateBE(latestHcvTest.date)}`;
    }


    return (
        <div className="space-y-6">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col h-full">
                    <h3 className="text-lg font-semibold text-gray-600">ผลตรวจ HBV</h3>
                    <div className="flex-grow mt-2">
                        {latestHbsAgTest ? (
                            <span className={`px-3 py-1 text-base font-bold rounded-full ${
                                latestHbsAgTest.result === 'Positive' ? 'bg-red-100 text-red-800' :
                                latestHbsAgTest.result === 'Negative' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-amber-100 text-amber-800'
                            }`}>
                                {latestHbsAgTest.result}
                            </span>
                        ) : (
                            <p className="text-lg font-semibold text-gray-400">No Data</p>
                        )}
                    </div>
                    {latestHbsAgTest ? <p className="text-sm text-gray-500 mt-2">ตรวจล่าสุด: {formatThaiDateBE(latestHbsAgTest.date)}</p> : <div className="h-5"></div>}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col h-full">
                    {isEditingHbvSummary ? (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">แก้ไขสรุปผล HBV</h3>
                            <select value={editedHbvSummary} onChange={e => setEditedHbvSummary(e.target.value)} className={inputClass}>
                                <option value="automatic">Automatic Summary</option>
                                {manualSummaryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <div className="flex justify-end gap-x-2 mt-3">
                                <button onClick={() => setIsEditingHbvSummary(false)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                                <button onClick={handleSaveHbvSummary} className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">Save</button>
                            </div>
                        </div>
                    ) : (
                        <>
                           <div className="flex justify-between items-start">
                                <h3 className="text-lg font-semibold text-gray-600">สรุปผลการรักษา HBV</h3>
                                <button onClick={handleEditHbvSummary} className="text-gray-400 hover:text-emerald-600"><EditIcon /></button>
                            </div>
                            <div className="flex-grow mt-2">
                                <span className={`px-3 py-1 text-base font-bold rounded-full ${displaySummary.color}`}>{displaySummary.text}</span>
                                {patient.hbvInfo?.manualSummary && <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-md">Edited</span>}
                            </div>
                            <div className="h-5 mt-2"></div>
                        </>
                    )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col h-full">
                    <h3 className="text-lg font-semibold text-gray-600">ผลตรวจ HCV</h3>
                    <div className="flex-grow mt-2">
                        {hcvDiagnosticStatus !== 'UNKNOWN' ? (
                             <span className={`px-3 py-1 text-base font-bold rounded-full ${
                                hcvDiagnosticStatus === 'POSITIVE' ? 'bg-red-100 text-red-800' :
                                hcvDiagnosticStatus === 'NEGATIVE' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-amber-100 text-amber-800'
                            }`}>{hcvDiagnosticStatus}</span>
                        ) : (
                            <p className="text-lg font-semibold text-gray-400">No Data</p>
                        )}
                    </div>
                    {latestHcvTest ? <p className="text-sm text-gray-500 mt-2">ตรวจล่าสุด: {formatThaiDateBE(latestHcvTest.date)}</p> : <div className="h-5"></div>}
                </div>
                 
                <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col h-full">
                    <h3 className="text-lg font-semibold text-gray-600">สรุปผลการรักษา HCV</h3>
                    <div className="flex-grow mt-2">
                        <span className={`px-3 py-1 text-base font-bold rounded-full ${hcvTreatmentStatus.color}`}>{hcvTreatmentStatus.text}</span>
                    </div>
                     <p className="text-sm text-gray-500 mt-2">{hcvDateText}</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Left Column: HBV */}
                <div className="space-y-4">
                    <TestHistoryCard
                        title="HBsAg"
                        records={hbvData.hbsAgTests || []}
                        onAdd={(rec) => handleAddOrUpdateHbvRecord('hbsAgTests', rec)}
                        onDelete={(id) => handleDeleteHbvRecord('hbsAgTests', id)}
                        onEdit={(rec) => handleAddOrUpdateHbvRecord('hbsAgTests', rec)}
                        recordKey="result"
                        resultLabel="Result"
                        resultInputType="select"
                        resultOptions={['Negative', 'Positive', 'Inconclusive']}
                    />
                    <TestHistoryCard
                        title="HBV Viral Load History"
                        records={hbvData.viralLoads || []}
                        onAdd={(rec) => handleAddOrUpdateHbvRecord('viralLoads', rec)}
                        onDelete={(id) => handleDeleteHbvRecord('viralLoads', id)}
                        onEdit={(rec) => handleAddOrUpdateHbvRecord('viralLoads', rec)}
                        recordKey="result"
                        resultLabel="Result"
                        resultInputType="text"
                        resultPlaceholder="e.g., 1,500 IU/mL"
                    />
                    <TestHistoryCard
                        title="Ultrasound History"
                        records={hbvData.ultrasounds || []}
                        onAdd={(rec) => handleAddOrUpdateHbvRecord('ultrasounds', rec)}
                        onDelete={(id) => handleDeleteHbvRecord('ultrasounds', id)}
                        onEdit={(rec) => handleAddOrUpdateHbvRecord('ultrasounds', rec)}
                        recordKey="result"
                        resultLabel="Result"
                        resultInputType="text"
                        resultPlaceholder="e.g., Mild fatty liver"
                    />
                    <TestHistoryCard
                        title="CT Upper Abdomen"
                        records={hbvData.ctScans || []}
                        onAdd={(rec) => handleAddOrUpdateHbvRecord('ctScans', rec)}
                        onDelete={(id) => handleDeleteHbvRecord('ctScans', id)}
                        onEdit={(rec) => handleAddOrUpdateHbvRecord('ctScans', rec)}
                        recordKey="result"
                        resultLabel="Result"
                        resultInputType="text"
                        resultPlaceholder="e.g., Liver appears normal."
                    />
                </div>
                
                {/* Right Column: HCV */}
                <div className="space-y-4">
                    <TestHistoryCard
                        title="Anti-HCV / HCV-Ab"
                        records={hcvInfo.hcvTests || []}
                        onAdd={(rec) => handleAddHcvTest(rec as any)}
                        onDelete={handleDeleteHcvTest}
                        onEdit={handleUpdateHcvTest}
                        recordKey="result"
                        resultLabel="Result"
                        resultInputType="select"
                        resultOptions={['Negative', 'Positive', 'Inconclusive']}
                        secondaryKey="type"
                        secondaryLabel="Type"
                        secondaryOptions={['Anti-HCV', 'HCV-Ab']}
                    />
                    <TestHistoryCard
                        title="HCV viral load ก่อนการรักษา"
                        records={hcvInfo.preTreatmentVls || []}
                        onAdd={(rec) => handleAddHcvRecord('preTreatmentVls', rec)}
                        onDelete={(id) => handleDeleteHcvRecord('preTreatmentVls', id)}
                        onEdit={(rec) => handleUpdateHcvRecord('preTreatmentVls', rec)}
                        recordKey="result"
                        resultLabel="Result"
                        resultInputType="text"
                        resultPlaceholder="e.g., 1,200,000 IU/mL"
                    />
                     <TestHistoryCard
                        title="การให้ยารักษา HCV"
                        records={hcvInfo.treatments || []}
                        onAdd={(rec) => handleAddHcvRecord('treatments', rec)}
                        onDelete={(id) => handleDeleteHcvRecord('treatments', id)}
                        onEdit={(rec) => handleUpdateHcvRecord('treatments', rec)}
                        recordKey="regimen"
                        resultLabel="Regimen"
                        resultInputType="text"
                        resultPlaceholder="e.g., Sofosbuvir/Velpatasvir"
                    />
                    <TestHistoryCard
                        title="HCV viral load หลังการรักษา"
                        records={hcvInfo.postTreatmentVls || []}
                        onAdd={(rec) => handleAddHcvRecord('postTreatmentVls', rec)}
                        onDelete={(id) => handleDeleteHcvRecord('postTreatmentVls', id)}
                        onEdit={(rec) => handleUpdateHcvRecord('postTreatmentVls', rec)}
                        recordKey="result"
                        resultLabel="Result"
                        resultInputType="text"
                        resultPlaceholder="e.g., Not Detected"
                    />
                </div>
            </div>
        </div>
    );
};
