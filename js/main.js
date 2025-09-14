import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log("main.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM ready");

    // --- DOM References ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
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

    // --- Sidebar ---
    const toggleSidebar = () => {
        sidebar.classList.toggle('show');
        sidebarOverlay.classList.toggle('hidden');
        setTimeout(() => {
            sidebarOverlay.classList.toggle('opacity-0');
        }, 10);
    };
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
    if (mainNav) mainNav.addEventListener('click', (e) => {
        if (e.target.closest('a') && window.innerWidth < 768) toggleSidebar();
    });

    // --- Firebase reference ---
    const db = window.db;
    const useFirestore = typeof db !== 'undefined' && db !== null;
    console.log("useFirestore:", useFirestore);

    // --- App State ---
    let appState = { productDatabase: [], salesLedger: {}, currentMonthView: '' };
    let html5QrCode = null;

    // --- Templates ---
    const getPageTemplate = (pageId) => {
        const templates = {
            home: `<h2 class="text-3xl font-bold text-slate-800 mb-2">Dashboard</h2>
                <p class="text-slate-500 mb-8">Live overview of your sales and stock.</p>
                <div class="glass-ui rounded-xl shadow-lg p-6 mb-8 text-center border border-slate-200/75">
                    <h3 class="font-semibold text-slate-500 text-lg">All-Time Sales Value</h3>
                    <p id="all-time-sales" class="text-5xl font-extrabold text-transparent bg-clip-text brand-gradient mt-2">₹0.00</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="glass-ui rounded-xl shadow-lg p-5 border border-slate-200/75">
                        <h3 class="font-semibold text-slate-500">Sales (Month)</h3>
                        <p id="month-sales" class="text-2xl font-bold text-pink-600 mt-2">₹0.00</p>
                    </div>
                    <div class="glass-ui rounded-xl shadow-lg p-5 border border-slate-200/75">
                        <h3 class="font-semibold text-slate-500">Incentives (Month)</h3>
                        <p id="month-incentives" class="text-2xl font-bold text-green-600 mt-2">₹0.00</p>
                    </div>
                    <div class="glass-ui rounded-xl shadow-lg p-5 border border-slate-200/75">
                        <h3 class="font-semibold text-slate-500">Stock (MM)</h3>
                        <p id="total-stock-mm" class="text-2xl font-bold text-sky-600 mt-2">0</p>
                    </div>
                    <div class="glass-ui rounded-xl shadow-lg p-5 border border-slate-200/75">
                        <h3 class="font-semibold text-slate-500">Stock (Max)</h3>
                        <p id="total-stock-max" class="text-2xl font-bold text-teal-600 mt-2">0</p>
                    </div>
                </div>
                <div class="glass-ui rounded-xl shadow-lg p-6 border border-slate-200/75">
                    <h3 class="text-xl font-bold mb-4">Quick Actions</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="quick-actions">
                        <a href="#log-sale" class="nav-card text-center p-6 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition-colors">
                           <h4 class="text-lg font-bold">Log a Sale</h4>
                        </a>
                        <a href="#stock" class="nav-card text-center p-6 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors">
                           <h4 class="text-lg font-bold">Update Stock</h4>
                        </a>
                        <a href="#products" class="nav-card text-center p-6 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors">
                           <h4 class="text-lg font-bold">Add Product</h4>
                        </a>
                        <a href="#report" class="nav-card text-center p-6 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors">
                           <h4 class="text-lg font-bold">View Reports</h4>
                        </a>
                    </div>
                </div>`,
            stock: `<div class="glass-ui rounded-xl shadow-lg">
                    <div class="p-4 sm:p-6 border-b border-white/20"><h3 class="text-2xl font-bold text-slate-800">Stock Overview</h3></div>
                    <div class="overflow-x-auto"><table class="min-w-full">
                        <thead><tr>
                            <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Model</th>
                            <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">MM Mobiles</th>
                            <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Max</th>
                            <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Total</th>
                        </tr></thead>
                        <tbody id="stock-table-body" class="divide-y divide-slate-200/50"></tbody>
                    </table></div>
                </div>`,
            products: `<div class="glass-ui rounded-xl shadow-lg p-6 md:p-8">
                    <h3 class="text-2xl font-bold mb-6 border-b border-white/20 pb-4">Manage Products</h3>
                    <form id="product-form" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-slate-600 mb-1">Barcode</label>
                            <div class="flex">
                               <input type="text" id="product-barcode" class="w-full p-2 bg-white/50 border-r-0 border border-white/30 rounded-l-lg" required>
                               <button type="button" id="product-scan-btn" class="bg-violet-600 text-white p-2 rounded-r-lg hover:bg-violet-700" title="Scan Barcode">
                                   <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.375 6.375c3.512-3.512 9.213-3.512 12.725 0c3.512 3.512 3.512 9.213 0 12.725c-3.512 3.512-9.213 3.512-12.725 0c-3.512-3.512-3.512-9.213 0-12.725z M12 1.5v21 M1.5 12h21"></path></svg>
                               </button>
                            </div>
                        </div>
                        <div class="md:col-span-2"><label class="block text-sm font-medium text-slate-600 mb-1">Model Name (incl. variant)</label><input type="text" id="product-model" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg" required placeholder="e.g. VIVO Y19 (6+128)"></div>
                        <div><label class="block text-sm font-medium text-slate-600 mb-1">MRP (₹)</label><input type="number" id="product-mrp" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg" required></div>
                        <div><label class="block text-sm font-medium text-slate-600 mb-1">Incentive (₹)</label><input type="number" id="product-incentive" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg" required value="0" min="0"></div>
                        <div><label class="block text-sm font-medium text-slate-600 mb-1">Initial Stock (MM)</label><input type="number" id="product-stock-mm" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg" required value="0" min="0"></div>
                        <div><label class="block text-sm font-medium text-slate-600 mb-1">Initial Stock (Max)</label><input type="number" id="product-stock-max" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg" required value="0" min="0"></div>
                        <div class="md:col-span-2 flex justify-end"><button type="submit" class="brand-gradient text-white px-6 py-2 rounded-lg font-semibold">Add Product</button></div>
                    </form>
                    <div class="overflow-x-auto"><table class="min-w-full"><thead><tr>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Model</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Incentive</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">MM</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Max</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr></thead><tbody id="product-table-body"></tbody></table></div>
                </div>`,
            log-sale: `<div class="glass-ui rounded-xl shadow-lg p-6 md:p-8">
                     <div class="flex justify-between items-center mb-6 border-b border-white/20 pb-4"><h3 class="text-2xl font-bold">Log a Sale</h3><div id="log-month-selector-container"></div></div>
                     <form id="sales-form" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">Shop</label><select id="sale-shop" name="shop" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg" required><option value="" disabled selected>Select Shop</option><option value="MM">MM Mobiles</option><option value="Max">Max</option></select></div>
                         <div>
                             <label class="block text-sm font-medium text-slate-600 mb-1">Barcode</label>
                             <div class="flex">
                                <input type="text" id="sale-barcode" name="barcode" class="w-full p-2 bg-white/50 border-r-0 border border-white/30 rounded-l-lg" placeholder="Enter or Scan Barcode">
                                <button type="button" id="sale-scan-btn" class="bg-violet-600 text-white p-2 hover:bg-violet-700" title="Scan Barcode">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.375 6.375c3.512-3.512 9.213-3.512 12.725 0c3.512 3.512 3.512 9.213 0 12.725c-3.512 3.512-9.213 3.512-12.725 0c-3.512-3.512-3.512-9.213 0-12.725z M12 1.5v21 M1.5 12h21"></path></svg>
                                </button>
                                <button type="button" id="fetch-btn" class="bg-slate-700 text-white px-4 rounded-r-lg font-semibold text-sm">Fetch</button>
                             </div>
                         </div>
                         <div class="md:col-span-2"><label class="block text-sm font-medium text-slate-600 mb-1">Model</label><input type="text" id="sale-model" name="model" class="w-full p-2 border rounded-lg bg-slate-100/50" readonly></div>
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">MRP (₹)</label><input type="number" id="sale-mrp" name="mrp" class="w-full p-2 border rounded-lg bg-slate-100/50" readonly></div>
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">Date</label><input type="date" id="sale-date" name="date" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg" required></div>
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">Mode of Payment</label><select id="sale-mode" name="mode" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg" required><option>CASH</option><option>BAJAJ</option><option>CARD</option><option>UPI</option></select></div>
                         <div><label class="block text-sm font-medium text-slate-600 mb-1">Customer Name</label><input type="text" id="sale-name" name="name" class="w-full p-2 bg-white/50 border border-white/30 rounded-lg"></div>
                         <div class="md:col-span-2 flex justify-end"><button type="submit" class="brand-gradient text-white px-6 py-2 rounded-lg font-semibold">Log This Sale</button></div>
                     </form>
                </div>`,
            sales_data: `<div class="glass-ui rounded-xl shadow-lg">
                    <div class="flex flex-wrap justify-between items-center p-4 sm:p-6 border-b border-white/20 gap-4">
                        <div id="data-month-selector-container"></div>
                        <button id="export-btn" class="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span>Export to XL</span>
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 p-4 sm:p-6 border-b border-white/20 gap-4">
                         <div>
                             <h4 class="text-sm font-semibold text-slate-500">Total Sales for Period</h4>
                             <p id="sales-period-total" class="text-2xl font-bold text-pink-600">₹0.00</p>
                         </div>
                          <div>
                             <h4 class="text-sm font-semibold text-slate-500">Total Incentives for Period</h4>
                             <p id="incentives-period-total" class="text-2xl font-bold text-green-600">₹0.00</p>
                         </div>
                    </div>
                    <div class="overflow-x-auto"><table class="min-w-full"><thead><tr>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">SL</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Model</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">MRP</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Incentive</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Shop</th>
                        <th class="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr></thead><tbody id="sales-table-body" class="divide-y divide-slate-200/50"></tbody></table></div>
                </div>`,
            report: `<div class="glass-ui rounded-xl shadow-lg p-6 md:p-8">
                    <div class="flex justify-between items-center mb-6 border-b border-white/20 pb-4">
                        <h3 class="text-2xl font-bold text-slate-800">Sales Report</h3>
                        <div id="report-month-selector-container"></div>
                    </div>
                    <div id="report-content"></div>
                </div>`
        };
        return templates[pageId] || '';
    };

    // --- showPage ---
    const showPage = (pageId) => {
        console.log("showPage ->", pageId);
        if (!pageId) pageId = 'home';
        allPages.forEach(p => p.classList.toggle('hidden', p.id !== `page-${pageId}`));
        mainNav.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.hash === `#${pageId}`));
        const target = document.getElementById(`page-${pageId}`);
        if (!target) { console.error("Missing target for page:", pageId); return; }
        target.innerHTML = getPageTemplate(pageId);
        switch(pageId) {
            case 'home': renderHomePage(); break;
            case 'stock': renderStockPage(); break;
            case 'products': renderProductPage(); break;
            case 'log-sale': renderLogSalePage(); break;
            case 'sales-data': renderSalesDataPage(); break;
            case 'report': renderReportPage(); break;
        }
    };

    // --- save/load ---
    const saveState = async () => {
        console.log("saveState()");
        try {
            if (useFirestore) {
                const stateRef = doc(db, "salesApp", "state");
                await setDoc(stateRef, appState);
                console.log("Saved to Firestore");
            } else {
                localStorage.setItem('salesProData_v10', JSON.stringify(appState));
                console.log("Saved to localStorage");
            }
        } catch (e) {
            console.error("saveState error:", e);
        }
    };

    const loadState = async () => {
        console.log("loadState()");
        try {
            if (useFirestore) {
                const stateRef = doc(db, "salesApp", "state");
                const snap = await getDoc(stateRef);
                if (snap.exists()) {
                    appState = snap.data();
                    console.log("Loaded from Firestore", appState);
                } else {
                    console.log("No state in Firestore, initializing demo data");
                    appState.productDatabase = [
                        { barcode: '8901234567890', model: 'VIVO Y200 (8+128)', mrp: 18999, incentive: 500, stockMM: 10, stockMax: 5 },
                        { barcode: '8901234567891', model: 'VIVO Y19 (6+128)', mrp: 12499, incentive: 350, stockMM: 8, stockMax: 12 }
                    ];
                    const today = new Date();
                    const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
                    const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });
                    appState.salesLedger = {};
                    appState.salesLedger[monthKey] = { name: monthName, sales: [] };
                    appState.currentMonthView = monthKey;
                    await saveState();
                    console.log("Demo data saved to Firestore");
                }
            } else {
                const saved = localStorage.getItem('salesProData_v10');
                if (saved) {
                    appState = JSON.parse(saved);
                    console.log("Loaded from localStorage", appState);
                } else {
                    appState.productDatabase = [
                        { barcode: '8901234567890', model: 'VIVO Y200 (8+128)', mrp: 18999, incentive: 500, stockMM: 10, stockMax: 5 },
                        { barcode: '8901234567891', model: 'VIVO Y19 (6+128)', mrp: 12499, incentive: 350, stockMM: 8, stockMax: 12 }
                    ];
                    const today = new Date();
                    const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
                    const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });
                    appState.salesLedger = {};
                    appState.salesLedger[monthKey] = { name: monthName, sales: [] };
                    appState.currentMonthView = monthKey;
                    await saveState();
                    console.log("Demo data saved to localStorage");
                }
            }
            if (!appState.currentMonthView) {
                const keys = Object.keys(appState.salesLedger);
                appState.currentMonthView = keys.length > 0 ? keys[keys.length-1] : 'all-time';
            }
            console.log("loadState complete", appState);
        } catch (e) {
            console.error("loadState error:", e);
            appState = { productDatabase: [], salesLedger: {}, currentMonthView: 'all-time' };
        }
    };

    // --- scanner helpers ---
    const playScanSound = () => {
        try {
            if (Tone.context.state !== 'running') Tone.context.resume();
            const synth = new Tone.Synth().toDestination();
            synth.triggerAttackRelease("C5", "8n");
        } catch (e) { console.error("Scan sound error", e); }
    };
    const startScanner = (targetInputId) => {
        if (!scannerModal) return;
        scannerModal.classList.remove('hidden');
        const status = document.getElementById('scanner-status');
        if (status) status.textContent = 'Initializing camera...';
        const qrSuccess = (decodedText) => {
            playScanSound();
            stopScanner();
            const input = document.getElementById(targetInputId);
            if (input) input.value = decodedText;
            showMessage('Barcode scanned successfully!');
            if (targetInputId === 'sale-barcode') {
                const fetchBtn = document.getElementById('fetch-btn');
                if (fetchBtn) fetchBtn.click();
            }
        };
        try {
            html5QrCode = new Html5Qrcode("reader");
            html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, qrSuccess)
                .then(() => { if (status) status.textContent = 'Point camera at a barcode.'; })
                .catch(err => { console.error("Scanner start error", err); if (status) status.textContent = 'Could not start camera.'; });
        } catch (e) {
            console.error("Scanner init error", e);
            if (status) status.textContent = 'Scanner unavailable.';
        }
    };
    const stopScanner = () => {
        try {
            if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(err => console.error("Stop scanner error", err));
        } catch (e) { console.error("stopScanner error", e); }
        if (scannerModal) scannerModal.classList.add('hidden');
    };

    // --- renderers ---
    const renderHomePage = () => {
        console.log("renderHomePage");
        const allSales = Object.values(appState.salesLedger).flatMap(m => m.sales || []);
        const total = allSales.reduce((s, r) => s + (r.mrp || 0), 0);
        const allTimeEl = document.getElementById('all-time-sales');
        if (allTimeEl) allTimeEl.textContent = formatCurrency(total);

        let monthKey = appState.currentMonthView === 'all-time' ? (Object.keys(appState.salesLedger).sort().reverse()[0] || null) : appState.currentMonthView;
        const monthSales = (monthKey && appState.salesLedger[monthKey]?.sales) || [];
        const monthTotal = monthSales.reduce((s, r) => s + (r.mrp || 0), 0);
        const monthIncentives = monthSales.reduce((s, r) => s + (r.incentive || 0), 0);

        const stockMM = appState.productDatabase.reduce((s, p) => s + (p.stockMM || 0), 0);
        const stockMax = appState.productDatabase.reduce((s, p) => s + (p.stockMax || 0), 0);

        const monthSalesEl = document.getElementById('month-sales'); if (monthSalesEl) monthSalesEl.textContent = formatCurrency(monthTotal);
        const monthIncEl = document.getElementById('month-incentives'); if (monthIncEl) monthIncEl.textContent = formatCurrency(monthIncentives);
        const stockMMEl = document.getElementById('total-stock-mm'); if (stockMMEl) stockMMEl.textContent = stockMM;
        const stockMaxEl = document.getElementById('total-stock-max'); if (stockMaxEl) stockMaxEl.textContent = stockMax;

        const quick = document.getElementById('quick-actions'); if (quick) quick.addEventListener('click', e => { if (e.target.closest('a')) window.location.hash = e.target.closest('a').hash; });
    };

    const renderStockPage = () => {
        console.log("renderStockPage");
        const tbody = document.getElementById('stock-table-body');
        if (!tbody) return;
        if (!appState.productDatabase || appState.productDatabase.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-500">No products.</td></tr>';
            return;
        }
        tbody.innerHTML = appState.productDatabase.map(p => `
            <tr>
                <td class="p-3 text-sm font-medium">${p.model}</td>
                <td class="p-3 text-sm"><div class="flex items-center gap-3"><button class="stock-btn" data-barcode="${p.barcode}" data-shop="MM" data-action="decr">-</button><span class="font-bold text-lg w-8 text-center">${p.stockMM || 0}</span><button class="stock-btn" data-barcode="${p.barcode}" data-shop="MM" data-action="incr">+</button></div></td>
                <td class="p-3 text-sm"><div class="flex items-center gap-3"><button class="stock-btn" data-barcode="${p.barcode}" data-shop="Max" data-action="decr">-</button><span class="font-bold text-lg w-8 text-center">${p.stockMax || 0}</span><button class="stock-btn" data-barcode="${p.barcode}" data-shop="Max" data-action="incr">+</button></div></td>
                <td class="p-3 text-sm font-bold">${(p.stockMM || 0) + (p.stockMax || 0)}</td>
            </tr>`).join('');
        tbody.querySelectorAll('.stock-btn').forEach(btn => {
            btn.addEventListener('click', handleStockUpdate);
        });
    };

    const renderProductPage = () => {
        console.log("renderProductPage");
        const table = document.getElementById('product-table-body');
        const form = document.getElementById('product-form');
        const scanBtn = document.getElementById('product-scan-btn');
        if (scanBtn) scanBtn.addEventListener('click', () => startScanner('product-barcode'));
        if (!table) return;
        table.innerHTML = appState.productDatabase.map(p => `<tr><td class="p-3 text-sm">${p.model}</td><td class="p-3 text-sm font-semibold text-green-700">${formatCurrency(p.incentive || 0)}</td><td class="p-3 text-sm font-bold">${p.stockMM || 0}</td><td class="p-3 text-sm font-bold">${p.stockMax || 0}</td><td class="p-3 text-sm"><button class="delete-prod" data-barcode="${p.barcode}">Delete</button></td></tr>`).join('');
        table.querySelectorAll('.delete-prod').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const barcode = e.target.dataset.barcode;
                if (confirm('Delete product?')) {
                    appState.productDatabase = appState.productDatabase.filter(x => x.barcode !== barcode);
                    await saveState();
                    renderProductPage();
                }
            });
        });
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const barcode = document.getElementById('product-barcode').value.trim();
                if (!barcode) { showMessage('Barcode required'); return; }
                if (appState.productDatabase.some(p => p.barcode === barcode)) { showMessage('Barcode exists'); return; }
                const product = {
                    barcode,
                    model: document.getElementById('product-model').value || '',
                    mrp: parseInt(document.getElementById('product-mrp').value,10) || 0,
                    incentive: parseInt(document.getElementById('product-incentive').value,10) || 0,
                    stockMM: parseInt(document.getElementById('product-stock-mm').value,10) || 0,
                    stockMax: parseInt(document.getElementById('product-stock-max').value,10) || 0
                };
                appState.productDatabase.push(product);
                await saveState();
                form.reset();
                renderProductPage();
            });
        }
    };

    const renderLogSalePage = () => {
        console.log("renderLogSalePage");
        renderMonthSelector('log-month-selector-container', true);
        const dateEl = document.getElementById('sale-date'); if (dateEl) dateEl.valueAsDate = new Date();
        const scanBtn = document.getElementById('sale-scan-btn'); if (scanBtn) scanBtn.addEventListener('click', () => startScanner('sale-barcode'));
        const fetchBtn = document.getElementById('fetch-btn'); if (fetchBtn) fetchBtn.addEventListener('click', () => {
            const barcode = document.getElementById('sale-barcode').value.trim();
            const product = appState.productDatabase.find(p => p.barcode === barcode);
            if (product) {
                const model = document.getElementById('sale-model'); if (model) model.value = product.model;
                const mrp = document.getElementById('sale-mrp'); if (mrp) mrp.value = product.mrp;
            } else showMessage('Product not found');
        });
        const form = document.getElementById('sales-form'); if (form) form.addEventListener('submit', addSale);
    };

    const renderSalesDataPage = () => {
        console.log("renderSalesDataPage");
        renderMonthSelector('data-month-selector-container', false);
        renderSalesTable();
        const exp = document.getElementById('export-btn'); if (exp) exp.addEventListener('click', exportToExcel);
    };

    const renderReportPage = () => {
        console.log("renderReportPage");
        renderMonthSelector('report-month-selector-container', true);
        renderSalesReport(appState.currentMonthView);
    };

    // --- core operations ---
    const handleStockUpdate = async (e) => {
        const barcode = e.currentTarget.dataset.barcode;
        const shop = e.currentTarget.dataset.shop;
        const action = e.currentTarget.dataset.action;
        const product = appState.productDatabase.find(p => p.barcode === barcode);
        if (!product) return;
        const field = shop === 'MM' ? 'stockMM' : 'stockMax';
        if (action === 'incr') product[field] = (product[field]||0)+1;
        else if (action === 'decr' && (product[field]||0)>0) product[field] = (product[field]||0)-1;
        await saveState();
        renderStockPage();
    };

    const addSale = async (e) => {
        e.preventDefault();
        const shop = document.getElementById('sale-shop').value;
        const barcode = document.getElementById('sale-barcode').value.trim();
        const monthSelect = document.getElementById('month-selector-log-month-selector-container') || document.querySelector('#log-month-selector-container select');
        const monthKey = monthSelect ? monthSelect.value : appState.currentMonthView;
        if (!shop || !barcode || !monthKey || !appState.salesLedger[monthKey]) { showMessage('Fill all fields'); return; }
        const product = appState.productDatabase.find(p => p.barcode === barcode);
        if (!product) { showMessage('Product not found'); return; }
        const field = shop === 'MM' ? 'stockMM' : 'stockMax';
        if ((product[field]||0) <= 0) { showMessage('Out of stock'); return; }
        product[field] = (product[field]||0)-1;
        const sales = appState.salesLedger[monthKey].sales;
        const sale = {
            sl: sales.length+1,
            id: Date.now(),
            model: document.getElementById('sale-model').value || product.model,
            date: document.getElementById('sale-date').value,
            shop,
            mrp: parseInt(document.getElementById('sale-mrp').value,10) || product.mrp || 0,
            incentive: product.incentive || 0,
            mode: document.getElementById('sale-mode').value,
            name: document.getElementById('sale-name').value || '',
            barcode
        };
        sales.push(sale);
        await saveState();
        showMessage('Sale logged');
        document.getElementById('sales-form').reset();
        const d = document.getElementById('sale-date'); if (d) d.valueAsDate = new Date();
    };

    const deleteSale = async (saleId, monthKey) => {
        if (!appState.salesLedger[monthKey]) return;
        const arr = appState.salesLedger[monthKey].sales;
        const idx = arr.findIndex(s => s.id === saleId);
        if (idx === -1) return;
        const [removed] = arr.splice(idx,1);
        const prod = appState.productDatabase.find(p => p.barcode === removed.barcode);
        if (prod) {
            const f = removed.shop === 'MM' ? 'stockMM' : 'stockMax';
            prod[f] = (prod[f]||0)+1;
        }
        arr.forEach((s,i)=> s.sl = i+1);
        await saveState();
        renderSalesTable();
    };

    const renderMonthSelector = (containerId, monthsOnly) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const keys = Object.keys(appState.salesLedger).sort().reverse();
        if (keys.length === 0 && monthsOnly) {
            container.innerHTML = `<button id="start-month-btn" class="brand-gradient text-white px-4 py-2 rounded-lg">Start First Log</button>`;
            const btn = document.getElementById('start-month-btn'); if (btn) btn.addEventListener('click', ()=> newMonthModal.classList.remove('hidden'));
            return;
        }
        let options = (!monthsOnly ? '<option value="all-time">All-Time Sales</option>' : '') + keys.map(k=>`<option value="${k}">${appState.salesLedger[k].name}</option>`).join('');
        container.innerHTML = `<select id="month-selector-${containerId}" class="bg-white/50 border border-white/30 rounded-lg px-3 py-2 text-sm font-semibold">${options}</select> <button id="add-month-btn" class="ml-2 bg-slate-700 text-white p-2 rounded-lg">+</button>`;
        const sel = document.getElementById(`month-selector-${containerId}`);
        if (sel) {
            sel.value = appState.currentMonthView;
            sel.addEventListener('change', async (e) => {
                appState.currentMonthView = e.target.value;
                await saveState();
                const current = document.querySelector('.page:not(.hidden)').id.replace('page-','');
                showPage(current);
            });
        }
        const addBtn = document.getElementById('add-month-btn'); if (addBtn) addBtn.addEventListener('click', ()=> newMonthModal.classList.remove('hidden'));
    };

    const renderSalesTable = () => {
        const tbody = document.getElementById('sales-table-body');
        if (!tbody) return;
        let list = [];
        if (appState.currentMonthView === 'all-time') {
            list = Object.entries(appState.salesLedger).flatMap(([k,v]) => (v.sales || []).map(s => ({...s, monthKey: k})));
        } else if (appState.salesLedger[appState.currentMonthView]) {
            list = (appState.salesLedger[appState.currentMonthView].sales || []).map(s => ({...s, monthKey: appState.currentMonthView}));
        }
        const totalEl = document.getElementById('sales-period-total'); if (totalEl) totalEl.textContent = formatCurrency(list.reduce((s,r)=>s+(r.mrp||0),0));
        const incEl = document.getElementById('incentives-period-total'); if (incEl) incEl.textContent = formatCurrency(list.reduce((s,r)=>s+(r.incentive||0),0));
        if (list.length===0) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-500">No sales data.</td></tr>'; return;
        }
        tbody.innerHTML = list.sort((a,b)=>new Date(b.date)-new Date(a.date)).map((s,i)=>`<tr>
            <td class="p-3 text-sm">${i+1}</td>
            <td class="p-3 text-sm font-medium">${s.model}</td>
            <td class="p-3 text-sm">${s.date}</td>
            <td class="p-3 text-sm font-semibold">${formatCurrency(s.mrp)}</td>
            <td class="p-3 text-sm font-semibold text-green-700">${formatCurrency(s.incentive||0)}</td>
            <td class="p-3 text-sm">${s.shop}</td>
            <td class="p-3 text-sm"><button class="delete-sale" data-id="${s.id}" data-month="${s.monthKey}">Delete</button></td>
        </tr>`).join('');
        tbody.querySelectorAll('.delete-sale').forEach(btn=>btn.addEventListener('click', async (e)=>{ const id=parseInt(e.target.dataset.id,10); const m=e.target.dataset.month; if(confirm('Delete sale?')) await deleteSale(id,m); }));
    };

    const renderSalesReport = (monthKey) => {
        const content = document.getElementById('report-content');
        if (!content) return;
        if (!monthKey || monthKey==='all-time' || !appState.salesLedger[monthKey] || (appState.salesLedger[monthKey].sales||[]).length===0) {
            content.innerHTML = '<div class="py-12 text-center text-slate-500"><p>No sales data.</p></div>'; return;
        }
        const sales = appState.salesLedger[monthKey].sales;
        const total = sales.reduce((s,r)=>s+(r.mrp||0),0);
        const incentives = sales.reduce((s,r)=>s+(r.incentive||0),0);
        const units = sales.length;
        const byModel = sales.reduce((acc,s)=>{ acc[s.model]=(acc[s.model]||0)+1; return acc; }, {});
        const best = Object.keys(byModel).sort((a,b)=>byModel[b]-byModel[a])[0] || 'N/A';
        content.innerHTML = `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="p-4 bg-white/40 rounded-lg"><h4 class="text-sm text-slate-500">Total Revenue</h4><p class="text-2xl font-bold">${formatCurrency(total)}</p></div>
            <div class="p-4 bg-white/40 rounded-lg"><h4 class="text-sm text-slate-500">Total Incentives</h4><p class="text-2xl font-bold text-green-600">${formatCurrency(incentives)}</p></div>
            <div class="p-4 bg-white/40 rounded-lg"><h4 class="text-sm text-slate-500">Units Sold</h4><p class="text-2xl font-bold">${units}</p></div>
            <div class="p-4 bg-white/40 rounded-lg"><h4 class="text-sm text-slate-500">Best Seller</h4><p class="text-lg font-bold">${best}</p></div>
        </div>`;
    };

    const exportToExcel = () => {
        try {
            let data = [];
            let filename = 'sales.xlsx';
            if (appState.currentMonthView==='all-time') {
                data = Object.values(appState.salesLedger).flatMap(m=>m.sales||[]);
                filename = `all_time_sales_${new Date().toISOString().split('T')[0]}.xlsx`;
            } else {
                data = (appState.salesLedger[appState.currentMonthView]?.sales)||[];
                filename = `sales_${appState.currentMonthView}.xlsx`;
            }
            if (!data || data.length===0) { showMessage('No data to export'); return; }
            const rows = data.map((s,i)=>({ 'SL No.': i+1, Model: s.model, Date: s.date, Shop: s.shop, MRP: s.mrp, Incentive: s.incentive||0, 'Payment Mode': s.mode, 'Customer': s.name, Barcode: s.barcode }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sales');
            XLSX.writeFile(wb, filename);
        } catch (e) {
            console.error("Export error", e);
            showMessage('Export failed');
        }
    };

    // --- utilities ---
    const showMessage = (msg) => { if (messageText) messageText.textContent = msg; if (messageModal) messageModal.classList.remove('hidden'); };
    const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v||0);

    // --- initialization ---
    const initializeApp = async () => {
        console.log("initializeApp start");
        try {
            await loadState();
            console.log("State after load", appState);
            const initialPage = window.location.hash.substring(1) || 'home';
            showPage(initialPage);
            window.addEventListener('hashchange', () => showPage(window.location.hash.substring(1) || 'home'));
            if (messageCloseBtn) messageCloseBtn.addEventListener('click', () => messageModal.classList.add('hidden'));
            if (scannerCancelBtn) scannerCancelBtn.addEventListener('click', () => stopScanner());
            if (newMonthForm) newMonthForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const monthInput = document.getElementById('new-month-input').value;
                if (!monthInput) return;
                const [year, month] = monthInput.split('-');
                const monthName = new Date(year, month-1,1).toLocaleString('default', { month: 'long', year: 'numeric' });
                if (appState.salesLedger[monthInput]) { showMessage(`Log for ${monthName} exists`); return; }
                appState.salesLedger[monthInput] = { name: monthName, sales: [] };
                appState.currentMonthView = monthInput;
                await saveState();
                newMonthModal.classList.add('hidden');
                const current = document.querySelector('.page:not(.hidden)').id.replace('page-','');
                showPage(current);
            });
            if (newMonthCancelBtn) newMonthCancelBtn.addEventListener('click', () => newMonthModal.classList.add('hidden'));
            console.log("initializeApp done");
        } catch (e) {
            console.error("initializeApp error", e);
        }
    };

    initializeApp();
});
