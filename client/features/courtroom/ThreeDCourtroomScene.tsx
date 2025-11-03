import React, { useState, useEffect, useRef } from 'react';
import { GavelIcon, MicrophoneIcon, VolumeIcon, VolumeOffIcon } from '../../components/Icons';
import { Spinner } from '../../components/Spinner';

// Audio file URLs
const AMBIANCE_URL = 'https://storage.googleapis.com/gemini-ui-params/prompts/webhook/2024-05-24/courtroom_ambience.mp3';
const GAVEL_URL = 'https://storage.googleapis.com/aistudio-hosting/2024-05-24/2f85d263-d143-41a4-8f19-943e3c834a7d.mp3';
const REACTION_URLS = [
    'https://storage.googleapis.com/gemini-ui-params/prompts/webhook/2024-05-24/cough.mp3', // Cough
    'https://storage.googleapis.com/gemini-ui-params/prompts/webhook/2024-05-24/murmur.mp3'  // Murmur
];

const THEME_STYLES: Record<string, {
    backgroundStyle: React.CSSProperties;
    characterTextColor: string;
    titleTextColor: string;
}> = {
    'classic_mahogany': {
        backgroundStyle: { background: 'radial-gradient(ellipse at top, #2c1a0f, #1a0f09)' },
        characterTextColor: 'text-white',
        titleTextColor: 'text-slate-400'
    },
    'modern_metropolis': {
        backgroundStyle: { 
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.9)), url('https://storage.googleapis.com/aistudio-hosting/2024-05-24/31666e92-d62f-410e-a614-272e275f1064.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        },
        characterTextColor: 'text-white',
        titleTextColor: 'text-slate-300'
    },
    'district_court': {
         backgroundStyle: { background: 'linear-gradient(to bottom, #e2e8f0, #cbd5e1)' },
         characterTextColor: 'text-slate-800',
         titleTextColor: 'text-slate-600'
    }
};


interface CharacterProps {
    name: string;
    title: string;
    isActive: boolean;
    isUser: boolean;
    textColor: string;
    titleColor: string;
}

