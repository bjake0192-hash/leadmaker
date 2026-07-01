import { Lead } from '../types';

export class ContactFinder {
  /**
   * Extracts emails, phones, and social links from the crawled content and URL.
   */
  public extractContacts(lead: Lead): Lead {
    if (!lead.crawledContent) return lead;

    // 1. Extract Emails
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const foundEmails = lead.crawledContent.match(emailRegex) || [];
    
    // Filter out common image extensions masquerading as emails (e.g. file@2x.png)
    const validEmails = foundEmails.filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.jpeg'));
    lead.emails = Array.from(new Set(validEmails.map(e => e.toLowerCase())));

    // 2. Extract Phones (basic regex for international/US/UK formats)
    const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
    const foundPhones = lead.crawledContent.match(phoneRegex) || [];
    lead.phones = Array.from(new Set(foundPhones));

    // 3. Extract Socials (looking for common domains in the text or we could use Cheerio on raw HTML in crawler)
    // For simplicity, we just look for URLs in the text or assume we passed raw HTML
    // A more robust approach would parse the HTML hrefs in the Crawler step.
    const socialsRegex = /(https?:\/\/(www\.)?(linkedin|twitter|facebook|instagram)\.com\/[^\s]+)/gi;
    const foundSocials = lead.crawledContent.match(socialsRegex) || [];
    
    foundSocials.forEach(url => {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('linkedin.com')) lead.socials.linkedin = url;
      if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) lead.socials.twitter = url;
      if (lowerUrl.includes('facebook.com')) lead.socials.facebook = url;
      if (lowerUrl.includes('instagram.com')) lead.socials.instagram = url;
    });

    return lead;
  }
}
