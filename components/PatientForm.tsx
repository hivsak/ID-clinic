
import React, { useState } from 'react';
import { Patient } from '../types';

export type NewPatientData = Omit<Patient, 'id' | 'medicalHistory' | 'status' | 'registrationDate'>;

interface PatientFormProps {
    onSave: (patient: NewPatientData) => void;
    onCancel: () => void;
}

const inputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm";
const labelClass = "block text-sm font-medium text-gray-700";

export const PatientForm: React.FC<PatientFormProps> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState<NewPatientData>({
        hn: '',
        napId: '',
        title: 'นาย',
        firstName: '',
        lastName: '',
        dob: '',
        sex: 'ชาย',
        riskBehavior: 'MSM',
        occupation: '',
        partnerStatus: 'ไม่มี',
        partnerHivStatus: 'ไม่ทราบ',
        address: '',
        subdistrict: '',
        district: '',
        province: '',
        phone: '',
        healthcareScheme: 'สิทธิบัตรทอง',
        referralType: 'มหาสารคาม',
        referredFrom: '',
        referralDate: '',
    });

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
                            <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="lastName" className={labelClass}>นามสกุล</label>
                            <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} />
                        </div>
                         <div>
                            <label htmlFor="dob" className={labelClass}>วันเกิด</label>
                            <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className={inputClass} />
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
                                    <label htmlFor="referredFrom" className={labelClass}>ส่งตัวมาจาก</label>
                                    <input type="text" name="referredFrom" id="referredFrom" value={formData.referredFrom} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="referralDate" className={labelClass}>วันที่ส่งตัว</label>
                                    <input type="date" name="referralDate" id="referralDate" value={formData.referralDate} onChange={handleChange} className={inputClass} />
                                </div>
                            </>
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
