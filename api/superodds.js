import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Cache simples em memória 
const cache = new Map();
const CACHE_TTL = 30000; // 30 segundos

// Lista de User Agents rotativos
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url, force } = req.query;
    const targetUrl = url || 'https://betesporte.bet.br/sports/desktop/sport-league/999/4200000001';
    
    // Verifica cache se não for forçado
    if (!force) {
      const cached = cache.get(targetUrl);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log('📋 Retornando dados do cache');
        return res.status(200).json({
          success: true,
          cached: true,
          ...cached.data
        });
      }
    }

    console.log('🔍 Fazendo scraping de:', targetUrl);

    // Tenta múltiplas estratégias
    let html = null;
    let method = 'unknown';

    // Estratégia 1: Requisição direta com headers melhorados
    try {
      const result = await fetchWithRotatingHeaders(targetUrl);
      html = result.html;
      method = result.method;
    } catch (error) {
      console.log('❌ Estratégia 1 falhou:', error.message);
    }

    // Estratégia 2: Tentar com delay e referer diferente
    if (!html) {
      try {
        await randomDelay();
        const result = await fetchWithDelay(targetUrl);
        html = result.html;
        method = result.method;
      } catch (error) {
        console.log('❌ Estratégia 2 falhou:', error.message);
      }
    }

    // Estratégia 3: Tentar URL alternativa ou API interna
    if (!html) {
      try {
        const alternativeUrl = targetUrl.replace('desktop', 'mobile');
        const result = await fetchWithRotatingHeaders(alternativeUrl);
        html = result.html;
        method = `${result.method} (mobile)`;
      } catch (error) {
        console.log('❌ Estratégia 3 falhou:', error.message);
      }
    }

    if (!html) {
      throw new Error('Todas as estratégias de fetch falharam. Site pode estar bloqueando requisições.');
    }

    const superOdds = await parseSuperOdds(html, targetUrl);
    superOdds.fetchMethod = method;

    // Salva no cache
    cache.set(targetUrl, {
      data: superOdds,
      timestamp: Date.now()
    });

    // Limpa cache antigo
    cleanCache();

    res.status(200).json({
      success: true,
      cached: false,
      ...superOdds
    });

  } catch (error) {
    console.error('❌ Erro na API:', error);
    
    // Retorna erro mais específico
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: Date.now(),
      suggestions: []
    };

    if (error.message.includes('403')) {
      errorResponse.suggestions = [
        'Site está bloqueando requisições',
        'Tente usar uma VPN',
        'Configure um proxy',
        'Use o modo manual no dashboard'
      ];
    } else if (error.message.includes('timeout')) {
      errorResponse.suggestions = [
        'Conexão lenta ou instável',
        'Tente novamente em alguns minutos',
        'Verifique sua conexão com a internet'
      ];
    }

    res.status(500).json(errorResponse);
  }
}

async function fetchWithRotatingHeaders(url) {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  const headers = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://www.google.com.br/',
    'DNT': '1',
    'Connection': 'keep-alive'
  };

  const response = await fetch(url, {
    headers,
    timeout: 15000,
    follow: 5
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    html: await response.text(),
    method: 'rotating_headers'
  };
}

async function fetchWithDelay(url) {
  // Espera 3-7 segundos
  await randomDelay(3000, 7000);
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5',
    'Referer': 'https://www.bing.com/',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive'
  };

  const response = await fetch(url, {
    headers,
    timeout: 20000
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    html: await response.text(),
    method: 'delayed_fetch'
  };
}

function randomDelay(min = 1000, max = 3000) {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// ... resto das funções parseSuperOdds, extractOddData, etc. permanecem iguais ...

async function parseSuperOdds(html, url) {
  const $ = cheerio.load(html);
  const superOdds = [];

  console.log('🔍 Analisando HTML para SuperOdds...');
  console.log(`📄 Tamanho do HTML: ${html.length} caracteres`);

  // Verifica se o HTML contém conteúdo válido
  if (html.length < 1000) {
    console.warn('⚠️ HTML muito pequeno, pode ser uma página de erro');
  }

  // Procura por indicadores de bloqueio
  const blockIndicators = [
    'access denied',
    'blocked',
    'forbidden',
    'cloudflare',
    'security check',
    'captcha'
  ];

  const htmlLower = html.toLowerCase();
  for (const indicator of blockIndicators) {
    if (htmlLower.includes(indicator)) {
      throw new Error(`Site bloqueado: detectado "${indicator}"`);
    }
  }

  // Seletores específicos para BETesporte
  const selectors = [
    '[data-testid*="superodds"]',
    '[data-testid*="super-odds"]',
    '[class*="superodds"]',
    '[class*="super-odds"]',
    '[class*="enhanced"]',
    '[class*="boosted"]',
    '[class*="turbinada"]',
    '[class*="market-enhanced"]',
    '[class*="odds-boost"]',
    '.superodds',
    '.super-odds',
    '.enhanced-odds',
    '.boosted-odds'
  ];

  // Tenta cada seletor
  for (const selector of selectors) {
    const elements = $(selector);
    
    if (elements.length > 0) {
      console.log(`✅ Encontrados ${elements.length} elementos com: ${selector}`);
      
      elements.each((index, element) => {
        const oddData = extractOddData($, element, index, selector);
        if (oddData) {
          superOdds.push(oddData);
        }
      });

      if (superOdds.length > 0) break;
    }
  }

  // Se não encontrou, faz busca ampla
  if (superOdds.length === 0) {
    console.log('🔍 Fazendo busca ampla por odds...');
    superOdds.push(...searchOddsInPage($, html));
  }

  // Busca por padrões de texto
  if (superOdds.length === 0) {
    console.log('🔍 Buscando padrões no texto...');
    superOdds.push(...searchTextPatterns(html));
  }

  console.log(`📊 Total de SuperOdds encontradas: ${superOdds.length}`);

  return {
    timestamp: Date.now(),
    url: url,
    totalOdds: superOdds.length,
    odds: superOdds,
    status: superOdds.length > 0 ? 'found' : 'not_found',
    lastUpdate: new Date().toISOString(),
    htmlSize: html.length,
    cacheInfo: {
      cached: false,
      ttl: CACHE_TTL
    }
  };
}

// Restante das funções permanecem iguais...
function extractOddData($, element, index, selector) {
  try {
    const $el = $(element);
    const text = $el.text().trim();
    
    // Extrai valor da odd
    const oddMatch = text.match(/\b(\d+\.\d{2})\b/);
    if (!oddMatch) return null;
    
    const oddValue = parseFloat(oddMatch[1]);
    if (oddValue < 1.01 || oddValue > 100) return null;

    return {
      id: `odd_${Date.now()}_${index}`,
      oddValue: oddValue,
      market: extractMarket($, $el) || 'Mercado detectado',
      team: extractTeam($, $el) || 'Time detectado',
      event: extractEvent($, $el) || 'Evento detectado',
      timestamp: Date.now(),
      selector: selector
    };
  } catch (error) {
    console.warn('Erro ao extrair odd:', error);
    return null;
  }
}

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL * 2) {
      cache.delete(key);
    }
  }
}
