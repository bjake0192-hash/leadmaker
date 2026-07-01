
import axios from 'axios';
import * as cheerio from 'cheerio';

const searchBing = async (query: string) => {
  console.log(`Testing Bing search for: ${query}`);
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1'
  };

  try {
    const response = await axios.get(`https://www.bing.com/search`, {
      params: { q: query },
      headers: headers
    });

    console.log('Response Status:', response.status);
    console.log('Response Length:', response.data.length);
    
    const $ = cheerio.load(response.data);
    const results: any[] = [];

    // Bing selectors (these change often, but let's try common ones)
    // .b_algo is the container for organic results
    $('.b_algo').each((_, element) => {
        const titleElement = $(element).find('h2 a');
        const snippetElement = $(element).find('.b_caption p');
        
        const title = titleElement.text().trim();
        const link = titleElement.attr('href');
        const snippet = snippetElement.text().trim();

        if (title && link) {
            results.push({ title, link, snippet, source: 'bing' });
        }
    });

    console.log(`Found ${results.length} results.`);
    if (results.length > 0) {
        console.log('First result:', results[0]);
    } else {
        // Debug HTML if no results
        // console.log(response.data.substring(0, 1000));
    }

  } catch (error) {
    console.error('Error:', error);
  }
};

searchBing('software engineer');
