import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Patient,
  LabRecord,
  MedicalEvent,
  MedicalEventType,
  HbsAgTest,
  HcvTest,
} from '../../types';
import { BeakerIcon, EditIcon, TrashIcon } from '../icons';
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
  cryptoAg: string;
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
const VDRL_OPTIONS = ['NR', '1:2', '1:4', '1:8', '1:16', '1:32'];

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
  { key: 'vdrl', label: 'VDRL', inputType: 'datalist', options: VDRL_OPTIONS, placeholder: 'NR / 1:2 - 1:32' },
  { key: 'tpha', label: 'TPHA', inputType: 'datalist', options: SEROLOGY_OPTIONS, placeholder: 'Positive / Negative' },
  { key: 'cryptoAg', label: 'CryptoAg', inputType: 'datalist', options: SEROLOGY_OPTIONS, placeholder: 'Positive / Negative' },
  { key: 'tst', label: 'TST', inputType: 'datalist', options: ['Positive', 'Negative'], placeholder: 'Positive / Negative' },
  { key: 'cr', label: 'Cr', inputType: 'text', placeholder: 'e.g. 0.8' },
  { key: 'prep', label: 'PrEP', inputType: 'checkbox', linkedLabel: 'PrEP' },
  { key: 'npep', label: 'NPEP', inputType: 'checkbox', linkedLabel: 'PEP' },
  { key: 'tpt', label: 'TPT', inputType: 'datalist', options: TPT_OPTIONS, placeholder: 'เช่น 3HP, 1HP', linkedLabel: 'TPT' },
  // Additional lab fields from lab_records & HBV
  { key: 'hbvVl', label: 'HBV Viral Load', inputType: 'text', placeholder: 'e.g. 1,500 IU/mL', linkedLabel: 'HBV', isExtra: true },
  { key: 'antiHbs', label: 'Anti-HBs', inputType: 'select', options: ['Positive', 'Negative'], isExtra: true },
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

const valuesMatch = (a: string, b: string, inputType: RowDef['inputType']): boolean => {
  const sa = a.trim();
  const sb = b.trim();
  if (sa === sb || sa.toLowerCase() === sb.toLowerCase()) return true;
  if (inputType === 'number') {
    const na = Number(sa);
    const nb = Number(sb);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) {
      return na === nb;
    }
  }
  return false;
};

const parseNumericValue = (raw: string): { num: number; comparator?: '<' | '>' } | null => {
  const cleaned = raw.trim().replace(/,/g, '');
  if (!cleaned) return null;
  if (/^(not\s*detected|undetected|nd|negative|nr)$/i.test(cleaned)) {
    return { num: 0 };
  }
  const compMatch = cleaned.match(
    /^([<>])\s*=?\s*(-?\d+(?:\.\d+)?)(?:\s*(?:copies\/ml|iu\/ml|mg\/dl|u\/l|cells\/mm3))?$/i
  );
  if (compMatch) {
    const num = parseFloat(compMatch[2]);
    if (!Number.isNaN(num)) {
      return { num, comparator: compMatch[1] as '<' | '>' };
    }
  }
  const exactMatch = cleaned.match(
    /^(-?\d+(?:\.\d+)?)(?:\s*(?:copies\/ml|iu\/ml|mg\/dl|u\/l|cells\/mm3))?$/i
  );
  if (exactMatch) {
    const num = parseFloat(exactMatch[1]);
    if (!Number.isNaN(num)) {
      return { num };
    }
  }
  return null;
};

type LabTone = 'abnormal' | 'favorable' | 'neutral';

