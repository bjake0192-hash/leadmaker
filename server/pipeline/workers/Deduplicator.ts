import { Lead } from '../types';

export class Deduplicator {
  /**
   * Filters out leads that share the same root domain.
   */
  public deduplicate(leads: Lead[]): Lead[] {
    const seenDomains = new Set<string>();
    const uniqueLeads: Lead[] = [];

    for (const lead of leads) {
      try {
        const url = new URL(lead.url);
        // Normalize domain (remove www.)
        const domain = url.hostname.replace(/^www\./, '').toLowerCase();
        
        if (!seenDomains.has(domain)) {
          seenDomains.add(domain);
          uniqueLeads.push(lead);
        } else {
          console.log(`[Deduplicator] Removed duplicate domain: ${domain}`);
        }
      } catch (e) {
        // If URL is invalid, keep it but log it (or choose to discard)
        console.warn(`[Deduplicator] Invalid URL skipped: ${lead.url}`);
        uniqueLeads.push(lead);
      }
    }

    return uniqueLeads;
  }
}
