const https = require('https');

const getInitialAuth = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'id.pinterest.com',
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
      }
    };
    
    https.get(options, res => {
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        const csrfCookie = cookies.find(c => c.startsWith('csrftoken='));
        const pinterestSessCookie = cookies.find(c => c.startsWith('_pinterest_sess='));
        
        if (csrfCookie && pinterestSessCookie) {
          const csrftoken = csrfCookie.split(';')[0].split('=')[1];
          const sess = pinterestSessCookie.split(';')[0];
          resolve({ 
            csrftoken, 
            cookieHeader: `csrftoken=${csrftoken}; ${sess}` 
          });
          return;
        }
      }
      reject(new Error('Gagal mendapatkan CSRF token atau session cookie.'));
    }).on('error', e => reject(e));
  });
};

const searchPinterestAPI = async (query, limit = 25) => {
  try {
    const { csrftoken, cookieHeader } = await getInitialAuth();
    let results = [];
    let bookmark = null;
    let keepFetching = true;
    
    while (keepFetching && results.length < limit) {
      const postData = {
        options: {
          query: query,
          scope: 'pins',
          bookmarks: bookmark ? [bookmark] : []
        },
        context: {}
      };
      
      const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
      const dataString = `source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(postData))}`;
      
      const options = {
        hostname: 'id.pinterest.com',
        path: '/resource/BaseSearchResource/get/',
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*, q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrftoken,
          'X-Pinterest-Source-Url': sourceUrl,
          'Cookie': cookieHeader
        }
      };
      
      const responseBody = await new Promise((resolve, reject) => {
        const req = https.request(options, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve(body));
        });
        req.on('error', e => reject(e));
        req.write(dataString);
        req.end();
      });
      
      const jsonResponse = JSON.parse(responseBody);
      
      if (jsonResponse.resource_response && 
          jsonResponse.resource_response.data && 
          jsonResponse.resource_response.data.results) {
        
        const pins = jsonResponse.resource_response.data.results;
        pins.forEach(pin => {
          if (pin.images && pin.images['736x']) {
            results.push({
              url: pin.images['736x'].url,
              width: pin.images['736x'].width,
              height: pin.images['736x'].height,
              description: pin.description || pin.grid_title || '',
              id: pin.id
            });
          } else if (pin.images && pin.images['orig']) {
            results.push({
              url: pin.images['orig'].url,
              width: pin.images['orig'].width,
              height: pin.images['orig'].height,
              description: pin.description || pin.grid_title || '',
              id: pin.id
            });
          }
        });
        
        bookmark = jsonResponse.resource_response.bookmark;
        if (!bookmark || pins.length === 0) {
          keepFetching = false;
        }
      } else {
        keepFetching = false;
      }
    }
    
    return results.slice(0, limit);
  } catch (e) {
    throw new Error(e.message);
  }
};

// Serverless function untuk Vercel
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const query = req.query.q;
  const limit = parseInt(req.query.limit) || 25;
  
  if (!query) {
    res.status(400).json({ 
      error: 'Parameter "q" diperlukan untuk pencarian' 
    });
    return;
  }
  
  try {
    const results = await searchPinterestAPI(query, limit);
    res.status(200).json({
      success: true,
      query: query,
      total: results.length,
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Untuk development lokal
if (require.main === module) {
  const http = require('http');
  const url = require('url');
  
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Serve static files atau API
    if (parsedUrl.pathname === '/api/search') {
      module.exports(
        { 
          method: req.method, 
          query: parsedUrl.query 
        },
        {
          status: (code) => ({
            json: (data) => {
              res.writeHead(code, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            },
            end: () => {
              res.writeHead(code);
              res.end();
            }
          }),
          setHeader: (key, value) => {
            res.setHeader(key, value);
          }
        }
      );
    } else {
      // Serve static files (simplified)
      const fs = require('fs');
      const path = require('path');
      
      let filePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
      filePath = path.join(__dirname, '..', 'public', filePath);
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          const ext = path.extname(filePath);
          const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript'
          }[ext] || 'text/plain';
          
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    }
  });
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}