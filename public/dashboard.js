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
    this.loadSavedHtmlBase();
    this.bindEvents();
    this.updateStatus('Conectado', 'online');
    this.addLog('Dashboard inicializado com sucesso', 'success');
    
    // NÃO inicia monitoramento automático
    // setTimeout(() => this.fetchSuperOdds(), 1000);
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

    // Manual mode button
    document.getElementById('manualModeBtn').addEventListener('click', () => {
      this.toggleManualMode();
    });

    // HTML BASE MODE BUTTON - PRINCIPAL!
    document.getElementById('htmlBaseModeBtn').addEventListener('click', () => {
      console.log('🔄 Botão HTML Base clicado!');
      this.enableHtmlBaseMode();
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
    const existing = document.getElementById('htmlBaseSection');
    if (existing) existing.remove();
    
    const htmlBaseSection = document.createElement('div');
    htmlBaseSection.id = 'htmlBaseSection';
    htmlBaseSection.className = 'html-base-section';
    htmlBaseSection.innerHTML = `
      <div class="controls-card" style="border: 2px solid #8b5cf6; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), var(--bg-card));">
        <h3>💾 Modo HTML Base + Auto-Update</h3>
        <p style="color: var(--accent); margin-bottom: 16px;">
          🚀 Salve o HTML uma vez e monitore só as SuperOdds automaticamente!
        </p>
        
        <div class="html-base-steps">
          <div class="step-card">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>Cole o HTML Base:</strong>
              <textarea 
                id="htmlBaseInput" 
                rows="6" 
                placeholder="Cole aqui o HTML copiado do BETesporte..."
                style="font-family: monospace; font-size: 11px; margin-top: 8px;"
              ></textarea>
            </div>
          </div>
          
          <div class="step-card">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>Configure Auto-Update:</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                <select id="htmlUpdateInterval">
                  <option value="30">30 segundos</option>
                  <option value="60" selected>1 minuto</option>
                  <option value="120">2 minutos</option>
                  <option value="300">5 minutos</option>
                </select>
                
                <div id="htmlBaseStatus" style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; text-align: center; font-size: 12px;">
                  Aguardando...
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="control-buttons">
          <button id="saveHtmlBaseBtn" class="btn btn-primary">💾 Salvar HTML Base</button>
          <button id="startHtmlUpdateBtn" class="btn btn-accent" disabled>🔄 Iniciar Auto-Update</button>
          <button id="stopHtmlUpdateBtn" class="btn btn-secondary" disabled>⏹️ Parar Auto-Update</button>
          <button id="testHtmlBaseBtn" class="btn btn-outline" disabled>🧪 Testar Agora</button>
        </div>
        
        <div class="html-base-info" style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 12px;">
            <div>
              <strong>HTML Salvo:</strong>
              <div id="htmlSizeInfo">--</div>
            </div>
            <div>
              <strong>Última Verificação:</strong>
              <div id="lastHtmlCheck">--</div>
            </div>
            <div>
              <strong>SuperOdds Detectadas:</strong>
              <div id="htmlOddsCount">--</div>
            </div>
          </div>
        </div>
        
        <button id="disableHtmlBaseBtn" class="btn btn-small" style="margin-top: 12px;">❌ Desativar Modo</button>
      </div>
    `;
    
    const controlsSection = document.querySelector('.controls-section');
    controlsSection.after(htmlBaseSection);
    
    // Event listeners
    document.getElementById('saveHtmlBaseBtn').addEventListener('click', () => this.saveHtmlBase());
    document.getElementById('startHtmlUpdateBtn').addEventListener('click', () => this.startHtmlAutoUpdate());
    document.getElementById('stopHtmlUpdateBtn').addEventListener('click', () => this.stopHtmlAutoUpdate());
    document.getElementById('testHtmlBaseBtn').addEventListener('click', () => this.testHtmlBase());
    document.getElementById('disableHtmlBaseBtn').addEventListener('click', () => this.disableHtmlBaseMode());
  }

  async saveHtmlBase() {
    const html = document.getElementById('htmlBaseInput').value.trim();
    
    if (!html) {
      this.showNotification('Erro', 'Cole o HTML da página primeiro', 'error');
      return;
    }
    
    if (html.length < 1000) {
      this.showNotification('Aviso', 'HTML parece muito pequeno. Certifique-se de copiar a página completa.', 'warning');
    }
    
    try {
      this.savedHtmlBase = html;
      
      localStorage.setItem('betesporte_html_base', html);
      localStorage.setItem('betesporte_html_base_timestamp', Date.now());
      
      document.getElementById('htmlSizeInfo').textContent = `${Math.round(html.length / 1024)}KB`;
      document.getElementById('startHtmlUpdateBtn').disabled = false;
      document.getElementById('testHtmlBaseBtn').disabled = false;
      
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
    
    const interval = parseInt(document.getElementById('htmlUpdateInterval').value) * 1000;
    
    this.addLog(`🔄 Auto-update iniciado (${interval/1000}s)`, 'success');
    this.updateHtmlBaseStatus('🔄 Ativo');
    
    this.processHtmlBase();
    
    this.htmlUpdateInterval = setInterval(() => {
      this.processHtmlBase();
    }, interval);
    
    document.getElementById('startHtmlUpdateBtn').disabled = true;
    document.getElementById('stopHtmlUpdateBtn').disabled = false;
  }

  stopHtmlAutoUpdate() {
    if (this.htmlUpdateInterval) {
      clearInterval(this.htmlUpdateInterval);
      this.htmlUpdateInterval = null;
    }
    
    this.addLog('⏹️ Auto-update parado', 'warning');
    this.updateHtmlBaseStatus('⏹️ Parado');
    
    document.getElementById('startHtmlUpdateBtn').disabled = false;
    document.getElementById('stopHtmlUpdateBtn').disabled = true;
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
      if (isTest) {
        this.updateHtmlBaseStatus('🧪 Testando...');
      } else {
        this.updateHtmlBaseStatus('🔍 Verificando...');
      }
      
      const response = await fetch('/api/parse-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: this.savedHtmlBase })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const currentOddsSignature = this.generateOddsSignature(data.odds);
        const hasChanges = !this.lastOddsSignature || this.lastOddsSignature !== currentOddsSignature;
        
        if (hasChanges) {
          this.lastOddsSignature = currentOddsSignature;
          
          this.handleSuperOddsData(data);
          this.addLog(`💾 HTML processado: ${data.totalOdds} SuperOdds${hasChanges ? ' (MUDANÇAS!)' : ''}`, 'success');
          
          if (!isTest) {
            this.showNotification('SuperOdds Atualizadas!', `${data.totalOdds} odds do HTML base`, 'success');
          }
        } else if (isTest) {
          this.addLog(`🧪 Teste OK: ${data.totalOdds} SuperOdds (sem mudanças)`, 'info');
        }
        
        document.getElementById('htmlOddsCount').textContent = data.totalOdds;
        document.getElementById('lastHtmlCheck').textContent = new Date().toLocaleTimeString();
        
        if (isTest) {
          this.updateHtmlBaseStatus('✅ Teste OK');
          setTimeout(() => {
            if (!this.htmlUpdateInterval) {
              this.updateHtmlBaseStatus('⏹️ Parado');
            }
          }, 2000);
        } else {
          this.updateHtmlBaseStatus('✅ Ativo');
        }
        
      } else {
        throw new Error(data.error || 'Erro ao processar HTML base');
      }
      
    } catch (error) {
      this.addLog(`❌ Erro no HTML base: ${error.message}`, 'error');
      this.updateHtmlBaseStatus('❌ Erro');
      
      if (isTest) {
        this.showNotification('Erro no Teste', error.message, 'error');
      }
    }
  }

  generateOddsSignature(odds) {
    if (!odds || odds.length === 0) return 'empty';
    
    const signature = odds
      .map(odd => `${odd.oddValue}_${odd.market}_${odd.team}`)
      .sort()
      .join('|');
      
    return btoa(signature).substring(0, 20);
  }

  updateHtmlBaseStatus(status) {
    const statusEl = document.getElementById('htmlBaseStatus');
    if (statusEl) {
      statusEl.textContent = status;
    }
  }

  disableHtmlBaseMode() {
    this.htmlBaseMode = false;
    this.stopHtmlAutoUpdate();
    
    const section = document.getElementById('htmlBaseSection');
    if (section) section.remove();
    
    this.addLog('❌ Modo HTML Base desativado', 'info');
    this.updateStatus('Parado', 'warning');
  }

  async loadSavedHtmlBase() {
    try {
      const savedHtml = localStorage.getItem('betesporte_html_base');
      const timestamp = localStorage.getItem('betesporte_html_base_timestamp');
      
      if (savedHtml && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const ageHours = age / (1000 * 60 * 60);
        
        if (ageHours < 24) {
          this.savedHtmlBase = savedHtml;
          this.addLog(`💾 HTML base carregado (${ageHours.toFixed(1)}h atrás)`, 'info');
          return true;
        } else {
          this.addLog('⚠️ HTML base expirado (>24h), salve um novo', 'warning');
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar HTML base:', error);
    }
    
    return false;
  }

  // ===== RESTO DOS MÉTODOS ORIGINAIS =====
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.theme);
    document.getElementById('themeToggle').textContent = this.theme === 'dark' ? '🌙' : '☀️';
    this.saveSettings();
    this.addLog(`Tema alterado para ${this.theme === 'dark' ? 'escuro' : 'claro'}`);
  }

  async startMonitoring() {
    if (this.isMonitoring) return;
    
    this.disableManualMode();
    this.disableHtmlBaseMode();
    
    this.isMonitoring = true;
    this.addLog(`Monitoramento iniciado (intervalo: ${this.interval/1000}s)`, 'success');
    this.updateStatus('Monitorando...', 'online');
    
    await this.fetchSuperOdds();
    
    this.intervalId = setInterval(() => {
      this.fetchSuperOdds();
    }, this.interval);
    
    document.getElementById('startBtn').style.opacity = '0.5';
    document.getElementById('stopBtn').style.opacity = '1';
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.addLog('🛑 Monitoramento parado pelo usuário', 'warning');
    this.updateStatus('Parado', 'warning');
    
    document.getElementById('startBtn').style.opacity = '1';
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').style.opacity = '0.5';
    document.getElementById('stopBtn').disabled = true;
  }

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
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.success) {
        this.handleSuperOddsData(data);
        this.updateStatus('Online', 'online');
        this.disableManualMode();
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
      
    } catch (error) {
      this.addLog(`❌ Erro: ${error.message}`, 'error');
      this.updateStatus('Erro', 'error');
      this.enableManualMode();
    } finally {
      this.showLoading(false);
    }
  }

  // ===== MODO MANUAL =====
  enableManualMode() {
    if (this.manualModeEnabled) return;
    
    this.disableHtmlBaseMode();
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
    
    const controlsSection = document.querySelector('.controls-section');
    controlsSection.after(manualSection);
    
    document.getElementById('processManualBtn').addEventListener('click', () => this.processManualHtml());
    document.getElementById('getInstructionsBtn').addEventListener('click', () => this.showInstructions());
    document.getElementById('disableManualBtn').addEventListener('click', () => this.disableManualMode());
  }

  disableManualMode() {
    const manualSection = document.getElementById('manualModeSection');
    if (manualSection) {
      manualSection.remove();
      this.manualModeEnabled = false;
    }
  }

  toggleManualMode() {
    if (this.manualModeEnabled) {
      this.disableManualMode();
    } else {
      if (this.isMonitoring) {
        this.stopMonitoring();
      }
      this.enableManualMode();
    }
  }

  async processManualHtml() {
    const html = document.getElementById('manualHtml').value.trim();
    
    if (!html) {
      this.showNotification('Erro', 'Cole o HTML da página primeiro', 'error');
      return;
    }
    
    try {
      this.showLoading(true);
      
      const response = await fetch('/api/parse-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: html })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.handleSuperOddsData(data);
        this.updateStatus('Manual', 'online');
        this.addLog(`✅ HTML processado: ${data.totalOdds} SuperOdds encontradas`, 'success');
        document.getElementById('manualHtml').value = '';
      } else {
        throw new Error(data.error || 'Erro ao processar HTML');
      }
      
    } catch (error) {
      this.addLog(`❌ Erro no modo manual: ${error.message}`, 'error');
      this.showNotification('Erro', error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

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
          
          <button onclick="this.closest('.instruction-modal').remove()" class="btn btn-primary" style="margin-top: 16px;">
            ✅ Entendi
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  // ===== RESTO DOS MÉTODOS =====
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
      }
      
      this.updateOddsDisplay(data.odds);
      this.updateStats(data);
      this.lastData = data;
      this.todayStats.total = Math.max(this.todayStats.total, data.totalOdds);
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
        <div class="odd-meta">
          <div class="odd-time">
            🕐 ${new Date(odd.timestamp).toLocaleTimeString()}
          </div>
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
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    if (this.lastData && this.lastData.odds) {
      this.updateOddsDisplay(this.lastData.odds);
    }
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
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🦈 ${title}`, {
        body: message,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🦈</text></svg>'
      });
    }
    
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
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
    
    container.appendChild(notification);
    
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
        
        document.body.setAttribute('data-theme', this.theme);
        document.getElementById('themeToggle').textContent = this.theme === 'dark' ? '🌙' : '☀️';
        document.getElementById('intervalSelect').value = this.interval;
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
  }
}

// Inicializa dashboard quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new BetEsporteDashboard();
  
  console.log(`
🦈 ===== BETESPORTE DASHBOARD CARREGADO =====

Comandos disponíveis no console:
• dashboard.enableHtmlBaseMode() - Ativa modo HTML Base
• dashboard.startMonitoring() - Inicia monitoramento
• dashboard.stopMonitoring() - Para monitoramento

🚀 Dashboard pronto para uso!
  `);
});
