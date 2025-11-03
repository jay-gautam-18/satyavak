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
    className="bg-white dark:bg-brand-medium p-6 rounded-xl shadow-card hover:shadow-card-hover border border-transparent hover:border-brand-accent/50 cursor-pointer transition-all duration-300 group flex items-start space-x-4"
  >
    <div className="bg-brand-light dark:bg-slate-700 p-3 rounded-lg text-brand-accent group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-semibold text-brand-dark dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, navigateTo }) => {

    const quickActions = [
        { view: 'chatbot', title: 'AI Chatbot', description: 'Ask complex legal questions.', icon: <BotIcon className="w-6 h-6" /> },
        { view: 'locator', title: 'Expert Locator', description: 'Find lawyers or aid near you.', icon: <LocatorIcon className="w-6 h-6" /> },
        { view: 'courtroom', title: 'Virtual Courtroom', description: 'Practice your legal arguments.', icon: <CourtroomIcon className="w-6 h-6" /> },
        { view: 'generator', title: 'Document Generator', description: 'Draft legal documents.', icon: <DocumentIcon className="w-6 h-6" /> },
    ];
    
    const recentActivity = user.generatedDocuments.slice(0, 3);

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div>
                <h2 className="text-3xl md:text-4xl font-bold text-brand-dark dark:text-white">
                    Welcome back, {user.name.split(' ')[0]}!
                </h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400 text-lg">
                    How can Satyavāk help you today?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickActions.map(action => (
                    <QuickActionCard 
                        key={action.view}
                        title={action.title}
                        description={action.description}
                        icon={action.icon}
                        onClick={() => navigateTo(action.view as View)}
                    />
                ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white dark:bg-brand-medium rounded-xl shadow-card p-6">
                     <h3 className="text-xl font-semibold text-brand-dark dark:text-white mb-4">Recent Documents</h3>
                     {recentActivity.length > 0 ? (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                             {recentActivity.map(doc => (
                                <li key={doc.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-brand-dark dark:text-white">{doc.docType}</p>
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

                <div className="bg-gradient-to-br from-brand-accent to-brand-secondary rounded-xl shadow-card p-8 text-white">
                     <h3 className="text-2xl font-bold">Democratizing Justice</h3>
                     <p className="mt-2 opacity-90 text-sm">
                        Satyavāk is designed to make legal information accessible to everyone in India, regardless of their background or location.
                     </p>
                     <button onClick={() => navigateTo('casestudies')} className="mt-6 bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        Learn More
                     </button>
                </div>
            </div>
        </div>
    );
};