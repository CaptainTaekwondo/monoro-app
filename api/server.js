// server.js — Monoro (الإصدار المستقر النهائي)
// (يعتمد على APIs البنوك السريعة فقط، ويعطل الكاشطات البطيئة مؤقتاً)

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// ============ 🧠 كاش ذكي =============
// (كما هو)
const cache = {
  allRates: { data: null, timestamp: 0 },
  goldRates: { data: null, timestamp: 0 }
};
const CACHE_DURATION = 60 * 1000; // دقيقة واحدة

function isCacheValid(key) {
  return cache[key].data && (Date.now() - cache[key].timestamp < CACHE_DURATION);
}

// ============ 🏦 البنك الأهلي المصري (سريع ويعمل) ============
async function fetchNBE() {
  try {
    const url = 'https://www.nbe.com.eg/NBE/Services/Prices/CurrencyPrices.asmx/GetCurrentCurrencyPrices';
    const headers = { 'Content-Type': 'application/json' };
    // (مهلة 8 ثوانٍ)
    const res = await axios.post(url, {}, { headers, timeout: 8000 });
    const data = JSON.parse(res.data.d);
    return data.map(r => ({
      bankName: 'البنك الأهلي المصري',
      currencyCode: r.CurrencyCode,
      buy: parseFloat(r.PurchaseRate) || 0,
      sell: parseFloat(r.SaleRate) || 0
    }));
  } catch (err) {
    console.error('❌ NBE error:', err.message);
    return [];
  }
}

// ============ 🏦 بنك مصر (سريع ويعمل) ============
async function fetchBanqueMisr() {
  try {
    const url = 'https://www.banquemisr.com/bm/Services/Prices/CurrencyPrices.asmx/GetCurrencyPrices';
    const headers = { 'Content-Type': 'application/json' };
    // (مهلة 8 ثوانٍ)
    const res = await axios.post(url, {}, { headers, timeout: 8000 });
    const data = JSON.parse(res.data.d);
    return data.map(r => ({
      bankName: 'بنك مصر',
      currencyCode: r.CurrencyCode,
      buy: parseFloat(r.PurchaseRate) || 0,
      sell: parseFloat(r.SaleRate) || 0
    }));
  } catch (err) {
    console.error('❌ Banque Misr error:', err.message);
    return [];
  }
}

// ============ 🌍 Endpoint: أسعار العملات ============
app.get('/api/all-rates', async (req, res) => {
  const currency = req.query.currency || 'USD';
  
  if (isCacheValid('allRates')) {
    console.log('⚡ Using cached data for currencies');
    return res.json(cache.allRates.data);
  }

  console.log(`🔄 Fetching fresh rates for ${currency} (Fast APIs only)...`);
  
  // --- ✨ التعديل: الاعتماد على البنوك السريعة فقط ---
  const results = await Promise.allSettled([
    fetchNBE(),
    fetchBanqueMisr()
    // (تم تعطيل الكاشطات البطيئة التي تفشل بسبب المهلة)
  ]);

  const allRates = [];
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value) allRates.push(...r.value);
  });

  const filtered = allRates.filter(rate => rate.currencyCode === currency);
  const bestToBuy = [...filtered].sort((a, b) => a.sell - b.sell);
  const bestToSell = [...filtered].sort((a, b) => b.buy - a.buy);

  const response = {
    currency,
    bestToBuy,
    bestToSell,
    last_updated: new Date()
  };

  cache.allRates = { data: response, timestamp: Date.now() };
  res.json(response);
});

// ============ 💎 Endpoint: أسعار الذهب (معطل مؤقتاً) ============
app.get('/api/gold-rates', async (req, res) => {
    // (ما زال معطلاً لأن الكاشط بطيء جداً على Vercel)
    return res.json({
        source: "iSagha (تحت الصيانة)",
        prices: [], // (إرسال قائمة فارغة)
        last_updated: new Date()
    });
});

module.exports = app;
