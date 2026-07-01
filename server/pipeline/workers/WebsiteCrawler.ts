import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types';

export class WebsiteCrawler {
  /**
   * Visits a website and extracts its raw text content.
   */
  public async crawl(lead: Lead): Promise<Lead> {
    try {
      console.log(`[Crawler] Visiting: ${lead.url}`);
      const response = await axios.get(lead.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      const $ = cheerio.load(response.data);
      // Remove scripts, styles, etc.
      $('script, style, nav, footer, iframe, noscript').remove();
      
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      
      lead.crawledContent = bodyText;
      lead.status = 'crawled';
    } catch (error: any) {
      console.error(`[Crawler] Failed to crawl ${lead.url}: ${error.message}`);
      lead.error = error.message;
      lead.status = 'failed';
    }
    
    return lead;
  }
}
