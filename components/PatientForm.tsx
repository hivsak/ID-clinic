
import React, { useState, useEffect } from 'react';
import { Patient, PatientStatus } from '../types';
import { calculateAgeBreakdown, calculateDobFromAge, calculatePatientStatus, inputClass, labelClass } from './utils';
import { ThaiAddressSelector } from './ThaiAddressSelector';
import { DateInput } from './DateInput';

export type NewPatientData = Omit<Patient, 'id' | 'medicalHistory' | 'registrationDate'>;

interface PatientFormProps {
    onSave: (patient: NewPatientData) => void;
    onCancel: () => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState<NewPatientData>({
        hn: '',
        cid: '', // Initialize cid
        napId: '',
        title: '',
        firstName: '',
        lastName: '',
        dob: '',
        sex: '',
        riskBehavior: '', // Changed to empty default
        status: PatientStatus.ACTIVE, // Default initial
        occupation: '',
        partnerStatus: '', // Changed to empty default
        partnerHivStatus: '', // Changed to empty default
        address: '',
        subdistrict: '',
        district: '',
        province: '',
        phone: '',
        healthcareScheme: '',
        referralType: 'มหาสารคาม',
        referredFrom: '',
        referralDate: '',
        nextAppointmentDate: '',
        referOutDate: '',
        referOutLocation: '',
        deathDate: '',
        causeOfDeath: undefined,
    });

    const [age, setAge] = useState({ years: '', months: '', days: '' });
    const [isDeceased, setIsDeceased] = useState(false);

