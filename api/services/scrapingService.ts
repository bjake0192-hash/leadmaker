import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedData {
  email: string | null;
  company: string | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  social: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  keywords_found: string[];
}

// Keywords to look for based on query context (can be dynamic)
// For now, let's include generic business keywords
const BUSINESS_KEYWORDS = [
  'menu', 'restaurant', 'food', 'dining', 'reservation', // Restaurant specific
  'services', 'about us', 'contact', 'team', 'careers',
  'products', 'solutions', 'pricing', 'blog', 'news',
  'location', 'hours', 'reviews', 'testimonials'
];

export const scrapeUrl = async (url: string, query?: string): Promise<ScrapedData> => {
  try {
    const response = await axios.get(url, {
      timeout: 240000, // 4 minutes timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const bodyText = $('body').text().toLowerCase();

    // 1. Context Relevance Check
    // If a query is provided, check if key terms exist in the page content
    const keywords_found: string[] = [];
    if (query) {
        const queryTerms = query.toLowerCase().split(' ').filter(t => t.length > 3);
        // Also check for general business keywords
        const allTerms = [...queryTerms, ...BUSINESS_KEYWORDS];
        
        allTerms.forEach(term => {
            if (bodyText.includes(term.toLowerCase())) {
                keywords_found.push(term);
            }
        });
    }

    // 2. Extract Email (Improved)
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/g;
    const mailtoLinks = $('a[href^="mailto:"]').map((_, el) => $(el).attr('href')?.replace('mailto:', '')).get();
    const bodyEmails = $('body').text().match(emailRegex) || [];
    
    // Prioritize mailto links as they are explicit contact intents
    const allEmails = [...new Set([...mailtoLinks, ...bodyEmails])];
    
    const validEmails = allEmails.filter(e => {
        if (!e) return false;
        const lower = e.toLowerCase();
        if (/\.(png|jpg|jpeg|gif|svg|css|js|woff|ttf|ico)$/i.test(lower)) return false;
        if (lower.includes('example.com') || lower.includes('email.com') || lower.includes('yourname')) return false;
        return true;
    });

    // 3. Extract Company Name (Improved)
    let company = $('meta[property="og:site_name"]').attr('content');
    
    if (!company) {
        try {
            const jsonLd = $('script[type="application/ld+json"]').html();
            if (jsonLd) {
                const data = JSON.parse(jsonLd);
                if (data['@type'] === 'Organization' || data['@type'] === 'Corporation' || data['@type'] === 'Restaurant' || data['@type'] === 'LocalBusiness') {
                    company = data.name;
                    // Also try to get address/phone from JSON-LD
                }
            }
        } catch (e) {}
    }

    if (!company) {
        const title = $('title').text();
        const parts = title.split(/[|\-]/);
        if (parts.length > 1) {
            company = parts[parts.length - 1].trim();
        } else {
            company = title.trim();
        }
    }
    
    if (company && ['Home', 'Welcome', 'Index', 'Page'].includes(company)) {
        company = null;
    }

    // 4. Extract Address (Heuristic)
    // Look for common address patterns or keywords near text
    let address: string | null = null;
    // Try meta tags first
    address = $('meta[name="address"]').attr('content') || 
              $('meta[property="business:contact_data:street_address"]').attr('content');
    
    if (!address) {
        // Look for schema.org address
        // (Simplified, full parsing is complex)
        const addressElement = $('[itemprop="address"]');
        if (addressElement.length) {
            address = addressElement.text().trim().replace(/\s+/g, ' ');
        }
    }
    
    // 5. Extract Phone
    let phone: string | null = null;
    const telLinks = $('a[href^="tel:"]').first().attr('href');
    if (telLinks) {
        phone = telLinks.replace('tel:', '');
    } else {
        // Simple regex for US/UK phone numbers
        const phoneRegex = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/;
        const phoneMatch = $('body').text().match(phoneRegex);
        if (phoneMatch) phone = phoneMatch[0];
    }

    // 6. Social Links
    const social: any = {};
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        
        if (href.includes('linkedin.com/company') || href.includes('linkedin.com/in')) social.linkedin = href;
        if (href.includes('facebook.com/')) social.facebook = href;
        if (href.includes('twitter.com/') || href.includes('x.com/')) social.twitter = href;
        if (href.includes('instagram.com/')) social.instagram = href;
    });

    // 7. Extract Name (Heuristic)
    let name: string | null = null;
    const author = $('meta[name="author"]').attr('content');
    if (author) name = author;

    if (!name && validEmails.length > 0) {
        const firstEmail = validEmails[0];
        const localPart = firstEmail.split('@')[0];
        if (localPart.includes('.')) {
            const parts = localPart.split('.');
            if (parts.every(p => /^[a-zA-Z]+$/.test(p))) {
                name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            }
        }
    }

    return {
      email: validEmails.length > 0 ? validEmails[0] : null,
      company: company || null,
      name: name,
      address: address || null,
      phone: phone || null,
      social,
      keywords_found
    };

  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return { 
        email: null, 
        company: null, 
        name: null,
        address: null,
        phone: null,
        social: {},
        keywords_found: []
    };
  }
};
