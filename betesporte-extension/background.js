// 🦈 BETesporte SuperOdds Monitor - Background Script
console.log('🦈 SuperOdds Monitor Extension carregada!');

let isMonitoring = false;
let lastScreenshot = null;
let lastOdds = [];
let dashboardUrl = '';

// Listener para alarmes (screenshots periódicos)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'superodds-screenshot') {
    console.log('📸 Hora do screenshot automático!');
    takeScreenshotAndAnalyze();
  }
});

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Mensagem recebida:', request);
  
  switch (request.action) {
    case 'start':
      startMonitoring(request.interval, request.dashboardUrl);
      sendResponse({ success: true, message: 'Monitoramento iniciado!' });
      break;
      
    case 'stop':
      stopMonitoring();
      sendResponse({ success: true, message: 'Monitoramento parado!' });
      break;
      
    case 'check':
      takeScreenshotAndAnalyze();
      sendResponse({ success: true, message: 'Screenshot manual executado!' });
      break;
      
    case 'status':
      sendResponse({
        success: true,
        isMonitoring: isMonitoring,
        lastOdds: lastOdds.length,
        timestamp: Date.now()
      });
      break;
      
    default:
      sendResponse({ success: false, error: 'Ação desconhecida' });
  }
  
  return true; // Permite resposta assíncrona
});

async function startMonitoring(intervalMinutes = 1, webhookUrl = '') {
  if (isMonitoring) {
    console.log('⚠️ Monitoramento já está ativo');
    return;
  }
  
  isMonitoring = true;
  dashboardUrl = webhookUrl;
  
  console.log(`🚀 Iniciando monitoramento - ${intervalMinutes} minuto(s)`);
  
  // Salva configurações
  await chrome.storage.local.set({
    isMonitoring: true,
    interval: intervalMinutes,
    dashboardUrl: webhookUrl
  });
  
  // Primeira verificação imediata
  await takeScreenshotAndAnalyze();
  
  // Configura alarme periódico
  chrome.alarms.create('superodds-screenshot', {
    delayInMinutes: intervalMinutes,
    periodInMinutes: intervalMinutes
  });
  
  // Notificação de início
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: '🦈 SuperOdds Monitor Ativo!',
    message: `Monitoramento iniciado - ${intervalMinutes} min`
  });
}

async function stopMonitoring() {
  isMonitoring = false;
  
  // Para alarmes
  chrome.alarms.clear('superodds-screenshot');
  
  // Salva estado
  await chrome.storage.local.set({
    isMonitoring: false
  });
  
  console.log('🛑 Monitoramento parado');
  
  // Notificação
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: '🛑 Monitor Parado',
    message: 'Monitoramento de SuperOdds pausado'
  });
}

async function takeScreenshotAndAnalyze() {
  try {
    console.log('📸 Iniciando captura e análise...');
    
    // Busca aba do BETesporte
    const tabs = await chrome.tabs.query({
      url: "https://betesporte.bet.br/*"
    });
    
    if (tabs.length === 0) {
      console.log('❌ Nenhuma aba do BETesporte aberta');
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '⚠️ Aba não encontrada',
        message: 'Abra uma aba do BETesporte para monitorar'
      });
      return;
    }
    
    const tab = tabs[0];
    console.log('🎯 Aba encontrada:', tab.url);
    
    // Tira screenshot da aba
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 80
    });
    
    console.log('📸 Screenshot capturado!');
    
    // Injeta script para extrair SuperOdds
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractSuperOddsFromPage
    });
    
    const currentOdds = result.result || [];
    console.log(`🎯 ${currentOdds.length} SuperOdds encontradas`);
    
    // Verifica se houve mudanças
    const hasChanges = detectChanges(currentOdds);
    
    if (hasChanges && currentOdds.length > 0) {
      console.log('🔥 MUDANÇAS DETECTADAS!');
      
      // Atualiza dados
      lastOdds = currentOdds;
      lastScreenshot = screenshot;
      
      // Envia para dashboard
      if (dashboardUrl) {
        await sendToWebhook(currentOdds, screenshot);
      }
      
      // Notificação de SuperOdds encontradas
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '🔥 SuperOdds Detectadas!',
        message: `${currentOdds.length} odds encontradas - Clique para ver`
      });
      
      // Salva no storage
      await chrome.storage.local.set({
        lastOdds: currentOdds,
        lastCheck: Date.now(),
        lastScreenshot: screenshot
      });
      
    } else {
      console.log('✅ Nenhuma mudança detectada');
    }
    
    // Atualiza último check
    await chrome.storage.local.set({
      lastCheck: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Erro na captura:', error);
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '❌ Erro no Monitor',
      message: `Erro: ${error.message}`
    });
  }
}

