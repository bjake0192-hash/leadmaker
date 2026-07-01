export interface Lead {
  id: string;
  name: string;
  url: string;
  sourceRegion: string;
  snippet?: string;
  
  // Google Maps specific data
  address?: string;
  category?: string;

  // Crawler & Contact Data
  crawledContent?: string;
  emails: string[];
  phones: string[];
  socials: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };

  status: 'discovered' | 'crawled' | 'analyzed' | 'exported' | 'failed';
  error?: string;
}

export interface Region {
  name: string;
  lat?: number;
  lng?: number;
  radius?: number; // in km
}

export interface PipelineConfig {
  keyword: string;
  location: string;
  maxResultsPerRegion?: number;
  exportFormat?: 'csv' | 'excel' | 'google_sheets';
  fastMode?: boolean;
}
