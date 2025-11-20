
export enum PatientStatus {
  ACTIVE = 'Active',
  LTFU = 'LTFU', // Lost to Follow-up
  TRANSFERRED = 'Transferred',
  EXPIRED = 'Expired',
  RESTART = 'Restart',
}

export enum MedicalEventType {
  DIAGNOSIS = 'DIAGNOSIS',
  ART_START = 'ART_START',
  PROPHYLAXIS = 'PROPHYLAXIS',
  MISSED_MEDS = 'MISSED_MEDS',
  ART_CHANGE = 'ART_CHANGE',
  OPPORTUNISTIC_INFECTION = 'OPPORTUNISTIC_INFECTION',
  LAB_RESULT = 'LAB_RESULT',
  OTHER = 'OTHER',
}

export interface MedicalEvent {
  id: string;
  type: MedicalEventType;
  date: string; // ISO date string e.g., "2023-10-26"
  title: string;
  details: Record<string, any>;
}

export interface PregnancyRecord {
  id: string;
  ga: string; // Gestational Age, e.g., "12+3"
  gaDate: string; // The date the GA was measured, ISO string
  endDate?: string;
  endReason?: string;
}

export interface HbsAgTest {
  id: string;
  result: 'Positive' | 'Negative' | 'Inconclusive';
  date: string; // ISO string
}

export interface HbvViralLoadTest {
  id: string;
  result: string;
  date: string; // ISO string
}

export interface HbvUltrasound {
  id: string;
  result: string;
  date: string; // ISO string
}

export interface HbvCtScan {
    id: string;
    result: string;
    date: string; // ISO string
}

export interface HbvInfo {
  hbsAgTests: HbsAgTest[];
  viralLoads?: HbvViralLoadTest[];
  ultrasounds?: HbvUltrasound[];
  ctScans?: HbvCtScan[];
  manualSummary?: string;
}

export interface HcvTest {
  id: string;
  type: 'Anti-HCV' | 'HCV-Ag';
  result: 'Positive' | 'Negative' | 'Inconclusive';
  date: string; // ISO string
}

export interface HcvPreTreatmentVlTest {
  id: string;
  result: string;
  date: string;
}

export interface HcvTreatment {
  id: string;
  regimen: string;
  date: string;
}

export interface HcvPostTreatmentVlTest {
  id: string;
  result: string;
  date: string;
}

export interface HcvInfo {
  hcvTests: HcvTest[];
  hcvVlNotTested?: boolean;
  preTreatmentVls?: HcvPreTreatmentVlTest[];
  treatments?: HcvTreatment[];
  postTreatmentVls?: HcvPostTreatmentVlTest[];
}


export interface StdRecord {
  id: string;
  diseases: string[];
  date: string; // ISO date string
}

export interface StdInfo {
  records: StdRecord[];
}

export interface PrepRecord {
  id: string;
  dateStart: string; // ISO date string
  dateStop?: string; // ISO date string
}

export interface PrepInfo {
  records: PrepRecord[];
}

export interface PepRecord {
  id: string;
  date: string; // ISO date string
  type?: 'oPEP' | 'nPEP';
}

export interface PepInfo {
  records: PepRecord[];
}


export interface Patient {
  id: number;
  hn: string;
  napId?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  dob?: string; // ISO date string e.g., "1980-05-15"
  sex?: string;
  riskBehavior?: string;
  status: PatientStatus;
  registrationDate?: string; // ISO date string
  nextAppointmentDate?: string; // ISO date string
  medicalHistory: MedicalEvent[];
  pregnancies?: PregnancyRecord[];
  hbvInfo?: HbvInfo;
  hcvInfo?: HcvInfo;
  stdInfo?: StdInfo;
  prepInfo?: PrepInfo;
  pepInfo?: PepInfo;
  // Detailed General Information
  occupation?: string;
  partnerStatus?: string;
  partnerHivStatus?: string;
  address?: string;
  district?: string;
  subdistrict?: string;
  province?: string;
  phone?: string;
  healthcareScheme?: string;
  referralType?: 'มหาสารคาม' | 'ที่อื่น';
  referredFrom?: string;
  referralDate?: string; // ISO date string
  // Discharge / Refer Out
  referOutDate?: string; // ISO date string
  referOutLocation?: string;
  deathDate?: string; // ISO date string
}