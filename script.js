// script.js (الواجهة الأمامية - إصدار 2025)
// هذا الكود يتحدث إلى الكاشطات الحقيقية (الذهب، السوق الموازية، البنوك)

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. تحديد العناصر في الصفحة ---
    const lastUpdateElement = document.getElementById('last-update');
    const topBuyTableBody = document.getElementById('top-buy-banks').getElementsByTagName('tbody')[0];
    const topSellTableBody = document.getElementById('top-sell-banks').getElementsByTagName('tbody')[0];
    const currencySelectElement = document.getElementById('foreign-currency-select');
    const currencyTitleElement = document.getElementById('currency-title');
    const bankPriceElement = document.getElementById('cbe-eur-price'); // عنصر ملخص المقارنة
    const goldListElement = document.getElementById('gold-price-list'); // قائمة الذهب
    const goldSourceElement = document.getElementById('gold-source'); // مصدر الذهب

    // --- 2. تحديد روابط الـ API ---
    // (روابط نسبية، Vercel يفهمها)
    const ALL_RATES_API_BASE = '/api/all-rates';
    const GOLD_API_URL = '/api/gold-rates';

    // --- 3. قائمة العملات التي سنهتم بها ---
    const famousCurrencies = [
        { code: 'USD', name: 'دولار أمريكي' },
        { code: 'EUR', name: 'يورو' },
        { code: 'SAR', name: 'ريال سعودي' },
        { code: 'KWD', name: 'دينار كويتي' },
        { code: 'GBP', name: 'جنيه استرليني' },
        { code: 'AED', name: 'درهم إماراتي' },
    ];

    // --- 4. دالة لملء قائمة اختيار العملات ---
    function populateCurrencySelector() {
        currencySelectElement.innerHTML = ''; // إفراغ القائمة
        
        famousCurrencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency.code; // القيمة هي الرمز (USD)
            option.textContent = currency.name; // النص هو الاسم
            currencySelectElement.appendChild(option);
        });
        
        // اجعل الدولار هو الاختيار الافتراضي
        currencySelectElement.value = "USD";
    }

    // --- 5. دالة لتحديث عنوان العملة المختار ---
    function updateCurrencyTitle(selectedCode) {
        const selectedCurrency = famousCurrencies.find(c => c.code === selectedCode);
        const currencyName = selectedCurrency ? selectedCurrency.name : selectedCode;
        currencyTitleElement.innerHTML = `<i class="fas fa-coins"></i> أفضل أسعار ${currencyName}`;
    }

    // --- 6. دالة لملء الجداول بالبيانات الجاهزة ---
    function renderBankTables(bestToBuyList, bestToSellList) {
        
        topBuyTableBody.innerHTML = ''; // إفراغ الجدول
        if (bestToBuyList.length === 0) {
            topBuyTableBody.innerHTML = '<tr><td colspan="2">لا توجد بيانات متاحة حالياً</td></tr>';
        } else {
            bestTo
