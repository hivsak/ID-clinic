
import { pool } from './db';
import { Patient, PatientStatus, MedicalEvent, MedicalEventType, PregnancyRecord } from '../types';

// --- Mappers ---

// Map Patient Row (SQL snake_case) to Patient Object (TS camelCase)
const mapRowToPatient = (row: any): Patient => ({
    id: row.id,
    hn: row.hn,
    napId: row.nap_id || '',
    title: row.title,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : '',
    sex: row.sex,
    riskBehavior: row.risk_behavior,
    status: row.status as PatientStatus,
    registrationDate: row.registration_date ? new Date(row.registration_date).toISOString().split('T')[0] : '',
    nextAppointmentDate: row.next_appointment_date ? new Date(row.next_appointment_date).toISOString().split('T')[0] : undefined,
    occupation: row.occupation,
    partnerStatus: row.partner_status,
    partnerHivStatus: row.partner_hiv_status,
    address: row.address,
    district: row.district,
    subdistrict: row.subdistrict,
    province: row.province,
    phone: row.phone,
    healthcareScheme: row.healthcare_scheme,
    referralType: row.referral_type as any,
    referredFrom: row.referred_from,
    referralDate: row.referral_date ? new Date(row.referral_date).toISOString().split('T')[0] : undefined,
    
    // Initialize arrays/objects (will be populated by separate queries for details)
    medicalHistory: [],
    pregnancies: [],
    hbvInfo: { hbsAgTests: [], viralLoads: [], ultrasounds: [], ctScans: [], manualSummary: row.hbv_manual_summary },
    hcvInfo: { hcvTests: [], hcvVlNotTested: row.hcv_vl_not_tested, preTreatmentVls: [], treatments: [], postTreatmentVls: [] },
    stdInfo: { records: [] },
    prepInfo: { records: [] },
    pepInfo: { records: [] }
});

const mapMedicalEvent = (row: any): MedicalEvent => ({
    id: row.id, // UUID from DB
    type: row.type as MedicalEventType,
    date: row.date ? new Date(row.date).toISOString() : '',
    title: row.title,
    details: row.details || {}
});

// --- API Functions ---

export const getPatients = async (): Promise<Patient[]> => {
    try {
        const { rows } = await pool.query('SELECT * FROM patients ORDER BY updated_at DESC');
        return rows.map(mapRowToPatient);
    } catch (error) {
        console.error('Error fetching patients:', error);
        throw error;
    }
};

export const getPatientById = async (id: number): Promise<Patient | null> => {
    try {
        // 1. Fetch Patient Core Info
        const patientRes = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
        if (patientRes.rows.length === 0) return null;
        
        const patient = mapRowToPatient(patientRes.rows[0]);

        // 2. Fetch Related Data in Parallel
        const [
            eventsRes, 
            pregRes, 
            hbsRes, hbvVlRes, hbvUsRes, hbvCtRes,
            hcvTestRes, hcvPreRes, hcvTreatRes, hcvPostRes,
            stdRes, prepRes, pepRes
        ] = await Promise.all([
            pool.query('SELECT * FROM medical_events WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM pregnancy_records WHERE patient_id = $1 ORDER BY ga_date DESC', [id]),
            // HBV
            pool.query('SELECT * FROM hbv_hbsag_tests WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM hbv_viral_loads WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM hbv_ultrasounds WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM hbv_ct_scans WHERE patient_id = $1 ORDER BY date DESC', [id]),
            // HCV
            pool.query('SELECT * FROM hcv_tests WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM hcv_pre_treatment_vls WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM hcv_treatments WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM hcv_post_treatment_vls WHERE patient_id = $1 ORDER BY date DESC', [id]),
            // STD, PrEP, PEP
            pool.query('SELECT * FROM std_records WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM prep_records WHERE patient_id = $1 ORDER BY date_start DESC', [id]),
            pool.query('SELECT * FROM pep_records WHERE patient_id = $1 ORDER BY date DESC', [id]),
        ]);

        // 3. Map Data to Patient Object
        patient.medicalHistory = eventsRes.rows.map(mapMedicalEvent);
        
        patient.pregnancies = pregRes.rows.map(r => ({
            id: r.id,
            ga: r.ga,
            gaDate: r.ga_date ? new Date(r.ga_date).toISOString().split('T')[0] : '',
            endDate: r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : undefined,
            endReason: r.end_reason
        }));

        patient.hbvInfo = {
            manualSummary: patient.hbvInfo?.manualSummary,
            hbsAgTests: hbsRes.rows.map(r => ({ id: r.id, result: r.result, date: new Date(r.date).toISOString() })),
            viralLoads: hbvVlRes.rows.map(r => ({ id: r.id, result: r.result, date: new Date(r.date).toISOString() })),
            ultrasounds: hbvUsRes.rows.map(r => ({ id: r.id, result: r.result, date: new Date(r.date).toISOString() })),
            ctScans: hbvCtRes.rows.map(r => ({ id: r.id, result: r.result, date: new Date(r.date).toISOString() }))
        };

        patient.hcvInfo = {
            hcvVlNotTested: patient.hcvInfo?.hcvVlNotTested,
            hcvTests: hcvTestRes.rows.map(r => ({ id: r.id, type: r.type, result: r.result, date: new Date(r.date).toISOString() })),
            pre