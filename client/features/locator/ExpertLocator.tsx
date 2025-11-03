import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ExpertLocationResult } from '../../types';
import { findLegalAid, translateText } from '../../services/geminiService';
import { LANGUAGE_MAP } from '../../constants';
import { Spinner } from '../../components/Spinner';
import { StarIcon, PhoneIcon, MapPinIcon, RouteIcon, HistoryIcon, ChevronDownIcon, SearchIcon } from '../../components/Icons';

const HISTORY_KEY = 'satyavak_locator_history';

const ResultCard: React.FC<{ result: ExpertLocationResult }> = ({ result }) => (
    <div className="bg-white dark:bg-brand-medium rounded-xl shadow-card p-6 border border-slate-200 dark:border-slate-700 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
        <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-2">{result.title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex-grow">{result.description}</p>
        <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-4 mt-auto">
            <div className="flex items-center gap-3">
                <StarIcon className="w-5 h-5 text-amber-400" />
                <span className="font-medium">{result.rating > 0 ? `${result.rating.toFixed(1)} / 5.0` : 'No rating'}</span>
            </div>
            <div className="flex items-center gap-3">
                <RouteIcon className="w-5 h-5 text-sky-500" />
                <span className="font-medium">{result.distance}</span>
            </div>
            {result.contactNumber && (
                <div className="flex items-center gap-3">
                    <PhoneIcon className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{result.contactNumber}</span>
                </div>
            )}
        </div>
        <a href={result.mapUri} target="_blank" rel="noopener noreferrer" className="mt-4 bg-brand-secondary text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-brand-secondary-dark transition-colors flex items-center justify-center gap-2 text-sm">
            <MapPinIcon className="w-5 h-5"/>
            View on Map
        </a>
    </div>
);

