
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { SparklesIcon, XIcon, RefreshIcon, SendIcon, SettingsIcon, TrashIcon } from './icons';
import { Patient, MedicalEventType } from '../types';
import { calculateAge, calculatePatientStatus } from './utils';

interface AIChatProps {
    patients: Patient[];
}

interface Message {
    role: 'user' | 'model';
    text: string;
    isError?: boolean;
}

// User requested to remove the limit.
const preparePatientDataForAI = (patients: Patient[]) => {
    // Send ALL patients
    const slicedPatients = [...patients].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
    });

    return slicedPatients.map(p => {
        const data: any = {
            s: p.sex === 'ชาย' ? 'M' : 'F',
            a: calculateAge(p.dob),
            st: calculatePatientStatus(p),
        };

        if (p.riskBehavior) {
            const r = p.riskBehavior;
            if (r.includes('MSM')) data.r = 'MSM';
            else if (r.includes('Hetero')) data.r = 'HET';
            else data.r = 'OTH';
        }

        const isHiv = p.medicalHistory.some(e => e.type === MedicalEventType.DIAGNOSIS);
        if (isHiv) data.hiv = 1;

        // Current ARV
        const arvEvents = p.medicalHistory
            .filter(e => e.type === MedicalEventType.ART_START || e.type === MedicalEventType.ART_CHANGE)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (arvEvents.length > 0) {
            const currentArv = arvEvents[0].details['สูตรยา'] || arvEvents[0].details['เป็น'];
            if (currentArv) data.arv = currentArv;
        }

        // OIs
        const infections = new Set<string>();
        p.medicalHistory
            .filter(e => e.type === MedicalEventType.OPPORTUNISTIC_INFECTION)
            .forEach(e => {
                const list = e.details.infections || [];
                if (e.details.โรค) list.push(e.details.โรค);
                list.forEach((i: string) => infections.add(i));
            });
        if (infections.size > 0) data.oi = Array.from(infections);

        const tpt = p.medicalHistory.some(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT);
        if (tpt) data.tpt = 1;

        // STDs
        const stds = new Set<string>();
        p.stdInfo?.records?.forEach(r => r.diseases.forEach(d => stds.add(d)));
        if (stds.size > 0) data.std = Array.from(stds);

        if ((p.prepInfo?.records || []).length > 0) data.prep = 1;
        if ((p.pepInfo?.records || []).length > 0) data.pep = 1;
        if (p.hbvInfo?.hbsAgTests?.some(t => t.result === 'Positive')) data.hbv = 1;
        if (p.hcvInfo?.hcvTests?.some(t => t.result === 'Positive')) data.hcv = 1;

        if (p.underlyingDiseases && p.underlyingDiseases.length > 0) {
            data.dx = p.underlyingDiseases;
        }

        return data;
    });
};

