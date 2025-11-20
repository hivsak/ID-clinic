
import React, { useState } from 'react';
import { DashboardIcon, PatientsIcon, ReportsIcon, SettingsIcon, LogoutIcon, BellIcon } from './icons';

interface Notification {
    patientId: number;
    patientName: string;
    dueDate: Date;
    hn: string;
}

const formatThaiDateShort = (date: Date) => {
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
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
    className={`flex flex-col md:flex-row items-center justify-center w-full md:w-auto p-2 md:px-4 md:py-2.5 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'text-emerald-700 md:bg-emerald-100'
        : 'text-gray-600 hover:text-emerald-700 md:hover:bg-gray-100'
    }`}
    title={label}
  >
    {icon}
    <span className="hidden md:inline md:ml-3">{label}</span>
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
        <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-emerald-700">
            <BellIcon />
            {notifications.length > 0 && (
                <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
            )}
        </button>
        {isNotificationsOpen && (
             <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-[60]">
                <div className="p-3 border-b">
                    <h4 className="text-sm font-semibold text-gray-800">การแจ้งเตือน ({notifications.length})</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                   {notifications.length > 0 ? (
                        <ul>
                            {notifications.map(n => (
                                 <li key={n.patientId}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleNotificationItemClick(n.patientId); }} className="block px-4 py-3 hover:bg-gray-50 text-sm">
                                        <p className="font-semibold text-gray-800">{n.patientName} <span className="font-normal text-gray-500">(HN: {n.hn})</span></p>
                                        <p className="text-gray-600">
                                            มีนัดเจาะ HIV VL วันที่ <span className="font-semibold">{formatThaiDateShort(n.dueDate)}</span>
                                        </p>
                                    </a>
                                </li>
                            ))}
                        </ul>
                   ) : (
                        <div className="p-4 text-center text-gray-500">
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
        <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
             <div className="flex items-center">
                <div className="bg-emerald-500 rounded-full h-8 w-8 flex items-center justify-center text-white font-bold text-lg">
                    ID
                </div>
                <h1 className="text-lg font-semibold text-gray-800 ml-3">ID Clinic</h1>
            </div>
            <div className="flex items-center space-x-1">
                 {renderNotificationBell()}
                 <button onClick={onLogout} className="p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600 rounded-full">
                    <LogoutIcon className="h-6 w-6" />
                 </button>
            </div>
        </header>

        {/* Desktop Header / Mobile Bottom Nav */}
        <header className="fixed bottom-0 md:top-0 left-0 w-full h-16 bg-white border-t md:border-t-0 md:border-b border-gray-200 flex items-center z-50">
            <div className="w-full flex items-center justify-between md:px-6">

                {/* Logo and Title - Desktop only */}
                <div className="hidden md:flex items-center">
                    <div className="bg-emerald-500 rounded-full h-8 w-8 flex items-center justify-center text-white font-bold text-lg">
                        ID
                    </div>
                    <h1 className="text-lg font-semibold text-gray-800 ml-3">ID Clinic</h1>
                </div>

                {/* Navigation Items - Mobile: takes full width; Desktop: centered */}
                <nav className="flex flex-row justify-around items-center w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 md:space-x-2">
                    <NavItem icon={<DashboardIcon />} label="Dashboard" active={isDashboardActive} onClick={() => onChangeView('dashboard')} />
                    <NavItem icon={<PatientsIcon />} label="Patients" active={isPatientSectionActive} onClick={() => onChangeView('list')} />
                    <NavItem icon={<ReportsIcon />} label="Reports" active={isReportsActive} onClick={() => onChangeView('reports')} />
                    <NavItem icon={<SettingsIcon />} label="Settings" active={isSettingsActive} onClick={() => onChangeView('settings')} />
                </nav>

                {/* User Info & Actions - Desktop only */}
                <div className="hidden md:flex items-center space-x-4">
                    {renderNotificationBell()}
                    <NavItem icon={<LogoutIcon />} label="Logout" onClick={onLogout} />
                </div>

            </div>
        </header>
    </>
  );
};
