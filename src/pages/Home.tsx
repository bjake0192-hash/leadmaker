import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Loader2, History, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { Search } from '../types';

const Home: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState(10);
  const [fastMode, setFastMode] = useState(true);
  const [requirePhone, setRequirePhone] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Search[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentSearches();
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const response = await api.get('/history');
      if (response.data.searches) {
        setRecentSearches(response.data.searches.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch history', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !location.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/search', {
        query: `${keyword} in ${location}`,
        keyword,
        location,
        max_results: maxResults,
        fastMode,
        requirePhone
      });
      
      const { search_id } = response.data;
      navigate(`/results/${search_id}`);
    } catch (error) {
      console.error('Search failed', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-12 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold tracking-wide uppercase shadow-[0_0_15px_rgba(37,99,235,0.1)]">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            Next-Gen Lead Generation
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 sm:text-6xl tracking-tight">
            Build your pipeline with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">OpenLead</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-xl text-slate-500 font-medium">
            Search, extract, and enrich B2B leads from Google Maps instantly. The most accurate data for your sales team.
          </p>
        </div>

        <div className="mt-10 bg-white p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
          
          <form onSubmit={handleSearch} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="text-left space-y-2">
                <label htmlFor="keyword" className="block text-sm font-bold text-slate-700 ml-1">Keyword</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="keyword"
                    id="keyword"
                    className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block w-full pl-12 text-lg border-slate-200 rounded-2xl py-4 transition-all bg-slate-50 focus:bg-white"
                    placeholder="e.g. Manufacturing"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="text-left space-y-2">
                <label htmlFor="location" className="block text-sm font-bold text-slate-700 ml-1">Location</label>
                <div className="relative group">
                  <input
                    type="text"
                    name="location"
                    id="location"
                    className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block w-full px-5 text-lg border-slate-200 rounded-2xl py-4 transition-all bg-slate-50 focus:bg-white"
                    placeholder="e.g. London, UK"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="text-left space-y-2">
                <label htmlFor="maxResults" className="block text-sm font-bold text-slate-700 ml-1">
                  Max Results
                </label>
                <select
                  id="maxResults"
                  name="maxResults"
                  className="mt-1 block w-full pl-4 pr-10 py-3 text-base border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm rounded-2xl bg-slate-50 focus:bg-white transition-all"
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                >
                  <option value={10}>10 results</option>
                  <option value={20}>20 results</option>
                  <option value={50}>50 results</option>
                  <option value={100}>100 results</option>
                  <option value={200}>200 results</option>
                  <option value={500}>500 results</option>
                </select>
              </div>

              <div className="text-left space-y-2">
                <label className="block text-sm font-bold text-slate-700 ml-1">
                  Search Speed
                </label>
                <div className="mt-1 flex items-center h-12 bg-slate-50 rounded-2xl px-4 border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFastMode(!fastMode)}
                    className={`${
                      fastMode ? 'bg-blue-600' : 'bg-slate-300'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none shadow-sm`}
                  >
                    <span
                      className={`${
                        fastMode ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-semibold text-slate-600">
                    {fastMode ? 'Fast' : 'Deep'}
                  </span>
                </div>
              </div>

              <div className="text-left space-y-2">
                <label className="block text-sm font-bold text-slate-700 ml-1">
                  Contact Filtering
                </label>
                <div className="mt-1 flex items-center h-12 bg-slate-50 rounded-2xl px-4 border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRequirePhone(!requirePhone)}
                    className={`${
                      requirePhone ? 'bg-blue-600' : 'bg-slate-300'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none shadow-sm`}
                  >
                    <span
                      className={`${
                        requirePhone ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-semibold text-slate-600">
                    {requirePhone ? 'Phone Only' : 'All Leads'}
                  </span>
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-lg font-bold rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.2)] text-white bg-blue-600 hover:bg-blue-700 hover:shadow-[0_15px_25px_rgba(37,99,235,0.3)] focus:outline-none transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-6 w-6" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      Start Pipeline
                      <ArrowRight className="ml-2 -mr-1 h-6 w-6" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {recentSearches.length > 0 && (
          <div className="mt-16 text-left space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center px-2">
              <History className="mr-3 h-6 w-6 text-blue-600" />
              Recent Extractions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentSearches.map((search) => (
                <button
                  key={search.id}
                  onClick={() => navigate(`/results/${search.id}`)}
                  className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 text-left transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm
                      ${search.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        search.status === 'failed' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                        'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {search.status}
                    </div>
                  </div>
                  <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 pr-16">{search.query}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Results</span>
                      <span className="text-sm font-bold text-slate-700">{search.max_results}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Date</span>
                      <span className="text-sm font-bold text-slate-700">{new Date(search.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
