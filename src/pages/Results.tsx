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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] rounded-3xl p-8 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-6 sm:space-y-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Extraction Pipeline</h1>
            {(search.status === 'pending' || search.status === 'processing') && (
               <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
            )}
          </div>
          <p className="text-slate-500 font-medium text-lg">
            Query: <span className="text-blue-600 font-bold">{search.query}</span>
          </p>
          <div className="mt-4 flex items-center space-x-3">
            <span className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm
              ${search.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                search.status === 'failed' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                'bg-amber-50 text-amber-600 border border-amber-100'}`}>
              {search.status}
            </span>
            <span className="text-sm font-bold text-slate-400">
              <span className="text-slate-900">{total}</span> total leads discovered
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={handlePullMore}
            disabled={extending || search.status === 'processing'}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-slate-200 text-sm font-bold rounded-2xl shadow-sm text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 ${extending || search.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {extending || search.status === 'processing' ? (
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
            ) : (
              <Download className="-ml-1 mr-2 h-4 w-4 transform rotate-180 text-blue-600" />
            )}
            Pull More
          </button>
          
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.15)] text-white bg-blue-600 hover:bg-blue-700 hover:shadow-[0_15px_25px_rgba(37,99,235,0.25)] transition-all duration-300 ${exporting || total === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {exporting ? (
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
            ) : (
              <Download className="-ml-1 mr-2 h-4 w-4" />
            )}
            Export Results
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-3xl overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Lead Name
                </th>
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Contact Number
                </th>
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Email Address
                </th>
                <th scope="col" className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Physical Location
                </th>
                <th scope="col" className="px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {results.length > 0 ? (
                results.map((result) => (
                  <tr key={result.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-slate-900">
                      {result.name || '-'}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-semibold text-slate-600">
                      {result.phone || '-'}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium">
                      {result.email ? (
                        <a href={`mailto:${result.email}`} className="text-blue-600 hover:text-blue-700 underline decoration-blue-600/30 underline-offset-4">
                          {result.email}
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-500 max-w-xs truncate">
                      {result.address || '-'}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <a 
                        href={result.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all duration-200"
                      >
                        View Source <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-slate-300 animate-spin" />
                      </div>
                      <p className="text-slate-400 font-bold text-lg">
                        {search.status === 'processing' ? 'Searching for more leads...' : 'Gathering intel...'}
                      </p>
                      <p className="text-slate-300 text-sm">New leads will appear here in real-time.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-50/50 px-8 py-5 flex items-center justify-between border-t border-slate-100">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Showing <span className="text-slate-900">{(page - 1) * limit + 1}</span> to <span className="text-slate-900">{Math.min(page * limit, total)}</span> of <span className="text-slate-900">{total}</span> leads
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-2xl shadow-sm space-x-2" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all ${page === 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="relative inline-flex items-center px-6 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 shadow-sm">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all ${page === totalPages ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
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
