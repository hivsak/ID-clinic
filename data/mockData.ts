
import { Patient, PatientStatus, MedicalEventType } from '../types';

export const mockPatients: Patient[] = [
  {
    id: 1,
    hn: 'HN12345',
    napId: 'N-112233',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    dob: '1979-03-21',
    sex: 'ชาย',
    riskBehavior: 'MSM',
    status: PatientStatus.ACTIVE,
    registrationDate: '2020-01-15',
    nextAppointmentDate: '2024-09-12',
    occupation: 'ทหาร',
    partnerStatus: 'มีคู่นอน',
    partnerHivStatus: 'บวก (Positive)',
    address: 'กรมทหารราบที่ 1 มหาดเล็กราชวัลลภรักษาพระองค์',
    subdistrict: 'สามเสนใน',
    district: 'พญาไท',
    province: 'กรุงเทพมหานคร',
    phone: '081-234-5678',
    healthcareScheme: 'ประกันสังคม',
    referralType: 'ที่อื่น',
    referredFrom: 'โรงพยาบาลพระมงกุฎเกล้า',
    referralDate: '2019-10-15',
    medicalHistory: [
      {
        id: 'evt4',
        type: MedicalEventType.ART_CHANGE,
        date: '2024-06-20',
        title: 'เปลี่ยนสูตรยา ARV',
        details: {
          'จาก': 'TDF + 3TC + EFV',
          'เป็น': 'TDF + 3TC + DTG',
          'เหตุผล': 'แพ้ยา EFV (อาการมึนงง)',
        },
      },
      {
        id: 'evt5',
        type: MedicalEventType.MISSED_MEDS,
        date: '2023-04-02',
        title: 'ประวัติการขาดยา',
        details: {
            'เหตุผล': 'ยาหมดก่อนวันนัดและไม่สะดวกมาโรงพยาบาล',
        },
      },
       {
        id: 'evt3',
        type: MedicalEventType.OPPORTUNISTIC_INFECTION,
        date: '2022-10-10',
        title: 'การติดเชื้อฉวยโอกาส',
        details: {
          'โรค': 'Oral candidiasis (เชื้อราในช่องปาก)',
        },
      },
      {
        id: 'evt2',
        type: MedicalEventType.ART_START,
        date: '2010-02-01',
        title: 'เริ่มยา ARV ครั้งแรก',
        details: {
          'สูตรยา': 'TDF + 3TC + EFV',
        },
      },
      {
        id: 'evt1',
        type: MedicalEventType.DIAGNOSIS,
        date: '2010-01-15',
        title: 'วินิจฉัยพบเชื้อ HIV',
        details: {
          'ผลตรวจ': 'Positive',
        },
      },
    ],
    hbvInfo: {
        hbsAgTests: [
            { id: 'hbs1-3', result: 'Negative', date: '2023-10-15'},
            { id: 'hbs1-2', result: 'Negative', date: '2023-07-10'},
            { id: 'hbs1-1', result: 'Positive', date: '2023-04-02' }
        ],
        viralLoads: [
            { id: 'vl1-3', result: '1,800 IU/mL', date: '2023-10-15' },
            { id: 'vl1-2', result: '1,800 IU/mL', date: '2023-07-10' },
            { id: 'vl1-1', result: '1,250 IU/mL', date: '2023-04-02' },
        ],
        ultrasounds: [
            { id: 'us1-2', result: 'Evidence of mild fibrosis.', date: '2023-10-20' },
            { id: 'us1-1', result: 'Liver appears normal.', date: '2023-04-15' },
        ],
        ctScans: [
            { id: 'ct1-2', result: 'Evidence of mild fibrosis.', date: '2023-10-20' },
            { id: 'ct1-1', result: 'Liver appears normal.', date: '2023-04-15' },
        ]
    },
    hcvInfo: {
      hcvTests: [
        { id: 'hcv1-1', type: 'Anti-HCV', result: 'Positive', date: '2018-05-10' }
      ],
      preTreatmentVls: [{ id: 'hcvpre1-1', result: '1,200,000 IU/mL', date: '2018-06-01' }],
      treatments: [{ id: 'hcvtrt1-1', regimen: 'Sofosbuvir/Velpatasvir for 12 weeks', date: '2018-06-15' }],
      postTreatmentVls: [{ id: 'hcvpost1-1', result: 'Not Detected', date: '2018-10-01' }],
    },
    stdInfo: {
        records: [
            { 
                id: 'std1-1', 
                diseases: ['Secondary Syphilis'], 
                date: '2022-05-15', 
            },
            { 
                id: 'std1-2', 
                diseases: ['Gonorrhea', 'Chlamydia'], 
                date: '2023-11-01', 
            }
        ]
    },
    prepInfo: {
        records: [
            { id: 'prep1-1', dateStart: '2022-01-10', dateStop: '2023-01-09' },
            { id: 'prep1-2', dateStart: '2024-03-01' }, // Currently active
        ]
    },
    pepInfo: {
        records: [
            { id: 'pep1-1', date: '2021-07-20', type: 'nPEP' },
            { id: 'pep1-2', date: '2023-02-15', type: 'oPEP' },
        ]
    },
  },
  {
    id: 2,
    hn: 'HN67890',
    napId: 'N-445566',
    firstName: 'สมหญิง',
    lastName: 'จริงใจ',
    dob: '1992-08-10',
    sex: 'หญิง',
    riskBehavior: 'Heterosexual',
    status: PatientStatus.ACTIVE,
    registrationDate: '2021-03-20',
    nextAppointmentDate: '2024-08-20',
    phone: '082-345-6789',
    healthcareScheme: 'สิทธิบัตรทอง',
    referralType: 'มหาสารคาม',
    medicalHistory: [],
    pregnancies: [
        { id: 'preg-2-1', ga: '10+2', gaDate: '2024-07-15' }
    ],
    hbvInfo: {
        hbsAgTests: [ { id: 'hbs2-1', result: 'Negative', date: '2021-03-20' }],
    },
    hcvInfo: {
      hcvTests: [
        { id: 'hcv2-1', type: 'Anti-HCV', result: 'Negative', date: '2021-03-20' }
      ],
    },
    prepInfo: {
        records: []
    },
    pepInfo: {
        records: []
    }
  },
  {
    id: 3,
    hn: 'HN11223',
    napId: 'N-778899',
    firstName: 'มานี',
    lastName: 'มีสุข',
    dob: '1973-12-05',
    sex: 'หญิง',
    riskBehavior: 'Heterosexual',
    status: PatientStatus.LTFU,
    registrationDate: '2020-10-08',
    nextAppointmentDate: '2023-01-15',
    phone: '083-456-7890',
    healthcareScheme: 'สิทธิข้าราชการ',
    referralType: 'มหาสารคาม',
    medicalHistory: [],
    pregnancies: [],
    hcvInfo: {
      hcvTests: [
        { id: 'hcv3-1', type: 'HCV-Ag', result: 'Inconclusive', date: '2020-10-08' }
      ],
    }
  },
  {
    id: 4,
    hn: 'HN44556',
    napId: 'N-101112',
    firstName: 'ปิติ',
    lastName: 'ยินดี',
    dob: '1996-06-25',
    sex: 'ชาย',
    riskBehavior: 'MSM',
    status: PatientStatus.TRANSFERRED,
    registrationDate: '2022-11-05',
    phone: '084-567-8901',
    healthcareScheme: 'ประกันสังคม',
    referralType: 'มหาสารคาม',
    medicalHistory: [],
  },
  {
    id: 5,
    hn: 'HN77889',
    napId: 'N-131415',
    firstName: 'วีระ',
    lastName: 'กล้าหาญ',
    dob: '1986-09-18',
    sex: 'ชาย',
    riskBehavior: 'MSM',
    status: PatientStatus.ACTIVE,
    registrationDate: '2019-07-30',
    nextAppointmentDate: '2024-09-05',
    phone: '085-678-9012',
    healthcareScheme: 'สิทธิบัตรทอง',
    referralType: 'มหาสารคาม',
    medicalHistory: [],
    hbvInfo: {
        hbsAgTests: [
             { id: 'hbs5-2', result: 'Inconclusive', date: '2022-02-15' },
             { id: 'hbs5-1', result: 'Positive', date: '2022-02-01' },
        ],
        viralLoads: [{ id: 'vl5-1', result: '2,500 IU/mL', date: '2022-02-01' }],
        ultrasounds: [{ id: 'us5-1', result: 'Normal', date: '2022-01-10' }],
    },
    hcvInfo: {
      hcvTests: [
          { id: 'hcv5-1', type: 'Anti-HCV', result: 'Positive', date: '2021-11-20' }
      ],
      hcvVlNotTested: false,
      preTreatmentVls: [{ id: 'hcvpre5-1', result: '5,500,000 IU/mL', date: '2021-12-05' }],
    },
    prepInfo: {
        records: [
            { id: 'prep5-1', dateStart: '2021-05-20', dateStop: '2022-05-19' }
        ]
    },
  },
  {
    id: 6,
    hn: 'HN99999',
    napId: 'N-161718',
    firstName: 'ชาติชาย',
    lastName: 'ชาญชัย',
    dob: '1965-01-01',
    sex: 'ชาย',
    riskBehavior: 'Heterosexual',
    status: PatientStatus.EXPIRED,
    registrationDate: '2018-05-20',
    phone: '086-789-0123',
    healthcareScheme: 'สิทธิข้าราชการ',
    referralType: 'มหาสารคาม',
    medicalHistory: [],
  },
  {
    id: 7,
    hn: 'HN88888',
    napId: 'N-192021',
    firstName: 'สุดา',
    lastName: 'สวยเสมอ',
    dob: '1999-11-30',
    sex: 'หญิง',
    riskBehavior: 'SW',
    status: PatientStatus.RESTART,
    registrationDate: '2023-02-10',
    nextAppointmentDate: '2024-08-28',
    phone: '087-890-1234',
    healthcareScheme: 'ประกันสังคม',
    referralType: 'มหาสารคาม',
    medicalHistory: [],
  },
];