const Character: React.FC<CharacterProps> = ({ name, title, isActive, isUser, textColor, titleColor }) => (
    <div className={`flex flex-col items-center text-center transition-all duration-500 ${isActive ? 'scale-110' : 'scale-90 opacity-60'}`}>
        <div className={`relative rounded-full p-2 bg-gradient-to-br from-slate-600 to-slate-800`}>
             <img 
                src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${name.split(' ').pop()}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                alt={name} 
                className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-200"
            />
             <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isActive ? 'shadow-[0_0_35px_10px_rgba(255,255,200,0.4)]' : ''}`}></div>
             {isUser && <span className="absolute -bottom-1 right-0 bg-brand-accent text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-slate-800">YOU</span>}
        </div>
        <h3 className={`mt-4 text-lg font-bold ${textColor}`}>{name}</h3>
        <p className={`text-sm ${titleColor}`}>{title}</p>
    </div>
);

const SpeechBubble: React.FC<{ text: string; isVisible: boolean; position?: 'top' | 'bottom'; side?: 'left' | 'center' | 'right' }> = ({ text, isVisible, position = 'top', side = 'center' }) => {
    let positionClasses: string;

    // Custom positioning for the judge's bubble to be closer to the character model.
    if (position === 'bottom' && side === 'center') {
        positionClasses = 'top-28'; // Tailwind's top-28 is 7rem. Positions bubble below the judge's head.
    } else if (position === 'bottom') {
        positionClasses = 'top-full mt-4';
    } else { // position === 'top'
        positionClasses = 'bottom-full mb-4';
    }
    
    const animationClasses = isVisible
        ? 'opacity-100' + (position === 'top' ? ' animate-bubble-up' : ' animate-bubble-down')
        : 'opacity-0 pointer-events-none';

    let containerSideClasses = '';
    let arrowSideClasses = '';

    switch (side) {
        case 'left':
            // Aligns the bubble to the left edge of the character's container. Expands rightwards.
            containerSideClasses = 'left-0';
            // Positions the arrow near the left of the bubble.
            arrowSideClasses = 'left-1/4 -translate-x-1/2';
            break;
        case 'right':
            // Aligns the bubble to the right edge of the character's container. Expands leftwards.
            containerSideClasses = 'right-0';
            // Positions the arrow near the right of the bubble.
            arrowSideClasses = 'left-3/4 -translate-x-1/2';
            break;
        case 'center':
        default:
            // Centers the bubble above/below the character.
            containerSideClasses = 'left-1/2 -translate-x-1/2';
            // Centers the arrow.
            arrowSideClasses = 'left-1/2 -translate-x-1/2';
            break;
    }
        
    const arrowClasses = position === 'top'
        ? `absolute -bottom-2 w-4 h-4 bg-white dark:bg-brand-medium transform rotate-45 ${arrowSideClasses}`
        : `absolute -top-2 w-4 h-4 bg-white dark:bg-brand-medium transform rotate-45 ${arrowSideClasses}`;
        
    return (
        <div className={`absolute z-20 w-auto max-w-[280px] sm:max-w-[320px] md:max-w-[400px] bg-white dark:bg-brand-medium text-brand-dark dark:text-white p-4 rounded-lg shadow-xl transition-all duration-300 ${positionClasses} ${animationClasses} ${containerSideClasses}`}
             role="status" aria-live="polite"
        >
            <p className="text-center text-sm sm:text-base break-words">{text}</p>
            <div className={arrowClasses}></div>
        </div>
    );
};


interface UserInputProps {
    onSubmit: (text: string) => void;
    isLoading: boolean;
}

const UserInput: React.FC<UserInputProps> = ({ onSubmit, isLoading }) => {
    const [text, setText] = useState('');
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (text.trim() && !isLoading) {
        onSubmit(text);
        setText('');
      }
    };
  
    return (
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/30 backdrop-blur-sm z-20">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // FIX: The original call to requestSubmit() likely caused a type error.
                    // This now uses the standard and correct way to programmatically submit a form
                    // from within one of its elements.
                    (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
                }
            }}
            placeholder="Type your argument..."
            rows={1}
            className="flex-1 p-3 bg-slate-900/80 border border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none resize-none text-white"
            disabled={isLoading}
            aria-label="Your argument"
          />
          <button ref={submitButtonRef} type="submit" disabled={isLoading || !text.trim()} className="bg-brand-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-400 disabled:bg-slate-500">
            {'Submit'}
          </button>
        </form>
      </div>
    );
  };

const VoiceInput: React.FC<{
    onToggleListening: () => void;
    isListening: boolean;
    transcript: string;
}> = ({ onToggleListening, isListening, transcript }) => {
    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/30 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
            <p className="h-6 text-slate-300 mb-2 text-center min-h-[1.5rem] italic">{transcript || (isListening ? "Listening..." : "Click the mic to speak your argument")}</p>
            <button 
                onClick={onToggleListening} 
                className={`p-4 rounded-full transition-all duration-300 transform active:scale-90 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-brand-accent hover:bg-sky-400 text-white'}`}
                aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
                <MicrophoneIcon className="w-8 h-8"/>
            </button>
        </div>
    );
};

interface ThreeDCourtroomSceneProps {
    activeSpeaker: 'defense' | 'prosecution' | 'judge' | null;
    dialogue: string;
    scenarioTitle: string;
    onEndSession: () => void;
    isUserTurn: boolean;
    isLoading: boolean;
    onSubmitArgument: (argument: string) => void;
    userRole: 'defense' | 'prosecution' | null;
    isVerdict: boolean;
    verdictReasoning?: string;
    themeKey: string;
    inputMode: 'text' | 'voice' | null;
    isListening: boolean;
    onToggleListening: () => void;
    transcript: string;
}

