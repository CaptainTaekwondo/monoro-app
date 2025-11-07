// server.js — Monoro 2025 (Ultimate Caching Version)
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// ============ 🧠 كاش ذكي =============
const cache = {
  allRates: { data: null, timestamp: 0 },
  goldRates: { data: null, timestamp: 0 }
};
const CACHE_DURATION = 60 * 1000; // دقيقة واحدة (60 ثانية)

// دالة مساعدة لفحص الكاش
function isCacheValid(key) {
  return cache[key].data && (Date.now() - cache[key].timestamp < CACHE_DURATION);
}

// ============ 🏦 البنك الأهلي المصري ============
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
async function fetchParallelMarket() {
  const results = [];
  try {
    const res1 = await axios.get('https://realegp.com/usd', { timeout: 10000 });
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

  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3' };
    const res2 = await axios.get('https://sarf-today.com/currency/us_dollar/market', { headers, timeout: 10000 });
    const $2 = cheerio.load(res2.data);
    const rate2 = $2('.market-price-number').first().text().trim().replace(/[^\d.]/g, '');
    if (rate2) {
      results.push({
        bankName: 'السوق الموازية (Sarf-Today)',
        currencyCode: 'USD',
        buy: parseFloat(rate2),
        sell: parseFloat(rate2)
      });
    }
  } catch (err) {
    console.warn('⚠️ SarfToday fetch fail:', err.message);
  }

  return results;
}

// ============ 🪙 أسعار الذهب ============
async function fetchGoldRates() {
  try {
    const url = 'https://market.isagha.com/prices';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3' };
    const res = await axios.get(url, { headers, timeout: 10000 });
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
      source: 'iSagha.com',
      prices: filteredGold,
      last_updated: new Date()
    };
  } catch (err) {
    console.error('❌ Gold fetch error:', err.message);
    return { source: 'iSagha.com (خطأ في التحديث)', prices: [], last_updated: new Date() };
  }
}

// ============ 🌍 Endpoint: أسعار العملات ============
app.get('/api/all-rates', async (req, res) => {
  const currency = req.query.currency || 'USD';
  
  if (isCacheValid('allRates')) {
    console.log('⚡ Using cached data for currencies');
    return res.json(cache.allRates.data);
  }

  console.log(`🔄 Fetching fresh rates for ${currency}...`);
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

// ============ 💎 Endpoint: أسعار الذهب ============
app.get('/api/gold-rates', async (req, res) => {
  if (isCacheValid('goldRates')) {
    console.log('⚡ Using cached gold data');
    return res.json(cache.goldRates.data);
  }
  
  console.log('🔄 Fetching fresh gold data...');
  const gold = await fetchGoldRates();
  cache.goldRates = { data: gold, timestamp: Date.now() };
  res.json(gold);
});

// --- تصدير التطبيق لـ Vercel ---
module.exports = app;
