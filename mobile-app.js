/* ==========================================================================
   MC BENGKAYANG WORKPLACE APP - REAL DATA ENGINE & MOBILE CONTROLLER (SYNCED)
   ========================================================================== */

(function () {
    "use strict";

    const AppState = {
        viewMode: localStorage.getItem("mbx_view_mode") || "MOBILE",
        lastUpdate: null,
        isOnline: false,
        activeTab: "HOME",
        activeNonKpiTab: "NON_KPI",
        selectedOutletIndicator: "OSA",
        searchOutletQuery: "",
        selectedDse: "ALL",
        selectedHari: "ALL",
        chartInstances: {}
    };

    // ==========================================
    // 1. DATA ENGINE (SHARED WITH SCRIPT.JS)
    // ==========================================
    const DataEngine = {
        parseNumber(val) {
            if (val === null || val === undefined || val === "") return 0;
            if (typeof val === "number") return isNaN(val) ? 0 : val;
            let cleaned = String(val).replace(/[^0-9.-]/g, '');
            let parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        },

        formatCurrency(num) {
            let n = this.parseNumber(num);
            return "Rp " + Math.round(n).toLocaleString("id-ID");
        },

        formatNumber(num) {
            let n = this.parseNumber(num);
            return Math.round(n).toLocaleString("id-ID");
        },

        formatPercent(num) {
            let n = this.parseNumber(num);
            return n.toFixed(1) + "%";
        },

        calculateGrowth(mtd, lmtd) {
            let m = this.parseNumber(mtd);
            let l = this.parseNumber(lmtd);
            if (l === 0) return m > 0 ? 100 : 0;
            return ((m - l) / l) * 100;
        },

        getWorkingDaysInfo() {
            if (typeof getRemainingWorkingDaysInfo === "function") {
                return getRemainingWorkingDaysInfo();
            }
            return { currentDayNum: 17, currentMonthName: "Agustus", currentYear: 2026, remainingDays: 16 };
        }
    };

    // ==========================================
    // 2. DATA STORE AGGREGATOR (DYNAMIC HEADER MATCHING)
    // ==========================================
    const DataStore = {
        getGlobalDataDO() {
            return (typeof globalDataDO !== "undefined" && Array.isArray(globalDataDO)) ? globalDataDO : [];
        },
        getGlobalDataMS() {
            return (typeof globalDataMS !== "undefined" && Array.isArray(globalDataMS)) ? globalDataMS : [];
        },
        getGlobalDataDailyOSA() {
            return (typeof globalDataDailyOSA !== "undefined" && Array.isArray(globalDataDailyOSA)) ? globalDataDailyOSA : [];
        },

        getExecutiveSummary() {
            const msData = this.getGlobalDataMS();
            const headers = typeof globalHeaderMS !== "undefined" ? globalHeaderMS : [];
            if (msData.length === 0 || headers.length === 0) return null;

            let idxRevMtd = headers.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
            let idxRevLmtd = headers.findIndex(h => h.toUpperCase().includes("REVENUE LMTD"));
            let idxPrimMtd = headers.findIndex(h => h.toUpperCase().includes("PRIMARY MTD"));
            let idxPrimLmtd = headers.findIndex(h => h.toUpperCase().includes("PRIMARY LMTD"));
            let idxSecMtd = headers.findIndex(h => h.toUpperCase().includes("SECONDARY MTD"));
            let idxSecLmtd = headers.findIndex(h => h.toUpperCase().includes("SECONDARY LMTD"));
            let idxTertMtd = headers.findIndex(h => h.toUpperCase().includes("TERTIARY B# MTD"));
            let idxTertLmtd = headers.findIndex(h => h.toUpperCase().includes("TERTIARY B# LMTD"));
            let idxTradeMtd = headers.findIndex(h => h.toUpperCase().includes("TRADE SUPPLY MTD"));
            let idxTradeLmtd = headers.findIndex(h => h.toUpperCase().includes("TRADE SUPPLY LMTD"));
            let idxVlrMtd = headers.findIndex(h => h.toUpperCase().includes("VLR SUBS MTD"));
            let idxVlrLmtd = headers.findIndex(h => h.toUpperCase().includes("VLR SUBS LMTD"));
            let idxRguMtd = headers.findIndex(h => h.toUpperCase().includes("RGUGA TRADE MTD"));
            let idxRguLmtd = headers.findIndex(h => h.toUpperCase().includes("RGUGA TRADE LMTD"));

            let t = { revM:0, revL:0, priM:0, priL:0, secM:0, secL:0, terM:0, terL:0, traM:0, traL:0, vlrM:0, vlrL:0, rguM:0, rguL:0 };

            msData.forEach(r => {
                if (idxRevMtd !== -1) t.revM += DataEngine.parseNumber(r[idxRevMtd]);
                if (idxRevLmtd !== -1) t.revL += DataEngine.parseNumber(r[idxRevLmtd]);
                if (idxPrimMtd !== -1) t.priM += DataEngine.parseNumber(r[idxPrimMtd]);
                if (idxPrimLmtd !== -1) t.priL += DataEngine.parseNumber(r[idxPrimLmtd]);
                if (idxSecMtd !== -1) t.secM += DataEngine.parseNumber(r[idxSecMtd]);
                if (idxSecLmtd !== -1) t.secL += DataEngine.parseNumber(r[idxSecLmtd]);
                if (idxTertMtd !== -1) t.terM += DataEngine.parseNumber(r[idxTertMtd]);
                if (idxTertLmtd !== -1) t.terL += DataEngine.parseNumber(r[idxTertLmtd]);
                if (idxTradeMtd !== -1) t.traM += DataEngine.parseNumber(r[idxTradeMtd]);
                if (idxTradeLmtd !== -1) t.traL += DataEngine.parseNumber(r[idxTradeLmtd]);
                if (idxVlrMtd !== -1) t.vlrM += DataEngine.parseNumber(r[idxVlrMtd]);
                if (idxVlrLmtd !== -1) t.vlrL += DataEngine.parseNumber(r[idxVlrLmtd]);
                if (idxRguMtd !== -1) t.rguM += DataEngine.parseNumber(r[idxRguMtd]);
                if (idxRguLmtd !== -1) t.rguL += DataEngine.parseNumber(r[idxRguLmtd]);
            });

            return {
                rev: { mtd: t.revM, lmtd: t.revL, growth: DataEngine.calculateGrowth(t.revM, t.revL) },
                primary: { mtd: t.priM, lmtd: t.priL, growth: DataEngine.calculateGrowth(t.priM, t.priL) },
                secondary: { mtd: t.secM, lmtd: t.secL, growth: DataEngine.calculateGrowth(t.secM, t.secL) },
                tertiary: { mtd: t.terM, lmtd: t.terL, growth: DataEngine.calculateGrowth(t.terM, t.terL) },
                ts: { mtd: t.traM, lmtd: t.traL, growth: DataEngine.calculateGrowth(t.traM, t.traL) },
                vlr: { mtd: t.vlrM, lmtd: t.vlrL, growth: DataEngine.calculateGrowth(t.vlrM, t.vlrL) },
                rgu: { mtd: t.rguM, lmtd: t.rguL, growth: DataEngine.calculateGrowth(t.rguM, t.rguL) }
            };
        },

        getKecamatanPerformance() {
            const msData = this.getGlobalDataMS();
            const headers = typeof globalHeaderMS !== "undefined" ? globalHeaderMS : [];
            let idxKec = 0;
            let idxRevMtd = headers.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
            let idxRevLmtd = headers.findIndex(h => h.toUpperCase().includes("REVENUE LMTD"));

            let result = [];
            msData.forEach(r => {
                let kec = String(r[idxKec] || "").trim();
                if (kec && kec.toUpperCase() !== "KECAMATAN" && !kec.toUpperCase().includes("TOTAL")) {
                    let mtd = idxRevMtd !== -1 ? DataEngine.parseNumber(r[idxRevMtd]) : 0;
                    let lmtd = idxRevLmtd !== -1 ? DataEngine.parseNumber(r[idxRevLmtd]) : 0;
                    let growth = DataEngine.calculateGrowth(mtd, lmtd);
                    result.push({ kecamatan: kec, mtd, lmtd, growth });
                }
            });
            return result;
        }
    };

    // ==========================================
    // 3. INITIALIZER & ROUTER
    // ==========================================
    document.addEventListener("DOMContentLoaded", () => {
        initApp();
    });

    function initApp() {
        injectMobileStructure();
        bindEvents();
        applyViewMode(AppState.viewMode);

        let attempts = 0;
        let syncInterval = setInterval(() => {
            attempts++;
            const doData = DataStore.getGlobalDataDO();
            if (doData.length > 0) {
                AppState.isOnline = true;
                const now = new Date();
                AppState.lastUpdate = now.getHours().toString().padStart(2, '0') + ":" + 
                                     now.getMinutes().toString().padStart(2, '0');
                updateStatusBadge();
                populateDseDropdown();
                renderCurrentTab();
                clearInterval(syncInterval);
            } else if (attempts >= 20) {
                AppState.isOnline = false;
                updateStatusBadge();
                clearInterval(syncInterval);
            }
        }, 300);
    }

    function applyViewMode(mode) {
        AppState.viewMode = mode;
        localStorage.setItem("mbx_view_mode", mode);
        if (mode === "DESKTOP") {
            document.body.classList.add("mbx-force-desktop");
        } else {
            document.body.classList.remove("mbx-force-desktop");
        }
    }

    function updateStatusBadge() {
        const badge = document.getElementById("mbxStatusPill");
        if (!badge) return;
        if (AppState.isOnline) {
            badge.className = "mbx-status-pill mbx-status-live";
            badge.innerHTML = `🟢 LIVE DATA (${AppState.lastUpdate})`;
        } else {
            badge.className = "mbx-status-pill mbx-status-offline";
            badge.innerHTML = `🔴 DATA OFFLINE`;
        }
    }

    // ==========================================
    // 4. UI INJECTION
    // ==========================================
    function injectMobileStructure() {
        if (document.getElementById("mbxAppHeader")) return;

        const headerHtml = `
            <div class="mbx-app-header" id="mbxAppHeader">
                <button class="mbx-btn-icon" id="mbxBtnDrawer"><i class="fa-solid fa-bars"></i></button>
                <div style="text-align:center;">
                    <div class="mbx-header-title">MC BENGKAYANG</div>
                    <div id="mbxStatusPill" class="mbx-status-pill mbx-status-offline">🔴 SYNCING...</div>
                </div>
                <button class="mbx-btn-icon mbx-btn-switch" style="font-size:11px; font-weight:800; background:#be123c; color:#ffffff; padding:6px 10px; border-radius:8px; border:none; cursor:pointer;">
                    <i class="fa-solid fa-desktop"></i>
                </button>
            </div>
        `;

        const floatBtnHtml = `<button class="mbx-floating-toggle-btn mbx-btn-switch"><i class="fa-solid fa-mobile-screen-button"></i> Desktop View</button>`;

        const drawerHtml = `
            <div class="mbx-drawer-overlay" id="mbxDrawerOverlay">
                <div class="mbx-drawer-content">
                    <div class="mbx-drawer-banner-im3">
                        <b style="font-size:13px; color:#0f172a; display:block;" id="mbxDrawerUserName">User Staff</b>
                        <span style="font-size:10px; color:#475569; font-weight:700;">MC Bengkayang Mobile Portal</span>
                    </div>
                    <div style="padding:10px;">
                        <div class="mbx-drawer-menu-item mbx-active" onclick="mbxSwitchTab('HOME')"><i class="fa-solid fa-house" style="color:#be123c;"></i> Executive Summary</div>
                        <div class="mbx-drawer-menu-item" onclick="mbxSwitchTab('OUTLET')"><i class="fa-solid fa-store" style="color:#10b981;"></i> Outlet Monitoring</div>
                        <div class="mbx-drawer-menu-item" onclick="mbxSwitchTab('PERFORMANCE')"><i class="fa-solid fa-chart-column" style="color:#0284c7;"></i> Performance & Area</div>
                        <div class="mbx-drawer-menu-item" onclick="mbxSwitchTab('GAP')"><i class="fa-solid fa-bullseye" style="color:#f59e0b;"></i> GAP Daily KPI</div>
                        <div class="mbx-drawer-menu-item" onclick="mbxOpenSubpage('NONKPI')"><i class="fa-solid fa-list-check" style="color:#6366f1;"></i> Non KPI & Scorecard</div>
                        <hr style="border:none; border-top:1px solid #f1f5f9; margin:8px 0;">
                        <div class="mbx-drawer-menu-item mbx-btn-switch"><i class="fa-solid fa-desktop" style="color:#0284c7;"></i> Desktop View</div>
                        <div class="mbx-drawer-menu-item" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket" style="color:#be123c;"></i> Logout</div>
                    </div>
                </div>
            </div>
        `;

        const bottomNavHtml = `
            <div class="mbx-bottom-nav" id="mbxBottomNav">
                <button class="mbx-nav-item mbx-active" id="mbxNavHome" onclick="mbxSwitchTab('HOME')"><i class="fa-solid fa-house"></i><span>HOME</span></button>
                <button class="mbx-nav-item" id="mbxNavOutlet" onclick="mbxSwitchTab('OUTLET')"><i class="fa-solid fa-store"></i><span>OUTLET</span></button>
                <button class="mbx-nav-item" id="mbxNavPerf" onclick="mbxSwitchTab('PERFORMANCE')"><i class="fa-solid fa-chart-column"></i><span>PERF</span></button>
                <button class="mbx-nav-item" id="mbxNavGap" onclick="mbxSwitchTab('GAP')"><i class="fa-solid fa-bullseye"></i><span>GAP</span></button>
                <button class="mbx-nav-item" onclick="mbxToggleDrawer(true)"><i class="fa-solid fa-bars"></i><span>MENU</span></button>
            </div>
        `;

        const subpageHtml = `
            <div class="mbx-subpage-screen" id="mbxSubpageScreen">
                <div style="position:sticky; top:0; background:#fff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; z-index:10006;">
                    <button class="mbx-btn-icon" onclick="mbxCloseSubpage()"><i class="fa-solid fa-arrow-left"></i></button>
                    <b style="font-size:13px; color:#0f172a;" id="mbxSubpageTitle">Detail View</b>
                    <div style="width:44px;"></div>
                </div>
                <div id="mbxSubpageContainer" style="padding:14px;"></div>
            </div>
        `;

        document.body.insertAdjacentHTML("afterbegin", headerHtml);
        document.body.insertAdjacentHTML("beforeend", floatBtnHtml);
        document.body.insertAdjacentHTML("beforeend", drawerHtml);
        document.body.insertAdjacentHTML("beforeend", bottomNavHtml);
        document.body.insertAdjacentHTML("beforeend", subpageHtml);

        injectMobileContainers();
    }

    function injectMobileContainers() {
        const container = document.querySelector(".container");
        if (!container) return;

        const homeViewHtml = `
            <div id="mbxHomeView" style="display:block;">
                <div class="mbx-card" style="margin-top:10px;">
                    <div style="font-size:10px; color:#64748b; font-weight:700;">Portal Micro Cluster Bengkayang</div>
                    <b style="font-size:15px; color:#0f172a;" id="mbxHomeUserName">User Staff</b>
                </div>
                <div style="font-size:11px; font-weight:800; color:#0f172a; margin-bottom:8px;">EXECUTIVE SUMMARY</div>
                <div id="mbxExecSummaryContainer">
                    <div class="mbx-card"><div class="mbx-skeleton" style="width:100%; height:80px;"></div></div>
                </div>
                <div style="font-size:11px; font-weight:800; color:#0f172a; margin:14px 0 8px 0;">⚠️ AREA ATTENTION (NEED ACTION)</div>
                <div id="mbxAreaAttentionContainer"></div>
            </div>
        `;

        const outletViewHtml = `
            <div id="mbxOutletView" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; margin-top:10px;">
                    <b style="font-size:13px; color:#0f172a;">MONITORING OUTLET</b>
                    <div style="display:flex; gap:4px;">
                        <select id="mbxDseFilter" style="padding:6px; border-radius:8px; border:1px solid #cbd5e1; font-size:10.5px; font-weight:800; background:#fff; max-width:110px;">
                            <option value="ALL">Semua DSE</option>
                        </select>
                        <select id="mbxHariFilter" style="padding:6px; border-radius:8px; border:1px solid #cbd5e1; font-size:10.5px; font-weight:800; background:#fff;">
                            <option value="ALL">Semua Hari</option>
                            <option value="SENIN">Senin</option>
                            <option value="SELASA">Selasa</option>
                            <option value="RABU">Rabu</option>
                            <option value="KAMIS">Kamis</option>
                            <option value="JUMAT">Jumat</option>
                            <option value="SABTU">Sabtu</option>
                        </select>
                    </div>
                </div>
                <div class="mbx-chip-group">
                    <button class="mbx-chip-btn mbx-active" id="mbxChipOsa" onclick="mbxSetOutletIndicator('OSA')">OSA</button>
                    <button class="mbx-chip-btn" id="mbxChipSellIn" onclick="mbxSetOutletIndicator('SELL_IN')">SELL IN SP</button>
                    <button class="mbx-chip-btn" id="mbxChipBio" onclick="mbxSetOutletIndicator('BIO')">BIOMETRIK</button>
                    <button class="mbx-chip-btn" id="mbxChipTagging" onclick="mbxSetOutletIndicator('TAGGING')">TAGGING</button>
                </div>
                <div style="margin-bottom:10px;">
                    <input type="text" id="mbxSearchOutlet" placeholder="🔍 Cari Nama Outlet / ID..." style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #cbd5e1; font-size:12px; box-sizing:border-box; min-height:44px;">
                </div>
                <div id="mbxOutletCardList"></div>
            </div>
        `;

        const perfViewHtml = `
            <div id="mbxPerfView" style="display:none;">
                <div class="mbx-card" style="margin-top:10px;">
                    <b style="font-size:13px; color:#0f172a; display:block; margin-bottom:10px;">AREA PERFORMANCE (REVENUE MTD)</b>
                    <div style="height:220px; width:100%;"><canvas id="mbxAreaChartCanvas"></canvas></div>
                </div>
                <div style="font-size:11px; font-weight:800; color:#0f172a; margin:14px 0 8px 0;">🔥 TOP 5 GROWTH</div>
                <div id="mbxTopGrowthContainer"></div>
                <div style="font-size:11px; font-weight:800; color:#0f172a; margin:14px 0 8px 0;">📉 TOP 5 DECLINE</div>
                <div id="mbxTopDeclineContainer"></div>
            </div>
        `;

        const gapViewHtml = `
            <div id="mbxGapView" style="display:none;">
                <div class="mbx-card" style="margin-top:10px;">
                    <b style="font-size:13px; color:#0f172a; display:block; margin-bottom:4px;">GAP DAILY KPI OSA DSE</b>
                    <span style="font-size:10.5px; color:#64748b;">Target Harian = GAP / Sisa Hari Kerja</span>
                </div>
                <div id="mbxGapListContainer"></div>
            </div>
        `;

        container.insertAdjacentHTML("afterbegin", homeViewHtml);
        container.insertAdjacentHTML("afterbegin", outletViewHtml);
        container.insertAdjacentHTML("afterbegin", perfViewHtml);
        container.insertAdjacentHTML("afterbegin", gapViewHtml);
    }

    function bindEvents() {
        document.getElementById("mbxBtnDrawer")?.addEventListener("click", () => mbxToggleDrawer(true));
        document.getElementById("mbxDrawerOverlay")?.addEventListener("click", (e) => {
            if (e.target.id === "mbxDrawerOverlay") mbxToggleDrawer(false);
        });
        document.querySelectorAll(".mbx-btn-switch").forEach(btn => {
            btn.addEventListener("click", mbxToggleViewMode);
        });
        document.getElementById("mbxHariFilter")?.addEventListener("change", (e) => {
            AppState.selectedHari = e.target.value.toUpperCase();
            renderOutletList();
        });
        document.getElementById("mbxDseFilter")?.addEventListener("change", (e) => {
            AppState.selectedDse = e.target.value.toUpperCase();
            renderOutletList();
        });
        document.getElementById("mbxSearchOutlet")?.addEventListener("input", (e) => {
            AppState.searchOutletQuery = e.target.value.toLowerCase().trim();
            renderOutletList();
        });
    }

    // ==========================================
    // 5. RENDERERS
    // ==========================================
    function renderCurrentTab() {
        const userDisplay = document.getElementById("activeUserNameDisplay");
        if (userDisplay) {
            const uName = userDisplay.innerText;
            if (document.getElementById("mbxHomeUserName")) document.getElementById("mbxHomeUserName").innerText = uName;
            if (document.getElementById("mbxDrawerUserName")) document.getElementById("mbxDrawerUserName").innerText = uName;
        }

        if (AppState.activeTab === "HOME") renderHomeView();
        else if (AppState.activeTab === "OUTLET") renderOutletList();
        else if (AppState.activeTab === "PERFORMANCE") renderPerformanceView();
        else if (AppState.activeTab === "GAP") renderGapView();
    }

    function renderHomeView() {
        const summary = DataStore.getExecutiveSummary();
        const container = document.getElementById("mbxExecSummaryContainer");
        if (!container || !summary) return;

        container.innerHTML = `
            <div class="mbx-horizontal-scroll">
                <div class="mbx-scroll-card" style="border-left-color:#be123c;">
                    <div class="mbx-kpi-title">Revenue MTD</div>
                    <div class="mbx-kpi-val">${DataEngine.formatCurrency(summary.rev.mtd)}</div>
                    <div class="mbx-kpi-sub ${summary.rev.growth >= 0 ? 'mbx-text-green' : 'mbx-text-red'}">
                        ${summary.rev.growth >= 0 ? '▲' : '▼'} ${DataEngine.formatPercent(summary.rev.growth)}
                    </div>
                </div>
                <div class="mbx-scroll-card" style="border-left-color:#f59e0b;">
                    <div class="mbx-kpi-title">Primary MTD</div>
                    <div class="mbx-kpi-val">${DataEngine.formatCurrency(summary.primary.mtd)}</div>
                    <div class="mbx-kpi-sub ${summary.primary.growth >= 0 ? 'mbx-text-green' : 'mbx-text-red'}">
                        ${summary.primary.growth >= 0 ? '▲' : '▼'} ${DataEngine.formatPercent(summary.primary.growth)}
                    </div>
                </div>
                <div class="mbx-scroll-card" style="border-left-color:#8b5cf6;">
                    <div class="mbx-kpi-title">Secondary MTD</div>
                    <div class="mbx-kpi-val">${DataEngine.formatCurrency(summary.secondary.mtd)}</div>
                    <div class="mbx-kpi-sub ${summary.secondary.growth >= 0 ? 'mbx-text-green' : 'mbx-text-red'}">
                        ${summary.secondary.growth >= 0 ? '▲' : '▼'} ${DataEngine.formatPercent(summary.secondary.growth)}
                    </div>
                </div>
                <div class="mbx-scroll-card" style="border-left-color:#0284c7;">
                    <div class="mbx-kpi-title">Tertiary B#</div>
                    <div class="mbx-kpi-val">${DataEngine.formatCurrency(summary.tertiary.mtd)}</div>
                    <div class="mbx-kpi-sub ${summary.tertiary.growth >= 0 ? 'mbx-text-green' : 'mbx-text-red'}">
                        ${summary.tertiary.growth >= 0 ? '▲' : '▼'} ${DataEngine.formatPercent(summary.tertiary.growth)}
                    </div>
                </div>
                <div class="mbx-scroll-card" style="border-left-color:#10b981;">
                    <div class="mbx-kpi-title">Trade Supply</div>
                    <div class="mbx-kpi-val">${DataEngine.formatCurrency(summary.ts.mtd)}</div>
                    <div class="mbx-kpi-sub ${summary.ts.growth >= 0 ? 'mbx-text-green' : 'mbx-text-red'}">
                        ${summary.ts.growth >= 0 ? '▲' : '▼'} ${DataEngine.formatPercent(summary.ts.growth)}
                    </div>
                </div>
            </div>
        `;
        renderAreaAttention();
    }

    function renderAreaAttention() {
        const attContainer = document.getElementById("mbxAreaAttentionContainer");
        if (!attContainer) return;
        const kecData = DataStore.getKecamatanPerformance();
        const atRisk = kecData.filter(k => k.growth < 0).sort((a, b) => a.growth - b.growth);

        if (atRisk.length === 0) {
            attContainer.innerHTML = `<div class="mbx-card" style="text-align:center; color:#10b981; font-size:12px; font-weight:700;">🟢 Seluruh area aman (Growth positif).</div>`;
            return;
        }

        let html = "";
        atRisk.forEach(k => {
            html += `
                <div class="mbx-card" style="border-left:4px solid #be123c; padding:12px 14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b style="font-size:13px; color:#0f172a;">${k.kecamatan}</b>
                        <span class="mbx-badge-pct mbx-bg-red">NEED ACTION</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:11.5px; color:#64748b;">
                        <span>MTD: <b style="color:#0f172a;">${DataEngine.formatCurrency(k.mtd)}</b></span>
                        <span>Growth: <b class="mbx-text-red">${DataEngine.formatPercent(k.growth)}</b></span>
                    </div>
                </div>
            `;
        });
        attContainer.innerHTML = html;
    }

    function renderOutletList() {
        const listContainer = document.getElementById("mbxOutletCardList");
        const doData = DataStore.getGlobalDataDO();
        const doHeaders = typeof globalHeaderDO !== "undefined" ? globalHeaderDO : [];
        if (!listContainer || doData.length === 0) return;

        let colIdxHari = AppState.selectedHari !== "ALL" ? doHeaders.findIndex(h => String(h || "").trim().toUpperCase() === AppState.selectedHari) : -1;

        let filteredRows = doData.filter(r => {
            let outName = String(r[1] || "").trim();
            if (!outName || outName.toUpperCase() === "OUTLET NAME") return false;

            let dseCode = String(r[2] || "").trim().toUpperCase();
            let matchDse = (AppState.selectedDse === "ALL" || dseCode === AppState.selectedDse);
            let matchHari = (colIdxHari === -1 || DataEngine.parseNumber(r[colIdxHari]) > 0);
            let matchSearch = outName.toLowerCase().includes(AppState.searchOutletQuery) || String(r[0]).toLowerCase().includes(AppState.searchOutletQuery);

            return matchDse && matchHari && matchSearch;
        });

        if (filteredRows.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b; font-size:12px;">Tidak ada outlet ditemukan.</div>`;
            return;
        }

        let html = "";
        filteredRows.slice(0, 50).forEach(r => {
            const outId = r[0] || "-";
            const outName = r[1] || "-";
            let valStr = "";
            let pctBadge = "";

            if (AppState.selectedOutletIndicator === "OSA") {
                const targetOsa = DataEngine.parseNumber(r[11]);
                const achOsa = DataEngine.parseNumber(r[12]);
                const pctOsa = targetOsa > 0 ? (achOsa / targetOsa) * 100 : 0;
                valStr = DataEngine.formatCurrency(achOsa);
                let badgeClass = pctOsa >= 100 ? "mbx-bg-green" : (pctOsa >= 80 ? "mbx-bg-yellow" : "mbx-bg-red");
                pctBadge = `<span class="mbx-badge-pct ${badgeClass}">${pctOsa.toFixed(0)}%</span>`;
            } else if (AppState.selectedOutletIndicator === "SELL_IN") {
                const targetSp = DataEngine.parseNumber(r[7]);
                const achSp = DataEngine.parseNumber(r[8]);
                const pctSp = targetSp > 0 ? (achSp / targetSp) * 100 : 0;
                valStr = `${achSp} pcs`;
                let badgeClass = pctSp >= 100 ? "mbx-bg-green" : (pctSp >= 50 ? "mbx-bg-yellow" : "mbx-bg-red");
                pctBadge = `<span class="mbx-badge-pct ${badgeClass}">${pctSp.toFixed(0)}%</span>`;
            } else if (AppState.selectedOutletIndicator === "BIO") {
                const achBio = DataEngine.parseNumber(r[18]);
                valStr = `${achBio} Bio`;
                pctBadge = `<span class="mbx-badge-pct ${achBio >= 1 ? 'mbx-bg-green' : 'mbx-bg-red'}">${achBio >= 1 ? '100%' : '0%'}</span>`;
            } else if (AppState.selectedOutletIndicator === "TAGGING") {
                const tagSp = DataEngine.parseNumber(r[15]);
                valStr = `${tagSp} pcs`;
                pctBadge = `<span class="mbx-badge-pct ${tagSp >= 3 ? 'mbx-bg-green' : 'mbx-bg-yellow'}">${tagSp >= 3 ? '100%' : '0%'}</span>`;
            }

            html += `
                <div class="mbx-outlet-card" onclick="mbxOpenOutletDetailById('${outId}')">
                    <div>
                        <b style="font-size:12.5px; color:#0f172a; display:block;">${outName}</b>
                        <span style="font-size:10px; color:#64748b;">ID: ${outId}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:11.5px; font-weight:800; color:#0f172a;">${valStr}</span>
                        ${pctBadge}
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    }

    function renderPerformanceView() {
        const kecData = DataStore.getKecamatanPerformance();
        const topGrowth = [...kecData].sort((a, b) => b.growth - a.growth).slice(0, 5);
        const topContainer = document.getElementById("mbxTopGrowthContainer");
        if (topContainer) {
            let html = "";
            topGrowth.forEach((k, idx) => {
                html += `
                    <div class="mbx-card" style="padding:10px 14px; margin-bottom:6px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                            <b style="color:#0f172a;">#${idx+1} ${k.kecamatan}</b>
                            <b class="mbx-text-green">▲ ${DataEngine.formatPercent(k.growth)}</b>
                        </div>
                    </div>
                `;
            });
            topContainer.innerHTML = html;
        }

        const topDecline = [...kecData].sort((a, b) => a.growth - b.growth).slice(0, 5);
        const decContainer = document.getElementById("mbxTopDeclineContainer");
        if (decContainer) {
            let html = "";
            topDecline.forEach((k, idx) => {
                html += `
                    <div class="mbx-card" style="padding:10px 14px; margin-bottom:6px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                            <b style="color:#0f172a;">#${idx+1} ${k.kecamatan}</b>
                            <b class="mbx-text-red">▼ ${DataEngine.formatPercent(k.growth)}</b>
                        </div>
                    </div>
                `;
            });
            decContainer.innerHTML = html;
        }
        renderAreaChartCanvas();
    }

    function renderAreaChartCanvas() {
        const canvas = document.getElementById("mbxAreaChartCanvas");
        if (!canvas || typeof Chart === "undefined") return;
        const kecData = DataStore.getKecamatanPerformance();
        const labels = kecData.map(k => k.kecamatan);
        const values = kecData.map(k => k.mtd);

        if (AppState.chartInstances["AREA"]) AppState.chartInstances["AREA"].destroy();

        AppState.chartInstances["AREA"] = new Chart(canvas, {
            type: 'bar',
            data: { labels: labels, datasets: [{ data: values, backgroundColor: '#be123c', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    function renderGapView() {
        const container = document.getElementById("mbxGapListContainer");
        const dailyOsa = DataStore.getGlobalDataDailyOSA();
        const daysInfo = DataEngine.getWorkingDaysInfo();
        const sisaHK = daysInfo.remainingDays > 0 ? daysInfo.remainingDays : 1;
        if (!container || dailyOsa.length === 0) return;

        let html = "";
        dailyOsa.forEach(r => {
            let dse = String(r[0] || "").trim();
            if (dse && dse.toUpperCase() !== "DSE CODE") {
                let tgt = DataEngine.parseNumber(r[2]);
                let ach = DataEngine.parseNumber(r[3]);
                let gap = tgt - ach;
                let dailyTarget = Math.max(0, gap) / sisaHK;

                html += `
                    <div class="mbx-card" style="margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <b style="font-size:13px; color:#0f172a;">DSE: ${dse}</b>
                            <span class="mbx-badge-pct ${gap <= 0 ? 'mbx-bg-green' : 'mbx-bg-red'}">${gap <= 0 ? 'ACHIEVED' : 'GAP'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:8px; color:#64748b;">
                            <span>Target: <b>${DataEngine.formatCurrency(tgt)}</b></span>
                            <span>Ach: <b>${DataEngine.formatCurrency(ach)}</b></span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:4px; font-weight:800;">
                            <span>GAP: <span class="${gap <= 0 ? 'mbx-text-green' : 'mbx-text-red'}">${DataEngine.formatCurrency(gap)}</span></span>
                            <span>Daily: <span class="mbx-text-orange">${DataEngine.formatCurrency(dailyTarget)}/hr</span></span>
                        </div>
                    </div>
                `;
            }
        });
        container.innerHTML = html;
    }

    function renderNonKpiContent() {
        const container = document.getElementById("mbxSubpageContainer");
        const doData = DataStore.getGlobalDataDO();
        let dseGroup = {};
        doData.forEach(r => {
            let dse = String(r[2] || "").trim();
            if (dse && dse.toUpperCase() !== "DSE CODE") {
                if (!dseGroup[dse]) dseGroup[dse] = { fwaAch: 0, fwaTgt: 2, tagAch: 0, tagTgt: 30, bioAch: 0, bioTgt: 40 };
                dseGroup[dse].fwaAch += DataEngine.parseNumber(r[19]);
                if (DataEngine.parseNumber(r[15]) >= 3) dseGroup[dse].tagAch += 1;
                dseGroup[dse].bioAch += DataEngine.parseNumber(r[18]);
            }
        });

        let contentHtml = "";
        Object.keys(dseGroup).forEach(dse => {
            let d = dseGroup[dse];
            contentHtml += `
                <div class="mbx-card" style="margin-bottom:8px; font-size:11px;">
                    <b style="color:#0f172a; font-size:12.5px; display:block; margin-bottom:6px;">${dse}</b>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span>Ach RGUGA FWA:</span><b>${d.fwaAch} / ${d.fwaTgt}</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span>Ach Tagging 3PCS:</span><b>${d.tagAch} / ${d.tagTgt}</b>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Ach GA Biometrik:</span><b>${d.bioAch} / ${d.bioTgt}</b>
                    </div>
                </div>
            `;
        });
        container.innerHTML = contentHtml;
    }

    // ==========================================
    // 6. GLOBAL INTERFACES
    // ==========================================
    window.mbxToggleViewMode = function () {
        const nextMode = AppState.viewMode === "MOBILE" ? "DESKTOP" : "MOBILE";
        applyViewMode(nextMode);
        mbxToggleDrawer(false);
    };

    window.mbxSwitchTab = function (tabKey) {
        AppState.activeTab = tabKey;
        document.querySelectorAll(".mbx-nav-item").forEach(el => el.classList.remove("mbx-active"));
        if (tabKey === "HOME") document.getElementById("mbxNavHome")?.classList.add("mbx-active");
        if (tabKey === "OUTLET") document.getElementById("mbxNavOutlet")?.classList.add("mbx-active");
        if (tabKey === "PERFORMANCE") document.getElementById("mbxNavPerf")?.classList.add("mbx-active");
        if (tabKey === "GAP") document.getElementById("mbxNavGap")?.classList.add("mbx-active");

        document.getElementById("mbxHomeView").style.display = tabKey === "HOME" ? "block" : "none";
        document.getElementById("mbxOutletView").style.display = tabKey === "OUTLET" ? "block" : "none";
        document.getElementById("mbxPerfView").style.display = tabKey === "PERFORMANCE" ? "block" : "none";
        document.getElementById("mbxGapView").style.display = tabKey === "GAP" ? "block" : "none";

        renderCurrentTab();
        mbxCloseSubpage();
        mbxToggleDrawer(false);
    };

    window.mbxToggleDrawer = function (show) {
        const overlay = document.getElementById("mbxDrawerOverlay");
        if (overlay) overlay.classList.toggle("mbx-show", show);
    };

    window.mbxSetOutletIndicator = function (key) {
        AppState.selectedOutletIndicator = key;
        document.querySelectorAll("#mbxOutletView .mbx-chip-btn").forEach(c => c.classList.remove("mbx-active"));
        if (key === "OSA") document.getElementById("mbxChipOsa")?.classList.add("mbx-active");
        if (key === "SELL_IN") document.getElementById("mbxChipSellIn")?.classList.add("mbx-active");
        if (key === "BIO") document.getElementById("mbxChipBio")?.classList.add("mbx-active");
        if (key === "TAGGING") document.getElementById("mbxChipTagging")?.classList.add("mbx-active");
        renderOutletList();
    };

    window.mbxOpenSubpage = function (pageType) {
        const subpage = document.getElementById("mbxSubpageScreen");
        const title = document.getElementById("mbxSubpageTitle");
        if (!subpage || !title) return;
        if (pageType === "NONKPI") {
            title.innerText = "Non KPI Summary";
            renderNonKpiContent();
        }
        subpage.classList.add("mbx-show");
        mbxToggleDrawer(false);
    };

    window.mbxCloseSubpage = function () {
        document.getElementById("mbxSubpageScreen")?.classList.remove("mbx-show");
    };

    window.mbxOpenOutletDetailById = function (targetId) {
        const doData = DataStore.getGlobalDataDO();
        const r = doData.find(row => String(row[0]).trim() === String(targetId).trim());
        if (!r) return;
        const subpage = document.getElementById("mbxSubpageScreen");
        const title = document.getElementById("mbxSubpageTitle");
        const container = document.getElementById("mbxSubpageContainer");

        title.innerText = "Profil Outlet";
        container.innerHTML = `
            <div class="mbx-card">
                <b style="font-size:15px; color:#0f172a;">${r[1] || '-'}</b>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">ID: ${r[0]} | DSE: ${r[2]}</div>
                <hr style="border:none; border-top:1px solid #f1f5f9; margin:12px 0;">
                <div style="font-size:12px; line-height:1.6;">
                    <span style="color:#64748b;">Target OSA:</span> <b>${DataEngine.formatCurrency(r[11])}</b><br>
                    <span style="color:#64748b;">Aktual OSA:</span> <b style="color:#10b981;">${DataEngine.formatCurrency(r[12])}</b><br>
                    <span style="color:#64748b;">SP Sell In:</span> <b>${r[8]} pcs</b><br>
                    <span style="color:#64748b;">Biometrik:</span> <b>${r[18]}</b>
                </div>
            </div>
        `;
        subpage.classList.add("mbx-show");
    };

    function populateDseDropdown() {
        const dseSelect = document.getElementById("mbxDseFilter");
        const doData = DataStore.getGlobalDataDO();
        if (!dseSelect || doData.length === 0) return;

        let dses = new Set();
        doData.forEach(r => {
            let code = String(r[2] || "").trim();
            if (code && code.toUpperCase() !== "DSE CODE") dses.add(code);
        });

        let optionsHtml = `<option value="ALL">Semua DSE</option>`;
        Array.from(dses).sort().forEach(d => {
            optionsHtml += `<option value="${d}">${d}</option>`;
        });
        dseSelect.innerHTML = optionsHtml;
    }
})();