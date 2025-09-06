import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // Headers CORS obrigatórios
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Content-Type', 'application/json');

  // Responde OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    console.log('📝 Iniciando processamento manual...');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Method:', req.method);

    // Valida se tem body
    if (!req.body) {
      throw new Error('Nenhum dados enviados no body da requisição');
    }

    const { html } = req.body;
    
    // Validações
    if (!html) {
      throw new Error('Campo "html" é obrigatório');
    }

    if (typeof html !== 'string') {
      throw new Error('HTML deve ser uma string');
    }
    
    if (html.length < 100) {
      throw new Error('HTML muito pequeno (menos de 100 caracteres)');
    }

    if (html.length > 10000000) { // 10MB
      throw new Error('HTML muito grande (máximo 10MB)');
    }

    console.log(`📄 HTML recebido: ${html.length} caracteres`);
    
    // Verifica se é HTML válido
    if (!html.toLowerCase().includes('<html')) {
      throw new Error('Conteúdo não parece ser HTML válido (falta tag <html>)');
    }

    const superOdds = await parseHtmlForOdds(html);

    const response = {
      success: true,
      timestamp: Date.now(),
      totalOdds: superOdds.length,
      odds: superOdds,
      status: superOdds.length > 0 ? 'found' : 'not_found',
      source: 'manual',
      htmlSize: html.length,
      lastUpdate: new Date().toISOString()
    };

    console.log(`✅ Processamento concluído: ${superOdds.length} odds encontradas`);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro ao processar HTML:', error);
    
    // Sempre retorna JSON, mesmo com erro
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
      debug: {
        method: req.method,
        hasBody: !!req.body,
        contentType: req.headers['content-type']
      }
    });
  }
}

async function parseHtmlForOdds(html) {
  try {
    const $ = cheerio.load(html);
    const superOdds = [];

    console.log('🔍 Processando HTML manual para SuperOdds...');

    // Seletores específicos para BETesporte
    const selectors = [
      '[data-testid*="superodds"]',
      '[data-testid*="super-odds"]', 
      '[class*="superodds" i]',
      '[class*="super-odds" i]',
      '[class*="enhanced" i]',
      '[class*="boosted" i]',
      '[class*="turbinada" i]',
      '[class*="special" i]',
      '[class*="promo" i]',
      '.superodds',
      '.super-odds',
      '.enhanced-odds',
      '.boosted-odds'
    ];

    // Busca por seletores específicos
    for (const selector of selectors) {
      try {
        const elements = $(selector);
        
        if (elements.length > 0) {
          console.log(`✅ Encontrados ${elements.length} elementos com: ${selector}`);
          
          elements.each((index, element) => {
            const oddData = extractOddFromElement($, element, index, selector);
            if (oddData) {
              superOdds.push(oddData);
            }
          });

          if (superOdds.length > 0) break;
        }
      } catch (error) {
        console.warn(`Erro com seletor ${selector}:`, error.message);
      }
    }

    // Busca ampla se não encontrou nada
    if (superOdds.length === 0) {
      console.log('🔍 Fazendo busca ampla por odds...');
      
      // Busca por elementos que contenham números em formato de odd
      let searchCount = 0;
      $('*').each((index, element) => {
        if (superOdds.length >= 20 || searchCount >= 1000) return false; // Limita busca
        searchCount++;
        
        const $el = $(element);
        const text = $el.text().trim();
        
        // Pula elementos muito grandes ou pequenos
        if (text.length > 200 || text.length < 3) return;
        
        // Busca padrões de odd
        const oddMatches = text.match(/\b(\d{1,2}\.\d{2})\b/g);
        
        if (oddMatches && oddMatches.length > 0) {
          oddMatches.forEach(oddStr => {
            const oddValue = parseFloat(oddStr);
            
            // Filtra odds válidas
            if (oddValue >= 1.50 && oddValue <= 50.0) {
              const contextText = $el.closest('[class*="bet"], [class*="market"], [class*="odd"]').text().toLowerCase();
              
              // Verifica se parece ser uma odd de aposta
              if (contextText.includes('odd') || 
                  contextText.includes('bet') ||
                  contextText.includes('market') ||
                  text.toLowerCase().includes('x') ||
                  $el.attr('class')?.toLowerCase().includes('odd')) {
                
                superOdds.push({
                  id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  oddValue: oddValue,
                  market: extractMarketContext($el) || 'Detectado manualmente',
                  team: extractTeamContext($el) || 'A identificar',
                  event: 'Processado manualmente',
                  timestamp: Date.now(),
                  source: 'manual_parse',
                  context: text.substring(0, 100)
                });
              }
            }
          });
        }
      });
    }

    // Busca por padrões de texto específicos
    if (superOdds.length === 0) {
      console.log('🔍 Buscando padrões de texto...');
      superOdds.push(...searchTextPatterns(html));
    }

    // Remove duplicatas
    const uniqueOdds = superOdds.filter((odd, index, self) => 
      index === self.findIndex(o => o.oddValue === odd.oddValue && o.market === odd.market)
    );

    console.log(`📊 Total encontrado: ${uniqueOdds.length} SuperOdds únicas`);
    
    return uniqueOdds.slice(0, 50); // Limita resultado
    
  } catch (error) {
    console.error('Erro no parseHtmlForOdds:', error);
    throw new Error(`Erro ao processar HTML: ${error.message}`);
  }
}

