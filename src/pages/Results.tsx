import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { Search, Result } from '../types';

const Results: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState<Search | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [exporting, setExporting] = useState(false);
  const [extending, setExtending] = useState(false);

  const fetchResults = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/results/${id}`, {
        params: { page, limit }
      });
      setSearch(response.data.search);
      setResults(response.data.results);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch results', error);
    } finally {
      setLoading(false);
    }
  }, [id, page, limit]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Polling for updates if processing
  useEffect(() => {
    if (search?.status === 'pending' || search?.status === 'processing') {
      const interval = setInterval(fetchResults, 3000);
      return () => clearInterval(interval);
    }
  }, [search?.status, fetchResults]);

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
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
      console.error('Export failed', error);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePullMore = async () => {
    if (!id) return;
    setExtending(true);
    try {
      await api.post('/search/extend', { search_id: id });
      // The polling will pick up the 'processing' status and refresh the results
    } catch (error) {
      console.error('Failed to extend search', error);
      alert('Failed to extend search');
    } finally {
      setExtending(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && !search) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!search) {
    return <div className="text-center py-12">Search not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
          <p className="text-gray-500 mt-1">
            Query: <span className="font-medium text-gray-900">{search.query}</span>
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
              ${search.status === 'completed' ? 'bg-green-100 text-green-800' : 
                search.status === 'failed' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'}`}>
              {search.status.charAt(0).toUpperCase() + search.status.slice(1)}
            </span>
            <span className="text-sm text-gray-500">
              {total} results found
            </span>
            {(search.status === 'pending' || search.status === 'processing') && (
               <Loader2 className="animate-spin h-4 w-4 text-blue-600" />
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handlePullMore}
            disabled={extending || search.status === 'processing'}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${extending || search.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {extending || search.status === 'processing' ? (
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
            ) : (
              <Download className="-ml-1 mr-2 h-4 w-4 transform rotate-180" />
            )}
            Pull More
          </button>
          
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${exporting || total === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {exporting ? (
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
            ) : (
              <Download className="-ml-1 mr-2 h-4 w-4" />
            )}
            Export to Excel
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.length > 0 ? (
                results.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.email ? (
                        <a href={`mailto:${result.email}`} className="text-blue-600 hover:underline">
                          {result.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {result.address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a 
                        href={result.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                      >
                        Visit <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No results found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {/* Simple pagination: show current page */}
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
