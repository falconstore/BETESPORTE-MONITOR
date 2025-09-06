// 🦈 SuperOdds Monitor Extension - Popup Script
console.log('🦈 Popup carregado!');

// Estado da aplicação
let isMonitoring = false;
let currentConfig = {
  interval: 1,
  dashboardUrl: ''
};

// Elementos DOM
const elements = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  lastCheck: document.getElementById('lastCheck'),
  oddsCount: document.getElementById('oddsCount'),
  intervalSelect: document.getElementById('intervalSelect'),
  dashboardUrl: document.getElementById('dashboardUrl'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  checkBtn: document.getElementById('checkBtn'),
  highlightBtn: document.getElementById('highlightBtn'),
  openDashboard: document.getElementById('openDashboard'),
  clearData: document.getElementById('clearData')
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📱 Inicializando popup...');
  
  await loadConfig();
  await updateStatus();
  bindEvents();
  
  console.log('✅ Popup inicializado');
});

// Carrega configurações salvas
async function loadConfig() {
  try {
    const data = await chrome.storage.local.get([
      'isMonitoring', 
      'interval', 
      'dashboardUrl',
      'lastCheck',
      'lastOdds'
    ]);
    
    isMonitoring = data.isMonitoring || false;
    currentConfig.interval = data.interval || 1;
    currentConfig.dashboardUrl = data.dashboardUrl || '';
    
    // Atualiza UI com configurações
    elements.intervalSelect.value = currentConfig.interval;
    elements.dashboardUrl.value = currentConfig.dashboardUrl;
    
    // Atualiza dados de status
    if (data.lastCheck) {
      const lastCheckTime = new Date(data.lastCheck);
      elements.lastCheck.textContent = lastCheckTime.toLocaleTimeString();
    }
    
    if (data.lastOdds) {
      elements.oddsCount.textContent = data.lastOdds.length || 0;
    }
    
    console.log('⚙️ Configurações carregadas:', currentConfig);
    
  } catch (error) {
    console.error('❌ Erro ao carregar configurações:', error);
  }
}

// Salva configurações
async function saveConfig() {
  try {
    currentConfig.interval = parseFloat(elements.intervalSelect.value);
    currentConfig.dashboardUrl = elements.dashboardUrl.value.trim();
    
    await chrome.storage.local.set({
      interval: currentConfig.interval,
      dashboardUrl: currentConfig.dashboardUrl
    });
    
    console.log('💾 Configurações salvas:', currentConfig);
    
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
  }
}

