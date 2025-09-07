console.log('🦈 Dashboard carregando...');

class BetEsporteDashboard {
  constructor() {
    this.isMonitoring = false;
    this.interval = 30000;
    this.intervalId = null;
    this.lastData = null;
    this.theme = 'dark';
    this.filter = 'all';
    this.todayStats = { total: 0, updates: 0 };
    this.manualModeEnabled = false;
    
    // PROPRIEDADES HTML BASE
    this.htmlBaseMode = false;
    this.savedHtmlBase = null;
    this.htmlUpdateInterval = null;
    this.lastOddsSignature = null;
    
    this.init();
  }

  init() {
    console.log('🦈 Dashboard inicializando...');
    
    this.loadSettings();
    this.bindEvents();
    this.updateStatus('Conectado', 'online');
    this.addLog('Dashboard inicializado com sucesso', 'success');
  }

  bindEvents() {
    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // HTML BASE MODE BUTTON - PRINCIPAL!
    const htmlBaseBtn = document.getElementById('htmlBaseModeBtn');
    if (htmlBaseBtn) {
      htmlBaseBtn.addEventListener('click', () => {
        console.log('🔄 Botão HTML Base clicado!');
        this.enableHtmlBaseMode();
      });
    } else {
      console.error('❌ Botão htmlBaseModeBtn não encontrado!');
    }

    // Control buttons
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startMonitoring());
    }

    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopMonitoring());
    }

    const manualBtn = document.getElementById('manualModeBtn');
    if (manualBtn) {
      manualBtn.addEventListener('click', () => this.toggleManualMode());
    }

    // Clear log
    const clearBtn = document.getElementById('clearLogBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearLog());
    }
  }

  // ===== MODO HTML BASE =====
  enableHtmlBaseMode() {
    console.log('💾 Ativando modo HTML Base...');
    this.htmlBaseMode = true;
    
    // Para outros modos se ativos
    if (this.isMonitoring) {
      this.stopMonitoring();
    }
    this.disableManualMode();
    
    this.showHtmlBaseSection();
    
    this.addLog('💾 Modo HTML Base ativado', 'success');
    this.updateStatus('HTML Base Mode', 'online');
  }

  showHtmlBaseSection() {
    // Remove seção existente
    const existing = document.getElementById('htmlBaseSection');
    if (existing) existing.remove();
    
    // Cria nova seção
    const htmlBaseSection = document.createElement('div');
    htmlBaseSection.id = 'htmlBaseSection';
    htmlBaseSection.className = 'html-base-section';
    htmlBaseSection.innerHTML = `
      <div class="controls-card" style="border: 2px solid #8b5cf6; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), var(--bg-card));">
        <h3>💾 Modo HTML Base + Auto-Update</h3>
        <p style="color: #8b5cf6; margin-bottom: 16px;">
          🚀 Salve o HTML uma vez e monitore só as SuperOdds automaticamente!
        </p>
        
        <div style="margin: 16px 0;">
          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid #8b5cf6;">
            <div style="background: #8b5cf6; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">1</div>
            <div style="flex: 1;">
              <strong style="color: var(--text-primary); display: block; margin-bottom: 8px;">Cole o HTML Base:</strong>
              <textarea 
                id="htmlBaseInput" 
                rows="6" 
                placeholder="Cole aqui o HTML copiado do BETesporte..."
                style="width: 100%; font-family: monospace; font-size: 11px; background: var(--bg-primary); border: 2px solid var(--border); border-radius: 8px; padding: 12px; color: var(--text-primary);"
              ></textarea>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button id="saveHtmlBaseBtn" class="btn btn-primary">💾 Salvar HTML Base</button>
          <button id="startHtmlUpdateBtn" class="btn btn-accent" disabled>🔄 Iniciar Auto-Update</button>
          <button id="testHtmlBaseBtn" class="btn btn-outline" disabled>🧪 Testar Agora</button>
          <button id="disableHtmlBaseBtn" class="btn btn-small">❌ Desativar Modo</button>
        </div>
        
        <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 12px;">
            <div>
              <strong style="color: #8b5cf6;">HTML Salvo:</strong>
              <div id="htmlSizeInfo">--</div>
            </div>
            <div>
              <strong style="color: #8b5cf6;">Última Verificação:</strong>
              <div id="lastHtmlCheck">--</div>
            </div>
            <div>
              <strong style="color: #8b5cf6;">SuperOdds Detectadas:</strong>
              <div id="htmlOddsCount">--</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Adiciona depois da seção de controles
    const controlsSection = document.querySelector('.controls-section');
    if (controlsSection) {
      controlsSection.after(htmlBaseSection);
    }
    
    // Adiciona event listeners
    const saveBtn = document.getElementById('saveHtmlBaseBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveHtmlBase());
    }

    const startBtn = document.getElementById('startHtmlUpdateBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startHtmlAutoUpdate());
    }

    const testBtn = document.getElementById('testHtmlBaseBtn');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.testHtmlBase());
    }

    const disableBtn = document.getElementById('disableHtmlBaseBtn');
    if (disableBtn) {
      disableBtn.addEventListener('click', () => this.disableHtmlBaseMode());
    }
  }

  async saveHtmlBase() {
    const html = document.getElementById('htmlBaseInput').value.trim();
    
    if (!html) {
      this.showNotification('Erro', 'Cole o HTML da página primeiro', 'error');
      return;
    }
    
    try {
      this.savedHtmlBase = html;
      
      // Salva no localStorage
      localStorage.setItem('betesporte_html_base', html);
      localStorage.setItem('betesporte_html_base_timestamp', Date.now());
      
      const sizeInfo = document.getElementById('htmlSizeInfo');
      if (sizeInfo) {
        sizeInfo.textContent = `${Math.round(html.length / 1024)}KB`;
      }
      
      const startBtn = document.getElementById('startHtmlUpdateBtn');
      if (startBtn) startBtn.disabled = false;
      
      const testBtn = document.getElementById('testHtmlBaseBtn');
      if (testBtn) testBtn.disabled = false;
      
      // Testa imediatamente
      await this.testHtmlBase();
      
      this.addLog('💾 HTML base salvo com sucesso', 'success');
      this.showNotification('HTML Salvo!', 'Base HTML salva. Agora pode iniciar auto-update.', 'success');
      
    } catch (error) {
      this.addLog(`❌ Erro ao salvar HTML: ${error.message}`, 'error');
      this.showNotification('Erro', error.message, 'error');
    }
  }

  startHtmlAutoUpdate() {
    if (!this.savedHtmlBase) {
      this.showNotification('Erro', 'Salve o HTML base primeiro', 'error');
      return;
    }
    
    this.addLog('🔄 Auto-update iniciado (1 minuto)', 'success');
    
    // Primeira verificação imediata
    this.processHtmlBase();
    
    // Inicia interval de 1 minuto
    this.htmlUpdateInterval = setInterval(() => {
      this.processHtmlBase();
    }, 60000);
    
    // Atualiza botões
    const startBtn = document.getElementById('startHtmlUpdateBtn');
    if (startBtn) startBtn.disabled = true;
  }

  async testHtmlBase() {
    if (!this.savedHtmlBase) {
      this.showNotification('Erro', 'Nenhum HTML base salvo', 'error');
      return;
    }
    
    await this.processHtmlBase(true);
  }

  async processHtmlBase(isTest = false) {
    try {
      this.addLog(isTest ? '🧪 Testando HTML base...' : '🔍 Verificando mudanças...', 'info');
      
      // Usa a API parse-html
      const response = await fetch('/api/parse-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: this.savedHtmlBase })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Atualiza interface
        const oddsCount = document.getElementById('htmlOddsCount');
        if (oddsCount) oddsCount.textContent = data.totalOdds;
        
        const lastCheck = document.getElementById('lastHtmlCheck');
        if (lastCheck) lastCheck.textContent = new Date().toLocaleTimeString();
        
        this.updateOddsDisplay(data.odds);
        this.updateStats(data);
        
        this.addLog(`💾 HTML processado: ${data.totalOdds} SuperOdds encontradas`, 'success');
        
        if (!isTest && data.totalOdds > 0) {
          this.showNotification('SuperOdds Atualizadas!', `${data.totalOdds} odds do HTML base`, 'success');
        }
        
      } else {
        throw new Error(data.error || 'Erro ao processar HTML base');
      }
      
    } catch (error) {
      this.addLog(`❌ Erro no HTML base: ${error.message}`, 'error');
      
      if (isTest) {
        this.showNotification('Erro no Teste', error.message, 'error');
      }
    }
  }

  disableHtmlBaseMode() {
    this.htmlBaseMode = false;
    
    // Para auto-update
    if (this.htmlUpdateInterval) {
      clearInterval(this.htmlUpdateInterval);
      this.htmlUpdateInterval = null;
    }
    
    // Remove seção
    const section = document.getElementById('htmlBaseSection');
    if (section) section.remove();
    
    this.addLog('❌ Modo HTML Base desativado', 'info');
    this.updateStatus('Parado', 'warning');
  }

  // ===== MÉTODOS BÁSICOS =====
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.theme);
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.textContent = this.theme === 'dark' ? '🌙' : '☀️';
    }
    this.saveSettings();
  }

  startMonitoring() {
    this.addLog('⚠️ Use o Modo HTML Base para economizar bandwidth!', 'warning');
  }

  stopMonitoring() {
    this.addLog('⏹️ Monitoramento parado', 'info');
  }

  toggleManualMode() {
    this.addLog('💡 Use o Modo HTML Base - é mais eficiente!', 'info');
  }

  updateOddsDisplay(odds) {
    const container = document.getElementById('oddsContainer');
    if (!container) return;
    
    if (!odds || odds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎲</div>
          <h4>Nenhuma SuperOdd encontrada</h4>
          <p>Use o Modo HTML Base para monitorar</p>
        </div>
      `;
      return;
    }
    
    const oddsHTML = `
      <div class="odds-grid">
        ${odds.map(odd => `
          <div class="odd-card">
            <div class="odd-header">
              <div class="odd-value">${odd.oddValue.toFixed(2)}</div>
            </div>
            <div class="odd-market">${odd.market}</div>
            <div class="odd-team">${odd.team}</div>
            <div class="odd-meta">
              <div class="odd-time">🕐 ${new Date(odd.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    container.innerHTML = oddsHTML;
  }

  updateStats(data) {
    const totalOdds = document.getElementById('totalOdds');
    if (totalOdds) totalOdds.textContent = data.totalOdds || 0;
    
    const maxOdd = document.getElementById('maxOdd');
    if (maxOdd && data.odds.length > 0) {
      const max = Math.max(...data.odds.map(o => o.oddValue)).toFixed(2);
      maxOdd.textContent = max;
    }
    
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
      lastUpdate.textContent = new Date().toLocaleTimeString();
    }
  }

  updateStatus(text, type) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    
    const dot = indicator.querySelector('.status-dot');
    const span = indicator.querySelector('span');
    
    if (dot) dot.className = `status-dot ${type}`;
    if (span) span.textContent = text;
  }

  addLog(message, type = 'info') {
    const container = document.getElementById('logContainer');
    if (!container) return;
    
    const time = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="log-message">${message}</span>
    `;
    
    container.insertBefore(logEntry, container.firstChild);
    
    // Limita a 50 entradas
    while (container.children.length > 50) {
      container.removeChild(container.lastChild);
    }
  }

  clearLog() {
    const container = document.getElementById('logContainer');
    if (container) {
      container.innerHTML = '';
      this.addLog('Log limpo', 'info');
    }
  }

  showNotification(title, message, type = 'info') {
    // Notificação simples no console por enquanto
    console.log(`${title}: ${message}`);
    
    // Também adiciona no log
    this.addLog(`${title}: ${message}`, type);
  }

  disableManualMode() {
    // Placeholder
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
        
        document.body.setAttribute('data-theme', this.theme);
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
          themeBtn.textContent = this.theme === 'dark' ? '🌙' : '☀️';
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
  }
}

// Inicializa quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Criando dashboard...');
  window.dashboard = new BetEsporteDashboard();
  
  console.log('✅ Dashboard criado:', window.dashboard);
  console.log('🧪 Teste: dashboard.enableHtmlBaseMode()');
});
