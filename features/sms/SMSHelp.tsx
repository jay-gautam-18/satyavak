import React, { useState, useEffect, useRef } from 'react';
import { getChatbotResponse } from '../../services/geminiService';
import { Spinner } from '../../components/Spinner';
import { BotIcon, ChevronRightIcon, CloudIcon, ServerIcon, UserIcon } from '../../components/Icons';

interface SMSMessage {
    sender: 'user' | 'bot';
    text: string;
}

const HowItWorks: React.FC = () => {
    const steps = [
        {
            icon: <UserIcon className="w-10 h-10 text-brand-secondary" />,
            title: "1. You Send SMS",
            bgClass: 'bg-brand-secondary/10'
        },
        {
            icon: <CloudIcon className="w-10 h-10 text-red-500" />,
            title: "2. Twilio Receives",
            bgClass: 'bg-red-500/10'
        },
        {
            icon: <ServerIcon className="w-10 h-10 text-slate-700 dark:text-slate-300" />,
            title: "3. Our Server Processes",
            bgClass: 'bg-slate-500/10 dark:bg-slate-700/20'
        },
        {
            icon: <BotIcon className="w-10 h-10 text-brand-accent" />,
            title: "4. Gemini AI Answers",
            bgClass: 'bg-brand-accent/10'
        }
    ];


    return (
        <div className="bg-white dark:bg-brand-medium p-8 rounded-xl shadow-card">
            <h3 className="text-2xl font-bold text-brand-dark dark:text-white mb-3">How It Works in the Real World</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
                To make this service available to anyone with a basic phone, we would use a cloud communications platform like Twilio to bridge the gap between SMS and our AI. The flow would look like this:
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-6 sm:space-y-0 sm:space-x-4">
                {steps.map((step, index) => (
                    <React.Fragment key={step.title}>
                        <div className="flex flex-col items-center text-center w-36">
                            <div className={`p-4 rounded-full ${step.bgClass} mb-3 flex-shrink-0`}>
                                {step.icon}
                            </div>
                            <h4 className="font-semibold text-brand-dark dark:text-white text-sm sm:text-base">{step.title}</h4>
                        </div>
                        {index < steps.length - 1 && (
                            <ChevronRightIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 sm:block hidden" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <p className="text-slate-600 dark:text-slate-400 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                The process then reverses: The AI's answer goes back to our server, which tells Twilio to send the response as an SMS right back to your phone. All of this happens in seconds, providing crucial legal information without needing an internet connection on your end.
            </p>
        </div>
    );
};


export const SMSHelp: React.FC = () => {
    const [messages, setMessages] = useState<SMSMessage[]>([
        {
            sender: 'bot',
            text: "Welcome to Satyavāk SMS Help! This is a demo of how you can get legal information offline. Type your query below as if you were sending an SMS."
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) return;

        const userMessage: SMSMessage = { sender: 'user', text: trimmedInput };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Convert local SMS history to the format geminiService expects
            // Fix: Explicitly define role to fix type inference issue.
            const history = messages.map(msg => {
                const role: 'user' | 'model' = msg.sender === 'user' ? 'user' : 'model';
                return {
                    role,
                    parts: [{ text: msg.text }]
                };
            }).slice(1); // Remove the initial welcome message from history for better responses
            
            const response = await getChatbotResponse(history, trimmedInput);
            const botMessage: SMSMessage = { sender: 'bot', text: response.text };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("SMS Help bot error:", error);
            const errorMessage: SMSMessage = {
                sender: 'bot',
                text: "Sorry, I couldn't process that. Please try again."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8">
             <div className="w-full max-w-7xl mx-auto text-center mb-12">
                <h2 className="text-4xl font-bold text-brand-dark dark:text-white mb-2">Offline SMS Help</h2>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                    Bridging the digital divide by providing crucial legal information via SMS—no internet required.
                </p>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start max-w-7xl mx-auto">
                <div className="lg:w-1/2 w-full">
                    <HowItWorks />
                </div>
                
                <div className="lg:w-1/2 w-full flex flex-col items-center">
                    <h3 className="text-2xl font-bold text-brand-dark dark:text-white mb-3">Try the Simulation</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center mb-4">
                        Send a message to our AI bot in the phone below. The number would be <strong className="text-brand-secondary whitespace-nowrap">+91-XXX-XXX-XXXX</strong>.
                    </p>
                    {/* Phone Simulation */}
                    <div className="w-full max-w-sm bg-slate-100 dark:bg-black rounded-[2.5rem] shadow-2xl border-8 border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col h-[70vh] relative">
                         {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-300 dark:bg-slate-800 rounded-b-xl"></div>
                        {/* Header */}
                        <div className="bg-slate-200 dark:bg-slate-900/50 p-3 pt-8 flex items-center border-b border-slate-200 dark:border-slate-800 flex-shrink-0 backdrop-blur-sm">
                            <div className="text-center w-full">
                                <p className="font-semibold text-brand-dark dark:text-white">Satyavāk AI Bot</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">via SMS (+91-XXX...)</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-2.5 px-3.5 rounded-2xl ${
                                        msg.sender === 'user' 
                                        ? 'bg-blue-500 text-white rounded-br-lg' 
                                        : 'bg-slate-200 dark:bg-slate-700 text-brand-dark dark:text-white rounded-bl-lg'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-end gap-2 justify-start">
                                    <div className="max-w-[80%] p-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-brand-dark dark:text-white rounded-bl-lg flex items-center">
                                        <Spinner className="w-4 h-4" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-2 bg-slate-200 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type your SMS here..."
                                    className="flex-1 p-2 border-none rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white text-sm"
                                />
                                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 disabled:bg-slate-400 transition-colors flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};