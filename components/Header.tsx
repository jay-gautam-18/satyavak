import React from 'react';
import type { User } from '../types';
import type { View } from '../constants';
import { BackIcon, LogoutIcon, NotificationIcon, SettingsIcon } from './Icons';

interface HeaderProps {
    user: User;
    onNavigate: (view: View) => void;
    onBack: () => void;
    currentView: View;
    onLogout: () => void;
    unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({ user, onNavigate, onBack, currentView, onLogout, unreadCount }) => (
    <header className="bg-white dark:bg-brand-medium shadow-subtle p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-4">
            {currentView !== 'dashboard' && (
                <button onClick={onBack} className="p-2 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Go back">
                    <BackIcon className="w-6 h-6" />
                </button>
            )}
            <h1 className="text-xl font-bold text-brand-dark dark:text-white">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1).replace('casestudies', 'Case Studies')}
            </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
            <button
                onClick={() => onNavigate('notifications')}
                className="relative p-2 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="View notifications"
            >
                <NotificationIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                        {unreadCount}
                    </span>
                )}
            </button>
            <button
                onClick={() => onNavigate('settings')}
                className="p-2 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Open settings"
            >
                <SettingsIcon className="w-6 h-6" />
            </button>
            <button onClick={() => onNavigate('profile')} aria-label="View profile">
                <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-brand-medium ring-brand-accent hover:opacity-80 transition-opacity"/>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-600"></div>
            <button
                onClick={onLogout}
                className="p-2 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Logout"
            >
                <LogoutIcon className="w-6 h-6" />
            </button>
        </div>
    </header>
);