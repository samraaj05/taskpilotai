import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Text to Speech
    const speak = (text) => {
        if (isMuted) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    };

    // Speech to Text
    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error("Speech error", event.error);
            setIsListening(false);
            toast.error("Speech recognition error: " + event.error);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            // Auto send if confident? For now just populate
        };

        recognition.start();
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const query = input.trim();
        if (!query) return;

        // Check for real-time date/time queries
        const timeQueries = ["date", "time", "today", "current time", "what is the date", "what is the time"];
        if (timeQueries.some(q => query.toLowerCase().includes(q))) {
            const now = new Date().toLocaleString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
            const userMsg = { text: query, sender: 'user' };
            const aiMsg = { text: `Today is **${now}**.`, sender: 'ai' };
            setMessages(prev => [...prev, userMsg, aiMsg]);
            setInput('');
            speak(`Today is ${now}`);
            return;
        }

        const userMessage = { text: query, sender: 'user' };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Pass history for context awareness
            const response = await api.post(`/api/ai/chat`, { 
                message: query,
                history: messages.slice(-6) // Send last 6 messages for context
            });
            const data = response.data?.data || response.data;
            const reply = data.reply || 'No response';

            const aiMessage = { text: reply, sender: 'ai' };
            setMessages((prev) => [...prev, aiMessage]);
            speak(reply.replace(/[*#`]/g, '')); // Strip markdown for TTS
        } catch (err) {
            console.error('Chat error:', err);
            toast.error('Error communicating with AI');
            const errorMessage = { text: 'Error: Could not get response', sender: 'ai', isError: true };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[500px] w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 font-bold flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>TaskPilot AI Assistant</span>
                </div>
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 opacity-60">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full">
                            <Send size={32} className="text-blue-500" />
                        </div>
                        <p className="font-medium">How can I help you today?</p>
                        <p className="text-xs text-center px-8">Ask about your projects, create tasks, or just say hello!</p>
                    </div>
                )}
                
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${
                            msg.sender === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : msg.isError 
                                    ? 'bg-red-50 text-red-700 border border-red-100 rounded-bl-none' 
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-none'
                        }`}>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-pink-600 dark:text-pink-400" {...props} />,
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-center">
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2.5 rounded-xl transition-all duration-300 ${
                        isListening 
                            ? 'bg-red-100 text-red-600 animate-pulse' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600'
                    }`}
                    title={isListening ? "Stop listening" : "Start voice input"}
                >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Type your message..."}
                    className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 border-none rounded-xl focus:ring-2 focus:ring-blue-500/50 dark:text-white dark:placeholder:text-slate-500 transition-all outline-none"
                    disabled={isLoading}
                />
                
                <button
                    type="submit"
                    className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center min-w-[44px]"
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
            </form>
        </div>
    );
};

export default Chatbot;
