import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Patient,
  LabRecord,
  MedicalEvent,
  MedicalEventType,
  HbsAgTest,
  HcvTest,
} from '../../types';
import { BeakerIcon, EditIcon, PlusIcon, TrashIcon } from '../icons';
import { formatThaiDateBE, toLocalISOString } from '../utils';
import { DateInput } from '../DateInput';

interface LabTabProps {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
}

interface ColumnData {
  date: string; // ISO YYYY-MM-DD
  // Linked to HIV Tab (medicalHistory: LAB_RESULT / DIAGNOSIS initial CD4)
  cd4: string;
  cd4Percent: string;
  hivVl: string;
  // Linked to HBV/HCV Tab
  hbsag: string;
  antiHcv: string;
  hcvAb: string;
  hcvPreVl: string;
  hcvPostVl: string;
  hbvVl: string;
  // Lab records (labInfo.records)
  vdrl: string;
  tpha: string;
  tst: string;
  cr: string;
  // Linked to PrEP / PEP / TPT
  prep: boolean;
  npep: boolean;
  tpt: string;
  // Additional Lab records
  antiHbs: string;
  fbs: string;
  alt: string;
  chol: string;
  tg: string;
  hdl: string;
  ldl: string;
  cbc: string;
  cxr: string;
  drResistance: string;
}

type FieldKey = keyof Omit<ColumnData, 'date'>;

interface RowDef {
  key: FieldKey;
  label: string;
  inputType: 'text' | 'number' | 'select' | 'datalist' | 'checkbox' | 'textarea';
  options?: string[];
  placeholder?: string;
  linkedLabel?: string;
  isExtra?: boolean;
}

const TPT_OPTIONS = ['3HP', '1HP', '3HR', '6INH', '9INH', '4R'];
const SEROLOGY_OPTIONS = ['Positive', 'Negative', 'Inconclusive'];

const ROWS: RowDef[] = [
  // Exact 15 rows matching reference table order
  { key: 'cd4', label: 'CD4', inputType: 'number', placeholder: 'e.g. 350', linkedLabel: 'HIV' },
  { key: 'cd4Percent', label: 'CD4 %', inputType: 'number', placeholder: 'e.g. 25', linkedLabel: 'HIV' },
  { key: 'hivVl', label: 'HIV VL', inputType: 'text', placeholder: 'e.g. 0, 20, <20', linkedLabel: 'HIV' },
  { key: 'hbsag', label: 'HbsAg', inputType: 'select', options: SEROLOGY_OPTIONS, linkedLabel: 'HBV' },
  { key: 'antiHcv', label: 'Anti-HCV', inputType: 'select', options: SEROLOGY_OPTIONS, linkedLabel: 'HCV' },
  { key: 'hcvAb', label: 'HCV-Ab', inputType: 'select', options: SEROLOGY_OPTIONS, linkedLabel: 'HCV' },
  { key: 'hcvPreVl', label: 'HCV viral load ก่อนการรักษา', inputType: 'text', placeholder: 'e.g. 100000', linkedLabel: 'HCV' },
  { key: 'hcvPostVl', label: 'HCV viral load หลังการรักษา', inputType: 'text', placeholder: 'e.g. 0, Not Detected', linkedLabel: 'HCV' },
  { key: 'vdrl', label: 'VDRL', inputType: 'text', placeholder: 'e.g. 1:08, Non-reactive' },
  { key: 'tpha', label: 'TPHA', inputType: 'datalist', options: SEROLOGY_OPTIONS, placeholder: 'Positive / Negative' },
  { key: 'tst', label: 'TST', inputType: 'datalist', options: ['Negative', 'Positive'], placeholder: 'Positive / Negative' },
  { key: 'cr', label: 'Cr', inputType: 'text', placeholder: 'e.g. 0.8' },
  { key: 'prep', label: 'PrEP', inputType: 'checkbox', linkedLabel: 'PrEP' },
  { key: 'npep', label: 'NPEP', inputType: 'checkbox', linkedLabel: 'PEP' },
  { key: 'tpt', label: 'TPT', inputType: 'datalist', options: TPT_OPTIONS, placeholder: 'เช่น 3HP, 1HP', linkedLabel: 'TPT' },
  // Additional lab fields from lab_records & HBV
  { key: 'hbvVl', label: 'HBV Viral Load', inputType: 'text', placeholder: 'e.g. 1,500 IU/mL', linkedLabel: 'HBV', isExtra: true },
  { key: 'antiHbs', label: 'Anti-HBs', inputType: 'text', placeholder: 'Positive / Negative / ค่าตัวเลข', isExtra: true },
  { key: 'fbs', label: 'FBS (mg/dL)', inputType: 'text', placeholder: 'e.g. 95', isExtra: true },
  { key: 'alt', label: 'ALT (U/L)', inputType: 'text', placeholder: 'e.g. 25', isExtra: true },
  { key: 'chol', label: 'Cholesterol (mg/dL)', inputType: 'text', placeholder: 'e.g. 180', isExtra: true },
  { key: 'tg', label: 'TG (mg/dL)', inputType: 'text', placeholder: 'e.g. 120', isExtra: true },
  { key: 'hdl', label: 'HDL (mg/dL)', inputType: 'text', placeholder: 'e.g. 50', isExtra: true },
  { key: 'ldl', label: 'LDL (mg/dL)', inputType: 'text', placeholder: 'e.g. 110', isExtra: true },
  { key: 'cbc', label: 'CBC', inputType: 'textarea', placeholder: 'Hb, Hct, WBC, Plt...', isExtra: true },
  { key: 'cxr', label: 'CXR', inputType: 'textarea', placeholder: 'ผล CXR...', isExtra: true },
  { key: 'drResistance', label: 'Dr resistance profile', inputType: 'textarea', placeholder: 'ระบุผลดื้อยา...', isExtra: true },
];

