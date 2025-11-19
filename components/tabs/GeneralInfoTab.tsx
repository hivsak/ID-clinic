
import React, { useState, useEffect } from 'react';
import { Patient } from '../../types';
import { DisplayField, inputClass, labelClass } from '../utils';

interface GeneralInfoTabProps {
  patient: Patient;
  isEditing: boolean;
  onUpdate: (patient: Patient) => void;
  onCancelEdit: () => void;
}

export const GeneralInfoTab: React.FC<GeneralInfoTabProps> = ({ patient, isEditing, onUpdate, onCancelEdit }) => {
    const [formData, setFormData] = useState<Patient>(patient);
    
    useEffect(() => {
        setFormData(patient);
        if (!patient.referralType) {
            setFormData(prev => ({ ...prev, referralType: 'มหาสารคาม' }));
        }
    }, [patient, isEditing]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate(formData);
    };
    
    const handleCancel = () => {
        onCancelEdit();
    }

    if (!isEditing) {
        return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลระบุตัวตนผู้ป่วย</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DisplayField label="HN (Hospital Number)" value={patient.hn} />
                        <DisplayField label="NAP ID" value={patient.napId} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลประชากร</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DisplayField label="คำนำหน้า" value={patient.title} />
                        <DisplayField label="ชื่อ" value={patient.firstName} />
                        <DisplayField label="นามสกุล" value={patient.lastName} />
                        <DisplayField label="วันเกิด" value={new Date(patient.dob).toLocaleDateString('th-TH')} />
                        <DisplayField label="เพศ" value={patient.sex} />
                        <DisplayField label="อาชีพ/สถานศึกษา" value={patient.occupation} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลทางการแพทย์และพฤติกรรม</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DisplayField label="สถานะคู่นอน" value={patient.partnerStatus} />
                        <DisplayField label="ผลเลือดของคู่นอน" value={patient.partnerHivStatus} />
                        <DisplayField label="พฤติกรรมเสี่ยง" value={patient.riskBehavior} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลการติดต่อและสิทธิ์</h3>
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
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลการส่งตัว</h3>
                     <DisplayField label="ข้อมูลการส่งตัว" value={patient.referralType} />
                    {patient.referralType === 'ที่อื่น' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <DisplayField label="ส่งตัวมาจาก" value={patient.referredFrom} />
                            <DisplayField label="วันที่ส่งตัว" value={patient.referralDate ? new Date(patient.referralDate).toLocaleDateString('th-TH') : ''} />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลระบุตัวตนผู้ป่วย (Patient Identification)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="hn" className={labelClass}>HN (Hospital Number)</label>
                        <input type="text" name="hn" id="hn" value={formData.hn} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div>
                        <label htmlFor="napId" className={labelClass}>NAP ID</label>
                        <input type="text" name="napId" id="napId" value={formData.napId} onChange={handleChange} className={inputClass} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลประชากร (Demographic Information)</h3>
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
                        <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className={inputClass} required />
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
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลทางการแพทย์และพฤติกรรม (Medical & Behavioral Information)</h3>
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
                            <option>MSM</option>
                            <option>IDU</option>
                            <option>Heterosexual</option>
                            <option>SW</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลการติดต่อและสิทธิ์ (Contact & Eligibility)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="province" className={labelClass}>จังหวัด</label>
                        <input type="text" name="province" id="province" value={formData.province} onChange={handleChange} className={inputClass} />
                    </div>
                     <div>
                        <label htmlFor="district" className={labelClass}>อำเภอ</label>
                        <input type="text" name="district" id="district" value={formData.district} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="subdistrict" className={labelClass}>ตำบล</label>
                        <input type="text" name="subdistrict" id="subdistrict" value={formData.subdistrict} onChange={handleChange} className={inputClass} />
                    </div>
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
                            <option>สิทธิบัตรทอง</option>
                            <option>ประกันสังคม</option>
                            <option>สิทธิข้าราชการ</option>
                            <option>ชำระเงินเอง</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="nextAppointmentDate" className={labelClass}>วันนัดหมายครั้งถัดไป</label>
                        <input type="date" name="nextAppointmentDate" id="nextAppointmentDate" value={formData.nextAppointmentDate || ''} onChange={handleChange} className={inputClass} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-6">ข้อมูลการส่งตัว (Referral Information)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className={labelClass}>ข้อมูลการส่งตัว</label>
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
                                <label htmlFor="referredFrom" className={labelClass}>ส่งตัวมาจาก</label>
                                <input type="text" name="referredFrom" id="referredFrom" value={formData.referredFrom || ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="referralDate" className={labelClass}>วันที่ส่งตัว</label>
                                <input type="date" name="referralDate" id="referralDate" value={formData.referralDate || ''} onChange={handleChange} className={inputClass} />
                            </div>
                        </>
                    )}
                 </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t bg-white -mx-8 -mb-8 px-6 py-4 rounded-b-lg sticky bottom-0 shadow-[0_-20px_25px_-5px_rgba(0,0,0,0.02),0_-10px_10px_-5px_rgba(0,0,0,0.02)]">
                <button type="button" onClick={handleCancel} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    ยกเลิก
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                    บันทึกการเปลี่ยนแปลง
                </button>
            </div>
        </form>
    );
};
