import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { getTextToSpeech, translateText } from '../services/geminiService';
import { LANGUAGE_MAP } from '../constants';
import { decode, decodeAudioData } from '../utils/audio';
import { BotIcon, UserIcon, MicrophoneIcon, VolumeIcon, TranslateIcon, CopyIcon, ShareIcon, StopIcon, CheckCircleIcon } from './Icons';
import { Spinner } from './Spinner';

interface ChatUIProps {
    chatTitle: string;
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (englishMessage: string) => Promise<void>;
    language: string;
    onShareChat: () => void;
}

export const ChatUI: React.FC<ChatUIProps> = ({ chatTitle, messages, isLoading, onSendMessage, language, onShareChat }) => {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [nowPlaying, setNowPlaying] = useState<{ source: AudioBufferSourceNode; index: number } | null>(null);
    const [showOriginal, setShowOriginal] = useState<Record<number, boolean>>({});
    const [copied, setCopied] = useState<Record<number, boolean>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const originalInput = input;
        setInput('');
        
        try {
            const englishInput = language === 'English' ? originalInput : await translateText(originalInput, 'English');
            await onSendMessage(englishInput);
        } catch (error) {
            console.error("Error sending message:", error);
            // Error display is handled by the parent component
        }
    };

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition is not supported in your browser.");
            return;
        }
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };
    
    const playAudio = async (text: string, index: number) => {
        // Stop any currently playing audio.
        if (nowPlaying) {
            nowPlaying.source.stop();
        }
    
        // If the action was to stop the currently playing audio, we're done.
        if (nowPlaying && nowPlaying.index === index) {
            setNowPlaying(null);
            return;
        }
        
        // Setup to play new audio
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioContext = audioContextRef.current;
        
        try {
            const audioData = await getTextToSpeech(text);
            if(audioData) {
                const decodedData = decode(audioData);
                const audioBuffer = await decodeAudioData(decodedData, audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = () => {
                    setNowPlaying(current => (current?.source === source ? null : current));
                };
                source.start();
                setNowPlaying({ source, index });
            }
        } catch (error) {
            console.error("Error playing audio:", error);
            setNowPlaying(null);
        }
    };

    const toggleTranslation = (index: number) => {
        setShowOriginal(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopied({ [index]: true });
        setTimeout(() => setCopied(prev => ({ ...prev, [index]: false })), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-medium flex justify-between items-center shadow-subtle">
                <h2 className="text-lg font-semibold text-brand-dark dark:text-white">{chatTitle}</h2>
                {messages.length > 0 && (
                    <button onClick={onShareChat} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" aria-label="Share chat">
                        <ShareIcon className="w-5 h-5"/>
                    </button>
                )}
            </div>

            {messages.length === 0 && !isLoading ? (
                 <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-accent to-brand-secondary rounded-2xl flex items-center justify-center mb-4">
                        <BotIcon className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-brand-dark dark:text-white">Satyavāk AI Assistant</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Ask me anything about Indian law.</p>
                 </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><BotIcon className="w-5 h-5 text-brand-secondary" /></div>}
                            <div className={`max-w-xl p-3 px-4 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-br from-brand-accent to-sky-400 text-white rounded-br-lg' : 'bg-white dark:bg-brand-medium text-brand-dark dark:text-white shadow-subtle rounded-bl-lg'}`}>
                               <p className="whitespace-pre-wrap leading-relaxed">{showOriginal[index] ? msg.englishText : msg.text}</p>
                               {msg.role === 'model' && (
                                    <div className="flex items-center space-x-1 mt-2 -ml-1">
                                        <button onClick={() => playAudio(showOriginal[index] ? msg.englishText : msg.text, index)} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" aria-label={nowPlaying?.index === index ? 'Stop audio' : 'Play audio'}>
                                            {nowPlaying?.index === index ? <StopIcon className="w-4 h-4" /> : <VolumeIcon className="w-4 h-4"/>}
                                        </button>
                                        <button onClick={() => handleCopy(showOriginal[index] ? msg.englishText : msg.text, index)} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" aria-label="Copy text">
                                            {copied[index] ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4"/>}
                                        </button>
                                        {language !== 'English' && msg.englishText !== msg.text && (
                                             <button onClick={() => toggleTranslation(index)} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" aria-label="Toggle translation">
                                                <TranslateIcon className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                               )}
                            </div>
                            {msg.role === 'user' && <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><UserIcon className="w-5 h-5 text-slate-500" /></div>}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                             <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><BotIcon className="w-5 h-5 text-brand-secondary" /></div>
                             <div className="max-w-xl p-3 px-4 rounded-2xl bg-white dark:bg-brand-medium text-brand-dark dark:text-white shadow-subtle rounded-bl-lg flex items-center">
                                <Spinner className="w-5 h-5 mr-2 text-brand-secondary"/> Thinking...
                             </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}
            
            <div className="p-4 bg-white dark:bg-brand-medium border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-full p-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={`Message in ${LANGUAGE_MAP[language]}...`}
                        className="flex-1 p-2 bg-transparent focus:outline-none dark:text-white placeholder-slate-500"
                        disabled={isLoading}
                    />
                    <button onClick={handleVoiceInput} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
                       <MicrophoneIcon className="w-6 h-6"/>
                    </button>
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-brand-accent text-white font-semibold py-2 px-5 rounded-full hover:bg-brand-accent-dark disabled:bg-slate-300 dark:disabled:bg-slate-600 transition-colors">
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};