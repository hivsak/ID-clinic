
import React, { useState } from 'react';
import { register } from '../services/authService';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  // Login States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register States
  const [isRegistering, setIsRegistering] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');

  // Common States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      // Trim inputs to avoid accidental whitespace issues
      await onLogin(username.trim(), password.trim());
    } catch (err: any) {
      console.error("Login page caught error:", err);
      
      const msg = err.message || '';

      if (msg === 'INVALID_CREDENTIALS') {
          setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (หากยังไม่มีบัญชี โปรดลงทะเบียน)');
      } else if (msg === 'WAITING_FOR_APPROVAL') {
          setError('บัญชีของคุณรอการอนุมัติจากผู้ดูแลระบบ (Role: User)');
      } else if (msg === 'DB_NOT_CONFIGURED') {
          setError('ไม่พบการตั้งค่าฐานข้อมูล (Environment Variable Missing)');
      } else if (err.isTrusted || msg.includes('Network Error')) { 
          setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Network Error) กรุณาตรวจสอบอินเทอร์เน็ต');
      } else {
          const displayMsg = typeof err === 'string' ? err : msg;
          setError('เกิดข้อผิดพลาด: ' + displayMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
        setError('รหัสผ่านไม่ตรงกัน');
        return;
    }

    if (regPassword.length < 4) {
        setError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
        return;
    }

    setIsLoading(true);

    try {
        await register(regUsername.trim(), regPassword.trim(), regDisplayName.trim());
        setSuccessMsg('สมัครสมาชิกสำเร็จ! คุณสามารถเข้าสู่ระบบได้ทันที');
        setIsRegistering(false);
        // Auto-fill login form
        setUsername(regUsername.trim());
        setPassword(''); // Let user type password to confirm memory
        // Clear register form
        setRegUsername('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegDisplayName('');
    } catch (err: any) {
        const msg = err.message || '';
        if (msg === 'USERNAME_EXISTS') {
            setError('ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว');
        } else {
            setError('การสมัครสมาชิกย้มเหลว: ' + msg);
        }
    } finally {
        setIsLoading(false);
    }
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setError('');
      setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 font-sans relative">
        
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-200">
        <div className="text-center">
           <div className="mx-auto h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">ID</span>
           </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ID Clinic Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isRegistering ? 'สมัครสมาชิกเพื่อขอเข้าใช้งาน' : 'กรุณาเข้าสู่ระบบเพื่อใช้งาน'}
          </p>
        </div>
        
        {isRegistering ? (
            // --- REGISTER FORM ---
            <form className="mt-8 space-y-4" onSubmit={handleRegisterSubmit}>
                <div className="rounded-md shadow-sm space-y-3">
                    <div>
                        <label htmlFor="regDisplayName" className="sr-only">Name</label>
                        <input
                            id="regDisplayName"
                            type="text"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                            placeholder="ชื่อ-นามสกุล (Display Name)"
                            value={regDisplayName}
                            onChange={(e) => setRegDisplayName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="regUsername" className="sr-only">Username</label>
                        <input
                            id="regUsername"
                            type="text"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                            placeholder="Username (สำหรับเข้าสู่ระบบ)"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="regPassword" className="sr-only">Password</label>
                        <input
                            id="regPassword"
                            type="password"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                            placeholder="Password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="regConfirmPassword" className="sr-only">Confirm Password</label>
                        <input
                            id="regConfirmPassword"
                            type="password"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                            placeholder="ยืนยัน Password"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-md border border-red-200 break-words">
                        {error}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors`}
                    >
                        {isLoading ? 'กำลังบันทึก...' : 'สมัครสมาชิก'}
                    </button>
                </div>
                <div className="text-center mt-4">
                    <span className="text-sm text-gray-600">มีบัญชีอยู่แล้ว? </span>
                    <button type="button" onClick={toggleMode} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium hover:underline">
                        เข้าสู่ระบบ
                    </button>
                </div>
            </form>
        ) : (
            // --- LOGIN FORM ---
            <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
                <div className="rounded-md shadow-sm -space-y-px">
                    <div className="mb-4">
                        <label htmlFor="username" className="sr-only">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                            placeholder="ชื่อผู้ใช้งาน (username)"
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
                    <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-md border border-red-200 break-words">
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="text-emerald-700 text-sm text-center bg-emerald-50 p-2 rounded-md border border-emerald-200 break-words">
                        {successMsg}
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

                <div className="text-center mt-4">
                    <span className="text-sm text-gray-600">ยังไม่มีบัญชี? </span>
                    <button type="button" onClick={toggleMode} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium hover:underline">
                        ลงทะเบียน
                    </button>
                </div>
            </form>
        )}
        
        <div className="text-center mt-4">
             <p className="text-xs text-gray-400">© 2025 ID CLINIC MANAGER | Version 1.2.2</p>
        </div>
      </div>
    </div>
  );
};
