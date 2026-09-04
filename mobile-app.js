/* ==========================================================================
   MOBILE APP ADD-ON MODULE (MC BENGKAYANG WORKPLACE APP)
   Reads existing global data: globalDataDO, globalDataMS, globalDataSM
   ========================================================================== */

(function () {
    "use strict";

    let currentSelectedHari = "ALL";
    let currentSelectedIndicator = "OSA"; // Default filter indikator
    let searchOutletQuery = "";
    let currentSortOrder = "GAP_WORST";

    document.addEventListener("DOMContentLoaded", () => {
        // Inisialisasi komponen UI Mobile jika layar <= 768px
        if (window.innerWidth <= 768) {
            initMobileComponents();
        }

        // Pantau event resize layar
        window.addEventListener("resize", () => {
            if (window.innerWidth <= 768 && !document.getElementById("mbxAppHeader")) {
                initMobileComponents();
            }
        });
    });

    function initMobileComponents() {
        injectMobileUIElements();
        setupMobileEventListeners();

        // Tautkan dengan data global existing setelah siap
        let syncDataInterval = setInterval(() => {
            if (typeof globalDataDO !== "undefined" && Array.isArray(globalDataDO) && globalDataDO.length > 0) {
                renderMobileHomeData();
                renderMobileOutletList();
                clearInterval(syncDataInterval);
            }
        }, 300);
    }

    function injectMobileUIElements() {
        if (document.getElementById("mbxAppHeader")) return;

        // 1. Mobile Header
        const headerHtml = `
            <div class="mbx-app-header" id="mbxAppHeader">
                <div class="mbx-header-brand">
                    <button class="mbx-btn-icon" id="mbxBtnDrawer"><i class="fa-solid fa-bars"></i></button>
                    <div>
                        <div class="mbx-header-title">MC BENGKAYANG</div>
                        <div class="mbx-header-sub">Workplace App</div>
                    </div>
                </div>
                <button class="mbx-btn-icon" onclick="alert('Belum ada notifikasi baru')"><i class="fa-solid fa-bell"></i></button>
            </div>
        `;

        // 2. Mobile Drawer Menu Overlay
        const drawerHtml = `
            <div class="mbx-drawer-overlay" id="mbxDrawerOverlay">
                <div class="mbx-drawer-content">
                    <div class="mbx-drawer-header">
                        <b style="color:#0f172a; font-size:14px;"><i class="fa-solid fa-mobile-screen color-red"></i> Workplace Menu</b>
                        <button class="mbx-btn-icon" id="mbxBtnCloseDrawer" style="color:#64748b;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="mbx-drawer-menu-item mbx-active" onclick="mbxSwitchTab('HOME')"><i class="fa-solid fa-house"></i> Home</div>
                    <div class="mbx-drawer-menu-item" onclick="mbxSwitchTab('OUTLET')"><i class="fa-solid fa-store"></i> Detail Outlet</div>
                    <div class="mbx-drawer-menu-item" onclick="mbxSwitchTab('DESKTOP_VIEW')"><i class="fa-solid fa-desktop"></i> Mode Desktop Full</div>
                </div>
            </div>
        `;

        // 3. Mobile Bottom Navigation
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
                <button class="mbx-nav-item" id="mbxNavMenu" onclick="mbxToggleDrawer(true)">
                    <i class="fa-solid fa-bars"></i>
                    <span>Menu</span>
                </button>
            </div>
        `;

        // 4. Modal Detail Outlet Full
        const modalDetailHtml = `
            <div class="mbx-modal-full" id="mbxModalOutletDetail">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
                    <button class="mbx-btn-icon" onclick="mbxCloseOutletModal()" style="color:#0f172a;"><i class="fa-solid fa-arrow-left"></i> Kembali</button>
                    <b style="font-size:14px; color:#0f172a;">DETAIL OUTLET</b>
                    <div style="width:24px;"></div>
                </div>
                <div id="mbxOutletDetailContent"></div>
            </div>
        `;

        document.body.insertAdjacentHTML("afterbegin", headerHtml);
        document.body.insertAdjacentHTML("beforeend", drawerHtml);
        document.body.insertAdjacentHTML("beforeend", bottomNavHtml);
        document.body.insertAdjacentHTML("beforeend", modalDetailHtml);

        injectMobileViewsContainers();
    }

    function injectMobileViewsContainers() {
        const container = document.querySelector(".container");
        if (!container) return;

        // Container Mobile Home View
        const homeViewHtml = `
            <div id="mbxHomeView" style="display:block;">
                <div class="mbx-home-welcome">
                    <div style="font-size:11px; color:#f59e0b; font-weight:800;">SELAMAT DATANG</div>
                    <div style="font-size:16px; font-weight:900; margin-top:2px;" id="mbxActiveUserTitle">User Dashboard</div>
                    <div style="font-size:10px; color:#cbd5e1; margin-top:4px;" id="mbxHomeDateStr">-</div>
                </div>

                <div style="font-size:12px; font-weight:800; color:#0f172a; margin: 12px 0 8px 0;">PERFORMANCE HARI INI</div>
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-bottom:16px;">
                    <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #e11d48; padding:10px; border-radius:10px;">
                        <span style="font-size:10px; color:#64748b; font-weight:700;">REVENUE MTD</span>
                        <div style="font-size:13px; font-weight:900; color:#0f172a; margin-top:2px;" id="mbxHomeRev">Rp 0</div>
                    </div>
                    <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #10b981; padding:10px; border-radius:10px;">
                        <span style="font-size:10px; color:#64748b; font-weight:700;">OSA %</span>
                        <div style="font-size:13px; font-weight:900; color:#0f172a; margin-top:2px;" id="mbxHomeOsa">0.0%</div>
                    </div>
                    <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #06b6d4; padding:10px; border-radius:10px;">
                        <span style="font-size:10px; color:#64748b; font-weight:700;">SELL IN %</span>
                        <div style="font-size:13px; font-weight:900; color:#0f172a; margin-top:2px;" id="mbxHomeSellIn">0.0%</div>
                    </div>
                    <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #8b5cf6; padding:10px; border-radius:10px;">
                        <span style="font-size:10px; color:#64748b; font-weight:700;">BIOMETRIK %</span>
                        <div style="font-size:13px; font-weight:900; color:#0f172a; margin-top:2px;" id="mbxHomeBio">0.0%</div>
                    </div>
                </div>

                <div class="mbx-quick-grid">
                    <div class="mbx-quick-card" onclick="mbxSwitchTab('OUTLET')">
                        <i class="fa-solid fa-store" style="color:#e11d48;"></i>
                        <span>Detail Outlet</span>
                    </div>
                    <div class="mbx-quick-card" onclick="alert('Membuka Today Instruction');">
                        <i class="fa-solid fa-clipboard-list" style="color:#f59e0b;"></i>
                        <span>Instruction</span>
                    </div>
                </div>
            </div>
        `;

        // Container Mobile Outlet View
        const outletViewHtml = `
            <div id="mbxOutletView" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin:12px 0 8px 0;">
                    <b style="font-size:14px; color:#0f172a;">MONITORING OUTLET</b>
                    <select id="mbxHariFilter" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; font-size:11px; font-weight:800; background:#fff;">
                        <option value="ALL">Semua Hari PJP</option>
                        <option value="SENIN">Senin</option>
                        <option value="SELASA">Selasa</option>
                        <option value="RABU">Rabu</option>
                        <option value="KAMIS">Kamis</option>
                        <option value="JUMAT">Jumat</option>
                        <option value="SABTU">Sabtu</option>
                    </select>
                </div>

                <!-- Horizontal Chips Filter Indikator -->
                <div class="mbx-outlet-filter-scroll">
                    <div class="mbx-chip mbx-active" id="mbxChipOsa" onclick="mbxSetIndicator('OSA')">OSA</div>
                    <div class="mbx-chip" id="mbxChipSellIn" onclick="mbxSetIndicator('SELL_IN')">SELL IN</div>
                    <div class="mbx-chip" id="mbxChipTagging" onclick="mbxSetIndicator('TAGGING')">TAGGING</div>
                    <div class="mbx-chip" id="mbxChipBio" onclick="mbxSetIndicator('BIO')">BIOMETRIK</div>
                </div>

                <div style="margin-bottom:12px;">
                    <input type="text" id="mbxSearchOutlet" placeholder="🔍 Cari nama outlet..." style="width:100%; padding:10px; border-radius:10px; border:1px solid #cbd5e1; font-size:12px; box-sizing:border-box;">
                </div>

                <div id="mbxOutletCardList"></div>
            </div>
        `;

        container.insertAdjacentHTML("afterbegin", homeViewHtml);
        container.insertAdjacentHTML("afterbegin", outletViewHtml);
    }

    function setupMobileEventListeners() {
        document.getElementById("mbxBtnDrawer")?.addEventListener("click", () => mbxToggleDrawer(true));
        document.getElementById("mbxBtnCloseDrawer")?.addEventListener("click", () => mbxToggleDrawer(false));
        document.getElementById("mbxDrawerOverlay")?.addEventListener("click", (e) => {
            if (e.target.id === "mbxDrawerOverlay") mbxToggleDrawer(false);
        });

        document.getElementById("mbxHariFilter")?.addEventListener("change", (e) => {
            currentSelectedHari = e.target.value.toUpperCase();
            renderMobileOutletList();
        });

        document.getElementById("mbxSearchOutlet")?.addEventListener("input", (e) => {
            searchOutletQuery = e.target.value.toLowerCase().trim();
            renderMobileOutletList();
        });
    }

    /* ==========================================================================
       RENDER LOGIC (Membaca data existing dari globalDataDO & globalDataMS)
       ========================================================================== */

    function renderMobileHomeData() {
        const userDisplay = document.getElementById("activeUserNameDisplay");
        if (userDisplay && document.getElementById("mbxActiveUserTitle")) {
            document.getElementById("mbxActiveUserTitle").innerText = userDisplay.innerText;
        }

        const revElem = document.getElementById("exKpiRev");
        const osaElem = document.getElementById("exKpiOsa");
        const sellInElem = document.getElementById("exKpiSellIn");
        const bioElem = document.getElementById("exKpiBio");

        if (revElem && document.getElementById("mbxHomeRev")) document.getElementById("mbxHomeRev").innerText = revElem.innerText;
        if (osaElem && document.getElementById("mbxHomeOsa")) document.getElementById("mbxHomeOsa").innerText = osaElem.innerText;
        if (sellInElem && document.getElementById("mbxHomeSellIn")) document.getElementById("mbxHomeSellIn").innerText = sellInElem.innerText;
        if (bioElem && document.getElementById("mbxHomeBio")) document.getElementById("mbxHomeBio").innerText = bioElem.innerText;
    }

    function renderMobileOutletList() {
        const listContainer = document.getElementById("mbxOutletCardList");
        if (!listContainer || typeof globalDataDO === "undefined" || !globalDataDO) return;

        const hariIndexMap = { 'SENIN': 20, 'SELASA': 21, 'RABU': 22, 'KAMIS': 23, 'JUMAT': 24, 'SABTU': 25 };
        let colHariIdx = hariIndexMap[currentSelectedHari] !== undefined ? hariIndexMap[currentSelectedHari] : -1;

        let filteredRows = globalDataDO.filter(r => {
            let outName = String(r[1] || "").trim();
            if (!outName || outName.toUpperCase() === "OUTLET NAME") return false;

            let matchHari = (colHariIdx === -1 || parseNum(r[colHariIdx]) > 0);
            let matchSearch = outName.toLowerCase().includes(searchOutletQuery);

            return matchHari && matchSearch;
        });

        if (filteredRows.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b; font-size:12px;">Tidak ada outlet untuk filter ini.</div>`;
            return;
        }

        let html = "";
        filteredRows.slice(0, 100).forEach((r, idx) => {
            const outId = r[0] || "-";
            const outName = r[1] || "-";
            const dseCode = r[2] || "-";

            let cardContent = "";

            if (currentSelectedIndicator === "OSA") {
                const targetOsa = parseNum(r[11]);
                const achOsa = parseNum(r[12]);
                const gapOsa = achOsa - targetOsa;
                const pctOsa = targetOsa > 0 ? (achOsa / targetOsa) * 100 : 0;

                cardContent = `
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Target OSA:</span><span class="mbx-metric-val">Rp ${Math.round(targetOsa).toLocaleString('id-ID')}</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Ach OSA:</span><span class="mbx-metric-val">Rp ${Math.round(achOsa).toLocaleString('id-ID')}</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">GAP OSA:</span><span class="mbx-metric-val" style="color:${gapOsa < 0 ? '#e11d48' : '#10b981'};">Rp ${Math.round(gapOsa).toLocaleString('id-ID')}</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">% Achievement:</span><span class="mbx-metric-val" style="color:${pctOsa < 100 ? '#e11d48' : '#10b981'};">${pctOsa.toFixed(1)}%</span></div>
                `;
            } else if (currentSelectedIndicator === "SELL_IN") {
                const targetSp = parseNum(r[7]);
                const achSp = parseNum(r[8]);
                const gapSp = achSp - targetSp;
                const pctSp = targetSp > 0 ? (achSp / targetSp) * 100 : 0;

                cardContent = `
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Target Sell In:</span><span class="mbx-metric-val">${targetSp} pcs</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Ach Sell In:</span><span class="mbx-metric-val">${achSp} pcs</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">GAP Sell In:</span><span class="mbx-metric-val" style="color:${gapSp < 0 ? '#e11d48' : '#10b981'};">${gapSp} pcs</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">% Achievement:</span><span class="mbx-metric-val" style="color:${pctSp < 100 ? '#e11d48' : '#10b981'};">${pctSp.toFixed(1)}%</span></div>
                `;
            } else if (currentSelectedIndicator === "TAGGING") {
                const tagSp = parseNum(r[15]);
                const tag3Pcs = parseNum(r[16]);
                const isPass = tagSp >= 3 || tag3Pcs >= 1;

                cardContent = `
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Target Tagging:</span><span class="mbx-metric-val">>= 3 pcs</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Ach SP Tagging:</span><span class="mbx-metric-val">${tagSp} pcs</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Status Tagging:</span><span class="mbx-metric-val" style="color:${isPass ? '#10b981' : '#e11d48'};">${isPass ? '✅ PASS' : '⚠️ BELUM TAGGING'}</span></div>
                `;
            } else if (currentSelectedIndicator === "BIO") {
                const targetBio = parseNum(r[17]);
                const achBio = parseNum(r[18]);
                const isPass = achBio >= 1;

                cardContent = `
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Target Biometrik:</span><span class="mbx-metric-val">${targetBio}</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Ach Biometrik MTD:</span><span class="mbx-metric-val">${achBio}</span></div>
                    <div class="mbx-metric-row"><span class="mbx-metric-lbl">Status Biometrik:</span><span class="mbx-metric-val" style="color:${isPass ? '#10b981' : '#e11d48'};">${isPass ? '✅ PASS' : '⚠️ BELUM BIO'}</span></div>
                `;
            }

            html += `
                <div class="mbx-outlet-card-item" onclick="mbxOpenOutletDetail(${idx})">
                    <div class="mbx-outlet-card-head">
                        <div>
                            <div class="mbx-outlet-name">${outName}</div>
                            <div class="mbx-outlet-sub">ID: ${outId} | DSE: ${dseCode}</div>
                        </div>
                        <i class="fa-solid fa-chevron-right" style="color:#cbd5e1; font-size:12px;"></i>
                    </div>
                    ${cardContent}
                </div>
            `;
        });

        listContainer.innerHTML = html;
    }

    /* Global Helper Window Functions */
    window.mbxSwitchTab = function (tabName) {
        document.getElementById("mbxNavHome")?.classList.remove("mbx-active");
        document.getElementById("mbxNavOutlet")?.classList.remove("mbx-active");

        if (tabName === "HOME") {
            document.getElementById("mbxHomeView").style.display = "block";
            document.getElementById("mbxOutletView").style.display = "none";
            document.getElementById("mbxNavHome")?.classList.add("mbx-active");
        } else if (tabName === "OUTLET") {
            document.getElementById("mbxHomeView").style.display = "none";
            document.getElementById("mbxOutletView").style.display = "block";
            document.getElementById("mbxNavOutlet")?.classList.add("mbx-active");
            renderMobileOutletList();
        } else if (tabName === "DESKTOP_VIEW") {
            document.querySelector(".container > .header").style.display = "block";
            document.querySelector(".top-nav-bar").style.display = "flex";
            alert("Memuat Mode Tampilan Desktop Full.");
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
        document.querySelectorAll(".mbx-chip").forEach(c => c.classList.remove("mbx-active"));
        if (indicatorKey === "OSA") document.getElementById("mbxChipOsa")?.classList.add("mbx-active");
        if (indicatorKey === "SELL_IN") document.getElementById("mbxChipSellIn")?.classList.add("mbx-active");
        if (indicatorKey === "TAGGING") document.getElementById("mbxChipTagging")?.classList.add("mbx-active");
        if (indicatorKey === "BIO") document.getElementById("mbxChipBio")?.classList.add("mbx-active");

        renderMobileOutletList();
    };

    window.mbxOpenOutletDetail = function (rowIndex) {
        const modal = document.getElementById("mbxModalOutletDetail");
        const content = document.getElementById("mbxOutletDetailContent");
        if (!modal || !content || !globalDataDO || !globalDataDO[rowIndex]) return;

        const r = globalDataDO[rowIndex];
        content.innerHTML = `
            <div style="background:#f8fafc; padding:12px; border-radius:10px; margin-bottom:16px;">
                <b style="font-size:15px; color:#0f172a;">${r[1] || '-'}</b>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">ID: ${r[0] || '-'} | DSE: ${r[2] || '-'}</div>
            </div>

            <div style="font-size:12px; font-weight:800; color:#e11d48; margin-bottom:6px;">OSA PERFORMANCE</div>
            <div class="mbx-metric-row"><span class="mbx-metric-lbl">Target:</span><span class="mbx-metric-val">Rp ${Math.round(parseNum(r[11])).toLocaleString('id-ID')}</span></div>
            <div class="mbx-metric-row"><span class="mbx-metric-lbl">Achievement:</span><span class="mbx-metric-val">Rp ${Math.round(parseNum(r[12])).toLocaleString('id-ID')}</span></div>

            <hr style="border:none; border-top:1px solid #e2e8f0; margin:12px 0;">

            <div style="font-size:12px; font-weight:800; color:#06b6d4; margin-bottom:6px;">SP SELL IN PERFORMANCE</div>
            <div class="mbx-metric-row"><span class="mbx-metric-lbl">Target:</span><span class="mbx-metric-val">${parseNum(r[7])} pcs</span></div>
            <div class="mbx-metric-row"><span class="mbx-metric-lbl">Achievement:</span><span class="mbx-metric-val">${parseNum(r[8])} pcs</span></div>

            <hr style="border:none; border-top:1px solid #e2e8f0; margin:12px 0;">

            <div style="font-size:12px; font-weight:800; color:#8b5cf6; margin-bottom:6px;">BIOMETRIK & TAGGING</div>
            <div class="mbx-metric-row"><span class="mbx-metric-lbl">Ach Biometrik MTD:</span><span class="mbx-metric-val">${parseNum(r[18])}</span></div>
            <div class="mbx-metric-row"><span class="mbx-metric-lbl">Ach Tagging:</span><span class="mbx-metric-val">${parseNum(r[15])} pcs</span></div>
        `;

        modal.classList.add("mbx-show");
    };

    window.mbxCloseOutletModal = function () {
        document.getElementById("mbxModalOutletDetail")?.classList.remove("mbx-show");
    };
})();