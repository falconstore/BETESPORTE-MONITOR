import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { html } = req.body;
    
    if (!html || html.length < 100) {
      throw new Error('HTML inválido ou muito pequeno');
    }

    console.log('📝 Processando HTML manual...');
    
    const superOdds = await parseHtmlForOdds(html);

    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      totalOdds: superOdds.length,
      odds: superOdds,
      status: superOdds.length > 0 ? 'found' : 'not_found',
      source: 'manual',
      htmlSize: html.length
    });

  } catch (error) {
    console.error('❌ Erro ao processar HTML:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function parseHtmlForOdds(html) {
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
      console.warn(`Erro com seletor ${selector}:`, error);
    }
  }

  // Busca ampla se não encontrou nada
  if (superOdds.length === 0) {
    console.log('🔍 Fazendo busca ampla...');
    
    // Busca por elementos que contenham números em formato de odd
    $('*').each((index, element) => {
      if (superOdds.length >= 20) return false; // Limita a 20 para performance
      
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
                id: `manual_${Date.now()}_${Math.random()}`,
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

  console.log(`📊 Total encontrado: ${superOdds.length} SuperOdds`);
  
  return superOdds.slice(0, 50); // Limita resultado
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
    'acima', 'abaixo', 'ambas', 'btts', 'handicap', 'corner'
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
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const oddValue = parseFloat(match[1]);
      if (oddValue > 1.5 && oddValue <= 100) {
        odds.push({
          id: `pattern_${patternIndex}_${Date.now()}`,
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
  });

  return odds;
}
