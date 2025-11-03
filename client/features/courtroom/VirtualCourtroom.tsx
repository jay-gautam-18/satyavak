import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CourtroomIcon } from '../../components/Icons';
import { ThreeDCourtroomScene } from './ThreeDCourtroomScene';
import { getInteractiveCourtroomResponse } from '../../services/geminiService';

export interface CourtroomScenario {
    key: string;
    title: string;
    description: string;
    openingStatement: {
      speaker: 'defense' | 'prosecution';
      dialogue: string;
    }
}

const scenarios: CourtroomScenario[] = [
    {
        key: 'bail_application',
        title: 'Bail Application Hearing',
        description: 'Argue for or against a client\'s pre-trial release in this high-stakes bail hearing.',
        openingStatement: {
            speaker: 'defense',
            dialogue: 'Your Honor, my client has deep roots in the community and a stable job. He is not a flight risk and deserves to be granted bail.'
        }
    },
    {
        key: 'landlord_tenant_dispute',
        title: 'Landlord-Tenant Dispute',
        description: 'Represent either the landlord or the tenant in an unjust eviction case. Argue based on rights and rental agreements.',
        openingStatement: {
            speaker: 'defense',
            dialogue: 'Your Honor, I have always paid my rent on time. This eviction is retaliatory because I reported a safety violation. I have the receipts right here.'
        }
    },
];

const COURTROOM_THEMES = [
    {
        key: 'classic_mahogany',
        name: 'Classic Mahogany',
        description: 'A traditional and stately courtroom with dark wood finishes for a formal atmosphere.',
        previewStyle: { background: 'radial-gradient(ellipse at top, #2c1a0f, #1a0f09)' },
    },
    {
        key: 'modern_metropolis',
        name: 'Modern Metropolis',
        description: 'A sleek, contemporary setting with a stunning city skyline view, perfect for high-stakes corporate cases.',
        previewStyle: { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.9)), url('https://storage.googleapis.com/aistudio-hosting/2024-05-24/31666e92-d62f-410e-a614-272e275f1064.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' },
    },
    {
        key: 'district_court',
        name: 'District Court',
        description: 'A clean, minimalist design that reflects a standard, public courtroom for everyday legal practice.',
        previewStyle: { background: 'linear-gradient(to bottom, #e2e8f0, #cbd5e1)' },
    }
];

type HistoryTurn = { speaker: 'defense' | 'prosecution' | 'judge'; dialogue: string };

