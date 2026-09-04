/* ==========================================================================
   MOBILE APP ADD-ON SYSTEM (PERMANENT FLOATING TOGGLE)
   ========================================================================== */

(function () {
    "use strict";

    let currentSelectedHari = "ALL";
    let currentSelectedDse = "ALL";
    let currentSelectedIndicator = "OSA";
    let searchOutletQuery = "";

    let currentViewMode = localStorage.getItem("mbx_view_mode") || "MOBILE";

    document.addEventListener("DOMContentLoaded", () => {
        initMobileComponents();
        applyViewMode(currentViewMode);

        window.addEventListener("resize", () => {
            if (window.innerWidth <= 768 && !document.getElementById("mbxAppHeader")) {
                initMobileComponents();
            }
            applyViewMode(currentViewMode);
        });
    });

    function applyViewMode(mode) {
        currentViewMode = mode;
        localStorage.setItem("mbx_view_mode", mode);

        const body = document.body;

        if (mode === "DESKTOP") {
            body.classList.add("mbx-force-desktop");
            document.querySelectorAll(".tab-content").forEach(el => el.style.removeProperty("display"));
            const activeTab = document.querySelector(".top-nav-bar .nav-tab.active");
            if (activeTab) {
                const targetId = activeTab.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
                if (targetId && document.getElementById(targetId)) {
                    document.getElementById(targetId).style.display = "block";
                }
            }
        } else {
            body.classList.remove("mbx-force-desktop");
            if (window.innerWidth <= 768) {
                document.querySelectorAll(".tab-content").forEach(el => el.style.setProperty("display", "none", "important"));
            }
        }
    }

    function initMobileComponents() {
        if (document.getElementById("mbxAppHeader")) return;

        injectMobileUIElements();
        setupMobileEventListeners();

        let syncDataInterval = setInterval(() => {
            if (typeof globalDataDO !== "undefined" && Array.isArray(globalDataDO) && globalDataDO.length > 0) {
                populateDseDropdown();
                renderMobileHomeData();
                renderMobileOutletList();
                clearInterval(syncDataInterval);
            }
        }, 300);
    }

    function injectMobileUIElements() {
        // 1. Header Mobile App
        const headerHtml = `
            <div class="mbx-app-header" id="mbxAppHeader">
                <button class="mbx-btn-icon" id="mbxBtnDrawer"><i class="fa-solid fa-bars"></i></button>
                <div class="mbx-header-title">MC BENGKAYANG</div>
                <button class="mbx-btn-icon mbx-btn-switch" style="font-size:11px; font-weight:800; background:#be123c; color:#ffffff; padding:5px 10px; border-radius:6px; border:none; cursor:pointer;">
                    <i class="fa-solid fa-desktop"></i> Desktop View
                </button>
            </div>
        `;

        // 2. Floating Button Saat Mode Desktop
        const floatBtnHtml = `
            <button class="mbx-floating-toggle-btn mbx-btn-switch">
                <i class="fa-solid fa-mobile-screen-button"></i> Switch ke Mobile View
            </button>
        `;

        // 3. Drawer Menu IM3
        const drawerHtml = `
            <div class="mbx-drawer-overlay" id="mbxDrawerOverlay">
                <div class="mbx-drawer-content">
                    <div class="mbx-drawer-banner-im3">
                        <img src="im3.png" alt="IM3 Logo" style="height:26px; object-fit:contain;">
                        <div style="margin-top:10px;">
                            <b style="font-size:13px; color:#0f172a; display:block;" id="mbxDrawerUserName">User Staff</b>
                            <span style="font-size:10px; color:#475569; font-weight:700;">MC Bengkayang</span>
                        </div>
                    </div>
                    <div style="padding:10px;">
                        <div class="mbx-drawer-menu-item mbx-active" onclick="mbxSwitchTab('HOME')"><i class="fa-solid fa-house" style="color:#be123c;"></i> Home</div>
                        <div class="mbx-drawer-menu-item" onclick="mbxSwitchTab('OUTLET')"><i class="fa-solid fa-store" style="color:#10b981;"></i> Detail Outlet</div>
                        <div class="mbx-drawer-menu-item" onclick="mbxOpenSubpage('GAP')"><i class="fa-solid fa-bullseye" style="color:#f59e0b;"></i> GAP Daily KPI</div>
                        <div class="mbx-drawer-menu-item" onclick="mbxOpenSubpage('SM')"><i class="fa-solid fa-tower-cell" style="color:#8b5cf6;"></i> Site Monitoring</div>
                        <div class="mbx-drawer-menu-item" onclick="mbxOpenSubpage('PP')"><i class="fa-solid fa-handshake" style="color:#d946ef;"></i> Partner Performance</div>
                        <hr style="border:none; border-top:1px solid #f1f5f9; margin:8px 0;">
                        <div class="mbx-drawer-menu-item mbx-btn-switch"><i class="fa-solid fa-desktop" style="color:#0284c7;"></i> Switch ke Mode Desktop</div>
                        <div class="mbx-drawer-menu-item" onclick="exportExcelCurrent()"><i class="fa-solid fa-file-excel" style="color:#10b981;"></i> Export Excel</div>
                        <div class="mbx-drawer-menu-item" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket" style="color:#be123c;"></i> Logout</div>
                    </div>
                </div>
            </div>
        `;

        // 4. Bottom Nav
        const bottomNavHtml = `
            <div class="mbx-bottom-nav" id="mbxBottomNav">
                <button class="mbx-nav-item mbx-active" id="mbxNavHome" onclick="mbxSwitchTab('HOME')">
                    <i class="fa-solid fa-house"></i>
                    <span>Home</span>
                </button>
                <button class="mbx-nav-item" id="mbxNavOutlet" onclick="mbxSwitchTab('OUTLET')">
                    <i class="fa-solid fa-store"></i>
                    <span>Outlet</span>
                </button>
                <button class="mbx-nav-item" id="mbxNavGap" onclick="mbxOpenSubpage('GAP')">
                    <i class="fa-solid fa-chart-line"></i>
                    <span>GAP KPI</span>
                </button>
                <button class="mbx-nav-item" id="mbxNavMenu" onclick="mbxToggleDrawer(true)">
                    <i class="fa-solid fa-bars"></i>
                    <span>Menu</span>
                </button>
            </div>
        `;

        const subpageHtml = `
            <div class="mbx-subpage-screen" id="mbxSubpageScreen">
                <div style="position:sticky; top:0; background:#fff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
                    <button class="mbx-btn-icon" onclick="mbxCloseSubpage()"><i class="fa-solid fa-arrow-left"></i></button>
                    <b style="font-size:14px; color:#0f172a;" id="mbxSubpageTitle">Subpage</b>
                    <div style="width:24px;"></div>
                </div>
                <div id="mbxSubpageContainer" style="padding:14px;"></div>
            </div>
        `;

        document.body.insertAdjacentHTML("afterbegin", headerHtml);
        document.body.insertAdjacentHTML("beforeend", floatBtnHtml);
        document.body.insertAdjacentHTML("beforeend", drawerHtml);
        document.body.insertAdjacentHTML("beforeend", bottomNavHtml);
        document.body.insertAdjacentHTML("beforeend", subpageHtml);

        injectMobileViewsContainers();
    }

    function injectMobileViewsContainers() {
        const container = document.querySelector(".container");
        if (!container) return;

        const dateInfo = getRemainingWorkingDaysInfo();

        const homeViewHtml = `
            <div id="mbxHomeView" style="display:block;">
                <div style="background:#fff; border-radius:12px; padding:14px; margin:12px 0 10px 0; border:1px solid #e2e8f0;">
                    <div style="font-size:10px; color:#64748b; font-weight:700;">Hari ini, ${dateInfo.currentDayNum} ${dateInfo.currentMonthName} ${dateInfo.currentYear}</div>
                    <b style="font-size:15px; color:#0f172a;" id="mbxHomeUserName">User Staff</b>
                </div>

                <div style="font-size:11px; font-weight:800; color:#0f172a; margin-bottom:8px;">EXECUTIVE PERFORMANCE SUMMARY</div>
                
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-bottom:12px;">
                    <div style="background:#fff; border-radius:12px; padding:12px; border:1px solid #e2e8f0; border-left:4px solid #be123c;">
                        <div style="font-size:10px; font-weight:800; color:#64748b;">REVENUE MTD</div>
                        <div style="font-size:14px; font-weight:900; color:#0f172a; margin-top:4px;" id="mbxHomeRev">Rp 0</div>
                    </div>
                    <div style="background:#fff; border-radius:12px; padding:12px; border:1px solid #e2e8f0; border-left:4px solid #10b981;">
                        <div style="font-size:10px; font-weight:800; color:#64748b;">OSA ACH %</div>
                        <div style="font-size:14px; font-weight:900; color:#0f172a; margin-top:4px;" id="mbxHomeOsa">0.0%</div>
                    </div>
                    <div style="background:#fff; border-radius:12px; padding:12px; border:1px solid #e2e8f0; border-left:4px solid #0284c7;">
                        <div style="font-size:10px; font-weight:800; color:#64748b;">SELL IN ACH %</div>
                        <div style="font-size:14px; font-weight:900; color:#0f172a; margin-top:4px;" id="mbxHomeSellIn">0.0%</div>
                    </div>
                    <div style="background:#fff; border-radius:12px; padding:12px; border:1px solid #e2e8f0; border-left:4px solid #8b5cf6;">
                        <div style="font-size:10px; font-weight:800; color:#64748b;">BIOMETRIK %</div>
                        <div style="font-size:14px; font-weight:900; color:#0f172a; margin-top:4px;" id="mbxHomeBio">0.0%</div>
                    </div>
                </div>

                <div style="background:#fff; border-radius:12px; padding:14px; border:1px solid #e2e8f0; margin-bottom:14px;">
                    <b style="font-size:11px; color:#0f172a; display:block; margin-bottom:8px;">TODAY'S PRIORITY ACTION</b>
                    <div style="display:flex; justify-content:space-between; font-size:11px; padding:6px 0; border-bottom:1px dashed #f1f5f9;">
                        <span>🔴 SP Sell In < Target</span>
                        <b style="color:#be123c;" id="mbxHomeCountSellIn">0 Outlet</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:11px; padding:6px 0; border-bottom:1px dashed #f1f5f9;">
                        <span>🟠 OSA Belum Achieved</span>
                        <b style="color:#d97706;" id="mbxHomeCountOsa">0 Outlet</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:11px; padding:6px 0;">
                        <span>🟡 Belum Biometrik</span>
                        <b style="color:#ca8a04;" id="mbxHomeCountBio">0 Outlet</b>
                    </div>
                </div>
            </div>
        `;

        const outletViewHtml = `
            <div id="mbxOutletView" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin:10px 0;">
                    <b style="font-size:14px; color:#0f172a;">Detail Outlet</b>
                    <div style="display:flex; gap:6px;">
                        <select id="mbxDseFilter" style="padding:6px 8px; border-radius:8px; border:1px solid #cbd5e1; font-size:10px; font-weight:800; background:#fff; max-width:110px;">
                            <option value="ALL">Semua DSE</option>
                        </select>
                        <select id="mbxHariFilter" style="padding:6px 8px; border-radius:8px; border:1px solid #cbd5e1; font-size:10px; font-weight:800; background:#fff;">
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
                    <div class="mbx-chip-btn" id="mbxChipSellIn" onclick="mbxSetIndicator('SELL_IN')">Sell In</div>
                    <div class="mbx-chip-btn mbx-active" id="mbxChipOsa" onclick="mbxSetIndicator('OSA')">OSA</div>
                    <div class="mbx-chip-btn" id="mbxChipBio" onclick="mbxSetIndicator('BIO')">Biometrik</div>
                    <div class="mbx-chip-btn" id="mbxChipTagging" onclick="mbxSetIndicator('TAGGING')">Tagging</div>
                </div>

                <div style="margin-bottom:12px;">
                    <input type="text" id="mbxSearchOutlet" placeholder="🔍 Cari Outlet / Nama..." style="width:100%; padding:10px; border-radius:10px; border:1px solid #cbd5e1; font-size:12px; box-sizing:border-box;">
                </div>

                <div id="mbxOutletCardList"></div>
            </div>
        `;

        container.insertAdjacentHTML("afterbegin", homeViewHtml);
        container.insertAdjacentHTML("afterbegin", outletViewHtml);
    }

    function setupMobileEventListeners() {
        document.getElementById("mbxBtnDrawer")?.addEventListener("click", () => mbxToggleDrawer(true));
        document.getElementById("mbxDrawerOverlay")?.addEventListener("click", (e) => {
            if (e.target.id === "mbxDrawerOverlay") mbxToggleDrawer(false);
        });

        // Event Listener untuk Semua Tombol Switch Mode
        document.querySelectorAll(".mbx-btn-switch").forEach(btn => {
            btn.addEventListener("click", mbxToggleViewMode);
        });

        document.getElementById("mbxHariFilter")?.addEventListener("change", (e) => {
            currentSelectedHari = e.target.value.toUpperCase();
            renderMobileOutletList();
        });

        document.getElementById("mbxDseFilter")?.addEventListener("change", (e) => {
            currentSelectedDse = e.target.value.toUpperCase();
            renderMobileOutletList();
        });

        document.getElementById("mbxSearchOutlet")?.addEventListener("input", (e) => {
            searchOutletQuery = e.target.value.toLowerCase().trim();
            renderMobileOutletList();
        });
    }

    function populateDseDropdown() {
        const dseSelect = document.getElementById("mbxDseFilter");
        if (!dseSelect || !globalDataDO) return;

        let dses = new Set();
        globalDataDO.forEach(r => {
            let code = String(r[2] || "").trim();
            if (code && code.toUpperCase() !== "DSE CODE" && code.toUpperCase() !== "DSE") {
                dses.add(code);
            }
        });

        let optionsHtml = `<option value="ALL">Semua DSE</option>`;
        dses.forEach(d => {
            optionsHtml += `<option value="${d}">${d}</option>`;
        });
        dseSelect.innerHTML = optionsHtml;

        if (typeof currentUserRole !== "undefined" && currentUserRole === "dse" && typeof currentLoggedInUser !== "undefined") {
            const userDse = currentLoggedInUser.username ? currentLoggedInUser.username.toUpperCase() : "";
            if (userDse) {
                dseSelect.value = userDse;
                currentSelectedDse = userDse;
                dseSelect.disabled = true;
            }
        }
    }

    function renderMobileHomeData() {
        const userDisplay = document.getElementById("activeUserNameDisplay");
        if (userDisplay) {
            const uName = userDisplay.innerText;
            if (document.getElementById("mbxHomeUserName")) document.getElementById("mbxHomeUserName").innerText = uName;
            if (document.getElementById("mbxDrawerUserName")) document.getElementById("mbxDrawerUserName").innerText = uName;
        }

        const revElem = document.getElementById("exKpiRev");
        const osaElem = document.getElementById("exKpiOsa");
        const sellInElem = document.getElementById("exKpiSellIn");
        const bioElem = document.getElementById("exKpiBio");

        if (revElem) document.getElementById("mbxHomeRev").innerText = revElem.innerText;
        if (osaElem) document.getElementById("mbxHomeOsa").innerText = osaElem.innerText;
        if (sellInElem) document.getElementById("mbxHomeSellIn").innerText = sellInElem.innerText;
        if (bioElem) document.getElementById("mbxHomeBio").innerText = bioElem.innerText;

        let unachSellIn = 0, unachOsa = 0, unachBio = 0;
        globalDataDO.forEach(r => {
            if (parseNum(r[8]) < 3) unachSellIn++;
            if (parseNum(r[12]) < 300000) unachOsa++;
            if (parseNum(r[18]) < 1) unachBio++;
        });

        document.getElementById("mbxHomeCountSellIn").innerText = `${unachSellIn} Outlet`;
        document.getElementById("mbxHomeCountOsa").innerText = `${unachOsa} Outlet`;
        document.getElementById("mbxHomeCountBio").innerText = `${unachBio} Outlet`;
    }

    function renderMobileOutletList() {
        const listContainer = document.getElementById("mbxOutletCardList");
        if (!listContainer || typeof globalDataDO === "undefined" || !globalDataDO) return;

        const hariIndexMap = { 'SENIN': 20, 'SELASA': 21, 'RABU': 22, 'KAMIS': 23, 'JUMAT': 24, 'SABTU': 25 };
        let colHariIdx = hariIndexMap[currentSelectedHari] !== undefined ? hariIndexMap[currentSelectedHari] : -1;

        let filteredRows = globalDataDO.filter(r => {
            let outName = String(r[1] || "").trim();
            if (!outName || outName.toUpperCase() === "OUTLET NAME") return false;

            let dseCode = String(r[2] || "").trim().toUpperCase();
            let matchDse = (currentSelectedDse === "ALL" || dseCode === currentSelectedDse);
            let matchHari = (colHariIdx === -1 || parseNum(r[colHariIdx]) > 0);
            let matchSearch = outName.toLowerCase().includes(searchOutletQuery);

            return matchDse && matchHari && matchSearch;
        });

        if (filteredRows.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b; font-size:12px;">Tidak ada outlet ditemukan.</div>`;
            return;
        }

        let html = "";
        filteredRows.slice(0, 100).forEach((r, idx) => {
            const outName = r[1] || "-";
            const kecamatan = r[3] || "Bengkayang";

            let valStr = "";
            let pctBadge = "";

            if (currentSelectedIndicator === "OSA") {
                const targetOsa = parseNum(r[11]);
                const achOsa = parseNum(r[12]);
                const pctOsa = targetOsa > 0 ? (achOsa / targetOsa) * 100 : 0;
                valStr = `Rp ${Math.round(achOsa).toLocaleString('id-ID')}`;
                
                let badgeClass = pctOsa >= 100 ? "mbx-bg-green" : (pctOsa >= 80 ? "mbx-bg-yellow" : "mbx-bg-red");
                pctBadge = `<span class="mbx-badge-pct ${badgeClass}">${pctOsa.toFixed(0)}%</span>`;
            } else if (currentSelectedIndicator === "SELL_IN") {
                const targetSp = parseNum(r[7]);
                const achSp = parseNum(r[8]);
                const pctSp = targetSp > 0 ? (achSp / targetSp) * 100 : 0;
                valStr = `${achSp} pcs`;

                let badgeClass = pctSp >= 100 ? "mbx-bg-green" : (pctSp >= 50 ? "mbx-bg-yellow" : "mbx-bg-red");
                pctBadge = `<span class="mbx-badge-pct ${badgeClass}">${pctSp.toFixed(0)}%</span>`;
            } else if (currentSelectedIndicator === "BIO") {
                const achBio = parseNum(r[18]);
                valStr = `${achBio} Bio`;
                pctBadge = `<span class="mbx-badge-pct ${achBio >= 1 ? 'mbx-bg-green' : 'mbx-bg-red'}">${achBio >= 1 ? '100%' : '0%'}</span>`;
            } else if (currentSelectedIndicator === "TAGGING") {
                const tagSp = parseNum(r[15]);
                valStr = `${tagSp} pcs`;
                pctBadge = `<span class="mbx-badge-pct ${tagSp >= 3 ? 'mbx-bg-green' : 'mbx-bg-orange'}">${tagSp >= 3 ? '100%' : '0%'}</span>`;
            }

            html += `
                <div class="mbx-outlet-card-clean" onclick="mbxOpenOutletDetail(${idx})">
                    <div>
                        <b style="font-size:12.5px; color:#0f172a; display:block;">${outName}</b>
                        <span style="font-size:10px; color:#64748b;">${kecamatan}</span>
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

    /* TOGGLE FUNCTION */
    window.mbxToggleViewMode = function () {
        const nextMode = currentViewMode === "MOBILE" ? "DESKTOP" : "MOBILE";
        applyViewMode(nextMode);
        mbxToggleDrawer(false);
    };

    /* GLOBAL HELPER FUNCTIONS */
    window.mbxSwitchTab = function (tabName) {
        if (currentViewMode === "MOBILE") {
            document.querySelectorAll(".tab-content").forEach(el => el.style.setProperty("display", "none", "important"));
        }

        document.getElementById("mbxNavHome")?.classList.remove("mbx-active");
        document.getElementById("mbxNavOutlet")?.classList.remove("mbx-active");

        if (tabName === "HOME") {
            document.getElementById("mbxHomeView").style.display = "block";
            document.getElementById("mbxOutletView").style.display = "none";
            document.getElementById("mbxNavHome")?.classList.add("mbx-active");
            mbxCloseSubpage();
        } else if (tabName === "OUTLET") {
            document.getElementById("mbxHomeView").style.display = "none";
            document.getElementById("mbxOutletView").style.display = "block";
            document.getElementById("mbxNavOutlet")?.classList.add("mbx-active");
            renderMobileOutletList();
            mbxCloseSubpage();
        }
        mbxToggleDrawer(false);
    };

    window.mbxToggleDrawer = function (show) {
        const overlay = document.getElementById("mbxDrawerOverlay");
        if (overlay) {
            if (show) overlay.classList.add("mbx-show");
            else overlay.classList.remove("mbx-show");
        }
    };

    window.mbxSetIndicator = function (indicatorKey) {
        currentSelectedIndicator = indicatorKey;
        document.querySelectorAll(".mbx-chip-btn").forEach(c => c.classList.remove("mbx-active"));
        if (indicatorKey === "OSA") document.getElementById("mbxChipOsa")?.classList.add("mbx-active");
        if (indicatorKey === "SELL_IN") document.getElementById("mbxChipSellIn")?.classList.add("mbx-active");
        if (indicatorKey === "BIO") document.getElementById("mbxChipBio")?.classList.add("mbx-active");
        if (indicatorKey === "TAGGING") document.getElementById("mbxChipTagging")?.classList.add("mbx-active");

        renderMobileOutletList();
    };

    window.mbxOpenSubpage = function (pageType) {
        const subpage = document.getElementById("mbxSubpageScreen");
        const title = document.getElementById("mbxSubpageTitle");

        if (!subpage || !title) return;

        if (pageType === "SM") {
            title.innerText = "Site Monitoring";
            renderSiteMonitoringContent();
        } else if (pageType === "GAP") {
            title.innerText = "GAP Daily KPI";
            renderGapSubpageContent();
        } else if (pageType === "PP") {
            title.innerText = "Partner Performance";
            renderPartnerPerformanceContent();
        }

        subpage.classList.add("mbx-show");
        mbxToggleDrawer(false);
    };

    window.mbxCloseSubpage = function () {
        document.getElementById("mbxSubpageScreen")?.classList.remove("mbx-show");
    };

    window.mbxOpenOutletDetail = function (rowIndex) {
        if (!globalDataDO || !globalDataDO[rowIndex]) return;
        const r = globalDataDO[rowIndex];

        const subpage = document.getElementById("mbxSubpageScreen");
        const title = document.getElementById("mbxSubpageTitle");
        const container = document.getElementById("mbxSubpageContainer");

        title.innerText = "Detail Outlet";
        container.innerHTML = `
            <div style="background:#fff; padding:16px; border-radius:12px; border:1px solid #e2e8f0;">
                <b style="font-size:16px; color:#0f172a;">${r[1] || '-'}</b>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">ID: ${r[0] || '-'} | DSE: ${r[2] || '-'}</div>

                <hr style="border:none; border-top:1px solid #f1f5f9; margin:14px 0;">

                <div style="margin-bottom:12px;">
                    <span style="font-size:11px; color:#64748b; font-weight:700;">OSA PERFORMANCE</span>
                    <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:800; margin-top:2px;">
                        <span>Target: Rp ${Math.round(parseNum(r[11])).toLocaleString('id-ID')}</span>
                        <span style="color:#10b981;">Ach: Rp ${Math.round(parseNum(r[12])).toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <span style="font-size:11px; color:#64748b; font-weight:700;">SELL IN PERFORMANCE</span>
                    <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:800; margin-top:2px;">
                        <span>Target: ${parseNum(r[7])} pcs</span>
                        <span style="color:#0284c7;">Ach: ${parseNum(r[8])} pcs</span>
                    </div>
                </div>

                <div>
                    <span style="font-size:11px; color:#64748b; font-weight:700;">BIOMETRIK & TAGGING</span>
                    <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:800; margin-top:2px;">
                        <span>Biometrik: ${parseNum(r[18])}</span>
                        <span>Tagging: ${parseNum(r[15])} pcs</span>
                    </div>
                </div>
            </div>
        `;

        subpage.classList.add("mbx-show");
    };
})();