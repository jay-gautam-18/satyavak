import React, { useState } from 'react';
import type { User } from '../../types';
import { Spinner } from '../../components/Spinner';
import { api } from '../../src/services/api';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (isRegister && !name.trim()) {
            setError('Please enter your full name.');
            return;
        }
        if (!password || password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);
        try {
            let userData: { id: string; email: string; name: string; role: string };
            
            if (isRegister) {
                // Try to register
                userData = await api.register({ email: email.trim(), name: name.trim(), password }) as any;
            } else {
                // Try to login first
                try {
                    userData = await api.login({ email: email.trim(), password }) as any;
                } catch (loginError: any) {
                    // If login fails with "Invalid credentials", try to auto-register
                    if (loginError.message?.includes('Invalid credentials')) {
                        // Auto-register with email as name if name not provided
                        const autoName = name.trim() || email.trim().split('@')[0];
                        try {
                            userData = await api.register({ email: email.trim(), name: autoName, password }) as any;
                        } catch (regError: any) {
                            // If registration fails with "Email already in use", try login again
                            if (regError.message?.includes('Email already in use')) {
                                throw new Error('Email already registered. Please use the correct password to login.');
                            }
                            throw regError;
                        }
                    } else {
                        throw loginError;
                    }
                }
            }

            // Verify user by fetching profile (optional, but ensures data is saved)
            try {
                const verifiedUser = await api.me() as any;
                userData = { ...userData, ...verifiedUser };
            } catch {
                // If me() fails, use the data from login/register
                console.warn('Could not verify user profile, using login/register data');
            }

            // Convert server user to client User type
            const clientUser: User = {
                name: userData.name,
                email: userData.email,
                avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.name)}`,
                generatedDocuments: [],
            };
            
            onLogin(clientUser);
        } catch (err: any) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-dark via-brand-dark to-slate-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md text-center">
                <h1 className="text-5xl font-bold text-white mb-2">Satyavāk</h1>
                <p className="text-brand-accent mb-8">AI-Powered Legal Assistance for All</p>

                <div className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/10">
                    <h2 className="text-2xl font-semibold text-white mb-6">
                        {isRegister ? 'Create Your Account' : 'Login to Your Account'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="sr-only">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Email Address"
                                className="w-full p-3 bg-white/5 text-white rounded-lg border border-white/20 focus:ring-2 focus:ring-brand-accent focus:outline-none transition-colors placeholder:text-slate-400"
                                disabled={isLoading}
                                aria-required="true"
                            />
                        </div>
                        {isRegister && (
                            <div>
                                <label htmlFor="name" className="sr-only">Full Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Full Name"
                                    className="w-full p-3 bg-white/5 text-white rounded-lg border border-white/20 focus:ring-2 focus:ring-brand-accent focus:outline-none transition-colors placeholder:text-slate-400"
                                    disabled={isLoading}
                                    aria-required="true"
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password (min 8 characters)"
                                className="w-full p-3 bg-white/5 text-white rounded-lg border border-white/20 focus:ring-2 focus:ring-brand-accent focus:outline-none transition-colors placeholder:text-slate-400"
                                disabled={isLoading}
                                aria-required="true"
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-accent-dark disabled:bg-slate-500 transition-colors flex items-center justify-center"
                        >
                            {isLoading ? <Spinner className="w-6 h-6" /> : (isRegister ? 'Sign Up' : 'Login')}
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError('');
                            }}
                            className="text-brand-accent hover:text-brand-accent-dark text-sm transition-colors"
                            disabled={isLoading}
                        >
                            {isRegister 
                                ? 'Already have an account? Login' 
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-6">
                    {isRegister 
                        ? 'By signing up, you agree to our terms of service and privacy policy.'
                        : 'New users will be automatically registered on first login.'}
                </p>
            </div>
        </div>
    );
};