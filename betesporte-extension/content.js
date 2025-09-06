// 🦈 BETesporte SuperOdds Monitor - Content Script
console.log('🦈 SuperOdds Monitor ativo na página BETesporte!');

// Adiciona indicador visual na página
function addMonitorIndicator() {
  // Remove se já existe
  const existing = document.getElementById('superodds-monitor-indicator');
  if (existing) existing.remove();
  
  const indicator = document.createElement('div');
  indicator.id = 'superodds-monitor-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: pointer;
      border: 2px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      🦈 SuperOdds Monitor Ativo
      <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
        📸 Screenshots automáticos
      </div>
    </div>
  `;
  
  document.body.appendChild(indicator);
  
  // Remove após 5 segundos
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }
  }, 5000);
}

// Monitora mudanças na página
let lastPageContent = '';
let changeCheckInterval = null;

function startPageMonitoring() {
  // Verifica mudanças a cada 10 segundos
  changeCheckInterval = setInterval(() => {
    const currentContent = document.body.innerHTML;
    
    if (currentContent !== lastPageContent) {
      console.log('🔄 Mudança detectada na página');
      lastPageContent = currentContent;
      
      // Notifica background script
      chrome.runtime.sendMessage({
        action: 'page_changed',
        timestamp: Date.now()
      });
    }
  }, 10000);
}

function stopPageMonitoring() {
  if (changeCheckInterval) {
    clearInterval(changeCheckInterval);
    changeCheckInterval = null;
  }
}

// Função para destacar SuperOdds encontradas (debug visual)
function highlightSuperOdds() {
  const selectors = [
    '[data-testid*="superodds"]',
    '[data-testid*="super-odds"]',
    '[class*="superodds" i]',
    '[class*="super-odds" i]',
    '[class*="enhanced" i]',
    '[class*="boosted" i]',
    '[class*="turbinada" i]'
  ];
  
  let totalFound = 0;
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      // Adiciona borda colorida para debug
      element.style.border = '2px solid #22c55e';
      element.style.boxShadow = '0 0 10px rgba(34, 197, 94, 0.5)';
      element.title = '🦈 SuperOdd detectada pelo monitor';
      totalFound++;
    });
  });
  
  if (totalFound > 0) {
    console.log(`🎯 ${totalFound} SuperOdds destacadas na página`);
  }
  
  return totalFound;
}

// Listener para mensagens do background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'highlight_odds':
      const count = highlightSuperOdds();
      sendResponse({ success: true, count: count });
      break;
      
    case 'get_page_info':
      sendResponse({
        success: true,
        url: window.location.href,
        title: document.title,
        timestamp: Date.now()
      });
      break;
      
    default:
      sendResponse({ success: false, error: 'Ação desconhecida' });
  }
  
  return true;
});

// Inicializa quando página carrega
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 Página BETesporte carregada');
  addMonitorIndicator();
  startPageMonitoring();
  
  // Salva conteúdo inicial
  lastPageContent = document.body.innerHTML;
});

// Monitora mudanças no DOM
const observer = new MutationObserver((mutations) => {
  let hasSignificantChange = false;
  
  mutations.forEach((mutation) => {
    // Verifica se há mudanças significativas
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const text = node.textContent || '';
          // Detecta se pode ser uma odd
          if (text.match(/\b\d+\.\d{2}\b/)) {
            hasSignificantChange = true;
          }
        }
      });
    }
  });
  
  if (hasSignificantChange) {
    console.log('🔄 Mudança significativa detectada no DOM');
    
    // Debounce - evita muitas notificações
    clearTimeout(window.domChangeTimeout);
    window.domChangeTimeout = setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'dom_changed',
        timestamp: Date.now()
      });
    }, 2000);
  }
});

// Inicia observação do DOM
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false
});

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
  stopPageMonitoring();
  observer.disconnect();
});

console.log('✅ Content script inicializado com sucesso!');
