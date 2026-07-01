import { Region } from '../types.js';

export class MapGridWorker {
  /**
   * Breaks down a large location into smaller search regions.
   * In a full implementation, this could use Google Maps Geocoding API to create a bounding box grid.
   * For now, it maps known large regions to major cities.
   */
  public async breakIntoRegions(location: string): Promise<Region[]> {
    const normalizedLoc = location.toLowerCase().trim();
    
    // Example logic for UK
    if (normalizedLoc === 'uk' || normalizedLoc === 'united kingdom') {
      return [
        { name: 'London, UK' },
        { name: 'Birmingham, UK' },
        { name: 'Manchester, UK' },
        { name: 'Glasgow, UK' },
        { name: 'Liverpool, UK' },
        { name: 'Bristol, UK' },
        { name: 'Sheffield, UK' },
        { name: 'Leeds, UK' },
        { name: 'Edinburgh, UK' },
        { name: 'Leicester, UK' }
      ];
    }

    if (normalizedLoc === 'us' || normalizedLoc === 'usa' || normalizedLoc === 'united states') {
      return [
        { name: 'New York, NY' },
        { name: 'Los Angeles, CA' },
        { name: 'Chicago, IL' },
        { name: 'Houston, TX' },
        { name: 'Phoenix, AZ' },
      ];
    }

    // Default fallback: just return the location itself as a single region
    return [{ name: location }];
  }
}
