class BetEsporteDashboard {
  constructor() {
    this.isMonitoring = false;
    this.interval = 30000;
    this.intervalId = null;
    this.lastData = null;
    this.theme = 'dark';
    this.filter = 'all';
    this.todayStats = { total: 0, updates: 0 };
    this.manualModeEnabled = false; // NOVA PROPRIEDADE
    
    this.init();
  }

  init() {
    console.log('🦈 Dashboard inicializando...');
    
    this.loadSettings();
    this.bindEvents();
    this.updateStatus('Conectado', 'online');
    this.addLog('Dashboard inicializado com sucesso', 'success');

toggleManualMode() {
  if (this.manualModeEnabled) {
    this.disableManualMode();
    this.addLog('❌ Modo manual desativado pelo usuário', 'info');
  } else {
    // Para monitoramento se estiver ativo
    if (this.isMonitoring) {
      this.stopMonitoring();
    }
    
    this.enableManualMode();
    this.addLog('📝 Modo manual ativado pelo usuário', 'success');
    this.showNotification(
      'Modo Manual Ativo', 
      'Cole o HTML da página do BETesporte na área abaixo.', 
      'info'
    );
  }
}
    
    // Primeira verificação
    setTimeout(() => this.fetchSuperOdds(), 1000);
  }

  bindEvents() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.fetchSuperOdds(true);
    });

    // Control buttons
    document.getElementById('startBtn').addEventListener('click', () => {
      this.startMonitoring();
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
      this.stopMonitoring();
    });

    document.getElementById('forceUpdateBtn').addEventListener('click', () => {
      this.fetchSuperOdds(true);
    });

    document.getElementById('manualModeBtn').addEventListener('click', () => {
    this.toggleManualMode();
  });

    // Interval change
    document.getElementById('intervalSelect').addEventListener('change', (e) => {
      this.interval = parseInt(e.target.value);
      this.saveSettings();
      
      if (this.isMonitoring) {
        this.stopMonitoring();
        this.startMonitoring();
      }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setFilter(e.target.dataset.filter);
      });
    });

    // Clear log
    document.getElementById('clearLogBtn').addEventListener('click', () => {
      this.clearLog();
    });

    // Request notification permission
    this.requestNotificationPermission();
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.theme);
    document.getElementById('themeToggle').textContent = this.theme === 'dark' ? '🌙' : '☀️';
    this.saveSettings();
    this.addLog(`Tema alterado para ${this.theme === 'dark' ? 'escuro' : 'claro'}`);
  }

  async startMonitoring() {
  if (this.isMonitoring) {
    console.log('⚠️ Monitoramento já está ativo');
    return;
  }
  
  console.log('▶️ Iniciando monitoramento...');
  
  // Remove modo manual se estava ativo
  this.disableManualMode();
  
  this.isMonitoring = true;
  this.addLog(`▶️ Monitoramento iniciado (intervalo: ${this.interval/1000}s)`, 'success');
  this.updateStatus('Monitorando...', 'online');
  
  // Atualiza UI dos botões IMEDIATAMENTE
  document.getElementById('startBtn').style.opacity = '0.5';
  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').style.opacity = '1';
  document.getElementById('stopBtn').disabled = false;
  
  // Primeira verificação imediata
  await this.fetchSuperOdds();
  
  // Só inicia o interval se ainda está monitorando (pode ter parado durante o fetchSuperOdds)
  if (this.isMonitoring) {
    this.intervalId = setInterval(() => {
      // Verifica se ainda deve estar monitorando
      if (this.isMonitoring) {
        this.fetchSuperOdds();
      } else {
        // Para o interval se não deveria estar rodando
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }, this.interval);
    
    console.log('✅ Monitoramento ativo com interval:', this.intervalId);
  }
}

  stopMonitoring() {
  if (!this.isMonitoring) return;
  
  console.log('🛑 Parando monitoramento...');
  
  // Para o monitoramento
  this.isMonitoring = false;
  
  // Limpa interval se existir
  if (this.intervalId) {
    clearInterval(this.intervalId);
    this.intervalId = null;
    console.log('✅ Interval cleared');
  }
  
  // Atualiza status
  this.addLog('🛑 Monitoramento parado pelo usuário', 'warning');
  this.updateStatus('Parado', 'warning');
  
  // Atualiza UI dos botões
  document.getElementById('startBtn').style.opacity = '1';
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').style.opacity = '0.5';
  document.getElementById('stopBtn').disabled = true;
  
  // FORÇA ativação do modo manual se estava com erro
  setTimeout(() => {
    if (!this.manualModeEnabled) {
      this.enableManualMode();
      this.addLog('📝 Modo manual ativado - monitoramento parado', 'info');
      this.showNotification(
        'Monitoramento Parado', 
        'Modo manual ativado. Cole o HTML para continuar monitorando.', 
        'info'
      );
    }
  }, 500);
  
  console.log('🛑 Monitoramento parado completamente');
}

  // MÉTODO ATUALIZADO COM DETECÇÃO DE ERRO 403
  async fetchSuperOdds(force = false) {
  try {
    this.showLoading(true);
    
    const customUrl = document.getElementById('urlInput').value.trim();
    let apiUrl = '/api/superodds';
    
    if (customUrl) {
      apiUrl += `?url=${encodeURIComponent(customUrl)}`;
    }
    
    if (force) {
      apiUrl += (customUrl ? '&' : '?') + 'force=1';
    }
    
    console.log('🔍 Buscando SuperOdds:', apiUrl);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.success) {
      this.handleSuperOddsData(data);
      this.updateStatus('Online', 'online');
      
      // Log informações de estratégia usada
      if (data.fetchMethod) {
        this.addLog(`✅ Conectado via: ${data.fetchMethod}`, 'success');
      }
      
      // Remove modo manual se estava ativo
      this.disableManualMode();
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar SuperOdds:', error);
    
    // Parse da resposta de erro se disponível
    let errorData = null;
    try {
      const response = await fetch('/api/superodds');
      if (!response.ok) {
        errorData = await response.json();
      }
    } catch (e) {
      // Ignora erro de parse
    }
    
    this.addLog(`❌ Erro: ${error.message}`, 'error');
    this.updateStatus('Erro', 'error');
    
    // Verifica se é erro de bloqueio
    const isBlocked = error.message.includes('403') || 
                     error.message.includes('Forbidden') || 
                     error.message.includes('bloqueado') ||
                     error.message.includes('blocked') ||
                     error.message.includes('Site pode estar bloqueando') ||
                     (errorData && errorData.block_detected);
    
    if (isBlocked) {
      this.enableManualMode();
      
      // Mostra sugestões específicas
      const suggestions = errorData?.suggestions || [
        'Site bloqueando requisições automáticas',
        'Use o modo manual para continuar',
        'Tente uma VPN se o problema persistir'
      ];
      
      this.addLog('🚫 Site bloqueando requisições - Modo manual ativo', 'warning');
      
      this.showNotification(
        'API Bloqueada', 
        'Todas as estratégias falharam. Modo manual ativado automaticamente.', 
        'warning'
      );
      
      // Adiciona sugestões no log
      suggestions.forEach(suggestion => {
        this.addLog(`💡 ${suggestion}`, 'info');
      });
      
    } else {
      // Outros tipos de erro
      this.showNotification('Erro de Conexão', error.message, 'error');
      
      // Sugestões genéricas
      this.addLog('💡 Tente: Aguardar alguns minutos e tentar novamente', 'info');
      this.addLog('💡 Verificar conexão com a internet', 'info');
    }
  } finally {
    this.showLoading(false);
  }
}

  // NOVA FUNÇÃO: Ativa modo manual
  enableManualMode() {
    if (this.manualModeEnabled) return;
    
    this.manualModeEnabled = true;
    
    const manualSection = document.createElement('div');
    manualSection.id = 'manualModeSection';
    manualSection.className = 'manual-mode-section';
    manualSection.innerHTML = `
      <div class="controls-card" style="border: 2px solid #f59e0b; background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), var(--bg-card));">
        <h3>📝 Modo Manual Ativado</h3>
        <p style="color: var(--warning); margin-bottom: 16px;">
          🚫 A API está bloqueada. Use o modo manual para continuar monitorando.
        </p>
        
        <div class="control-group">
          <label>HTML da Página BETesporte:</label>
          <textarea 
            id="manualHtml" 
            rows="8" 
            placeholder="Cole aqui o HTML copiado da página do BETesporte..." 
            style="font-family: monospace; font-size: 12px;"
          ></textarea>
        </div>
        
        <div class="control-buttons">
          <button id="processManualBtn" class="btn btn-primary">🔍 Processar HTML</button>
          <button id="getInstructionsBtn" class="btn btn-secondary">📋 Como obter HTML</button>
          <button id="disableManualBtn" class="btn btn-small">❌ Desativar Modo Manual</button>
        </div>
      </div>
    `;
    
    // Insere após a seção de controles
    const controlsSection = document.querySelector('.controls-section');
    controlsSection.after(manualSection);
    
    // Event listeners
    document.getElementById('processManualBtn').addEventListener('click', () => this.processManualHtml());
    document.getElementById('getInstructionsBtn').addEventListener('click', () => this.showInstructions());
    document.getElementById('disableManualBtn').addEventListener('click', () => this.disableManualMode());
    
    this.addLog('📝 Modo manual ativado - API bloqueada', 'warning');
  }

  // NOVA FUNÇÃO: Desativa modo manual
  disableManualMode() {
    const manualSection = document.getElementById('manualModeSection');
    if (manualSection) {
      manualSection.remove();
      this.manualModeEnabled = false;
      this.addLog('✅ Modo manual desativado', 'success');
    }
  }

  // NOVA FUNÇÃO: Processa HTML manual
  async processManualHtml() {
  const html = document.getElementById('manualHtml').value.trim();
  
  if (!html) {
    this.showNotification('Erro', 'Cole o HTML da página primeiro', 'error');
    return;
  }
  
  if (html.length < 1000) {
    this.showNotification('Aviso', 'HTML parece muito pequeno. Certifique-se de copiar a página completa.', 'warning');
  }
  
  try {
    this.showLoading(true);
    this.addLog('📝 Enviando HTML para processamento...', 'info');
    
    // Envia HTML para processamento
    const response = await fetch('/api/parse-html', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ html: html })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Verifica se a resposta é JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('Resposta não é JSON:', textResponse);
      throw new Error('API retornou HTML ao invés de JSON. Verifique se o arquivo api/parse-html.js existe.');
    }
    
    const data = await response.json();
    
    if (data.success) {
      this.handleSuperOddsData(data);
      this.updateStatus('Manual', 'online');
      this.addLog(`✅ HTML processado: ${data.totalOdds} SuperOdds encontradas`, 'success');
      this.showNotification('Sucesso!', `${data.totalOdds} SuperOdds processadas do HTML`, 'success');
      
      // Limpa o textarea
      document.getElementById('manualHtml').value = '';
    } else {
      throw new Error(data.error || 'Erro ao processar HTML');
    }
    
  } catch (error) {
    console.error('Erro completo:', error);
    this.addLog(`❌ Erro no modo manual: ${error.message}`, 'error');
    
    // Erro específico se API não existe
    if (error.message.includes('JSON') || error.message.includes('HTML ao invés')) {
      this.showNotification(
        'Arquivo API Ausente', 
        'O arquivo api/parse-html.js não foi criado. Verifique se fez o deploy corretamente.', 
        'error'
      );
    } else {
      this.showNotification('Erro', error.message, 'error');
    }
  } finally {
    this.showLoading(false);
  }
}
  // NOVA FUNÇÃO: Mostra instruções
  showInstructions() {
    const modal = document.createElement('div');
    modal.className = 'instruction-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>📋 Como obter o HTML da página</h3>
          
          <div class="instruction-steps">
            <div class="step">
              <span class="step-number">1</span>
              <div class="step-content">
                <strong>Abra o BETesporte</strong>
                <p>Navegue até a página de SuperOdds no seu navegador</p>
              </div>
            </div>
            
            <div class="step">
              <span class="step-number">2</span>
              <div class="step-content">
                <strong>Abra DevTools</strong>
                <p>Pressione <kbd>F12</kbd> ou <kbd>Ctrl+Shift+I</kbd></p>
              </div>
            </div>
            
            <div class="step">
              <span class="step-number">3</span>
              <div class="step-content">
                <strong>Vá para Elements</strong>
                <p>Clique na aba "Elements" ou "Elementos"</p>
              </div>
            </div>
            
            <div class="step">
              <span class="step-number">4</span>
              <div class="step-content">
                <strong>Copie o HTML</strong>
                <p>Clique com botão direito em <code>&lt;html&gt;</code><br>
                Selecione "Copy" → "Copy outerHTML"</p>
              </div>
            </div>
            
            <div class="step">
              <span class="step-number">5</span>
              <div class="step-content">
                <strong>Cole e Processe</strong>
                <p>Cole no campo acima e clique "Processar HTML"</p>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 20px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
            <strong>💡 Dica:</strong> Atualize a página do BETesporte antes de copiar para garantir dados frescos.
          </div>
          
          <button onclick="this.closest('.instruction-modal').remove()" class="btn btn-primary" style="margin-top: 16px;">
            ✅ Entendi
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  handleSuperOddsData(data) {
    const hasChanges = this.detectChanges(data);
    
    if (hasChanges || !this.lastData) {
      const newOdds = hasChanges ? this.getNewOdds(data) : data.odds;
      
      if (newOdds.length > 0) {
        this.addLog(`🔥 ${newOdds.length} SuperOdds encontradas`, 'success');
        this.showNotification(
          'SuperOdds Atualizadas!', 
          `${newOdds.length} novas odds detectadas`, 
          'success'
        );
        this.todayStats.updates++;
      } else {
        this.addLog('Nenhuma SuperOdd encontrada');
      }
      
      this.updateOddsDisplay(data.odds);
      this.updateStats(data);
      this.lastData = data;
      this.todayStats.total = Math.max(this.todayStats.total, data.totalOdds);
    } else {
      this.addLog('✅ Nenhuma mudança detectada');
    }
    
    this.updateLastUpdate();
  }

  detectChanges(newData) {
    if (!this.lastData) return true;
    
    if (this.lastData.totalOdds !== newData.totalOdds) return true;
    
    const oldOdds = this.lastData.odds.map(o => `${o.oddValue}_${o.market}`);
    const newOdds = newData.odds.map(o => `${o.oddValue}_${o.market}`);
    
    return JSON.stringify(oldOdds) !== JSON.stringify(newOdds);
  }

  getNewOdds(newData) {
    if (!this.lastData) return newData.odds;
    
    const oldOddsMap = new Map(
      this.lastData.odds.map(o => [`${o.oddValue}_${o.market}`, o])
    );
    
    return newData.odds.filter(odd => 
      !oldOddsMap.has(`${odd.oddValue}_${odd.market}`)
    );
  }

  updateOddsDisplay(odds) {
    const container = document.getElementById('oddsContainer');
    
    if (!odds || odds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎲</div>
          <h4>Nenhuma SuperOdd encontrada</h4>
          <p>Aguarde a próxima verificação ou force uma atualização</p>
        </div>
      `;
      return;
    }
    
    const filteredOdds = this.filterOdds(odds);
    
    if (filteredOdds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h4>Nenhuma odd encontrada com o filtro atual</h4>
          <p>Tente alterar o filtro para ver mais resultados</p>
        </div>
      `;
      return;
    }
    
    const oddsHTML = `
      <div class="odds-grid">
        ${filteredOdds.map(odd => this.createOddCard(odd)).join('')}
      </div>
    `;
    
    container.innerHTML = oddsHTML;
  }

  filterOdds(odds) {
    switch (this.filter) {
      case 'high':
        return odds.filter(odd => odd.oddValue >= 5.0);
      case 'boosted':
        return odds.filter(odd => odd.boost);
      default:
        return odds;
    }
  }

  createOddCard(odd) {
    const isHighOdd = odd.oddValue >= 5.0;
    const isBoosted = odd.boost;
    const cardClass = isHighOdd ? 'high-odd' : (isBoosted ? 'boosted' : '');
    
    return `
      <div class="odd-card ${cardClass}">
        <div class="odd-header">
          <div class="odd-value">${odd.oddValue.toFixed(2)}</div>
          ${odd.boost ? `<div class="odd-boost">+${odd.boost}</div>` : ''}
        </div>
        <div class="odd-market">${odd.market}</div>
        <div class="odd-team">${odd.team}</div>
        ${odd.event && odd.event !== 'Evento detectado' ? `<div class="odd-event">${odd.event}</div>` : ''}
        <div class="odd-meta">
          <div class="odd-time">
            🕐 ${new Date(odd.timestamp).toLocaleTimeString()}
          </div>
          ${odd.originalOdd ? `<div class="odd-original">Era: ${odd.originalOdd}</div>` : ''}
          ${odd.source ? `<div class="odd-source">Via: ${odd.source}</div>` : ''}
        </div>
      </div>
    `;
  }

  updateStats(data) {
    document.getElementById('totalOdds').textContent = data.totalOdds || 0;
    
    const maxOdd = data.odds.length > 0 
      ? Math.max(...data.odds.map(o => o.oddValue)).toFixed(2)
      : '--';
    document.getElementById('maxOdd').textContent = maxOdd;
    
    document.getElementById('todayTotal').textContent = this.todayStats.total;
  }

  updateLastUpdate() {
    const now = new Date().toLocaleTimeString();
    document.getElementById('lastUpdate').textContent = now;
  }

  updateStatus(text, type) {
    const indicator = document.getElementById('statusIndicator');
    const dot = indicator.querySelector('.status-dot');
    const span = indicator.querySelector('span');
    
    dot.className = `status-dot ${type}`;
    span.textContent = text;
  }

  setFilter(filter) {
    this.filter = filter;
    
    // Atualiza botões
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Reaplica filtro se temos dados
    if (this.lastData && this.lastData.odds) {
      this.updateOddsDisplay(this.lastData.odds);
    }
    
    this.addLog(`Filtro alterado para: ${filter}`);
  }

  addLog(message, type = 'info') {
    const container = document.getElementById('logContainer');
    const time = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="log-message">${message}</span>
    `;
    
    container.insertBefore(logEntry, container.firstChild);
    
    // Mantém apenas os últimos 50 logs
    while (container.children.length > 50) {
      container.removeChild(container.lastChild);
    }
  }

  clearLog() {
    document.getElementById('logContainer').innerHTML = '';
    this.addLog('Log limpo', 'info');
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('active', show);
  }

  showNotification(title, message, type = 'info') {
    // Notificação do navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🦈 ${title}`, {
        body: message,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🦈</text></svg>'
      });
    }
    
    // Notificação na página
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">${title}</div>
        <button class="notification-close">&times;</button>
      </div>
      <div class="notification-message">${message}</div>
    `;
    
    // Event listener para fechar
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
    
    container.appendChild(notification);
    
    // Remove automaticamente após 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.addLog('Permissão de notificação concedida', 'success');
      }
    }
  }

  saveSettings() {
    const settings = {
      theme: this.theme,
      interval: this.interval,
      filter: this.filter,
      todayStats: this.todayStats
    };
    localStorage.setItem('betesporte_dashboard_settings', JSON.stringify(settings));
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('betesporte_dashboard_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.theme = settings.theme || 'dark';
        this.interval = settings.interval || 30000;
        this.filter = settings.filter || 'all';
        this.todayStats = settings.todayStats || { total: 0, updates: 0 };
        
        // Aplica configurações na UI
        document.body.setAttribute('data-theme', this.theme);
        document.getElementById('themeToggle').textContent = this.theme === 'dark' ? '🌙' : '☀️';
        document.getElementById('intervalSelect').value = this.interval;
        
        // Reseta stats se for um novo dia
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem('betesporte_last_date');
        
        if (lastDate !== today) {
          this.todayStats = { total: 0, updates: 0 };
          localStorage.setItem('betesporte_last_date', today);
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
  }

  // Método para exportar dados
  exportData() {
    const data = {
      lastData: this.lastData,
      todayStats: this.todayStats,
      settings: {
        theme: this.theme,
        interval: this.interval,
        filter: this.filter
      },
      timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `betesporte_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.addLog('Dados exportados com sucesso', 'success');
  }
}

// Auto-save das configurações
window.addEventListener('beforeunload', () => {
  if (window.dashboard) {
    window.dashboard.saveSettings();
  }
});

// Inicializa dashboard quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new BetEsporteDashboard();
  
  // Disponibiliza métodos globais para debug
  window.exportData = () => window.dashboard.exportData();
  
  console.log(`
🦈 ===== BETESPORTE DASHBOARD CARREGADO =====

Comandos disponíveis no console:
• dashboard.startMonitoring() - Inicia monitoramento
• dashboard.stopMonitoring() - Para monitoramento
• dashboard.fetchSuperOdds(true) - Força atualização
• exportData() - Exporta dados coletados
• dashboard.showNotification() - Testa notificações

🚀 Dashboard pronto para uso!
  `);
});
