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

    // 2. Search Worker: Search each region
    let allDiscoveredLeads: Lead[] = [];
    const limitPerRegion = config.maxResultsPerRegion || 10;
    
    for (const region of regions) {
      const regionLeads = await this.searchWorker.searchRegion(config.keyword, region, limitPerRegion);
      allDiscoveredLeads = allDiscoveredLeads.concat(regionLeads);
    }

    // 3. Deduplicator: Remove duplicate domains
    console.log(`[Pipeline] Found ${allDiscoveredLeads.length} total leads. Deduplicating...`);
    const uniqueLeads = this.deduplicator.deduplicate(allDiscoveredLeads);
    console.log(`[Pipeline] ${uniqueLeads.length} unique leads remain.`);

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