export const ThreeDCourtroomScene: React.FC<ThreeDCourtroomSceneProps> = ({ 
    activeSpeaker, dialogue, scenarioTitle, onEndSession, 
    isUserTurn, isLoading, onSubmitArgument, userRole, isVerdict, verdictReasoning,
    themeKey, inputMode, isListening, onToggleListening, transcript
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const audioInitialized = useRef(false);
    const ambianceAudioRef = useRef<HTMLAudioElement | null>(null);
    const gavelAudioRef = useRef<HTMLAudioElement | null>(null);
    const reactionAudiosRef = useRef<HTMLAudioElement[]>([]);
    const hasJudgeSpoken = useRef(false);
    const prevActiveSpeakerRef = useRef<typeof activeSpeaker>();

    const currentTheme = THEME_STYLES[themeKey] || THEME_STYLES['classic_mahogany'];

    // Initialize and clean up audio
    useEffect(() => {
        const initAudio = () => {
            if (audioInitialized.current) return;
            try {
                ambianceAudioRef.current = new Audio(AMBIANCE_URL);
                ambianceAudioRef.current.loop = true;
                ambianceAudioRef.current.volume = 0.15;
                if (!isMuted) ambianceAudioRef.current.play().catch(e => console.warn("Ambiance autoplay blocked.", e));

                gavelAudioRef.current = new Audio(GAVEL_URL);
                gavelAudioRef.current.volume = 0.5;

                reactionAudiosRef.current = REACTION_URLS.map(url => {
                    const audio = new Audio(url);
                    audio.volume = 0.3;
                    return audio;
                });
                audioInitialized.current = true;
            } catch (e) { console.error("Failed to initialize audio:", e); }
        };

        // Autoplay requires user interaction. This sets up audio on the first click anywhere.
        document.addEventListener('click', initAudio, { once: true });
        return () => {
            document.removeEventListener('click', initAudio);
            ambianceAudioRef.current?.pause();
            audioInitialized.current = false;
        };
    }, []); // Run only once

    // Mute/unmute logic
    useEffect(() => {
        const allAudio = [ambianceAudioRef.current, gavelAudioRef.current, ...reactionAudiosRef.current];
        allAudio.forEach(audio => {
            if (audio) audio.muted = isMuted;
        });
        if (!isMuted && audioInitialized.current) {
             ambianceAudioRef.current?.play().catch(e => console.warn("Ambiance autoplay blocked on unmute.", e));
        } else {
             ambianceAudioRef.current?.pause();
        }
    }, [isMuted]);

    // Trigger sounds based on events
    useEffect(() => {
        if (!audioInitialized.current || isMuted) return;

        const prevSpeaker = prevActiveSpeakerRef.current;
        // Gavel when judge speaks for the first time in the session
        if (activeSpeaker === 'judge' && prevSpeaker !== 'judge' && !hasJudgeSpoken.current) {
            gavelAudioRef.current?.play();
            hasJudgeSpoken.current = true;
        }

        // Reactions for lawyers when their turn starts
        if ((activeSpeaker === 'defense' || activeSpeaker === 'prosecution') && activeSpeaker !== prevSpeaker) {
            if (Math.random() < 0.4) { // 40% chance of a reaction
                const reactionIndex = Math.floor(Math.random() * reactionAudiosRef.current.length);
                reactionAudiosRef.current[reactionIndex]?.play();
            }
        }
        
        // Update previous speaker ref for the next render
        prevActiveSpeakerRef.current = activeSpeaker;
    }, [activeSpeaker, isMuted]);

    // Gavel sound on verdict
    useEffect(() => {
        if (isVerdict && audioInitialized.current && !isMuted) {
            gavelAudioRef.current?.play();
        }
    }, [isVerdict, isMuted]);

    return (
        <div className="h-full flex flex-col text-white overflow-hidden" style={{ ...currentTheme.backgroundStyle }}>
            <div className="p-4 bg-black/20 text-center flex-shrink-0 relative">
                <h2 className="text-xl font-semibold">{scenarioTitle}</h2>
                <p className="text-sm text-slate-400">Interactive Simulation</p>
                 <div className="absolute top-1/2 right-4 -translate-y-1/2">
                    <button onClick={() => setIsMuted(prev => !prev)} className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}>
                        {isMuted ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-between p-8 relative">
                <div className="absolute inset-0 bg-brand-dark opacity-50" style={{ background: themeKey === 'district_court' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.5)' }}></div>
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-amber-900/20 rounded-t-full blur-3xl" style={{ display: themeKey === 'district_court' ? 'none' : 'block' }}></div>


                <div className="relative flex justify-center z-10">
                    <div className="relative">
                        <Character name="The Honorable Judge" title="Presiding Judge" isActive={activeSpeaker === 'judge'} isUser={false} textColor={currentTheme.characterTextColor} titleColor={currentTheme.titleTextColor} />
                        <SpeechBubble text={dialogue} isVisible={activeSpeaker === 'judge'} position="bottom" side="center" />
                    </div>
                </div>

                <div className="relative flex justify-between items-end z-10">
                    <div className="relative">
                        <Character name="Defense Counsel" title="For the Defendant" isActive={activeSpeaker === 'defense'} isUser={userRole === 'defense'} textColor={currentTheme.characterTextColor} titleColor={currentTheme.titleTextColor} />
                        <SpeechBubble text={dialogue} isVisible={activeSpeaker === 'defense'} side="left"/>
                    </div>
                     <div className="relative">
                        <Character name="Prosecution" title="For the State" isActive={activeSpeaker === 'prosecution'} isUser={userRole === 'prosecution'} textColor={currentTheme.characterTextColor} titleColor={currentTheme.titleTextColor} />
                        <SpeechBubble text={dialogue} isVisible={activeSpeaker === 'prosecution'} side="right"/>
                    </div>
                </div>
            </div>
            
            { isUserTurn && !isVerdict && (
                inputMode === 'text' ? (
                    <UserInput onSubmit={onSubmitArgument} isLoading={isLoading} />
                ) : (
                    <VoiceInput onToggleListening={onToggleListening} isListening={isListening} transcript={transcript} />
                )
            )}
            
            { isLoading && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-slate-400 z-20 bg-black/30 p-2 rounded-lg">
                    <Spinner className="w-4 h-4" />
                    <span>AI is thinking...</span>
                </div>
            ) }

            {isVerdict && (
                 <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center z-30 animate-fade-in p-4">
                    <GavelIcon className="w-24 h-24 text-white animate-gavel-strike" />
                    <h2 className="text-5xl font-extrabold mt-4 text-center">VERDICT REACHED</h2>
                    <p className="mt-2 text-slate-300 text-center">The simulation has concluded.</p>
                    
                    {verdictReasoning && (
                        <div className="mt-6 max-w-2xl w-full text-center bg-brand-dark/50 p-4 rounded-lg border border-slate-600">
                            <h4 className="font-semibold text-lg text-amber-300 mb-2">Judge's Reasoning</h4>
                            <p className="text-slate-200">{verdictReasoning}</p>
                        </div>
                    )}

                    <button onClick={onEndSession} className="mt-8 bg-brand-accent text-white font-bold py-3 px-8 rounded-full hover:bg-sky-400 transition-colors">
                        Return to Scenarios
                    </button>
                </div>
            )}
             <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                
                @keyframes gavel-strike {
                    0% { transform: rotate(-30deg) scale(0.8); opacity: 0; }
                    50% { transform: rotate(10deg) scale(1.1); opacity: 1; }
                    70% { transform: rotate(-5deg) scale(1); }
                    100% { transform: rotate(0deg) scale(1); }
                }
                .animate-gavel-strike { animation: gavel-strike 0.7s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards; }

                @keyframes bubble-up {
                    from { transform: translateY(8px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-bubble-up { animation: bubble-up 0.3s ease-out forwards; }
                
                @keyframes bubble-down {
                    from { transform: translateY(-8px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-bubble-down { animation: bubble-down 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};