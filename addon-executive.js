/* ==========================================================================
   ADD-ON MODULE: TODAY INSTRUCTION, HISTORY LOG & DROPDOWN FIX
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    injectGlobalCleanCSS();
    setupTiEventListeners();
    initHistoryLogUI();
    bindExportExcelButton();

    let syncInterval = setInterval(() => {
        if (typeof globalDataDO !== "undefined" && Array.isArray(globalDataDO) && globalDataDO.length > 0) {
            populateTiDseDropdown();
            renderTodayInstructionAddon();
            clearInterval(syncInterval);
        }
    }, 300);

    // Tata letak dipasang sekali saja setelah halaman siap agar tidak mengganggu dropdown yang terbuka
    setTimeout(() => {
        hideGapTotalTexts();
        lockPeriodFilterNextToSnapshot();
    }, 800);
});

function injectGlobalCleanCSS() {
    if (document.getElementById("addonCleanStyle")) return;
    const style = document.createElement("style");
    style.id = "addonCleanStyle";
    style.innerHTML = `
        .exec-select {
            position: relative !important;
            z-index: 100 !important;
            pointer-events: auto !important;
            cursor: pointer !important;
        }
        .header-right-group {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin-left: auto !important;
            position: relative !important;
            z-index: 100 !important;
        }
    `;
    document.head.appendChild(style);
}

function hideGapTotalTexts() {
    const allDivs = document.querySelectorAll("div, span, p, small");
    allDivs.forEach(el => {
        if (el.children.length === 0 && el.textContent.includes("GAP Total:")) {
            el.style.setProperty("display", "none", "important");
        }
    });
}

function setupTiEventListeners() {
    const dseSelect = document.getElementById("tiDseFilter");
    const hariSelect = document.getElementById("tiHariFilter");

    if (dseSelect) dseSelect.onchange = () => renderTodayInstructionAddon();
    if (hariSelect) hariSelect.onchange = () => renderTodayInstructionAddon();

    const btnTab = document.getElementById("navTabTodayInstruction");
    if (btnTab) {
        btnTab.addEventListener("click", () => {
            setTimeout(() => {
                populateTiDseDropdown();
                renderTodayInstructionAddon();
            }, 100);
        });
    }
}

/* ==========================================================================
   1. TODAY INSTRUCTION MODULE
   ========================================================================== */

function populateTiDseDropdown() {
    const dseSelect = document.getElementById("tiDseFilter");
    if (!dseSelect || typeof globalDataDO === "undefined" || !globalDataDO || globalDataDO.length === 0) return;

    const dseSet = new Set();
    globalDataDO.forEach(r => {
        let dse = String(r[2] || "").trim();
        if (dse && dse.toUpperCase() !== "NAN" && dse.toUpperCase() !== "DSE CODE" && !dse.toUpperCase().includes("HEADER")) {
            dseSet.add(dse);
        }
    });

    const sortedDse = Array.from(dseSet).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));

    let currentVal = dseSelect.value;
    let options = '<option value="ALL">Semua DSE Code</option>';
    sortedDse.forEach(dse => {
        options += `<option value="${dse}">${dse}</option>`;
    });
    dseSelect.innerHTML = options;

    if (currentVal && dseSet.has(currentVal)) {
        dseSelect.value = currentVal;
    }
}

