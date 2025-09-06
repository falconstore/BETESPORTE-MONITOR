// API para receber dados de fontes externas
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
    const data = req.body;
    
    console.log('📡 Webhook recebido:', {
      timestamp: Date.now(),
      source: data.source || 'unknown',
      oddsCount: data.odds?.length || 0
    });

    // Aqui você pode processar os dados, salvar em database, etc.
    
    // Por enquanto apenas logamos
    if (data.odds && data.odds.length > 0) {
      console.log(`🔥 ${data.odds.length} SuperOdds recebidas via webhook`);
      data.odds.forEach(odd => {
        console.log(`📊 ${odd.market} - ${odd.team}: ${odd.oddValue}`);
      });
    }

    res.status(200).json({
      success: true,
      received: Date.now(),
      processed: data.odds?.length || 0
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