// Função injetada na página para extrair SuperOdds
function extractSuperOddsFromPage() {
  console.log('🔍 Extraindo SuperOdds da página...');
  
  const odds = [];
  
  // Seletores específicos para SuperOdds
  const selectors = [
    '[data-testid*="superodds"]',
    '[data-testid*="super-odds"]',
    '[class*="superodds" i]',
    '[class*="super-odds" i]',
    '[class*="enhanced" i]',
    '[class*="boosted" i]',
    '[class*="turbinada" i]',
    '[class*="special" i]',
    '[class*="promo" i]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`🎯 Seletor "${selector}": ${elements.length} elementos`);
    
    elements.forEach((element, index) => {
      const text = element.textContent.trim();
      const oddMatch = text.match(/\b(\d{1,2}\.\d{2})\b/);
      
      if (oddMatch) {
        const oddValue = parseFloat(oddMatch[1]);
        
        if (oddValue >= 1.5 && oddValue <= 100) {
          odds.push({
            id: `ext_${Date.now()}_${index}`,
            oddValue: oddValue,
            market: extractMarket(element),
            team: extractTeam(element),
            event: 'Extension Monitor',
            timestamp: Date.now(),
            selector: selector,
            source: 'browser_extension'
          });
        }
      }
    });
  });
  
  // Busca ampla se não encontrou seletores específicos
  if (odds.length === 0) {
    console.log('🔍 Fazendo busca ampla...');
    
    const allElements = document.querySelectorAll('*');
    let searchCount = 0;
    
    for (const element of allElements) {
      if (searchCount >= 500 || odds.length >= 20) break; // Limita busca
      searchCount++;
      
      const text = element.textContent.trim();
      if (text.length > 100 || text.length < 3) continue;
      
      const oddMatches = text.match(/\b(\d{1,2}\.\d{2})\b/g);
      
      if (oddMatches) {
        oddMatches.forEach(oddStr => {
          const oddValue = parseFloat(oddStr);
          
          if (oddValue >= 2.0 && oddValue <= 50.0) {
            const contextText = element.closest('[class*="sport"], [class*="bet"], [class*="market"]')?.textContent.toLowerCase() || '';
            
            if (contextText.includes('odd') || 
                contextText.includes('bet') ||
                contextText.includes('market') ||
                element.className.toLowerCase().includes('odd')) {
              
              odds.push({
                id: `search_${Date.now()}_${Math.random()}`,
                oddValue: oddValue,
                market: 'Detectado via busca',
                team: 'Extension Search',
                event: 'Busca Ampla',
                timestamp: Date.now(),
                source: 'browser_extension',
                context: text.substring(0, 50)
              });
            }
          }
        });
      }
    }
  }
  
  console.log(`📊 Total extraído: ${odds.length} SuperOdds`);
  return odds;
  
  // Funções auxiliares
  function extractMarket(element) {
    const text = element.textContent.toLowerCase();
    const markets = {
      'vitória': 'Resultado Final',
      'winner': 'Resultado Final',
      'empate': 'Empate',
      'draw': 'Empate',
      'over': 'Over',
      'under': 'Under',
      'acima': 'Acima',
      'abaixo': 'Abaixo',
      'ambas': 'Ambas Marcam',
      'gol': 'Gols'
    };
    
    for (const [keyword, market] of Object.entries(markets)) {
      if (text.includes(keyword)) {
        return market;
      }
    }
    
    return 'Extension Detect';
  }
  
  function extractTeam(element) {
    const teamEl = element.closest('[class*="match"], [class*="event"], [class*="game"]');
    if (teamEl) {
      const teamText = teamEl.textContent.trim();
      return teamText.substring(0, 30) || 'Team Extension';
    }
    return 'Extension';
  }
}

function detectChanges(currentOdds) {
  if (!lastOdds || lastOdds.length === 0) {
    return currentOdds.length > 0;
  }
  
  // Compara quantidade
  if (lastOdds.length !== currentOdds.length) {
    return true;
  }
  
  // Compara valores das odds
  const lastValues = lastOdds.map(o => `${o.oddValue}_${o.market}`).sort();
  const currentValues = currentOdds.map(o => `${o.oddValue}_${o.market}`).sort();
  
  return JSON.stringify(lastValues) !== JSON.stringify(currentValues);
}

async function sendToWebhook(odds, screenshot) {
  if (!dashboardUrl) {
    console.log('⚠️ URL do dashboard não configurada');
    return;
  }
  
  try {
    console.log('📡 Enviando dados para dashboard...');
    
    const webhookData = {
      source: 'browser_extension',
      timestamp: Date.now(),
      totalOdds: odds.length,
      odds: odds,
      screenshot: screenshot,
      url: 'https://betesporte.bet.br/',
      hasChanges: true
    };
    
    const response = await fetch(dashboardUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });
    
    if (response.ok) {
      console.log('✅ Dados enviados para dashboard!');
    } else {
      console.error('❌ Erro ao enviar para dashboard:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
  }
}

// Restaura estado ao inicializar
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(['isMonitoring', 'interval', 'dashboardUrl']);
  
  if (data.isMonitoring) {
    isMonitoring = data.isMonitoring;
    dashboardUrl = data.dashboardUrl || '';
    
    console.log('🔄 Restaurando monitoramento...');
    
    // Recria alarme
    chrome.alarms.create('superodds-screenshot', {
      delayInMinutes: data.interval || 1,
      periodInMinutes: data.interval || 1
    });
  }
});
