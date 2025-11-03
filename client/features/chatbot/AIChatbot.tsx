import React, { useState, useEffect, useCallback } from 'react';
import { getChatbotResponse, translateText } from '../../services/geminiService';
import { ChatUI } from '../../components/ChatUI';
import type { ChatMessage, ChatSession } from '../../types';
import { LANGUAGE_MAP } from '../../constants';
// Fix: Import BotIcon.
import { NewChatIcon, TrashIcon, SearchIcon, BotIcon } from '../../components/Icons';

const HISTORY_KEY = 'satyavak_chat_history';

const loadChatHistory = (): ChatSession[] => {
    try {
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
        console.error("Failed to load chat history:", error);
        return [];
    }
};

const saveChatHistory = (sessions: ChatSession[]): void => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    } catch (error) {
        console.error("Failed to save chat history:", error);
    }
};

export const AIChatbot: React.FC<{ language: string }> = ({ language }) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadedSessions = loadChatHistory();
        setSessions(loadedSessions);
        // Automatically select the most recent chat if available
        if (loadedSessions.length > 0 && !activeSessionId) {
            setActiveSessionId(loadedSessions[0].id);
        }
    }, []);

    useEffect(() => {
        saveChatHistory(sessions);
    }, [sessions]);

    const activeSession = sessions.find(s => s.id === activeSessionId) || null;
    const geminiHistory = activeSession?.messages.map(m => ({
        role: m.role,
        parts: [{ text: m.englishText }]
    })) || [];

    const filteredSessions = searchQuery
        ? sessions.filter(session =>
            session.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : sessions;


    const handleNewChat = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: "New Chat",
            createdAt: Date.now(),
            messages: [],
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
    };
    
    const handleSelectSession = (id: string) => {
        setActiveSessionId(id);
    };

    const handleDeleteSession = (id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) {
             const remainingSessions = sessions.filter(s => s.id !== id);
             setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
        }
    };

    const handleSendMessage = async (englishMessage: string): Promise<void> => {
        let currentSessionId = activeSessionId;

        // If no session is active, create a new one
        if (!currentSessionId) {
            const newSession: ChatSession = {
                id: Date.now().toString(),
                title: "New Chat",
                createdAt: Date.now(),
                messages: [],
            };
            setSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
            currentSessionId = newSession.id;
        }

        setIsLoading(true);

        const translatedUserInput = language === 'English' ? englishMessage : await translateText(englishMessage, LANGUAGE_MAP[language]);
        const userMessage: ChatMessage = { role: 'user', text: translatedUserInput, englishText: englishMessage };

        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                const isNewChat = s.messages.length === 0;
                return {
                    ...s,
                    title: isNewChat ? (englishMessage.substring(0, 30) + '...') : s.title,
                    messages: [...s.messages, userMessage]
                };
            }
            return s;
        }));

        try {
            const response = await getChatbotResponse(geminiHistory, englishMessage);
            const englishResponseText = response.text;
            const translatedResponseText = language === 'English' ? englishResponseText : await translateText(englishResponseText, LANGUAGE_MAP[language]);
            const modelMessage: ChatMessage = { role: 'model', text: translatedResponseText, englishText: englishResponseText };
            
            setSessions(prev => prev.map(s =>
                s.id === currentSessionId ? { ...s, messages: [...s.messages, modelMessage] } : s
            ));
        } catch (error) {
            console.error("Error fetching response:", error);
            const errorMessage: ChatMessage = { role: 'model', text: "Sorry, I encountered an error. Please try again.", englishText: "Sorry, I encountered an error. Please try again." };
            setSessions(prev => prev.map(s =>
                s.id === currentSessionId ? { ...s, messages: [...s.messages, errorMessage] } : s
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const handleShareChat = () => {
        if (!activeSession) return;
        const chatText = activeSession.messages.map(msg =>
            `${msg.role === 'user' ? 'You' : 'Satyavāk'}:\n${msg.englishText}`
        ).join('\n\n');

        if (navigator.share) {
            navigator.share({
                title: `Satyavāk Chat: ${activeSession.title}`,
                text: chatText,
            }).catch(err => console.error("Share failed", err));
        } else {
            navigator.clipboard.writeText(chatText)
                .then(() => alert('Chat copied to clipboard!'))
                .catch(err => console.error('Failed to copy chat', err));
        }
    };

    return (
        <div className="flex h-[90vh]  border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-lg">
            <aside className="w-1/4 h-full bg-brand-medium text-white flex flex-col border-r border-slate-700 min-h-0">
            <div className="p-4 border-b border-slate-700">
                <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent-dark text-white font-bold py-2.5 px-4 rounded-lg transition-colors">
                <NewChatIcon className="w-5 h-5"/>
                New Chat
                </button>
            </div>
            <div className="p-2 border-b border-slate-700">
                <div className="relative">
                <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 text-sm rounded-md py-2 pl-8 pr-3 focus:outline-none focus:ring-2 focus:ring-brand-accent placeholder-slate-400"
                    aria-label="Search past chats"
                />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto min-h-0">
                {filteredSessions.map((session: ChatSession) => (
                <div key={session.id} onClick={() => handleSelectSession(session.id)}
                   className={`p-3 m-2 rounded-lg cursor-pointer flex justify-between items-center group transition-colors ${activeSessionId === session.id ? 'bg-brand-accent/20' : 'hover:bg-slate-700'}`}>
                   <p className={`truncate text-sm font-medium ${activeSessionId === session.id ? 'text-brand-accent' : 'text-slate-200'}`}>{session.title}</p>
                   <button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleDeleteSession(session.id); }} className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrashIcon className="w-4 h-4" />
                   </button>
                </div>
                ))}
            </nav>
            </aside>
            <main className="w-3/4 h-full flex flex-col min-h-0">
            {activeSession ? (
                // Ensure ChatUI can grow and internally scroll without pushing the input off-screen
                <div className="flex-1 min-h-0">
                <ChatUI 
                    language={language} 
                    chatTitle={activeSession.title}
                    messages={activeSession.messages}
                    isLoading={isLoading}
                    onSendMessage={handleSendMessage}
                    onShareChat={handleShareChat}
                />
                </div>
            ) : (
                <div className="flex-1 min-h-0 flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900">
                 <div className="w-16 h-16 bg-gradient-to-br from-brand-accent to-brand-secondary rounded-2xl flex items-center justify-center mb-4">
                    <BotIcon className="w-10 h-10 text-white" />
                 </div>
                 <h1 className="text-2xl font-bold text-brand-dark dark:text-white">Satyavāk AI Assistant</h1>
                 <p className="text-slate-500 dark:text-slate-400 mt-1">Select a conversation or start a new one.</p>
                </div>
            )}
            </main>
        </div>
    );
};