    // Auto-calculate status when relevant dates change
    useEffect(() => {
        const computedStatus = calculatePatientStatus(formData);
        // If computedStatus is null (dash), we default to ACTIVE for the DB status to be safe,
        // or we can leave it as is. Let's default to ACTIVE if null for new patients.
        const newStatus = computedStatus || PatientStatus.ACTIVE;
        if (formData.status !== newStatus) {
            setFormData(prev => ({ ...prev, status: newStatus }));
        }
    }, [formData.deathDate, formData.referOutDate, formData.nextAppointmentDate]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } }) => {
        const { name, value } = e.target;
        
        let updates: Partial<NewPatientData> = { [name]: value };

        // National ID input masking (digits only, max 13)
        if (name === 'cid') {
            const numericValue = value.replace(/\D/g, '').slice(0, 13);
            updates.cid = numericValue;
        }

        // Auto-link Title and Sex
        if (name === 'title') {
            if (value === 'นาย') {
                updates.sex = 'ชาย';
            } else if (value === 'นาง' || value === 'นางสาว') {
                updates.sex = 'หญิง';
            }
        } else if (name === 'sex') {
            if (value === 'ชาย') {
                updates.title = 'นาย';
            } else if (value === 'หญิง') {
                // If current title is Male, switch to Miss default. 
                // If already Mrs/Miss/Other, keep it.
                if (formData.title === 'นาย') {
                    updates.title = 'นางสาว';
                }
            }
        } else if (name === 'referralType' && value === 'มหาสารคาม') {
            updates.referredFrom = '';
            updates.referralDate = '';
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleAddressSelectorChange = (key: 'subdistrict' | 'district' | 'province', value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleDeceasedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsDeceased(checked);
        if (!checked) {
            setFormData(prev => ({ ...prev, deathDate: '', causeOfDeath: undefined }));
        }
    };

    const handleDobChange = (e: { target: { value: string } }) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, dob: val }));
        const breakdown = calculateAgeBreakdown(val);
        setAge(breakdown);
    };

    const handleAgeChange = (field: 'years' | 'months' | 'days', val: string) => {
        const newAge = { ...age, [field]: val };
        setAge(newAge);
        const dob = calculateDobFromAge(newAge.years, newAge.months, newAge.days);
        setFormData(prev => ({ ...prev, dob }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation for CID length if provided
        if (formData.cid && formData.cid.length !== 13) {
            alert("เลขบัตรประชาชนต้องมี 13 หลัก");
            return;
        }

        onSave(formData);
    };

    return (
        <div className="p-6 md:p-8">
            <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">
                    <a href="#" onClick={(e) => { e.preventDefault(); onCancel(); }} className="hover:underline">รายชื่อผู้ป่วย</a> /
                    <span className="text-gray-700 font-medium"> เพิ่มผู้ป่วยใหม่</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">เพิ่มผู้ป่วยใหม่</h1>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลระบุตัวตนผู้ป่วย (Patient Identification)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label htmlFor="hn" className={labelClass}>HN (Hospital Number)</label>
                            <input type="text" name="hn" id="hn" value={formData.hn} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                             <label htmlFor="cid" className={labelClass}>เลขบัตรประชาชน (National ID)</label>
                             <input 
                                type="text" 
                                name="cid" 
                                id="cid" 
                                value={formData.cid} 
                                onChange={handleChange} 
                                className={inputClass} 
                                placeholder="13 หลัก"
                                maxLength={13}
                            />
                        </div>
                        <div>
                            <label htmlFor="napId" className={labelClass}>NAP ID</label>
                            <input type="text" name="napId" id="napId" value={formData.napId} onChange={handleChange} className={inputClass} />
                        </div>
                         <div>
                             <label className={labelClass}>สถานะ (คำนวณอัตโนมัติ)</label>
                             <input 
                                type="text" 
                                disabled 
                                value={calculatePatientStatus(formData) || '-'} 
                                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`} 
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลประชากร (Demographic Information)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div>
                            <label htmlFor="title" className={labelClass}>คำนำหน้า</label>
                            <select name="title" id="title" value={formData.title} onChange={handleChange} className={inputClass}>
                                <option value="">-- เลือก --</option>
                                <option>นาย</option>
                                <option>นาง</option>
                                <option>นางสาว</option>
                                <option>อื่นๆ</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="firstName" className={labelClass}>ชื่อ</label>
                            <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="lastName" className={labelClass}>นามสกุล</label>
                            <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} />
                        </div>
                         <div>
                            <label htmlFor="dob" className={labelClass}>วันเกิด</label>
                            <DateInput name="dob" id="dob" value={formData.dob} onChange={handleDobChange} />
                        </div>
                        <div>
                            <label className={labelClass}>อายุ (คำนวณอัตโนมัติ)</label>
                            <div className="flex space-x-2 mt-1">
                                <div className="flex-1 relative">
                                    <input 
                                        type="number" 
                                        min="0"
                                        placeholder="ปี" 
                                        value={age.years} 
                                        onChange={(e) => handleAgeChange('years', e.target.value)} 
                                        className="block w-full px-2 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" 
                                    />
                                    <span className="absolute right-2 top-2 text-xs text-gray-400">ปี</span>
                                </div>
                                <div className="flex-1 relative">
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="11"
                                        placeholder="เดือน" 
                                        value={age.months} 
                                        onChange={(e) => handleAgeChange('months', e.target.value)} 
                                        className="block w-full px-2 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" 
                                    />
                                    <span className="absolute right-2 top-2 text-xs text-gray-400">ด</span>
                                </div>
                                <div className="flex-1 relative">
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="31"
                                        placeholder="วัน" 
                                        value={age.days} 
                                        onChange={(e) => handleAgeChange('days', e.target.value)} 
                                        className="block w-full px-2 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" 
                                    />
                                    <span className="absolute right-2 top-2 text-xs text-gray-400">ว</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="sex" className={labelClass}>เพศ</label>
                            <select name="sex" id="sex" value={formData.sex} onChange={handleChange} className={inputClass}>
                                <option value="">-- เลือก --</option>
                                <option>ชาย</option>
                                <option>หญิง</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="occupation" className={labelClass}>อาชีพ/สถานศึกษา</label>
                            <input type="text" name="occupation" id="occupation" value={formData.occupation} onChange={handleChange} className={inputClass} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลทางการแพทย์และพฤติกรรม (Medical & Behavioral Information)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="partnerStatus" className={labelClass}>สถานะคู่นอน</label>
                            <select name="partnerStatus" id="partnerStatus" value={formData.partnerStatus} onChange={handleChange} className={inputClass}>
                                <option value="">-- เลือก --</option>
                                <option>ไม่มี</option>
                                <option>มีคู่นอน</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="partnerHivStatus" className={labelClass}>ผลเลือดของคู่นอน</label>
                            <select name="partnerHivStatus" id="partnerHivStatus" value={formData.partnerHivStatus} onChange={handleChange} className={inputClass}>
                                <option value="">-- เลือก --</option>
                                <option>ไม่ทราบ</option>
                                <option>บวก (Positive)</option>
                                <option>ลบ (Negative)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="riskBehavior" className={labelClass}>พฤติกรรมเสี่ยง</label>
                            <select name="riskBehavior" id="riskBehavior" value={formData.riskBehavior} onChange={handleChange} className={inputClass}>
                                <option value="">-- เลือก --</option>
                                <option value="MSM insertive">MSM insertive</option>
                                <option value="MSM receptive">MSM receptive</option>
                                <option value="MSM both">MSM both</option>
                                <option value="Bisexual">Bisexual</option>
                                <option value="Transgender">Transgender</option>
                                <option value="Sex worker">Sex worker</option>
                                <option value="IDU">IDU</option>
                                <option value="Heterosexual">Heterosexual</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลการติดต่อและสิทธิ์ (Contact & Eligibility)</h3>
                    <div className="grid grid-cols-1 gap-6">
                        {/* Thai Address Selector (Spans 3 columns in its own grid) */}
                        <ThaiAddressSelector 
                            province={formData.province || ''}
                            district={formData.district || ''}
                            subdistrict={formData.subdistrict || ''}
                            onChange={handleAddressSelectorChange}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="md:col-span-3">
                                <label htmlFor="address" className={labelClass}>ที่อยู่ (รายละเอียด)</label>
                                <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className={inputClass} placeholder="บ้านเลขที่ หมู่ ถนน ซอย..." />
                            </div>
                            <div>
                                <label htmlFor="phone" className={labelClass}>เบอร์โทรศัพท์</label>
                                <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="healthcareScheme" className={labelClass}>สิทธิการรักษา</label>
                                 <select name="healthcareScheme" id="healthcareScheme" value={formData.healthcareScheme} onChange={handleChange} className={inputClass}>
                                    <option value="">-- เลือก --</option>
                                    <option>บัตรทอง นอกเขต</option>
                                    <option>บัตรทอง ในเขต</option>
                                    <option>ประกันสังคม นอกเขต</option>
                                    <option>ประกันสังคม ในเขต</option>
                                    <option>จ่ายตรง กรมบัญชีกลาง</option>
                                    <option>จ่ายตรง ท้องถิ่น</option>
                                    <option>ชำระเงินเอง</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="nextAppointmentDate" className={labelClass}>วันนัดหมายครั้งถัดไป</label>
                                <DateInput name="nextAppointmentDate" id="nextAppointmentDate" value={formData.nextAppointmentDate} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                     <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลการส่งตัว (Referral Information)</h3>
                     
                     {/* Refer In Section */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
                        <div className="md:col-span-2">
                            <label className={labelClass}>การส่งตัวเข้า (Refer In)</label>
                            <div className="mt-2 flex gap-x-6">
                                <div className="flex items-center">
                                    <input
                                        id="referralTypeMahasarakhamForm"
                                        name="referralType"
                                        type="radio"
                                        value="มหาสารคาม"
                                        checked={formData.referralType === 'มหาสารคาม'}
                                        onChange={handleChange}
                                        className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <label htmlFor="referralTypeMahasarakhamForm" className="ml-2 block text-sm font-medium text-gray-700">
                                        ผู้ป่วยมหาสารคาม
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="referralTypeOtherForm"
                                        name="referralType"
                                        type="radio"
                                        value="ที่อื่น"
                                        checked={formData.referralType === 'ที่อื่น'}
                                        onChange={handleChange}
                                        className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <label htmlFor="referralTypeOtherForm" className="ml-2 block text-sm font-medium text-gray-700">
                                        ผู้ป่วยที่อื่น
                                    </label>
                                </div>
                            </div>
                        </div>
                        {formData.referralType === 'ที่อื่น' && (
                            <>
                                <div>
                                    <label htmlFor="referralDate" className={labelClass}>วันที่ส่งตัว</label>
                                    <DateInput name="referralDate" id="referralDate" value={formData.referralDate} onChange={handleChange} />
                                </div>
                                <div>
                                    <label htmlFor="referredFrom" className={labelClass}>ส่งตัวมาจาก</label>
                                    <input type="text" name="referredFrom" id="referredFrom" value={formData.referredFrom} onChange={handleChange} className={inputClass} />
                                </div>
                            </>
                        )}
                     </div>

                     {/* Refer Out Section */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-800">การส่งตัวออก (Refer Out)</label>
                        </div>
                        <div>
                            <label htmlFor="referOutDate" className={labelClass}>วันที่ส่งตัวออก</label>
                            <DateInput name="referOutDate" id="referOutDate" value={formData.referOutDate} onChange={handleChange} />
                        </div>
                         <div>
                            <label htmlFor="referOutLocation" className={labelClass}>ส่งตัวไปที่</label>
                            <input type="text" name="referOutLocation" id="referOutLocation" value={formData.referOutLocation} onChange={handleChange} className={inputClass} />
                        </div>
                     </div>

                     {/* Death Section */}
                     <div>
                        <div className="flex items-center">
                             <input 
                                type="checkbox" 
                                id="isDeceasedCheck" 
                                checked={isDeceased} 
                                onChange={handleDeceasedChange} 
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                            />
                             <label htmlFor="isDeceasedCheck" className="ml-2 text-sm font-semibold text-gray-800">เสียชีวิต (Deceased)</label>
                        </div>
                        {isDeceased && (
                           <div className="mt-4 pl-6 space-y-4">
                               <div>
                                   <label htmlFor="deathDate" className={labelClass}>วันที่เสียชีวิต</label>
                                   <DateInput name="deathDate" id="deathDate" value={formData.deathDate} onChange={handleChange} />
                               </div>
                               <div>
                                   <label className={labelClass}>สาเหตุการเสียชีวิต</label>
                                   <div className="flex items-center space-x-4 mt-2">
                                        <label className="inline-flex items-center">
                                            <input 
                                                type="radio" 
                                                name="causeOfDeath" 
                                                value="HIV-related" 
                                                checked={formData.causeOfDeath === 'HIV-related'} 
                                                onChange={handleChange} 
                                                className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                                            />
                                            <span className="ml-2 text-sm text-gray-700">HIV related death</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input 
                                                type="radio" 
                                                name="causeOfDeath" 
                                                value="Non-HIV-related" 
                                                checked={formData.causeOfDeath === 'Non-HIV-related'} 
                                                onChange={handleChange} 
                                                className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Non-HIV related death</span>
                                        </label>
                                   </div>
                               </div>
                           </div>
                        )}
                     </div>
                </div>


                <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
                    <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        ยกเลิก
                    </button>
                    <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                        บันทึกข้อมูล
                    </button>
                </div>
            </form>
        </div>
    );
};