import { searchGoogle } from '../../services/searchService';
import { Lead, Region } from '../types';
import crypto from 'crypto';

export class SearchWorker {
  /**
   * Searches for a keyword within a specific region.
   */
  public async searchRegion(keyword: string, region: Region, limit: number = 10): Promise<Lead[]> {
    const query = `${keyword} in ${region.name}`;
    console.log(`[SearchWorker] Searching for: "${query}"`);
    
    // We'll reuse the existing searchService which handles DuckDuckGo/Bing fallback
    // and now natively supports Google Maps via SerpApi!
    const results = await searchGoogle(query, limit);
    
    return results.map(r => ({
      id: crypto.randomUUID(),
      name: r.title,
      url: r.link,
      snippet: r.snippet,
      sourceRegion: region.name,
      emails: [],
      phones: r.phone ? [r.phone] : [], // Populate phone immediately if Map search provided it
      address: r.address, // Store the physical address from Maps
      category: r.type,   // Store the actual category/type of the business from Maps
      socials: {},
      status: 'discovered'
    }));
  }
}
