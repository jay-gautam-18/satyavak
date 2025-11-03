import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { LegalNewsArticle } from '../../types';
import { getLegalNews, getRelatedNews, translateText } from '../../services/geminiService';
import { LANGUAGE_MAP } from '../../constants';
import { Spinner } from '../../components/Spinner';
import { BackIcon, HistoryIcon, StarIcon, StarOutlineIcon, DownloadIcon } from '../../components/Icons';

// Define keys for localStorage caching
const NEWS_CACHE_KEY_ENGLISH = 'satyavak_news_cache_english';
const LATEST_NEWS_KEY_ENGLISH = 'satyavak_latest_news_cache_english';
const FAVORITES_KEY = 'satyavak_news_favorites';

// Define a new interface to hold both original and translated article data
interface DisplayableArticle {
    display: LegalNewsArticle; // Translated version for UI
    original: LegalNewsArticle; // English version for API calls and caching
}

export const CaseStudiesNews: React.FC<{ language: string }> = ({ language }) => {
    const [query, setQuery] = useState('latest Indian supreme court judgements');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [results, setResults] = useState<DisplayableArticle[] | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<DisplayableArticle | null>(null);
    const [relatedArticles, setRelatedArticles] = useState<DisplayableArticle[]>([]);
    const [isRelatedLoading, setIsRelatedLoading] = useState(false);
    const [newArticlesAvailable, setNewArticlesAvailable] = useState(false);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'all' | 'favorites'>('all');

    useEffect(() => {
        try {
            const storedFavoritesJson = localStorage.getItem(FAVORITES_KEY);
            if (storedFavoritesJson) {
                setFavorites(new Set(JSON.parse(storedFavoritesJson)));
            }
        } catch (e) {
            console.error("Failed to load favorites from storage", e);
        }
    }, []);

    const handleToggleFavorite = (headline: string) => {
        const newFavorites = new Set(favorites);
        if (newFavorites.has(headline)) {
            newFavorites.delete(headline);
        } else {
            newFavorites.add(headline);
        }
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(newFavorites)));
        setFavorites(newFavorites);
    };

    const handleDownloadArticle = (article: DisplayableArticle) => {
        const { display } = article;
        const content = `
    Headline: ${display.headline}
    Publisher: ${display.publisher}
    Date: ${new Date(display.date).toLocaleDateString()}
    
    Summary:
    ${display.summary}
    
    Detailed Brief:
    ${display.detailedBrief}
    
    Key Points:
    ${display.keyPoints.map(p => `- ${p}`).join('\n')}
    
    Sources:
    ${(display.sources || []).map(s => `- ${s.title || 'N/A'}: ${s.uri}`).join('\n')}
        `.trim();
    
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${display.headline.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    // Helper function to translate an array of articles
    const createDisplayableArticles = useCallback(async (articles: LegalNewsArticle[], currentFavorites: Set<string>): Promise<DisplayableArticle[]> => {
        if (!articles) return [];
        const displayablePromises = articles.map(async (originalArticle) => {
            const isFavorite = currentFavorites.has(originalArticle.headline);
            const originalWithFav = { ...originalArticle, isFavorite };

            if (language === 'English') {
                return { display: originalWithFav, original: originalWithFav };
            }
            const displayArticle = {
                ...originalWithFav,
                headline: await translateText(originalArticle.headline, LANGUAGE_MAP[language]),
                summary: await translateText(originalArticle.summary, LANGUAGE_MAP[language]),
                detailedBrief: await translateText(originalArticle.detailedBrief, LANGUAGE_MAP[language]),
                keyPoints: await Promise.all(originalArticle.keyPoints.map(p => translateText(p, LANGUAGE_MAP[language]))),
            };
            return { display: displayArticle, original: originalWithFav };
        });
        return Promise.all(displayablePromises);
    }, [language]);

    // Function to fetch news, used for both initial load and user search
    const handleSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) return;
        setIsLoading(true);
        setError('');
        setSelectedArticle(null);
        setRelatedArticles([]);
        try {
            const englishQuery = language === 'English' ? searchQuery : await translateText(searchQuery, 'English');
            const englishResponse = await getLegalNews(englishQuery);
            
            localStorage.setItem(NEWS_CACHE_KEY_ENGLISH, JSON.stringify(englishResponse));

            const displayableResults = await createDisplayableArticles(englishResponse, favorites);
            setResults(displayableResults);
        } catch (err) {
            console.error("Error fetching legal news:", err);
            setError("Sorry, something went wrong while fetching news. Please try again.");
            if (!results) setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [language, createDisplayableArticles, favorites, results]);
    
    useEffect(() => {
        setResults(prevResults => {
            if (!prevResults) return null;
            const needsUpdate = prevResults.some(article => {
                const isFav = favorites.has(article.original.headline);
                return article.original.isFavorite !== isFav;
            });
            if (!needsUpdate) return prevResults;
            return prevResults.map(article => ({
                ...article,
                original: {
                    ...article.original,
                    isFavorite: favorites.has(article.original.headline)
                },
                display: {
                    ...article.display,
                    isFavorite: favorites.has(article.original.headline)
                }
            }));
        });
    }, [favorites]);

    // Main effect for initial data loading and setting up background fetch
    useEffect(() => {
        const loadInitialData = async () => {
            let initialSearchPerformed = false;
            try {
                const cachedEnglishNewsJson = localStorage.getItem(NEWS_CACHE_KEY_ENGLISH);
                if (cachedEnglishNewsJson) {
                    const cachedEnglishNews = JSON.parse(cachedEnglishNewsJson);
                    if (cachedEnglishNews.length > 0) {
                        const displayableCache = await createDisplayableArticles(cachedEnglishNews, favorites);
                        setResults(displayableCache);
                        setIsLoading(false); 
                        handleSearch(query);
                        initialSearchPerformed = true;
                    }
                }
            } catch (e) {
                console.error("Failed to load news from cache", e);
            }

             if (!initialSearchPerformed) {
                setIsLoading(true);
                handleSearch(query);
            }

            if (localStorage.getItem(LATEST_NEWS_KEY_ENGLISH)) {
                setNewArticlesAvailable(true);
            }
        };

        const backgroundFetch = async () => {
            try {
                const mainCacheJson = localStorage.getItem(NEWS_CACHE_KEY_ENGLISH);
                const mainCache: LegalNewsArticle[] = mainCacheJson ? JSON.parse(mainCacheJson) : [];
                const existingHeadlines = new Set(mainCache.map(a => a.headline));
                const newEnglishArticles = await getLegalNews('latest Indian supreme court judgements');
                const uniqueNewArticles = newEnglishArticles.filter(a => !existingHeadlines.has(a.headline));
                if (uniqueNewArticles.length > 0) {
                    const latestCacheJson = localStorage.getItem(LATEST_NEWS_KEY_ENGLISH);
                    const latestCache: LegalNewsArticle[] = latestCacheJson ? JSON.parse(latestCacheJson) : [];
                    const combinedNew = [...uniqueNewArticles, ...latestCache];
                    const uniqueCombined = Array.from(new Map(combinedNew.map(item => [item.headline, item])).values());
                    localStorage.setItem(LATEST_NEWS_KEY_ENGLISH, JSON.stringify(uniqueCombined));
                    setNewArticlesAvailable(true);
                }
            } catch (err) {
                console.error("Background news fetch failed:", err);
            }
        };

        loadInitialData();
        const intervalId = setInterval(backgroundFetch, 5 * 60 * 1000); // 5 minutes
        return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createDisplayableArticles, favorites]); 


    const handleLoadNewArticles = async () => {
        const latestEnglishJson = localStorage.getItem(LATEST_NEWS_KEY_ENGLISH);
        if (!latestEnglishJson) return;

        try {
            const newEnglishArticles: LegalNewsArticle[] = JSON.parse(latestEnglishJson);
            const newDisplayableArticles = await createDisplayableArticles(newEnglishArticles, favorites);
            setResults(prevResults => [...newDisplayableArticles, ...(prevResults || [])]);
            const mainCacheJson = localStorage.getItem(NEWS_CACHE_KEY_ENGLISH);
            const mainCache: LegalNewsArticle[] = mainCacheJson ? JSON.parse(mainCacheJson) : [];
            const combinedEnglishCache = [...newEnglishArticles, ...mainCache];
            const uniqueCombined = Array.from(new Map(combinedEnglishCache.map(item => [item.headline, item])).values());
            localStorage.setItem(NEWS_CACHE_KEY_ENGLISH, JSON.stringify(uniqueCombined));
            localStorage.removeItem(LATEST_NEWS_KEY_ENGLISH);
            setNewArticlesAvailable(false);
        } catch (e) {
            console.error("Failed to load new articles:", e);
        }
    };

    const handleSelectArticle = async (article: DisplayableArticle) => {
        setSelectedArticle(article);
        setRelatedArticles([]);
        setIsRelatedLoading(true);
        try {
            const related = await getRelatedNews(article.original.headline);
            const displayableRelated = await createDisplayableArticles(related, favorites);
            setRelatedArticles(displayableRelated);
        } catch (err) {
            console.error("Failed to fetch related articles:", err);
        } finally {
            setIsRelatedLoading(false);
        }
    };

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(query);
    };

    const handleBackToList = () => {
        setSelectedArticle(null);
        setRelatedArticles([]);
    }
    
    const filteredResults = useMemo(() => {
        if (!results) return null;
        if (filter === 'favorites') {
            return results.filter(r => r.original.isFavorite);
        }
        return results;
    }, [results, filter]);

    // Render logic (list view)
    const renderListView = () => (
        <>
            <h2 className="text-3xl font-bold text-brand-dark dark:text-white mb-2">Case Studies & Trending News</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Explore summaries of landmark cases and the latest legal developments.</p>
            <form onSubmit={submitSearch} className="flex flex-col sm:flex-row items-center gap-2 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., 'recent privacy law changes'"
                    className="flex-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-accent focus:outline-none dark:bg-brand-medium dark:text-white dark:border-slate-600"
                />
                <button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-brand-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-accent-dark disabled:bg-slate-300 flex items-center justify-center">
                    {isLoading && !results ? <Spinner /> : 'Search'}
                </button>
            </form>
            
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 rounded-lg p-1 bg-slate-200 dark:bg-slate-700">
                    <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${filter === 'all' ? 'bg-white dark:bg-brand-medium text-brand-dark dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>All News</button>
                    <button onClick={() => setFilter('favorites')} className={`px-4 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors ${filter === 'favorites' ? 'bg-white dark:bg-brand-medium text-brand-dark dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
                        <StarIcon className="w-4 h-4 text-amber-400"/> Favorites
                    </button>
                </div>
                {newArticlesAvailable && (
                    <button onClick={handleLoadNewArticles} className="bg-brand-secondary text-white font-semibold py-2 px-3 rounded-lg hover:bg-brand-secondary-dark transition-colors flex items-center justify-center gap-2 text-sm">
                        <HistoryIcon className="w-4 h-4"/>
                        Load New
                    </button>
                )}
            </div>

            {error && <p className="text-red-500 text-center">{error}</p>}

            {isLoading && !filteredResults && (
                <div className="flex justify-center items-center p-8">
                    <Spinner className="w-10 h-10 text-brand-accent" />
                    <p className="ml-4 text-slate-600 dark:text-slate-400">Fetching the latest legal news...</p>
                </div>
            )}
            
            {filteredResults && filteredResults.length === 0 && !isLoading && (
                 <p className="text-center text-slate-600 dark:text-slate-400 py-8">
                    {filter === 'favorites' ? "You haven't favorited any articles yet." : "No results found for your query."}
                </p>
            )}

            {filteredResults && filteredResults.length > 0 && (
                <div className="space-y-4">
                    {filteredResults.map((article) => (
                         <div key={article.original.headline} onClick={() => handleSelectArticle(article)} className="bg-white dark:bg-brand-medium p-6 rounded-xl shadow-card w-full border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-start mb-2 gap-4">
                                <h3 className="text-xl font-bold text-brand-dark dark:text-white pr-4">{article.display.headline}</h3>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 whitespace-nowrap">{new Date(article.display.date).toLocaleDateString()}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(article.original.headline); }} className="text-slate-400 hover:text-amber-500" aria-label="Toggle favorite">
                                        {article.original.isFavorite ? <StarIcon className="w-5 h-5 text-amber-400"/> : <StarOutlineIcon className="w-5 h-5"/>}
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 mb-3">{article.display.summary}</p>
                            <span className="text-sm font-semibold text-brand-secondary">{article.display.publisher}</span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // Render logic (detail view)
    const renderDetailView = () => {
        if (!selectedArticle) return null;
        const articleDisplay = selectedArticle.display;
        return (
             <div className="bg-white dark:bg-brand-medium p-6 rounded-xl shadow-card border dark:border-slate-700">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <button onClick={handleBackToList} className="flex items-center gap-2 text-brand-secondary hover:underline font-semibold">
                        <BackIcon className="w-5 h-5"/>
                        Back to News Feed
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleFavorite(selectedArticle.original.headline)} className="flex items-center gap-2 text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-2 rounded-lg transition-colors">
                            {selectedArticle.original.isFavorite ? <StarIcon className="w-5 h-5 text-amber-400"/> : <StarOutlineIcon className="w-5 h-5"/>}
                            {selectedArticle.original.isFavorite ? 'Favorited' : 'Favorite'}
                        </button>
                        <button onClick={() => handleDownloadArticle(selectedArticle)} className="flex items-center gap-2 text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-2 rounded-lg transition-colors">
                            <DownloadIcon className="w-5 h-5"/>
                            Download
                        </button>
                    </div>
                </div>

                <h2 className="text-4xl font-extrabold text-brand-dark dark:text-white mb-3">{articleDisplay.headline}</h2>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-6 border-b pb-4 dark:border-slate-700">
                    <span>Published by: <strong>{articleDisplay.publisher}</strong></span>
                    <span className="mx-3">|</span>
                    <span>Date: <strong>{new Date(articleDisplay.date).toLocaleDateString()}</strong></span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h3 className="text-2xl font-bold text-brand-dark dark:text-white mb-4">Detailed Brief</h3>
                        <div className="prose prose-lg max-w-none text-slate-800 dark:prose-invert whitespace-pre-wrap">
                            {articleDisplay.detailedBrief}
                        </div>
                    </div>
                    <div>
                         <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4 sticky top-20">Key Points</h3>
                         <ul className="space-y-3 sticky top-32">
                            {articleDisplay.keyPoints.map((point, i) => (
                                <li key={i} className="bg-sky-50 dark:bg-sky-900/50 p-4 rounded-lg border-l-4 border-sky-400 dark:border-sky-700 text-sky-800 dark:text-sky-300 shadow-sm">
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {articleDisplay.sources && articleDisplay.sources.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="text-2xl font-bold text-brand-dark dark:text-white mb-4">Sources</h3>
                        <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                            {articleDisplay.sources.map((source, index) => (
                                <li key={index}>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-2xl font-bold text-brand-dark dark:text-white mb-4">Related News & Cases</h3>
                    {isRelatedLoading && (
                        <div className="flex items-center text-slate-500 dark:text-slate-400">
                            <Spinner className="w-5 h-5 mr-3"/>
                            <span>Finding related articles...</span>
                        </div>
                    )}
                    {!isRelatedLoading && relatedArticles.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {relatedArticles.map((related, index) => (
                                <div key={index} onClick={() => handleSelectArticle(related)} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
                                    <h4 className="font-semibold text-brand-dark dark:text-white mb-1">{related.display.headline}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{related.display.publisher}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {!isRelatedLoading && relatedArticles.length === 0 && (
                        <p className="text-slate-500 dark:text-slate-400">No related articles were found.</p>
                    )}
                </div>

            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            {selectedArticle ? renderDetailView() : renderListView()}
        </div>
    );
};