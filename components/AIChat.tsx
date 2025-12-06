
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
}

// Data minimization function to save tokens and privacy
const preparePatientDataForAI = (patients: Patient[]) => {
    return patients.map(p => ({
        id: p.id,
        // Demographic
        sex: p.sex,
        age: calculateAge(p.dob),
        status: calculatePatientStatus(p),
        risk: p.riskBehavior,
        // Clinical
        hivDiagnosis: p.medicalHistory.some(e => e.type === MedicalEventType.DIAGNOSIS),
        arv: p.medicalHistory.filter(e => e.type === MedicalEventType.ART_START || e.type === MedicalEventType.ART_CHANGE).map(e => e.details['สูตรยา'] || e.details['เป็น']),
        // Specific Infections / Diseases
        infections: p.medicalHistory
            .filter(e => e.type === MedicalEventType.OPPORTUNISTIC_INFECTION)
            .flatMap(e => {
                const list = e.details.infections || [];
                if (e.details.โรค) list.push(e.details.โรค);
                return list;
            }),
        tpt: p.medicalHistory.some(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT),
        stds: p.stdInfo?.records?.flatMap(r => r.diseases) || [],
        prep: (p.prepInfo?.records || []).length > 0,
        pep: (p.pepInfo?.records || []).length > 0,
        hbv: p.hbvInfo?.hbsAgTests?.some(t => t.result === 'Positive'),
        hcv: p.hcvInfo?.hcvTests?.some(t => t.result === 'Positive'),
        underlying: p.underlyingDiseases || []
    }));
};

export const AIChat: React.FC<AIChatProps> = ({ patients }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยวิเคราะห์ข้อมูลคลินิก มีอะไรให้ผมช่วยตรวจสอบไหมครับ?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // We use a ref for the chat session so it persists across renders but doesn't trigger re-renders
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // If patients data changes, we should invalidate the current chat session 
    // because the system instruction (data) is now stale.
    useEffect(() => {
        chatSessionRef.current = null;
    }, [patients]);

    const handleReset = () => {
        setMessages([
            { role: 'model', text: 'ระบบถูกรีเซ็ตแล้วครับ ผมพร้อมวิเคราะห์ข้อมูลใหม่ครับ' }
        ]);
        chatSessionRef.current = null; // Clear the session to force recreation with potentially new context
    };

    const getApiKey = () => {
        // 1. Try strict process.env first
        try {
            if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
                return process.env.API_KEY;
            }
        } catch (e) {}
    
        // 2. Try Vite standard (for Vercel/Frontend deployments)
        try {
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
                // @ts-ignore
                return import.meta.env.VITE_API_KEY;
            }
        } catch (e) {}
        
        return undefined;
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error("ไม่พบ API Key (กรุณาตั้งค่า VITE_API_KEY ใน Vercel Settings)");
            }

            // Initialize chat session if it doesn't exist
            if (!chatSessionRef.current) {
                const ai = new GoogleGenAI({ apiKey });
                
                const simplifiedData = preparePatientDataForAI(patients);
                const contextString = JSON.stringify(simplifiedData);

                const systemInstruction = `
                    You are a helpful and precise Medical Data Analyst for an ID Clinic (Infectious Diseases).
                    You have access to a JSON dataset of patients.
                    
                    Your Goal: Answer the user's questions strictly based on the provided dataset.
                    
                    Rules:
                    1. The dataset contains simplified patient records.
                    2. If the user asks for a count (e.g., "How many..."), calculate it precisely from the data.
                    3. If the user asks about relationships (e.g., "HIV patients with Syphilis"), filter the data accordingly.
                    4. Do NOT hallucinate data. If the answer isn't in the data, say so.
                    5. Answer in Thai (ภาษาไทย) by default, unless the user asks in English.
                    6. Be concise and professional.
                    7. Note on Data: 
                       - 'infections' array contains opportunistic infections like PJP, TB, etc.
                       - 'stds' array contains sexually transmitted diseases like Syphilis, Gonorrhea.
                       - 'hivDiagnosis' is boolean.
                    
                    Dataset:
                    ${contextString}
                `;

                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: systemInstruction,
                    }
                });
            }

            const response = await chatSessionRef.current.sendMessage({ message: userMessage });
            const text = response.text || 'ขออภัย ไม่สามารถประมวลผลได้ในขณะนี้';
            
            setMessages(prev => [...prev, { role: 'model', text }]);

        } catch (error: any) {
            console.error('AI Error:', error);
            
            let errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI';
            if (error.message) {
                 if (error.message.includes("API Key")) errorMsg = error.message;
                 else if (error.message.includes("401")) errorMsg = "API Key ไม่ถูกต้อง (401 Unauthorized)";
                 else if (error.message.includes("429")) errorMsg = "โควต้าการใช้งานเต็ม (429 Too Many Requests)";
                 else if (error.message.includes("fetch")) errorMsg = "ปัญหาการเชื่อมต่ออินเทอร์เน็ต";
            }

            setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
            // Invalidate session on error to be safe
            chatSessionRef.current = null;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
                    title="AI Data Analyst"
                >
                    <SparklesIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm md:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px] animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">AI Analyst</h3>
                                <p className="text-[10px] opacity-80">Powered by Gemini 2.5 Flash</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={handleReset} 
                                className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-white/90 hover:text-white"
                                title="Reset / Clear History"
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

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-emerald-600 text-white rounded-br-none' 
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="ถามข้อมูล... (เช่น คนไข้ HIV ที่มี Syphilis มีกี่คน)"
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
                </div>
            )}
        </>
    );
};
