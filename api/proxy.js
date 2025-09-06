import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Lista de proxies públicos (atualize conforme necessário)
const PROXIES = [
  'http://proxy1.example.com:8080',
  'http://proxy2.example.com:8080',
  // Adicione proxies válidos aqui
];

// Serviços de proxy como alternativa
const PROXY_SERVICES = [
  'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
  'https://www.proxy-list.download/api/v1/get?type=http'
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    // Tenta múltiplas estratégias
    const strategies = [
      () => fetchDirect(url),
      () => fetchWithRandomUserAgent(url),
      () => fetchThroughProxy(url),
      () => fetchThroughService(url)
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          return res.status(200).json({
            success: true,
            html: result,
            method: strategy.name
          });
        }
      } catch (error) {
        console.log(`Estratégia ${strategy.name} falhou:`, error.message);
      }
    }

    throw new Error('Todas as estratégias falharam');

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function fetchDirect(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5',
      'Referer': 'https://www.google.com.br/',
      'Cache-Control': 'no-cache'
    },
    timeout: 15000
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

async function fetchWithRandomUserAgent(url) {
  await randomDelay();
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': getRandomReferer(),
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    timeout: 20000
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

async function fetchThroughService(url) {
  // Usa serviços como ScrapingBee, ScraperAPI, etc.
  const services = [
    {
      name: 'ScrapingBee',
      url: `https://app.scrapingbee.com/api/v1/?api_key=YOUR_API_KEY&url=${encodeURIComponent(url)}&render_js=false`
    },
    {
      name: 'ScraperAPI', 
      url: `http://api.scraperapi.com?api_key=YOUR_API_KEY&url=${encodeURIComponent(url)}`
    }
  ];

  for (const service of services) {
    try {
      const response = await fetch(service.url, { timeout: 30000 });
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.log(`Serviço ${service.name} falhou:`, error.message);
    }
  }

  throw new Error('Todos os serviços falharam');
}

function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomReferer() {
  const referers = [
    'https://www.google.com.br/',
    'https://www.bing.com/',
    'https://duckduckgo.com/',
    'https://br.yahoo.com/',
    ''
  ];
  
  return referers[Math.floor(Math.random() * referers.length)];
}

function randomDelay() {
  const delay = Math.random() * 2000 + 1000; // 1-3 segundos
  return new Promise(resolve => setTimeout(resolve, delay));
}
