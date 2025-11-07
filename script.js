// server.js (Clean version based on professional review)

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// --- الوحدة 1: جالب بيانات البنك الأهلي (NBE) ---
async function fetchNBE() {
  try {
    const apiUrl = 'https://www.nbe.com.eg/NBE/Services/Prices/CurrencyPrices.asmx/GetCurrentCurrencyPrices';
    // إضافة Headers كما اقترحت
    const headers = { 'Content-Type': 'application/json' };
    const response = await axios.post(apiUrl, {}, { headers, timeout: 8000 });
    
    const rates = JSON.parse(response.data.d);
    
    return rates.map(rate => ({
      bankName: "البنك الأهلي المصري", // (استخدمت الاسم العربي للواجهة)
      currencyCode: rate.CurrencyCode,
      buy: parseFloat(rate.PurchaseRate) || 0,
      sell: parseFloat(rate.SaleRate) || 0
    }));
  } catch (error) {
    console.error("NBE Fetch Error:", error.message); // رسالة إنجليزية
    return []; 
  }
}

// --- الوحدة 2: جالب بيانات بنك مصر (Banque Misr) ---
async function fetchBanqueMisr() {
  try {
    const apiUrl = 'https://www.banquemisr.com/bm/Services/Prices/CurrencyPrices.asmx/GetCurrencyPrices';
    // إضافة Headers كما اقترحت
    const headers = { 'Content-Type': 'application/json' };
    const response = await axios.post(apiUrl, {}, { headers, timeout: 8000 });
    
    const rates = JSON.parse(response.data.d);

    return rates.map(rate => ({
      bankName: "بنك مصر", // (استخدمت الاسم العربي للواجهة)
      currencyCode: rate.CurrencyCode,
      buy: parseFloat(rate.PurchaseRate) || 0,
      sell: parseFloat(rate.SaleRate) || 0
    }));
  } catch (error) {
    console.error("Banque Misr Fetch Error:", error.message); // رسالة إنجليزية
    return [];
  }
}

// --- نقطة نهاية (Endpoint) لأسعار الذهب (معطل مؤقتاً) ---
app.get('/api/gold-rates', async (req, res) => {
    // (ما زال معطلاً حتى نجد Selectors حقيقية)
    return res.json({
        source: "Gold Price (تحت الصيانة)",
        prices: [
            { carat: "عيار 24", price: 0 },
            { carat: "عيار 21", price: 0 },
            { carat: "عيار 18", price: 0 }
        ],
        last_updated: new Date()
    });
});

// --- نقطة نهاية (Endpoint) الرئيسية (نظيفة) ---
app.get('/api/all-rates', async (req, res) => {
  const requestedCurrency = req.query.currency || 'USD'; 
  console.log(`Fetching rates for: ${requestedCurrency}`); // رسالة إنجليزية

  // (اقتصارنا على ما يعمل فقط، كما اقترحت)
  const [nbe, misr] = await Promise.all([
      fetchNBE(),
      fetchBanqueMisr()
  ]);

  const allRates = [...nbe, ...misr];
  const filteredRates = allRates.filter(rate => rate.currencyCode === requestedCurrency);

  // الترتيب
  const topBuyList = [...filteredRates].sort((a, b) => a.sell - b.sell);
  const topSellList = [...filteredRates].sort((a, b) => b.buy - a.buy);

  res.json({
      currency: requestedCurrency,
      bestToBuy: topBuyList,
      bestToSell: topSellList,
      last_updated: new Date()
  });
});

// --- تصدير التطبيق لـ Vercel ---
// (كما ذكرت أنت، Vercel لا يحتاج app.listen)
module.exports = app;
