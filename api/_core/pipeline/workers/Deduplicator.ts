import { Lead } from '../types.js';

export class Deduplicator {
  /**
   * Filters out leads that share the same root domain or phone number.
   */
  public deduplicate(leads: Lead[]): Lead[] {
    const seenDomains = new Set<string>();
    const seenPhones = new Set<string>();
    const uniqueLeads: Lead[] = [];

    for (const lead of leads) {
      let isDuplicate = false;

      // 1. Deduplicate by Phone (Highest priority for the user)
      if (lead.phones && lead.phones.length > 0) {
        const phone = lead.phones[0].replace(/\D/g, ''); // Normalize: keep only digits
        if (phone) {
          if (seenPhones.has(phone)) {
            isDuplicate = true;
          } else {
            seenPhones.add(phone);
          }
        }
      }

      // 2. Deduplicate by Domain (If not already marked as duplicate by phone)
      if (!isDuplicate && lead.url && lead.url.startsWith('http')) {
        try {
          const url = new URL(lead.url);
          const domain = url.hostname.replace(/^www\./, '').toLowerCase();
          
          if (seenDomains.has(domain)) {
            isDuplicate = true;
          } else {
            seenDomains.add(domain);
          }
        } catch (e) {
          // Ignore invalid URLs
        }
      }

      // 3. Deduplicate by Name + Address (Fallback for businesses without phone/website)
      if (!isDuplicate && !lead.url && (!lead.phones || lead.phones.length === 0)) {
        const identifier = `${lead.name}-${lead.address}`.toLowerCase().replace(/\s/g, '');
        if (seenDomains.has(identifier)) { // Reusing seenDomains set for identifiers
          isDuplicate = true;
        } else {
          seenDomains.add(identifier);
        }
      }

      if (!isDuplicate) {
        uniqueLeads.push(lead);
      }
    }

    return uniqueLeads;
  }
}
