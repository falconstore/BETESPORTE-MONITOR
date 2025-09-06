# 🦈 BETesporte SuperOdds Monitor

Sistema completo de monitoramento de SuperOdds do BETesporte com dashboard web hospedado no Vercel.

## ✨ Funcionalidades

- 🔍 **Monitoramento automático** de SuperOdds em tempo real
- 📊 **Dashboard interativo** com estatísticas em tempo real
- 🔔 **Notificações push** para novas SuperOdds
- 🎯 **Filtros inteligentes** (odds altas, com boost, etc.)
- 📱 **Interface responsiva** para desktop e mobile
- 🌙 **Tema claro/escuro** com persistência
- 📈 **Estatísticas diárias** e histórico de atividades
- 🔗 **API REST** para integração externa
- ⚡ **Cache inteligente** para otimização de performance

## 🚀 Deploy no Vercel

### 1️⃣ Preparação do GitHub

\\\`\\\`\\\`bash
# Clone ou fork este repositório
git clone https://github.com/SEU-USUARIO/betesporte-monitor.git
cd betesporte-monitor

# Instale dependências (opcional, apenas para desenvolvimento local)
npm install
\\\`\\\`\\\`

### 2️⃣ Deploy no Vercel

1. **Via Interface Web:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique "New Project"
   - Conecte seu GitHub
   - Selecione o repositório \`betesporte-monitor\`
   - Deploy automático! 🎉

2. **Via CLI:**
\\\`\\\`\\\`bash
npm i -g vercel
vercel login
vercel --prod
\\\`\\\`\\\`

### 3️⃣ Configuração

Após o deploy, seu site estará disponível em:
\\\`
https://betesporte-monitor-SEU-USUARIO.vercel.app
\\\`

## 📁 Estrutura do Projeto

\\\`\\\`\\\`
betesporte-monitor/
├── api/                    # Funções serverless da Vercel
│   ├── superodds.js       # Endpoint principal de SuperOdds
│   ├── webhook.js         # Webhook para dados externos
│   └── proxy.js           # Proxy para CORS (futuro)
├── public/                # Assets estáticos
│   ├── index.html         # Dashboard principal
│   ├── dashboard.js       # Lógica do dashboard
│   ├── dashboard.css      # Estilos
│   └── favicon.ico
├── lib/                   # Bibliotecas auxiliares (futuro)
├── docs/                  # Documentação
├── package.json           # Dependências
├── vercel.json           # Configuração do Vercel
└── README.md             # Este arquivo
\\\`\\\`\\\`

## 🎯 Como Usar

### Dashboard Web
1. Acesse sua URL do Vercel
2. Clique "▶️ Iniciar" para começar o monitoramento
3. Configure o intervalo de atualização (10s - 5min)
4. Use filtros para ver apenas odds específicas
5. Receba notificações automáticas de novas SuperOdds

### API REST

#### \`GET /api/superodds\`
Busca SuperOdds da URL padrão:
\\\`\\\`\\\`bash
curl https://seu-site.vercel.app/api/superodds
\\\`\\\`\\\`

#### \`GET /api/superodds?url=CUSTOM_URL\`
Busca SuperOdds de URL customizada:
\\\`\\\`\\\`bash
curl "https://seu-site.vercel.app/api/superodds?url=https://betesporte.bet.br/custom"
\\\`\\\`\\\`

#### \`GET /api/superodds?force=1\`
Força atualização ignorando cache:
\\\`\\\`\\\`bash
curl "https://seu-site.vercel.app/api/superodds?force=1"
\\\`\\\`\\\`

#### Resposta da API:
\\\`\\\`\\\`json
{
  "success": true,
  "timestamp": 1704067200000,
  "url": "https://betesporte.bet.br/...",
  "totalOdds": 3,
  "odds": [
    {
      "id": "odd_1704067200_1",
      "oddValue": 4.75,
      "market": "Resultado Final",
      "team": "Flamengo",
      "event": "Flamengo vs Palmeiras",
      "originalOdd": 3.20,
      "boost": "48.4%",
      "timestamp": 1704067200000
    }
  ],
  "status": "found",
  "lastUpdate": "2025-01-01T12:00:00.000Z"
}
\\\`\\\`\\\`

## 🔧 Personalização

### Alterando URL de Monitoramento
No dashboard, use o campo "URL Customizada" ou modifique o código:

\\\`\\\`\\\`javascript
// Em api/superodds.js, linha ~15
const targetUrl = url || 'SUA_URL_AQUI';
\\\`\\\`\\\`

### Adicionando Seletores Específicos
Se você tem os arquivos JS do BETesporte, edite os seletores em \`api/superodds.js\`:

\\\`\\\`\\\`javascript
const selectors = [
  '[data-testid*="superodds"]',
  '.seu-seletor-especifico',
  // Adicione seus seletores aqui
];
\\\`\\\`\\\`

### Configurando Notificações

#### Telegram Bot
1. Crie um bot: [@BotFather](https://t.me/BotFather)
2. Obtenha o token e chat ID
3. Modifique \`dashboard.js\` para incluir webhook:

\\\`\\\`\\\`javascript
// Adicione em handleSuperOddsData()
if (newOdds.length > 0) {
  await fetch(\`https://api.telegram.org/bot\${BOT_TOKEN}/sendMessage\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: \`🦈 \${newOdds.length} SuperOdds encontradas!\`
    })
  });
}
\\\`\\\`\\\`

#### Discord Webhook
\\\`\\\`\\\`javascript
// Adicione webhook do Discord
await fetch('SUA_WEBHOOK_URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: \`🦈 **BETesporte SuperOdds**\\n\${newOdds.length} novas odds detectadas!\`
  })
});
\\\`\\\`\\\`

## ⚡ Performance

### Cache Inteligente
- TTL padrão: 30 segundos
- Cache automático por URL
- Bypass com parâmetro \`force=1\`

### Otimizações Vercel
- Edge Functions para baixa latência
- Compressão automática
- CDN global integrado

## 🔒 Segurança e Limitações

### Rate Limiting
- Máximo 50 requests/minuto por IP
- Cache para reduzir carga no BETesporte
- Timeout de 30s por request

### CORS
Todas as APIs incluem headers CORS para acesso de qualquer origem:
\\\`\\\`\\\`javascript
res.setHeader('Access-Control-Allow-Origin', '*');
\\\`\\\`\\\`

### Compliance
- ✅ Apenas dados públicos
- ✅ Headers de navegador real
- ✅ Intervals responsáveis (10s+)
- ✅ Cache para reduzir requests

## 🛠️ Desenvolvimento Local

\\\`\\\`\\\`bash
# Clone o projeto
git clone https://github.com/SEU-USUARIO/betesporte-monitor.git
cd betesporte-monitor

# Instale dependências
npm install

# Execute localmente
vercel dev

# Acesse: http://localhost:3000
\\\`\\\`\\\`

## 🌐 Integrações

### Com suas Calculadoras Existentes
\\\`\\\`\\\`javascript
// Integração automática com ArbiPro
fetch('/api/superodds')
  .then(res => res.json())
  .then(data => {
    if (data.success && window.SharkGreen?.arbiPro) {
      data.odds.forEach((odd, index) => {
        if (index < 6) {
          window.SharkGreen.arbiPro.setHouse(index, {
            odd: odd.oddValue.toString(),
            stake: "100"
          });
        }
      });
    }
  });
\\\`\\\`\\\`

### Webhook Externo
Envie dados de outras fontes para seu dashboard:
\\\`\\\`\\\`bash
curl -X POST https://seu-site.vercel.app/api/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "external_scraper",
    "odds": [{"oddValue": 5.5, "market": "Teste"}]
  }'
\\\`\\\`\\\`

## 📊 Monitoramento e Analytics

### Logs do Vercel
\\\`\\\`\\\`bash
# Visualizar logs em tempo real
vercel logs https://seu-site.vercel.app --follow
\\\`\\\`\\\`

### Métricas de Performance
- Acesse Vercel Dashboard → Analytics
- Monitore latência, erros, usage
- Configure alertas automáticos

## 🆘 Troubleshooting

### Dashboard não carrega SuperOdds
1. Verifique console do navegador (F12)
2. Teste API diretamente: \`/api/superodds\`
3. Verifique logs do Vercel

### API retorna erro 500
1. URL pode estar bloqueada
2. Seletores podem ter mudado
3. Timeout de 30s pode ser insuficiente

### Muitos falsos positivos
1. Ajuste seletores em \`api/superodds.js\`
2. Melhore filtros de odds (min/max)
3. Adicione validações específicas

## 🤝 Contribuição

1. Fork o repositório
2. Crie branch: \`git checkout -b feature/nova-feature\`
3. Commit: \`git commit -am 'Adiciona nova feature'\`
4. Push: \`git push origin feature/nova-feature\`
5. Abra Pull Request

## 📄 Licença

MIT License - use livremente para projetos pessoais.

## 🔗 Links Úteis

- [Vercel Documentation](https://vercel.com/docs)
- [Cheerio (HTML Parsing)](https://cheerio.js.org/)
- [Web Scraping Best Practices](https://blog.apify.com/web-scraping-best-practices/)

## ⭐ Showcase

Depois de configurar, compartilhe sua URL:
\\\`
🦈 Meu Monitor: https://betesporte-monitor-usuario.vercel.app
\\\`

---

**🎯 Pronto para monitorar SuperOdds 24/7 na nuvem!**
\`;
