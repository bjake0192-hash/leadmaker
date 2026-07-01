import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Loader2, ArrowRight, History as HistoryIcon } from 'lucide-react';
import api from '../lib/api';
import { Search } from '../types';

const History: React.FC = () => {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await api.get('/history');
      if (response.data.searches) {
        setSearches(response.data.searches);
      }
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDownloadingId(id);
    try {
      const response = await api.get(`/export/${id}`, {
        responseType: 'blob',
        params: { format: 'xlsx' }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results-${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed', error);
      alert('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Search History</h1>
        <p className="text-gray-500 mt-1">
          View and download your past scraping tasks.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {searches.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {searches.map((search) => (
              <li key={search.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {search.query}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${search.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            search.status === 'failed' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {search.status.charAt(0).toUpperCase() + search.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p>
                          {search.max_results} max results
                        </p>
                        <span className="mx-2">&bull;</span>
                        <p>
                          {new Date(search.created_at).toLocaleDateString()} at {new Date(search.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-6 flex items-center space-x-4">
                    {search.status === 'completed' && (
                      <button
                        onClick={(e) => handleDownload(search.id, e)}
                        disabled={downloadingId === search.id}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {downloadingId === search.id ? (
                          <Loader2 className="animate-spin -ml-0.5 mr-2 h-3 w-3" />
                        ) : (
                          <Download className="-ml-0.5 mr-2 h-3 w-3 text-gray-400" />
                        )}
                        Download
                      </button>
                    )}
                    <Link
                      to={`/results/${search.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Results
                      <ArrowRight className="ml-2 -mr-0.5 h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <HistoryIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No history</h3>
            <p className="mt-1 text-sm text-gray-500">You haven't performed any searches yet.</p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Start a new search
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
