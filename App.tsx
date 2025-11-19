
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { PatientList } from './components/PatientList';
import { PatientDetail } from './components/PatientDetail';
import { PatientForm, NewPatientData } from './components/PatientForm';
import { LoginPage } from './components/LoginPage';
import { mockPatients } from './data/mockData';
import { Patient, PatientStatus } from './types';
import { BellIcon } from './components/icons';

type View = 'list' | 'detail' | 'form';

// --- Utility Functions ---
const calculateVlTestDate = (ga: string, gaDateStr: string): Date | null => {
    // Relaxed regex to allow more than 2 digits for weeks (e.g. >99 weeks or historical data)
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

  useEffect(() => {
    // Check for existing session
    const storedLogin = localStorage.getItem('idClinic_isLoggedIn');
    if (storedLogin === 'true') {
        setIsLoggedIn(true);
    }

    // Simulate fetching data - Deep clone to ensure references are fresh and deletions work correctly
    setPatients(JSON.parse(JSON.stringify(mockPatients)));
  }, []);

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
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      localStorage.removeItem('idClinic_isLoggedIn');
      setView('list');
      setSelectedPatient(null);
  };

  const handleSelectPatient = useCallback((id: number) => {
    const patient = patients.find(p => p.id === id);
    if (patient) {
      setSelectedPatient(patient);
      setView('detail');
    }
  }, [patients]);

  const handleBackToList = useCallback(() => {
    setSelectedPatient(null);
    setView('list');
  }, []);

  const handleAddNew = useCallback(() => {
      setView('form');
  }, []);

  const handleCancelAdd = useCallback(() => {
    setView('list');
  }, []);

  const handleSavePatient = useCallback((newPatientData: NewPatientData) => {
    const newPatient: Patient = {
      ...newPatientData,
      id: Date.now(), // Use a simple unique ID for this demo
      medicalHistory: [],
      status: PatientStatus.ACTIVE,
      registrationDate: new Date().toISOString().split('T')[0], // Today's date
    };
    setPatients(prevPatients => [newPatient, ...prevPatients]);
    setView('list');
  }, []);
  
  const handleUpdatePatient = useCallback((updatedPatient: Patient) => {
    setPatients(prevPatients => 
        prevPatients.map(p => p.id === updatedPatient.id ? updatedPatient : p)
    );
    setSelectedPatient(updatedPatient);
  }, []);


  const renderContent = () => {
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
