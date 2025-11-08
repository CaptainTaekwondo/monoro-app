// server.js — Monoro 2025 (Ultimate Caching Version - With Scraping API Proxy)
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// --- ✨ المفتاح السري للوسيط (تمت إضافته!) ---
const SCRAPINGBEE_API_KEY = 'Z9FGEYKMW4IX648MC489SKBC2HF3C76RWJDBTL8UX4VWRHLK3VBD8NKUOSDEFA9PUFJIEB40R2MF4J3F';

// --- ✨ دالة مساعدة جديدة (للاستدعاء عبر الوسيط) ---
async function fetchWithProxy(targetUrl) {
  const proxyUrl = 'https://app.scrapingbee.com/api/v1/';
  
  const params = {
    api_key: SCRAPINGBEE_API_KEY,
    url: targetUrl, // <-- الموقع الذي نريده
    'render_js': 'false' // (لا نحتاج JS، هذا يجعلها أسرع)
  };

  // (مهلة 9 ثوانٍ، لأن Vercel يعطينا 10 ثوانٍ فقط)
  return await axios.get(proxyUrl, { params, timeout: 9000 }); 
}


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

// ============ 🏦 البنك الأهلي المصري ============
// (هذا API نظيف، لا يحتاج وسيط)
async function fetchNBE() {
  try {
    const url = 'https://www.nbe.com.eg/NBE/Services/Prices/CurrencyPrices.asmx/GetCurrentCurrencyPrices';
    const headers = { 'Content-Type': 'application/json' };
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

// ============ 🏦 بنك مصر ============
// (هذا API نظيف، لا يحتاج وسيط)
async function fetchBanqueMisr() {
  try {
    const url = 'https://www.banquemisr.com/bm/Services/Prices/CurrencyPrices.asmx/GetCurrencyPrices';
    const headers = { 'Content-Type': 'application/json' };
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

// ============ 💰 السوق السوداء ============
// (هذا كشط، يحتاج وسيط)
async function fetchParallelMarket() {
  const results = [];
  try {
    // --- ✨ استخدام الوسيط ---
    const res1 = await fetchWithProxy('https://realegp.com/usd');
    const $1 = cheerio.load(res1.data);
    const rate1 = $1('div.rate-value').first().text().trim().replace(/[^\d.]/g, '');
    if (rate1) {
      results.push({
        bankName: 'السوق السوداء (RealEGP)',
        currencyCode: 'USD',
        buy: parseFloat(rate1),
        sell: parseFloat(rate1)
      });
    }
  } catch (err) {
    console.warn('⚠️ RealEGP fetch fail:', err.message);
  }
  
  // (سنكتفي بمصدر واحد الآن لتقليل استهلاك الـ API)
  return results;
}

// ============ 🪙 أسعار الذهب ============
// (هذا كشط، يحتاج وسيط)
async function fetchGoldRates() {
  try {
    const url = 'https://market.isagha.com/prices';
    // --- ✨ استخدام الوسيط ---
    const res = await fetchWithProxy(url);
    const $ = cheerio.load(res.data);
    const gold = [];

    $('div.gold-row').each((i, el) => {
      const title = $(el).find('.gold-title').text().trim();
      const price = parseFloat($(el).find('.gold-price').text().trim().replace(/[^\d.]/g, '')) || 0;
      if (title && price) gold.push({ carat: title, price });
    });

    const filteredGold = gold.filter(item => 
      item.carat.includes('عيار 24') ||
      item.carat.includes('عيار 21') ||
      item.carat.includes('عيار 18') ||
      item.carat.includes('الجنيه الذهب')
    );

    return {
      source: 'iSagha.com (عبر وسيط)',
      prices: filteredGold,
      last_updated: new Date()
    };
  } catch (err) {
    console.error('❌ Gold fetch error:', err.message);
    return { source: 'iSagha.com (خطأ في التحديث)', prices: [], last_updated: new Date() };
  }
}

// ============ 🌍 Endpoints (كما هي) ============
// (الكود التالي لا يحتاج أي تعديل)

app.get('/api/all-rates', async (req, res) => {
  const currency = req.query.currency || 'USD';
  
  if (isCacheValid('allRates')) {
    console.log('⚡ Using cached data for currencies');
    return res.json(cache.allRates.data);
  }

  console.log(`🔄 Fetching fresh rates for ${currency} via Proxy...`);
  const results = await Promise.allSettled([
    fetchNBE(),
    fetchBanqueMisr(),
    fetchParallelMarket()
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

app.get('/api/gold-rates', async (req, res) => {
  if (isCacheValid('goldRates')) {
    console.log('⚡ Using cached gold data');
    return res.json(cache.goldRates.data);
  }
  
  console.log('🔄 Fetching fresh gold data via Proxy...');
  const gold = await fetchGoldRates();
  cache.goldRates = { data: gold, timestamp: Date.now() };
  res.json(gold);
});

module.exports = app;
