// server.js — (إصدار الاختبار الوهمي - سيظهر البيانات فوراً)
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

// ============ 🌍 Endpoint: أسعار العملات (بيانات وهمية) ============
app.get('/api/all-rates', async (req, res) => {
  console.log('⚡ Sending MOCK currency data');
  
  // بيانات وهمية فورية
  const fakeData = {
    currency: req.query.currency || 'USD',
    bestToBuy: [
      { bankName: 'البنك الأهلي (وهمي)', sell: 50.10 },
      { bankName: 'بنك مصر (وهمي)', sell: 50.20 }
    ],
    bestToSell: [
      { bankName: 'السوق الموازية (وهمي)', buy: 51.50 },
      { bankName: 'بنك CIB (وهمي)', buy: 50.00 }
    ],
    last_updated: new Date()
  };
  
  res.json(fakeData);
});

// ============ 💎 Endpoint: أسعار الذهب (بيانات وهمية) ============
app.get('/api/gold-rates', async (req, res) => {
  console.log('⚡ Sending MOCK gold data');

  // بيانات وهمية فورية
  const fakeGold = {
    source: 'iSagha (وهمي)',
    prices: [
      { carat: 'عيار 24', price: 4000 },
      { carat: 'عيار 21', price: 3500 },
      { carat: 'عيار 18', price: 3000 }
    ],
    last_updated: new Date()
  };
  
  res.json(fakeGold);
});

// --- تصدير التطبيق لـ Vercel ---
module.exports = app;
