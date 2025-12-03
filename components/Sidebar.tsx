import React, { useState } from 'react';
import { DashboardIcon, PatientsIcon, ReportsIcon, SettingsIcon, LogoutIcon, BellIcon } from './icons';

interface Notification {
    patientId: number;
    patientName: string;
    dueDate: Date;
    hn: string;
}

const formatThaiDateShort = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear() + 543;
    return `${day}/${month}/${year}`;
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false, onClick }) => (
  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      onClick?.();
    }}
    className={`group flex flex-col md:flex-row items-center md:justify-start justify-center w-full md:w-auto p-2 md:px-4 md:py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
      active
        ? 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-500/20 shadow-sm'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`}
    title={label}
  >
    <span className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
    </span>
    <span className="hidden md:inline md:ml-3 font-semibold">{label}</span>
  </a>
);

interface SidebarProps {
    activeView: string;
    onChangeView: (view: 'dashboard' | 'list' | 'reports' | 'settings') => void;
    notifications: Notification[];
    onNotificationClick: (patientId: number) => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChangeView, notifications, onNotificationClick, onLogout }) => {
  const isPatientSectionActive = ['list', 'detail', 'form'].includes(activeView);
  const isDashboardActive = activeView === 'dashboard';
  const isReportsActive = activeView === 'reports';
  const isSettingsActive = activeView === 'settings';
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleNotificationItemClick = (patientId: number) => {
    onNotificationClick(patientId);
    setIsNotificationsOpen(false);
  }

  const renderNotificationBell = () => (
    <div className="relative">
        <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
            className="relative p-2.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
        >
            <BellIcon className="w-5 h-5" />
            {notifications.length > 0 && (
                <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
        </button>
        {isNotificationsOpen && (
             <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-[60] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="text-sm font-bold text-slate-800">การแจ้งเตือน ({notifications.length})</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                   {notifications.length > 0 ? (
                        <ul className="divide-y divide-slate-50">
                            {notifications.map(n => (
                                 <li key={n.patientId}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleNotificationItemClick(n.patientId); }} className="block px-4 py-3 hover:bg-slate-50 transition-colors text-sm">
                                        <p className="font-semibold text-slate-800">{n.patientName} <span className="font-normal text-slate-500 text-xs ml-1">(HN: {n.hn})</span></p>
                                        <p className="text-slate-500 text-xs mt-1">
                                            มีนัดเจาะ HIV VL วันที่ <span className="font-semibold text-emerald-600">{formatThaiDateShort(n.dueDate)}</span>
                                        </p>
                                    </a>
                                </li>
                            ))}
                        </ul>
                   ) : (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            ไม่มีการแจ้งเตือน
                        </div>
                   )}
                </div>
             </div>
        )}
    </div>
  );

  return (
    <>
        {/* Mobile Top Header */}
        <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 z-50">
             <div className="flex items-center">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl h-9 w-9 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    ID
                </div>
                <h1 className="text-lg font-bold text-slate-800 ml-3 tracking-tight">ID Clinic</h1>
            </div>
            <div className="flex items-center space-x-1">
                 {renderNotificationBell()}
                 <button onClick={onLogout} className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors">
                    <LogoutIcon className="h-5 w-5" />
                 </button>
            </div>
        </header>

        {/* Desktop Header / Mobile Bottom Nav */}
        <header className="fixed bottom-0 md:top-0 left-0 w-full md:h-20 h-16 bg-white border-t md:border-t-0 md:border-b border-slate-200 flex items-center z-50 shadow-sm md:shadow-none">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between md:px-8 px-2 h-full">

                {/* Logo and Title - Desktop only */}
                <div className="hidden md:flex items-center">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl h-10 w-10 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-500/20">
                        ID
                    </div>
                    <div className="ml-3">
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">ID Clinic</h1>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Manager</p>
                    </div>
                </div>

                {/* Navigation Items - Mobile: takes full width; Desktop: centered */}
                <nav className="flex flex-row justify-around items-center w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 md:space-x-1">
                    <NavItem icon={<DashboardIcon />} label="Dashboard" active={isDashboardActive} onClick={() => onChangeView('dashboard')} />
                    <NavItem icon={<PatientsIcon />} label="Patients" active={isPatientSectionActive} onClick={() => onChangeView('list')} />
                    <NavItem icon={<ReportsIcon />} label="Reports" active={isReportsActive} onClick={() => onChangeView('reports')} />
                    <NavItem icon={<SettingsIcon />} label="Settings" active={isSettingsActive} onClick={() => onChangeView('settings')} />
                </nav>

                {/* User Info & Actions - Desktop only */}
                <div className="hidden md:flex items-center space-x-3">
                    {renderNotificationBell()}
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <button 
                        onClick={onLogout}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                        <LogoutIcon className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>

            </div>
        </header>
    </>
  );
};