export const AIChat: React.FC<AIChatProps> = ({ patients }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'chat' | 'settings'>('chat');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยวิเคราะห์ข้อมูลคลินิก มีอะไรให้ผมช่วยตรวจสอบไหมครับ?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [retryStatus, setRetryStatus] = useState('');
    
    // Key Management
    const [customKey, setCustomKey] = useState('');
    const [tempCustomKey, setTempCustomKey] = useState(''); // For input field
    
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Hardcoded Key provided by user
    const HARDCODED_KEY = 'AIzaSyDiDK-iWaT3QU7ejIsOyH_26qXYZeiZ8hQ';

    // Initial Load
    useEffect(() => {
        const storedKey = localStorage.getItem('ID_CLINIC_AI_KEY');
        if (storedKey) {
            setCustomKey(storedKey);
            setTempCustomKey(storedKey);
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (view === 'chat') {
            scrollToBottom();
        }
    }, [messages, isOpen, retryStatus, view]);

    useEffect(() => {
        // Reset chat when patient list changes significantly or component remounts
        chatSessionRef.current = null;
    }, [patients]);

    const handleReset = () => {
        setMessages([
            { role: 'model', text: 'รีเซ็ตระบบแล้วครับ เริ่มต้นวิเคราะห์ใหม่ได้เลย' }
        ]);
        chatSessionRef.current = null;
        setRetryStatus('');
    };

    const getSystemApiKey = () => {
        // Priority 1: User's manual custom key from localStorage (ONLY if explicitly set)
        if (customKey && customKey.trim().length > 5) return customKey.trim();
        
        // Priority 2: Hardcoded Key (User Request)
        return HARDCODED_KEY;
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const processMessage = async (userMessage: string) => {
        setIsLoading(true);
        setRetryStatus('');
        
        let attempt = 0;
        const maxRetries = 2;
        let success = false;

        while (attempt < maxRetries && !success) {
            try {
                const apiKey = getSystemApiKey();
                
                // Safety check
                if (!apiKey || apiKey.includes('placeholder')) {
                    throw new Error("API Key is missing or invalid.");
                }

                if (!chatSessionRef.current) {
                    const ai = new GoogleGenAI({ apiKey });
                    const simplifiedData = preparePatientDataForAI(patients);
                    const contextString = JSON.stringify(simplifiedData);

                    const systemInstruction = `
                        Role: Medical Data Analyst for an ID Clinic.
                        Current Context: Analyzing ALL ${simplifiedData.length} patient records provided.
                        
                        Data Keys (Minified for token efficiency):
                        - s: Sex (M/F)
                        - a: Age
                        - st: Status (Active, LTFU, etc.)
                        - r: Risk
                        - hiv: 1=Positive
                        - arv: Regimen
                        - oi: Opportunistic Infections
                        - tpt: 1=Received TPT
                        - std: STDs
                        - prep: 1=PrEP History
                        - pep: 1=PEP History
                        - hbv: 1=HBV Positive
                        - hcv: 1=HCV Positive
                        - dx: Comorbidities
                        
                        Tasks:
                        1. Count and filter based on the JSON data provided.
                        2. If asking about a specific condition (e.g. Syphilis + PJP), filter the JSON strictly.
                        3. Reply in Thai. Be concise and professional.
                        
                        Dataset: ${contextString}
                    `;

                    chatSessionRef.current = ai.chats.create({
                        model: 'gemini-2.5-flash',
                        config: { systemInstruction }
                    });
                }

                const response = await chatSessionRef.current.sendMessage({ message: userMessage });
                const text = response.text || 'ไม่สามารถประมวลผลได้ (Empty Response)';
                
                setMessages(prev => [...prev, { role: 'model', text }]);
                success = true;

            } catch (error: any) {
                console.error(`AI Error (Attempt ${attempt + 1}):`, error);
                
                const errorMsgStr = error.message || JSON.stringify(error);
                const isRateLimit = errorMsgStr.includes('429') || errorMsgStr.includes('quota') || errorMsgStr.includes('Resource has been exhausted');
                
                if (isRateLimit && attempt < maxRetries - 1) {
                    const waitTime = 4000;
                    setRetryStatus(`ระบบกำลังยุ่ง (429/Quota)... กำลังลองใหม่ใน ${waitTime/1000} วินาที...`);
                    await delay(waitTime);
                    attempt++;
                } else {
                    let friendlyMsg = '';
                    
                    if (isRateLimit) {
                        friendlyMsg = `⚠️ **โควต้าเต็ม (429)**\nระบบ Google Free Tier รับข้อมูลจำนวนมากพร้อมกันไม่ไหว กรุณารอสักครู่แล้วกดลองใหม่`;
                    } else if (errorMsgStr.includes("403") || errorMsgStr.includes("permission")) {
                        friendlyMsg = `⚠️ **Access Denied (403)**\nAPI Key นี้อาจถูกจำกัดโดเมนไว้ (Referrer Restriction) ทำให้ใช้งานบนเว็บนี้ไม่ได้\n\nError: ${errorMsgStr}`;
                    } else if (errorMsgStr.includes("400") || errorMsgStr.includes("INVALID_ARGUMENT")) {
                        friendlyMsg = `⚠️ **Bad Request (400)**\nข้อมูลที่ส่งไปอาจมีรูปแบบผิดพลาด หรือ API Key ผิด\n\nError: ${errorMsgStr}`;
                    } else if (errorMsgStr.includes("fetch") || errorMsgStr.includes("Network") || errorMsgStr.includes("xhr error") || errorMsgStr.includes("Rpc failed")) {
                        friendlyMsg = `⚠️ **Network/Domain Blocked**\nการเชื่อมต่อถูกปฏิเสธ (xhr error) สาเหตุที่เป็นไปได้:\n1. API Key ถูกจำกัดโดเมน (Referrer) ไว้ไม่ให้ใช้บนเว็บนี้\n2. อินเทอร์เน็ตมีปัญหา\n\nError: ${errorMsgStr}`;
                    } else {
                        friendlyMsg = `⚠️ **Error**\n${errorMsgStr}`;
                    }

                    setMessages(prev => [...prev, { role: 'model', text: friendlyMsg, isError: true }]);
                    chatSessionRef.current = null; // Reset session
                    break;
                }
            }
        }
        
        setRetryStatus('');
        setIsLoading(false);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        
        await processMessage(userMessage);
    };

    const handleRetry = (index: number) => {
        const previousUserMsg = messages[index - 1];
        if (previousUserMsg && previousUserMsg.role === 'user') {
            setMessages(prev => prev.filter((_, i) => i !== index));
            processMessage(previousUserMsg.text);
        }
    };

    const handleSaveKey = () => {
        if (!tempCustomKey.trim()) {
            handleClearKey();
            return;
        }
        localStorage.setItem('ID_CLINIC_AI_KEY', tempCustomKey.trim());
        setCustomKey(tempCustomKey.trim());
        // Reset chat to force new connection with new key
        chatSessionRef.current = null;
        setView('chat');
        setMessages(prev => [...prev, { role: 'model', text: 'บันทึก Custom API Key แล้ว (ระบบจะใช้คีย์นี้แทนคีย์หลัก)' }]);
    };

    const handleClearKey = () => {
        localStorage.removeItem('ID_CLINIC_AI_KEY');
        setCustomKey('');
        setTempCustomKey('');
        chatSessionRef.current = null;
        setMessages(prev => [...prev, { role: 'model', text: 'ลบ Custom Key แล้ว ระบบกลับมาใช้ Default API Key (AIza...)' }]);
    };

    const currentKey = getSystemApiKey();
    const maskedKey = currentKey.length > 8 ? `${currentKey.substring(0, 4)}...${currentKey.substring(currentKey.length - 4)}` : '****';
    const usingKeyType = customKey && customKey.length > 5 ? 'Custom (LocalStorage)' : 'Default (Hardcoded)';

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
                    title="AI Data Analyst"
                >
                    <SparklesIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-400"></span>
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm md:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px] animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex justify-between items-center text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    AI Analyst
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isLoading ? 'bg-amber-400/80 text-amber-900 animate-pulse' : 'bg-green-500/20 text-green-100'}`}>
                                        {isLoading ? 'THINKING' : 'READY'}
                                    </span>
                                </h3>
                                <p className="text-[10px] opacity-80">
                                    Gemini 2.5 Flash
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {view === 'chat' ? (
                                <>
                                    <button 
                                        onClick={handleReset} 
                                        className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-white/90 hover:text-white"
                                        title="Reset Context"
                                    >
                                        <RefreshIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setView('settings')} 
                                        className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-white/90 hover:text-white"
                                        title="Settings"
                                    >
                                        <SettingsIcon className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => setView('chat')} 
                                    className="hover:bg-white/20 px-2 py-1 rounded-full transition-colors text-white/90 hover:text-white text-xs font-medium"
                                >
                                    Back
                                </button>
                            )}
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-white/90 hover:text-white"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    {view === 'settings' ? (
                        <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
                            <h4 className="font-bold text-slate-800 mb-4">ตั้งค่าการเชื่อมต่อ AI</h4>
                            
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">สถานะปัจจุบัน</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Source:</span>
                                        <span className="font-medium text-emerald-700">{usingKeyType}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Key:</span>
                                        <span className="font-mono bg-slate-100 px-2 rounded text-slate-700">{maskedKey}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Custom API Key</p>
                                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                                    หากคีย์หลักใช้งานไม่ได้ (เช่น ติด Referrer Restriction) ให้ใส่คีย์ใหม่ที่นี่ 
                                    <br/><span className="text-red-500">*กดปุ่มถังขยะเพื่อล้างค่าและกลับไปใช้คีย์หลัก</span>
                                </p>
                                <input 
                                    type="password"
                                    value={tempCustomKey}
                                    onChange={(e) => setTempCustomKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleSaveKey}
                                        className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                        บันทึก
                                    </button>
                                    <button 
                                        onClick={handleClearKey}
                                        className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-sm flex items-center justify-center"
                                        title="Reset to Default"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Chat View
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm flex flex-col ${
                                            msg.role === 'user' 
                                            ? 'bg-emerald-600 text-white rounded-br-none' 
                                            : msg.isError 
                                                ? 'bg-red-50 text-red-600 border border-red-200 rounded-bl-none'
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                        }`}>
                                            {/* Render Error messages with line breaks nicely */}
                                            <span className="whitespace-pre-wrap">{msg.text}</span>
                                            {msg.isError && (
                                                <div className="flex gap-2 mt-2 pt-2 border-t border-red-200/50">
                                                    <button 
                                                        onClick={() => handleRetry(idx)}
                                                        className="self-start px-3 py-1 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 shadow-sm"
                                                    >
                                                        <RefreshIcon className="w-3 h-3" />
                                                        ลองใหม่
                                                    </button>
                                                    <button 
                                                        onClick={() => setView('settings')}
                                                        className="self-start px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                                    >
                                                        ตรวจสอบ Key
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start w-full">
                                        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-3">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></span>
                                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
                                            </div>
                                            {retryStatus && (
                                                <span className="text-xs text-amber-600 font-medium animate-pulse">{retryStatus}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100">
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="ถามข้อมูลผู้ป่วย..."
                                        className="w-full pl-4 pr-12 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-0 rounded-xl text-sm transition-all"
                                        disabled={isLoading}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!input.trim() || isLoading}
                                        className="absolute right-2 p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors"
                                    >
                                        <SendIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            )}
        </>
    );
};
