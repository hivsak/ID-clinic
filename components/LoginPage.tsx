
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Decorative Elements with Animations */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-50 to-slate-100 z-0"></div>
      
      {/* Animated Blobs - Changed to Green Shades */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/50 relative z-10 transition-all duration-500 ease-in-out hover:shadow-emerald-500/10">
        <div className="text-center mb-8">
           <div className="mx-auto h-20 w-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-lg flex items-center justify-center transform hover:rotate-6 hover:scale-110 transition-all duration-300 ease-out">
                <span className="text-white text-3xl font-bold tracking-tight">ID</span>
           </div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-800 tracking-tight">
            ID Clinic Manager
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isRegistering ? 'สร้างบัญชีผู้ใช้งานใหม่' : 'ยินดีต้อนรับกลับสู่ระบบ'}
          </p>
        </div>
        
        {isRegistering ? (
            // --- REGISTER FORM ---
            <form className="space-y-5 animate-fade-in-up" onSubmit={handleRegisterSubmit}>
                <div className="space-y-4">
                    <div className="group">
                        <label htmlFor="regDisplayName" className="sr-only">Name</label>
                        <input
                            id="regDisplayName"
                            type="text"
                            required
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all group-hover:border-emerald-300"
                            placeholder="ชื่อ-นามสกุล (Display Name)"
                            value={regDisplayName}
                            onChange={(e) => setRegDisplayName(e.target.value)}
                        />
                    </div>
                    <div className="group">
                        <label htmlFor="regUsername" className="sr-only">Username</label>
                        <input
                            id="regUsername"
                            type="text"
                            required
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all group-hover:border-emerald-300"
                            placeholder="Username"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                        />
                    </div>
                    <div className="group">
                        <label htmlFor="regPassword" className="sr-only">Password</label>
                        <input
                            id="regPassword"
                            type="password"
                            required
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all group-hover:border-emerald-300"
                            placeholder="Password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                        />
                    </div>
                    <div className="group">
                        <label htmlFor="regConfirmPassword" className="sr-only">Confirm Password</label>
                        <input
                            id="regConfirmPassword"
                            type="password"
                            required
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all group-hover:border-emerald-300"
                            placeholder="Confirm Password"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
                        {error}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white shadow-lg shadow-emerald-500/30 ${isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transform hover:-translate-y-1 hover:shadow-emerald-500/50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300`}
                    >
                        {isLoading ? 'กำลังบันทึก...' : 'ลงทะเบียน'}
                    </button>
                </div>
                <div className="text-center mt-6">
                    <span className="text-sm text-slate-500">มีบัญชีอยู่แล้ว? </span>
                    <button type="button" onClick={toggleMode} className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors">
                        เข้าสู่ระบบ
                    </button>
                </div>
            </form>
        ) : (
            // --- LOGIN FORM ---
            <form className="space-y-6 animate-fade-in-up" onSubmit={handleLoginSubmit}>
                <div className="space-y-4">
                    <div className="group">
                        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1 ml-1 transition-colors group-hover:text-emerald-600">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all group-hover:border-emerald-300"
                            placeholder="ระบุชื่อผู้ใช้งาน"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="group">
                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1 ml-1 transition-colors group-hover:text-emerald-600">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all group-hover:border-emerald-300"
                            placeholder="ระบุรหัสผ่าน"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="text-emerald-700 text-sm text-center bg-emerald-50 p-3 rounded-xl border border-emerald-100 animate-fade-in-up">
                        {successMsg}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white shadow-lg shadow-emerald-500/30 ${isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transform hover:-translate-y-1 hover:shadow-emerald-500/50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300`}
                    >
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'เข้าสู่ระบบ'}
                    </button>
                </div>

                <div className="text-center mt-6 pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-500">ยังไม่มีบัญชี? </span>
                    <button type="button" onClick={toggleMode} className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors">
                        ลงทะเบียน
                    </button>
                </div>
            </form>
        )}
        
        <div className="text-center mt-8">
             <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">© 2025 ID CLINIC MANAGER by Karpark ▕ V 1.5.2</p>
        </div>
      </div>
    </div>
  );
};
