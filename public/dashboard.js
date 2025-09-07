console.log('🦈 Dashboard carregando...');

// Aguarda DOM carregar
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM carregado, iniciando dashboard...');
  
  // Testa se botão existe
  const htmlBaseBtn = document.getElementById('htmlBaseModeBtn');
  console.log('🔍 Botão HTML Base encontrado:', htmlBaseBtn);
  
  if (htmlBaseBtn) {
    htmlBaseBtn.addEventListener('click', function() {
      console.log('🔄 Botão HTML Base clicado!');
      showHtmlBaseSection();
    });
    console.log('✅ Event listener adicionado ao botão');
  } else {
    console.error('❌ Botão htmlBaseModeBtn não encontrado!');
  }
  
  // Cria objeto dashboard global
  window.dashboard = {
    enableHtmlBaseMode: showHtmlBaseSection
  };
  
  console.log('✅ Dashboard criado:', window.dashboard);
});

function showHtmlBaseSection() {
  console.log('💾 Criando seção HTML Base...');
  
  // Remove seção existente
  const existing = document.getElementById('htmlBaseSection');
  if (existing) {
    existing.remove();
    console.log('🗑️ Seção anterior removida');
  }
  
  // Cria nova seção
  const section = document.createElement('div');
  section.id = 'htmlBaseSection';
  section.style.cssText = 'margin: 20px 0; padding: 20px; background: #2a2a2a; border-radius: 12px; border: 2px solid #8b5cf6;';
  
  section.innerHTML = `
    <h3 style="color: #8b5cf6; margin-bottom: 16px;">💾 Modo HTML Base Ativado!</h3>
    <p style="color: #cbd5e1; margin-bottom: 16px;">🚀 Agora você pode colar o HTML do BETesporte:</p>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; color: #cbd5e1; margin-bottom: 8px; font-weight: 600;">Cole o HTML aqui:</label>
      <textarea 
        id="htmlInput" 
        rows="8" 
        placeholder="Cole o HTML copiado do BETesporte (F12 → Elements → Copy outerHTML)..."
        style="width: 100%; padding: 12px; background: #1a1a1a; border: 2px solid #475569; border-radius: 8px; color: #f1f5f9; font-family: monospace; font-size: 12px; resize: vertical;"
      ></textarea>
    </div>
    
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <button id="saveHtmlBtn" onclick="saveHtml()" style="padding: 12px 20px; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">💾 Salvar HTML</button>
      <button id="testHtmlBtn" onclick="testHtml()" style="padding: 12px 20px; background: #22c55e; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;" disabled>🧪 Testar</button>
      <button onclick="closeHtmlSection()" style="padding: 12px 20px; background: #dc2626; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">❌ Fechar</button>
    </div>
    
    <div id="htmlStatus" style="margin-top: 16px; padding: 12px; background: #1a1a1a; border-radius: 8px; color: #cbd5e1; font-size: 12px;">
      <strong>Status:</strong> Aguardando HTML...
    </div>
  `;
  
  // Adiciona depois da seção de controles
  const controlsSection = document.querySelector('.controls-section');
  if (controlsSection) {
    controlsSection.after(section);
    console.log('✅ Seção HTML Base criada com sucesso!');
  } else {
    console.error('❌ Seção de controles não encontrada!');
  }
}

function saveHtml() {
  console.log('💾 Salvando HTML...');
  
  const input = document.getElementById('htmlInput');
  const html = input.value.trim();
  
  if (!html) {
    updateStatus('❌ Cole o HTML primeiro!', 'error');
    return;
  }
  
  if (html.length < 1000) {
    updateStatus('⚠️ HTML parece muito pequeno...', 'warning');
  }
  
  // Salva no localStorage
  localStorage.setItem('betesporte_html_base', html);
  localStorage.setItem('betesporte_html_save_time', Date.now());
  
  // Habilita botão de teste
  const testBtn = document.getElementById('testHtmlBtn');
  if (testBtn) testBtn.disabled = false;
  
  updateStatus(`✅ HTML salvo! Tamanho: ${Math.round(html.length / 1024)}KB`, 'success');
  console.log('✅ HTML salvo no localStorage');
}

function testHtml() {
  console.log('🧪 Testando HTML...');
  
  const html = localStorage.getItem('betesporte_html_base');
  if (!html) {
    updateStatus('❌ Nenhum HTML salvo!', 'error');
    return;
  }
  
  updateStatus('🔍 Enviando HTML para análise...', 'info');
  
  // Testa API parse-html
  fetch('/api/parse-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: html })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      updateStatus(`🎯 Sucesso! Encontradas ${data.totalOdds} SuperOdds`, 'success');
      console.log('🎯 Resultado:', data);
      
      // Mostra odds encontradas
      if (data.odds && data.odds.length > 0) {
        showOdds(data.odds);
      }
    } else {
      updateStatus(`❌ Erro: ${data.error}`, 'error');
      console.error('❌ Erro da API:', data);
    }
  })
  .catch(error => {
    updateStatus(`❌ Erro de conexão: ${error.message}`, 'error');
    console.error('❌ Erro:', error);
  });
}

function closeHtmlSection() {
  const section = document.getElementById('htmlBaseSection');
  if (section) {
    section.remove();
    console.log('🗑️ Seção HTML Base fechada');
  }
}

function updateStatus(message, type) {
  const status = document.getElementById('htmlStatus');
  if (status) {
    const colors = {
      success: '#22c55e',
      error: '#dc2626', 
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    status.innerHTML = `<strong style="color: ${colors[type] || '#cbd5e1'}">Status:</strong> ${message}`;
  }
  console.log(`📊 ${message}`);
}

function showOdds(odds) {
  console.log('📊 Mostrando odds:', odds);
  
  const container = document.getElementById('oddsContainer');
  if (!container) return;
  
  if (odds.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #cbd5e1;">
        <div style="font-size: 3rem; margin-bottom: 16px;">🎲</div>
        <h4>Nenhuma SuperOdd encontrada</h4>
        <p>O HTML foi processado mas não encontrou SuperOdds</p>
      </div>
    `;
    return;
  }
  
  const oddsHTML = odds.map(odd => `
    <div style="background: #2a2a2a; border-radius: 12px; padding: 20px; border-left: 4px solid #3b82f6;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div style="font-size: 1.75rem; font-weight: 800; color: #3b82f6;">${odd.oddValue.toFixed(2)}</div>
      </div>
      <div style="font-size: 1rem; font-weight: 600; color: #f1f5f9; margin-bottom: 4px;">${odd.market}</div>
      <div style="font-size: 0.875rem; color: #cbd5e1; margin-bottom: 8px;">${odd.team}</div>
      <div style="font-size: 0.75rem; color: #94a3b8;">
        🕐 ${new Date(odd.timestamp).toLocaleTimeString()}
        ${odd.source ? ` • Via: ${odd.source}` : ''}
      </div>
    </div>
  `).join('');
  
  container.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">${oddsHTML}</div>`;
}

console.log('📁 dashboard.js carregado completamente!');
