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
    console.log(`[Pipeline] Starting pipeline for keyword: "${config.keyword}" in "${config.location}" (Target: ${config.targetTotal})`);

    // 1. Map/Grid Worker: Break location into regions
    const regions = await this.mapGridWorker.breakIntoRegions(config.location);
    console.log(`[Pipeline] Discovered ${regions.length} regions to search.`);

    // 2. Search Worker: Search each region in parallel for speed
    console.log(`[Pipeline] Searching ${regions.length} regions in parallel...`);
    
    const target = config.targetTotal || 10;
    const startPage = config.page || 1;
    let allDiscoveredLeads: Lead[] = [];
    let currentPage = startPage;
    let leadsNeeded = target;

    // We'll fetch at least one full burst. 
    // If it's a background task, we can potentially fetch multiple pages.
    const fetchBurst = async (page: number) => {
      // If phone is required, we need a massive buffer because Google Maps 
      // often has many businesses without numbers or with landlines only.
      // We'll fetch the maximum (100) per region if the target is high.
      const limitPerRegion = config.requirePhone ? 100 : Math.max(Math.ceil(leadsNeeded / regions.length), 20);
      
      console.log(`[Pipeline] Fetching page ${page} with limit ${limitPerRegion} per region...`);
      const regionPromises = regions.map(region => 
        this.searchWorker.searchRegion(config.keyword, region, limitPerRegion, page)
      );
      
      const resultsArray = await Promise.all(regionPromises);
      return resultsArray.flat();
    };

    // First burst
    const firstBurst = await fetchBurst(currentPage);
    allDiscoveredLeads.push(...firstBurst);

    // 3. Deduplicator & Initial Filter
    let uniqueLeads = this.deduplicator.deduplicate(allDiscoveredLeads);
    
    if (config.requirePhone) {
      uniqueLeads = uniqueLeads.filter(lead => lead.phones && lead.phones.length > 0);
    }

    // STABILITY FIX: Only fetch second page if we are NOT in Fast Mode
    // Fast Mode must return quickly to avoid Vercel timeouts.
    if (!config.fastMode && uniqueLeads.length < target && currentPage < startPage + 1) {
      console.log(`[Pipeline] Only found ${uniqueLeads.length}/${target} leads. Fetching next page...`);
      currentPage++;
      const secondBurst = await fetchBurst(currentPage);
      allDiscoveredLeads.push(...secondBurst);
      
      uniqueLeads = this.deduplicator.deduplicate(allDiscoveredLeads);
      if (config.requirePhone) {
        uniqueLeads = uniqueLeads.filter(lead => lead.phones && lead.phones.length > 0);
      }
    }

    console.log(`[Pipeline] Final count after filtering: ${uniqueLeads.length} leads.`);
    
    // Trim to target
    const finalLeadsToProcess = uniqueLeads.slice(0, target);

    // 4. Processing Phase: Crawl -> Contacts
    if (config.fastMode) {
      console.log(`[Pipeline] Fast Mode enabled. Skipping website crawling.`);
      for (const lead of finalLeadsToProcess) {
        this.collector.addLead(lead);
      }
    } else {
      // Deep Mode: Process one by one (or in small batches)
      for (const lead of finalLeadsToProcess) {
        await this.crawler.crawl(lead);
        this.contactFinder.extractContacts(lead);
        this.collector.addLead(lead);
      }
    }

    const finalLeads = this.collector.getAllLeads();
    return finalLeads;
  }

  public getExporter(): Exporter {
    return this.exporter;
  }
}
