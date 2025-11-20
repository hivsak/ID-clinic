
import React, { useState, useMemo } from 'react';
import { Patient, PatientStatus, MedicalEventType } from '../types';
import { determineHcvStatus } from './utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

interface DashboardProps {
  patients: Patient[];
}

type DateRangeType = 'today' | 'month' | 'year' | 'custom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];
const HCV_COLORS: Record<string, string> = {
    'ไม่เป็น HCV': '#10B981', // Emerald
    'เคยเป็น HCV รักษาหายแล้ว': '#34D399', // Light Emerald
    'เป็น HCV รักษาแล้วไม่หาย': '#EF4444', // Red
    'กำลังรักษา HCV': '#F59E0B', // Amber
    'เคยเป็น HCV หายเอง': '#6EE7B7', // Green 300
    'เป็น HCV': '#DC2626', // Red 600
    'รอการตรวจเพิ่มเติม': '#FBBF24', // Amber 400
    'ไม่มีข้อมูล': '#9CA3AF' // Gray
};

export const Dashboard: React.FC<DashboardProps> = ({ patients }) => {
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate Date Range
  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    if (dateRangeType === 'today') {
      // start is already today 00:00
    } else if (dateRangeType === 'month') {
      start.setDate(1); // 1st of current month
    } else if (dateRangeType === 'year') {
      start.setMonth(0, 1); // Jan 1st of current year
    } else if (dateRangeType === 'custom') {
      if (customStartDate) start = new Date(customStartDate);
      if (customEndDate) {
         const e = new Date(customEndDate);
         e.setHours(23, 59, 59, 999);
         return { start, end: e };
      }
    }
    return { start, end };
  }, [dateRangeType, customStartDate, customEndDate]);

  const isInRange = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= dateRange.start && d <= dateRange.end;
  };

  // --- 1. KPI Metrics (Snapshot - All Time / Current Status) ---
  const totalPatients = patients.length;
  const ltfuPatients = patients.filter(p => p.status === PatientStatus.LTFU).length;
  
  // TPT: Patients who have a Prophylaxis event with TPT=true (Ever)
  const tptPatients = patients.filter(p => 
      p.medicalHistory.some(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT)
  ).length;

  // Pregnant: Currently pregnant (no end date)
  const pregnantPatients = patients.filter(p => 
      p.sex === 'หญิง' && p.pregnancies?.some(preg => !preg.endDate)
  ).length;

  // HBV Diagnosed: Latest HBsAg is Positive
  const hbvDiagnosed = patients.filter(p => {
      const tests = p.hbvInfo?.hbsAgTests || [];
      if (tests.length === 0) return false;
      const latest = [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      return latest.result === 'Positive';
  }).length;


  // --- 2. HCV Status Breakdown (Snapshot) ---
  const hcvStatusData = useMemo(() => {
      const statusCounts: Record<string, number> = {};
      patients.forEach(p => {
          const status = determineHcvStatus(p);
          statusCounts[status.text] = (statusCounts[status.text] || 0) + 1;
      });
      
      return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [patients]);


  // --- 3. Service Statistics (Filtered by Date Range) ---
  
  // PrEP Stats
  const prepStats = useMemo(() => {
      let visits = 0;
      const uniquePeople = new Set<number>();
      
      patients.forEach(p => {
          (p.prepInfo?.records || []).forEach(r => {
              if (isInRange(r.dateStart)) {
                  visits++;
                  uniquePeople.add(p.id);
              }
          });
      });
      return [
          { name: 'จำนวนครั้ง (Visits)', count: visits },
          { name: 'จำนวนคน (People)', count: uniquePeople.size }
      ];
  }, [patients, dateRange]);

  // PEP Stats
  const pepStats = useMemo(() => {
      let opepCount = 0;
      let npepCount = 0;
      
      patients.forEach(p => {
          (p.pepInfo?.records || []).forEach(r => {
              if (isInRange(r.date)) {
                  if (r.type === 'oPEP') opepCount++;
                  else npepCount++;
              }
          });
      });
      
      return [
          { name: 'oPEP', value: opepCount },
          { name: 'nPEP', value: npepCount }
      ];
  }, [patients, dateRange]);

  // STD Stats
  const stdStats = useMemo(() => {
      let visits = 0;
      const uniquePeople = new Set<number>();
      
      patients.forEach(p => {
          (p.stdInfo?.records || []).forEach(r => {
              if (isInRange(r.date)) {
                  visits++;
                  uniquePeople.add(p.id);
              }
          });
      });
      
       return [
          { name: 'จำนวนครั้ง (Visits)', count: visits },
          { name: 'จำนวนคน (People)', count: uniquePeople.size }
      ];
  }, [patients, dateRange]);


  // --- Helper Components ---
  const KPICard = ({ title, value, colorClass }: { title: string, value: number | string, colorClass: string }) => (
      <div className={`p-6 rounded-lg shadow-sm border-l-4 ${colorClass} bg-white`}>
          <p className="text-sm text-gray-500 font-medium uppercase">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
      </div>
  );

  const DateFilterButton = ({ type, label }: { type: DateRangeType, label: string }) => (
      <button 
        onClick={() => setDateRangeType(type)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            dateRangeType === type 
            ? 'bg-emerald-600 text-white shadow-sm' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
          {label}
      </button>
  );

  return (
    <div className="p-6 md:p-8 space-y-8 bg-gray-50 min-h-screen">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard ภาพรวม</h1>
            <p className="text-sm text-gray-500 mt-1">สรุปข้อมูลผู้ป่วยและการให้บริการ</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
             <span className="text-sm text-gray-600 mr-2">ช่วงเวลา (Service Stats):</span>
             <DateFilterButton type="today" label="วันนี้" />
             <DateFilterButton type="month" label="เดือนนี้" />
             <DateFilterButton type="year" label="ปีนี้" />
             <DateFilterButton type="custom" label="กำหนดเอง" />
        </div>
      </div>

      {dateRangeType === 'custom' && (
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm w-fit ml-auto">
              <div>
                  <label className="block text-xs text-gray-500">เริ่มต้น</label>
                  <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                  <label className="block text-xs text-gray-500">สิ้นสุด</label>
                  <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
              </div>
          </div>
      )}

      {/* 1. Snapshot KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <KPICard title="ผู้ป่วย HIV ทั้งหมด" value={totalPatients} colorClass="border-blue-500" />
          <KPICard title="ผู้ป่วยขาดนัด (LTFU)" value={ltfuPatients} colorClass="border-red-500" />
          <KPICard title="ผู้ป่วยได้รับ TPT" value={tptPatients} colorClass="border-green-500" />
          <KPICard title="ตั้งครรภ์ปัจจุบัน" value={pregnantPatients} colorClass="border-pink-500" />
          <KPICard title="วินิจฉัย HBV" value={hbvDiagnosed} colorClass="border-amber-500" />
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* HCV Status Donut */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">สถานะผู้ป่วย HCV (ทั้งหมด)</h3>
              <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                            data={hcvStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {hcvStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={HCV_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* PEP Breakdown Donut */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">ผู้รับบริการ PEP (ตามช่วงเวลา)</h3>
              {pepStats.every(i => i.value === 0) ? (
                  <div className="h-80 flex items-center justify-center text-gray-400">ไม่มีข้อมูลในช่วงเวลานี้</div>
              ) : (
                  <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                data={pepStats}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#82ca9d"
                                dataKey="value"
                                label={({name, value}) => `${name}: ${value}`}
                              >
                                <Cell fill="#3B82F6" /> {/* oPEP Blue */}
                                <Cell fill="#F97316" /> {/* nPEP Orange */}
                              </Pie>
                              <Tooltip />
                              <Legend />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              )}
          </div>

          {/* PrEP Visits Bar Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">บริการ PrEP (ตามช่วงเวลา)</h3>
               <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#10B981" name="จำนวน" barSize={60} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* STD Cases Bar Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">ผู้ป่วย STD (ตามช่วงเวลา)</h3>
              <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stdStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8B5CF6" name="จำนวน" barSize={60} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

      </div>
    </div>
  );
};