const getLabResultTone = (key: FieldKey, rawVal: string): LabTone => {
  const trimmed = rawVal.trim();
  if (!trimmed) return 'neutral';
  const lower = trimmed.toLowerCase();

  switch (key) {
    case 'cd4': {
      const parsed = parseNumericValue(trimmed);
      if (!parsed) return 'neutral';
      if (parsed.comparator === '<') return parsed.num <= 200 ? 'abnormal' : 'neutral';
      if (parsed.comparator === '>') return parsed.num >= 200 ? 'favorable' : 'neutral';
      if (parsed.num < 200) return 'abnormal';
      if (parsed.num > 200) return 'favorable';
      return 'neutral';
    }
    case 'hivVl': {
      const parsed = parseNumericValue(trimmed);
      if (!parsed) return 'neutral';
      if (parsed.comparator === '<') return parsed.num <= 50 ? 'favorable' : 'neutral';
      if (parsed.comparator === '>') return parsed.num >= 50 ? 'abnormal' : 'neutral';
      if (parsed.num > 50) return 'abnormal';
      if (parsed.num < 50) return 'favorable';
      return 'neutral';
    }
    case 'hbsag':
    case 'antiHcv':
    case 'hcvAb':
    case 'tpha':
    case 'cryptoAg':
    case 'tst':
      if (lower === 'positive') return 'abnormal';
      if (lower === 'negative') return 'favorable';
      return 'neutral';
    case 'antiHbs':
      if (lower === 'positive') return 'favorable';
      return 'neutral';
    case 'vdrl':
      if (['nr', 'non-reactive', 'non reactive'].includes(lower)) return 'favorable';
      if (lower === '-') return 'neutral';
      return 'abnormal';
    case 'cr': {
      const parsed = parseNumericValue(trimmed);
      if (!parsed) return 'neutral';
      if (parsed.comparator === '<') return parsed.num <= 1.2 ? 'favorable' : 'neutral';
      if (parsed.comparator === '>') return parsed.num >= 1.5 ? 'abnormal' : 'neutral';
      if (parsed.num > 1.5) return 'abnormal';
      if (parsed.num < 1.2) return 'favorable';
      return 'neutral';
    }
    case 'fbs': {
      const parsed = parseNumericValue(trimmed);
      if (!parsed) return 'neutral';
      if (parsed.comparator === '<') return parsed.num <= 110 ? 'favorable' : 'neutral';
      if (parsed.comparator === '>') return parsed.num >= 126 ? 'abnormal' : 'neutral';
      if (parsed.num > 126) return 'abnormal';
      if (parsed.num < 110) return 'favorable';
      return 'neutral';
    }
    case 'tg': {
      const parsed = parseNumericValue(trimmed);
      if (!parsed) return 'neutral';
      if (parsed.comparator === '<') return parsed.num <= 200 ? 'favorable' : 'neutral';
      if (parsed.comparator === '>') return parsed.num >= 200 ? 'abnormal' : 'neutral';
      if (parsed.num > 200) return 'abnormal';
      if (parsed.num < 200) return 'favorable';
      return 'neutral';
    }
    case 'ldl': {
      const parsed = parseNumericValue(trimmed);
      if (!parsed) return 'neutral';
      if (parsed.comparator === '<') return parsed.num <= 100 ? 'favorable' : 'neutral';
      if (parsed.comparator === '>') return parsed.num >= 130 ? 'abnormal' : 'neutral';
      if (parsed.num > 130) return 'abnormal';
      if (parsed.num < 100) return 'favorable';
      return 'neutral';
    }
    default:
      return 'neutral';
  }
};

interface ConflictItem {
  key: FieldKey;
  label: string;
  existingVal: string;
  incomingVal: string;
}

interface ConflictAlert {
  date: string;
  items: ConflictItem[];
}

