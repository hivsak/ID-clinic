
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { PatientList } from './components/PatientList';
import { PatientDetail } from './components/PatientDetail';
import { PatientForm, NewPatientData } from './components/PatientForm';
import { LoginPage } from './components/LoginPage';
import { Patient, PatientStatus } from './types';
import { BellIcon } from './components/icons';
import { getPatients, createPatient, updatePatient, getPatientById } from './services/patientService';

type View = 'list' | 'detail' | 'form';

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
  const [view, setView] = useState<View>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedLogin = localStorage.getItem('idClinic_isLoggedIn');
    if (storedLogin === 'true') {
        setIsLoggedIn(true);
        fetchPatients();
    }
  }, []);

  const fetchPatients = async () => {
      setIsLoading(true);
      try {
          const data = await getPatients();
          setPatients(data);
      } catch (err) {
          console.error("Failed to fetch patients", err);
          alert("ไม่สามารถดึงข้อมูลผู้ป่วยได้");
      } finally {
          setIsLoading(false);
      }
  };

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

  const handleLogin = () => {
      setIsLoggedIn(true);
      localStorage.setItem('idClinic_isLoggedIn', 'true');
      fetchPatients();
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      localStorage.removeItem('idClinic_isLoggedIn');
      setView('list');
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
        }
    } catch (err) {
        console.error("Error fetching patient details", err);
        alert("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ป่วย");
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedPatient(null);
    setView('list');
    fetchPatients(); // Refresh list on back
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
    } catch (err) {
        console.error("Error creating patient", err);
        alert("บันทึกข้อมูลล้มเหลว");
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const handleUpdatePatient = useCallback(async (updatedPatient: Patient) => {
    // Optimistic UI update
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
    } catch (err) {
        console.error("Error updating patient", err);
        alert("บันทึกการเปลี่ยนแปลงล้มเหลว");
    }
  }, []);


  const renderContent = () => {
    if (isLoading && patients.length === 0) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
    }

    if (view === 'detail' && selectedPatient) {
        return <PatientDetail patient={selectedPatient} onBack={handleBackToList} onUpdate={handleUpdatePatient} />;
    }
    if (view === 'form') {
        return <PatientForm onSave={handleSavePatient} onCancel={handleCancelAdd} />;
    }
    return <PatientList patients={patients} onSelectPatient={handleSelectPatient} onAddNew={handleAddNew} />;
  };

  if (!isLoggedIn) {
      return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 font-sans">
      <Sidebar 
        activeView={view} 
        onNavigate={handleBackToList}
        notifications={notifications}
        onNotificationClick={handleSelectPatient}
        onLogout={handleLogout}
      />
      <main className="md:pt-16 pb-20 md:pb-0">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
