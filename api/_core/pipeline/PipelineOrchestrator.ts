import { PipelineConfig, Lead } from './types.js';
import { MapGridWorker } from './workers/MapGridWorker.js';
import { SearchWorker } from './workers/SearchWorker.js';
import { Collector } from './workers/Collector.js';
import { Deduplicator } from './workers/Deduplicator.js';
import { WebsiteCrawler } from './workers/WebsiteCrawler.js';
import { ContactFinder } from './workers/ContactFinder.js';
import { Exporter } from './workers/Exporter.js';

export class PipelineOrchestrator {
  private mapGridWorker = new MapGridWorker();
  private searchWorker = new SearchWorker();
  private collector = new Collector();
  private deduplicator = new Deduplicator();
  private crawler = new WebsiteCrawler();
  private contactFinder = new ContactFinder();
  private exporter = new Exporter();

  /**
   * Runs the full end-to-step lead generation pipeline.
   * Note: In a production setting with many leads, this should be processed asynchronously
   * using queues (e.g. BullMQ, RabbitMQ) to avoid timeouts.
   */
  public async run(config: PipelineConfig): Promise<Lead[]> {
    console.log(`[Pipeline] Starting pipeline for keyword: "${config.keyword}" in "${config.location}"`);

    // 1. Map/Grid Worker: Break location into regions
    const regions = await this.mapGridWorker.breakIntoRegions(config.location);
    console.log(`[Pipeline] Discovered ${regions.length} regions to search.`);

    // 2. Search Worker: Search each region in parallel for speed
    console.log(`[Pipeline] Searching ${regions.length} regions in parallel...`);
    
    // Divide max results by regions to be efficient with credits
    const totalMax = config.maxResultsPerRegion || 10;
    const limitPerRegion = Math.max(Math.ceil(totalMax / regions.length), 10);
    
    const regionPromises = regions.map(region => 
      this.searchWorker.searchRegion(config.keyword, region, limitPerRegion)
    );
    
    const resultsArray = await Promise.all(regionPromises);
    let allDiscoveredLeads: Lead[] = resultsArray.flat();

    // 3. Deduplicator: Remove duplicate domains
    console.log(`[Pipeline] Found ${allDiscoveredLeads.length} total leads. Deduplicating...`);
    let uniqueLeads = this.deduplicator.deduplicate(allDiscoveredLeads);
    console.log(`[Pipeline] ${uniqueLeads.length} unique leads remain.`);

    // 3b. Optional: Filter by phone number if required
    if (config.requirePhone) {
      console.log(`[Pipeline] Filtering for leads with phone numbers...`);
      uniqueLeads = uniqueLeads.filter(lead => lead.phones && lead.phones.length > 0);
      console.log(`[Pipeline] ${uniqueLeads.length} leads remain after phone filtering.`);
    }

    // 4. Processing Phase: Crawl -> Contacts
    if (config.fastMode) {
      console.log(`[Pipeline] Fast Mode enabled. Skipping website crawling and contact extraction.`);
      for (const lead of uniqueLeads) {
        this.collector.addLead(lead);
      }
    } else {
      for (const lead of uniqueLeads) {
        // 4a. Crawl
        await this.crawler.crawl(lead);
        
        // 4b. Find Contacts
        this.contactFinder.extractContacts(lead);
        
        // 4c. Collector: Store lead
        this.collector.addLead(lead);
      }
    }

    const finalLeads = this.collector.getAllLeads();
    console.log(`[Pipeline] Pipeline finished successfully. Processed ${finalLeads.length} leads.`);
    
    return finalLeads;
  }

  public getExporter(): Exporter {
    return this.exporter;
  }
}