interface FeedbackBanner {
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

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
  cryptoAg: '',
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
  const [newDraft, setNewDraft] = useState<ColumnData>(() =>
    createEmptyColumn(toLocalISOString(new Date()))
  );
  const [editingOriginalDate, setEditingOriginalDate] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ColumnData | null>(null);
  const [showExtraLabs, setShowExtraLabs] = useState<boolean>(false);
  const [conflictAlert, setConflictAlert] = useState<ConflictAlert | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<FeedbackBanner | null>(null);
  const [pendingDeleteDate, setPendingDeleteDate] = useState<string | null>(null);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const colHeaderRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const editCellRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});

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
        cryptoAg: toDisplayStr(labRec?.cryptoAg),
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

  // Reset form states and scroll left when switching patient
  useEffect(() => {
    setNewDraft(createEmptyColumn(toLocalISOString(new Date())));
    setEditingOriginalDate(null);
    setEditDraft(null);
    setConflictAlert(null);
    setFeedbackBanner(null);
    setPendingDeleteDate(null);
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = 0;
    }
  }, [patient.id]);

  // Auto-scroll and focus on the conflicting existing lab cell when duplicate conflict occurs
  useEffect(() => {
    if (!conflictAlert || editingOriginalDate !== conflictAlert.date) return;
    const targetDate = conflictAlert.date;
    const firstConflictKey = conflictAlert.items[0]?.key;

    const rafId = requestAnimationFrame(() => {
      const headerEl = colHeaderRefs.current[targetDate];
      if (headerEl) {
        headerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      if (firstConflictKey) {
        const inputEl = editCellRefs.current[firstConflictKey];
        if (inputEl) {
          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          if (typeof (inputEl as HTMLInputElement).focus === 'function') {
            (inputEl as HTMLInputElement).focus();
          }
        }
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [conflictAlert, editingOriginalDate]);

  const handleResetNewDraft = () => {
    setNewDraft(createEmptyColumn(toLocalISOString(new Date())));
  };

  const handleNewFieldChange = (key: FieldKey, value: string | boolean) => {
    setNewDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleStartEdit = (col: ColumnData) => {
    setEditingOriginalDate(col.date);
    setEditDraft({ ...col });
    setConflictAlert(null);
    setPendingDeleteDate(null);
  };

  const handleCancelEdit = () => {
    setEditingOriginalDate(null);
    setEditDraft(null);
    setConflictAlert(null);
  };

  const handleEditFieldChange = (key: FieldKey, value: string | boolean) => {
    setEditDraft(prev => (prev ? { ...prev, [key]: value } : null));
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
      hasValue(data.cryptoAg) ||
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
        cryptoAg: hasValue(data.cryptoAg) ? data.cryptoAg.trim() : undefined,
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

  const handleSaveNewColumn = () => {
    setFeedbackBanner(null);
    setConflictAlert(null);

    if (!newDraft.date || !/^\d{4}-\d{2}-\d{2}$/.test(newDraft.date)) {
      setFeedbackBanner({
        type: 'error',
        message: 'กรุณาระบุวันที่ให้ถูกต้อง (dd/mm/yyyy พ.ศ.)',
      });
      return;
    }

    const hasAnyInput = ROWS.some(row =>
      row.inputType === 'checkbox' ? Boolean(newDraft[row.key]) : hasValue(newDraft[row.key])
    );

    if (!hasAnyInput) {
      setFeedbackBanner({
        type: 'warning',
        message: 'กรุณากรอกผล Lab อย่างน้อย 1 รายการก่อนบันทึก',
      });
      return;
    }

    const existingCol = columns.find(c => c.date === newDraft.date);

    // Date has no existing records yet -> create new column directly
    if (!existingCol) {
      const updated = buildUpdatedPatient(newDraft.date, null, newDraft);
      onUpdatePatient(updated);
      setNewDraft(createEmptyColumn(toLocalISOString(new Date())));
      setFeedbackBanner({
        type: 'success',
        message: `บันทึกผล Lab วันที่ ${formatThaiDateBE(newDraft.date)} เรียบร้อยแล้ว`,
      });
      return;
    }

    // Date already exists -> compare field by field
    const fieldsToAdd: { key: FieldKey; label: string; value: string | boolean }[] = [];
    const identicalLabels: string[] = [];
    const conflicts: ConflictItem[] = [];

    for (const row of ROWS) {
      if (row.inputType === 'checkbox') {
        const incomingChecked = Boolean(newDraft[row.key]);
        if (!incomingChecked) continue;
        const existingChecked = Boolean(existingCol[row.key]);
        if (!existingChecked) {
          fieldsToAdd.push({ key: row.key, label: row.label, value: true });
        } else {
          identicalLabels.push(row.label);
        }
      } else {
        const rawIncoming = newDraft[row.key];
        if (!hasValue(rawIncoming)) continue;
        const incomingTrimmed = String(rawIncoming).trim();
        const rawExisting = existingCol[row.key];

        if (!hasValue(rawExisting)) {
          fieldsToAdd.push({ key: row.key, label: row.label, value: incomingTrimmed });
        } else {
          const existingTrimmed = String(rawExisting).trim();
          if (valuesMatch(incomingTrimmed, existingTrimmed, row.inputType)) {
            identicalLabels.push(row.label);
          } else {
            conflicts.push({
              key: row.key,
              label: row.label,
              existingVal: existingTrimmed,
              incomingVal: incomingTrimmed,
            });
          }
        }
      }
    }

    // If any existing field has a mismatching value -> jump to existing column & warn
    if (conflicts.length > 0) {
      const prefilledEdit: ColumnData = { ...existingCol };
      for (const item of fieldsToAdd) {
        (prefilledEdit as any)[item.key] = item.value;
      }
      setEditingOriginalDate(existingCol.date);
      setEditDraft(prefilledEdit);
      setConflictAlert({ date: existingCol.date, items: conflicts });
      return;
    }

    // No conflicts: save only fields that did not previously exist (skip identical fields)
    if (fieldsToAdd.length > 0) {
      const merged: ColumnData = { ...existingCol };
      for (const item of fieldsToAdd) {
        (merged as any)[item.key] = item.value;
      }
      const updated = buildUpdatedPatient(existingCol.date, existingCol.date, merged);
      onUpdatePatient(updated);
      setNewDraft(createEmptyColumn(toLocalISOString(new Date())));

      const addedNames = fieldsToAdd.map(f => f.label).join(', ');
      const skippedNote =
        identicalLabels.length > 0
          ? ` (ข้ามข้อมูลเดิมที่ตรงกัน: ${identicalLabels.join(', ')})`
          : '';
      setFeedbackBanner({
        type: 'success',
        message: `เพิ่มผล Lab วันที่ ${formatThaiDateBE(existingCol.date)} เรียบร้อย: ${addedNames}${skippedNote}`,
      });
      return;
    }

    // All entered fields were identical to existing values -> skip write
    setNewDraft(createEmptyColumn(toLocalISOString(new Date())));
    setFeedbackBanner({
      type: 'info',
      message: `ผล Lab วันที่ ${formatThaiDateBE(existingCol.date)} มีข้อมูลเดิมอยู่แล้วและค่าตรงกันทั้งหมด (${identicalLabels.join(', ')}) จึงข้ามการบันทึกซ้ำ`,
    });
  };

  const handleSaveEditedColumn = () => {
    if (!editDraft || !editingOriginalDate) return;
    if (!editDraft.date || !/^\d{4}-\d{2}-\d{2}$/.test(editDraft.date)) {
      setFeedbackBanner({
        type: 'error',
        message: 'กรุณาระบุวันที่ให้ถูกต้อง (dd/mm/yyyy พ.ศ.)',
      });
      return;
    }

    if (
      editDraft.date !== editingOriginalDate &&
      columns.some(c => c.date === editDraft.date)
    ) {
      setFeedbackBanner({
        type: 'error',
        message: `วันที่ ${formatThaiDateBE(editDraft.date)} มีข้อมูลอยู่ในตารางแล้ว กรุณาแก้ไขในคอลัมน์ของวันที่นั้นโดยตรง`,
      });
      return;
    }

    const updated = buildUpdatedPatient(editDraft.date, editingOriginalDate, editDraft);
    onUpdatePatient(updated);

    const savedDate = editDraft.date;
    const hadConflictForThisDate = conflictAlert?.date === editingOriginalDate;
    handleCancelEdit();
    if (hadConflictForThisDate && newDraft.date === savedDate) {
      setNewDraft(createEmptyColumn(toLocalISOString(new Date())));
    }
    setFeedbackBanner({
      type: 'success',
      message: `บันทึกการแก้ไขผล Lab วันที่ ${formatThaiDateBE(savedDate)} เรียบร้อยแล้ว`,
    });
  };

  const handleDeleteColumn = (date: string) => {
    const empty = createEmptyColumn(date);
    const updated = buildUpdatedPatient(date, date, empty);
    onUpdatePatient(updated);
    setPendingDeleteDate(null);
    if (editingOriginalDate === date) {
      handleCancelEdit();
    }
    setFeedbackBanner({
      type: 'info',
      message: `ลบข้อมูล Lab วันที่ ${formatThaiDateBE(date)} แล้ว`,
    });
  };

  const handleQuickToggleCheckbox = (col: ColumnData, field: 'prep' | 'npep') => {
    if (editingOriginalDate !== null) return;
    const nextCol: ColumnData = { ...col, [field]: !col[field] };
    const updated = buildUpdatedPatient(col.date, col.date, nextCol);
    onUpdatePatient(updated);
  };

  const renderEditCell = (
    row: RowDef,
    sourceDraft: ColumnData,
    onFieldChange: (key: FieldKey, value: string | boolean) => void,
    mode: 'new' | 'edit',
    conflictItem?: ConflictItem
  ) => {
    const val = sourceDraft[row.key];
    const isConflicting = Boolean(conflictItem);
    const borderRingClass = isConflicting
      ? 'border-rose-500 ring-2 ring-rose-400/50 bg-rose-50/70'
      : 'border-emerald-300 focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white';

    const attachEditRef = (el: HTMLElement | null) => {
      if (mode === 'edit') {
        editCellRefs.current[row.key] = el;
      }
    };

    if (row.inputType === 'checkbox') {
      const checked = Boolean(val);
      return (
        <label className="flex items-center justify-center gap-1.5 cursor-pointer py-0.5 select-none">
          <input
            ref={attachEditRef}
            type="checkbox"
            checked={checked}
            onChange={e => onFieldChange(row.key, e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
          />
          <span className={`text-[11px] font-medium ${checked ? 'text-emerald-700' : 'text-slate-400'}`}>
            {checked ? 'มารับ' : '-'}
          </span>
        </label>
      );
    }

    let control: React.ReactNode;

    if (row.inputType === 'select') {
      const strVal = String(val || '');
      const options = row.options || [];
      const hasCustom = strVal && !options.includes(strVal);
      control = (
        <select
          ref={attachEditRef}
          value={strVal}
          onChange={e => onFieldChange(row.key, e.target.value)}
          className={`w-full px-1.5 py-1 text-xs border rounded focus:outline-none ${borderRingClass}`}
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
    } else if (row.inputType === 'datalist') {
      const listId = `lab-datalist-${mode}-${row.key}`;
      control = (
        <>
          <input
            ref={attachEditRef}
            type="text"
            list={listId}
            value={String(val || '')}
            onChange={e => onFieldChange(row.key, e.target.value)}
            placeholder={row.placeholder || '-'}
            className={`w-full px-1.5 py-1 text-xs border rounded focus:outline-none ${borderRingClass}`}
          />
          <datalist id={listId}>
            {(row.options || []).map(opt => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </>
      );
    } else if (row.inputType === 'textarea') {
      control = (
        <textarea
          ref={attachEditRef}
          rows={2}
          value={String(val || '')}
          onChange={e => onFieldChange(row.key, e.target.value)}
          placeholder={row.placeholder || '-'}
          className={`w-full px-1.5 py-1 text-xs border rounded focus:outline-none min-w-[130px] ${borderRingClass}`}
        />
      );
    } else {
      control = (
        <input
          ref={attachEditRef}
          type="text"
          inputMode={row.inputType === 'number' ? 'decimal' : undefined}
          value={String(val || '')}
          onChange={e => onFieldChange(row.key, e.target.value)}
          placeholder={row.placeholder || '-'}
          className={`w-full px-1.5 py-1 text-xs border rounded focus:outline-none ${borderRingClass}`}
        />
      );
    }

    if (!conflictItem) {
      return control;
    }

    return (
      <div className="space-y-1">
        {control}
        <div className="flex items-center justify-between gap-1 text-[10px] leading-tight text-rose-700 bg-rose-50 border border-rose-200 rounded px-1 py-0.5">
          <span className="truncate" title={`ค่าใหม่ที่กรอก: ${conflictItem.incomingVal}`}>
            ใหม่: <b>{conflictItem.incomingVal}</b>
          </span>
          <button
            type="button"
            onClick={() => onFieldChange(row.key, conflictItem.incomingVal)}
            className="shrink-0 font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            ใช้ค่านี้
          </button>
        </div>
      </div>
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
              className="h-3.5 w-3.5 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
          </div>
        );
      }
      return (
        <button
          type="button"
          onClick={() => handleQuickToggleCheckbox(col, row.key as 'prep' | 'npep')}
          title="ไม่ได้มารับ (คลิกเพื่อติ๊กเลือกมารับ)"
          className="w-full text-center text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
        >
          -
        </button>
      );
    }

    const rawVal = col[row.key];
    if (!hasValue(rawVal)) {
      return <div className="w-full text-center text-slate-400">-</div>;
    }

    const strVal = String(rawVal);
    const tone = getLabResultTone(row.key, strVal);
    const isNumeric = /^-?\d+(\.\d+)?$/.test(strVal.trim());
    const toneClass =
      tone === 'abnormal'
        ? 'text-rose-700 font-semibold'
        : tone === 'favorable'
        ? 'text-emerald-700 font-semibold'
        : 'text-slate-800';

    return (
      <div
        className={`w-full text-right whitespace-pre-wrap break-words ${
          isNumeric ? 'font-medium tabular-nums' : ''
        } ${toneClass}`}
      >
        {strVal}
      </div>
    );
  };

  const totalRenderedCols = columns.length + 1; // Always includes pinned add-new column
  const isEditingExisting = editingOriginalDate !== null;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full">
        {/* Top Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
              <BeakerIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                ตารางบันทึกผล Lab และบริการ (Lab Flowsheet)
              </h2>
              <p className="text-[11px] text-slate-500">
                เชื่อมโยงข้อมูลกับหน้า HIV, HBV/HCV, PrEP, PEP และ TPT อัตโนมัติ (เพิ่มผล Lab ใหม่ได้ที่คอลัมน์ซ้ายสุด หรือคลิกช่องเดิมเพื่อแก้ไข)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasAnyExtraData && (
              <button
                type="button"
                onClick={() => setShowExtraLabs(prev => !prev)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {showExtraLabs ? 'ซ่อน Lab เพิ่มเติม' : 'แสดง Lab เพิ่มเติม'}
              </button>
            )}
          </div>
        </div>

        {/* Conflict Warning Banner (Duplicate Date with Mismatching Values) */}
        {conflictAlert && (
          <div className="mx-4 mt-3 p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1 text-xs">
              <div className="font-bold text-rose-800 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-600" />
                เตือน: Lab ซ้ำ แต่ค่าไม่ตรงกัน (วันที่ {formatThaiDateBE(conflictAlert.date)})
              </div>
              <p className="text-rose-700">
                ระบบได้เลื่อนไปที่ผล Lab ของวันที่ดังกล่าวแล้ว กรุณาตรวจสอบและเลือก/แก้ไขค่าที่ถูกต้องก่อนกดบันทึก:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-rose-800">
                {conflictAlert.items.map(item => (
                  <li key={item.key}>
                    <span className="font-semibold">{item.label}</span>: ค่าเดิม{' '}
                    <span className="font-mono font-semibold bg-white px-1 rounded border border-rose-200">
                      {item.existingVal}
                    </span>{' '}
                    ≠ ค่าที่กรอกใหม่{' '}
                    <span className="font-mono font-semibold bg-amber-50 px-1 rounded border border-amber-300">
                      {item.incomingVal}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setConflictAlert(null)}
              className="self-start px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
            >
              ปิดแจ้งเตือน
            </button>
          </div>
        )}

        {/* General Feedback Banner */}
        {feedbackBanner && (
          <div
            className={`mx-4 mt-3 px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedbackBanner.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-800'
                : feedbackBanner.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedbackBanner.message}</span>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-[11px] font-semibold opacity-70 hover:opacity-100 shrink-0"
            >
              ปิด
            </button>
          </div>
        )}

        {/* Matrix Spreadsheet Table */}
        <div ref={tableScrollRef} className="overflow-x-auto pb-3 mt-2">
          <table className="w-auto border-collapse text-xs">
            <thead>
              <tr className="bg-slate-200/90 text-slate-900">
                <th className="sticky left-0 z-20 bg-slate-200 border border-slate-300 px-2 py-1.5 text-left font-bold min-w-[128px] w-[140px] max-w-[148px]">
                  วันที่
                </th>

                {/* Always-visible Leftmost Add New Lab Column */}
                <th className="border border-slate-300 px-1.5 py-1.5 bg-emerald-100/90 min-w-[156px] w-[158px] align-top">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 tracking-wide">
                        + เพิ่ม Lab ใหม่
                      </span>
                    </div>
                    <DateInput
                      value={newDraft.date}
                      onChange={e =>
                        setNewDraft(prev => ({ ...prev, date: e.target.value }))
                      }
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSaveNewColumn}
                        className="flex-1 px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded hover:bg-emerald-700 transition-colors"
                      >
                        บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={handleResetNewDraft}
                        className="px-2 py-1 bg-white text-slate-700 border border-slate-300 text-[11px] font-medium rounded hover:bg-slate-50 transition-colors"
                        title="ล้างข้อมูลที่กรอกค้างไว้"
                      >
                        ล้างค่า
                      </button>
                    </div>
                  </div>
                </th>

                {columns.map(col => {
                  const isEditingThis = editingOriginalDate === col.date;
                  const isConflictCol = conflictAlert?.date === col.date;
                  const isConfirmingDelete = pendingDeleteDate === col.date;
                  return (
                    <th
                      key={col.date}
                      ref={el => {
                        colHeaderRefs.current[col.date] = el;
                      }}
                      className={`border border-slate-300 px-1 py-1.5 font-bold align-top ${
                        isConflictCol
                          ? 'bg-rose-100/90 min-w-[162px] w-[166px]'
                          : isEditingThis
                          ? 'bg-amber-50 min-w-[156px] w-[158px]'
                          : 'bg-slate-200/90 min-w-[84px] w-[90px]'
                      }`}
                    >
                      {isEditingThis && editDraft ? (
                        <div className="space-y-1.5">
                          <DateInput
                            value={editDraft.date}
                            onChange={e =>
                              setEditDraft(prev => (prev ? { ...prev, date: e.target.value } : null))
                            }
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleSaveEditedColumn}
                              className="flex-1 px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded hover:bg-emerald-700 transition-colors"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-white text-slate-700 border border-slate-300 text-[11px] font-medium rounded hover:bg-slate-50 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold text-rose-700 whitespace-nowrap">
                            ลบ {formatThaiDateBE(col.date)}?
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteColumn(col.date)}
                              className="flex-1 px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-semibold rounded hover:bg-rose-700"
                            >
                              ยืนยัน
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteDate(null)}
                              className="px-1.5 py-0.5 bg-white text-slate-600 border border-slate-300 text-[10px] rounded hover:bg-slate-50"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-0.5 group">
                          <span className="text-[11px] font-bold text-slate-900 tabular-nums whitespace-nowrap">
                            {formatThaiDateBE(col.date)}
                          </span>
                          <div className="flex items-center opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(col)}
                              className="p-0.5 text-slate-600 hover:text-emerald-700 hover:bg-white/70 rounded"
                              title="แก้ไขข้อมูลวันที่นี้"
                            >
                              <EditIcon className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteDate(col.date)}
                              className="p-0.5 text-slate-600 hover:text-rose-600 hover:bg-white/70 rounded"
                              title="ลบข้อมูลวันที่นี้"
                            >
                              <TrashIcon className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row, rowIdx) => {
                const prevRow = rowIdx > 0 ? visibleRows[rowIdx - 1] : null;
                const showExtraDivider = row.isExtra && (!prevRow || !prevRow.isExtra);
                const isStriped = rowIdx % 2 === 1;
                const rowConflict =
                  conflictAlert && editingOriginalDate === conflictAlert.date
                    ? conflictAlert.items.find(item => item.key === row.key)
                    : undefined;

                return (
                  <React.Fragment key={row.key}>
                    {showExtraDivider && (
                      <tr className="bg-slate-100/80">
                        <td
                          colSpan={1 + totalRenderedCols}
                          className="border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-600 uppercase tracking-wide"
                        >
                          ผลตรวจทางห้องปฏิบัติการเพิ่มเติม
                        </td>
                      </tr>
                    )}
                    <tr className="transition-colors">
                      <td
                        className={`sticky left-0 z-10 border border-slate-300 px-2 py-1 font-bold align-middle leading-tight ${
                          rowConflict
                            ? 'bg-rose-100 text-rose-900'
                            : isStriped
                            ? 'bg-[#e7ecf2] text-slate-900'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <span>{row.label}</span>
                      </td>

                      {/* Always-visible Leftmost New Entry Cell */}
                      <td
                        className={`border border-slate-300 px-1.5 py-1 align-middle ${
                          isStriped ? 'bg-emerald-50/75' : 'bg-emerald-50/30'
                        }`}
                      >
                        {renderEditCell(row, newDraft, handleNewFieldChange, 'new')}
                      </td>

                      {columns.map(col => {
                        const isEditingThis = editingOriginalDate === col.date;
                        const cellConflict =
                          isEditingThis && conflictAlert?.date === col.date
                            ? conflictAlert.items.find(item => item.key === row.key)
                            : undefined;

                        const baseBg = isStriped ? 'bg-slate-50/90' : 'bg-white';

                        return (
                          <td
                            key={`${row.key}-${col.date}`}
                            onClick={() => {
                              if (!isEditingThis && !isEditingExisting && row.inputType !== 'checkbox') {
                                handleStartEdit(col);
                              }
                            }}
                            className={`border border-slate-300 px-1.5 py-1 align-middle ${
                              cellConflict
                                ? 'bg-rose-50/80'
                                : isEditingThis
                                ? 'bg-amber-50/50'
                                : !isEditingExisting && row.inputType !== 'checkbox'
                                ? `${baseBg} hover:bg-emerald-50/50 cursor-pointer`
                                : baseBg
                            }`}
                          >
                            {isEditingThis && editDraft
                              ? renderEditCell(
                                  row,
                                  editDraft,
                                  handleEditFieldChange,
                                  'edit',
                                  cellConflict
                                )
                              : renderDisplayCell(row, col)}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* Bottom quick-save row */}
              <tr className="bg-slate-50">
                <td className="sticky left-0 z-10 bg-slate-100 border border-slate-300 px-2 py-1.5 font-semibold text-slate-600">
                  จัดการคอลัมน์
                </td>
                <td className="border border-slate-300 px-1.5 py-1.5 bg-emerald-50/40">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSaveNewColumn}
                      className="flex-1 px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded hover:bg-emerald-700 transition-colors"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={handleResetNewDraft}
                      className="px-2 py-1 bg-white text-slate-700 border border-slate-300 text-[11px] font-medium rounded hover:bg-slate-50 transition-colors"
                    >
                      ล้างค่า
                    </button>
                  </div>
                </td>
                {columns.map(col => {
                  const isEditingThis = editingOriginalDate === col.date;
                  return (
                    <td key={`action-${col.date}`} className="border border-slate-300 px-1.5 py-1.5">
                      {isEditingThis && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleSaveEditedColumn}
                            className="flex-1 px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded hover:bg-emerald-700 transition-colors"
                          >
                            บันทึก
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2 py-1 bg-white text-slate-700 border border-slate-300 text-[11px] font-medium rounded hover:bg-slate-50 transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