export const VirtualCourtroom: React.FC<{ language: string }> = ({ language }) => {
    const [simulationState, setSimulationState] = useState<'selection' | 'role_selection' | 'theme_selection' | 'input_method_selection' | 'running' | 'verdict'>('selection');
    const [selectedScenario, setSelectedScenario] = useState<CourtroomScenario | null>(null);
    const [userRole, setUserRole] = useState<'defense' | 'prosecution' | null>(null);
    const [selectedTheme, setSelectedTheme] = useState<string>(COURTROOM_THEMES[0].key);
    const [inputMode, setInputMode] = useState<'text' | 'voice' | null>(null);
    const [history, setHistory] = useState<HistoryTurn[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [verdictReasoning, setVerdictReasoning] = useState('');
    
    // For voice input
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef(''); // Ref to hold latest transcript for callbacks
    
    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const activeSpeaker = history.length > 0 ? history[history.length - 1].speaker : null;
    const currentDialogue = history.length > 0 ? history[history.length - 1].dialogue : '';

    const isUserTurn = useMemo(() => {
        if (isLoading || simulationState !== 'running') {
            return false;
        }
        const lastSpeaker = history.length > 0 ? history[history.length - 1].speaker : null;

       
        if (history.length === 0) {
            return selectedScenario?.openingStatement.speaker === userRole;
        }

        // Mid-simulation. It's the user's turn if the last speaker was the AI (opponent or judge).
        return lastSpeaker !== userRole;
    }, [isLoading, simulationState, history, userRole, selectedScenario]);


    useEffect(() => {
        if (simulationState === 'running' && userRole && !isLoading) {
            const lastTurn = history.length > 0 ? history[history.length - 1] : null;
            const isAIsTurnToAct = (history.length === 0 && selectedScenario?.openingStatement.speaker !== userRole) || (lastTurn?.speaker === userRole);

            if (isAIsTurnToAct) {
                const getAIResponse = async () => {
                    if (!selectedScenario) return;
                    setIsLoading(true);
                    
                    const aiResponse = await getInteractiveCourtroomResponse(history, userRole, selectedScenario.title);
                    
                    setHistory(prev => [...prev, { speaker: aiResponse.speaker, dialogue: aiResponse.dialogue }]);
                    
                    if (aiResponse.verdict) {
                        if (aiResponse.reasoning) {
                            setVerdictReasoning(aiResponse.reasoning);
                        }
                        setSimulationState('verdict');
                    }
                    setIsLoading(false);
                };
                getAIResponse();
            }
        }
    }, [simulationState, userRole, history, selectedScenario, isLoading]);

    const handleSelectScenario = (scenario: CourtroomScenario) => {
        setSelectedScenario(scenario);
        setSimulationState('role_selection');
    };

    const handleSelectRole = (role: 'defense' | 'prosecution') => {
        setUserRole(role);
        setSimulationState('theme_selection');
    };

    const handleSelectTheme = (themeKey: string) => {
        setSelectedTheme(themeKey);
        setSimulationState('input_method_selection');
    };
    
    const handleSelectInputMode = (mode: 'text' | 'voice') => {
        setInputMode(mode);
        setSimulationState('running');
        if (selectedScenario && selectedScenario.openingStatement.speaker !== userRole) {
            setHistory([selectedScenario.openingStatement]);
        }
    };

    const handleSendArgument = (argument: string) => {
        if (!argument.trim() || !userRole) return;
        setHistory(prev => [...prev, { speaker: userRole, dialogue: argument }]);
    };
    
    const handleToggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (!('webkitSpeechRecognition' in window)) {
                alert("Speech recognition is not supported in your browser.");
                return;
            }
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-IN';

            recognitionRef.current = recognition;

            recognition.onstart = () => {
                setIsListening(true);
            };
            
            recognition.onend = () => {
                setIsListening(false);
                if (transcriptRef.current.trim()) {
                   handleSendArgument(transcriptRef.current);
                }
                setTranscript('');
                recognitionRef.current = null;
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setTranscript(finalTranscript + interimTranscript);
            };
            
            recognition.start();
        }
    };

    const handleEndSession = () => {
        setSimulationState('selection');
        setSelectedScenario(null);
        setUserRole(null);
        setSelectedTheme(COURTROOM_THEMES[0].key);
        setHistory([]);
        setIsLoading(false);
        setInputMode(null);
        setIsListening(false);
        setTranscript('');
        setVerdictReasoning('');
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const renderSelection = () => (
        <div className="p-4 md:p-8">
            <h2 className="text-3xl font-bold text-brand-dark dark:text-white mb-2">Virtual Courtroom Simulator</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">Choose a scenario to enter an interactive, AI-powered courtroom hearing.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scenarios.map(s => (
                    <div key={s.key} className="bg-white dark:bg-brand-medium rounded-lg shadow-lg p-6 flex flex-col items-start border border-slate-200 dark:border-slate-700">
                        <div className="bg-brand-secondary text-white p-3 rounded-full mb-4"><CourtroomIcon className="w-7 h-7" /></div>
                        <h3 className="font-semibold text-xl text-brand-dark dark:text-white mb-2">{s.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 flex-grow">{s.description}</p>
                        <button onClick={() => handleSelectScenario(s)} className="w-full bg-brand-accent text-white font-bold py-2 px-4 rounded-md hover:bg-sky-400 transition-colors mt-auto">
                            Select Scenario
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const renderRoleSelection = () => (
        <div className="p-4 md:p-8 text-center">
            <h2 className="text-3xl font-bold text-brand-dark dark:text-white mb-2">Choose Your Role</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
                You have selected the "{selectedScenario?.title}" scenario. Which side will you represent?
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center max-w-2xl mx-auto">
                <div className="flex-1 bg-white dark:bg-brand-medium rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-700 text-left">
                    <h3 className="text-2xl font-semibold text-sky-500 mb-3">Defense Counsel</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 min-h-[6rem]">Support the defendant. Argue for their rights and prove their innocence or seek a favorable outcome.</p>
                    <button onClick={() => handleSelectRole('defense')} className="w-full bg-sky-500 text-white font-bold py-3 px-4 rounded-md hover:bg-sky-600 transition-colors">
                        Play as Defense
                    </button>
                </div>
                <div className="flex-1 bg-white dark:bg-brand-medium rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-700 text-left">
                    <h3 className="text-2xl font-semibold text-red-500 mb-3">Prosecution</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 min-h-[6rem]">Represent the state. Argue against the defendant and present evidence to secure a conviction.</p>
                    <button onClick={() => handleSelectRole('prosecution')} className="w-full bg-red-500 text-white font-bold py-3 px-4 rounded-md hover:bg-red-600 transition-colors">
                        Play as Prosecution
                    </button>
                </div>
            </div>
            <button onClick={handleEndSession} className="mt-8 text-sm text-slate-500 hover:underline">
                Back to Scenarios
            </button>
        </div>
    );
    
    const renderThemeSelection = () => (
        <div className="p-4 md:p-8 text-center">
            <h2 className="text-3xl font-bold text-brand-dark dark:text-white mb-2">Select a Courtroom Theme</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
                Choose a visual setting for your simulation to enhance immersion.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {COURTROOM_THEMES.map(theme => (
                    <button key={theme.key} onClick={() => handleSelectTheme(theme.key)} className={`text-left rounded-lg shadow-lg border-4 transition-all duration-300 ${selectedTheme === theme.key ? 'border-brand-accent scale-105' : 'border-transparent hover:border-brand-accent/50'}`}>
                        <div style={theme.previewStyle} className="h-40 rounded-t-md w-full" />
                        <div className="p-4 bg-white dark:bg-brand-medium rounded-b-md">
                            <h3 className="font-semibold text-lg text-brand-dark dark:text-white">{theme.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{theme.description}</p>
                        </div>
                    </button>
                ))}
            </div>
             <button onClick={() => setSimulationState('role_selection')} className="mt-8 text-sm text-slate-500 hover:underline">
                Back to Role Selection
            </button>
        </div>
    );

    const renderInputMethodSelection = () => (
        <div className="p-4 md:p-8 text-center">
            <h2 className="text-3xl font-bold text-brand-dark dark:text-white mb-2">Choose Input Method</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
                How would you like to present your arguments for the "{selectedScenario?.title}" scenario?
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center max-w-lg mx-auto">
                <button onClick={() => handleSelectInputMode('text')} className="flex-1 bg-white dark:bg-brand-medium rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-700 text-left hover:border-brand-accent transition-colors">
                    <h3 className="text-2xl font-semibold text-brand-dark dark:text-white mb-3">Text Input</h3>
                    <p className="text-slate-600 dark:text-slate-400">Type your arguments using your keyboard. Best for precise wording and review before submitting.</p>
                </button>
                <button onClick={() => handleSelectInputMode('voice')} className="flex-1 bg-white dark:bg-brand-medium rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-700 text-left hover:border-brand-accent transition-colors">
                    <h3 className="text-2xl font-semibold text-brand-dark dark:text-white mb-3">Voice Input</h3>
                    <p className="text-slate-600 dark:text-slate-400">Speak your arguments into your microphone. Ideal for a more realistic and hands-free simulation.</p>
                </button>
            </div>
            <button onClick={() => setSimulationState('theme_selection')} className="mt-8 text-sm text-slate-500 hover:underline">
                Back to Theme Selection
            </button>
        </div>
    );

    switch (simulationState) {
        case 'selection':
            return renderSelection();
        case 'role_selection':
            return renderRoleSelection();
        case 'theme_selection':
            return renderThemeSelection();
        case 'input_method_selection':
            return renderInputMethodSelection();
        case 'running':
        case 'verdict':
            return selectedScenario ? (
                <ThreeDCourtroomScene
                    activeSpeaker={activeSpeaker}
                    dialogue={currentDialogue}
                    scenarioTitle={selectedScenario.title}
                    onEndSession={handleEndSession}
                    isUserTurn={isUserTurn}
                    isLoading={isLoading}
                    onSubmitArgument={handleSendArgument}
                    userRole={userRole}
                    isVerdict={simulationState === 'verdict'}
                    verdictReasoning={verdictReasoning}
                    themeKey={selectedTheme}
                    inputMode={inputMode}
                    isListening={isListening}
                    onToggleListening={handleToggleListening}
                    transcript={transcript}
                />
            ) : null;
        default:
            return null;
    }
};