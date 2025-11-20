
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { getPatients } from '../services/patientService';
import { DownloadIcon } from './icons';
import { calculateAge, determineHbvStatus, determineHcvStatus } from './utils';
import { MedicalEventType } from '../types';

export const Settings: React.FC = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = async () => {
        setIsLoading(true);
        try {
            const patients = await getPatients();
            const wb = XLSX.utils.book_new();

            // Helper: Check if date is in range
            const isInRange = (dateStr?: string) => {
                if (!dateStr) return false;
                if (!startDate && !endDate) return true;
                const d = new Date(dateStr).getTime();
                const start = startDate ? new Date(startDate).getTime() : -Infinity;
                const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
                return d >= start && d <= end;
            };

            // Helper: Safe string
            const safeStr = (val: any) => (val === null || val === undefined) ? '' : String(val);

            // =========================================
            // Sheet 1: Patients (Master List - All Patients)
            // =========================================
            const patientRows = patients.map(p => {
                // 1. Latest ARV Regimen
                const arvEvents = p.medicalHistory
                    .filter(e => e.type === MedicalEventType.ART_START || e.type === MedicalEventType.ART_CHANGE)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latestArv = arvEvents.length > 0 
                    ? (arvEvents[0].details['เป็น'] || arvEvents[0].details['สูตรยา'] || '') 
                    : '';

                // 2. Hepatitis Status
                const hbvStatus = determineHbvStatus(p).text;
                const hcvStatus = determineHcvStatus(p).text;

                // 3. TPT History
                const tptEvents = p.medicalHistory
                    .filter(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const tptStatus = tptEvents.length > 0 
                    ? `Received: ${tptEvents[0].details['สูตร TPT'] || 'Unspecified'} (${tptEvents[0].date.split('T')[0]})` 
                    : 'Never';

                // 4. STD History
                const uniqueStds = Array.from(new Set(p.stdInfo?.records?.flatMap(r => r.diseases) || [])).join(', ');

                // 5. PrEP Status
                const prepRecords = p.prepInfo?.records || [];
                const activePrep = prepRecords.some(r => !r.dateStop);
                const prepStatus = activePrep ? 'Active' : (prepRecords.length > 0 ? 'Past History' : 'Never');

                // 6. PEP Status
                const pepRecords = p.pepInfo?.records || [];
                const pepStatus = pepRecords.length > 0 ? `Yes (${pepRecords.length} times)` : 'Never';

                // 7. Pregnancy Status
                const activePreg = p.pregnancies?.find(r => !r.endDate);
                const pregStatus = activePreg 
                    ? `Pregnant (GA: ${activePreg.ga})` 
                    : (p.pregnancies && p.pregnancies.length > 0 ? 'Past History' : 'No');

                return {
                    ID: p.id,
                    HN: p.hn,
                    NAP_ID: safeStr(p.napId),
                    Title: safeStr(p.title),
                    FirstName: safeStr(p.firstName),
                    LastName: safeStr(p.lastName),
                    FullName: `${safeStr(p.title)}${safeStr(p.firstName)} ${safeStr(p.lastName)}`,
                    DOB: safeStr(p.dob),
                    Age: calculateAge(p.dob),
                    Sex: safeStr(p.sex),
                    
                    // --- Clinical Summaries ---
                    Latest_ARV_Regimen: latestArv,
                    HBV_Summary: hbvStatus,
                    HCV_Summary: hcvStatus,
                    TPT_Status: tptStatus,
                    STD_Summary: uniqueStds,
                    PrEP_Status: prepStatus,
                    PEP_Status: pepStatus,
                    Pregnancy_Status: pregStatus,
                    // --------------------------

                    Phone: safeStr(p.phone),
                    Status: safeStr(p.status),
                    Risk_Behavior: safeStr(p.riskBehavior),
                    Occupation: safeStr(p.occupation),
                    Address_Detail: safeStr(p.address),
                    Subdistrict: safeStr(p.subdistrict),
                    District: safeStr(p.district),
                    Province: safeStr(p.province),
                    Healthcare_Scheme: safeStr(p.healthcareScheme),
                    Partner_Status: safeStr(p.partnerStatus),
                    Partner_HIV_Status: safeStr(p.partnerHivStatus),
                    Registration_Date: safeStr(p.registrationDate),
                    Referral_Type: safeStr(p.referralType),
                    Referred_From: safeStr(p.referredFrom),
                    Referral_Date: safeStr(p.referralDate),
                    Refer_Out_Location: safeStr(p.referOutLocation),
                    Refer_Out_Date: safeStr(p.referOutDate),
                    Death_Date: safeStr(p.deathDate)
                };
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientRows), "Patients_Master");

            // =========================================
            // Sheet 2: HIV Medical History (Flattened)
            // =========================================
            const historyRows: any[] = [];
            patients.forEach(p => {
                p.medicalHistory.forEach(e => {
                    if (isInRange(e.date)) {
                        const d = e.details || {};
                        
                        // Extract Infections
                        let infections = [];
                        if (Array.isArray(d.infections)) infections.push(...d.infections);
                        if (d['การติดเชื้ออื่นๆ']) infections.push(d['การติดเชื้ออื่นๆ']);
                        if (d['โรค']) infections.push(d['โรค']); // Legacy data

                        historyRows.push({
                            Date: e.date.split('T')[0],
                            HN: p.hn,
                            Patient_Name: `${p.firstName} ${p.lastName}`,
                            Event_Type: e.type,
                            Event_Title: e.title,
                            // Specific Fields
                            CD4_Count: safeStr(d['CD4'] || d['Initial CD4 count']),
                            CD4_Percent: safeStr(d['CD4 %'] || d['Initial CD4 %']),
                            Viral_Load: safeStr(d['Viral load']),
                            ARV_Regimen: safeStr(d['สูตรยา'] || d['เป็น']),
                            ARV_Previous: safeStr(d['จาก']),
                            TPT_Received: d['TPT'] ? 'Yes' : '',
                            TPT_Regimen: safeStr(d['สูตร TPT']),
                            PJP_Prophylaxis: d['PJP Prophylaxis'] ? 'Yes' : '',
                            OI_Infections: infections.join(', '),
                            Reason: safeStr(d['เหตุผล'] || d['สาเหตุที่ตรวจพบ']),
                            Other_Details: safeStr(d['รายละเอียด'] || d['อื่นๆ']),
                            Full_JSON: JSON.stringify(d) // Keep raw data just in case
                        });
                    }
                });
            });
            if (historyRows.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyRows), "HIV_History");
            }

            // =========================================
            // Sheet 3: Hepatitis Records (HBV & HCV Combined)
            // =========================================
            const hepatitisRows: any[] = [];
            patients.forEach(p => {
                // HBV
                p.hbvInfo?.hbsAgTests?.forEach(t => {
                    if (isInRange(t.date)) hepatitisRows.push({ Date: t.date.split('T')[0], HN: p.hn, Disease: 'HBV', Test_Type: 'HBsAg', Result: t.result, Regimen: '' });
                });
                p.hbvInfo?.viralLoads?.forEach(t => {
                    if (isInRange(t.date)) hepatitisRows.push({ Date: t.date.split('T')[0], HN: p.hn, Disease: 'HBV', Test_Type: 'Viral Load', Result: t.result, Regimen: '' });
                });
                p.hbvInfo?.ultrasounds?.forEach(t => {
                    if (isInRange(t.date)) hepatitisRows.push({ Date: t.date.split('T')[0], HN: p.hn, Disease: 'HBV', Test_Type: 'Ultrasound', Result: t.result, Regimen: '' });
                });
                p.hbvInfo?.ctScans?.forEach(t => {
                    if (isInRange(t.date)) hepatitisRows.push({ Date: t.date.split('T')[0], HN: p.hn, Disease: 'HBV', Test_Type: 'CT Scan', Result: t.result, Regimen: '' });
                });

                // HCV
                p.hcvInfo?.hcvTests?.forEach(t => {
                    if (isInRange(t.date)) hepatitisRows.push({ Date: t.date.split('T')[0], HN: p.hn, Disease: 'HCV', Test_Type: t.type, Result: t.result, Regimen: '' });
                });
                p.hcvInfo?.preTreatmentVls?.forEach(t => {
                    if (isInRange(t.date)) hepatitisRows.push({ Date: t.date.split('T')[0], HN: p.hn, Disease: 'HCV', Test_Type: 'Pre-Treatment VL', Result: t.result, Regimen: '' });
                });
                p.hcvInfo?.treatments?.forEach(t => {
                    if (isInRange(t.date)) hepatitisRows.push({ Date: t.date.split('T')[0], HN: p.hn, Disease: 'HCV', Test_Type: 'Treatment Start', Result: '', Regimen: t.regimen });
                });
                p.hcvInfo?.postTreatmentVls?.forEach(t => {
                    if (isInRange(t.date)) hepatitisRows.push({ Date: t.date.split('T')[0], HN: p.hn, Disease: 'HCV', Test_Type: 'Post-Treatment VL', Result: t.result, Regimen: '' });
                });
            });
            if (hepatitisRows.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hepatitisRows), "Hepatitis_Records");
            }

            // =========================================
            // Sheet 4: STD History
            // =========================================
            const stdRows: any[] = [];
            patients.forEach(p => {
                p.stdInfo?.records?.forEach(r => {
                    if (isInRange(r.date)) {
                        stdRows.push({
                            Date: r.date,
                            HN: p.hn,
                            Patient_Name: `${p.firstName} ${p.lastName}`,
                            Diseases: r.diseases.join(', ')
                        });
                    }
                });
            });
            if (stdRows.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stdRows), "STD_History");
            }

            // =========================================
            // Sheet 5: Prevention (PrEP & PEP)
            // =========================================
            const prevRows: any[] = [];
            patients.forEach(p => {
                // PrEP
                p.prepInfo?.records?.forEach(r => {
                    if (isInRange(r.dateStart)) {
                        prevRows.push({ Date: r.dateStart, HN: p.hn, Type: 'PrEP', Event: 'Start', Detail: '' });
                    }
                    if (r.dateStop && isInRange(r.dateStop)) {
                        prevRows.push({ Date: r.dateStop, HN: p.hn, Type: 'PrEP', Event: 'Stop', Detail: '' });
                    }
                });
                // PEP
                p.pepInfo?.records?.forEach(r => {
                    if (isInRange(r.date)) {
                        prevRows.push({ Date: r.date, HN: p.hn, Type: 'PEP', Event: 'Received', Detail: r.type });
                    }
                });
            });
            if (prevRows.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prevRows), "Prevention_Records");
            }

            // =========================================
            // Sheet 6: Pregnancy Records
            // =========================================
            const pregRows: any[] = [];
            patients.forEach(p => {
                p.pregnancies?.forEach(r => {
                    if (isInRange(r.gaDate)) {
                        pregRows.push({
                            Visit_Date: r.gaDate,
                            HN: p.hn,
                            GA: r.ga,
                            End_Date: safeStr(r.endDate),
                            End_Reason: safeStr(r.endReason)
                        });
                    }
                });
            });
            if (pregRows.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pregRows), "Pregnancy_Records");
            }

            // Write File
            const fileName = `ID_Clinic_Export_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`;
            XLSX.writeFile(wb, fileName);

        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการ Export ข้อมูล (Export Failed)');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">การตั้งค่า (Settings)</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DownloadIcon className="text-emerald-600" />
                    ส่งออกข้อมูล (Export Data)
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    ดาวน์โหลดข้อมูลผู้ป่วยและประวัติการรักษาอย่างละเอียดเป็นไฟล์ Excel (.xlsx)
                    <br/>
                    <span className="text-xs text-gray-400">* ข้อมูลผู้ป่วย (Demographics) จะถูกส่งออกทั้งหมดพร้อมสรุปประวัติการรักษาแต่ละด้าน ส่วนข้อมูลดิบรายครั้งจะถูกกรองตามช่วงเวลาที่เลือก</span>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ตั้งแต่วันที่ (Start Date)</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่ (End Date)</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 items-center">
                    {(startDate || endDate) && (
                        <button 
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            ล้างวันที่ (Clear Dates)
                        </button>
                    )}
                    <button 
                        onClick={handleExport} 
                        disabled={isLoading}
                        className={`flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                กำลังประมวลผล...
                            </>
                        ) : 'ดาวน์โหลด Excel (Full Data)'}
                    </button>
                </div>
            </div>
        </div>
    );
};
