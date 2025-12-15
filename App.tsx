
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { PatientList } from './components/PatientList';
import { PatientDetail } from './components/PatientDetail';
import { PatientForm, NewPatientData } from './components/PatientForm';
import { Dashboard } from './components/Dashboard';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { LoginPage } from './components/LoginPage';
import { Patient, PatientStatus } from './types';
import { BellIcon } from './components/icons';
import { getPatients, createPatient, updatePatient, getPatientById, deletePatient } from './services/patientService';
import { login } from './services/authService';

type View = 'dashboard' | 'list' | 'detail' | 'form' | 'reports' | 'settings';

// --- Utility Functions ---
const calculateVlTestDate = (ga: string, gaDateStr: string): Date | null => {
    // Relaxed regex to allow more than 2 digits for weeks
    if (!ga || !gaDateStr || !/^\d+\+\d+$/.test(ga)) {
        return null;
    }
    const [weeks, days] = ga.split('+').map(Number);
    const measuredDate = new Date(gaDateStr);
    if (isNaN(measuredDate.getTime())) {
        return null;
    }
    const currentGestationInDays = weeks * 7 + days;
    const targetGestationInDays = 32 * 7;
    const daysUntilTarget = targetGestationInDays - currentGestationInDays;
    const targetDate = new Date(measuredDate);
    targetDate.setDate(targetDate.getDate() + daysUntilTarget);
    return targetDate;
};

interface Notification {
    patientId: number;
    patientName: string;
    dueDate: Date;
    hn: string;
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Define fetchPatients with useCallback to avoid stale closures
  const fetchPatients = useCallback(async () => {
      setIsLoading(true);
      try {
          const data = await getPatients();
          setPatients(data);
      } catch (err: any) {
          console.error("Failed to fetch patients", err);
          
          let errorMsg = '';
          
          // Check for DOM Exception / Network Error (isTrusted: true)
          if (typeof err === 'object' && err.isTrusted === true) {
             errorMsg = "ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ (Network Error)\nกรุณาตรวจสอบ:\n1. อินเทอร์เน็ตของคุณ\n2. ตรวจสอบว่าชื่อตัวแปร DATABASE_URL2 หรือ VITE_DATABASE_URL ถูกต้อง";
          } else if (err instanceof Error) {
             errorMsg = err.message;
             // Specific hint for missing tables
             if (err.message.includes('relation') && err.message.includes('does not exist')) {
                 errorMsg += "\n\nคำแนะนำ: ดูเหมือนคุณยังไม่ได้สร้างตารางในฐานข้อมูล (public.patients) กรุณารัน SQL Code";
             }
          } else {
             errorMsg = JSON.stringify(err);
          }
          
          // Only alert if we are logged in, otherwise it pops up on login screen
          if (localStorage.getItem('idClinic_isLoggedIn') === 'true') {
               alert(`ไม่สามารถดึงข้อมูลผู้ป่วยได้\n----------------\nสาเหตุ: ${errorMsg}`);
          }
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    // Check for existing session
    const storedLogin = localStorage.getItem('idClinic_isLoggedIn');
    if (storedLogin === 'true') {
        setIsLoggedIn(true);
        fetchPatients();
    }
  }, [fetchPatients]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const activeNotifications: Notification[] = [];

    patients.forEach(p => {
        if (p.sex === 'หญิง' && p.pregnancies) {
            const activePregnancy = p.pregnancies
                .filter(preg => !preg.endDate)
                .sort((a, b) => new Date(b.gaDate).getTime() - new Date(a.gaDate).getTime())[0];

            if (activePregnancy) {
                const dueDate = calculateVlTestDate(activePregnancy.ga, activePregnancy.gaDate);
                if (dueDate) {
                    const expiryDate = new Date(dueDate);
                    expiryDate.setMonth(expiryDate.getMonth() + 2);
                    
                    if (today <= expiryDate) {
                        activeNotifications.push({
                            patientId: p.id,
                            patientName: `${p.firstName} ${p.lastName}`,
                            dueDate: dueDate,
                            hn: p.hn,
                        });
                    }
                }
            }
        }
    });

    setNotifications(activeNotifications.sort((a,b) => a.dueDate.getTime() - b.dueDate.getTime()));
  }, [patients, isLoggedIn]);

  const handleLogin = async (username: string, password: string) => {
      const user = await login(username, password);
      if (user) {
          setIsLoggedIn(true);
          localStorage.setItem('idClinic_isLoggedIn', 'true');
          fetchPatients();
          setView('dashboard');
      } else {
          throw new Error('INVALID_CREDENTIALS');
      }
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      localStorage.removeItem('idClinic_isLoggedIn');
      setView('dashboard');
      setSelectedPatient(null);
      setPatients([]);
  };