export const ExpertLocator: React.FC<{ language: string }> = ({ language }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState('');
    const [locations, setLocations] = useState<ExpertLocationResult[] | null>(null);
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'distance'>('relevance');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (err) => {
                console.warn("Geolocation permission denied.", err);
            }
        );

        try {
            const storedHistory = localStorage.getItem(HISTORY_KEY);
            if (storedHistory) {
                setSearchHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to load search history:", error);
        }
    }, []);

    useEffect(() => {
        if (searchHistory.length > 0) {
            try {
                localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
            } catch (error) {
                console.error("Failed to save search history:", error);
            }
        }
    }, [searchHistory]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearch = async (searchQuery: string) => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) return;

        setQuery(trimmedQuery);
        setIsLoading(true);
        setError('');
        setSummary('');
        setLocations(null);
        setHasSearched(true);
        
        try {
            const englishQuery = language === 'English' ? trimmedQuery : await translateText(trimmedQuery, 'English');
            const { summary: englishSummary, locations: englishLocations } = await findLegalAid(englishQuery, location);

            if (language === 'English' || (!englishSummary && englishLocations.length === 0)) {
                setSummary(englishSummary);
                setLocations(englishLocations);
            } else {
                const translationPromises: [Promise<string>, Promise<ExpertLocationResult[]>] = [
                    englishSummary ? translateText(englishSummary, LANGUAGE_MAP[language]) : Promise.resolve(''),
                    Promise.all(englishLocations.map(async (loc) => ({
                        ...loc,
                        title: await translateText(loc.title, LANGUAGE_MAP[language]),
                    })))
                ];

                const [translatedSummary, translatedLocations] = await Promise.all(translationPromises);
                
                setSummary(translatedSummary);
                setLocations(translatedLocations);
            }
            
            setSearchHistory(prev => {
                const lowerCaseQuery = trimmedQuery.toLowerCase();
                const filtered = prev.filter(item => item.toLowerCase() !== lowerCaseQuery);
                const updated = [trimmedQuery, ...filtered].slice(0, 5);
                return updated;
            });

        } catch (err: any) {
            console.error("Error finding legal aid:", err);
            const displayError = err.message || "Sorry, something went wrong. Please try again.";
            setError(displayError);
        } finally {
            setIsLoading(false);
        }
    };

    const sortedLocations = useMemo(() => {
        if (!locations) return null;

        const locationsCopy = [...locations];

        switch (sortBy) {
            case 'rating':
                locationsCopy.sort((a, b) => b.rating - a.rating);
                break;
            case 'distance':
                const parseDistance = (distStr: string): number => parseFloat(distStr.split(' ')[0]) || 999;
                locationsCopy.sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance));
                break;
            case 'relevance':
            default:
                // Do nothing, keep original order
                break;
        }

        return locationsCopy;
    }, [locations, sortBy]);
    
    const suggestedSearches = [
        "Family law advocates",
        "Public notaries",
        "Free legal aid for tenants",
        "District consumer court"
    ];
    
    const sortOptions: { [key in typeof sortBy]: string } = {
        relevance: 'Relevance',
        rating: 'Rating (High to Low)',
        distance: 'Distance (Nearest)',
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-8">
                    <Spinner className="w-10 h-10 mx-auto text-brand-accent"/>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Finding experts near you...</p>
                </div>
            );
        }
        if (error) {
             return <p className="text-red-500 text-center">{error}</p>;
        }
        if (sortedLocations) {
            if (sortedLocations.length > 0) {
                return (
                    <div>
                        {summary && (
                            <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
                                <h3 className="text-xl font-semibold text-brand-dark dark:text-white mb-3">AI Summary</h3>
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{summary}</p>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                            <h3 className="text-2xl font-semibold text-brand-dark dark:text-white">Nearby Locations Found</h3>
                             <div className="mt-4 sm:mt-0 relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="inline-flex justify-between items-center w-full sm:w-56 rounded-lg border border-slate-300 dark:border-slate-600 shadow-subtle px-4 py-2 bg-white dark:bg-brand-medium text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-brand-medium focus:ring-brand-accent"
                                    aria-haspopup="true"
                                    aria-expanded={isDropdownOpen}
                                >
                                    Sort by: {sortOptions[sortBy]}
                                    <ChevronDownIcon className={`-mr-1 ml-2 h-5 w-5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isDropdownOpen && (
                                    <div
                                        className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-brand-medium ring-1 ring-black ring-opacity-5 focus:outline-none z-10 transition ease-out duration-100"
                                        role="menu"
                                        aria-orientation="vertical"
                                    >
                                        <div className="py-1" role="none">
                                            {Object.entries(sortOptions).map(([key, label]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        setSortBy(key as 'relevance' | 'rating' | 'distance');
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`${
                                                        sortBy === key ? 'font-semibold text-brand-accent' : 'text-slate-700 dark:text-slate-200'
                                                    } block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700`}
                                                    role="menuitem"
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedLocations.map((res, i) => <ResultCard key={`${res.title}-${i}`} result={res} />)}
                        </div>
                    </div>
                );
            } else {
                 return (
                    <div className="text-center py-8">
                         {summary && (
                            <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto">
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{summary}</p>
                            </div>
                        )}
                        <p className="text-slate-600 dark:text-slate-400">No specific locations were found for your query. Try a broader search term.</p>
                    </div>
                );
            }
        }
        return null;
    };


    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {!hasSearched ? (
                <div className="text-center py-16">
                    <h2 className="text-5xl font-extrabold text-brand-dark dark:text-white mb-4">Find Legal Experts Near You</h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto">Whether you need a lawyer, a notary, or a free legal aid center, we're here to help you find the right support in your area.</p>
                    <div className="max-w-xl mx-auto">
                        <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} className="relative mb-4">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g., 'need help with a property dispute'"
                                className="w-full p-4 pl-12 border border-slate-300 dark:border-slate-600 rounded-full focus:ring-2 focus:ring-brand-accent focus:outline-none shadow-subtle dark:bg-brand-medium dark:text-white"
                            />
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                             <button type="submit" disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-accent text-white font-bold py-2.5 px-6 rounded-full hover:bg-brand-accent-dark disabled:bg-slate-300">
                                Search
                            </button>
                        </form>

                        <div className="flex flex-wrap justify-center gap-2">
                           {suggestedSearches.map(s => (
                               <button key={s} onClick={() => handleSearch(s)} className="text-sm bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
                                   {s}
                               </button>
                           ))}
                        </div>
                        {searchHistory.length > 0 && (
                            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700">
                                <h4 className="text-md font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center justify-center gap-2">
                                    <HistoryIcon className="w-5 h-5"/>
                                    Recent Searches
                                </h4>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {searchHistory.map(s => (
                                        <button key={s} onClick={() => handleSearch(s)} className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full hover:bg-indigo-200 transition-colors dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900">
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <h2 className="text-3xl font-bold text-brand-dark dark:text-white mb-2">Expert Locator</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">Describe your legal issue to find nearby help.</p>
                     <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} className="flex items-center gap-2 mb-8">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., 'need help with a property dispute'"
                            className="flex-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none dark:bg-brand-medium dark:text-white dark:border-slate-600"
                        />
                        <button type="submit" disabled={isLoading} className="bg-brand-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-accent-dark disabled:bg-slate-300 flex items-center justify-center">
                            {isLoading ? <Spinner className="w-5 h-5"/> : 'Search'}
                        </button>
                    </form>
                    {renderContent()}
                </>
            )}
        </div>
    );
};