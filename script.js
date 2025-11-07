// هذا هو الكود الصحيح لملف script.js (الواجهة الأمامية)

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
    // (هذه روابط "نسبية". Vercel سيفهمها تلقائياً)
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
        { code: 'QAR', name: 'ريال قطري' },
        { code: 'CHF', name: 'فرنك سويسري' }
    ];

    // --- 4. دالة لملء قائمة اختيار العملات (تُستدعى مرة واحدة) ---
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
        
        // ملء جدول "أفضل شراء" (أنت تشتري)
        topBuyTableBody.innerHTML = ''; // إفراغ الجدول
        if (bestToBuyList.length === 0) {
            topBuyTableBody.innerHTML = '<tr><td colspan="2">لا توجد بيانات متاحة حالياً</td></tr>';
        } else {
            bestToBuyList.forEach(rate => {
                const row = `
                    <tr>
                        <td>${rate.bankName}</td>
                        <td class="price">${rate.sell} جنيه</td>
                    </tr>
                `;
                topBuyTableBody.innerHTML += row;
            });
        }

        // ملء جدول "أفضل بيع" (أنت تبيع)
        topSellTableBody.innerHTML = ''; // إفراغ الجدول
        if (bestToSellList.length === 0) {
            topSellTableBody.innerHTML = '<tr><td colspan="2">لا توجد بيانات متاحة حالياً</td></tr>';
        } else {
            bestToSellList.forEach(rate => {
                const row = `
                    <tr>
                        <td>${rate.bankName}</td>
                        <td class="price">${rate.buy} جنيه</td>
                    </tr>
                `;
                topSellTableBody.innerHTML += row;
            });
        }
    }

    // --- 7. دالة جلب أسعار البنوك (الجديدة والمعدلة) ---
    async function fetchBankRates(currencyCode) {
        console.log(`يتم طلب أسعار ${currencyCode} من الخادم...`);
        try {
            // بناء الرابط بناءً على العملة المختارة
            const apiUrl = `${ALL_RATES_API_BASE}?currency=${currencyCode}`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error('فشل الاتصال بخادم مقارنة البنوك');
            }
            const data = await response.json(); // { bestToBuy: [], bestToSell: [] }

            // إرسال البيانات الجاهزة لدالة العرض
            renderBankTables(data.bestToBuy, data.bestToSell);
            updateCurrencyTitle(currencyCode);
            bankPriceElement.innerText = `يتم عرض أسعار ${data.bestToBuy.length} مصادر`;

        } catch (error) {
            console.error('خطأ في جلب أسعار البنك:', error);
            topBuyTableBody.innerHTML = `<tr><td colspan="2">خطأ في تحميل البيانات</td></tr>`;
            topSellTableBody.innerHTML = `<tr><td colspan="2">خطأ في تحميل البيانات</td></tr>`;
            bankPriceElement.innerText = "خطأ في الاتصال بالخادم";
        }
    }

    // --- 8. دالة جلب أسعار الذهب (مُرقاة) ---
    async function fetchGoldRates() {
        try {
            const response = await fetch(GOLD_API_URL);
            if (!response.ok) {
                throw new Error('فشل الاتصال بخادم الذهب');
            }
            const data = await response.json(); // { source: "...", prices: [...] }

            goldListElement.innerHTML = ''; // إفراغ القائمة
            if (data.prices && data.prices.length > 0) {
                data.prices.forEach(item => {
                    const li = `
                        <li>
                            <span>${item.carat}</span>
                            <strong>${item.price} جنيه</strong>
                        </li>
                    `;
                    goldListElement.innerHTML += li;
                });
                goldSourceElement.innerText = data.source;
            } else {
                goldListElement.innerHTML = '<li>لا توجد بيانات حالياً</li>';
            }
        } catch (error) {
            console.error('خطأ في جلب أسعار الذهب:', error);
            goldListElement.innerHTML = `<li><span style="color:red;">خطأ في تحميل الأسعار</span></li>`;
            goldSourceElement.innerText = 'فشل';
        }
    }

    // --- 9. الدالة الرئيسية لتشغيل كل شيء ---
    async function updateAllData() {
        console.log("جاري التحديث الدوري...");
        
        // احصل على العملة المختارة حالياً
        const selectedCode = currencySelectElement.value;

        // قم بتشغيل الدالتين (جلب البنوك والذهب) في نفس الوقت
        await Promise.all([
            fetchBankRates(selectedCode), // جلب البنوك للعملة المختارة
            fetchGoldRates()
        ]);

        lastUpdateElement.innerText = new Date().toLocaleTimeString('ar-EG');
        console.log("تم التحديث بنجاح.");
    }

    // --- 10. التشغيل الأولي وربط الأحداث ---

    // أ: أولاً، قم بملء القائمة المنسدلة بالعملات الثابتة
    populateCurrencySelector();

    // ب: عندما يغير المستخدم العملة، قم بتحديث بيانات البنوك *فوراً*
    currencySelectElement.addEventListener('change', () => {
        const selectedCode = currencySelectElement.value;
        fetchBankRates(selectedCode); // لا داعي لانتظار الدقيقة الكاملة
        updateCurrencyTitle(selectedCode);
    });

    // ج: قم بتشغيل التحديث الكامل أول مرة عند فتح الصفحة
    updateAllData();

    // د: قم بضبط التحديث الدوري (كل 60 ثانية)
    setInterval(updateAllData, 60000);
});
