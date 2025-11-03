import React from 'react';
import type { User } from '../../types';
import type { View } from '../../constants';
import { BotIcon, LocatorIcon, CourtroomIcon, DocumentIcon } from '../../components/Icons';

interface DashboardProps {
  user: User;
  navigateTo: (view: View) => void;
}

const QuickActionCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white dark:bg-brand-medium p-6 rounded-2xl shadow-lg hover:shadow-2xl border border-transparent hover:border-brand-accent/60 cursor-pointer transition-all duration-300 group flex items-start space-x-5 hover:scale-[1.03]"
        style={{ minHeight: 120 }}
    >
        <div className="bg-brand-light dark:bg-slate-700 p-4 rounded-xl text-brand-accent group-hover:scale-110 transition-transform text-2xl flex items-center justify-center">
            {icon}
        </div>
        <div>
            <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-1">{title}</h3>
            <p className="text-base text-slate-500 dark:text-slate-300 mt-1 leading-snug">{description}</p>
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, navigateTo }) => {
    const quickActions = [
        { view: 'chatbot', title: 'AI Chatbot', description: 'Ask complex legal questions and get instant answers.', icon: <BotIcon className="w-7 h-7" /> },
        { view: 'locator', title: 'Expert Locator', description: 'Find lawyers, legal experts, or aid near you.', icon: <LocatorIcon className="w-7 h-7" /> },
        { view: 'courtroom', title: 'Virtual Courtroom', description: 'Practice your legal arguments in a simulated environment.', icon: <CourtroomIcon className="w-7 h-7" /> },
        { view: 'generator', title: 'Document Generator', description: 'Draft legal documents with AI assistance.', icon: <DocumentIcon className="w-7 h-7" /> },
    ];
    const featureHighlights = [
        {
            title: 'AI-Powered Legal Help',
            description: 'Get reliable legal information and draft documents instantly with advanced AI.',
            icon: <BotIcon className="w-6 h-6 text-brand-accent" />,
        },
        {
            title: 'Expert Network',
            description: 'Connect with verified legal professionals and experts across India.',
            icon: <LocatorIcon className="w-6 h-6 text-brand-accent" />,
        },
        {
            title: 'Virtual Courtroom',
            description: 'Practice, learn, and simulate real court scenarios for better preparation.',
            icon: <CourtroomIcon className="w-6 h-6 text-brand-accent" />,
        },
        {
            title: 'Accessible to All',
            description: 'Democratizing justice by making legal help accessible regardless of background or location.',
            icon: <DocumentIcon className="w-6 h-6 text-brand-accent" />,
        },
    ];
    const recentActivity = user.generatedDocuments.slice(0, 3);

    return (
        <div className="p-4 md:p-8 space-y-10">
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-brand-accent/10 to-brand-secondary/10 rounded-3xl p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-brand-dark dark:text-white mb-4 leading-tight">
                        Satyavāk: AI-Powered Legal Platform
                    </h1>
                    <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 mb-6 max-w-2xl">
                        Empowering every Indian with instant, reliable, and accessible legal assistance. Draft documents, connect with experts, and practice in a virtual courtroom—all in one place.
                    </p>
                    <button
                        className="bg-brand-accent hover:bg-brand-accent-dark text-white font-semibold py-3 px-7 rounded-xl shadow-md transition-colors text-lg"
                        onClick={() => navigateTo('chatbot')}
                    >
                        Get Started
                    </button>
                </div>
                {/* Illustration removed as requested */}
            </section>

            {/* Feature Highlights */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featureHighlights.map((feature, idx) => (
                    <div key={idx} className="bg-white dark:bg-brand-medium rounded-2xl shadow-card p-6 flex flex-col items-start gap-3 border border-slate-100 dark:border-slate-800">
                        <div className="p-3 rounded-lg bg-brand-light dark:bg-slate-700 mb-2">
                            {feature.icon}
                        </div>
                        <h4 className="text-lg font-bold text-brand-dark dark:text-white">{feature.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{feature.description}</p>
                    </div>
                ))}
            </section>

           

            {/* Recent Documents & Info Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white dark:bg-brand-medium rounded-2xl shadow-card p-8">
                    <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4">Recent Documents</h3>
                    {recentActivity.length > 0 ? (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                            {recentActivity.map(doc => (
                                <li key={doc.id} className="py-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-dark dark:text-white">{doc.docType}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Generated on {new Date(doc.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigateTo('profile')}
                                        className="text-sm font-semibold text-brand-accent hover:text-brand-accent-dark"
                                    >
                                        View
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                            You haven't generated any documents yet.
                        </p>
                    )}
                </div>
                <div className="bg-gradient-to-br from-brand-accent to-brand-secondary rounded-2xl shadow-card p-8 text-white flex flex-col justify-between min-h-[260px]">
                    <div>
                        <h3 className="text-2xl font-extrabold">Democratizing Justice</h3>
                        <p className="mt-2 opacity-90 text-base">
                            Satyavāk is designed to make legal information accessible to everyone in India, regardless of their background or location.
                        </p>
                    </div>
                    <button onClick={() => navigateTo('casestudies')} className="mt-6 bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        Learn More
                    </button>
                </div>
            </div>
        </div>
    );
};