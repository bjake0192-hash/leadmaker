export interface Search {
  id: string;
  query: string;
  max_results: number;
  filters?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface Result {
  id: string;
  search_id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  source_url: string;
  scraped_at?: string;
  created_at: string;
}

export interface SearchResponse {
  search_id: string;
  status: string;
  estimated_time: number;
}
