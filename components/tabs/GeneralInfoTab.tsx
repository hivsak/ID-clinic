
import React, { useState, useEffect } from 'react';
import { Patient, PatientStatus } from '../../types';
import { DisplayField, calculateAgeBreakdown, calculateDobFromAge, calculatePatientStatus, inputClass, labelClass } from '../utils';
import { EditIcon } from '../icons';
import { ThaiAddressSelector } from '../ThaiAddressSelector';

interface GeneralInfoTabProps {
  patient: Patient;
  onUpdate: (patient: Patient) => void;
}

type EditSection = 'ID' | 'DEMO' | 'MED' | 'CONTACT' | 'REFER' | null;

export const GeneralInfoTab: React.FC<GeneralInfoTabProps> = ({ patient, onUpdate }) => {
    const [editSection, setEditSection] = useState<EditSection>(null);
    const [formData, setFormData] = useState<Patient>(patient);
    const [age, setAge] = useState({ years: '', months: '', days: '' });
    const [isDeceased, setIsDeceased] = useState(false);
    
    useEffect(() => {
        // Reset form data when edit section is closed or patient changes
        if (editSection === null) {
            setFormData(patient);
        } else {
             // Initialize local state when entering edit mode
            if (!formData.referralType) {
                setFormData(prev => ({ ...prev, referralType: 'มหาสารคาม' }));
            }
            setAge(calculateAgeBreakdown(patient.dob));
            setIsDeceased(!!patient.deathDate);
        }
    }, [patient, editSection]);

    // Auto-calculate status when relevant dates change in edit mode
    useEffect(() => {
        if (editSection !== null) {
            const computedStatus = calculatePatientStatus(formData);
            const newStatus = computedStatus || PatientStatus.ACTIVE;
            if (formData.status !== newStatus) {
                setFormData(prev => ({ ...prev, status: newStatus }));
            }
        }
    }, [formData.deathDate, formData.referOutDate, formData.nextAppointmentDate, editSection]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'referralType' && value === 'มหาสารคาม') {
            setFormData(prev => ({
                ...prev,
                referralType: value,
                referredFrom: '',
                referralDate: ''
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddressSelectorChange = (key: 'subdistrict' | 'district' | 'province', value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, dob: val }));
        setAge(calculateAgeBreakdown(val));
    };

    const handleAgeChange = (field: 'years' | 'months' | 'days', val: string) => {
        const newAge = { ...age, [field]: val };
        setAge(newAge);
        const dob = calculateDobFromAge(newAge.years, newAge.months, newAge.days);
        setFormData(prev => ({ ...prev, dob }));
    };

    const handleDeceasedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsDeceased(checked);
        if (!checked) {
            setFormData(prev => ({ ...prev, deathDate: undefined, causeOfDeath: undefined }));
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate(formData);
        setEditSection(null);
    };
    
    const handleCancel = () => {
        setEditSection(null);
        setFormData(patient);
    };

    const currentCalculatedStatus = calculatePatientStatus(patient);
    const displayStatus = currentCalculatedStatus || '-';

    const SectionHeader = ({ title, section }: { title: string, section: EditSection }) => (
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            {editSection === null && (
                <button 
                    onClick={() => setEditSection(section)}
                    className="text-gray-400 hover:text-emerald-600 p-1 rounded-full hover:bg-emerald-50 transition-colors"
                    title="แก้ไขข้อมูล"
                >
                    <EditIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );

    const ActionButtons = () => (
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
            <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                ยกเลิก
            </button>
            <button type="submit" onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                บันทึก
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* 1. Identification Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="ข้อมูลระบุตัวตนผู้ป่วย (Patient Identification)" section="ID" />
                {editSection === 'ID' ? (
                    <form>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="hn" className={labelClass}>HN (Hospital Number)</label>
                                <input type="text" name="hn" id="hn" value={formData.hn} onChange={handleChange} className={inputClass} required />
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
                        <ActionButtons />
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DisplayField label="HN (Hospital Number)" value={patient.hn} />
                        <DisplayField label="NAP ID" value={patient.napId} />
                        <DisplayField label="สถานะ (ปัจจุบัน)" value={displayStatus} />
                    </div>
                )}
            </div>

            {/* 2. Demographic Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="ข้อมูลประชากร (Demographic Information)" section="DEMO" />
                {editSection === 'DEMO' ? (
                    <form>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div>
                                <label htmlFor="title" className={labelClass}>คำนำหน้า</label>
                                <select name="title" id="title" value={formData.title} onChange={handleChange} className={inputClass}>
                                    <option>นาย</option>
                                    <option>นาง</option>
                                    <option>นางสาว</option>
                                    <option>อื่นๆ</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="firstName" className={labelClass}>ชื่อ</label>
                                <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} required />
                            </div>
                            <div>
                                <label htmlFor="lastName" className={labelClass}>นามสกุล</label>
                                <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} required />
                            </div>
                             <div>
                                <label htmlFor="dob" className={labelClass}>วันเกิด</label>
                                <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleDobChange} className={inputClass} required />
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
                                    <option>ชาย</option>
                                    <option>หญิง</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="occupation" className={labelClass}>อาชีพ/สถานศึกษา</label>
                                <input type="text" name="occupation" id="occupation" value={formData.occupation} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                        <ActionButtons />
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DisplayField label="คำนำหน้า" value={patient.title} />
                        <DisplayField label="ชื่อ" value={patient.firstName} />
                        <DisplayField label="นามสกุล" value={patient.lastName} />
                        <DisplayField label="วันเกิด" value={new Date(patient.dob).toLocaleDateString('th-TH')} />
                        <DisplayField label="เพศ" value={patient.sex} />
                        <DisplayField label="อาชีพ/สถานศึกษา" value={patient.occupation} />
                    </div>
                )}
            </div>

            {/* 3. Medical & Behavioral Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="ข้อมูลทางการแพทย์และพฤติกรรม (Medical & Behavioral Information)" section="MED" />
                {editSection === 'MED' ? (
                    <form>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="partnerStatus" className={labelClass}>สถานะคู่นอน</label>
                                <select name="partnerStatus" id="partnerStatus" value={formData.partnerStatus} onChange={handleChange} className={inputClass}>
                                    <option>ไม่มี</option>
                                    <option>มีคู่นอน</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="partnerHivStatus" className={labelClass}>ผลเลือดของคู่นอน</label>
                                <select name="partnerHivStatus" id="partnerHivStatus" value={formData.partnerHivStatus} onChange={handleChange} className={inputClass}>
                                    <option>ไม่ทราบ</option>
                                    <option>บวก (Positive)</option>
                                    <option>ลบ (Negative)</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="riskBehavior" className={labelClass}>พฤติกรรมเสี่ยง</label>
                                <select name="riskBehavior" id="riskBehavior" value={formData.riskBehavior} onChange={handleChange} className={inputClass}>
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
                        <ActionButtons />
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DisplayField label="สถานะคู่นอน" value={patient.partnerStatus} />
                        <DisplayField label="ผลเลือดของคู่นอน" value={patient.partnerHivStatus} />
                        <DisplayField label="พฤติกรรมเสี่ยง" value={patient.riskBehavior} />
                    </div>
                )}
            </div>

            {/* 4. Contact & Eligibility Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="ข้อมูลการติดต่อและสิทธิ์ (Contact & Eligibility)" section="CONTACT" />
                {editSection === 'CONTACT' ? (
                    <form>
                        <div className="grid grid-cols-1 gap-6">
                             {/* Thai Address Selector */}
                             <ThaiAddressSelector 
                                province={formData.province || ''}
                                district={formData.district || ''}
                                subdistrict={formData.subdistrict || ''}
                                onChange={handleAddressSelectorChange}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-3">
                                    <label htmlFor="address" className={labelClass}>ที่อยู่ (รายละเอียด)</label>
                                    <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="phone" className={labelClass}>เบอร์โทรศัพท์</label>
                                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="healthcareScheme" className={labelClass}>สิทธิการรักษา</label>
                                     <select name="healthcareScheme" id="healthcareScheme" value={formData.healthcareScheme} onChange={handleChange} className={inputClass}>
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
                                    <input type="date" name="nextAppointmentDate" id="nextAppointmentDate" value={formData.nextAppointmentDate || ''} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>
                        </div>
                        <ActionButtons />
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DisplayField label="จังหวัด" value={patient.province} />
                        <DisplayField label="อำเภอ" value={patient.district} />
                        <DisplayField label="ตำบล" value={patient.subdistrict} />
                         <div className="md:col-span-3">
                            <DisplayField label="ที่อยู่ (รายละเอียด)" value={patient.address} />
                        </div>
                        <DisplayField label="เบอร์โทรศัพท์" value={patient.phone} />
                        <DisplayField label="สิทธิการรักษา" value={patient.healthcareScheme} />
                        <DisplayField label="วันนัดหมายครั้งถัดไป" value={patient.nextAppointmentDate ? new Date(patient.nextAppointmentDate).toLocaleDateString('th-TH') : '-'} />
                    </div>
                )}
            </div>

            {/* 5. Referral Information Section */}
             <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader title="ข้อมูลการส่งตัว (Referral Information)" section="REFER" />
                {editSection === 'REFER' ? (
                    <form>
                         {/* Refer In Section */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
                            <div className="md:col-span-2">
                                <label className={labelClass}>การส่งตัวเข้า (Refer In)</label>
                                <div className="mt-2 flex gap-x-6">
                                    <div className="flex items-center">
                                        <input
                                            id="referralTypeMahasarakhamDetail"
                                            name="referralType"
                                            type="radio"
                                            value="มหาสารคาม"
                                            checked={formData.referralType === 'มหาสารคาม'}
                                            onChange={handleChange}
                                            className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <label htmlFor="referralTypeMahasarakhamDetail" className="ml-2 block text-sm font-medium text-gray-700">
                                            ผู้ป่วยมหาสารคาม
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            id="referralTypeOtherDetail"
                                            name="referralType"
                                            type="radio"
                                            value="ที่อื่น"
                                            checked={formData.referralType === 'ที่อื่น'}
                                            onChange={handleChange}
                                            className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <label htmlFor="referralTypeOtherDetail" className="ml-2 block text-sm font-medium text-gray-700">
                                            ผู้ป่วยที่อื่น
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {formData.referralType === 'ที่อื่น' && (
                                <>
                                    <div>
                                        <label htmlFor="referralDate" className={labelClass}>วันที่ส่งตัว</label>
                                        <input type="date" name="referralDate" id="referralDate" value={formData.referralDate || ''} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="referredFrom" className={labelClass}>ส่งตัวมาจาก</label>
                                        <input type="text" name="referredFrom" id="referredFrom" value={formData.referredFrom || ''} onChange={handleChange} className={inputClass} />
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
                                <input type="date" name="referOutDate" id="referOutDate" value={formData.referOutDate || ''} onChange={handleChange} className={inputClass} />
                            </div>
                             <div>
                                <label htmlFor="referOutLocation" className={labelClass}>ส่งตัวไปที่</label>
                                <input type="text" name="referOutLocation" id="referOutLocation" value={formData.referOutLocation || ''} onChange={handleChange} className={inputClass} />
                            </div>
                         </div>

                         {/* Death Section */}
                         <div>
                            <div className="flex items-center">
                                 <input 
                                    type="checkbox" 
                                    id="isDeceasedCheckDetail" 
                                    checked={isDeceased} 
                                    onChange={handleDeceasedChange} 
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                                />
                                 <label htmlFor="isDeceasedCheckDetail" className="ml-2 text-sm font-semibold text-gray-800">เสียชีวิต (Deceased)</label>
                            </div>
                            {isDeceased && (
                               <div className="mt-4 pl-6 space-y-4">
                                   <div>
                                       <label htmlFor="deathDate" className={labelClass}>วันที่เสียชีวิต</label>
                                       <input type="date" name="deathDate" id="deathDate" value={formData.deathDate || ''} onChange={handleChange} className={inputClass} style={{ maxWidth: '200px' }} />
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
                         <ActionButtons />
                    </form>
                ) : (
                    <div>
                        {/* Compact Grid for Refer In and Refer Out */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Refer In */}
                            <div className="bg-emerald-50 p-4 rounded-md border border-emerald-100">
                                <p className="text-sm font-bold text-emerald-800 mb-2">Refer In</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {patient.referralType === 'ที่อื่น' ? (
                                        <>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-500">วันที่ส่งตัว</span>
                                                <span className="text-sm font-medium">{patient.referralDate ? new Date(patient.referralDate).toLocaleDateString('th-TH') : '-'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-500">ประเภท</span>
                                                <span className="text-sm font-medium">{patient.referralType}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-500">ส่งตัวมาจาก</span>
                                                <span className="text-sm font-medium">{patient.referredFrom || '-'}</span>
                                            </div>
                                        </>
                                    ) : (
                                         <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">ประเภท</span>
                                            <span className="text-sm font-medium">{patient.referralType || '-'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Refer Out */}
                            <div className="bg-red-50 p-4 rounded-md border border-red-100">
                                <p className="text-sm font-bold text-red-800 mb-2">Refer Out</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500">วันที่ส่งตัวออก</span>
                                        <span className="text-sm font-medium">{patient.referOutDate ? new Date(patient.referOutDate).toLocaleDateString('th-TH') : '-'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500">ส่งตัวไปที่</span>
                                        <span className="text-sm font-medium">{patient.referOutLocation || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <DisplayField label="สถานะ" value={patient.deathDate ? 'เสียชีวิต' : 'มีชีวิตอยู่'} />
                                 {patient.deathDate && (
                                     <>
                                        <DisplayField label="วันที่เสียชีวิต" value={new Date(patient.deathDate).toLocaleDateString('th-TH')} />
                                        <DisplayField label="สาเหตุการเสียชีวิต" value={patient.causeOfDeath === 'HIV-related' ? 'HIV related death' : (patient.causeOfDeath === 'Non-HIV-related' ? 'Non-HIV related death' : '-')} />
                                     </>
                                 )}
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
