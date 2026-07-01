import { Region } from '../types.js';

export class MapGridWorker {
  /**
   * Breaks down a large location into smaller search regions.
   * In a full implementation, this could use Google Maps Geocoding API to create a bounding box grid.
   * For now, it maps known large regions to major cities.
   */
  public async breakIntoRegions(location: string): Promise<Region[]> {
    const normalizedLoc = location.toLowerCase().trim();
    
    // Comprehensive list of UK regions and major cities to maximize coverage
    if (normalizedLoc === 'uk' || normalizedLoc === 'united kingdom') {
      return [
        // England - Major Cities & Hubs
        { name: 'London, UK' }, { name: 'Birmingham, UK' }, { name: 'Manchester, UK' },
        { name: 'Leeds, UK' }, { name: 'Liverpool, UK' }, { name: 'Newcastle, UK' },
        { name: 'Sheffield, UK' }, { name: 'Bristol, UK' }, { name: 'Nottingham, UK' },
        { name: 'Leicester, UK' }, { name: 'Southampton, UK' }, { name: 'Portsmouth, UK' },
        { name: 'Norwich, UK' }, { name: 'Cambridge, UK' }, { name: 'Oxford, UK' },
        { name: 'Brighton, UK' }, { name: 'Plymouth, UK' }, { name: 'Hull, UK' },
        { name: 'Stoke-on-Trent, UK' }, { name: 'Wolverhampton, UK' }, { name: 'Derby, UK' },
        
        // England - Counties/Regions for broader coverage
        { name: 'Kent, UK' }, { name: 'Essex, UK' }, { name: 'Surrey, UK' },
        { name: 'Hertfordshire, UK' }, { name: 'Berkshire, UK' }, { name: 'Hampshire, UK' },
        { name: 'West Midlands, UK' }, { name: 'Greater Manchester, UK' }, { name: 'West Yorkshire, UK' },
        { name: 'South Yorkshire, UK' }, { name: 'Lancashire, UK' }, { name: 'Merseyside, UK' },
        { name: 'Devon, UK' }, { name: 'Cornwall, UK' }, { name: 'Somerset, UK' },
        { name: 'Cumbria, UK' }, { name: 'Northumberland, UK' }, { name: 'Lincolnshire, UK' },
        { name: 'Norfolk, UK' }, { name: 'Suffolk, UK' }, { name: 'Gloucestershire, UK' },
        
        // Scotland
        { name: 'Glasgow, UK' }, { name: 'Edinburgh, UK' }, { name: 'Aberdeen, UK' },
        { name: 'Dundee, UK' }, { name: 'Inverness, UK' }, { name: 'Fife, UK' },
        
        // Wales
        { name: 'Cardiff, UK' }, { name: 'Swansea, UK' }, { name: 'Newport, UK' },
        { name: 'Wrexham, UK' },
        
        // Northern Ireland
        { name: 'Belfast, UK' }, { name: 'Londonderry, UK' }
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
