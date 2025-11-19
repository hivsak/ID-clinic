
import React, { useState, useEffect } from 'react';
import { SettingsIcon } from './icons';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dbUrl, setDbUrl] = useState('');

  useEffect(() => {
      const storedUrl = localStorage.getItem('ID_CLINIC_DB_URL');
      if (storedUrl) setDbUrl(storedUrl);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onLogin(username, password);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'INVALID_CREDENTIALS') {
          setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.isTrusted) { // Network error
          setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Network Error) กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือตั้งค่า Database URL ใหม่');
      } else {
          setError('เกิดข้อผิดพลาด: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = () => {
      if (dbUrl.trim()) {
          localStorage.setItem('ID_CLINIC_DB_URL', dbUrl.trim());
          alert('บันทึกการตั้งค่าเรียบร้อย ระบบจะรีโหลดหน้าจอ');
          window.location.reload();
      } else {
          localStorage.removeItem('ID_CLINIC_DB_URL');
          alert('ล้างค่า Database URL เรียบร้อย ระบบจะรีโหลดหน้าจอ');
          window.location.reload();
      }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 font-sans relative">
        
      <button 
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
        title="ตั้งค่าการเชื่อมต่อ"
      >
        <SettingsIcon className="h-6 w-6" />
      </button>

      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-200">
        <div className="text-center">
           <div className="mx-auto h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">ID</span>
           </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ID Clinic Management
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            กรุณาเข้าสู่ระบบเพื่อใช้งาน
          </p>
        </div>
        
        {showSettings ? (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-fade-in">
                <h3 className="text-sm font-bold text-gray-700 mb-2">ตั้งค่าการเชื่อมต่อฐานข้อมูล (Manual)</h3>
                <p className="text-xs text-gray-500 mb-3">
                    หากระบบไม่พบ Environment Variable คุณสามารถระบุ Connection String ได้ที่นี่ (postgres://...)
                </p>
                <input 
                    type="text" 
                    value={dbUrl} 
                    onChange={e => setDbUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs mb-3"
                    placeholder="postgres://user:pass@host/dbname?sslmode=require"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowSettings(false)} className="px-3 py-1 text-xs text-gray-600 bg-white border rounded hover:bg-gray-50">ปิด</button>
                    <button onClick={handleSaveSettings} className="px-3 py-1 text-xs text-white bg-emerald-600 rounded hover:bg-emerald-700">บันทึก & รีโหลด</button>
                </div>
            </div>
        ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
                <div className="mb-4">
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                    placeholder="ชื่อผู้ใช้งาน (admin)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                </div>
                <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                    placeholder="รหัสผ่าน (password)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                </div>
            </div>

            {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-md border border-red-200">
                {error}
                </div>
            )}

            <div>
                <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors`}
                >
                {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : 'เข้าสู่ระบบ'}
                </button>
            </div>
            </form>
        )}
        
        <div className="text-center mt-4">
             <p className="text-xs text-gray-400">Version 1.1.0 | ID Clinic</p>
        </div>
      </div>
    </div>
  );
};
