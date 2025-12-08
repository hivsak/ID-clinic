
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { SparklesIcon, XIcon, RefreshIcon, SendIcon } from './icons';
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

// Optimization: Limit the number of records sent to AI to prevent Token Limit (429) errors on Free Tier.
const MAX_PATIENTS_CONTEXT = 100;

const preparePatientDataForAI = (patients: Patient[]) => {
    // Sort by updated date (newest first) and take the top N
    const slicedPatients = [...patients]
        .sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, MAX_PATIENTS_CONTEXT);

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
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยวิเคราะห์ข้อมูลคลินิก มีอะไรให้ผมช่วยตรวจสอบไหมครับ?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [retryStatus, setRetryStatus] = useState('');
    const [apiKeyDetected, setApiKeyDetected] = useState<boolean>(false);
    
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Check for API Key presence
    useEffect(() => {
        const key = getApiKey();
        setApiKeyDetected(!!key && key.length > 10);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, retryStatus]);

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

    const getApiKey = () => {
        try {
            if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
                return process.env.API_KEY;
            }
        } catch (e) {}
        try {
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
                // @ts-ignore
                return import.meta.env.VITE_API_KEY;
            }
        } catch (e) {}
        return undefined;
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const processMessage = async (userMessage: string) => {
        setIsLoading(true);
        setRetryStatus('');
        
        let attempt = 0;
        const maxRetries = 2; // Reduced retries to fail faster and show error
        let success = false;

        while (attempt < maxRetries && !success) {
            try {
                const apiKey = getApiKey();
                if (!apiKey) {
                    throw new Error("API Key Missing. Please check your Vercel/Environment settings (VITE_API_KEY).");
                }

                if (!chatSessionRef.current) {
                    const ai = new GoogleGenAI({ apiKey });
                    const simplifiedData = preparePatientDataForAI(patients);
                    const contextString = JSON.stringify(simplifiedData);

                    const systemInstruction = `
                        Role: Medical Data Analyst for an ID Clinic.
                        Current Context: Analyzing the latest ${simplifiedData.length} active patient records (limited for performance).
                        
                        Data Keys:
                        - s: Sex (M/F)
                        - a: Age
                        - st: Status
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
                        1. Count based on the data provided.
                        2. If asking about a specific condition, filter strictly.
                        3. Reply in Thai. concise and professional.
                        
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
                    let friendlyMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
                    if (isRateLimit) {
                        friendlyMsg = `⚠️ โควต้าเต็ม (429) หรือข้อมูลเยอะเกินไป\nระบบได้จำกัดข้อมูลเหลือ ${MAX_PATIENTS_CONTEXT} คนล่าสุดแล้ว แต่ยังไม่ผ่าน กรุณารอ 1 นาที`;
                    } else if (errorMsgStr.includes("401") || errorMsgStr.includes("API key not valid")) {
                        friendlyMsg = "⚠️ API Key ไม่ถูกต้อง หรือยังไม่ได้ตั้งค่าใน Vercel";
                    } else if (errorMsgStr.includes("fetch") || errorMsgStr.includes("Network")) {
                        friendlyMsg = "⚠️ ปัญหาการเชื่อมต่ออินเทอร์เน็ต (Network Error)";
                    } else {
                        friendlyMsg = `⚠️ Error: ${errorMsgStr.substring(0, 100)}...`;
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

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
                    title="AI Data Analyst"
                >
                    <SparklesIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    {/* Status Indicator Dot on Button */}
                    <span className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${apiKeyDetected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`}></span>
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm md:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px] animate-fade-in-up">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    AI Analyst
                                    {/* Connection Status Label */}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${apiKeyDetected ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                                        {apiKeyDetected ? 'ONLINE' : 'NO KEY'}
                                    </span>
                                </h3>
                                <p className="text-[10px] opacity-80">
                                    Analyzing top {Math.min(patients.length, MAX_PATIENTS_CONTEXT)} records
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={handleReset} 
                                className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-white/90 hover:text-white"
                                title="Reset Context"
                            >
                                <RefreshIcon className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-white/90 hover:text-white"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

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
                                    <span className="whitespace-pre-wrap">{msg.text}</span>
                                    {msg.isError && (
                                        <button 
                                            onClick={() => handleRetry(idx)}
                                            className="mt-2 self-start px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                                        >
                                            <RefreshIcon className="w-3 h-3" />
                                            ลองใหม่
                                        </button>
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
                                placeholder={apiKeyDetected ? "ถามข้อมูล..." : "กรุณาใส่ API KEY ก่อน..."}
                                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-0 rounded-xl text-sm transition-all"
                                disabled={isLoading || !apiKeyDetected}
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isLoading || !apiKeyDetected}
                                className="absolute right-2 p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors"
                            >
                                <SendIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};
