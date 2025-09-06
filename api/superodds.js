import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Cache simples em memória (para produção use Redis/Database)
const cache = new Map();
const CACHE_TTL = 30000; // 30 segundos

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

    // Headers para simular navegador
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    // Faz requisição
    const response = await fetch(targetUrl, {
      headers,
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const superOdds = await parseSuperOdds(html, targetUrl);

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
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
}

async function parseSuperOdds(html, url) {
  const $ = cheerio.load(html);
  const superOdds = [];

  console.log('🔍 Analisando HTML para SuperOdds...');

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

    // Extrai contexto
    const market = extractMarket($, $el);
    const team = extractTeam($, $el);
    const event = extractEvent($, $el);
    const originalOdd = extractOriginalOdd($, $el);

    return {
      id: `odd_${Date.now()}_${index}`,
      oddValue: oddValue,
      market: market || 'Mercado detectado',
      team: team || 'Time detectado',
      event: event || 'Evento detectado',
      originalOdd: originalOdd,
      boost: originalOdd ? `${((oddValue / originalOdd - 1) * 100).toFixed(1)}%` : null,
      timestamp: Date.now(),
      selector: selector,
      element: {
        class: $el.attr('class') || '',
        id: $el.attr('id') || '',
        testid: $el.attr('data-testid') || ''
      }
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

  // Busca em elementos pais
  const parent = $el.closest('[class*="market"], [class*="bet"], [data-testid*="market"]');
  if (parent.length) {
    const parentText = parent.text().toLowerCase();
    for (const [keyword, market] of Object.entries(markets)) {
      if (parentText.includes(keyword)) {
        return market;
      }
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

function extractOriginalOdd($, $el) {
  const originalSelectors = [
    '.original-odd',
    '.old-odd',
    '[class*="strike"]',
    '[class*="crossed"]',
    '.text-decoration-line-through'
  ];

  for (const selector of originalSelectors) {
    const originalEl = $el.find(selector).first();
    if (originalEl.length) {
      const oddText = originalEl.text().trim();
      const odd = parseFloat(oddText.match(/\d+\.\d{2}/)?.[0]);
      if (!isNaN(odd)) {
        return odd;
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
              context: text.substring(0, 50)
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
          pattern: match[0]
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
