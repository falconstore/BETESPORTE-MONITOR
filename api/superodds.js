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

    // ESTRATÉGIA MAIS AGRESSIVA - MÚLTIPLAS TENTATIVAS
    let html = null;
    let method = 'unknown';
    let lastError = null;

    // Lista de estratégias em ordem de prioridade
    const strategies = [
      () => fetchWithMobileUA(targetUrl),
      () => fetchWithRandomDelay(targetUrl), 
      () => fetchWithDifferentReferer(targetUrl),
      () => fetchWithMinimalHeaders(targetUrl),
      () => fetchAlternativeEndpoints(targetUrl)
    ];

    // Tenta cada estratégia
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/${strategies.length}`);
        const result = await strategies[i]();
        if (result && result.html && result.html.length > 500) {
          html = result.html;
          method = result.method;
          console.log(`✅ Sucesso com estratégia ${i + 1}: ${method}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Estratégia ${i + 1} falhou:`, error.message);
        lastError = error;
        
        // Delay progressivo entre tentativas
        if (i < strategies.length - 1) {
          await randomDelay(2000, 5000);
        }
      }
    }

    // Se todas falharam, retorna resposta com sugestões
    if (!html) {
      throw new Error('🚫 Site bloqueando todas as requisições. Use o modo manual.');
    }

    const superOdds = await parseSuperOdds(html, targetUrl);
    superOdds.fetchMethod = method;
    superOdds.strategies_tried = strategies.length;

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
    
    // Retorna erro mais específico com sugestões
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: Date.now(),
      suggestions: [
        '🔄 Tente novamente em alguns minutos',
        '📱 Use o modo manual (cole HTML da página)',
        '🌐 Considere usar VPN se o problema persistir',
        '⏰ Site pode ter rate limiting - aguarde'
      ],
      manual_mode_available: true
    };

    if (error.message.includes('403') || error.message.includes('blocked') || error.message.includes('bloqueando')) {
      errorResponse.block_detected = true;
      errorResponse.priority_suggestion = 'Use o modo manual - cole o HTML da página do BETesporte';
    }

    res.status(500).json(errorResponse);
  }
}

// ESTRATÉGIA 1: User Agent Mobile
async function fetchWithMobileUA(url) {
  const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
  
  const headers = {
    'User-Agent': mobileUA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.google.com.br/',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  const response = await fetch(url, {
    headers,
    timeout: 20000,
    follow: 3
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    html: await response.text(),
    method: 'mobile_ua'
  };
}

// ESTRATÉGIA 2: Delay Aleatório + Headers Rotativos
async function fetchWithRandomDelay(url) {
  // Delay 3-8 segundos
  await randomDelay(3000, 8000);
  
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  const headers = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1'
  };

  const response = await fetch(url, {
    headers,
    timeout: 25000
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    html: await response.text(),
    method: 'random_delay'
  };
}

// ESTRATÉGIA 3: Referer Diferente
async function fetchWithDifferentReferer(url) {
  const referers = [
    'https://www.bing.com/',
    'https://duckduckgo.com/',
    'https://br.yahoo.com/',
    'https://www.google.com/',
    '' // Sem referer
  ];
  
  const referer = referers[Math.floor(Math.random() * referers.length)];
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.8',
    'Referer': referer,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  // Remove referer vazio
  if (!referer) delete headers.Referer;

  const response = await fetch(url, {
    headers,
    timeout: 15000
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    html: await response.text(),
    method: 'different_referer'
  };
}

// ESTRATÉGIA 4: Headers Mínimos
async function fetchWithMinimalHeaders(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*'
  };

  const response = await fetch(url, {
    headers,
    timeout: 10000
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    html: await response.text(),
    method: 'minimal_headers'
  };
}

// ESTRATÉGIA 5: Endpoints Alternativos
async function fetchAlternativeEndpoints(url) {
  const alternatives = [
    url.replace('desktop', 'mobile'),
    url.replace('sports/desktop', 'sports'),
    url.replace('bet.br', 'bet.br/mobile'),
    url + '?mobile=1'
  ];

  for (const altUrl of alternatives) {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.8'
      };

      const response = await fetch(altUrl, {
        headers,
        timeout: 15000
      });

      if (response.ok) {
        return {
          html: await response.text(),
          method: `alternative_endpoint: ${altUrl}`
        };
      }
    } catch (error) {
      console.log(`Endpoint alternativo falhou: ${altUrl}`);
    }
  }

  throw new Error('Todos os endpoints alternativos falharam');
}

function randomDelay(min = 1000, max = 3000) {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// ... resto das funções parseSuperOdds, etc. permanecem iguais ...

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
    'captcha',
    'rate limit',
    'too many requests'
  ];

  const htmlLower = html.toLowerCase();
  for (const indicator of blockIndicators) {
    if (htmlLower.includes(indicator)) {
      throw new Error(`🚫 Site bloqueado: detectado "${indicator}". Use o modo manual.`);
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
      selector: selector,
      source: 'api'
    };
  } catch (error) {
    console.warn('Erro ao extrair odd:', error);
    return null;
  }
}

function extractMarket($, $el) {
  const text = $el.text().toLowerCase();
  
  const markets = {
    'vitória': 'Resultado Final',
    'winner': 'Resultado Final',
    'empate': 'Empate',
    'draw': 'Empate',
    'over': 'Total - Over',
    'under': 'Total - Under',
    'acima': 'Total - Acima',
    'abaixo': 'Total - Abaixo',
    'ambas': 'Ambas Marcam',
    'btts': 'Ambas Marcam',
    'handicap': 'Handicap',
    'corner': 'Escanteios',
    'card': 'Cartões'
  };

  for (const [keyword, market] of Object.entries(markets)) {
    if (text.includes(keyword)) {
      return market;
    }
  }

  return null;
}

function extractTeam($, $el) {
  const teamSelectors = [
    '[class*="team"]',
    '[class*="participant"]',
    '[class*="competitor"]',
    '[data-testid*="team"]'
  ];

  for (const selector of teamSelectors) {
    const teamEl = $el.find(selector).first();
    if (teamEl.length && teamEl.text().trim()) {
      return teamEl.text().trim();
    }

    const nearbyTeam = $el.closest('*').find(selector).first();
    if (nearbyTeam.length && nearbyTeam.text().trim()) {
      return nearbyTeam.text().trim();
    }
  }

  return null;
}

function extractEvent($, $el) {
  const eventSelectors = [
    '[class*="event"]',
    '[class*="match"]',
    '[class*="game"]',
    '[data-testid*="event"]'
  ];

  for (const selector of eventSelectors) {
    const eventEl = $el.closest(selector);
    if (eventEl.length) {
      const titleEl = eventEl.find('[class*="title"], h1, h2, h3').first();
      if (titleEl.length && titleEl.text().trim()) {
        return titleEl.text().trim();
      }
    }
  }

  return null;
}

function searchOddsInPage($, html) {
  const odds = [];
  
  $('*').each((index, element) => {
    const $el = $(element);
    const text = $el.text().trim();
    
    if (text.length > 100 || text.length < 3) return;
    
    const oddMatches = text.match(/\b(\d+\.\d{2})\b/g);
    
    if (oddMatches) {
      oddMatches.forEach(oddStr => {
        const odd = parseFloat(oddStr);
        
        if (odd >= 2.0 && odd <= 50.0) {
          const contextText = $el.closest('[class*="sport"], [class*="match"], [class*="game"]').text().toLowerCase();
          
          if (contextText || text.toLowerCase().includes('odd')) {
            odds.push({
              id: `search_${Date.now()}_${Math.random()}`,
              oddValue: odd,
              market: 'Detectado automaticamente',
              team: 'A identificar',
              event: 'A identificar',
              timestamp: Date.now(),
              context: text.substring(0, 50),
              source: 'api'
            });
          }
        }
      });
    }
  });

  return odds.slice(0, 10);
}

function searchTextPatterns(html) {
  const odds = [];
  
  const patterns = [
    /super\s*odds?\s*:?\s*(\d+\.\d{2})/gi,
    /odds?\s*turbinada?s?\s*:?\s*(\d+\.\d{2})/gi,
    /enhanced\s*odds?\s*:?\s*(\d+\.\d{2})/gi,
    /boosted?\s*odds?\s*:?\s*(\d+\.\d{2})/gi
  ];

  patterns.forEach((pattern, patternIndex) => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const oddValue = parseFloat(match[1]);
      if (oddValue > 1.5 && oddValue <= 100) {
        odds.push({
          id: `pattern_${patternIndex}_${Date.now()}`,
          oddValue: oddValue,
          market: 'SuperOdd detectada',
          team: 'Texto',
          event: 'Texto',
          timestamp: Date.now(),
          pattern: match[0],
          source: 'api'
        });
      }
    }
  });

  return odds;
}

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL * 2) {
      cache.delete(key);
    }
  }
}
