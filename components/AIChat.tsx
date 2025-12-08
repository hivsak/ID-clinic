
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { SparklesIcon, XIcon, RefreshIcon, SendIcon, SettingsIcon, TrashIcon, ActivityIcon } from './icons';
import { Patient, MedicalEventType } from '../types';
import { calculateAge, calculatePatientStatus } from './utils';

interface AIChatProps {
    patients: Patient[];
}

interface Message {
    role: 'user' | 'model';
    text: string;
    isError?: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
}

// --- Tool Definition ---
const filterPatientsTool: FunctionDeclaration = {
    name: "filter_patients",
    description: "Search and count patients based on medical criteria. Use this tool whenever the user asks about patient statistics, counts, or lists with specific conditions.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            has_hiv: { type: Type.BOOLEAN, description: "Filter for patients with HIV diagnosis" },
            has_hbv: { type: Type.BOOLEAN, description: "Filter for patients with Hepatitis B (Positive HBsAg)" },
            has_hcv: { type: Type.BOOLEAN, description: "Filter for patients with Hepatitis C (Positive Anti-HCV)" },
            has_syphilis: { type: Type.BOOLEAN, description: "Filter for patients with history of Syphilis" },
            has_tpt: { type: Type.BOOLEAN, description: "Filter for patients who received TPT" },
            has_prep: { type: Type.BOOLEAN, description: "Filter for patients with PrEP history" },
            has_pep: { type: Type.BOOLEAN, description: "Filter for patients with PEP history" },
            infection_keyword: { type: Type.STRING, description: "Filter by specific opportunistic infection name (e.g., 'PJP', 'TB', 'CMV', 'Tuberculosis')" },
            sex: { type: Type.STRING, description: "Filter by gender ('male' or 'female')" },
            status: { type: Type.STRING, description: "Filter by status (Active, LTFU, Transferred, Expired, Restart)" },
            min_age: { type: Type.INTEGER, description: "Minimum age" },
            max_age: { type: Type.INTEGER, description: "Maximum age" }
        }
    }
};

