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
        fastMode
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
      <div className="max-w-3xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Extract Data from Google
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Search for any term and scrape names, emails, and company information instantly.
          </p>
        </div>

        <div className="mt-10 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 text-left mb-1">Keyword</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    name="keyword"
                    id="keyword"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-lg border-gray-300 rounded-lg py-3"
                    placeholder="e.g. factory"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 text-left mb-1">Location</label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="location"
                    id="location"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full px-4 sm:text-lg border-gray-300 rounded-lg py-3"
                    placeholder="e.g. UK"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1">
                <label htmlFor="maxResults" className="block text-sm font-medium text-gray-700 text-left mb-1">
                  Max Results
                </label>
                <select
                  id="maxResults"
                  name="maxResults"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                  Search Speed
                </label>
                <div className="mt-1 flex items-center h-10">
                  <button
                    type="button"
                    onClick={() => setFastMode(!fastMode)}
                    className={`${
                      fastMode ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    <span
                      className={`${
                        fastMode ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                  <span className="ml-3 text-sm text-gray-500">
                    {fastMode ? 'Fast Mode (Maps only)' : 'Deep Mode (Crawl sites)'}
                  </span>
                </div>
              </div>
              
              <div className="flex-none pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Searching...
                    </>
                  ) : (
                    <>
                      Start Scraping
                      <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {recentSearches.length > 0 && (
          <div className="mt-12 text-left">
            <h2 className="text-lg font-medium text-gray-900 flex items-center mb-4">
              <History className="mr-2 h-5 w-5 text-gray-500" />
              Recent Searches
            </h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {recentSearches.map((search) => (
                  <li key={search.id}>
                    <button
                      onClick={() => navigate(`/results/${search.id}`)}
                      className="block hover:bg-gray-50 w-full text-left px-4 py-4 sm:px-6 transition duration-150 ease-in-out"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600 truncate">{search.query}</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${search.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              search.status === 'failed' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'}`}>
                            {search.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {search.max_results} results requested
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            {new Date(search.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