  const handleSelectPatient = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
        const patient = await getPatientById(id);
        if (patient) {
            setSelectedPatient(patient);
            setView('detail');

            // Update local updatedAt timestamp to trigger "Viewed" sorting logic in PatientList
            // This ensures the patient jumps to the top of the list when going back
            setPatients(prev => prev.map(p => 
                p.id === id ? { ...p, updatedAt: new Date().toISOString() } : p
            ));
        }
    } catch (err: any) {
        console.error("Error fetching patient details", err);
        const errorMsg = err instanceof Error ? err.message : (err.isTrusted ? 'Network Connection Failed' : JSON.stringify(err));
        alert(`เกิดข้อผิดพลาดในการดึงข้อมูลผู้ป่วย\nสาเหตุ: ${errorMsg}`);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleChangeView = useCallback((newView: 'dashboard' | 'list' | 'reports' | 'settings') => {
    setView(newView);
    setSelectedPatient(null);
    fetchPatients(); // Refresh data on main navigation changes
  }, [fetchPatients]);

  const handleBackToList = useCallback(() => {
    setSelectedPatient(null);
    setView('list');
    // Do NOT refresh fetchPatients() here immediately if we want to preserve the 
    // local "viewed" sorting we just applied in handleSelectPatient. 
    // The list is already in memory.
  }, []);

  const handleAddNew = useCallback(() => {
      setView('form');
  }, []);

  const handleCancelAdd = useCallback(() => {
    setView('list');
  }, []);

  const handleSavePatient = useCallback(async (newPatientData: NewPatientData) => {
    setIsLoading(true);
    try {
        await createPatient(newPatientData);
        await fetchPatients();
        setView('list');
    } catch (err: any) {
        console.error("Error creating patient", err);
        const errorMsg = err instanceof Error ? err.message : (err.isTrusted ? 'Network Connection Failed' : JSON.stringify(err));
        alert(`บันทึกข้อมูลล้มเหลว\nสาเหตุ: ${errorMsg}`);
    } finally {
        setIsLoading(false);
    }
  }, [fetchPatients]);
  
  const handleUpdatePatient = useCallback(async (updatedPatient: Patient) => {
    // Optimistic UI update (optional, but keeping it makes UI snappy)
    setSelectedPatient(updatedPatient);
    
    try {
        await updatePatient(updatedPatient);
        // We can re-fetch detailed data to ensure everything is synced (e.g. generated IDs)
        const refreshedPatient = await getPatientById(updatedPatient.id);
        if (refreshedPatient) {
             setSelectedPatient(refreshedPatient);
             // Update list in background
             setPatients(prev => prev.map(p => p.id === refreshedPatient.id ? refreshedPatient : p));
        }
    } catch (err: any) {
        console.error("Error updating patient", err);
        const errorMsg = err instanceof Error ? err.message : (err.isTrusted ? 'Network Connection Failed' : JSON.stringify(err));
        alert(`บันทึกการเปลี่ยนแปลงล้มเหลว\nสาเหตุ: ${errorMsg}`);
    }
  }, []);

  const handleDeletePatient = useCallback(async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ป่วยรายนี้? ข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบถาวร')) {
        return;
    }
    setIsLoading(true);
    try {
        await deletePatient(id);
        await fetchPatients();
    } catch (err: any) {
        console.error("Error deleting patient", err);
        const errorMsg = err instanceof Error ? err.message : (err.isTrusted ? 'Network Connection Failed' : JSON.stringify(err));
        alert(`ลบข้อมูลไม่สำเร็จ: ${errorMsg}`);
    } finally {
        setIsLoading(false);
    }
  }, [fetchPatients]);


  const renderContent = () => {
    if (isLoading && patients.length === 0 && view !== 'detail') {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
    }

    if (view === 'detail' && selectedPatient) {
        return <PatientDetail patient={selectedPatient} onBack={handleBackToList} onUpdate={handleUpdatePatient} />;
    }
    if (view === 'form') {
        return <PatientForm onSave={handleSavePatient} onCancel={handleCancelAdd} />;
    }
    if (view === 'dashboard') {
        return <Dashboard patients={patients} onNavigateToPatients={() => handleChangeView('list')} />;
    }
    if (view === 'reports') {
        return <Reports patients={patients} />;
    }
    if (view === 'settings') {
        return <Settings />;
    }
    return <PatientList patients={patients} onSelectPatient={handleSelectPatient} onAddNew={handleAddNew} onDeletePatient={handleDeletePatient} />;
  };

  if (!isLoggedIn) {
      return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 font-sans">
      <Sidebar 
        activeView={view} 
        onChangeView={handleChangeView}
        notifications={notifications}
        onNotificationClick={handleSelectPatient}
        onLogout={handleLogout}
      />
      <main className="pt-16 pb-20 md:pb-0">
        <div className="animate-fade-in-up">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