function renderTodayInstructionAddon() {
    const container = document.getElementById("tiDseCardsContainer");
    if (!container) return;

    if (typeof globalDataDO === "undefined" || !globalDataDO || globalDataDO.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#ef4444; font-weight:800;">
                ⚠️ Data Detail Outlet sedang dimuat dari file Excel...
            </div>`;
        return;
    }

    const dseSelect = document.getElementById("tiDseFilter");
    if (dseSelect && dseSelect.options.length <= 1) {
        populateTiDseDropdown();
    }

    const selectedDse = dseSelect ? dseSelect.value : "ALL";
    const selectedHari = document.getElementById("tiHariFilter") ? document.getElementById("tiHariFilter").value.toUpperCase() : "ALL";

    const hariIndexMap = {
        'SENIN': 20, 'SELASA': 21, 'RABU': 22, 'KAMIS': 23, 'JUMAT': 24, 'SABTU': 25
    };

    let colHariIdx = hariIndexMap[selectedHari] !== undefined ? hariIndexMap[selectedHari] : -1;

    let filteredRows = globalDataDO.filter(r => {
        let dseVal = String(r[2] || "").trim();
        if (!dseVal || dseVal.toUpperCase() === "DSE CODE" || dseVal.toUpperCase() === "NAN") return false;

        const dseMatch = (selectedDse === "ALL") || (dseVal === selectedDse);
        const hariMatch = (colHariIdx === -1 || parseNum(r[colHariIdx]) > 0);

        return dseMatch && hariMatch;
    });

    const dseGroups = {};
    filteredRows.forEach(r => {
        let dse = String(r[2] || "DSE UNKNOWN").trim();
        if (!dseGroups[dse]) dseGroups[dse] = [];
        dseGroups[dse].push(r);
    });

    let html = "";
    const dseKeys = Object.keys(dseGroups).sort();

    if (dseKeys.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px; color:#64748b; font-weight:700;">Tidak ada data outlet untuk kombinasi DSE <b>${selectedDse}</b> dan Hari <b>${selectedHari}</b>.</div>`;
        return;
    }

    dseKeys.forEach((dseName, idx) => {
        const outlets = dseGroups[dseName];
        
        const criticalOutlets = outlets.filter(r => {
            const sellIn = parseNum(r[8]);
            const osa = parseNum(r[12]);
            const tagSp = parseNum(r[15]);
            const tag3Pcs = parseNum(r[16]);
            const bio = parseNum(r[18]);

            return bio < 1 || (tagSp < 3 && tag3Pcs < 1) || osa < 300000 || sellIn < 3;
        });

        const sectionId = `tiDseCard_${idx}`;

        html += `
            <div class="exec-card-panel border-top-red" id="${sectionId}" style="margin-bottom: 20px; background: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; border-top: 4px solid #e11d48;">
                <div class="exec-panel-header-flex" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
                    <div>
                        <span style="font-size:15px; font-weight:900; color:#0f172a;"><i class="fa-solid fa-user-gear" style="color:#e11d48;"></i> DSE: ${dseName}</span>
                        <div style="font-size:11px; color:#64748b; margin-top:2px;">Total PJP: <b>${outlets.length} Outlet</b> | Kritis: <b style="color:#e11d48;">${criticalOutlets.length} Outlet</b></div>
                    </div>
                    <button class="btn-snapshot-section" onclick="takeSectionSnapshot('${sectionId}')" style="background:#f59e0b; color:#0f172a; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;"><i class="fa-solid fa-camera"></i> Snapshot ${dseName}</button>
                </div>

                <div class="mini-table-wrapper">
                    ${criticalOutlets.length === 0 ? `
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-left:5px solid #16a34a; border-radius:10px; padding:12px; color:#15803d; font-size:12px; font-weight:800;">
                            ✅ PJP DSE Ini Aman: Seluruh outlet PJP sudah memenuhi target Biometrik, Tagging >=3, OSA, dan SP Sell In.
                        </div>
                    ` : `
                        <table class="mini-exec-table" style="width:100%; border-collapse:collapse; font-size:11.5px;">
                            <thead>
                                <tr style="background:#1e293b; color:#fff;">
                                    <th style="padding:8px; text-align:left;">ID Outlet</th>
                                    <th style="padding:8px; text-align:left;">Nama Outlet</th>
                                    <th style="padding:8px;">Sell In SP</th>
                                    <th style="padding:8px;">OSA Rp</th>
                                    <th style="padding:8px;">Biometrik</th>
                                    <th style="padding:8px;">Tagging</th>
                                    <th style="padding:8px; background:#e11d48; color:#fff; text-align:left;">Instruksi Kritis</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${criticalOutlets.map(r => {
                                    const idOut = r[0] || '-';
                                    const nameOut = r[1] || '-';
                                    const sellIn = parseNum(r[8]);
                                    const osa = parseNum(r[12]);
                                    const tagSp = parseNum(r[15]);
                                    const tag3Pcs = parseNum(r[16]);
                                    const bio = parseNum(r[18]);

                                    let notes = [];
                                    if (bio < 1) notes.push("⚠️ Belum Bio");
                                    if (tagSp < 3 && tag3Pcs < 1) notes.push("⚠️ Tagging < 3 Pcs");
                                    if (osa < 300000) notes.push("⚠️ OSA < 300rb");
                                    if (sellIn < 3) notes.push("⚠️ SP Sell in < 3 Pcs");

                                    return `
                                        <tr style="border-bottom:1px solid #e2e8f0; text-align:center;">
                                            <td style="padding:8px; text-align:left; font-weight:700;">${idOut}</td>
                                            <td style="padding:8px; text-align:left; font-weight:700; color:#0f172a;">${nameOut}</td>
                                            <td style="padding:8px;"><b style="color:${sellIn < 3 ? '#e11d48' : '#10b981'};">${sellIn} pcs</b></td>
                                            <td style="padding:8px;"><b style="color:${osa < 300000 ? '#e11d48' : '#10b981'};">Rp ${Math.round(osa).toLocaleString('id-ID')}</b></td>
                                            <td style="padding:8px;"><b style="color:${bio < 1 ? '#e11d48' : '#10b981'};">${bio}</b></td>
                                            <td style="padding:8px;"><b style="color:${(tagSp < 3 && tag3Pcs < 1) ? '#e11d48' : '#10b981'};">${tagSp} pcs</b></td>
                                            <td style="padding:8px; text-align:left; font-weight:800; color:#b91c1c; background:#fff1f2;">${notes.join(', ')}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ==========================================================================
   2. AUTOMATIC EXPORT EXCEL FUNCTION
   ========================================================================== */

function bindExportExcelButton() {
    const exportBtns = document.querySelectorAll("button[onclick*='Export']:not(#btnOpenHistoryLog), .btn-export, #btnExportExcel");
    exportBtns.forEach(btn => {
        if (btn.id === "btnOpenHistoryLog") return;
        btn.onclick = (e) => {
            e.preventDefault();
            executeDashboardExcelExport();
        };
    });
}

function executeDashboardExcelExport() {
    if (typeof XLSX === "undefined") {
        alert("⚠️ Library XLSX belum siap. Silakan refresh halaman dan coba lagi.");
        return;
    }

    let activeTable = document.querySelector(".report-content:not([style*='display: none']) table") || document.querySelector("table");

    if (!activeTable) {
        alert("⚠️ Tidak ada data tabel yang dapat diekspor di tab ini.");
        return;
    }

    let wb = XLSX.utils.table_to_book(activeTable, { sheet: "Export Data" });
    let dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Export_Dashboard_Bengkayang_${dateStr}.xlsx`);
}

/* ==========================================================================
   3. STABLE HEADER RELOCATION
   ========================================================================== */

function lockPeriodFilterNextToSnapshot() {
    const tabConfigs = [
        { tabId: "ms-bengkayang", filterId: "pstHistoryPeriodFilter" },
        { tabId: "outlet-mc", filterId: "smHistoryPeriodFilter" },
        { tabId: "detail-outlet", filterId: "doHistoryPeriodFilter" },
        { tabId: "daily-dse", filterId: "dailyHistoryPeriodFilter" }
    ];

    tabConfigs.forEach(cfg => {
        const filterWrap = document.getElementById(cfg.filterId + "_wrap") || document.getElementById(cfg.filterId);
        const tabElem = document.getElementById(cfg.tabId);
        if (!filterWrap || !tabElem) return;

        const snapBtn = tabElem.querySelector("button[onclick*='Snapshot']") || tabElem.querySelector("button[onclick*='snapshot']");
        if (!snapBtn) return;

        let rightGroup = snapBtn.parentElement.querySelector(".header-right-group");
        if (!rightGroup) {
            rightGroup = document.createElement("div");
            rightGroup.className = "header-right-group";
            snapBtn.parentElement.insertBefore(rightGroup, snapBtn);
            rightGroup.appendChild(snapBtn);
        }

        if (filterWrap.parentElement !== rightGroup) {
            rightGroup.insertBefore(filterWrap, snapBtn);
        }
    });
}

function initHistoryLogUI() {
    const exportBtn = document.querySelector("button[onclick*='Export']:not(#btnOpenHistoryLog)") || document.querySelector(".btn-export") || document.getElementById("btnExportExcel");
    if (exportBtn && exportBtn.parentElement && !document.getElementById("btnOpenHistoryLog")) {
        const btnLog = document.createElement("button");
        btnLog.id = "btnOpenHistoryLog";
        btnLog.className = exportBtn.className || "btn-action";
        btnLog.style.cssText = "background:#0f172a; color:#ffffff; font-weight:800; padding:6px 12px; font-size:12px; border-radius:8px; border:none; cursor:pointer; margin-left:8px; position:relative; z-index:100;";
        btnLog.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Log History`;
        btnLog.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openHistoryLogModal();
        };
        
        exportBtn.parentElement.insertBefore(btnLog, exportBtn.nextSibling);
    }

    injectPeriodFilterToTab("ms-bengkayang", "pstHistoryPeriodFilter");
    injectPeriodFilterToTab("outlet-mc", "smHistoryPeriodFilter");
    injectPeriodFilterToTab("detail-outlet", "doHistoryPeriodFilter");
    injectPeriodFilterToTab("daily-dse", "dailyHistoryPeriodFilter");

    createHistoryLogModalDOM();
    updateTabHistoryDropdowns();
}

function injectPeriodFilterToTab(tabId, selectId) {
    const tabElem = document.getElementById(tabId);
    if (!tabElem) return;

    if (!document.getElementById(selectId)) {
        const wrap = document.createElement("div");
        wrap.id = selectId + "_wrap";
        wrap.style.cssText = "display:inline-flex; align-items:center; font-size:12px; font-weight:800; position:relative; z-index:100;";
        wrap.innerHTML = `
            <label style="color:#0f172a; margin-right:4px; white-space:nowrap;"><i class="fa-solid fa-calendar-days color-red"></i> Periode Update:</label>
            <select id="${selectId}" class="exec-select" style="padding:6px 10px; font-weight:800; border-radius:8px; border:1px solid #cbd5e1; cursor:pointer;" onchange="handlePeriodFilterChange('${tabId}', this.value)">
                <option value="LIVE">Live Data Terbaru</option>
            </select>
        `;

        const snapBtn = tabElem.querySelector("button[onclick*='Snapshot']") || tabElem.querySelector("button[onclick*='snapshot']");
        if (snapBtn && snapBtn.parentElement) {
            snapBtn.parentElement.insertBefore(wrap, snapBtn);
        }
    }
}

function createHistoryLogModalDOM() {
    if (document.getElementById("historyLogModalOverlay")) return;

    const todayStr = new Date().toISOString().slice(0, 10).split('-').reverse().join('-');

    const modalHtml = `
        <div id="historyLogModalOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); z-index:99999; justify-content:center; align-items:center;">
            <div style="background:#ffffff; width:90%; max-width:600px; border-radius:16px; padding:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); position:relative; z-index:100000;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
                    <h3 style="margin:0; font-weight:900; color:#0f172a;"><i class="fa-solid fa-file-pen color-red"></i> Catatan Log Update File</h3>
                    <button onclick="closeHistoryLogModal()" style="border:none; background:none; font-size:20px; cursor:pointer; color:#64748b;">&times;</button>
                </div>

                <div style="font-size:12px; color:#475569; margin-bottom:16px;">
                    Masukkan tanggal update sesuai format (Contoh: <b>03-09-2026</b>) untuk simpan ke daftar Periode Update.
                </div>

                <div style="background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:16px;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:12px; font-weight:800;">
                        <div>
                            <input type="checkbox" id="chkPstUpdate" checked>
                            <label for="chkPstUpdate">PST (MS Bengkayang)</label>
                            <input type="text" id="datePstUpdate" value="${todayStr}" placeholder="03-09-2026" style="width:100%; margin-top:4px; padding:6px; border-radius:6px; border:1px solid #cbd5e1; font-weight:700;">
                        </div>
                        <div>
                            <input type="checkbox" id="chkSmUpdate" checked>
                            <label for="chkSmUpdate">Site Monitoring</label>
                            <input type="text" id="dateSmUpdate" value="${todayStr}" placeholder="03-09-2026" style="width:100%; margin-top:4px; padding:6px; border-radius:6px; border:1px solid #cbd5e1; font-weight:700;">
                        </div>
                        <div>
                            <input type="checkbox" id="chkDoUpdate" checked>
                            <label for="chkDoUpdate">Detail Outlet</label>
                            <input type="text" id="dateDoUpdate" value="${todayStr}" placeholder="03-09-2026" style="width:100%; margin-top:4px; padding:6px; border-radius:6px; border:1px solid #cbd5e1; font-weight:700;">
                        </div>
                        <div>
                            <input type="checkbox" id="chkDailyUpdate" checked>
                            <label for="chkDailyUpdate">GAP Daily KPI DSE</label>
                            <input type="text" id="dateDailyUpdate" value="${todayStr}" placeholder="03-09-2026" style="width:100%; margin-top:4px; padding:6px; border-radius:6px; border:1px solid #cbd5e1; font-weight:700;">
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button onclick="closeHistoryLogModal()" style="padding:8px 16px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; font-weight:800; cursor:pointer;">Batal</button>
                    <button onclick="saveCurrentDataHistoryLog()" style="padding:8px 16px; border-radius:8px; border:none; background:#e11d48; color:#fff; font-weight:800; cursor:pointer;"><i class="fa-solid fa-floppy-disk"></i> Simpan Catatan</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function openHistoryLogModal() {
    const modal = document.getElementById("historyLogModalOverlay");
    if (modal) modal.style.display = "flex";
}

function closeHistoryLogModal() {
    const modal = document.getElementById("historyLogModalOverlay");
    if (modal) modal.style.display = "none";
}

function saveCurrentDataHistoryLog() {
    const chkPst = document.getElementById("chkPstUpdate").checked;
    const datePst = document.getElementById("datePstUpdate").value.trim();

    const chkSm = document.getElementById("chkSmUpdate").checked;
    const dateSm = document.getElementById("dateSmUpdate").value.trim();

    const chkDo = document.getElementById("chkDoUpdate").checked;
    const dateDo = document.getElementById("dateDoUpdate").value.trim();

    const chkDaily = document.getElementById("chkDailyUpdate").checked;
    const dateDaily = document.getElementById("dateDailyUpdate").value.trim();

    let historyRecords = JSON.parse(localStorage.getItem("app_dashboard_history_records") || "[]");

    const record = {
        id: Date.now(),
        timestamp: new Date().toLocaleDateString("id-ID"),
        pst: chkPst ? datePst : "-",
        sm: chkSm ? dateSm : "-",
        do: chkDo ? dateDo : "-",
        daily: chkDaily ? dateDaily : "-"
    };

    historyRecords.unshift(record);
    localStorage.setItem("app_dashboard_history_records", JSON.stringify(historyRecords));

    updateTabHistoryDropdowns();
    closeHistoryLogModal();
    alert("✅ Catatan Log Tanggal Berhasil Disimpan!");
}

function updateTabHistoryDropdowns() {
    let historyRecords = JSON.parse(localStorage.getItem("app_dashboard_history_records") || "[]");

    const filters = [
        "pstHistoryPeriodFilter",
        "smHistoryPeriodFilter",
        "doHistoryPeriodFilter",
        "dailyHistoryPeriodFilter"
    ];

    filters.forEach(filterId => {
        const select = document.getElementById(filterId);
        if (!select) return;

        let opts = `<option value="LIVE">Live Data Terbaru</option>`;
        historyRecords.forEach(rec => {
            let tagDate = "-";
            if (filterId.includes("pst") && rec.pst !== "-") tagDate = rec.pst;
            if (filterId.includes("sm") && rec.sm !== "-") tagDate = rec.sm;
            if (filterId.includes("do") && rec.do !== "-") tagDate = rec.do;
            if (filterId.includes("daily") && rec.daily !== "-") tagDate = rec.daily;

            opts += `<option value="${rec.id}">Update Tanggal: ${tagDate}</option>`;
        });

        select.innerHTML = opts;
    });
}

function handlePeriodFilterChange(tabId, val) {
    if (val === "LIVE") {
        alert("Menampilkan Live Data Terbaru.");
    } else {
        alert("Periode Catatan Log Dipilih.");
    }
}