
import { pool } from './db';
import { Patient, PatientStatus, MedicalEvent, MedicalEventType, PregnancyRecord, HcvInfo, HbvInfo, StdInfo, PrepInfo, PepInfo } from '../types';
import { toLocalISOString } from '../components/utils';

// --- Helper ---
const groupBy = (arr: any[], key: string) => {
    return arr.reduce((acc, item) => {
        (acc[item[key]] = acc[item[key]] || []).push(item);
        return acc;
    }, {} as Record<string, any[]>);
};

// --- Mappers (Row -> Object) ---

const mapRowToPatient = (row: any): Patient => ({
    id: row.id,
    hn: row.hn,
    napId: row.nap_id || '',
    title: row.title || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    dob: row.dob ? toLocalISOString(row.dob) : undefined,
    sex: row.sex || '',
    riskBehavior: row.risk_behavior || '',
    status: row.status as PatientStatus,
    registrationDate: row.registration_date ? toLocalISOString(row.registration_date) : undefined,
    nextAppointmentDate: row.next_appointment_date ? toLocalISOString(row.next_appointment_date) : undefined,
    occupation: row.occupation || '',
    partnerStatus: row.partner_status || '',
    partnerHivStatus: row.partner_hiv_status || '',
    address: row.address || '',
    district: row.district || '',
    subdistrict: row.subdistrict || '',
    province: row.province || '',
    phone: row.phone || '',
    healthcareScheme: row.healthcare_scheme || '',
    referralType: row.referral_type as any,
    referredFrom: row.referred_from || '',
    referralDate: row.referral_date ? toLocalISOString(row.referral_date) : undefined,
    referOutDate: row.refer_out_date ? toLocalISOString(row.refer_out_date) : undefined,
    referOutLocation: row.refer_out_location || '',
    deathDate: row.death_date ? toLocalISOString(row.death_date) : undefined,
    causeOfDeath: row.cause_of_death,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    
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
    date: row.date ? new Date(row.date).toISOString() : '', // Timestamps are usually kept as full ISO for events ordering, but display will use formatters
    title: row.title,
    details: row.details || {}
});

// --- API Functions ---

