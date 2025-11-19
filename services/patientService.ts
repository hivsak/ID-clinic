
import { pool } from './db';
import { Patient, PatientStatus, MedicalEvent, MedicalEventType, PregnancyRecord, HcvInfo, HbvInfo, StdInfo, PrepInfo, PepInfo } from '../types';

// --- Mappers (Row -> Object) ---

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
    
    // Arrays will be populated by fetch detail logic
    medicalHistory: [],
    pregnancies: [],
    hbvInfo: { hbsAgTests: [], viralLoads: [], ultrasounds: [], ctScans: [], manualSummary: row.hbv_manual_summary },
    hcvInfo: { hcvTests: [], hcvVlNotTested: row.hcv_vl_not_tested, preTreatmentVls: [], treatments: [], postTreatmentVls: [] },
    stdInfo: { records: [] },
    prepInfo: { records: [] },
    pepInfo: { records: [] }
});

const mapMedicalEvent = (row: any): MedicalEvent => ({
    id: row.id,
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
        // 1. Fetch Patient Core
        const patientRes = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
        if (patientRes.rows.length === 0) return null;
        
        const patient = mapRowToPatient(patientRes.rows[0]);

        // 2. Fetch All Related Data
        const [
            eventsRes, pregRes, 
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

        // 3. Map to Object
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
            preTreatmentVls: hcvPreRes.rows.map(r => ({ id: r.id, result: r.result, date: new Date(r.date).toISOString() })),
            treatments: hcvTreatRes.rows.map(r => ({ id: r.id, regimen: r.regimen, date: new Date(r.date).toISOString() })),
            postTreatmentVls: hcvPostRes.rows.map(r => ({ id: r.id, result: r.result, date: new Date(r.date).toISOString() }))
        };

        patient.stdInfo = {
             records: stdRes.rows.map(r => ({
                 id: r.id,
                 diseases: r.diseases || [],
                 date: new Date(r.date).toISOString().split('T')[0]
             }))
        };

        patient.prepInfo = {
            records: prepRes.rows.map(r => ({
                id: r.id,
                dateStart: new Date(r.date_start).toISOString().split('T')[0],
                dateStop: r.date_stop ? new Date(r.date_stop).toISOString().split('T')[0] : undefined
            }))
        };

        patient.pepInfo = {
             records: pepRes.rows.map(r => ({
                 id: r.id,
                 date: new Date(r.date).toISOString().split('T')[0],
                 type: r.type
             }))
        };

        return patient;

    } catch (error) {
        console.error('Error fetching patient details:', error);
        throw error;
    }
};

// Create a new patient
export const createPatient = async (data: any): Promise<number> => {
    try {
        const res = await pool.query(`
            INSERT INTO patients (
                hn, nap_id, title, first_name, last_name, dob, sex, risk_behavior,
                status, registration_date, occupation, partner_status, partner_hiv_status,
                address, district, subdistrict, province, phone, healthcare_scheme,
                referral_type, referred_from, referral_date
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13,
                $14, $15, $16, $17, $18, $19,
                $20, $21, $22
            ) RETURNING id
        `, [
            data.hn, data.napId, data.title, data.firstName, data.lastName, data.dob, data.sex, data.riskBehavior,
            'Active', new Date(), data.occupation, data.partnerStatus, data.partnerHivStatus,
            data.address, data.district, data.subdistrict, data.province, data.phone, data.healthcareScheme,
            data.referralType, data.referredFrom, data.referralDate || null
        ]);
        return res.rows[0].id;
    } catch (error) {
        console.error('Error creating patient:', error);
        throw error;
    }
};