const hasValue = (val: unknown): boolean => {
  return val !== undefined && val !== null && String(val).trim() !== '';
};

const toDisplayStr = (val: unknown): string => {
  return hasValue(val) ? String(val) : '';
};

const createEmptyColumn = (date: string): ColumnData => ({
  date,
  cd4: '',
  cd4Percent: '',
  hivVl: '',
  hbsag: '',
  antiHcv: '',
  hcvAb: '',
  hcvPreVl: '',
  hcvPostVl: '',
  hbvVl: '',
  vdrl: '',
  tpha: '',
  tst: '',
  cr: '',
  prep: false,
  npep: false,
  tpt: '',
  antiHbs: '',
  fbs: '',
  alt: '',
  chol: '',
  tg: '',
  hdl: '',
  ldl: '',
  cbc: '',
  cxr: '',
  drResistance: '',
});

export const LabTab: React.FC<LabTabProps> = ({ patient, onUpdatePatient }) => {
  const [editingOriginalDate, setEditingOriginalDate] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [draft, setDraft] = useState<ColumnData | null>(null);
  const [showExtraLabs, setShowExtraLabs] = useState<boolean>(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Build unified columns from all linked data sources
  const columns = useMemo<ColumnData[]>(() => {
    const dateSet = new Set<string>();
    const addDate = (d?: string) => {
      const iso = toLocalISOString(d);
      if (iso) dateSet.add(iso);
    };

    patient.labInfo?.records?.forEach(r => addDate(r.date));

    patient.medicalHistory?.forEach(e => {
      if (e.type === MedicalEventType.LAB_RESULT) {
        addDate(e.date);
      } else if (e.type === MedicalEventType.PROPHYLAXIS && e.details?.TPT) {
        addDate(e.date);
      } else if (
        e.type === MedicalEventType.DIAGNOSIS &&
        (hasValue(e.details?.['Initial CD4 count']) || hasValue(e.details?.['Initial CD4 %']))
      ) {
        addDate(e.date);
      }
    });

    patient.hbvInfo?.hbsAgTests?.forEach(t => addDate(t.date));
    patient.hbvInfo?.viralLoads?.forEach(t => addDate(t.date));
    patient.hcvInfo?.hcvTests?.forEach(t => addDate(t.date));
    patient.hcvInfo?.preTreatmentVls?.forEach(t => addDate(t.date));
    patient.hcvInfo?.postTreatmentVls?.forEach(t => addDate(t.date));
    patient.prepInfo?.records?.forEach(r => addDate(r.dateStart));
    patient.pepInfo?.records?.forEach(r => {
      if (r.type === 'nPEP' || !r.type) addDate(r.date);
    });

    // Sort descending (latest on the left, oldest on the right)
    const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(date => {
      const labRec = (patient.labInfo?.records || []).find(
        r => toLocalISOString(r.date) === date
      );

      const labEvents = (patient.medicalHistory || []).filter(
        e => e.type === MedicalEventType.LAB_RESULT && toLocalISOString(e.date) === date
      );
      const diagEvent = (patient.medicalHistory || []).find(
        e => e.type === MedicalEventType.DIAGNOSIS && toLocalISOString(e.date) === date
      );

      let cd4 = '';
      let cd4Percent = '';
      let hivVl = '';
      for (const evt of labEvents) {
        if (!cd4 && hasValue(evt.details?.CD4)) cd4 = String(evt.details.CD4);
        if (!cd4Percent && hasValue(evt.details?.['CD4 %'])) cd4Percent = String(evt.details['CD4 %']);
        if (!hivVl && hasValue(evt.details?.['Viral load'])) hivVl = String(evt.details['Viral load']);
      }
      if (!cd4 && diagEvent && hasValue(diagEvent.details?.['Initial CD4 count'])) {
        cd4 = String(diagEvent.details['Initial CD4 count']);
      }
      if (!cd4Percent && diagEvent && hasValue(diagEvent.details?.['Initial CD4 %'])) {
        cd4Percent = String(diagEvent.details['Initial CD4 %']);
      }

      const tptEvent = (patient.medicalHistory || []).find(
        e =>
          e.type === MedicalEventType.PROPHYLAXIS &&
          e.details?.TPT &&
          toLocalISOString(e.date) === date
      );

      const hbsAgTest = (patient.hbvInfo?.hbsAgTests || []).find(
        t => toLocalISOString(t.date) === date
      );
      const hbvVlTest = (patient.hbvInfo?.viralLoads || []).find(
        t => toLocalISOString(t.date) === date
      );

      const antiHcvTest = (patient.hcvInfo?.hcvTests || []).find(
        t => toLocalISOString(t.date) === date && t.type === 'Anti-HCV'
      );
      const hcvAbTest = (patient.hcvInfo?.hcvTests || []).find(
        t => toLocalISOString(t.date) === date && t.type === 'HCV-Ab'
      );
      const hcvPreVlTest = (patient.hcvInfo?.preTreatmentVls || []).find(
        t => toLocalISOString(t.date) === date
      );
      const hcvPostVlTest = (patient.hcvInfo?.postTreatmentVls || []).find(
        t => toLocalISOString(t.date) === date
      );

      const hasPrep = (patient.prepInfo?.records || []).some(
        r => toLocalISOString(r.dateStart) === date
      );
      const hasNpep = (patient.pepInfo?.records || []).some(
        r => toLocalISOString(r.date) === date && (r.type === 'nPEP' || !r.type)
      );

      return {
        date,
        cd4,
        cd4Percent,
        hivVl,
        hbsag: hbsAgTest?.result || '',
        antiHcv: antiHcvTest?.result || '',
        hcvAb: hcvAbTest?.result || '',
        hcvPreVl: toDisplayStr(hcvPreVlTest?.result),
        hcvPostVl: toDisplayStr(hcvPostVlTest?.result),
        hbvVl: toDisplayStr(hbvVlTest?.result),
        vdrl: toDisplayStr(labRec?.vdrl),
        tpha: toDisplayStr(labRec?.tpha),
        tst: toDisplayStr(labRec?.tst),
        cr: toDisplayStr(labRec?.cr),
        prep: hasPrep,
        npep: hasNpep,
        tpt: tptEvent ? toDisplayStr(tptEvent.details?.['สูตร TPT'] || 'ได้รับ TPT') : '',
        antiHbs: toDisplayStr(labRec?.antiHbs),
        fbs: toDisplayStr(labRec?.fbs),
        alt: toDisplayStr(labRec?.alt),
        chol: toDisplayStr(labRec?.chol),
        tg: toDisplayStr(labRec?.tg),
        hdl: toDisplayStr(labRec?.hdl),
        ldl: toDisplayStr(labRec?.ldl),
        cbc: toDisplayStr(labRec?.cbc),
        cxr: toDisplayStr(labRec?.cxr),
        drResistance: toDisplayStr(labRec?.drResistance),
      };
    });
  }, [patient]);

  // Automatically reveal extra lab rows if any column already has extra lab data
  const hasAnyExtraData = useMemo(() => {
    const extraKeys = ROWS.filter(r => r.isExtra).map(r => r.key);
    return columns.some(col => extraKeys.some(k => hasValue(col[k])));
  }, [columns]);

  const visibleRows = useMemo(() => {
    if (showExtraLabs || hasAnyExtraData) return ROWS;
    return ROWS.filter(r => !r.isExtra);
  }, [showExtraLabs, hasAnyExtraData]);

  // Scroll horizontally to the left so the latest date column is immediately visible
  useEffect(() => {
    const el = tableScrollRef.current;
    if (el) {
      el.scrollLeft = 0;
    }
  }, [patient.id, isAddingNew]);

  const handleStartAdd = () => {
    const today = toLocalISOString(new Date());
    const existingCol = columns.find(c => c.date === today);
    if (existingCol) {
      setIsAddingNew(false);
      setEditingOriginalDate(today);
      setDraft({ ...existingCol });
      return;
    }
    setEditingOriginalDate(null);
    setIsAddingNew(true);
    setDraft(createEmptyColumn(today));
  };

  const handleStartEdit = (col: ColumnData) => {
    setIsAddingNew(false);
    setEditingOriginalDate(col.date);
    setDraft({ ...col });
  };

  const handleCancelEdit = () => {
    setIsAddingNew(false);
    setEditingOriginalDate(null);
    setDraft(null);
  };

  const handleDraftFieldChange = (key: FieldKey, value: string | boolean) => {
    setDraft(prev => (prev ? { ...prev, [key]: value } : null));
  };

  const buildUpdatedPatient = (
    targetDate: string,
    sourceDate: string | null,
    data: ColumnData
  ): Patient => {
    let medicalHistory: MedicalEvent[] = [...(patient.medicalHistory || [])];
    const hbvInfo = {
      manualSummary: patient.hbvInfo?.manualSummary,
      hbsAgTests: [...(patient.hbvInfo?.hbsAgTests || [])],
      viralLoads: [...(patient.hbvInfo?.viralLoads || [])],
      ultrasounds: [...(patient.hbvInfo?.ultrasounds || [])],
      ctScans: [...(patient.hbvInfo?.ctScans || [])],
    };
    const hcvInfo = {
      hcvVlNotTested: patient.hcvInfo?.hcvVlNotTested,
      hcvTests: [...(patient.hcvInfo?.hcvTests || [])],
      preTreatmentVls: [...(patient.hcvInfo?.preTreatmentVls || [])],
      treatments: [...(patient.hcvInfo?.treatments || [])],
      postTreatmentVls: [...(patient.hcvInfo?.postTreatmentVls || [])],
    };
    let prepRecords = [...(patient.prepInfo?.records || [])];
    let pepRecords = [...(patient.pepInfo?.records || [])];
    let labRecords: LabRecord[] = [...(patient.labInfo?.records || [])];

    const matchDate = sourceDate || targetDate;

    // 1. Sync HIV Labs (CD4, CD4 %, HIV VL) -> medicalHistory (LAB_RESULT / DIAGNOSIS)
    const existingLabIdx = medicalHistory.findIndex(
      e => e.type === MedicalEventType.LAB_RESULT && toLocalISOString(e.date) === matchDate
    );
    const existingDiagIdx = medicalHistory.findIndex(
      e => e.type === MedicalEventType.DIAGNOSIS && toLocalISOString(e.date) === matchDate
    );

    const hasAnyHivLab = hasValue(data.cd4) || hasValue(data.cd4Percent) || hasValue(data.hivVl);

    if (existingLabIdx >= 0) {
      // Consolidate if multiple LAB_RESULT on matchDate
      const targetEvt = medicalHistory[existingLabIdx];
      medicalHistory = medicalHistory.filter(
        (e, idx) =>
          idx === existingLabIdx ||
          !(e.type === MedicalEventType.LAB_RESULT && toLocalISOString(e.date) === matchDate)
      );
      const updatedIdx = medicalHistory.findIndex(e => e.id === targetEvt.id);
      if (hasAnyHivLab) {
        const nextDetails: Record<string, any> = { ...targetEvt.details };
        if (hasValue(data.cd4)) nextDetails.CD4 = data.cd4.trim();
        else delete nextDetails.CD4;

        if (hasValue(data.cd4Percent)) nextDetails['CD4 %'] = data.cd4Percent.trim();
        else delete nextDetails['CD4 %'];

        if (hasValue(data.hivVl)) nextDetails['Viral load'] = data.hivVl.trim();
        else delete nextDetails['Viral load'];

        medicalHistory[updatedIdx] = {
          ...targetEvt,
          date: targetDate,
          details: nextDetails,
        };
      } else {
        medicalHistory.splice(updatedIdx, 1);
      }
    } else if (
      existingDiagIdx >= 0 &&
      (hasValue(medicalHistory[existingDiagIdx].details?.['Initial CD4 count']) ||
        hasValue(medicalHistory[existingDiagIdx].details?.['Initial CD4 %']))
    ) {
      // Update Diagnosis initial CD4 fields without removing Diagnosis event
      const diagEvt = medicalHistory[existingDiagIdx];
      const nextDiagDetails = { ...diagEvt.details };
      if (hasValue(data.cd4)) nextDiagDetails['Initial CD4 count'] = data.cd4.trim();
      else delete nextDiagDetails['Initial CD4 count'];

      if (hasValue(data.cd4Percent)) nextDiagDetails['Initial CD4 %'] = data.cd4Percent.trim();
      else delete nextDiagDetails['Initial CD4 %'];

      medicalHistory[existingDiagIdx] = {
        ...diagEvt,
        details: nextDiagDetails,
      };

      // If HIV VL was entered on diagnosis date, record it in LAB_RESULT
      if (hasValue(data.hivVl)) {
        medicalHistory.unshift({
          id: `evt-lab-${Date.now()}`,
          type: MedicalEventType.LAB_RESULT,
          date: targetDate,
          title: 'CD4, Viral load',
          details: { 'Viral load': data.hivVl.trim() },
        });
      }
    } else if (hasAnyHivLab) {
      // Create new LAB_RESULT event
      const newDetails: Record<string, any> = {};
      if (hasValue(data.cd4)) newDetails.CD4 = data.cd4.trim();
      if (hasValue(data.cd4Percent)) newDetails['CD4 %'] = data.cd4Percent.trim();
      if (hasValue(data.hivVl)) newDetails['Viral load'] = data.hivVl.trim();
      medicalHistory.unshift({
        id: `evt-lab-${Date.now()}`,
        type: MedicalEventType.LAB_RESULT,
        date: targetDate,
        title: 'CD4, Viral load',
        details: newDetails,
      });
    }

    // 2. Sync TPT -> medicalHistory (PROPHYLAXIS)
    const tptIdx = medicalHistory.findIndex(
      e =>
        e.type === MedicalEventType.PROPHYLAXIS &&
        e.details?.TPT &&
        toLocalISOString(e.date) === matchDate
    );
    if (hasValue(data.tpt)) {
      if (tptIdx >= 0) {
        const evt = medicalHistory[tptIdx];
        medicalHistory[tptIdx] = {
          ...evt,
          date: targetDate,
          details: {
            ...evt.details,
            TPT: true,
            'สูตร TPT': data.tpt.trim(),
          },
        };
      } else {
        medicalHistory.unshift({
          id: `evt-tpt-${Date.now()}`,
          type: MedicalEventType.PROPHYLAXIS,
          date: targetDate,
          title: 'การป้องกัน',
          details: {
            TPT: true,
            'สูตร TPT': data.tpt.trim(),
          },
        });
      }
    } else if (tptIdx >= 0) {
      const evt = medicalHistory[tptIdx];
      const hasOtherProphylaxis = !!evt.details?.['PJP Prophylaxis'] || !!evt.details?.['อื่นๆ'];
      if (hasOtherProphylaxis) {
        const nextDetails = { ...evt.details };
        delete nextDetails.TPT;
        delete nextDetails['สูตร TPT'];
        medicalHistory[tptIdx] = { ...evt, details: nextDetails };
      } else {
        medicalHistory.splice(tptIdx, 1);
      }
    }

    // 3. Sync HBsAg -> hbvInfo.hbsAgTests
    const existingHbs = hbvInfo.hbsAgTests.find(
      t => toLocalISOString(t.date) === matchDate
    );
    hbvInfo.hbsAgTests = hbvInfo.hbsAgTests.filter(
      t =>
        toLocalISOString(t.date) !== matchDate &&
        toLocalISOString(t.date) !== targetDate
    );
    if (hasValue(data.hbsag)) {
      const validResult: HbsAgTest['result'] =
        data.hbsag === 'Positive' || data.hbsag === 'Negative' || data.hbsag === 'Inconclusive'
          ? data.hbsag
          : 'Inconclusive';
      hbvInfo.hbsAgTests.push({
        id: existingHbs?.id || `hbsAgTests-${Date.now()}`,
        date: targetDate,
        result: validResult,
      });
    }
    hbvInfo.hbsAgTests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4. Sync HBV Viral Load -> hbvInfo.viralLoads
    const existingHbvVl = hbvInfo.viralLoads.find(
      t => toLocalISOString(t.date) === matchDate
    );
    hbvInfo.viralLoads = hbvInfo.viralLoads.filter(
      t =>
        toLocalISOString(t.date) !== matchDate &&
        toLocalISOString(t.date) !== targetDate
    );
    if (hasValue(data.hbvVl)) {
      hbvInfo.viralLoads.push({
        id: existingHbvVl?.id || `viralLoads-${Date.now()}`,
        date: targetDate,
        result: data.hbvVl.trim(),
      });
    }
    hbvInfo.viralLoads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 5. Sync Anti-HCV & HCV-Ab -> hcvInfo.hcvTests
    const syncHcvTestType = (testType: HcvTest['type'], val: string) => {
      const existing = hcvInfo.hcvTests.find(
        t => toLocalISOString(t.date) === matchDate && t.type === testType
      );
      hcvInfo.hcvTests = hcvInfo.hcvTests.filter(
        t =>
          !(
            (toLocalISOString(t.date) === matchDate || toLocalISOString(t.date) === targetDate) &&
            t.type === testType
          )
      );
      if (hasValue(val)) {
        const validResult: HcvTest['result'] =
          val === 'Positive' || val === 'Negative' || val === 'Inconclusive'
            ? val
            : 'Inconclusive';
        hcvInfo.hcvTests.push({
          id: existing?.id || `hcv-test-${testType}-${Date.now()}`,
          type: testType,
          date: targetDate,
          result: validResult,
        });
      }
    };
    syncHcvTestType('Anti-HCV', data.antiHcv);
    syncHcvTestType('HCV-Ab', data.hcvAb);
    hcvInfo.hcvTests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 6. Sync HCV pre-treatment VL & post-treatment VL
    const existingPreVl = hcvInfo.preTreatmentVls.find(
      t => toLocalISOString(t.date) === matchDate
    );
    hcvInfo.preTreatmentVls = hcvInfo.preTreatmentVls.filter(
      t =>
        toLocalISOString(t.date) !== matchDate &&
        toLocalISOString(t.date) !== targetDate
    );
    if (hasValue(data.hcvPreVl)) {
      hcvInfo.preTreatmentVls.push({
        id: existingPreVl?.id || `preTreatmentVls-${Date.now()}`,
        date: targetDate,
        result: data.hcvPreVl.trim(),
      });
    }
    hcvInfo.preTreatmentVls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const existingPostVl = hcvInfo.postTreatmentVls.find(
      t => toLocalISOString(t.date) === matchDate
    );
    hcvInfo.postTreatmentVls = hcvInfo.postTreatmentVls.filter(
      t =>
        toLocalISOString(t.date) !== matchDate &&
        toLocalISOString(t.date) !== targetDate
    );
    if (hasValue(data.hcvPostVl)) {
      hcvInfo.postTreatmentVls.push({
        id: existingPostVl?.id || `postTreatmentVls-${Date.now()}`,
        date: targetDate,
        result: data.hcvPostVl.trim(),
      });
    }
    hcvInfo.postTreatmentVls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 7. Sync PrEP -> prepInfo.records
    const existingPrep = prepRecords.find(
      r => toLocalISOString(r.dateStart) === matchDate
    );
    prepRecords = prepRecords.filter(
      r =>
        toLocalISOString(r.dateStart) !== matchDate &&
        toLocalISOString(r.dateStart) !== targetDate
    );
    if (data.prep) {
      prepRecords.push({
        id: existingPrep?.id || `prep-${Date.now()}`,
        dateStart: targetDate,
        dateStop: existingPrep?.dateStop,
      });
    }

    // 8. Sync NPEP -> pepInfo.records
    const existingNpep = pepRecords.find(
      r => toLocalISOString(r.date) === matchDate && (r.type === 'nPEP' || !r.type)
    );
    pepRecords = pepRecords.filter(
      r =>
        !(
          (toLocalISOString(r.date) === matchDate || toLocalISOString(r.date) === targetDate) &&
          (r.type === 'nPEP' || !r.type)
        )
    );
    if (data.npep) {
      pepRecords.push({
        id: existingNpep?.id || `pep-${Date.now()}`,
        date: targetDate,
        type: 'nPEP',
      });
    }

    // 9. Sync lab_records (labInfo.records)
    const existingLabRec = labRecords.find(
      r => toLocalISOString(r.date) === matchDate
    );
    labRecords = labRecords.filter(
      r =>
        toLocalISOString(r.date) !== matchDate &&
        toLocalISOString(r.date) !== targetDate
    );

    const hasLabTableFields =
      hasValue(data.vdrl) ||
      hasValue(data.tpha) ||
      hasValue(data.tst) ||
      hasValue(data.cr) ||
      hasValue(data.antiHbs) ||
      hasValue(data.fbs) ||
      hasValue(data.alt) ||
      hasValue(data.chol) ||
      hasValue(data.tg) ||
      hasValue(data.hdl) ||
      hasValue(data.ldl) ||
      hasValue(data.cbc) ||
      hasValue(data.cxr) ||
      hasValue(data.drResistance);

    if (hasLabTableFields) {
      labRecords.push({
        id: existingLabRec?.id || `lab-${Date.now()}`,
        date: targetDate,
        cd4: hasValue(data.cd4) ? data.cd4.trim() : undefined,
        cd4Percent: hasValue(data.cd4Percent) ? data.cd4Percent.trim() : undefined,
        hivVl: hasValue(data.hivVl) ? data.hivVl.trim() : undefined,
        hbsag: hasValue(data.hbsag) ? data.hbsag.trim() : undefined,
        antiHcv: hasValue(data.antiHcv) ? data.antiHcv.trim() : undefined,
        vdrl: hasValue(data.vdrl) ? data.vdrl.trim() : undefined,
        tpha: hasValue(data.tpha) ? data.tpha.trim() : undefined,
        tst: hasValue(data.tst) ? data.tst.trim() : undefined,
        cr: hasValue(data.cr) ? data.cr.trim() : undefined,
        antiHbs: hasValue(data.antiHbs) ? data.antiHbs.trim() : undefined,
        fbs: hasValue(data.fbs) ? data.fbs.trim() : undefined,
        alt: hasValue(data.alt) ? data.alt.trim() : undefined,
        chol: hasValue(data.chol) ? data.chol.trim() : undefined,
        tg: hasValue(data.tg) ? data.tg.trim() : undefined,
        hdl: hasValue(data.hdl) ? data.hdl.trim() : undefined,
        ldl: hasValue(data.ldl) ? data.ldl.trim() : undefined,
        cbc: hasValue(data.cbc) ? data.cbc.trim() : undefined,
        cxr: hasValue(data.cxr) ? data.cxr.trim() : undefined,
        drResistance: hasValue(data.drResistance) ? data.drResistance.trim() : undefined,
      });
    }
    labRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ...patient,
      medicalHistory,
      hbvInfo,
      hcvInfo,
      prepInfo: { records: prepRecords },
      pepInfo: { records: pepRecords },
      labInfo: { records: labRecords },
    };
  };

  const handleSaveColumn = () => {
    if (!draft) return;
    if (!draft.date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      alert('กรุณาระบุวันที่ให้ถูกต้อง (dd/mm/yyyy พ.ศ.)');
      return;
    }

    if (
      editingOriginalDate &&
      draft.date !== editingOriginalDate &&
      columns.some(c => c.date === draft.date)
    ) {
      alert(`วันที่ ${formatThaiDateBE(draft.date)} มีข้อมูลอยู่ในตารางแล้ว กรุณาแก้ไขในคอลัมน์ของวันที่นั้นโดยตรง`);
      return;
    }

    const updated = buildUpdatedPatient(draft.date, editingOriginalDate, draft);
    onUpdatePatient(updated);
    handleCancelEdit();
  };

  const handleDeleteColumn = (date: string) => {
    if (
      !window.confirm(
        `คุณต้องการลบข้อมูล Lab และประวัติการตรวจของวันที่ ${formatThaiDateBE(date)} ทั้งหมดใช่หรือไม่?`
      )
    ) {
      return;
    }

    const empty = createEmptyColumn(date);
    const updated = buildUpdatedPatient(date, date, empty);
    onUpdatePatient(updated);
    if (editingOriginalDate === date) {
      handleCancelEdit();
    }
  };

  const handleQuickToggleCheckbox = (col: ColumnData, field: 'prep' | 'npep') => {
    if (isEditingAny) return;
    const nextCol: ColumnData = { ...col, [field]: !col[field] };
    const updated = buildUpdatedPatient(col.date, col.date, nextCol);
    onUpdatePatient(updated);
  };

  const renderEditCell = (row: RowDef) => {
    if (!draft) return null;
    const val = draft[row.key];

    if (row.inputType === 'checkbox') {
      const checked = Boolean(val);
      return (
        <label className="flex items-center justify-center gap-2 cursor-pointer py-1 select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => handleDraftFieldChange(row.key, e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
          />
          <span className={`text-xs font-medium ${checked ? 'text-emerald-700' : 'text-slate-400'}`}>
            {checked ? 'มารับ' : '-'}
          </span>
        </label>
      );
    }

    if (row.inputType === 'select') {
      const strVal = String(val || '');
      const options = row.options || [];
      const hasCustom = strVal && !options.includes(strVal);
      return (
        <select
          value={strVal}
          onChange={e => handleDraftFieldChange(row.key, e.target.value)}
          className="w-full px-2 py-1.5 text-sm bg-white border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        >
          <option value="">-</option>
          {hasCustom && <option value={strVal}>{strVal}</option>}
          {options.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (row.inputType === 'datalist') {
      const listId = `lab-datalist-${row.key}`;
      return (
        <>
          <input
            type="text"
            list={listId}
            value={String(val || '')}
            onChange={e => handleDraftFieldChange(row.key, e.target.value)}
            placeholder={row.placeholder || '-'}
            className="w-full px-2 py-1.5 text-sm bg-white border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          <datalist id={listId}>
            {(row.options || []).map(opt => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </>
      );
    }

    if (row.inputType === 'textarea') {
      return (
        <textarea
          rows={2}
          value={String(val || '')}
          onChange={e => handleDraftFieldChange(row.key, e.target.value)}
          placeholder={row.placeholder || '-'}
          className="w-full px-2 py-1 text-sm bg-white border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 min-w-[160px]"
        />
      );
    }

    return (
      <input
        type={row.inputType === 'number' ? 'text' : 'text'}
        inputMode={row.inputType === 'number' ? 'decimal' : undefined}
        value={String(val || '')}
        onChange={e => handleDraftFieldChange(row.key, e.target.value)}
        placeholder={row.placeholder || '-'}
        className="w-full px-2 py-1.5 text-sm bg-white border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
      />
    );
  };

  const renderDisplayCell = (row: RowDef, col: ColumnData) => {
    if (row.inputType === 'checkbox') {
      const checked = Boolean(col[row.key]);
      if (checked) {
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked
              onChange={() => handleQuickToggleCheckbox(col, row.key as 'prep' | 'npep')}
              title="มารับบริการในวันนี้ (คลิกเพื่อเปลี่ยนสถานะ)"
              className="h-4 w-4 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
          </div>
        );
      }
      return (
        <button
          type="button"
          onClick={() => handleQuickToggleCheckbox(col, row.key as 'prep' | 'npep')}
          title="ไม่ได้มารับ (คลิกเพื่อติ๊กเลือกมารับ)"
          className="w-full text-left text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
        >
          -
        </button>
      );
    }

    const rawVal = col[row.key];
    if (!hasValue(rawVal)) {
      return <span className="text-slate-400">-</span>;
    }

    const strVal = String(rawVal);
    const isPositive = strVal.toLowerCase() === 'positive';
    const isNumeric = /^-?\d+(\.\d+)?$/.test(strVal.trim());

    return (
      <div
        className={`whitespace-pre-wrap break-words ${
          isNumeric ? 'text-right font-medium text-slate-800 tabular-nums' : 'text-left'
        } ${isPositive ? 'text-rose-700 font-semibold' : 'text-slate-800'}`}
      >
        {strVal}
      </div>
    );
  };

  // Fill empty spreadsheet columns so the grid stays visually balanced like the reference
  const totalRenderedCols = columns.length + (isAddingNew ? 1 : 0);
  const emptyFillerCount = Math.max(0, 5 - totalRenderedCols);

  const isEditingAny = isAddingNew || editingOriginalDate !== null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Top Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <BeakerIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                ตารางบันทึกผล Lab และบริการ (Lab Flowsheet)
              </h2>
              <p className="text-xs text-slate-500">
                ข้อมูล CD4, CD4 %, HIV VL, HBsAg, Anti-HCV/HCV-Ab, HCV VL, PrEP, NPEP และ TPT เชื่อมต่อกับหน้าอื่นๆ อัตโนมัติ (คลิกที่ช่องข้อมูลเพื่อแก้ไขได้ทันที)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasAnyExtraData && (
              <button
                type="button"
                onClick={() => setShowExtraLabs(prev => !prev)}
                className="px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {showExtraLabs ? 'ซ่อน Lab เพิ่มเติม' : 'แสดง Lab เพิ่มเติม (CBC, Lipid, LFT, CXR)'}
              </button>
            )}
            {!isEditingAny && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                เพิ่มวันที่ตรวจ
              </button>
            )}
          </div>
        </div>

        {/* Matrix Spreadsheet Table */}
        <div
          ref={tableScrollRef}
          className={`overflow-x-auto ${isEditingAny ? 'pb-52' : ''}`}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-200/90 text-slate-900">
                <th className="sticky left-0 z-20 bg-slate-200 border border-slate-300 px-3 py-2.5 text-left font-bold min-w-[230px] w-[230px]">
                  วันที่
                </th>

                {isAddingNew && draft && (
                  <th className="border border-slate-300 px-3 py-2 bg-emerald-100/90 min-w-[180px] align-top">
                    <div className="space-y-2">
                      <DateInput
                        value={draft.date}
                        onChange={e => {
                          const pickedDate = e.target.value;
                          const existingCol = columns.find(c => c.date === pickedDate);
                          if (existingCol) {
                            setIsAddingNew(false);
                            setEditingOriginalDate(pickedDate);
                            setDraft({ ...existingCol });
                          } else {
                            setDraft(prev => (prev ? { ...prev, date: pickedDate } : null));
                          }
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveColumn}
                          className="flex-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 bg-white text-slate-700 border border-slate-300 text-xs font-medium rounded hover:bg-slate-50 transition-colors"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  </th>
                )}

                {columns.map(col => {
                  const isEditingThis = editingOriginalDate === col.date;
                  return (
                    <th
                      key={col.date}
                      className={`border border-slate-300 px-3 py-2 font-bold min-w-[165px] align-top ${
                        isEditingThis ? 'bg-emerald-100/90' : 'bg-slate-200/90'
                      }`}
                    >
                      {isEditingThis && draft ? (
                        <div className="space-y-2 min-w-[160px]">
                          <DateInput
                            value={draft.date}
                            onChange={e =>
                              setDraft(prev => (prev ? { ...prev, date: e.target.value } : null))
                            }
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleSaveColumn}
                              className="flex-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-2.5 py-1 bg-white text-slate-700 border border-slate-300 text-xs font-medium rounded hover:bg-slate-50 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 group">
                          <span className="flex-1 text-right font-bold text-slate-900 tabular-nums">
                            {formatThaiDateBE(col.date)}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(col)}
                              className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-white/70 rounded"
                              title="แก้ไขข้อมูลวันที่นี้"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteColumn(col.date)}
                              className="p-1 text-slate-600 hover:text-rose-600 hover:bg-white/70 rounded"
                              title="ลบข้อมูลวันที่นี้"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </th>
                  );
                })}

                {Array.from({ length: emptyFillerCount }).map((_, idx) => (
                  <th
                    key={`empty-th-${idx}`}
                    className="border border-slate-300 px-3 py-2.5 bg-slate-200/70 min-w-[130px] text-center"
                  >
                    {idx === 0 && !isEditingAny && (
                      <button
                        type="button"
                        onClick={handleStartAdd}
                        className="text-xs font-medium text-slate-500 hover:text-emerald-700 transition-colors"
                      >
                        + เพิ่มวันที่
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row, rowIdx) => {
                const prevRow = rowIdx > 0 ? visibleRows[rowIdx - 1] : null;
                const showExtraDivider = row.isExtra && (!prevRow || !prevRow.isExtra);

                return (
                  <React.Fragment key={row.key}>
                    {showExtraDivider && (
                      <tr className="bg-slate-100/80">
                        <td
                          colSpan={1 + totalRenderedCols + emptyFillerCount}
                          className="border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide"
                        >
                          ผลตรวจทางห้องปฏิบัติการเพิ่มเติม (Additional Labs)
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="sticky left-0 z-10 bg-slate-100 border border-slate-300 px-3 py-2 font-bold text-slate-900 align-middle">
                        <div className="flex items-center justify-between gap-2">
                          <span>{row.label}</span>
                          {row.linkedLabel && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600">
                              {row.linkedLabel}
                            </span>
                          )}
                        </div>
                      </td>

                      {isAddingNew && draft && (
                        <td className="border border-slate-300 px-3 py-2 bg-emerald-50/50 align-middle">
                          {renderEditCell(row)}
                        </td>
                      )}

                      {columns.map(col => {
                        const isEditingThis = editingOriginalDate === col.date;
                        return (
                          <td
                            key={`${row.key}-${col.date}`}
                            onClick={() => {
                              if (!isEditingThis && !isEditingAny && row.inputType !== 'checkbox') {
                                handleStartEdit(col);
                              }
                            }}
                            className={`border border-slate-300 px-3 py-2 align-middle ${
                              isEditingThis
                                ? 'bg-emerald-50/50'
                                : !isEditingAny && row.inputType !== 'checkbox'
                                ? 'bg-white hover:bg-emerald-50/40 cursor-pointer'
                                : 'bg-white'
                            }`}
                          >
                            {isEditingThis ? renderEditCell(row) : renderDisplayCell(row, col)}
                          </td>
                        );
                      })}

                      {Array.from({ length: emptyFillerCount }).map((_, idx) => (
                        <td
                          key={`empty-td-${row.key}-${idx}`}
                          className="border border-slate-300 px-3 py-2 bg-white"
                        />
                      ))}
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* Bottom quick-save row when editing or adding a column */}
              {isEditingAny && (
                <tr className="bg-slate-50">
                  <td className="sticky left-0 z-10 bg-slate-100 border border-slate-300 px-3 py-2 font-semibold text-slate-600">
                    จัดการคอลัมน์
                  </td>
                  {isAddingNew && (
                    <td className="border border-slate-300 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveColumn}
                          className="flex-1 px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1.5 bg-white text-slate-700 border border-slate-300 text-xs font-medium rounded hover:bg-slate-50 transition-colors"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </td>
                  )}
                  {columns.map(col => {
                    const isEditingThis = editingOriginalDate === col.date;
                    return (
                      <td key={`action-${col.date}`} className="border border-slate-300 px-3 py-2">
                        {isEditingThis && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleSaveColumn}
                              className="flex-1 px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-2.5 py-1.5 bg-white text-slate-700 border border-slate-300 text-xs font-medium rounded hover:bg-slate-50 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {Array.from({ length: emptyFillerCount }).map((_, idx) => (
                    <td key={`empty-action-${idx}`} className="border border-slate-300 px-3 py-2" />
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