const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Standard)' },
    { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite (Saver)' },
    { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
];

export const AIChat: React.FC<AIChatProps> = ({ patients }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'chat' | 'settings'>('chat');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยวิเคราะห์ข้อมูล ผมเชื่อมต่อกับฐานข้อมูลเรียบร้อยแล้ว คุณสามารถถามสถิติหรือค้นหาข้อมูลคนไข้ได้เลยครับ (เช่น "มีคนไข้ HIV ที่เป็น Syphilis กี่ราย")' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Key Management
    const [customKey, setCustomKey] = useState('');
    const [tempCustomKey, setTempCustomKey] = useState(''); 
    
    // Model Management
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);

    // Diagnostics State
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [connectionError, setConnectionError] = useState('');
    
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Hardcoded Key - Warning: This key is likely exhausted/rate-limited by now
    const HARDCODED_KEY = 'AIzaSyDiDK-iWaT3QU7ejIsOyH_26qXYZeiZ8hQ';

    useEffect(() => {
        const storedKey = localStorage.getItem('ID_CLINIC_AI_KEY');
        if (storedKey) {
            setCustomKey(storedKey);
            setTempCustomKey(storedKey);
        }
        
        const storedModel = localStorage.getItem('ID_CLINIC_AI_MODEL');
        if (storedModel && AVAILABLE_MODELS.some(m => m.id === storedModel)) {
            setSelectedModel(storedModel);
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (view === 'chat') {
            scrollToBottom();
        }
    }, [messages, isOpen, view]);

    // Reset chat when configuration changes
    useEffect(() => {
        chatSessionRef.current = null;
    }, [customKey, selectedModel]);

    const handleReset = () => {
        setMessages([
            { role: 'model', text: 'รีเซ็ตระบบแล้วครับ เริ่มต้นวิเคราะห์ใหม่ได้เลย' }
        ]);
        chatSessionRef.current = null;
    };

    const getSystemApiKey = () => {
        if (customKey && customKey.trim().length > 5) return customKey.trim();
        return HARDCODED_KEY;
    };

    // --- TOOL EXECUTION LOGIC ---
    const executeFilterPatients = (args: any) => {
        console.log("Executing Tool with args:", args);
        
        const results = patients.filter(p => {
            // 1. HIV
            if (args.has_hiv !== undefined) {
                const isHiv = p.medicalHistory.some(e => e.type === MedicalEventType.DIAGNOSIS);
                if (isHiv !== args.has_hiv) return false;
            }

            // 2. HBV
            if (args.has_hbv !== undefined) {
                const isHbv = p.hbvInfo?.hbsAgTests?.some(t => t.result === 'Positive');
                if (!!isHbv !== args.has_hbv) return false;
            }

            // 3. HCV
            if (args.has_hcv !== undefined) {
                // Simplified HCV logic for filter
                const isHcv = p.hcvInfo?.hcvTests?.some(t => t.result === 'Positive');
                if (!!isHcv !== args.has_hcv) return false;
            }

            // 4. Syphilis
            if (args.has_syphilis !== undefined) {
                const hasSyphilis = p.stdInfo?.records?.some(r => 
                    r.diseases.some(d => d.toLowerCase().includes('syphilis'))
                );
                if (!!hasSyphilis !== args.has_syphilis) return false;
            }

            // 5. TPT
            if (args.has_tpt !== undefined) {
                const hasTpt = p.medicalHistory.some(e => e.type === MedicalEventType.PROPHYLAXIS && e.details.TPT);
                if (!!hasTpt !== args.has_tpt) return false;
            }

            // 6. PrEP/PEP
            if (args.has_prep !== undefined) {
                const has = (p.prepInfo?.records || []).length > 0;
                if (!!has !== args.has_prep) return false;
            }
            if (args.has_pep !== undefined) {
                const has = (p.pepInfo?.records || []).length > 0;
                if (!!has !== args.has_pep) return false;
            }

            // 7. Sex
            if (args.sex) {
                const targetSex = args.sex.toLowerCase() === 'male' ? 'ชาย' : 'หญิง';
                if (p.sex !== targetSex) return false;
            }

            // 8. Status
            if (args.status) {
                const currentStatus = calculatePatientStatus(p);
                // Simple partial match
                if (!currentStatus || !currentStatus.toLowerCase().includes(args.status.toLowerCase())) return false;
            }

            // 9. Age
            if (args.min_age !== undefined || args.max_age !== undefined) {
                const age = calculateAge(p.dob);
                if (age === '-') return false; // Skip if no age
                if (args.min_age !== undefined && (age as number) < args.min_age) return false;
                if (args.max_age !== undefined && (age as number) > args.max_age) return false;
            }

            // 10. Specific Infection (OI)
            if (args.infection_keyword) {
                const keyword = args.infection_keyword.toLowerCase();
                const hasInfection = p.medicalHistory.some(e => {
                    if (e.type !== MedicalEventType.OPPORTUNISTIC_INFECTION) return false;
                    const details = e.details || {};
                    // Check list
                    if (details.infections && Array.isArray(details.infections)) {
                        if (details.infections.some((i: string) => i.toLowerCase().includes(keyword))) return true;
                    }
                    // Check legacy string fields
                    if (details.โรค && String(details.โรค).toLowerCase().includes(keyword)) return true;
                    if (details['การติดเชื้ออื่นๆ'] && String(details['การติดเชื้ออื่นๆ']).toLowerCase().includes(keyword)) return true;
                    
                    return false;
                });
                if (!hasInfection) return false;
            }

            return true;
        });

        return {
            count: results.length,
            patients: results.map(p => ({
                hn: p.hn,
                name: `${p.firstName} ${p.lastName}`,
                status: calculatePatientStatus(p),
                sex: p.sex,
                age: calculateAge(p.dob)
            })),
            summary: `Found ${results.length} patients matching criteria.`
        };
    };

    const processMessage = async (userMessage: string) => {
        setIsLoading(true);
        
        try {
            const apiKey = getSystemApiKey();
            
            if (!apiKey || apiKey.includes('placeholder')) {
                throw new Error("API Key is missing.");
            }

            if (!chatSessionRef.current) {
                const ai = new GoogleGenAI({ apiKey });
                
                chatSessionRef.current = ai.chats.create({
                    model: selectedModel,
                    config: {
                        systemInstruction: `You are a helpful medical data analyst assistant for ID Clinic. 
                        You have access to a database of patients via the 'filter_patients' tool.
                        ALWAYS use the tool to query data when asked about statistics, counts, or patient lists.
                        Do not guess numbers. 
                        Reply in Thai language.
                        If the result list is long, summarize the count and show only the first 5-10 names as examples.`,
                        tools: [{ functionDeclarations: [filterPatientsTool] }]
                    }
                });
            }

            // 1. Send User Message
            let response = await chatSessionRef.current.sendMessage({ message: userMessage });
            
            // 2. Check for Function Calls (Loop until no more function calls)
            if (response.functionCalls && response.functionCalls.length > 0) {
                const functionCall = response.functionCalls[0];
                const { name, args, id } = functionCall; 

                if (name === 'filter_patients') {
                    // Execute Tool locally
                    const toolResult = executeFilterPatients(args);
                    
                    // Send Result back to AI
                    response = await chatSessionRef.current.sendMessage({
                        message: [{
                            functionResponse: {
                                name: name,
                                id: id, 
                                response: { result: toolResult }
                            }
                        }]
                    });
                }
            }

            const text = response.text || 'รับทราบครับ (No text response)';
            setMessages(prev => [...prev, { role: 'model', text }]);

        } catch (error: any) {
            console.error(`AI Error:`, error);
            let friendlyMsg = '';
            const errorMsgStr = error.message || JSON.stringify(error);
            let action = undefined;

            if (errorMsgStr.includes('429') || errorMsgStr.includes('RESOURCE_EXHAUSTED')) {
                friendlyMsg = `⚠️ **โควต้าเต็ม (Quota Limit Reached)**\nAPI Key นี้ใช้งานเกินขีดจำกัดแล้ว\n\nคำแนะนำ:\n1. ลองเปลี่ยน Model เป็นรุ่น Lite\n2. สร้าง API Key ใหม่จาก Google AI Studio (ใช้อีเมลอื่น)`;
                action = {
                    label: 'ไปที่ตั้งค่าเพื่อเปลี่ยน Key/Model',
                    onClick: () => setView('settings')
                };
            } else if (errorMsgStr.includes("403") || errorMsgStr.includes("xhr error")) {
                friendlyMsg = `⚠️ **Access Denied (403)**\nAPI Key อาจถูกจำกัดโดเมน (Vercel URL blocked) หรือ Key ไม่ถูกต้อง`;
                action = {
                    label: 'ตรวจสอบการตั้งค่า',
                    onClick: () => setView('settings')
                };
            } else {
                friendlyMsg = `⚠️ **Error**\n${errorMsgStr}`;
            }

            setMessages(prev => [...prev, { role: 'model', text: friendlyMsg, isError: true, action }]);
            chatSessionRef.current = null; // Force reset connection
        } finally {
            setIsLoading(false);
        }
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

    const handleSaveSettings = () => {
        localStorage.setItem('ID_CLINIC_AI_MODEL', selectedModel);
        
        if (tempCustomKey.trim()) {
            localStorage.setItem('ID_CLINIC_AI_KEY', tempCustomKey.trim());
            setCustomKey(tempCustomKey.trim());
        } else if (tempCustomKey === '' && customKey !== '') {
             // User cleared the key field manually, assume they want to clear it?
             // Or if they left it empty, maybe keep existing? 
             // Let's rely on explicit clear button for full removal.
        }
        
        chatSessionRef.current = null;
        setView('chat');
        setMessages(prev => [...prev, { role: 'model', text: `บันทึกการตั้งค่าแล้ว (Model: ${selectedModel})` }]);
    };

    const handleClearKey = () => {
        localStorage.removeItem('ID_CLINIC_AI_KEY');
        setCustomKey('');
        setTempCustomKey('');
        chatSessionRef.current = null;
    };

    const handleTestConnection = async () => {
        setConnectionStatus('testing');
        setConnectionError('');
        try {
            const apiKey = getSystemApiKey();
            const ai = new GoogleGenAI({ apiKey });
            // Simple generation call to test connection
            await ai.models.generateContent({
                model: selectedModel,
                contents: 'test connection',
            });
            setConnectionStatus('success');
        } catch (error: any) {
            console.error("Connection Test Error:", error);
            setConnectionStatus('error');
            setConnectionError(error.message || JSON.stringify(error));
        }
    };

    const currentKey = getSystemApiKey();
    const maskedKey = currentKey.length > 8 ? `${currentKey.substring(0, 4)}...${currentKey.substring(currentKey.length - 4)}` : '****';

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
                <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm md:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[550px] animate-fade-in-up">
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
                                    {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.label.split('(')[0] || 'Gemini'}
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
                            <h4 className="font-bold text-slate-800 mb-4">ตั้งค่า AI (Settings)</h4>
                            
                            {/* Model Selection */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">เลือกโมเดล (Model)</p>
                                <select 
                                    value={selectedModel} 
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    {AVAILABLE_MODELS.map(m => (
                                        <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-2">
                                    * หากพบปัญหา Quota เต็ม ให้ลองเปลี่ยนเป็นรุ่น <strong>Lite</strong>
                                </p>
                            </div>

                            {/* API Key */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">จัดการ API Key</p>
                                <div className="flex justify-between items-center text-sm mb-2 p-2 bg-slate-50 rounded">
                                    <span className="text-slate-600">สถานะ:</span>
                                    <span className={`font-mono text-xs ${customKey ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                                        {customKey ? 'Custom Key' : 'Default Key'}
                                    </span>
                                </div>
                                <input 
                                    type="password"
                                    value={tempCustomKey}
                                    onChange={(e) => setTempCustomKey(e.target.value)}
                                    placeholder="วาง API Key ใหม่ที่นี่ (AIza...)"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <div className="flex gap-2">
                                    {customKey && (
                                        <button 
                                            onClick={handleClearKey}
                                            className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-sm text-sm"
                                        >
                                            <TrashIcon className="w-4 h-4 inline mr-1" /> ลบ
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Diagnostics Section */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">ตรวจสอบการเชื่อมต่อ</p>
                                
                                <button 
                                    onClick={handleTestConnection}
                                    disabled={connectionStatus === 'testing'}
                                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${
                                        connectionStatus === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
                                        connectionStatus === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
                                        'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                    }`}
                                >
                                    {connectionStatus === 'testing' && <span className="animate-spin h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full"></span>}
                                    {connectionStatus === 'idle' && 'ทดสอบยิง API'}
                                    {connectionStatus === 'testing' && 'กำลังทดสอบ...'}
                                    {connectionStatus === 'success' && 'เชื่อมต่อสำเร็จ!'}
                                    {connectionStatus === 'error' && 'เชื่อมต่อล้มเหลว'}
                                </button>

                                {connectionStatus === 'error' && (
                                    <div className="mt-2 p-2 bg-red-50 rounded text-[10px] text-red-600 font-mono break-words border border-red-100">
                                        {connectionError}
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleSaveSettings}
                                className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md transform active:scale-95"
                            >
                                บันทึกและกลับไปแชท
                            </button>
                        </div>
                    ) : (
                        // Chat View
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm flex flex-col ${
                                            msg.role === 'user' 
                                            ? 'bg-emerald-600 text-white rounded-br-none' 
                                            : msg.isError 
                                                ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-none'
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                        }`}>
                                            <span className="whitespace-pre-wrap">{msg.text}</span>
                                            
                                            {/* Action Button for Errors */}
                                            {msg.action && (
                                                <button
                                                    onClick={msg.action.onClick}
                                                    className="mt-3 py-2 px-3 bg-white border border-red-300 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors shadow-sm self-start"
                                                >
                                                    👉 {msg.action.label}
                                                </button>
                                            )}

                                            {/* Standard Retry Logic for Errors (if no specific action) */}
                                            {msg.isError && !msg.action && (
                                                <div className="flex gap-2 mt-2 pt-2 border-t border-red-200/50">
                                                    <button 
                                                        onClick={() => handleRetry(idx)}
                                                        className="self-start px-3 py-1 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 shadow-sm"
                                                    >
                                                        <RefreshIcon className="w-3 h-3" />
                                                        ลองใหม่
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
                                            <span className="text-xs text-gray-400">กำลังค้นหาข้อมูล...</span>
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
                                        placeholder="ถามข้อมูล เช่น 'คนไข้ HIV ชาย มีกี่คน'"
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