// Atualiza status da interface
async function updateStatus() {
  try {
    // Solicita status do background script
    const response = await chrome.runtime.sendMessage({ action: 'status' });
    
    if (response.success) {
      isMonitoring = response.isMonitoring;
      
      // Atualiza indicadores visuais
      if (isMonitoring) {
        elements.statusDot.className = 'status-dot monitoring';
        elements.statusText.textContent = `Monitorando (${currentConfig.interval}min)`;
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = false;
      } else {
        elements.statusDot.className = 'status-dot';
        elements.statusText.textContent = 'Parado';
        elements.startBtn.disabled = false;
        elements.stopBtn.disabled = true;
      }
      
      // Atualiza contadores
      if (response.lastOdds !== undefined) {
        elements.oddsCount.textContent = response.lastOdds;
      }
      
    } else {
      // Erro no status
      elements.statusDot.className = 'status-dot error';
      elements.statusText.textContent = 'Erro';
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    elements.statusDot.className = 'status-dot error';
    elements.statusText.textContent = 'Erro de comunicação';
  }
}

// Eventos da interface
function bindEvents() {
  // Botão Iniciar
  elements.startBtn.addEventListener('click', async () => {
    try {
      await saveConfig();
      
      // Valida se tem aba do BETesporte aberta
      const tabs = await chrome.tabs.query({ url: "https://betesporte.bet.br/*" });
      
      if (tabs.length === 0) {
        showMessage('⚠️ Abra uma aba do BETesporte primeiro!', 'warning');
        return;
      }
      
      showMessage('🚀 Iniciando monitoramento...', 'info');
      
      const response = await chrome.runtime.sendMessage({
        action: 'start',
        interval: currentConfig.interval,
        dashboardUrl: currentConfig.dashboardUrl
      });
      
      if (response.success) {
        showMessage('✅ Monitoramento iniciado!', 'success');
        await updateStatus();
      } else {
        showMessage('❌ Erro ao iniciar', 'error');
      }
      
    } catch (error) {
      console.error('❌ Erro ao iniciar:', error);
      showMessage('❌ Erro: ' + error.message, 'error');
    }
  });

  // Botão Parar
  elements.stopBtn.addEventListener('click', async () => {
    try {
      showMessage('⏹️ Parando monitoramento...', 'info');
      
      const response = await chrome.runtime.sendMessage({ action: 'stop' });
      
      if (response.success) {
        showMessage('⏹️ Monitoramento parado', 'success');
        await updateStatus();
      } else {
        showMessage('❌ Erro ao parar', 'error');
      }
      
    } catch (error) {
      console.error('❌ Erro ao parar:', error);
      showMessage('❌ Erro: ' + error.message, 'error');
    }
  });

  // Botão Screenshot Agora
  elements.checkBtn.addEventListener('click', async () => {
    try {
      // Valida se tem aba do BETesporte
      const tabs = await chrome.tabs.query({ url: "https://betesporte.bet.br/*" });
      
      if (tabs.length === 0) {
        showMessage('⚠️ Abra uma aba do BETesporte primeiro!', 'warning');
        return;
      }
      
      showMessage('📸 Tirando screenshot...', 'info');
      
      const response = await chrome.runtime.sendMessage({ action: 'check' });
      
      if (response.success) {
        showMessage('📸 Screenshot processado!', 'success');
        await updateStatus();
      } else {
        showMessage('❌ Erro no screenshot', 'error');
      }
      
    } catch (error) {
      console.error('❌ Erro no screenshot:', error);
      showMessage('❌ Erro: ' + error.message, 'error');
    }
  });

  // Botão Destacar Odds
  elements.highlightBtn.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true,
        url: "https://betesporte.bet.br/*" 
      });
      
      if (tabs.length === 0) {
        showMessage('⚠️ Vá para uma aba do BETesporte!', 'warning');
        return;
      }
      
      // Envia mensagem para content script
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'highlight_odds'
      });
      
      if (response && response.success) {
        showMessage(`🎯 ${response.count} SuperOdds destacadas!`, 'success');
      } else {
        showMessage('⚠️ Nenhuma SuperOdd encontrada', 'warning');
      }
      
    } catch (error) {
      console.error('❌ Erro ao destacar:', error);
      showMessage('❌ Erro: ' + error.message, 'error');
    }
  });

  // Link Dashboard
  elements.openDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (currentConfig.dashboardUrl) {
      chrome.tabs.create({ url: currentConfig.dashboardUrl });
    } else {
      showMessage('⚠️ Configure a URL do dashboard primeiro', 'warning');
    }
  });

  // Limpar Dados
  elements.clearData.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (confirm('🗑️ Limpar todos os dados salvos?')) {
      try {
        await chrome.storage.local.clear();
        showMessage('🗑️ Dados limpos!', 'success');
        
        // Reseta interface
        elements.dashboardUrl.value = '';
        elements.intervalSelect.value = '1';
        elements.oddsCount.textContent = '--';
        elements.lastCheck.textContent = '--';
        
        currentConfig = { interval: 1, dashboardUrl: '' };
        
      } catch (error) {
        console.error('❌ Erro ao limpar:', error);
        showMessage('❌ Erro ao limpar dados', 'error');
      }
    }
  });

  // Salva configurações quando mudam
  elements.intervalSelect.addEventListener('change', saveConfig);
  elements.dashboardUrl.addEventListener('blur', saveConfig);
}

// Mostra mensagens temporárias
function showMessage(message, type = 'info') {
  console.log(`📢 ${message}`);
  
  // Remove mensagem anterior se existir
  const existing = document.querySelector('.temp-message');
  if (existing) existing.remove();
  
  // Cria nova mensagem
  const messageEl = document.createElement('div');
  messageEl.className = `temp-message ${type}`;
  messageEl.textContent = message;
  
  // Estilos
  messageEl.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    right: 10px;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
    ${getMessageStyles(type)}
  `;
  
  document.body.appendChild(messageEl);
  
  // Remove após 3 segundos
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.style.animation = 'slideUp 0.3s ease-in';
      setTimeout(() => messageEl.remove(), 300);
    }
  }, 3000);
}

function getMessageStyles(type) {
  switch (type) {
    case 'success':
      return 'background: #22c55e; color: white;';
    case 'error':
      return 'background: #dc2626; color: white;';
    case 'warning':
      return 'background: #f59e0b; color: white;';
    default:
      return 'background: #3b82f6; color: white;';
  }
}

// Adiciona animações CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(-100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Atualiza status periodicamente
setInterval(updateStatus, 5000);

console.log('✅ Popup script carregado completamente!');
