import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { getJson } from 'serpapi';

dotenv.config();

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  phone?: string;
  address?: string;
  type?: string;
}

// Blocklist for review and directory sites
const BLOCKED_DOMAINS = [
    'yelp.com', 'tripadvisor.com', 'glassdoor.com', 'indeed.com', 'linkedin.com',
    'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'tiktok.com',
    'yellowpages.com', 'bbb.org', 'mapquest.com', 'foursquare.com', 'trustpilot.com',
    'g2.com', 'capterra.com', 'clutch.co', 'upwork.com', 'fiverr.com',
    'wikipedia.org', 'amazon.com', 'ebay.com', 'pinterest.com', 'reddit.com',
    'quora.com', 'medium.com', 'github.com', 'stackoverflow.com',
    'zoominfo.com', 'rocketreach.co', 'apollo.io', 'lusha.com', 'crunchbase.com',
    'pitchbook.com', 'cbinsights.com', 'dnb.com', 'bloomberg.com',
    'forbes.com', 'businessinsider.com', 'techcrunch.com', 'nytimes.com',
    'wsj.com', 'cnbc.com', 'reuters.com', 'usatoday.com'
];

export const searchGoogle = async (query: string, numResults: number = 10): Promise<SearchResult[]> => {
  console.log(`Starting search for: "${query}" with target results: ${numResults}`);
  
  // 1. Try Serper.dev first (Most generous free tier: 2500 requests)
  const serperApiKey = process.env.SERPER_API_KEY;
  if (serperApiKey && serperApiKey !== 'your_serper_api_key_here') {
      try {
          return await searchSerperMaps(query, numResults, serperApiKey);
      } catch (e) {
          console.error("Serper.dev search failed, falling back...");
      }
  }

  // 2. Fallback to SerpApi if available
  const serpapiKey = process.env.SERPAPI_KEY;
  if (serpapiKey && serpapiKey !== 'your_serpapi_key_here') {
      return searchGoogleMaps(query, numResults, serpapiKey);
  }
  
  console.log("No valid API keys found. Falling back to DuckDuckGo/Bing web search.");
  
  // Increase search limit internally to account for filtered results
  // We need to fetch significantly more because filtering might remove 80-90% of results
  // For 100 results, we might need 500-1000 raw results.
  const fetchLimit = Math.min(numResults * 5, 2500); 
  
  try {
    let allResults: SearchResult[] = [];

    // 1. Try DuckDuckGo
    console.log('Attempting search via DuckDuckGo HTML...');
    try {
        const ddgResults = await searchDuckDuckGo(query, fetchLimit);
        if (ddgResults.length > 0) {
            allResults = ddgResults;
            console.log(`DuckDuckGo returned ${ddgResults.length} raw results`);
        }
    } catch (e) {
        console.log('DuckDuckGo search failed, trying Bing...');
    }
    
    // 2. Fallback to Bing if DuckDuckGo failed or returned too few results
    if (allResults.length < fetchLimit) { // Try to get as close to fetchLimit as possible
        console.log('Attempting search via Bing HTML...');
        try {
            // Fetch the remaining amount needed to reach fetchLimit, or at least try to get more
            const remaining = fetchLimit - allResults.length;
            const bingResults = await searchBing(query, remaining);
            if (bingResults.length > 0) {
                // Deduplicate by link
                const existingLinks = new Set(allResults.map(r => r.link));
                for (const res of bingResults) {
                    if (!existingLinks.has(res.link)) {
                        allResults.push(res);
                    }
                }
                console.log(`Bing returned results, total raw results: ${allResults.length}`);
            }
        } catch (e) {
             console.log('Bing search failed.');
        }
    }

    // Filter results
    const filteredResults = allResults.filter(result => {
        try {
            const domain = new URL(result.link).hostname.toLowerCase().replace('www.', '');
            // Check against blocklist
            if (BLOCKED_DOMAINS.some(blocked => domain.includes(blocked))) {
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    });
    
    console.log(`After filtering blocked domains: ${filteredResults.length} results`);

    if (filteredResults.length === 0) {
        console.log('All search methods returned no valid results after filtering.');
        return [];
    }

    // Return requested number of results
    return filteredResults.slice(0, numResults);

  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
};

// Google Maps Scraper using Serper.dev
const searchSerperMaps = async (query: string, limit: number, apiKey: string): Promise<SearchResult[]> => {
    console.log(`Searching Google Maps via Serper.dev for "${query}"`);
    const results: SearchResult[] = [];
    
    try {
        const response = await axios.post('https://google.serper.dev/maps', {
            q: query,
            num: limit
        }, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[Serper] Raw response status: ${response.status}`);
        if (response.data.maps && Array.isArray(response.data.maps)) {
            console.log(`[Serper] Found ${response.data.maps.length} raw results in maps array.`);
            for (const place of response.data.maps) {
                if (results.length >= limit) break;
                
                // Only include businesses that actually have a website
                if (place.website) {
                    try {
                        const domain = new URL(place.website).hostname.toLowerCase().replace('www.', '');
                        if (BLOCKED_DOMAINS.some(blocked => domain.includes(blocked))) {
                            continue;
                        }
                    } catch (e) {
                        continue;
                    }

                    results.push({
                        title: place.title,
                        link: place.website,
                        snippet: place.category || place.address || '',
                        source: 'serper_maps',
                        phone: place.phoneNumber,
                        address: place.address,
                        type: place.category
                    });
                }
            }
        }
        console.log(`Serper.dev returned ${results.length} valid results with websites.`);
    } catch (error) {
        console.error("Serper.dev Google Maps search failed:", error);
        throw error;
    }
    
    return results;
};

// Google Maps Scraper using SerpApi
const searchGoogleMaps = async (query: string, limit: number, apiKey: string): Promise<SearchResult[]> => {
    console.log(`Searching Google Maps via SerpApi for "${query}"`);
    const results: SearchResult[] = [];
    
    try {
        const response = await getJson({
            engine: "google_maps",
            q: query,
            type: "search",
            api_key: apiKey,
            hl: "en",
            ll: "@0,0,1z" // Global or rely on query location
        });

        if (response.local_results && Array.isArray(response.local_results)) {
            for (const place of response.local_results) {
                if (results.length >= limit) break;
                
                // Only include businesses that actually have a website
                if (place.website) {
                    // Check if it's a blocked directory domain just in case
                    try {
                        const domain = new URL(place.website).hostname.toLowerCase().replace('www.', '');
                        if (BLOCKED_DOMAINS.some(blocked => domain.includes(blocked))) {
                            continue;
                        }
                    } catch (e) {
                        continue;
                    }

                    results.push({
                        title: place.title,
                        link: place.website,
                        snippet: place.description || place.type || '',
                        source: 'google_maps',
                        phone: place.phone,
                        address: place.address,
                        type: place.type
                    });
                }
            }
        }
        console.log(`Google Maps returned ${results.length} valid results with websites.`);
    } catch (error) {
        console.error("SerpApi Google Maps search failed:", error);
    }
    
    return results;
};

// Free DuckDuckGo HTML Scraper
const searchDuckDuckGo = async (query: string, limit: number): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];
  const maxPages = Math.ceil(limit / 25); 
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://html.duckduckgo.com/'
  };

  let currentPage = 0;
  let nextParams: URLSearchParams | null = new URLSearchParams();
  nextParams.append('q', query);
  nextParams.append('b', '');
  nextParams.append('kl', 'us-en');

  while (results.length < limit && currentPage < maxPages) {
    try {
      const url = 'https://html.duckduckgo.com/html/';
      
      const response = await axios.post(url, nextParams, {
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const $ = cheerio.load(response.data);
      let foundInPage = 0;
      
      $('.result').each((_, element) => {
        if (results.length >= limit) return false;

        const titleElement = $(element).find('.result__a');
        const snippetElement = $(element).find('.result__snippet');
        
        const title = titleElement.text().trim();
        const link = titleElement.attr('href');
        const snippet = snippetElement.text().trim();

        if (link && !link.includes('duckduckgo.com/y.js') && link.startsWith('http')) {
             results.push({ title, link, snippet, source: 'duckduckgo' });
             foundInPage++;
        }
      });
      
      if (foundInPage === 0) break; 

      const nextForm = $('.nav-link form');
      if (nextForm.length > 0) {
        nextParams = new URLSearchParams();
        nextForm.find('input[type="hidden"]').each((_, el) => {
           const name = $(el).attr('name');
           const value = $(el).attr('value');
           if (name && value) nextParams?.append(name, value);
        });
        if (!nextParams.has('q')) nextParams.append('q', query);
        
        currentPage++;
        await new Promise(resolve => setTimeout(resolve, 1500)); 
      } else {
        break;
      }

    } catch (err) {
      console.error('Error scraping DuckDuckGo page:', err);
      break;
    }
  }

  return results;
};

// Bing HTML Scraper
const searchBing = async (query: string, limit: number): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    const maxPages = Math.ceil(limit / 10); 
    
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1'
    };

    let currentPage = 0;
    let first = 1;

    while (results.length < limit && currentPage < maxPages) {
        try {
            const response = await axios.get(`https://www.bing.com/search`, {
                params: { 
                    q: query,
                    first: first 
                },
                headers: headers
            });

            const $ = cheerio.load(response.data);
            let foundInPage = 0;
            
            $('.b_algo').each((_, element) => {
                if (results.length >= limit) return false;

                const titleElement = $(element).find('h2 a');
                const snippetElement = $(element).find('.b_caption p');
                
                const title = titleElement.text().trim();
                const rawLink = titleElement.attr('href');
                const snippet = snippetElement.text().trim();

                if (title && rawLink) {
                    const link = decodeBingUrl(rawLink);
                    results.push({ title, link, snippet, source: 'bing' });
                    foundInPage++;
                }
            });

            if (foundInPage === 0) {
                 const nextLink = $('.sb_pagN').attr('href');
                 if (!nextLink) break;
            }

            first += 10;
            currentPage++;
            await new Promise(resolve => setTimeout(resolve, 1500)); 

        } catch (error) {
            console.error('Error scraping Bing:', error);
            break;
        }
    }
    
    return results;
};

const decodeBingUrl = (url: string) => {
    try {
        if (url.includes('bing.com/ck/a')) {
            const urlObj = new URL(url.startsWith('http') ? url : `https://www.bing.com${url}`);
            const u = urlObj.searchParams.get('u');
            if (u) {
                let encoded = u;
                if (encoded.startsWith('a1')) encoded = encoded.substring(2);
                encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
                while (encoded.length % 4) encoded += '=';
                const buffer = Buffer.from(encoded, 'base64');
                const decoded = buffer.toString('utf-8');
                return decoded.startsWith('http') ? decoded : url;
            }
        }
        return url;
    } catch (e) {
        return url;
    }
};
