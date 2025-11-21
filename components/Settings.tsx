
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { getPatients, importPatientsBulk } from '../services/patientService';
import { DownloadIcon, UploadIcon } from './icons';
import { calculateAge, determineHbvStatus, determineHcvStatus } from './utils';
import { MedicalEventType } from '../types';

export const Settings: React.FC = () => {
    // Export States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExportLoading, setIsExportLoading] = useState(false);

    // Import States
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [importProgress, setImportProgress] = useState<{current: number, total: number} | null>(null);
    const [importResult, setImportResult] = useState<{success: number, failed: number} | null>(null);

    // --- Export Logic ---
    const handleExport = async () => {
        setIsExportLoading(true);
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
            setIsExportLoading(false);
        }
    };

    // --- Import Logic ---

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const headers = [
            { 
                hn: "HN12345", 
                nap_id: "N-112233", 
                title: "นาย", 
                first_name: "สมชาย", 
                last_name: "ใจดี",
                address: "123 หมู่ 1",
                province: "มหาสารคาม",
                district: "เมือง",
                subdistrict: "ตลาด",
                phone: "0812345678"
            },
            { 
                hn: "HN67890", 
                nap_id: "", 
                title: "นาง", 
                first_name: "สมหญิง", 
                last_name: "จริงใจ",
                address: "456 ถนนสุขุมวิท",
                province: "กรุงเทพ",
                district: "วัฒนา",
                subdistrict: "คลองตันเหนือ",
                phone: "0898765432"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(headers);
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Import_Template.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImportLoading(true);
        setImportResult(null);
        setImportProgress(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const binaryStr = event.target?.result;
                const workbook = XLSX.read(binaryStr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                if (jsonData.length === 0) {
                    alert('ไฟล์ไม่มีข้อมูล');
                    setIsImportLoading(false);
                    return;
                }

                // Map excel columns to patient object structure
                const patientsToImport = jsonData.map((row: any) => {
                    const getVal = (key: string) => row[key] || row[key.toUpperCase()] || row[key.toLowerCase()] || '';

                    return {
                        hn: String(getVal('hn')).trim(),
                        napId: String(getVal('nap_id')).trim(),
                        title: String(getVal('title')).trim(),
                        firstName: String(getVal('first_name')).trim(),
                        lastName: String(getVal('last_name')).trim(),
                        status: 'Active',
                        sex: 'ชาย',
                        riskBehavior: 'Heterosexual',
                        healthcareScheme: 'บัตรทอง ในเขต',
                        address: String(getVal('address')).trim(),
                        province: String(getVal('province')).trim(),
                        district: String(getVal('district')).trim(),
                        subdistrict: String(getVal('subdistrict')).trim(),
                        phone: String(getVal('phone')).trim(),
                    };
                }).filter(p => p.hn);

                if (patientsToImport.length === 0) {
                    alert('ไม่พบข้อมูล HN ในไฟล์ที่อัปโหลด');
                    setIsImportLoading(false);
                    return;
                }

                if (window.confirm(`พบข้อมูล ${patientsToImport.length} รายการ คุณต้องการนำเข้าหรือไม่?`)) {
                    // Client-side Chunking for UI responsiveness
                    const CHUNK_SIZE = 50; // Send 50 at a time to the service
                    let totalSuccess = 0;
                    let totalFailed = 0;
                    const allErrors: string[] = [];
                    const total = patientsToImport.length;

                    setImportProgress({ current: 0, total: total });

                    for (let i = 0; i < total; i += CHUNK_SIZE) {
                        const chunk = patientsToImport.slice(i, i + CHUNK_SIZE);
                        
                        // Call the optimized batch insert service
                        const result = await importPatientsBulk(chunk);
                        
                        totalSuccess += result.success;
                        totalFailed += result.failed;
                        allErrors.push(...result.errors);

                        // Update Progress
                        setImportProgress({ current: Math.min(i + CHUNK_SIZE, total), total: total });
                    }

                    setImportResult({ success: totalSuccess, failed: totalFailed });
                    
                    if (allErrors.length > 0) {
                        alert(`นำเข้าสำเร็จ: ${totalSuccess}\nล้มเหลว: ${totalFailed}\n\nข้อผิดพลาดบางส่วน:\n${allErrors.slice(0, 5).join('\n')}${allErrors.length > 5 ? '\n...' : ''}`);
                    } else {
                        alert(`นำเข้าข้อมูลสำเร็จทั้งหมด ${totalSuccess} รายการ`);
                    }
                }
            } catch (error) {
                console.error("Import Error", error);
                alert("เกิดข้อผิดพลาดในการอ่านไฟล์ หรือการเชื่อมต่อฐานข้อมูล");
            } finally {
                setIsImportLoading(false);
                e.target.value = ''; 
            }
        };
        reader.readAsBinaryString(file);
    };

    const percentComplete = importProgress ? Math.round((importProgress.current / importProgress.total) * 100) : 0;

    return (
        <div className="p-6 md:p-8 space-y-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">การตั้งค่า (Settings)</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Export Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <DownloadIcon className="text-emerald-600" />
                        ส่งออกข้อมูล (Export Data)
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        ดาวน์โหลดข้อมูลผู้ป่วยและประวัติการรักษาอย่างละเอียดเป็นไฟล์ Excel (.xlsx)
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ตั้งแต่วันที่ (Start)</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                className="block w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่ (End)</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                                className="block w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 items-center">
                        {(startDate || endDate) && (
                            <button 
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                ล้างวันที่
                            </button>
                        )}
                        <button 
                            onClick={handleExport} 
                            disabled={isExportLoading}
                            className={`flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isExportLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`}
                        >
                            {isExportLoading ? 'Processing...' : 'ดาวน์โหลด Excel'}
                        </button>
                    </div>
                </div>

                {/* Import Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <UploadIcon className="text-blue-600" />
                        นำเข้าข้อมูล (Import Data)
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        นำเข้าข้อมูลผู้ป่วยรายใหม่จากไฟล์ Excel (.xlsx) <br/>
                        <span className="text-xs text-gray-400">คอลัมน์ที่รองรับ: hn, nap_id, title, first_name, last_name, address, province, district, subdistrict, phone</span>
                    </p>

                    <div className="mb-6">
                        <button 
                            onClick={downloadTemplate}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <DownloadIcon className="h-4 w-4" /> ดาวน์โหลดไฟล์ตัวอย่าง (Template)
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${isImportLoading ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadIcon className="w-8 h-8 mb-3 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">XLSX, XLS files</p>
                                </div>
                                <input 
                                    id="dropzone-file" 
                                    type="file" 
                                    className="hidden" 
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    disabled={isImportLoading}
                                />
                            </label>
                        </div>
                        
                        {isImportLoading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-blue-600 font-medium">
                                    <span>กำลังนำเข้าข้อมูล...</span>
                                    <span>{percentComplete}% ({importProgress?.current}/{importProgress?.total})</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${percentComplete}%` }}></div>
                                </div>
                            </div>
                        )}

                        {importResult && !isImportLoading && (
                             <div className={`mt-4 p-3 rounded-md text-sm ${importResult.failed > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                                <p className="font-bold">ผลการนำเข้า:</p>
                                <p>สำเร็จ: {importResult.success}</p>
                                {importResult.failed > 0 && <p>ล้มเหลว: {importResult.failed}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
