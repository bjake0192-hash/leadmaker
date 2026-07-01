
const decodeBingUrl = (url: string) => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://www.bing.com${url}`);
    const u = urlObj.searchParams.get('u');
    if (!u) return url;
    
    // Bing's 'u' parameter is somewhat obfuscated.
    // It often starts with 'a1' which seems to be a prefix to be removed before base64 decode?
    // Let's try removing 'a1' and decoding.
    
    let encoded = u;
    if (encoded.startsWith('a1')) {
        encoded = encoded.substring(2);
    }
    
    // Replace characters to make it valid base64
    // standard base64 uses +, /, =
    // url safe base64 uses -, _, and no padding
    // Bing might use standard or url safe.
    
    // Let's try standard decoding
    const buffer = Buffer.from(encoded, 'base64');
    const decoded = buffer.toString('utf-8');
    
    console.log(`Decoded: ${decoded}`);
    return decoded.startsWith('http') ? decoded : url;
  } catch (e) {
    console.error('Error decoding URL:', e);
    return url;
  }
};

// Test with the URL we got
decodeBingUrl('https://www.bing.com/ck/a?!&&p=...&u=a1aHR0cHM6Ly93d3cuemhpaHUuY29tL3F1ZXN0aW9uLzQ1NDE1NTAxOA&ntb=1');