function extractOddFromElement($, element, index, selector) {
  try {
    const $el = $(element);
    const text = $el.text().trim();
    
    // Extrai valor da odd
    const oddMatch = text.match(/\b(\d{1,2}\.\d{2})\b/);
    if (!oddMatch) return null;
    
    const oddValue = parseFloat(oddMatch[1]);
    if (oddValue < 1.01 || oddValue > 100) return null;

    return {
      id: `manual_${Date.now()}_${index}`,
      oddValue: oddValue,
      market: extractMarketContext($el) || 'SuperOdd detectada',
      team: extractTeamContext($el) || 'Time detectado',
      event: 'Modo manual',
      timestamp: Date.now(),
      selector: selector,
      source: 'manual'
    };
  } catch (error) {
    console.warn('Erro ao extrair odd:', error);
    return null;
  }
}

function extractMarketContext($el) {
  const marketKeywords = [
    'vitória', 'winner', 'empate', 'draw', 'over', 'under',
    'acima', 'abaixo', 'ambas', 'btts', 'handicap', 'corner', 'gol'
  ];
  
  const text = $el.text().toLowerCase();
  
  for (const keyword of marketKeywords) {
    if (text.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  
  // Busca em elementos próximos
  const nearby = $el.closest('[class*="market"], [class*="bet"]').text().toLowerCase();
  for (const keyword of marketKeywords) {
    if (nearby.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  
  return null;
}

function extractTeamContext($el) {
  // Busca nomes de times em elementos próximos
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

function searchTextPatterns(html) {
  const odds = [];
  
  const patterns = [
    /super\s*odds?\s*:?\s*(\d+\.\d{2})/gi,
    /odds?\s*turbinada?s?\s*:?\s*(\d+\.\d{2})/gi,
    /enhanced\s*odds?\s*:?\s*(\d+\.\d{2})/gi,
    /boosted?\s*:?\s*(\d+\.\d{2})/gi,
    /especial\s*:?\s*(\d+\.\d{2})/gi
  ];

  patterns.forEach((pattern, patternIndex) => {
    try {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const oddValue = parseFloat(match[1]);
        if (oddValue > 1.5 && oddValue <= 100) {
          odds.push({
            id: `pattern_${patternIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            oddValue: oddValue,
            market: 'Padrão de texto',
            team: 'Detectado',
            event: 'Texto',
            timestamp: Date.now(),
            pattern: match[0],
            source: 'text_pattern'
          });
        }
      }
    } catch (error) {
      console.warn(`Erro no padrão ${patternIndex}:`, error);
    }
  });

  return odds;
}