export const getPatients = async (): Promise<Patient[]> => {
    const client = await pool.connect();
    try {
        // 1. Fetch Patients
        const { rows: patientRows } = await client.query('SELECT * FROM public.patients ORDER BY updated_at DESC');
        
        // 2. Fetch All Related Data in bulk to avoid N+1
        const [
            eventsRes, pregRes, 
            hbsRes, hbvVlRes, hbvUsRes, hbvCtRes,
            hcvTestRes, hcvPreRes, hcvTreatRes, hcvPostRes,
            stdRes, prepRes, pepRes
        ] = await Promise.all([
            client.query('SELECT * FROM public.medical_events ORDER BY date DESC'),
            client.query('SELECT * FROM public.pregnancy_records ORDER BY ga_date DESC'),
            client.query('SELECT * FROM public.hbv_hbsag_tests ORDER BY date DESC'),
            client.query('SELECT * FROM public.hbv_viral_loads ORDER BY date DESC'),
            client.query('SELECT * FROM public.hbv_ultrasounds ORDER BY date DESC'),
            client.query('SELECT * FROM public.hbv_ct_scans ORDER BY date DESC'),
            client.query('SELECT * FROM public.hcv_tests ORDER BY date DESC'),
            client.query('SELECT * FROM public.hcv_pre_treatment_vls ORDER BY date DESC'),
            client.query('SELECT * FROM public.hcv_treatments ORDER BY date DESC'),
            client.query('SELECT * FROM public.hcv_post_treatment_vls ORDER BY date DESC'),
            client.query('SELECT * FROM public.std_records ORDER BY date DESC'),
            client.query('SELECT * FROM public.prep_records ORDER BY date_start DESC'),
            client.query('SELECT * FROM public.pep_records ORDER BY date DESC'),
        ]);

        // 3. Group by Patient ID
        const eventsByPid = groupBy(eventsRes.rows, 'patient_id');
        const pregByPid = groupBy(pregRes.rows, 'patient_id');
        const hbsByPid = groupBy(hbsRes.rows, 'patient_id');
        const hbvVlByPid = groupBy(hbvVlRes.rows, 'patient_id');
        const hbvUsByPid = groupBy(hbvUsRes.rows, 'patient_id');
        const hbvCtByPid = groupBy(hbvCtRes.rows, 'patient_id');
        const hcvTestByPid = groupBy(hcvTestRes.rows, 'patient_id');
        const hcvPreByPid = groupBy(hcvPreRes.rows, 'patient_id');
        const hcvTreatByPid = groupBy(hcvTreatRes.rows, 'patient_id');
        const hcvPostByPid = groupBy(hcvPostRes.rows, 'patient_id');
        const stdByPid = groupBy(stdRes.rows, 'patient_id');
        const prepByPid = groupBy(prepRes.rows, 'patient_id');
        const pepByPid = groupBy(pepRes.rows, 'patient_id');

        // 4. Assemble Patients
        return patientRows.map(row => {
             const p = mapRowToPatient(row);
             
             // Populate Arrays
             p.medicalHistory = (eventsByPid[p.id] || []).map(mapMedicalEvent);
             
             p.pregnancies = (pregByPid[p.id] || []).map(r => ({
                id: r.id,
                ga: r.ga,
                gaDate: r.ga_date ? toLocalISOString(r.ga_date) : '',
                endDate: r.end_date ? toLocalISOString(r.end_date) : undefined,
                endReason: r.end_reason
            }));

            p.hbvInfo = {
                manualSummary: p.hbvInfo?.manualSummary,
                hbsAgTests: (hbsByPid[p.id] || []).map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) })),
                viralLoads: (hbvVlByPid[p.id] || []).map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) })),
                ultrasounds: (hbvUsByPid[p.id] || []).map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) })),
                ctScans: (hbvCtByPid[p.id] || []).map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) }))
            };

            p.hcvInfo = {
                hcvVlNotTested: p.hcvInfo?.hcvVlNotTested,
                hcvTests: (hcvTestByPid[p.id] || []).map(r => ({ id: r.id, type: r.type, result: r.result, date: toLocalISOString(r.date) })),
                preTreatmentVls: (hcvPreByPid[p.id] || []).map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) })),
                treatments: (hcvTreatByPid[p.id] || []).map(r => ({ id: r.id, regimen: r.regimen, date: toLocalISOString(r.date) })),
                postTreatmentVls: (hcvPostByPid[p.id] || []).map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) }))
            };

            p.stdInfo = {
                 records: (stdByPid[p.id] || []).map(r => ({
                     id: r.id,
                     diseases: r.diseases || [],
                     date: toLocalISOString(r.date)
                 }))
            };

            p.prepInfo = {
                records: (prepByPid[p.id] || []).map(r => ({
                    id: r.id,
                    dateStart: toLocalISOString(r.date_start),
                    dateStop: r.date_stop ? toLocalISOString(r.date_stop) : undefined
                }))
            };

            p.pepInfo = {
                 records: (pepByPid[p.id] || []).map(r => ({
                     id: r.id,
                     date: toLocalISOString(r.date),
                     type: r.type
                 }))
            };

            return p;
        });

    } catch (error) {
        console.error('Error fetching patients:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const getPatientById = async (id: number): Promise<Patient | null> => {
    try {
        // Reuse getPatients logic but filtered (or keep specific optimized query for single item)
        
        // 1. Fetch Patient Core
        const patientRes = await pool.query('SELECT * FROM public.patients WHERE id = $1', [id]);
        if (patientRes.rows.length === 0) return null;
        
        const patient = mapRowToPatient(patientRes.rows[0]);

        // 2. Fetch All Related Data
        const [
            eventsRes, pregRes, 
            hbsRes, hbvVlRes, hbvUsRes, hbvCtRes,
            hcvTestRes, hcvPreRes, hcvTreatRes, hcvPostRes,
            stdRes, prepRes, pepRes
        ] = await Promise.all([
            pool.query('SELECT * FROM public.medical_events WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM public.pregnancy_records WHERE patient_id = $1 ORDER BY ga_date DESC', [id]),
            // HBV
            pool.query('SELECT * FROM public.hbv_hbsag_tests WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM public.hbv_viral_loads WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM public.hbv_ultrasounds WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM public.hbv_ct_scans WHERE patient_id = $1 ORDER BY date DESC', [id]),
            // HCV
            pool.query('SELECT * FROM public.hcv_tests WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM public.hcv_pre_treatment_vls WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM public.hcv_treatments WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM public.hcv_post_treatment_vls WHERE patient_id = $1 ORDER BY date DESC', [id]),
            // STD, PrEP, PEP
            pool.query('SELECT * FROM public.std_records WHERE patient_id = $1 ORDER BY date DESC', [id]),
            pool.query('SELECT * FROM public.prep_records WHERE patient_id = $1 ORDER BY date_start DESC', [id]),
            pool.query('SELECT * FROM public.pep_records WHERE patient_id = $1 ORDER BY date DESC', [id]),
        ]);

        // 3. Map to Object
        patient.medicalHistory = eventsRes.rows.map(mapMedicalEvent);
        
        patient.pregnancies = pregRes.rows.map(r => ({
            id: r.id,
            ga: r.ga,
            gaDate: r.ga_date ? toLocalISOString(r.ga_date) : '',
            endDate: r.end_date ? toLocalISOString(r.end_date) : undefined,
            endReason: r.end_reason
        }));

        patient.hbvInfo = {
            manualSummary: patient.hbvInfo?.manualSummary,
            hbsAgTests: hbsRes.rows.map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) })),
            viralLoads: hbvVlRes.rows.map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) })),
            ultrasounds: hbvUsRes.rows.map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) })),
            ctScans: hbvCtRes.rows.map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) }))
        };

        patient.hcvInfo = {
            hcvVlNotTested: patient.hcvInfo?.hcvVlNotTested,
            hcvTests: hcvTestRes.rows.map(r => ({ id: r.id, type: r.type, result: r.result, date: toLocalISOString(r.date) })),
            preTreatmentVls: hcvPreRes.rows.map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) })),
            treatments: hcvTreatRes.rows.map(r => ({ id: r.id, regimen: r.regimen, date: toLocalISOString(r.date) })),
            postTreatmentVls: hcvPostRes.rows.map(r => ({ id: r.id, result: r.result, date: toLocalISOString(r.date) }))
        };

        patient.stdInfo = {
             records: stdRes.rows.map(r => ({
                 id: r.id,
                 diseases: r.diseases || [],
                 date: toLocalISOString(r.date)
             }))
        };

        patient.prepInfo = {
            records: prepRes.rows.map(r => ({
                id: r.id,
                dateStart: toLocalISOString(r.date_start),
                dateStop: r.date_stop ? toLocalISOString(r.date_stop) : undefined
            }))
        };

        patient.pepInfo = {
             records: pepRes.rows.map(r => ({
                 id: r.id,
                 date: toLocalISOString(r.date),
                 type: r.type
             }))
        };

        return patient;

    } catch (error) {
        console.error('Error fetching patient details:', error);
        throw error;
    }
};

