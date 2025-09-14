// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyCAjL7T72-kq6DL7gWzzfpqswcNTqdkjZ0",
  authDomain: "sales-pro-83fc2.firebaseapp.com",
  databaseURL: "https://sales-pro-83fc2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sales-pro-83fc2",
  storageBucket: "sales-pro-83fc2.firebasestorage.app",
  messagingSenderId: "727475911328",
  appId: "1:727475911328:web:b484d326d578d58819a7c5",
  measurementId: "G-MRK7K77X9T"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore reference
const db = firebase.firestore();
document.addEventListener('DOMContentLoaded', () => {

    // --- App State ---
    let appState = {
        productDatabase: [],
        salesLedger: {},
        currentMonthView: '', // Can be 'YYYY-MM' or 'all-time'
    };
    let html5QrCode = null; // To hold the scanner instance

    // --- DOM References ---
    const allPages = document.querySelectorAll('.page');
    const mainNav = document.getElementById('main-nav');
    const messageModal = document.getElementById('message-modal');
    const messageText = document.getElementById('modal-message');
    const messageCloseBtn = document.getElementById('modal-close-btn');
    const newMonthModal = document.getElementById('new-month-modal');
    const newMonthForm = document.getElementById('new-month-form');
    const newMonthCancelBtn = document.getElementById('new-month-cancel');
    const scannerModal = document.getElementById('scanner-modal');
    const scannerCancelBtn = document.getElementById('scanner-cancel-btn');

    // --- DYNAMIC PAGE TEMPLATES ---
    const getPageTemplate = (pageId) => {
        const templates = {
            'home': `
                <h2 class="text-3xl font-bold text-slate-800 mb-2">Dashboard</h2>
                <p class="text-slate-500 mb-8">Live overview of your sales and stock.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="dashboard-card p-6">
                        <h3 class="font-semibold text-slate-500">Total Sales (Month)</h3>
                        <p id="month-sales" class="text-4xl font-bold text-pink-600 mt-2">₹0.00</p>
                    </div>
                    <div class="dashboard-card p-6">
                        <h3 class="font-semibold text-slate-500">Total Stock (MM)</h3>
                        <p id="total-stock-mm" class="text-4xl font-bold text-sky-600 mt-2">0</p>
                    </div>
                    <div class="dashboard-card p-6">
                        <h3 class="font-semibold text-slate-500">Total Stock (Max)</h3>
                        <p id="total-stock-max" class="text-4xl font-bold text-teal-600 mt-2">0</p>
                    </div>
                    <div class="dashboard-card p-6">
                        <h3 class="font-semibold text-slate-500">Total Products</h3>
                        <p id="total-products" class="text-4xl font-bold text-violet-600 mt-2">0</p>
                    </div>
                </div>
                 <div class="dashboard-card p-6">
                    <h3 class="text-xl font-bold mb-4">Quick Actions</h3>
                     <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="quick-actions">
                         <a href="#log-sale" class="nav-card text-center p-6 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100">
                            <h4 class="text-lg font-bold">Log a Sale</h4>
                        </a>
                        <a href="#stock" class="nav-card text-center p-6 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100">
                            <h4 class="text-lg font-bold">Update Stock</h4>
                        </a>
                        <a href="#products" class="nav-card text-center p-6 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100">
                            <h4 class="text-lg font-bold">Add Product</h4>
                        </a>
                        <a href="#report" class="nav-card text-center p-6 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100">
                            <h4 class="text-lg font-bold">View Reports</h4>
                        </a>
                    </div>
                </div>`,
            'stock': `
                <div class="dashboard-card">
                    <div class="p-4 sm:p-6 border-b"><h3 class="text-2xl font-bold text-slate-800">Stock Overview</h3></div>
                    <div class="overflow-x-auto"><table class="min-w-full">
                        <thead class="bg-slate-50"><tr>
                            <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Model</th>
                            <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">MM Mobiles</th>
                            <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Max</th>
                            <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Total</th>
                        </tr></thead>
                        <tbody id="stock-table-body" class="divide-y divide-slate-200"></tbody>
                    </table></div>
                </div>`,
            'products': `
                <div class="dashboard-card p-6 md:p-8">
                    <h3 class="text-2xl font-bold mb-6 border-b pb-4">Manage Products</h3>
                    <form id="product-form" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="md:col-span-2"><label class="block text-sm font-medium text-slate-600 mb-1">Barcode</label><input type="text" id="product-barcode" class="w-full p-2 border rounded-lg" required></div>
                        <div class="md:col-span-2"><label class="block text-sm font-medium text-slate-600 mb-1">Model Name (incl. variant)</label><input type="text" id="product-model" class="w-full p-2 border rounded-lg" required placeholder="e.g. VIVO Y19 (6+128)"></div>
                        <div><label class="block text-sm font-medium text-slate-600 mb-1">MRP (₹)</label><input type="number" id="product-mrp" class="w-full p-2 border rounded-lg" required></div>
                        <div><label class="block text-sm font-medium text-slate-600 mb-1">Initial Stock (MM)</label><input type="number" id="product-stock-mm" class="w-full p-2 border rounded-lg" required value="0" min="0"></div>
                        <div><label class="block text-sm font-medium text-slate-600 mb-1">Initial Stock (Max)</label><input type="number" id="product-stock-max" class="w-full p-2 border rounded-lg" required value="0" min="0"></div>
                        <div class="md:col-span-2 flex justify-end"><button type="submit" class="brand-gradient text-white px-6 py-2 rounded-lg font-semibold">Add Product</button></div>
                    </form>
                    <div class="overflow-x-auto"><table class="min-w-full"><thead class="bg-slate-50"><tr>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Model</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Barcode</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">MM</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Max</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr></thead><tbody id="product-table-body"></tbody></table></div>
                </div>`,
             'log-sale': `
                <div class="dashboard-card p-6 md:p-8">
                     <div class="flex justify-between items-center mb-6 border-b pb-4"><h3 class="text-2xl font-bold">Log a Sale</h3><div id="log-month-selector-container"></div></div>
                     <form id="sales-form" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">Shop</label><select id="sale-shop" name="shop" class="w-full p-2 border rounded-lg" required><option value="" disabled selected>Select Shop</option><option value="MM">MM Mobiles</option><option value="Max">Max</option></select></div>
                         <div>
                             <label class="block text-sm font-medium text-slate-600 mb-1">Barcode</label>
                             <div class="flex">
                                <input type="text" id="sale-barcode" name="barcode" class="w-full p-2 border-r-0 border rounded-l-lg" placeholder="Enter or Scan Barcode">
                                <button type="button" id="scan-btn" class="bg-violet-600 text-white p-2 hover:bg-violet-700" title="Scan Barcode"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></button>
                                <button type="button" id="fetch-btn" class="bg-slate-700 text-white px-4 rounded-r-lg font-semibold text-sm">Fetch</button>
                             </div>
                         </div>
                         <div class="md:col-span-2"><label class="block text-sm font-medium text-slate-600 mb-1">Model</label><input type="text" id="sale-model" name="model" class="w-full p-2 border rounded-lg bg-slate-100" readonly></div>
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">MRP (₹)</label><input type="number" id="sale-mrp" name="mrp" class="w-full p-2 border rounded-lg bg-slate-100" readonly></div>
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">Date</label><input type="date" id="sale-date" name="date" class="w-full p-2 border rounded-lg" required></div>
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">Mode of Payment</label><select id="sale-mode" name="mode" class="w-full p-2 border rounded-lg" required><option>CASH</option><option>BAJAJ</option><option>CARD</option><option>UPI</option></select></div>
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">Customer Name</label><input type="text" id="sale-name" name="name" class="w-full p-2 border rounded-lg"></div>
                         <div class="md:col-span-2 flex justify-end"><button type="submit" class="brand-gradient text-white px-6 py-2 rounded-lg font-semibold">Log This Sale</button></div>
                     </form>
                </div>`,
            'sales-data': `
                 <div class="dashboard-card">
                    <div class="flex flex-wrap justify-between items-center p-4 sm:p-6 border-b gap-4">
                        <div id="data-month-selector-container"></div>
                        <button id="export-btn" class="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span>Export to XL</span>
                        </button>
                    </div>
                    <div class="p-4 sm:p-6 bg-slate-50 border-b">
                         <h4 class="text-sm font-semibold text-slate-500">Total Sales for Selected Period</h4>
                         <p id="sales-period-total" class="text-2xl font-bold text-pink-600">₹0.00</p>
                    </div>
                    <div class="overflow-x-auto"><table class="min-w-full"><thead class="bg-slate-50"><tr>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">SL</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Model</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Shop</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">MRP</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Mode</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Barcode</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr></thead><tbody id="sales-table-body" class="divide-y divide-slate-200"></tbody></table></div>
                </div>`,
            'report': `
                <div class="dashboard-card p-6 md:p-8">
                    <div class="flex justify-between items-center mb-6 border-b pb-4">
                        <h3 class="text-2xl font-bold text-slate-800">Sales Report</h3>
                        <div id="report-month-selector-container"></div>
                    </div>
                    <div id="report-content"></div>
                </div>`
        };
        return templates[pageId] || '';
    };

    // --- NAVIGATION ---
    const showPage = (pageId) => {
        if (!pageId) pageId = 'home'; // Default to home
        allPages.forEach(p => p.classList.toggle('hidden', p.id !== `page-${pageId}`));
        mainNav.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.hash === `#${pageId}`));
        
        const targetPage = document.getElementById(`page-${pageId}`);
        targetPage.innerHTML = getPageTemplate(pageId);

        // Call the specific render function for the active page
        switch(pageId) {
            case 'home': renderHomePage(); break;
            case 'stock': renderStockPage(); break;
            case 'products': renderProductPage(); break;
            case 'log-sale': renderLogSalePage(); break;
            case 'sales-data': renderSalesDataPage(); break;
            case 'report': renderReportPage(); break;
        }
        window.scrollTo(0, 0);
    }
    
    // --- LOCAL STORAGE ---
    const saveState = () => {
        try {
            localStorage.setItem('salesProData_v3', JSON.stringify(appState));
        } catch (e) {
            console.error("Error saving state to localStorage:", e);
        }
    }
    const loadState = () => {
        try {
            const savedData = localStorage.getItem('salesProData_v3');
            if (savedData) {
                appState = JSON.parse(savedData);
            } else {
                // Setup with new structure if no data exists
                appState.productDatabase = [{ barcode: '8901234567890', model: 'VIVO Y200 (8+128)', mrp: 18999, stockMM: 10, stockMax: 5 }];
                appState.productDatabase.push({ barcode: '8901234567891', model: 'VIVO Y19 (6+128)', mrp: 12499, stockMM: 8, stockMax: 12 });
                const today = new Date();
                const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });
                appState.salesLedger = {}; // Ensure it's an object
                appState.salesLedger[monthKey] = { name: monthName, sales: [] };
                appState.currentMonthView = monthKey;
            }
            if (!appState.currentMonthView) {
                const monthKeys = Object.keys(appState.salesLedger);
                appState.currentMonthView = monthKeys.length > 0 ? monthKeys[monthKeys.length - 1] : 'all-time';
            }
        } catch (e) {
            console.error("Error loading state from localStorage:", e);
            // Reset to a default state if there's a parsing error
            appState = { productDatabase: [], salesLedger: {}, currentMonthView: 'all-time' };
        }
    }

    // --- BARCODE SCANNER ---
    const startScanner = () => {
        scannerModal.classList.remove('hidden');
        document.getElementById('scanner-status').textContent = 'Initializing camera...';
        html5QrCode = new Html5Qrcode("reader");

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            document.getElementById('sale-barcode').value = decodedText;
            stopScanner();
            showMessage(`Barcode ${decodedText} scanned successfully!`);
            document.getElementById('fetch-btn').click();
        };
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                const cameraId = devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[0].id;
                html5QrCode.start(cameraId, config, qrCodeSuccessCallback)
                    .then(() => { document.getElementById('scanner-status').textContent = 'Point camera at a barcode.'; })
                    .catch(err => {
                        document.getElementById('scanner-status').textContent = 'Camera start error.';
                        console.error("Scanner start error:", err);
                    });
            } else {
                 document.getElementById('scanner-status').textContent = 'No camera found.';
            }
        }).catch(err => {
            document.getElementById('scanner-status').textContent = 'Camera permission denied.';
            console.error("Camera permission error:", err);
        });
    }

    const stopScanner = () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                scannerModal.classList.add('hidden');
            }).catch(err => {
                console.error("Scanner stop error:", err);
                scannerModal.classList.add('hidden');
            });
        } else {
            scannerModal.classList.add('hidden');
        }
    }

    // --- RENDER FUNCTIONS ---
    const renderHomePage = () => {
        let monthKey = appState.currentMonthView;
        if(monthKey === 'all-time') {
            const keys = Object.keys(appState.salesLedger);
            monthKey = keys.length > 0 ? keys[keys.length - 1] : null;
        }
        
        const monthSales = (monthKey && appState.salesLedger[monthKey]?.sales || []).reduce((sum, s) => sum + s.mrp, 0);
        const stockMM = appState.productDatabase.reduce((sum, p) => sum + p.stockMM, 0);
        const stockMax = appState.productDatabase.reduce((sum, p) => sum + p.stockMax, 0);

        document.getElementById('month-sales').textContent = formatCurrency(monthSales);
        document.getElementById('total-stock-mm').textContent = stockMM;
        document.getElementById('total-stock-max').textContent = stockMax;
        document.getElementById('total-products').textContent = appState.productDatabase.length;

        document.getElementById('quick-actions').addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                const pageId = e.target.closest('a').hash.substring(1);
                showPage(pageId);
            }
        });
    }

    const renderStockPage = () => {
        const tableBody = document.getElementById('stock-table-body');
        tableBody.innerHTML = '';
        if (appState.productDatabase.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-6 text-slate-500">No products found. Add products first.</td></tr>`;
            return;
        }
        appState.productDatabase.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3 text-sm font-medium text-slate-700">${p.model}</td>
                <td class="p-3 text-sm"><div class="flex items-center gap-3">
                    <button class="stock-btn" data-barcode="${p.barcode}" data-shop="MM" data-action="decr">-</button>
                    <span class="font-bold text-lg w-8 text-center">${p.stockMM}</span>
                    <button class="stock-btn" data-barcode="${p.barcode}" data-shop="MM" data-action="incr">+</button>
                </div></td>
                <td class="p-3 text-sm"><div class="flex items-center gap-3">
                    <button class="stock-btn" data-barcode="${p.barcode}" data-shop="Max" data-action="decr">-</button>
                    <span class="font-bold text-lg w-8 text-center">${p.stockMax}</span>
                    <button class="stock-btn" data-barcode="${p.barcode}" data-shop="Max" data-action="incr">+</button>
                </div></td>
                <td class="p-3 text-sm font-bold text-slate-600">${p.stockMM + p.stockMax}</td>
            `;
            tableBody.appendChild(row);
        });
        
        tableBody.querySelectorAll('.stock-btn').forEach(btn => btn.addEventListener('click', handleStockUpdate));
    }
    
    const renderProductPage = () => {
        const form = document.getElementById('product-form');
        const tableBody = document.getElementById('product-table-body');
        tableBody.innerHTML = '';

        appState.productDatabase.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3 text-sm">${p.model}</td>
                <td class="p-3 text-sm text-slate-500">${p.barcode}</td>
                <td class="p-3 text-sm font-bold">${p.stockMM}</td>
                <td class="p-3 text-sm font-bold">${p.stockMax}</td>
                <td class="p-3 text-sm"><button class="text-red-500 hover:underline" data-barcode="${p.barcode}">Delete</button></td>
            `;
            tableBody.appendChild(row);
        });

        tableBody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', (e) => {
            const barcode = e.target.dataset.barcode;
            if (confirm(`Are you sure you want to delete product with barcode ${barcode}? This is irreversible.`)) {
                appState.productDatabase = appState.productDatabase.filter(p => p.barcode !== barcode);
                saveState();
                renderProductPage();
            }
        }));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const barcode = document.getElementById('product-barcode').value;
            if (!barcode.trim()) {
                showMessage('Barcode cannot be empty.');
                return;
            }
            if (appState.productDatabase.some(p => p.barcode === barcode)) {
                showMessage('Error: A product with this barcode already exists.');
                return;
            }
            const newProduct = {
                barcode: barcode,
                model: document.getElementById('product-model').value,
                mrp: parseInt(document.getElementById('product-mrp').value, 10) || 0,
                stockMM: parseInt(document.getElementById('product-stock-mm').value, 10) || 0,
                stockMax: parseInt(document.getElementById('product-stock-max').value, 10) || 0
            };
            appState.productDatabase.push(newProduct);
            saveState();
            renderProductPage();
            form.reset();
        });
    }

    const renderLogSalePage = () => {
        renderMonthSelector('log-month-selector-container', true);
        document.getElementById('sale-date').valueAsDate = new Date();
        
        document.getElementById('scan-btn').addEventListener('click', startScanner);
        document.getElementById('fetch-btn').addEventListener('click', () => {
            const barcode = document.getElementById('sale-barcode').value;
            const product = appState.productDatabase.find(p => p.barcode === barcode);
            if (product) {
                document.getElementById('sale-model').value = product.model;
                document.getElementById('sale-mrp').value = product.mrp;
            } else {
                showMessage('Product not found in database.');
            }
        });

        document.getElementById('sales-form').addEventListener('submit', addSale);
    }

    const renderSalesDataPage = () => {
        renderMonthSelector('data-month-selector-container', false);
        renderSalesTable();
        document.getElementById('export-btn').addEventListener('click', exportToExcel);
    }
    
    const renderReportPage = () => {
       renderMonthSelector('report-month-selector-container', true);
       renderSalesReport(appState.currentMonthView);
    }
    
    // --- CORE LOGIC ---
    const handleStockUpdate = (e) => {
        const { barcode, shop, action } = e.currentTarget.dataset;
        const product = appState.productDatabase.find(p => p.barcode === barcode);
        if (!product) return;
        
        const stockField = shop === 'MM' ? 'stockMM' : 'stockMax';
        
        if (action === 'incr') product[stockField]++;
        else if (action === 'decr' && product[stockField] > 0) product[stockField]--;
        
        saveState();
        renderStockPage();
    }
    
    const addSale = (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const shop = formData.get('shop');
        const barcode = formData.get('barcode');
        const monthKey = document.getElementById('log-month-selector-container').querySelector('select').value;
        
        if (!shop) { showMessage("Please select a shop."); return; }
        if (!barcode) { showMessage("Please enter a barcode."); return; }
        if (!appState.salesLedger[monthKey]) { showMessage("Please select or create a month log first."); return; }

        const product = appState.productDatabase.find(p => p.barcode === barcode);
        if (!product) { showMessage(`Product with barcode ${barcode} not found.`); return; }

        const stockField = shop === 'MM' ? 'stockMM' : 'stockMax';
        if (product[stockField] <= 0) {
            showMessage(`Out of stock for ${product.model} at ${shop === 'MM' ? 'MM Mobiles' : 'Max'}.`);
            return;
        }

        product[stockField]--;
        
        const salesInMonth = appState.salesLedger[monthKey].sales;
        const newSale = {
            sl: salesInMonth.length + 1,
            id: Date.now(), // Unique ID for deletion
            model: formData.get('model'),
            date: formData.get('date'),
            shop: shop,
            mrp: parseInt(formData.get('mrp'), 10) || 0,
            mode: formData.get('mode'),
            name: formData.get('name'),
            barcode: barcode,
        };
        
        salesInMonth.push(newSale);
        saveState();
        showMessage("Sale logged successfully!");
        form.reset();
        document.getElementById('sale-date').valueAsDate = new Date();
    }

    const deleteSale = (saleId, monthKey) => {
        if (!appState.salesLedger[monthKey]) return;
        const salesInMonth = appState.salesLedger[monthKey].sales;
        const saleIndex = salesInMonth.findIndex(s => s.id === saleId);
        if (saleIndex === -1) return;

        const [saleToDelete] = salesInMonth.splice(saleIndex, 1);
        
        const product = appState.productDatabase.find(p => p.barcode === saleToDelete.barcode);
        if (product) {
            const stockField = saleToDelete.shop === 'MM' ? 'stockMM' : 'stockMax';
            product[stockField]++;
        }

        salesInMonth.forEach((s, i) => s.sl = i + 1);

        saveState();
        renderSalesTable();
    }

    const renderMonthSelector = (containerId, monthsOnly) => {
        const container = document.getElementById(containerId);
        if(!container) return;
        const monthKeys = Object.keys(appState.salesLedger).sort().reverse();
        
        let options = '';
        if (!monthsOnly) {
             options += `<option value="all-time">All-Time Sales</option>`;
        }
        options += monthKeys.map(key => `<option value="${key}">${appState.salesLedger[key].name}</option>`).join('');

        if (monthKeys.length === 0 && monthsOnly) {
             container.innerHTML = `<button id="start-month-btn" class="brand-gradient text-white px-4 py-2 rounded-lg text-sm font-semibold">Start First Month's Log</button>`;
             document.getElementById('start-month-btn').addEventListener('click', () => newMonthModal.classList.remove('hidden'));
             return;
        }

        container.innerHTML = `
            <select id="month-selector-${containerId}" class="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold">${options}</select>
            <button id="add-month-btn" class="ml-2 bg-slate-700 text-white p-2 rounded-lg hover:bg-slate-800 text-sm" title="Add New Month">+</button>
        `;

        const selector = document.getElementById(`month-selector-${containerId}`);
        selector.value = appState.currentMonthView;

        selector.addEventListener('change', (e) => {
            appState.currentMonthView = e.target.value;
            saveState();
            const currentPageId = document.querySelector('.page:not(.hidden)').id.replace('page-', '');
            showPage(currentPageId);
        });
        document.getElementById('add-month-btn').addEventListener('click', () => newMonthModal.classList.remove('hidden'));
    }

    const renderSalesTable = () => {
        const tableBody = document.getElementById('sales-table-body');
        tableBody.innerHTML = '';
        
        let salesToDisplay = [];
        let isAllTime = appState.currentMonthView === 'all-time';

        if (isAllTime) {
            salesToDisplay = Object.entries(appState.salesLedger)
                .flatMap(([monthKey, monthData]) => monthData.sales.map(sale => ({...sale, monthKey})));
        } else if (appState.salesLedger[appState.currentMonthView]) {
            salesToDisplay = appState.salesLedger[appState.currentMonthView].sales.map(sale => ({...sale, monthKey: appState.currentMonthView}));
        }

        document.getElementById('sales-period-total').textContent = formatCurrency(salesToDisplay.reduce((sum, s) => sum + s.mrp, 0));

        if (salesToDisplay.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center p-6 text-slate-500">No sales data for this period.</td></tr>`;
            return;
        }

        salesToDisplay.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach((sale, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3 text-sm">${isAllTime ? index + 1 : sale.sl}</td>
                <td class="p-3 text-sm font-medium">${sale.model}</td>
                <td class="p-3 text-sm">${sale.date}</td>
                <td class="p-3 text-sm">${sale.shop}</td>
                <td class="p-3 text-sm font-semibold">${formatCurrency(sale.mrp)}</td>
                <td class="p-3 text-sm">${sale.mode}</td>
                <td class="p-3 text-sm">${sale.name || '-'}</td>
                <td class="p-3 text-sm text-slate-500">${sale.barcode}</td>
                <td class="p-3 text-sm"><button class="text-red-500 hover:underline" data-id="${sale.id}" data-month="${sale.monthKey}">Delete</button></td>
            `;
            tableBody.appendChild(row);
        });

        tableBody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', (e) => {
             const saleId = parseInt(e.target.dataset.id, 10);
             const monthKey = e.target.dataset.month;
             if(confirm('Are you sure you want to delete this sale? This will restore the stock count.')) {
                 deleteSale(saleId, monthKey);
             }
        }));
    }
    
    const renderSalesReport = (monthKey) => {
        const reportContent = document.getElementById('report-content');
        if (monthKey === 'all-time' || !appState.salesLedger[monthKey] || appState.salesLedger[monthKey].sales.length === 0) {
            reportContent.innerHTML = `<div class="text-center py-12 text-slate-500"><p class="font-semibold text-lg">No sales data for this month.</p><p>Select a specific month to view its report.</p></div>`;
            return;
        }

        const sales = appState.salesLedger[monthKey].sales;
        const totalRevenue = sales.reduce((sum, s) => sum + s.mrp, 0);
        const unitsSold = sales.length;
        const avgSale = unitsSold > 0 ? totalRevenue / unitsSold : 0;
        
        const modelCounts = sales.reduce((acc, s) => { acc[s.model] = (acc[s.model] || 0) + 1; return acc; }, {});
        const bestSeller = Object.keys(modelCounts).reduce((a, b) => modelCounts[a] > modelCounts[b] ? a : b, 'N/A');
        
        const paymentModeCounts = sales.reduce((acc, s) => { acc[s.mode] = (acc[s.mode] || 0) + 1; return acc; }, {});

        reportContent.innerHTML = `
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div class="p-4 bg-slate-50 rounded-lg"><h4 class="text-sm font-semibold text-slate-500">Total Revenue</h4><p class="text-2xl font-bold">${formatCurrency(totalRevenue)}</p></div>
                <div class="p-4 bg-slate-50 rounded-lg"><h4 class="text-sm font-semibold text-slate-500">Units Sold</h4><p class="text-2xl font-bold">${unitsSold}</p></div>
                <div class="p-4 bg-slate-50 rounded-lg"><h4 class="text-sm font-semibold text-slate-500">Avg. Sale Value</h4><p class="text-2xl font-bold">${formatCurrency(avgSale)}</p></div>
                <div class="p-4 bg-slate-50 rounded-lg"><h4 class="text-sm font-semibold text-slate-500">Best Seller</h4><p class="text-lg font-bold truncate">${bestSeller}</p></div>
            </div>
            <div>
                <h4 class="text-lg font-bold mb-4">Sales by Payment Mode</h4>
                <div class="space-y-2">
                    ${Object.entries(paymentModeCounts).map(([mode, count]) => `
                        <div class="flex items-center">
                            <span class="w-20 text-sm font-semibold">${mode}</span>
                            <div class="flex-1 bg-slate-200 rounded-full h-4"><div class="brand-gradient h-4 rounded-full" style="width: ${((count/unitsSold)*100).toFixed(2)}%"></div></div>
                            <span class="w-12 text-right text-sm font-bold">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    const exportToExcel = () => {
        let salesToExport = [];
        let filename = 'sales_report.xlsx';
        
        if (appState.currentMonthView === 'all-time') {
            salesToExport = Object.values(appState.salesLedger).flatMap(month => month.sales);
            filename = `all_time_sales_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else if (appState.salesLedger[appState.currentMonthView]) {
            salesToExport = appState.salesLedger[appState.currentMonthView].sales;
            filename = `sales_${appState.currentMonthView}.xlsx`;
        }

        if (salesToExport.length === 0) {
            showMessage("No data to export for the selected period.");
            return;
        }

        const dataForSheet = salesToExport.map(s => ({
            'SL No.': s.sl, 'Model': s.model, 'Date': s.date, 'Shop': s.shop, 'MRP': s.mrp,
            'Payment Mode': s.mode, 'Customer Name': s.name, 'Barcode': s.barcode
        }));
        
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sales Data");
        XLSX.writeFile(wb, filename);
    };

    // --- UTILITY FUNCTIONS ---
    const showMessage = (msg) => {
        messageText.textContent = msg;
        messageModal.classList.remove('hidden');
    }
    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    // --- INITIALIZATION ---
    const initializeApp = () => {
        loadState();
        const initialPage = window.location.hash.substring(1) || 'home';
        showPage(initialPage);
        
        // --- Event Listeners ---
        window.addEventListener('hashchange', () => {
            const newPage = window.location.hash.substring(1) || 'home';
            showPage(newPage);
        });
        messageCloseBtn.addEventListener('click', () => messageModal.classList.add('hidden'));
        scannerCancelBtn.addEventListener('click', stopScanner);

        newMonthForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const monthInput = document.getElementById('new-month-input').value; // YYYY-MM
            if (!monthInput) {
                showMessage("Please select a month.");
                return;
            }
            const [year, month] = monthInput.split('-');
            const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

            if (appState.salesLedger[monthInput]) {
                showMessage(`Log for ${monthName} already exists.`);
                return;
            }
            appState.salesLedger[monthInput] = { name: monthName, sales: [] };
            appState.currentMonthView = monthInput;
            saveState();
            newMonthModal.classList.add('hidden');
            const currentPageId = document.querySelector('.page:not(.hidden)').id.replace('page-', '');
            showPage(currentPageId);
        });
        newMonthCancelBtn.addEventListener('click', () => newMonthModal.classList.add('hidden'));
    }

    initializeApp();
});