// Update patient and sync all sub-records
export const updatePatient = async (patient: Patient): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Patients Table
        await client.query(`
            UPDATE patients SET
                hn=$1, nap_id=$2, title=$3, first_name=$4, last_name=$5, dob=$6, sex=$7, risk_behavior=$8,
                status=$9, next_appointment_date=$10, occupation=$11, partner_status=$12, partner_hiv_status=$13,
                address=$14, district=$15, subdistrict=$16, province=$17, phone=$18, healthcare_scheme=$19,
                referral_type=$20, referred_from=$21, referral_date=$22,
                hbv_manual_summary=$23, hcv_vl_not_tested=$24,
                updated_at=CURRENT_TIMESTAMP
            WHERE id=$25
        `, [
            patient.hn, patient.napId, patient.title, patient.firstName, patient.lastName, patient.dob, patient.sex, patient.riskBehavior,
            patient.status, patient.nextAppointmentDate || null, patient.occupation, patient.partnerStatus, patient.partnerHivStatus,
            patient.address, patient.district, patient.subdistrict, patient.province, patient.phone, patient.healthcareScheme,
            patient.referralType, patient.referredFrom, patient.referralDate || null,
            patient.hbvInfo?.manualSummary, patient.hcvInfo?.hcvVlNotTested || false,
            patient.id
        ]);

        // 2. Sync Medical Events (Delete All & Re-insert Strategy for simplicity and consistency)
        await client.query('DELETE FROM medical_events WHERE patient_id = $1', [patient.id]);
        for (const evt of patient.medicalHistory) {
             if (evt.id.startsWith('hbv-') || evt.id.startsWith('hcv-')) continue; // Skip virtual events
             await client.query(
                 'INSERT INTO medical_events (patient_id, type, date, title, details) VALUES ($1, $2, $3, $4, $5)',
                 [patient.id, evt.type, evt.date, evt.title, JSON.stringify(evt.details)]
             );
        }

        // 3. Sync Pregnancies
        await client.query('DELETE FROM pregnancy_records WHERE patient_id = $1', [patient.id]);
        for (const preg of (patient.pregnancies || [])) {
            await client.query(
                'INSERT INTO pregnancy_records (patient_id, ga, ga_date, end_date, end_reason) VALUES ($1, $2, $3, $4, $5)',
                [patient.id, preg.ga, preg.gaDate, preg.endDate || null, preg.endReason || null]
            );
        }

        // 4. Sync HBV
        await client.query('DELETE FROM hbv_hbsag_tests WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hbvInfo?.hbsAgTests || [])) {
             await client.query('INSERT INTO hbv_hbsag_tests (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }
        await client.query('DELETE FROM hbv_viral_loads WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hbvInfo?.viralLoads || [])) {
             await client.query('INSERT INTO hbv_viral_loads (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }
        await client.query('DELETE FROM hbv_ultrasounds WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hbvInfo?.ultrasounds || [])) {
             await client.query('INSERT INTO hbv_ultrasounds (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }
        await client.query('DELETE FROM hbv_ct_scans WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hbvInfo?.ctScans || [])) {
             await client.query('INSERT INTO hbv_ct_scans (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }

        // 5. Sync HCV
        await client.query('DELETE FROM hcv_tests WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hcvInfo?.hcvTests || [])) {
             await client.query('INSERT INTO hcv_tests (patient_id, type, result, date) VALUES ($1, $2, $3, $4)', [patient.id, item.type, item.result, item.date]);
        }
        await client.query('DELETE FROM hcv_pre_treatment_vls WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hcvInfo?.preTreatmentVls || [])) {
             await client.query('INSERT INTO hcv_pre_treatment_vls (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }
        await client.query('DELETE FROM hcv_treatments WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hcvInfo?.treatments || [])) {
             await client.query('INSERT INTO hcv_treatments (patient_id, regimen, date) VALUES ($1, $2, $3)', [patient.id, item.regimen, item.date]);
        }
        await client.query('DELETE FROM hcv_post_treatment_vls WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hcvInfo?.postTreatmentVls || [])) {
             await client.query('INSERT INTO hcv_post_treatment_vls (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }

        // 6. Sync STD
        await client.query('DELETE FROM std_records WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.stdInfo?.records || [])) {
             await client.query('INSERT INTO std_records (patient_id, diseases, date) VALUES ($1, $2, $3)', [patient.id, item.diseases, item.date]);
        }

        // 7. Sync PrEP
        await client.query('DELETE FROM prep_records WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.prepInfo?.records || [])) {
             await client.query('INSERT INTO prep_records (patient_id, date_start, date_stop) VALUES ($1, $2, $3)', [patient.id, item.dateStart, item.dateStop || null]);
        }

        // 8. Sync PEP
        await client.query('DELETE FROM pep_records WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.pepInfo?.records || [])) {
             await client.query('INSERT INTO pep_records (patient_id, date, type) VALUES ($1, $2, $3)', [patient.id, item.date, item.type]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating patient:', error);
        throw error;
    } finally {
        client.release();
    }
};