// Helper to convert empty string to null for dates
const dateOrNull = (d: any) => d && d !== '' ? d : null;

// Create a new patient
export const createPatient = async (data: any): Promise<number> => {
    try {
        const res = await pool.query(`
            INSERT INTO public.patients (
                hn, nap_id, title, first_name, last_name, dob, sex, risk_behavior,
                status, registration_date, next_appointment_date, occupation, partner_status, partner_hiv_status,
                address, district, subdistrict, province, phone, healthcare_scheme,
                referral_type, referred_from, referral_date, refer_out_date, refer_out_location, death_date, cause_of_death
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27
            ) RETURNING id
        `, [
            data.hn, data.napId, data.title, data.firstName, data.lastName, dateOrNull(data.dob), data.sex, data.riskBehavior,
            data.status || 'Active', toLocalISOString(new Date()), dateOrNull(data.nextAppointmentDate), data.occupation, data.partnerStatus, data.partnerHivStatus,
            data.address, data.district, data.subdistrict, data.province, data.phone, data.healthcareScheme,
            data.referralType, data.referredFrom, dateOrNull(data.referralDate),
            dateOrNull(data.referOutDate), data.referOutLocation, dateOrNull(data.deathDate), data.causeOfDeath
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
            UPDATE public.patients SET
                hn=$1, nap_id=$2, title=$3, first_name=$4, last_name=$5, dob=$6, sex=$7, risk_behavior=$8,
                status=$9, next_appointment_date=$10, occupation=$11, partner_status=$12, partner_hiv_status=$13,
                address=$14, district=$15, subdistrict=$16, province=$17, phone=$18, healthcare_scheme=$19,
                referral_type=$20, referred_from=$21, referral_date=$22,
                hbv_manual_summary=$23, hcv_vl_not_tested=$24,
                refer_out_date=$25, refer_out_location=$26, death_date=$27, cause_of_death=$28,
                updated_at=CURRENT_TIMESTAMP
            WHERE id=$29
        `, [
            patient.hn, patient.napId, patient.title, patient.firstName, patient.lastName, dateOrNull(patient.dob), patient.sex, patient.riskBehavior,
            patient.status, dateOrNull(patient.nextAppointmentDate), patient.occupation, patient.partnerStatus, patient.partnerHivStatus,
            patient.address, patient.district, patient.subdistrict, patient.province, patient.phone, patient.healthcareScheme,
            patient.referralType, patient.referredFrom, dateOrNull(patient.referralDate),
            patient.hbvInfo?.manualSummary, patient.hcvInfo?.hcvVlNotTested || false,
            dateOrNull(patient.referOutDate), patient.referOutLocation, dateOrNull(patient.deathDate), patient.causeOfDeath,
            patient.id
        ]);

        // 2. Sync Medical Events (Delete All & Re-insert Strategy for simplicity and consistency)
        await client.query('DELETE FROM public.medical_events WHERE patient_id = $1', [patient.id]);
        for (const evt of patient.medicalHistory) {
             if (evt.id.startsWith('hbv-') || evt.id.startsWith('hcv-')) continue; // Skip virtual events
             await client.query(
                 'INSERT INTO public.medical_events (patient_id, type, date, title, details) VALUES ($1, $2, $3, $4, $5)',
                 [patient.id, evt.type, evt.date, evt.title, JSON.stringify(evt.details)]
             );
        }

        // 3. Sync Pregnancies
        await client.query('DELETE FROM public.pregnancy_records WHERE patient_id = $1', [patient.id]);
        for (const preg of (patient.pregnancies || [])) {
            await client.query(
                'INSERT INTO public.pregnancy_records (patient_id, ga, ga_date, end_date, end_reason) VALUES ($1, $2, $3, $4, $5)',
                [patient.id, preg.ga, preg.gaDate, dateOrNull(preg.endDate), preg.endReason || null]
            );
        }

        // 4. Sync HBV
        await client.query('DELETE FROM public.hbv_hbsag_tests WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hbvInfo?.hbsAgTests || [])) {
             await client.query('INSERT INTO public.hbv_hbsag_tests (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }
        await client.query('DELETE FROM public.hbv_viral_loads WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hbvInfo?.viralLoads || [])) {
             await client.query('INSERT INTO public.hbv_viral_loads (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }
        await client.query('DELETE FROM public.hbv_ultrasounds WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hbvInfo?.ultrasounds || [])) {
             await client.query('INSERT INTO public.hbv_ultrasounds (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }
        await client.query('DELETE FROM public.hbv_ct_scans WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hbvInfo?.ctScans || [])) {
             await client.query('INSERT INTO public.hbv_ct_scans (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }

        // 5. Sync HCV
        await client.query('DELETE FROM public.hcv_tests WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hcvInfo?.hcvTests || [])) {
             await client.query('INSERT INTO public.hcv_tests (patient_id, type, result, date) VALUES ($1, $2, $3, $4)', [patient.id, item.type, item.result, item.date]);
        }
        await client.query('DELETE FROM public.hcv_pre_treatment_vls WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hcvInfo?.preTreatmentVls || [])) {
             await client.query('INSERT INTO public.hcv_pre_treatment_vls (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }
        await client.query('DELETE FROM public.hcv_treatments WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hcvInfo?.treatments || [])) {
             await client.query('INSERT INTO public.hcv_treatments (patient_id, regimen, date) VALUES ($1, $2, $3)', [patient.id, item.regimen, item.date]);
        }
        await client.query('DELETE FROM public.hcv_post_treatment_vls WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.hcvInfo?.postTreatmentVls || [])) {
             await client.query('INSERT INTO public.hcv_post_treatment_vls (patient_id, result, date) VALUES ($1, $2, $3)', [patient.id, item.result, item.date]);
        }

        // 6. Sync STD
        await client.query('DELETE FROM public.std_records WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.stdInfo?.records || [])) {
             await client.query('INSERT INTO public.std_records (patient_id, diseases, date) VALUES ($1, $2, $3)', [patient.id, item.diseases, item.date]);
        }

        // 7. Sync PrEP
        await client.query('DELETE FROM public.prep_records WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.prepInfo?.records || [])) {
             await client.query('INSERT INTO public.prep_records (patient_id, date_start, date_stop) VALUES ($1, $2, $3)', [patient.id, item.dateStart, dateOrNull(item.dateStop)]);
        }

        // 8. Sync PEP
        await client.query('DELETE FROM public.pep_records WHERE patient_id = $1', [patient.id]);
        for (const item of (patient.pepInfo?.records || [])) {
             await client.query('INSERT INTO public.pep_records (patient_id, date, type) VALUES ($1, $2, $3)', [patient.id, item.date, item.type]);
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

export const deletePatient = async (id: number): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const tables = [
            'medical_events', 'pregnancy_records',
            'hbv_hbsag_tests', 'hbv_viral_loads', 'hbv_ultrasounds', 'hbv_ct_scans',
            'hcv_tests', 'hcv_pre_treatment_vls', 'hcv_treatments', 'hcv_post_treatment_vls',
            'std_records', 'prep_records', 'pep_records'
        ];
        
        for (const table of tables) {
             await client.query(`DELETE FROM public.${table} WHERE patient_id = $1`, [id]);
        }

        await client.query('DELETE FROM public.patients WHERE id = $1', [id]);
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting patient:', error);
        throw error;
    } finally {
        client.release();
    }
};
