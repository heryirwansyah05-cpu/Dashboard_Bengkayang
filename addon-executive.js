/* ==========================================================================
   ADD-ON MODULE: TODAY INSTRUCTION (DIRECT ARRAY INDEX MATCHING FROM SCRIPT.JS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    setupTiEventListeners();

    // Loop otomatis memantau ketersediaan globalDataDO
    let syncInterval = setInterval(() => {
        if (typeof globalDataDO !== "undefined" && Array.isArray(globalDataDO) && globalDataDO.length > 0) {
            populateTiDseDropdown();
            renderTodayInstructionAddon();
            clearInterval(syncInterval);
        }
    }, 300);
});

function setupTiEventListeners() {
    const dseSelect = document.getElementById("tiDseFilter");
    const hariSelect = document.getElementById("tiHariFilter");

    if (dseSelect) dseSelect.onchange = () => renderTodayInstructionAddon();
    if (hariSelect) hariSelect.onchange = () => renderTodayInstructionAddon();

    // Sync otomatis saat tombol Tab Today Instruction diklik
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

// 1. Populate Dropdown DSE Berdasarkan Index 2 (DSE Code)
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

// 2. Render Utama Tab Today Instruction
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

    // Peta Indeks Kolom Hari
    const hariIndexMap = {
        'SENIN': 20,
        'SELASA': 21,
        'RABU': 22,
        'KAMIS': 23,
        'JUMAT': 24,
        'SABTU': 25
    };

    let colHariIdx = hariIndexMap[selectedHari] !== undefined ? hariIndexMap[selectedHari] : -1;

    // Filter Baris Data Berdasarkan DSE & Hari
    let filteredRows = globalDataDO.filter(r => {
        let dseVal = String(r[2] || "").trim();
        if (!dseVal || dseVal.toUpperCase() === "DSE CODE" || dseVal.toUpperCase() === "NAN") return false;

        const dseMatch = (selectedDse === "ALL") || (dseVal === selectedDse);
        const hariMatch = (colHariIdx === -1 || parseNum(r[colHariIdx]) > 0);

        return dseMatch && hariMatch;
    });

    // Grouping Data Berdasarkan DSE Code (Index 2)
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
        
        // Filter Outlet Kritis
        const criticalOutlets = outlets.filter(r => {
            const sellIn = parseNum(r[8]);      // Index 8: SP SELL IN
            const osa = parseNum(r[12]);        // Index 12: ACH OSA
            const tagSp = parseNum(r[15]);     // Index 15: SP TAGGING
            const tag3Pcs = parseNum(r[16]);   // Index 16: TAGGING 3PCS
            const bio = parseNum(r[18]);        // Index 18: RGUGA BIOMETRIX MTD

            const isBioKritis = bio < 1;
            const isTagKritis = (tagSp < 3 && tag3Pcs < 1);
            const isOsaKritis = osa < 300000;
            const isSellInKritis = sellIn < 3;

            return isBioKritis || isTagKritis || isOsaKritis || isSellInKritis;
        });

        const sectionId = `tiDseCard_${idx}`;

        html += `
            <div class="exec-card-panel border-top-red" id="${sectionId}" style="margin-bottom: 20px; background: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; border-top: 4px solid #e11d48;">
                <div class="exec-panel-header-flex" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
                    <div>
                        <span style="font-size:15px; font-weight:900; color:#0f172a;"><i class="fa-solid fa-user-gear" style="color:#e11d48;"></i> DSE: ${dseName}</span>
                        <div style="font-size:11px; color:#64748b; margin-top:2px;">Total PJP: <b>${outlets.length} Outlet</b> | Kritis: <b style="color:#e11d48;">${criticalOutlets.length} Outlet</b></div>
                    </div>
                    <button class="btn-snapshot-section" onclick="takeSectionSnapshot('${sectionId}')" style="background:#f59e0b; color:#0f172a; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;"><i class="fa-solid fa-camera"></i> Snapshot DSE ${dseName}</button>
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
/* =========================================================
   EXECUTIVE SUMMARY
   LANGKAH 2B-2 — MONTHLY PERFORMANCE TREND
   ---------------------------------------------------------
   Sumber data:
   PARTNER PERFORMANCE.xlsx
   globalHeaderPP
   globalDataPP

   Tidak mengubah data existing.
   Tidak mengubah script.js.
   ========================================================= */

/* =========================================================
   EXECUTIVE SUMMARY
   LANGKAH 2B-2 FINAL
   MONTHLY PERFORMANCE TREND + FILTER PT

   SUMBER DATA:
   PARTNER PERFORMANCE.xlsx

   DATA:
   - NAMA PARTNER
   - JANUARI s/d AGUSTUS
   - Prepaid Revenue
   - Primary
   - Secondary
   - Tertiary B#
   - Trade Supply
   - RGUGA-Trad
   - VLR_SUBS

   TIDAK MENGUBAH DATA EXISTING
   ========================================================= */

let executiveMonthlyTrendChart = null;
let executiveTrendMetric = "rev";
let executiveTrendPt = "ALL";


/* =========================================================
   CONFIG METRIC
   ========================================================= */

const EXECUTIVE_TREND_METRICS = {

    rev: {
        label: "Revenue",
        match: "PREPAID REV",
        color: "#E51B4B",
        format: "currency"
    },

    primary: {
        label: "Primary",
        match: "PRIMARY",
        color: "#F5B800",
        format: "number"
    },

    secondary: {
        label: "Secondary",
        match: "SECONDARY",
        color: "#C83BE3",
        format: "number"
    },

    tertiary: {
        label: "Tertiary B#",
        match: "TERTIARY B#",
        color: "#08A9C7",
        format: "number"
    },

    trade: {
        label: "Trade Supply",
        match: "TRADE SUPPLY",
        color: "#F97316",
        format: "currency"
    },

    rguTrade: {
        label: "RGU Trade",
        match: "RGUGA-TRAD",
        color: "#12A86B",
        format: "number"
    },

    vlr: {
        label: "VLR Subs",
        match: "VLR_SUBS",
        color: "#8B5CF6",
        format: "number"
    }

};


/* =========================================================
   BULAN
   ========================================================= */

const EXECUTIVE_MONTHS = [
    {
        full: "JANUARI",
        short: "Jan"
    },
    {
        full: "FEBRUARI",
        short: "Feb"
    },
    {
        full: "MARET",
        short: "Mar"
    },
    {
        full: "APRIL",
        short: "Apr"
    },
    {
        full: "MEI",
        short: "May"
    },
    {
        full: "JUNI",
        short: "Jun"
    },
    {
        full: "JULI",
        short: "Jul"
    },
    {
        full: "AGUSTUS",
        short: "Aug"
    }
];


/* =========================================================
   FORMAT ANGKA
   ========================================================= */

function formatExecutiveTrendValue(value) {

    value = Number(value) || 0;

    if (
        executiveTrendMetric === "rev" ||
        executiveTrendMetric === "trade"
    ) {

        if (Math.abs(value) >= 1000000000) {

            return "Rp " +
                (value / 1000000000).toFixed(1) +
                " M";

        }

        if (Math.abs(value) >= 1000000) {

            return "Rp " +
                (value / 1000000).toFixed(0) +
                " Jt";

        }

        return "Rp " +
            Math.round(value).toLocaleString("id-ID");

    }


    if (Math.abs(value) >= 1000000) {

        return (
            value / 1000000
        ).toFixed(1) + " M";

    }

    if (Math.abs(value) >= 1000) {

        return (
            value / 1000
        ).toFixed(0) + " K";

    }

    return Math.round(value)
        .toLocaleString("id-ID");

}


/* =========================================================
   FILTER PT
   ========================================================= */

function populateExecutiveTrendPT() {

    const select =
        document.getElementById(
            "executiveTrendPtFilter"
        );

    if (!select) return;

    if (
        typeof globalDataPP === "undefined" ||
        !Array.isArray(globalDataPP) ||
        globalDataPP.length === 0
    ) {
        return;
    }


    const currentUser =
        localStorage.getItem(
            "logged_in_user"
        );

    const userInfo =
        typeof ALLOWED_USERS !== "undefined"
            ? ALLOWED_USERS[currentUser]
            : null;


    const ptSet = new Set();


    globalDataPP.forEach(row => {

        const pt =
            String(row[1] || "")
                .trim();

        if (!pt) return;

        if (
            pt.toUpperCase() === "NAMA PARTNER" ||
            pt.toUpperCase() === "PT NAME"
        ) {
            return;
        }

        /*
         * Untuk user SDP:
         * hanya PT yang sesuai akses user
         */
        if (
            userInfo &&
            userInfo.type === "sdp" &&
            pt !== userInfo.filter
        ) {
            return;
        }

        ptSet.add(pt);

    });


    const sortedPT =
        Array.from(ptSet)
            .sort((a, b) =>
                a.localeCompare(
                    b,
                    "id",
                    {
                        numeric: true
                    }
                )
            );


    let html =
        `<option value="ALL">Semua PT</option>`;


    sortedPT.forEach(pt => {

        html += `
            <option value="${pt}">
                ${pt}
            </option>
        `;

    });


    select.innerHTML = html;


    /*
     * User SDP langsung terkunci
     * ke PT miliknya.
     */
    if (
        userInfo &&
        userInfo.type === "sdp"
    ) {

        executiveTrendPt =
            userInfo.filter;

        select.value =
            userInfo.filter;

        select.disabled = true;

    } else {

        if (
            executiveTrendPt !== "ALL" &&
            ptSet.has(executiveTrendPt)
        ) {

            select.value =
                executiveTrendPt;

        } else {

            executiveTrendPt =
                "ALL";

            select.value =
                "ALL";

        }

        select.disabled = false;

    }

}


/* =========================================================
   CARI KOLOM METRIC PER BULAN
   ========================================================= */

function getExecutiveTrendColumn(
    metricConfig,
    monthName
) {

    if (
        typeof globalHeaderPP === "undefined" ||
        !Array.isArray(globalHeaderPP)
    ) {
        return -1;
    }


    return globalHeaderPP.findIndex(
        header => {

            const h =
                String(header || "")
                    .toUpperCase()
                    .trim();

            return (
                h.includes(
                    metricConfig.match
                ) &&
                h.includes(
                    monthName
                )
            );

        }
    );

}


/* =========================================================
   RENDER TREND
   ========================================================= */

function renderExecutiveMonthlyTrend() {

    const container =
        document.getElementById(
            "executiveTrendContainer"
        );

    if (!container) return;


    if (
        typeof globalDataPP === "undefined" ||
        !Array.isArray(globalDataPP) ||
        globalDataPP.length === 0 ||
        typeof globalHeaderPP === "undefined" ||
        globalHeaderPP.length === 0
    ) {

        container.innerHTML = `
            <div class="trend-placeholder">

                <div class="trend-placeholder-icon">
                    <i class="fa-solid fa-spinner"></i>
                </div>

                <div class="trend-placeholder-title">
                    Memuat Partner Performance...
                </div>

            </div>
        `;

        return;

    }


    /* -----------------------------------------------------
       USER ACCESS
       ----------------------------------------------------- */

    const currentUser =
        localStorage.getItem(
            "logged_in_user"
        );

    const userInfo =
        typeof ALLOWED_USERS !== "undefined"
            ? ALLOWED_USERS[currentUser]
            : null;


    let selectedPT =
        executiveTrendPt;


    if (
        userInfo &&
        userInfo.type === "sdp"
    ) {

        selectedPT =
            userInfo.filter;

        executiveTrendPt =
            userInfo.filter;

    }


    /* -----------------------------------------------------
       FILTER DATA BERDASARKAN PT
       ----------------------------------------------------- */

    const filteredRows =
        globalDataPP.filter(row => {

            const pt =
                String(row[1] || "")
                    .trim();

            if (!pt) return false;


            return (
                selectedPT === "ALL" ||
                pt === selectedPT
            );

        });


    /* -----------------------------------------------------
       METRIC
       ----------------------------------------------------- */

    const metric =
        EXECUTIVE_TREND_METRICS[
            executiveTrendMetric
        ] ||
        EXECUTIVE_TREND_METRICS.rev;


    /* -----------------------------------------------------
       KOLOM BULAN
       ----------------------------------------------------- */

    const monthColumns =
        EXECUTIVE_MONTHS.map(month => {

            const index =
                getExecutiveTrendColumn(
                    metric,
                    month.full
                );

            return {
                full: month.full,
                short: month.short,
                index: index
            };

        }).filter(item =>
            item.index !== -1
        );


    /* -----------------------------------------------------
       TOTAL PER BULAN
       ----------------------------------------------------- */

    const values =
        monthColumns.map(month => {

            let total = 0;


            filteredRows.forEach(row => {

                const raw =
                    row[month.index];

                total +=
                    parseNum(raw);

            });


            return total;

        });


    /* -----------------------------------------------------
       HTML
       ----------------------------------------------------- */

    container.innerHTML = `

        <div class="exec-trend-controls">

            <div class="exec-trend-pt-control">

                <span class="exec-trend-filter-label">
                    <i class="fa-solid fa-building"></i>
                    PT
                </span>

                <select
                    id="executiveTrendPtFilter"
                    class="exec-trend-pt-select"
                >
                    <option value="ALL">
                        Semua PT
                    </option>
                </select>

            </div>


            <div class="exec-trend-metric-buttons">

                ${Object.entries(
                    EXECUTIVE_TREND_METRICS
                )
                .map(([key, item]) => `

                    <button
                        type="button"
                        class="exec-trend-btn ${
                            key === executiveTrendMetric
                                ? "active"
                                : ""
                        }"
                        data-executive-metric="${key}"
                    >
                        ${item.label}
                    </button>

                `)
                .join("")}

            </div>

        </div>


        <div class="exec-trend-chart-wrap">

            <canvas
                id="executiveMonthlyTrendChart"
            ></canvas>

        </div>


        <div class="exec-trend-footnote">

            Sumber:
            PARTNER PERFORMANCE.xlsx
            · ${selectedPT === "ALL"
                ? "Semua PT"
                : selectedPT}
            · ${monthColumns.length} bulan

        </div>

    `;


    /* -----------------------------------------------------
       POPULATE PT
       ----------------------------------------------------- */

    populateExecutiveTrendPT();


    /* -----------------------------------------------------
       EVENT FILTER PT
       ----------------------------------------------------- */

    const ptSelect =
        document.getElementById(
            "executiveTrendPtFilter"
        );


    if (ptSelect) {

        ptSelect.addEventListener(
            "change",
            function () {

                executiveTrendPt =
                    this.value;

                renderExecutiveMonthlyTrend();

            }
        );

    }


    /* -----------------------------------------------------
       EVENT METRIC
       ----------------------------------------------------- */

    container
        .querySelectorAll(
            ".exec-trend-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    executiveTrendMetric =
                        this.dataset
                            .executiveMetric;

                    renderExecutiveMonthlyTrend();

                }
            );

        });


    /* -----------------------------------------------------
       CHART.JS
       ----------------------------------------------------- */

    const canvas =
        document.getElementById(
            "executiveMonthlyTrendChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    if (
        executiveMonthlyTrendChart
    ) {

        executiveMonthlyTrendChart
            .destroy();

    }


    executiveMonthlyTrendChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",

                data: {

                    labels:
                        monthColumns.map(
                            item =>
                                item.short
                        ),

                    datasets: [

                        {

                            label:
                                metric.label,

                            data:
                                values,

                            borderColor:
                                metric.color,

                            backgroundColor:
                                metric.color +
                                "18",

                            borderWidth: 3,

                            pointRadius: 4,

                            pointHoverRadius: 6,

                            pointBackgroundColor:
                                metric.color,

                            pointBorderColor:
                                "#FFFFFF",

                            pointBorderWidth: 2,

                            fill: true,

                            tension: .35

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        intersect: false,

                        mode: "index"

                    },


                    plugins: {

                        legend: {

                            display: false

                        },


                        tooltip: {

                            displayColors:
                                false,

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            metric.label +
                                            ": " +
                                            formatExecutiveTrendValue(
                                                context.raw
                                            )
                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        x: {

                            grid: {

                                display:
                                    false

                            },

                            ticks: {

                                color:
                                    "#64748B",

                                font: {

                                    size: 10,

                                    weight: "700"

                                }

                            }

                        },


                        y: {

                            beginAtZero:
                                true,

                            grid: {

                                color:
                                    "rgba(148,163,184,.16)"

                            },

                            ticks: {

                                color:
                                    "#64748B",

                                font: {

                                    size: 9,

                                    weight: "600"

                                },

                                callback:
                                    function(value) {

                                        return formatExecutiveTrendValue(
                                            value
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   AUTO SYNC DENGAN PARTNER PERFORMANCE
   ========================================================= */

function syncExecutiveMonthlyTrend() {

    if (
        typeof globalDataPP !== "undefined" &&
        Array.isArray(globalDataPP) &&
        globalDataPP.length > 0 &&
        typeof globalHeaderPP !== "undefined" &&
        globalHeaderPP.length > 0
    ) {

        renderExecutiveMonthlyTrend();

        return true;

    }

    return false;

}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        let syncInterval =
            setInterval(
                function () {

                    if (
                        syncExecutiveMonthlyTrend()
                    ) {

                        clearInterval(
                            syncInterval
                        );

                    }

                },
                400
            );

    }
);


/* =========================================================
   REFRESH SAAT KEMBALI KE EXECUTIVE SUMMARY
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {

        const tab =
            event.target.closest(
                "#navTabExecutiveSummary, " +
                "[data-tab='all-summary-tab']"
            );


        if (tab) {

            setTimeout(
                function () {

                    syncExecutiveMonthlyTrend();

                },
                150
            );
        }
    }
);


/* =========================================================
   EXECUTIVE SUMMARY — MARKET SHARE + VISUAL REFINEMENT
   ---------------------------------------------------------
   - Sumber Market Share: FB Market Share.xlsx
   - Tidak mengubah data/KPI existing.
   - Visual refinement untuk Filter PT + Non KPI/RSE.
   ========================================================= */

(function () {
    "use strict";

    let executiveMarketShareChart = null;
    let executiveMarketShareData = [];
    let executiveMarketShareLoaded = false;

    /* ---------- VISUAL REFINEMENT ---------- */
    function injectExecutiveRefinementStyle() {
        if (document.getElementById("executive-refinement-style")) return;

        const style = document.createElement("style");
        style.id = "executive-refinement-style";
        style.textContent = `
            /* ===== Performance Trend / PT filter ===== */
            #snapshotSectionTrend .exec-trend-controls {
                display:flex !important;
                align-items:center !important;
                justify-content:space-between !important;
                gap:10px !important;
                margin:0 0 8px !important;
                padding:7px 8px !important;
                background:#F8FAFC !important;
                border:1px solid #E4EAF1 !important;
                border-radius:10px !important;
            }

            #snapshotSectionTrend .exec-trend-pt-control {
                display:flex !important;
                align-items:center !important;
                gap:7px !important;
                flex:0 0 auto !important;
            }

            #snapshotSectionTrend .exec-trend-filter-label {
                display:inline-flex !important;
                align-items:center !important;
                gap:5px !important;
                color:#526176 !important;
                font-size:10px !important;
                font-weight:900 !important;
                text-transform:uppercase !important;
                letter-spacing:.2px !important;
            }

            #snapshotSectionTrend .exec-trend-filter-label i {
                color:#172236 !important;
                font-size:10px !important;
            }

            #snapshotSectionTrend .exec-trend-pt-select {
                appearance:auto !important;
                min-width:145px !important;
                height:29px !important;
                padding:0 28px 0 9px !important;
                border:1px solid #D3DCE7 !important;
                border-radius:8px !important;
                background:#FFFFFF !important;
                color:#172236 !important;
                font-family:inherit !important;
                font-size:10px !important;
                font-weight:800 !important;
                outline:none !important;
                box-shadow:0 2px 6px rgba(23,34,54,.04) !important;
            }

            #snapshotSectionTrend .exec-trend-pt-select:focus {
                border-color:#E0BD00 !important;
                box-shadow:0 0 0 3px rgba(255,214,0,.16) !important;
            }

            #snapshotSectionTrend .exec-trend-pt-select:disabled {
                opacity:1 !important;
                background:#F1F5F9 !important;
                color:#475569 !important;
                cursor:not-allowed !important;
            }

            #snapshotSectionTrend .exec-trend-metric-buttons {
                display:flex !important;
                align-items:center !important;
                justify-content:flex-end !important;
                gap:4px !important;
                flex-wrap:wrap !important;
            }

            #snapshotSectionTrend .exec-trend-btn {
                min-height:27px !important;
                padding:5px 9px !important;
                border:1px solid #DCE4ED !important;
                border-radius:7px !important;
                background:#FFFFFF !important;
                color:#64748B !important;
                font-family:inherit !important;
                font-size:9px !important;
                font-weight:800 !important;
                line-height:1 !important;
                box-shadow:none !important;
            }

            #snapshotSectionTrend .exec-trend-btn:hover {
                background:#FFF8D6 !important;
                border-color:#E2BD00 !important;
                color:#172236 !important;
            }

            #snapshotSectionTrend .exec-trend-btn.active {
                background:#FFD600 !important;
                border-color:#E0BD00 !important;
                color:#172236 !important;
                box-shadow:0 3px 7px rgba(255,214,0,.18) !important;
            }

            /* ===== Non KPI ===== */
            #snapshotSectionNonKpi {
                overflow:hidden !important;
            }

            #snapshotSectionNonKpi .exec-panel-header-flex,
            #snapshotSectionRse .exec-panel-header-flex {
                min-height:36px !important;
                gap:10px !important;
            }

            #snapshotSectionNonKpi .exec-panel-header,
            #snapshotSectionRse .exec-panel-header {
                display:flex !important;
                align-items:center !important;
                gap:7px !important;
                color:#172236 !important;
                font-size:11px !important;
                line-height:1.25 !important;
                font-weight:900 !important;
            }

            #snapshotSectionNonKpi .mini-table-wrapper,
            #snapshotSectionRse .mini-table-wrapper {
                border:1px solid #E1E7EE !important;
                border-radius:10px !important;
                overflow:auto !important;
                background:#FFFFFF !important;
            }

            #snapshotSectionNonKpi .mini-exec-table,
            #snapshotSectionRse .mini-exec-table {
                width:100% !important;
                margin:0 !important;
                border-collapse:separate !important;
                border-spacing:0 !important;
                font-family:inherit !important;
            }

            #snapshotSectionNonKpi .mini-exec-table th,
            #snapshotSectionRse .mini-exec-table th {
                background:#172236 !important;
                color:#FFFFFF !important;
                border-right:1px solid rgba(255,255,255,.12) !important;
                font-size:9px !important;
                font-weight:900 !important;
                letter-spacing:.1px !important;
                padding:8px 6px !important;
                white-space:normal !important;
                line-height:1.25 !important;
            }

            #snapshotSectionNonKpi .mini-exec-table td,
            #snapshotSectionRse .mini-exec-table td {
                border-right:1px solid #E8EDF3 !important;
                border-bottom:1px solid #E8EDF3 !important;
                background:#FFFFFF !important;
                color:#334155 !important;
                font-size:9.5px !important;
                font-weight:700 !important;
                padding:8px 6px !important;
                vertical-align:middle !important;
                line-height:1.25 !important;
            }

            #snapshotSectionNonKpi .mini-exec-table tbody tr:nth-child(even) td,
            #snapshotSectionRse .mini-exec-table tbody tr:nth-child(even) td {
                background:#FAFCFE !important;
            }

            #snapshotSectionNonKpi .mini-exec-table tbody tr:hover td,
            #snapshotSectionRse .mini-exec-table tbody tr:hover td {
                background:#FFFBEA !important;
            }

            #snapshotSectionNonKpi .mini-exec-table td:first-child {
                color:#172236 !important;
                font-weight:900 !important;
                white-space:nowrap !important;
            }

            #snapshotSectionNonKpi .mini-exec-table td > div:first-child {
                font-size:9px !important;
                line-height:1.25 !important;
            }

            #snapshotSectionNonKpi .mini-exec-table td > div:nth-child(2) {
                height:7px !important;
                margin-top:5px !important;
                background:#E6ECF2 !important;
                border-radius:99px !important;
            }

            #snapshotSectionNonKpi .mini-exec-table td > div:nth-child(2) > div {
                border-radius:99px !important;
                background:linear-gradient(90deg,#008FCA,#08A9C7) !important;
            }

            /* ===== RSE score ===== */
            #snapshotSectionRse .badge-success {
                background:#E1F7EC !important;
                border:1px solid #BFE9D2 !important;
                color:#087A4B !important;
                border-radius:20px !important;
                padding:6px 12px !important;
                font-size:11px !important;
                font-weight:900 !important;
                white-space:nowrap !important;
            }

            /* ===== Market Share ===== */
            #snapshotSectionMarketShare .market-share-content {
                min-height:205px !important;
                padding:8px 8px 5px !important;
                border:1px solid #DDE5EE !important;
                border-radius:12px !important;
                background:linear-gradient(180deg,#FFFFFF 0%,#F9FBFD 100%) !important;
            }

            #snapshotSectionMarketShare .ms-latest-grid {
                display:grid !important;
                grid-template-columns:repeat(4,minmax(0,1fr)) !important;
                gap:5px !important;
                margin-bottom:7px !important;
            }

            #snapshotSectionMarketShare .ms-latest-item {
                min-width:0 !important;
                padding:5px 4px !important;
                text-align:center !important;
                border:1px solid #E5EAF0 !important;
                border-radius:8px !important;
                background:#FFFFFF !important;
            }

            #snapshotSectionMarketShare .ms-latest-name {
                display:block !important;
                color:#64748B !important;
                font-size:8px !important;
                font-weight:900 !important;
            }

            #snapshotSectionMarketShare .ms-latest-value {
                display:block !important;
                margin-top:2px !important;
                color:#172236 !important;
                font-size:13px !important;
                font-weight:900 !important;
                line-height:1.1 !important;
            }

            #snapshotSectionMarketShare .ms-chart-wrap {
                position:relative !important;
                height:125px !important;
            }

            #snapshotSectionMarketShare .ms-footnote {
                margin-top:2px !important;
                color:#94A3B8 !important;
                font-size:7.5px !important;
                font-weight:600 !important;
                text-align:right !important;
            }

            @media(max-width:999px) {
                #snapshotSectionTrend .exec-trend-controls {
                    align-items:stretch !important;
                    flex-direction:column !important;
                }
                #snapshotSectionTrend .exec-trend-pt-control {
                    width:100% !important;
                }
                #snapshotSectionTrend .exec-trend-pt-select {
                    flex:1 !important;
                    min-width:0 !important;
                }
                #snapshotSectionTrend .exec-trend-metric-buttons {
                    justify-content:flex-start !important;
                    flex-wrap:nowrap !important;
                    overflow-x:auto !important;
                    padding-bottom:2px !important;
                }
                #snapshotSectionMarketShare .ms-latest-value {
                    font-size:12px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /* ---------- MARKET SHARE DATA ---------- */
    function cleanMsNumber(v) {
        if (typeof parseNum === "function") return parseNum(v);
        if (typeof v === "number") return v;
        const n = Number(String(v ?? "").replace(/%/g, "").replace(/,/g, "."));
        return Number.isFinite(n) ? n : 0;
    }

    function normalizeMsPercent(v) {
        const n = cleanMsNumber(v);
        return n > 1 ? n / 100 : n;
    }

    function bootExecutiveEnhancement() {
        injectExecutiveRefinementStyle();
    }

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(bootExecutiveEnhancement, 250);
    });

    document.addEventListener("click", event => {
        const tab = event.target.closest("#navTabExecutiveSummary, [data-tab='all-summary-tab']");
        if (tab) setTimeout(bootExecutiveEnhancement, 250);
    });
})();

/* =========================================================
   EXECUTIVE SUMMARY — FINAL IM3 COMMAND CENTER FINISH
   ---------------------------------------------------------
   Visual + presentation layer only.
   Existing KPI/data functions remain untouched.
   Adds:
   - RSE Score visual beside Today's Priority Action
   - Sebaran Outlet & Site Tower map
   - Executive Insight
   - Quick Links
   - IM3 / Power BI visual refinement
   ========================================================= */
(function () {
    "use strict";

    const FINAL_STYLE_ID = "executive-command-center-final-style";
    const FINAL_BOTTOM_ID = "executive-command-center-bottom";
    const FINAL_RSE_ID = "executive-rse-visual";
    let finalMap = null;
    let finalMapLoaded = false;
    let finalMapBooted = false;

    function injectFinalStyle() {
        if (document.getElementById(FINAL_STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = FINAL_STYLE_ID;
        style.textContent = `
            /* =====================================================
               FINAL IM3 COMMAND CENTER
               ===================================================== */
            #all-summary-tab .exec-summary-wrapper {
                font-family: Inter, "Segoe UI", Arial, sans-serif !important;
            }

            /* ----- Today's Priority + RSE Score ----- */
            #snapshotSectionMission .exec-mission-stats-grid {
                display:grid !important;
                grid-template-columns:repeat(4,minmax(0,1fr)) !important;
                gap:10px !important;
                min-width:0 !important;
            }

            #snapshotSectionMission .exec-panel-header-flex {
                min-height:34px !important;
            }

            #snapshotSectionMission .exec-filter-group {
                gap:7px !important;
            }

            #snapshotSectionMission .exec-filter-group .exec-select {
                height:30px !important;
                border-radius:8px !important;
                font-size:9px !important;
                font-weight:800 !important;
            }

            #${FINAL_RSE_ID} {
                position:relative !important;
                min-height:136px !important;
                border-radius:13px !important;
                overflow:hidden !important;
                background:linear-gradient(135deg,#101B2E 0%,#18263B 72%,#1D2D45 100%) !important;
                color:#fff !important;
                box-shadow:0 7px 18px rgba(23,34,54,.12) !important;
                border:1px solid #243650 !important;
                display:flex !important;
                align-items:center !important;
                gap:14px !important;
                padding:14px !important;
                box-sizing:border-box !important;
            }

            #${FINAL_RSE_ID}::after {
                content:"" !important;
                position:absolute !important;
                width:130px !important;
                height:130px !important;
                right:-55px !important;
                top:-50px !important;
                border-radius:50% !important;
                border:1px solid rgba(255,214,0,.15) !important;
                box-shadow:0 0 0 22px rgba(255,214,0,.035),0 0 0 45px rgba(255,214,0,.025) !important;
                pointer-events:none !important;
            }

            #${FINAL_RSE_ID} .rse-ring {
                --rse-pct:35.03;
                width:94px !important;
                height:94px !important;
                flex:0 0 94px !important;
                border-radius:50% !important;
                background:conic-gradient(#FFD600 calc(var(--rse-pct) * 1%),#3A4A60 0) !important;
                display:grid !important;
                place-items:center !important;
                position:relative !important;
                box-shadow:0 0 0 1px rgba(255,255,255,.05),0 6px 15px rgba(0,0,0,.22) !important;
            }

            #${FINAL_RSE_ID} .rse-ring::before {
                content:"" !important;
                position:absolute !important;
                inset:9px !important;
                background:#142238 !important;
                border-radius:50% !important;
            }

            #${FINAL_RSE_ID} .rse-ring-value {
                position:relative !important;
                z-index:1 !important;
                font-size:19px !important;
                font-weight:900 !important;
                letter-spacing:-.5px !important;
            }

            #${FINAL_RSE_ID} .rse-copy {
                position:relative !important;
                z-index:1 !important;
                min-width:0 !important;
            }

            #${FINAL_RSE_ID} .rse-label {
                color:#FFFFFF !important;
                font-size:13px !important;
                font-weight:900 !important;
                margin-bottom:6px !important;
            }

            #${FINAL_RSE_ID} .rse-status {
                display:inline-flex !important;
                align-items:center !important;
                gap:5px !important;
                color:#FFD600 !important;
                font-size:10px !important;
                font-weight:900 !important;
                text-transform:uppercase !important;
                margin-bottom:7px !important;
            }

            #${FINAL_RSE_ID} .rse-status::before {
                content:"" !important;
                width:6px !important;
                height:6px !important;
                border-radius:50% !important;
                background:#FFD600 !important;
                box-shadow:0 0 0 4px rgba(255,214,0,.10) !important;
            }

            #${FINAL_RSE_ID} .rse-target {
                color:#D5DEEA !important;
                font-size:9px !important;
                line-height:1.45 !important;
            }

            #${FINAL_RSE_ID} .rse-target b {
                color:#FFFFFF !important;
                font-weight:900 !important;
            }

            /* Make Mission a compact BI composition on desktop */
            @media (min-width:1000px) {
                #snapshotSectionMission .exec-mission-stats-grid {
                    grid-template-columns:repeat(4,minmax(0,1fr)) !important;
                }

                #snapshotSectionMission .exec-panel-header-flex + #${FINAL_RSE_ID} {
                    margin-top:0 !important;
                }

                #snapshotSectionMission .mission-final-body {
                    display:grid !important;
                    grid-template-columns:245px minmax(0,1fr) !important;
                    gap:12px !important;
                    align-items:stretch !important;
                }

                #snapshotSectionMission .mission-final-body .exec-mission-stats-grid {
                    grid-column:2 !important;
                }

                #snapshotSectionMission .mission-final-body #${FINAL_RSE_ID} {
                    grid-column:1 !important;
                    grid-row:1 !important;
                    height:100% !important;
                }
            }

            /* ----- Bottom command-center row ----- */
            #${FINAL_BOTTOM_ID} {
                grid-column:1 / -1 !important;
                width:100% !important;
                min-width:0 !important;
                display:grid !important;
                grid-template-columns:minmax(0,1.45fr) minmax(260px,.82fr) minmax(190px,.58fr) !important;
                gap:14px !important;
                margin:0 !important;
                padding:0 !important;
                box-sizing:border-box !important;
            }

            #${FINAL_BOTTOM_ID} .final-command-card {
                min-width:0 !important;
                background:#FFFFFF !important;
                border:1px solid #DDE5EE !important;
                border-radius:14px !important;
                box-shadow:0 5px 16px rgba(23,34,54,.055) !important;
                overflow:hidden !important;
            }

            #${FINAL_BOTTOM_ID} .final-card-head {
                min-height:38px !important;
                display:flex !important;
                align-items:center !important;
                justify-content:space-between !important;
                gap:8px !important;
                padding:9px 11px !important;
                box-sizing:border-box !important;
                border-bottom:1px solid #E7ECF2 !important;
                background:linear-gradient(180deg,#FFFFFF,#F8FAFC) !important;
            }

            #${FINAL_BOTTOM_ID} .final-card-title {
                display:flex !important;
                align-items:center !important;
                gap:6px !important;
                color:#172236 !important;
                font-size:11px !important;
                font-weight:900 !important;
                letter-spacing:-.05px !important;
            }

            #${FINAL_BOTTOM_ID} .final-card-title i {
                color:#F2B900 !important;
                font-size:11px !important;
            }

            #${FINAL_BOTTOM_ID} .final-card-action {
                border:1px solid #D8E1EB !important;
                background:#FFFFFF !important;
                color:#526176 !important;
                border-radius:7px !important;
                padding:5px 8px !important;
                font-size:8px !important;
                font-weight:900 !important;
                cursor:pointer !important;
            }

            #${FINAL_BOTTOM_ID} .final-card-action:hover {
                background:#FFF8D6 !important;
                border-color:#E2BD00 !important;
                color:#172236 !important;
            }

            /* Map */
            #executiveCommandMap {
                height:210px !important;
                width:100% !important;
                background:#EAF0E8 !important;
                position:relative !important;
            }

            #executiveCommandMap .leaflet-control-zoom a {
                color:#172236 !important;
            }

            .final-map-legend {
                position:absolute !important;
                left:9px !important;
                bottom:8px !important;
                z-index:500 !important;
                background:rgba(255,255,255,.94) !important;
                border:1px solid #DCE4ED !important;
                border-radius:8px !important;
                padding:5px 7px !important;
                display:flex !important;
                align-items:center !important;
                gap:8px !important;
                box-shadow:0 3px 10px rgba(23,34,54,.10) !important;
                font-size:8px !important;
                font-weight:800 !important;
                color:#526176 !important;
            }

            .final-map-legend span {
                display:inline-flex !important;
                align-items:center !important;
                gap:4px !important;
            }

            .final-map-dot {
                width:8px !important;
                height:8px !important;
                border-radius:50% !important;
                background:#FFD600 !important;
                border:1px solid #D8AE00 !important;
                display:inline-block !important;
            }

            .final-map-tower {
                color:#E51B4B !important;
                font-size:10px !important;
            }

            .final-map-status {
                padding:22px !important;
                text-align:center !important;
                color:#7B8798 !important;
                font-size:10px !important;
                font-weight:700 !important;
            }

            /* Insight */
            #executiveInsightBody {
                padding:10px 11px 11px !important;
            }

            .final-insight-score {
                color:#172236 !important;
                font-size:12px !important;
                font-weight:900 !important;
                margin-bottom:4px !important;
            }

            .final-insight-score b {
                color:#E51B4B !important;
            }

            .final-insight-text {
                color:#64748B !important;
                font-size:9px !important;
                line-height:1.5 !important;
                margin-bottom:8px !important;
            }

            .final-reco-box {
                background:#FFF8D6 !important;
                border:1px solid #F0D56A !important;
                border-radius:9px !important;
                padding:7px 8px !important;
            }

            .final-reco-title {
                color:#735A00 !important;
                font-size:9px !important;
                font-weight:900 !important;
                margin-bottom:4px !important;
            }

            .final-reco-list {
                display:grid !important;
                grid-template-columns:1fr 1fr !important;
                gap:3px 7px !important;
                margin:0 !important;
                padding:0 !important;
                list-style:none !important;
            }

            .final-reco-list li {
                color:#526176 !important;
                font-size:8px !important;
                line-height:1.3 !important;
                font-weight:700 !important;
            }

            .final-reco-list li::before {
                content:"✓" !important;
                color:#12A86B !important;
                font-weight:900 !important;
                margin-right:3px !important;
            }

            .final-insight-button {
                margin-top:8px !important;
                width:100% !important;
                border:0 !important;
                border-radius:8px !important;
                padding:7px 9px !important;
                background:#FFD600 !important;
                color:#172236 !important;
                font-size:8px !important;
                font-weight:900 !important;
                cursor:pointer !important;
            }

            .final-insight-button:hover {
                background:#F2C900 !important;
            }

            /* Quick links */
            #executiveQuickLinksBody {
                padding:8px !important;
            }

            .final-quick-grid {
                display:grid !important;
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                gap:6px !important;
            }

            .final-quick-btn {
                min-height:59px !important;
                border:1px solid #E0E7EF !important;
                border-radius:9px !important;
                background:#FFFFFF !important;
                display:flex !important;
                flex-direction:column !important;
                align-items:center !important;
                justify-content:center !important;
                gap:5px !important;
                color:#526176 !important;
                font-size:8px !important;
                font-weight:900 !important;
                cursor:pointer !important;
                transition:.16s ease !important;
            }

            .final-quick-btn i {
                color:#172236 !important;
                font-size:14px !important;
            }

            .final-quick-btn:hover {
                border-color:#E3C000 !important;
                background:#FFFBEA !important;
                transform:translateY(-1px) !important;
            }

            /* Better RSE existing scorecard */
            #snapshotSectionRse .status-badge.badge-success {
                background:#E1F7EC !important;
                color:#087A4B !important;
                border:1px solid #BFE9D2 !important;
                border-radius:20px !important;
                font-size:10px !important;
                padding:6px 10px !important;
                font-weight:900 !important;
            }

            #snapshotSectionRse .mini-exec-table th {
                font-size:8.5px !important;
                padding:7px 5px !important;
            }

            #snapshotSectionRse .mini-exec-table td {
                font-size:8.5px !important;
                padding:7px 5px !important;
            }

            /* Mobile */
            @media (max-width:999px) {
                #snapshotSectionMission .mission-final-body {
                    display:flex !important;
                    flex-direction:column !important;
                    gap:10px !important;
                }

                #snapshotSectionMission .exec-mission-stats-grid {
                    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
                }

                #${FINAL_RSE_ID} {
                    min-height:112px !important;
                }

                #${FINAL_BOTTOM_ID} {
                    grid-template-columns:1fr !important;
                }

                #executiveCommandMap {
                    height:230px !important;
                }
            }

            @media (max-width:520px) {
                #snapshotSectionMission .exec-mission-stats-grid {
                    grid-template-columns:1fr !important;
                }

                .final-reco-list {
                    grid-template-columns:1fr !important;
                }

                .final-quick-btn {
                    min-height:54px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function readRseScore() {
        const el = document.getElementById("rseTotalScoreText");
        if (!el) return 35.03;
        const n = parseFloat(String(el.textContent || "").replace(/,/g, ".").replace(/[^0-9.]/g, ""));
        return Number.isFinite(n) ? n : 35.03;
    }

    function ensureRseVisual() {
        const mission = document.getElementById("snapshotSectionMission");
        if (!mission) return;

        let body = mission.querySelector(".mission-final-body");
        const stats = mission.querySelector(".exec-mission-stats-grid");
        if (!stats) return;

        if (!body) {
            body = document.createElement("div");
            body.className = "mission-final-body";
            stats.parentNode.insertBefore(body, stats);
            body.appendChild(stats);
        }

        let rse = document.getElementById(FINAL_RSE_ID);
        if (!rse) {
            rse = document.createElement("div");
            rse.id = FINAL_RSE_ID;
            body.insertBefore(rse, stats);
        } else if (rse.parentElement !== body) {
            body.insertBefore(rse, stats);
        }

        const score = readRseScore();
        rse.innerHTML = `
            <div class="rse-ring" style="--rse-pct:${Math.max(0, Math.min(100, score))}">
                <span class="rse-ring-value">${score.toFixed(2)}%</span>
            </div>
            <div class="rse-copy">
                <div class="rse-label"><i class="fa-solid fa-trophy"></i> RSE Score</div>
                <div class="rse-status">${score < 70 ? "Needs Attention" : "On Track"}</div>
                <div class="rse-target">Target Minimal <b>70%</b></div>
            </div>
        `;
    }

    function switchToReport(reportId) {
        const buttons = {
            "ms-bengkayang": "navTabPst",
            "outlet-mc": "navTabMonitoring",
            "detail-outlet": "navTabOutlet",
            "daily-dse": "navTabDaily",
            "partner-performance": "navTabPartner",
            "today-instruction-tab": "navTabTodayInstruction"
        };
        const btn = document.getElementById(buttons[reportId]);
        if (btn && typeof switchReport === "function") {
            switchReport(reportId, btn);
        }
    }

    function ensureBottomCommandCenter() {
        const wrapper = document.getElementById("snapshotSectionAllSummary");
        const rseSection = document.getElementById("snapshotSectionRse");
        if (!wrapper || !rseSection) return;

        let bottom = document.getElementById(FINAL_BOTTOM_ID);
        if (!bottom) {
            bottom = document.createElement("div");
            bottom.id = FINAL_BOTTOM_ID;
            rseSection.insertAdjacentElement("afterend", bottom);
        }

        if (!document.getElementById("executiveCommandMapCard")) {
            bottom.innerHTML = `
                <div class="final-command-card" id="executiveCommandMapCard">
                    <div class="final-card-head">
                        <div class="final-card-title"><i class="fa-solid fa-location-dot"></i> Sebaran Outlet &amp; Site Tower</div>
                        <button class="final-card-action" type="button" id="executiveMapFitBtn">Lihat Detail</button>
                    </div>
                    <div id="executiveCommandMap">
                        <div class="final-map-status"><i class="fa-solid fa-spinner fa-spin"></i><br>Memuat lokasi Site &amp; Outlet...</div>
                    </div>
                </div>

                <div class="final-command-card" id="executiveInsightCard">
                    <div class="final-card-head">
                        <div class="final-card-title"><i class="fa-solid fa-lightbulb"></i> Executive Insight</div>
                    </div>
                    <div id="executiveInsightBody"></div>
                </div>

                <div class="final-command-card" id="executiveQuickLinksCard">
                    <div class="final-card-head">
                        <div class="final-card-title"><i class="fa-solid fa-bolt"></i> Quick Links</div>
                    </div>
                    <div id="executiveQuickLinksBody">
                        <div class="final-quick-grid">
                            <button class="final-quick-btn" data-report="ms-bengkayang"><i class="fa-solid fa-chart-column"></i><span>PST</span></button>
                            <button class="final-quick-btn" data-report="outlet-mc"><i class="fa-solid fa-tower-cell"></i><span>Site Monitoring</span></button>
                            <button class="final-quick-btn" data-report="detail-outlet"><i class="fa-solid fa-store"></i><span>Detail Outlet</span></button>
                            <button class="final-quick-btn" data-report="daily-dse"><i class="fa-solid fa-users"></i><span>GAP KPI DSE</span></button>
                            <button class="final-quick-btn" data-report="partner-performance"><i class="fa-solid fa-handshake"></i><span>Partner Performance</span></button>
                            <button class="final-quick-btn" data-report="today-instruction-tab"><i class="fa-solid fa-clipboard-list"></i><span>Today Instruction</span></button>
                        </div>
                    </div>
                </div>
            `;

            bottom.querySelectorAll(".final-quick-btn").forEach(btn => {
                btn.addEventListener("click", () => switchToReport(btn.dataset.report));
            });

            const fitBtn = document.getElementById("executiveMapFitBtn");
            if (fitBtn) fitBtn.addEventListener("click", () => {
                if (finalMap && finalMap._finalBounds && finalMap._finalBounds.isValid()) {
                    finalMap.fitBounds(finalMap._finalBounds, { padding:[16,16], maxZoom:12 });
                }
            });
        }

        updateExecutiveInsight();
    }

    function updateExecutiveInsight() {
        const body = document.getElementById("executiveInsightBody");
        if (!body) return;
        const score = readRseScore();
        body.innerHTML = `
            <div class="final-insight-score">RSE Score saat ini <b>${score.toFixed(2)}%</b></div>
            <div class="final-insight-text">
                Gap terbesar berasal dari Sell In dan DSE Productivity.<br>
                Fokus pada akselerasi tagging 3PCS, biometrik, dan peningkatan distribusi SP.
            </div>
            <div class="final-reco-box">
                <div class="final-reco-title">Rekomendasi AI :</div>
                <ul class="final-reco-list">
                    <li>Push distribusi SP ke Outlet</li>
                    <li>Percepat program Biometrik</li>
                    <li>Market Blitz 6 hari (Target 300 GA)</li>
                    <li>Fokus recovery di Sanggau Ledo</li>
                </ul>
            </div>
            <button class="final-insight-button" type="button" onclick="document.getElementById('snapshotSectionRse')?.scrollIntoView({behavior:'smooth',block:'center'})">
                Lihat Rekomendasi Lengkap <i class="fa-solid fa-arrow-right"></i>
            </button>
        `;
    }

    function loadLeaflet(callback) {
        if (window.L) {
            callback();
            return;
        }

        if (!document.getElementById("final-leaflet-css")) {
            const css = document.createElement("link");
            css.id = "final-leaflet-css";
            css.rel = "stylesheet";
            css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(css);
        }

        const existing = document.getElementById("final-leaflet-js");
        if (existing) {
            existing.addEventListener("load", callback, { once:true });
            return;
        }

        const script = document.createElement("script");
        script.id = "final-leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = callback;
        script.onerror = () => showMapError("Library peta tidak dapat dimuat.");
        document.head.appendChild(script);
    }

    function normalizeHeader(v) {
        return String(v ?? "")
            .trim()
            .toUpperCase()
            .replace(/[\n\r]+/g, " ")
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ");
    }

    function findHeader(headers, names) {
        const wanted = names.map(normalizeHeader);
        return headers.findIndex(h => wanted.includes(h));
    }

    function toNumber(v) {
        if (typeof v === "number") return v;
        const s = String(v ?? "").trim().replace(/,/g, ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
    }

    function coordinate(v) {
        const n = toNumber(v);
        return Number.isFinite(n) ? n : NaN;
    }

    function sheetLocations(ws, type) {
        if (!ws) return [];
        const rows = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:"" });
        if (!rows.length) return [];

        let headerRow = rows.findIndex(r => {
            const joined = r.map(normalizeHeader).join(" | ");
            return joined.includes("SITE ID") || joined.includes("OUTLET ID");
        });
        if (headerRow < 0) headerRow = 0;

        const headers = rows[headerRow].map(normalizeHeader);
        const idIdx = findHeader(headers, type === "site" ? ["SITE ID"] : ["OUTLET ID"]);
        const nameIdx = findHeader(headers, type === "site" ? ["SITE NAME"] : ["OUTLET NAME"]);
        const latIdx = findHeader(headers, ["LAT", "LATITUDE"]);
        const lngIdx = findHeader(headers, ["LONG", "LONGITUDE", "LON"]);
        const sdpIdx = findHeader(headers, ["SDP", "SDP NAME"]);
        const dseIdx = findHeader(headers, ["DSE", "DSE CODE"]);
        const kecIdx = findHeader(headers, ["KECAMATAN"]);
        const heightIdx = findHeader(headers, ["HEIGHT TOWER M"]);
        const antennaIdx = findHeader(headers, ["HEIGHT ANTENNA M"]);
        const bandwidthIdx = findHeader(headers, ["BANDWIDTH MHZ", "BANDWIDTH"]);
        const eutIdx = findHeader(headers, ["IOH LTE EUT STATUS", "EUT STATUS"]);
        const popIdx = findHeader(headers, ["POPULASI", "POPULATION"]);

        const result = [];
        const seen = new Set();

        for (let i = headerRow + 1; i < rows.length; i++) {
            const r = rows[i] || [];
            const id = String(idIdx >= 0 ? r[idIdx] : "").trim();
            const lat = coordinate(latIdx >= 0 ? r[latIdx] : "");
            const lng = coordinate(lngIdx >= 0 ? r[lngIdx] : "");
            if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
            if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
            if (seen.has(id)) continue;
            seen.add(id);

            result.push({
                type,
                id,
                name:String(nameIdx >= 0 ? r[nameIdx] : id).trim() || id,
                lat,
                lng,
                sdp:String(sdpIdx >= 0 ? r[sdpIdx] : "").trim(),
                dse:String(dseIdx >= 0 ? r[dseIdx] : "").trim(),
                kec:String(kecIdx >= 0 ? r[kecIdx] : "").trim(),
                height:String(heightIdx >= 0 ? r[heightIdx] : "").trim(),
                antenna:String(antennaIdx >= 0 ? r[antennaIdx] : "").trim(),
                bandwidth:String(bandwidthIdx >= 0 ? r[bandwidthIdx] : "").trim(),
                eut:String(eutIdx >= 0 ? r[eutIdx] : "").trim(),
                population:String(popIdx >= 0 ? r[popIdx] : "").trim()
            });
        }
        return result;
    }

    function markerSiteIcon() {
        return L.divIcon({
            className:"final-site-marker",
            html:'<div style="width:22px;height:22px;border-radius:50%;background:#E51B4B;border:3px solid #fff;box-shadow:0 2px 7px rgba(23,34,54,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;"><i class="fa-solid fa-tower-cell"></i></div>',
            iconSize:[22,22],
            iconAnchor:[11,11]
        });
    }

    function markerOutletIcon() {
        return L.divIcon({
            className:"final-outlet-marker",
            html:'<div style="width:13px;height:13px;border-radius:50%;background:#FFD600;border:2px solid #fff;box-shadow:0 2px 6px rgba(23,34,54,.35);"></div>',
            iconSize:[13,13],
            iconAnchor:[6.5,6.5]
        });
    }

    function popup(item) {
        if (item.type === "site") {
            return `
                <div style="font-family:Inter,Segoe UI,Arial,sans-serif;min-width:190px;">
                    <div style="font-size:11px;font-weight:900;color:#E51B4B;margin-bottom:4px;">SITE ${item.id}</div>
                    <div style="font-size:12px;font-weight:900;color:#172236;margin-bottom:7px;">${item.name}</div>
                    <div style="font-size:9px;color:#64748B;line-height:1.55;">
                        ${item.kec ? `<b>Kecamatan:</b> ${item.kec}<br>` : ""}
                        ${item.sdp ? `<b>SDP:</b> ${item.sdp}<br>` : ""}
                        ${item.dse ? `<b>DSE:</b> ${item.dse}<br>` : ""}
                        ${item.height ? `<b>Height Tower:</b> ${item.height}<br>` : ""}
                        ${item.antenna ? `<b>Height Antenna:</b> ${item.antenna}<br>` : ""}
                        ${item.bandwidth ? `<b>Bandwidth:</b> ${item.bandwidth}<br>` : ""}
                        ${item.eut ? `<b>EUT Status:</b> ${item.eut}<br>` : ""}
                        ${item.population ? `<b>Populasi:</b> ${item.population}` : ""}
                    </div>
                </div>`;
        }
        return `
            <div style="font-family:Inter,Segoe UI,Arial,sans-serif;min-width:170px;">
                <div style="font-size:11px;font-weight:900;color:#D2A900;margin-bottom:4px;">OUTLET ${item.id}</div>
                <div style="font-size:12px;font-weight:900;color:#172236;margin-bottom:7px;">${item.name}</div>
                <div style="font-size:9px;color:#64748B;line-height:1.55;">
                    ${item.kec ? `<b>Kecamatan:</b> ${item.kec}<br>` : ""}
                    ${item.sdp ? `<b>SDP:</b> ${item.sdp}<br>` : ""}
                    ${item.dse ? `<b>DSE:</b> ${item.dse}<br>` : ""}
                    ${item.siteId ? `<b>Site ID:</b> ${item.siteId}` : ""}
                </div>
            </div>`;
    }

    function showMapError(message) {
        const el = document.getElementById("executiveCommandMap");
        if (!el) return;
        el.innerHTML = `<div class="final-map-status"><i class="fa-solid fa-triangle-exclamation" style="color:#E51B4B;font-size:18px;"></i><br>${message}</div>`;
    }

    async function loadFinalMap() {
        const mapEl = document.getElementById("executiveCommandMap");
        if (!mapEl || finalMapLoaded || finalMapBooted) return;
        finalMapBooted = true;

        loadLeaflet(async () => {
            try {
                if (!window.XLSX) throw new Error("XLSX library belum tersedia.");
                const response = await fetch("SITE PROFIL BENGKAYANG.xlsx", { cache:"no-store" });
                if (!response.ok) throw new Error("SITE PROFIL BENGKAYANG.xlsx tidak dapat diakses.");
                const buffer = await response.arrayBuffer();
                const wb = XLSX.read(buffer, { type:"array" });
                const siteSheet = wb.Sheets[wb.SheetNames.find(s => normalizeHeader(s) === "SITE") || wb.SheetNames[0]];
                const outletSheet = wb.Sheets[wb.SheetNames.find(s => normalizeHeader(s) === "OUTLET")];
                let sites = sheetLocations(siteSheet, "site");
                const outlets = sheetLocations(outletSheet, "outlet");

                /*
                 * MAP SOURCE RULE:
                 * Only show Site IDs that are actually present in
                 * SITE MONITORING.xlsx. This keeps the map aligned
                 * with the monitored Site list and removes non-monitor
                 * locations such as 20BEK0049 / RODAYA_BEK_PL.
                 */
                try {
                    const monitorResponse = await fetch("SITE MONITORING.xlsx", { cache:"no-store" });
                    if (monitorResponse.ok) {
                        const monitorBuffer = await monitorResponse.arrayBuffer();
                        const monitorWb = XLSX.read(monitorBuffer, { type:"array" });
                        const monitorSheet = monitorWb.Sheets[monitorWb.SheetNames[0]];
                        const monitorRows = XLSX.utils.sheet_to_json(monitorSheet, { header:1, raw:true, defval:"" });
                        const monitorHeaderRow = monitorRows.findIndex(r =>
                            r.map(normalizeHeader).includes("SITE ID")
                        );
                        if (monitorHeaderRow >= 0) {
                            const monitorHeaders = monitorRows[monitorHeaderRow].map(normalizeHeader);
                            const monitorSiteIdIdx = monitorHeaders.indexOf("SITE ID");
                            const monitoredSiteIds = new Set();
                            for (let i = monitorHeaderRow + 1; i < monitorRows.length; i++) {
                                const id = String(monitorRows[i]?.[monitorSiteIdIdx] ?? "").trim().toUpperCase();
                                if (id) monitoredSiteIds.add(id);
                            }
                            sites = sites.filter(site => monitoredSiteIds.has(String(site.id).trim().toUpperCase()));
                        }
                    }
                } catch (monitorError) {
                    console.warn("SITE MONITORING filter tidak dapat dimuat; menggunakan Site Profil.", monitorError);
                }

                // Explicit safety exclusion requested: RODAYA_BEK_PL / 20BEK0049.
                sites = sites.filter(site => String(site.id).trim().toUpperCase() !== "20BEK0049");

                if (!sites.length && !outlets.length) throw new Error("Tidak ada koordinat Site/Outlet yang valid.");

                mapEl.innerHTML = `
                    <div id="executiveFinalLeafletMap" style="width:100%;height:100%;"></div>
                    <div class="final-map-legend">
                        <span><i class="fa-solid fa-tower-cell final-map-tower"></i> Site Tower</span>
                        <span><i class="final-map-dot"></i> Outlet</span>
                    </div>`;

                finalMap = L.map("executiveFinalLeafletMap", { zoomControl:true, preferCanvas:true });
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom:19,
                    attribution:"&copy; OpenStreetMap contributors"
                }).addTo(finalMap);

                const bounds = L.latLngBounds([]);

                sites.forEach(item => {
                    const marker = L.marker([item.lat,item.lng], { icon:markerSiteIcon(), title:item.id });
                    marker.bindPopup(popup(item));
                    marker.addTo(finalMap);
                    bounds.extend([item.lat,item.lng]);
                });

                outlets.forEach(item => {
                    const marker = L.marker([item.lat,item.lng], { icon:markerOutletIcon(), title:item.name });
                    marker.bindPopup(popup(item));
                    marker.addTo(finalMap);
                    bounds.extend([item.lat,item.lng]);
                });

                finalMap._finalBounds = bounds;
                if (bounds.isValid()) finalMap.fitBounds(bounds, { padding:[16,16], maxZoom:12 });
                finalMapLoaded = true;

                const mapCard = document.getElementById("executiveCommandMapCard");
                if (mapCard) {
                    const action = mapCard.querySelector(".final-card-action");
                    if (action) action.textContent = `${sites.length} Site · ${outlets.length} Outlet`;
                }
            } catch (error) {
                console.warn("Executive map error:", error);
                showMapError("Data lokasi belum dapat dimuat. Pastikan file <b>SITE PROFIL BENGKAYANG.xlsx</b> tersedia.");
            }
        });
    }

    function finalBoot() {
        injectFinalStyle();
        ensureRseVisual();
        ensureBottomCommandCenter();
        setTimeout(loadFinalMap, 350);
    }

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(finalBoot, 500);
    });

    document.addEventListener("click", event => {
        const tab = event.target.closest("#navTabSummary, #navTabExecutiveSummary, [data-tab='all-summary-tab']");
        if (tab) setTimeout(finalBoot, 250);
    });

    setInterval(() => {
        const rse = document.getElementById(FINAL_RSE_ID);
        if (!rse) return;
        const score = readRseScore();
        const ring = rse.querySelector(".rse-ring");
        const val = rse.querySelector(".rse-ring-value");
        const status = rse.querySelector(".rse-status");
        if (ring) ring.style.setProperty("--rse-pct", Math.max(0, Math.min(100, score)));
        if (val) {
            const next = `${score.toFixed(2)}%`;
            if (val.textContent !== next) val.textContent = next;
        }
        if (status) {
            const nextStatus = score < 70 ? "Needs Attention" : "On Track";
            if (status.textContent !== nextStatus) status.textContent = nextStatus;
        }
    }, 1500);
})();

/* =========================================================
   EXECUTIVE SUMMARY — TABLE MODERNIZATION V2
   ---------------------------------------------------------
   Fokus:
   1. Target Non KPI per DSE tidak terpotong / tidak sesak
   2. Tampilan Non KPI menjadi lebih modern seperti BI card-grid
   3. RSE Scorecard lebih clean, readable, premium
   4. TIDAK mengubah data / perhitungan existing
   ========================================================= */
(function () {
    "use strict";

    const STYLE_ID = "executive-table-modern-v2";

    function injectTableModernStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            /* =====================================================
               COMMON PANEL
               ===================================================== */
            #all-summary-tab #snapshotSectionNonKpi,
            #all-summary-tab #snapshotSectionRse {
                border: 1px solid #E1E8F0 !important;
                border-radius: 15px !important;
                background: linear-gradient(180deg,#FFFFFF 0%,#FBFCFE 100%) !important;
                box-shadow: 0 5px 18px rgba(23,34,54,.055) !important;
                overflow: hidden !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .exec-panel-header-flex,
            #all-summary-tab #snapshotSectionRse .exec-panel-header-flex {
                padding: 11px 13px !important;
                min-height: 45px !important;
                border-bottom: 1px solid #E8EDF3 !important;
                background: #FFFFFF !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .exec-panel-header,
            #all-summary-tab #snapshotSectionRse .exec-panel-header {
                color: #172236 !important;
                font-size: 10.5px !important;
                font-weight: 900 !important;
                letter-spacing: .1px !important;
                line-height: 1.25 !important;
            }

            /* =====================================================
               NON KPI DSE — ANTI CUT / CARD GRID
               ===================================================== */

            #all-summary-tab #snapshotSectionNonKpi .mini-table-wrapper {
                padding: 9px 10px 10px !important;
                overflow: visible !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table {
                width: 100% !important;
                min-width: 0 !important;
                table-layout: fixed !important;
                border-collapse: separate !important;
                border-spacing: 0 5px !important;
            }

            /* Header proportions */
            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table thead th {
                background: #172236 !important;
                color: #FFFFFF !important;
                border: 0 !important;
                padding: 8px 6px !important;
                font-size: 7.5px !important;
                line-height: 1.25 !important;
                font-weight: 900 !important;
                letter-spacing: .15px !important;
                white-space: normal !important;
                vertical-align: middle !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table thead th:first-child {
                width: 25% !important;
                text-align: left !important;
                padding-left: 10px !important;
                border-radius: 8px 0 0 8px !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table thead th:nth-child(2),
            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table thead th:nth-child(3),
            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table thead th:nth-child(4) {
                width: 25% !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table thead th:last-child {
                border-radius: 0 8px 8px 0 !important;
            }

            /* Each DSE becomes a clean white row/card */
            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table tbody tr {
                background: #FFFFFF !important;
                box-shadow: 0 2px 8px rgba(23,34,54,.045) !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table tbody td {
                background: #FFFFFF !important;
                border-top: 1px solid #E8EDF3 !important;
                border-bottom: 1px solid #E8EDF3 !important;
                border-right: 1px solid #EEF2F6 !important;
                padding: 7px 6px !important;
                font-size: 7.8px !important;
                line-height: 1.25 !important;
                vertical-align: middle !important;
                overflow: visible !important;
                white-space: normal !important;
                word-break: normal !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table tbody td:first-child {
                border-left: 1px solid #E8EDF3 !important;
                border-radius: 8px 0 0 8px !important;
                color: #172236 !important;
                font-size: 8px !important;
                font-weight: 900 !important;
                text-align: left !important;
                white-space: nowrap !important;
                padding-left: 9px !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table tbody td:last-child {
                border-radius: 0 8px 8px 0 !important;
            }

            /* Existing progress bars inside cells */
            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table td > div:nth-child(2) {
                height: 6px !important;
                margin-top: 5px !important;
                background: #E8EEF4 !important;
                border-radius: 99px !important;
                overflow: hidden !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table td > div:nth-child(2) > div {
                height: 100% !important;
                min-width: 2px !important;
                border-radius: 99px !important;
                background: linear-gradient(90deg,#0099C8,#11B7D1) !important;
            }

            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table tbody tr:hover td {
                background: #FFFDF0 !important;
                border-color: #EAD36A !important;
            }

            /* GAP emphasis */
            #all-summary-tab #snapshotSectionNonKpi .mini-exec-table td b {
                font-weight: 900 !important;
            }

            /* =====================================================
               RSE SCORECARD — MODERN BI TABLE
               ===================================================== */

            #all-summary-tab #snapshotSectionRse .mini-table-wrapper {
                padding: 9px 10px 10px !important;
                overflow-x: auto !important;
            }

            #all-summary-tab #snapshotSectionRse .mini-exec-table {
                width: 100% !important;
                min-width: 570px !important;
                table-layout: fixed !important;
                border-collapse: separate !important;
                border-spacing: 0 !important;
                overflow: hidden !important;
                border: 1px solid #E1E8F0 !important;
                border-radius: 10px !important;
            }

            #all-summary-tab #snapshotSectionRse .mini-exec-table thead th {
                background: #172236 !important;
                color: #FFFFFF !important;
                border: 0 !important;
                padding: 7px 5px !important;
                font-size: 7.5px !important;
                font-weight: 900 !important;
                line-height: 1.2 !important;
                white-space: normal !important;
                vertical-align: middle !important;
            }

            #all-summary-tab #snapshotSectionRse .mini-exec-table thead tr:nth-child(2) th {
                background: #223149 !important;
                color: #DCE5F0 !important;
                font-size: 7px !important;
                padding: 6px 4px !important;
            }

            #all-summary-tab #snapshotSectionRse .mini-exec-table tbody td {
                background: #FFFFFF !important;
                color: #334155 !important;
                border-right: 1px solid #EDF1F5 !important;
                border-bottom: 1px solid #EDF1F5 !important;
                padding: 7px 5px !important;
                font-size: 7.8px !important;
                font-weight: 700 !important;
                line-height: 1.25 !important;
                vertical-align: middle !important;
            }

            #all-summary-tab #snapshotSectionRse .mini-exec-table tbody tr:nth-child(even) td {
                background: #F9FBFD !important;
            }

            #all-summary-tab #snapshotSectionRse .mini-exec-table tbody tr:hover td {
                background: #FFFDF0 !important;
            }

            #all-summary-tab #snapshotSectionRse .mini-exec-table tbody tr:last-child td {
                background: #172236 !important;
                color: #FFFFFF !important;
                border-bottom: 0 !important;
                font-weight: 900 !important;
            }

            #all-summary-tab #snapshotSectionRse .mini-exec-table tbody tr:last-child td b,
            #all-summary-tab #snapshotSectionRse .mini-exec-table tbody tr:last-child span {
                color: #FFD600 !important;
            }

            /* Weight badges */
            #all-summary-tab #snapshotSectionRse .badge-target {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 40px !important;
                padding: 3px 6px !important;
                border-radius: 999px !important;
                background: #FFF6C9 !important;
                color: #765C00 !important;
                border: 1px solid #E9D56C !important;
                font-size: 7px !important;
                font-weight: 900 !important;
            }

            /* Score badge */
            #all-summary-tab #snapshotSectionRse .status-badge.badge-success {
                box-shadow: 0 2px 7px rgba(8,122,75,.08) !important;
            }

            /* =====================================================
               DESKTOP — GIVE NON KPI A LITTLE MORE BREATHING ROOM
               ===================================================== */
            @media (min-width: 1000px) {
                #all-summary-tab .exec-summary-wrapper {
                    grid-template-columns: minmax(0,1.08fr) minmax(0,.92fr) !important;
                }

                #all-summary-tab #snapshotSectionNonKpi,
                #all-summary-tab #snapshotSectionRse {
                    min-width: 0 !important;
                }

                #all-summary-tab #snapshotSectionNonKpi .mini-exec-table {
                    font-size: 8px !important;
                }
            }

            /* =====================================================
               TABLET
               ===================================================== */
            @media (max-width: 999px) {
                #all-summary-tab #snapshotSectionNonKpi .mini-exec-table {
                    min-width: 600px !important;
                }

                #all-summary-tab #snapshotSectionNonKpi .mini-table-wrapper {
                    overflow-x: auto !important;
                }
            }

            /* =====================================================
               MOBILE
               ===================================================== */
            @media (max-width: 600px) {
                #all-summary-tab #snapshotSectionNonKpi .exec-panel-header-flex,
                #all-summary-tab #snapshotSectionRse .exec-panel-header-flex {
                    padding: 10px !important;
                }

                #all-summary-tab #snapshotSectionNonKpi .mini-table-wrapper,
                #all-summary-tab #snapshotSectionRse .mini-table-wrapper {
                    padding: 7px !important;
                }

                #all-summary-tab #snapshotSectionNonKpi .mini-exec-table {
                    min-width: 590px !important;
                }

                #all-summary-tab #snapshotSectionRse .mini-exec-table {
                    min-width: 570px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function bootTableModernV2() {
        injectTableModernStyle();
    }

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(bootTableModernV2, 300);
    });

    document.addEventListener("click", event => {
        const tab = event.target.closest("#navTabSummary, #navTabExecutiveSummary");
        if (tab) setTimeout(bootTableModernV2, 200);
    });
})();


/* ========================================================================== 
   COMMAND CENTER SHELL — HEADER + SIDEBAR + EXECUTIVE FILTER BAR
   --------------------------------------------------------------------------
   Visual redesign only for the Executive Summary.
   Existing report buttons and existing data functions are preserved.
   ========================================================================== */
(function () {
    "use strict";

    const SHELL_STYLE_ID = "im3-command-center-shell-style";
    const SIDEBAR_ID = "im3CommandSidebar";
    const FILTER_ID = "im3ExecutiveFilterBar";

    function injectCommandCenterShellStyle() {
        if (document.getElementById(SHELL_STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = SHELL_STYLE_ID;
        style.textContent = `
        /* ================================================================
           DESKTOP COMMAND CENTER
           ================================================================ */
        @media (min-width: 1000px) {
            body {
                background: #F3F6FA !important;
            }

            /* Fixed IM3 left navigation */
            #${SIDEBAR_ID} {
                position: fixed !important;
                z-index: 9990 !important;
                left: 0 !important;
                top: 0 !important;
                bottom: 0 !important;
                width: 145px !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                background:
                    radial-gradient(circle at 130% 56%, rgba(255,214,0,.18) 0 12%, transparent 13%),
                    linear-gradient(180deg,#0B1727 0%,#102238 58%,#142A42 100%) !important;
                border-right: 1px solid rgba(15,23,42,.14) !important;
                box-shadow: 5px 0 22px rgba(15,23,42,.12) !important;
                display: flex !important;
                flex-direction: column !important;
            }

            #${SIDEBAR_ID} .cc-brand {
                height: 168px !important;
                flex: 0 0 168px !important;
                position: relative !important;
                overflow: hidden !important;
                padding: 18px 12px 12px !important;
                box-sizing: border-box !important;
                background: linear-gradient(145deg,#FFD600 0%,#FFD600 72%,#F3C900 100%) !important;
                border-radius: 0 0 22px 0 !important;
            }

            #${SIDEBAR_ID} .cc-brand::after {
                content: "" !important;
                position: absolute !important;
                width: 90px !important;
                height: 90px !important;
                right: -48px !important;
                bottom: -42px !important;
                border: 1px solid rgba(23,34,54,.18) !important;
                border-radius: 50% !important;
                box-shadow: 0 0 0 16px rgba(23,34,54,.045),0 0 0 31px rgba(23,34,54,.035) !important;
            }

            #${SIDEBAR_ID} .cc-brand img.cc-indosat {
                display: block !important;
                width: 86px !important;
                height: 28px !important;
                object-fit: contain !important;
                object-position: left center !important;
                margin: 0 0 7px 3px !important;
                filter: none !important;
            }

            #${SIDEBAR_ID} .cc-brand img.cc-im3 {
                display: block !important;
                width: 76px !important;
                height: 48px !important;
                object-fit: contain !important;
                object-position: left center !important;
                margin: 0 0 1px 1px !important;
            }

            #${SIDEBAR_ID} .cc-brand-text {
                position: relative !important;
                z-index: 2 !important;
                color: #172236 !important;
                font-size: 10px !important;
                line-height: 1.25 !important;
                font-weight: 900 !important;
                margin-left: 5px !important;
            }

            #${SIDEBAR_ID} .cc-side-nav {
                padding: 18px 7px 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 5px !important;
            }

            #${SIDEBAR_ID} .cc-side-btn {
                width: 100% !important;
                min-height: 38px !important;
                padding: 8px 9px !important;
                box-sizing: border-box !important;
                display: flex !important;
                align-items: center !important;
                gap: 11px !important;
                border: 0 !important;
                border-radius: 9px !important;
                background: transparent !important;
                color: #E7EDF5 !important;
                font-family: Inter,"Segoe UI",Arial,sans-serif !important;
                font-size: 9px !important;
                font-weight: 800 !important;
                text-align: left !important;
                cursor: pointer !important;
                transition: .16s ease !important;
            }

            #${SIDEBAR_ID} .cc-side-btn i {
                width: 18px !important;
                flex: 0 0 18px !important;
                text-align: center !important;
                font-size: 13px !important;
                color: #DCE5F0 !important;
            }

            #${SIDEBAR_ID} .cc-side-btn:hover {
                background: rgba(255,255,255,.08) !important;
                color: #fff !important;
                transform: translateX(1px) !important;
            }

            #${SIDEBAR_ID} .cc-side-btn.active {
                background: #FFD600 !important;
                color: #172236 !important;
                box-shadow: 0 5px 12px rgba(0,0,0,.16) !important;
            }

            #${SIDEBAR_ID} .cc-side-btn.active i {
                color: #172236 !important;
            }

            #${SIDEBAR_ID} .cc-tagline {
                margin-top: auto !important;
                min-height: 260px !important;
                padding: 24px 15px 14px !important;
                box-sizing: border-box !important;
                position: relative !important;
                overflow: hidden !important;
                background:
                    radial-gradient(ellipse at 45% 95%,#263D57 0 17%,transparent 18%),
                    linear-gradient(180deg,#FFD600 0 22%,#FFD600 100%) !important;
                color: #172236 !important;
            }

            #${SIDEBAR_ID} .cc-tagline::before {
                content: "MICRO\\A CLUSTER\\A BENGKAYANG\\A " !important;
                white-space: pre !important;
                display: block !important;
                font-size: 18px !important;
                line-height: .98 !important;
                font-weight: 950 !important;
                letter-spacing: -.7px !important;
                transform: rotate(-2deg) !important;
            }

            #${SIDEBAR_ID} .cc-tagline::after {
                content: "Menghubungkan\\A Indonesia" !important;
                white-space: pre !important;
                position: absolute !important;
                left: 17px !important;
                bottom: 13px !important;
                color: #fff !important;
                font-size: 8px !important;
                line-height: 1.15 !important;
                font-weight: 900 !important;
                text-shadow: 0 1px 2px rgba(0,0,0,.28) !important;
            }

            /* Main page shifts right */
            body > .container {
                margin-left: 145px !important;
                width: calc(100% - 145px) !important;
                max-width: none !important;
                box-sizing: border-box !important;
            }

            /* Existing top nav becomes unnecessary on desktop */
            body > .container > .top-nav-bar {
                display: none !important;
            }

            /* Header: compact command-center top strip */
            body > .container > .header {
                margin: 0 !important;
                border-radius: 0 0 14px 14px !important;
                min-height: 136px !important;
                padding: 0 14px !important;
                box-shadow: 0 5px 18px rgba(23,34,54,.07) !important;
                border: 1px solid #E4EAF1 !important;
                border-top: 0 !important;
                background: #fff !important;
            }

            body > .container > .header .header-top-row {
                min-height: 74px !important;
                align-items: center !important;
            }

            body > .container > .header .header-left-brand {
                visibility: visible !important;
                width: auto !important;
                max-width: none !important;
                overflow: visible !important;
            }

            body > .container > .header .header-right-im3 {
                margin-left: auto !important;
            }

            body > .container > .header .header-bottom-row {
                min-height: 62px !important;
                align-items: center !important;
            }

            body > .container > .header .controls-left {
                visibility: hidden !important;
                width: 1px !important;
                overflow: hidden !important;
            }

            /* User/date/actions align toward the right like the mockup */
            body > .container > .header .header-top-row {
                justify-content: flex-end !important;
            }

            body > .container > .header .header-bottom-row {
                justify-content: flex-end !important;
            }

            /* Executive content */
            #all-summary-tab {
                padding: 0 10px 18px !important;
                background: #F3F6FA !important;
            }

            #all-summary-tab .exec-summary-wrapper {
                padding: 10px !important;
                margin: 0 !important;
                border-radius: 0 0 16px 16px !important;
                background: #F3F6FA !important;
                border: 0 !important;
                box-shadow: none !important;
            }

            /* Large yellow/navy command banner */
            #all-summary-tab .exec-summary-title-banner {
                min-height: 132px !important;
                height: 132px !important;
                margin: 0 0 10px !important;
                padding: 23px 24px !important;
                box-sizing: border-box !important;
                border-radius: 0 0 18px 18px !important;
                position: relative !important;
                overflow: hidden !important;
                display: flex !important;
                align-items: flex-start !important;
                background:
                    linear-gradient(110deg,#FFD600 0%,#FFD600 39%,#FFF4A6 54%,#FFFFFF 72%,#FFF8D9 100%) !important;
                box-shadow: 0 8px 20px rgba(23,34,54,.10) !important;
            }

            #all-summary-tab .exec-summary-title-banner::before {
                content: "" !important;
                position: absolute !important;
                left: 0 !important;
                bottom: -68px !important;
                width: 70% !important;
                height: 115px !important;
                background: #172236 !important;
                border-radius: 0 80% 0 0 !important;
                opacity: .98 !important;
            }

            #all-summary-tab .exec-summary-title-banner::after {
                content: "" !important;
                position: absolute !important;
                right: -80px !important;
                top: -95px !important;
                width: 360px !important;
                height: 260px !important;
                border-radius: 50% !important;
                background:
                    radial-gradient(circle at 46% 58%,rgba(23,34,54,.88) 0 7%,transparent 8%),
                    radial-gradient(circle at 46% 58%,rgba(23,34,54,.12) 0 19%,transparent 20%),
                    radial-gradient(circle at 46% 58%,rgba(23,34,54,.08) 0 31%,transparent 32%) !important;
            }

            #all-summary-tab .exec-summary-title-banner > div {
                position: relative !important;
                z-index: 5 !important;
            }

            #all-summary-tab .exec-summary-title-banner h2 {
                margin: 0 !important;
                color: #172236 !important;
                font-size: 28px !important;
                line-height: 1 !important;
                font-weight: 950 !important;
                letter-spacing: -1.2px !important;
            }

            #all-summary-tab .exec-summary-title-banner .exec-summary-sub {
                margin-top: 7px !important;
                color: #526176 !important;
                font-size: 11px !important;
                font-weight: 700 !important;
            }

            #all-summary-tab .exec-summary-title-banner .btn-snapshot-section {
                display: none !important;
            }

            /* Executive filter bar */
            #${FILTER_ID} {
                display: grid !important;
                grid-template-columns: 1.1fr 1.1fr 1fr 1fr auto !important;
                gap: 8px !important;
                align-items: end !important;
                margin: 0 0 13px !important;
                padding: 10px 11px !important;
                border: 1px solid #E0E7EF !important;
                border-radius: 12px !important;
                background: #fff !important;
                box-shadow: 0 4px 12px rgba(23,34,54,.05) !important;
            }

            #${FILTER_ID} .cc-filter-item {
                min-width: 0 !important;
            }

            #${FILTER_ID} label {
                display: block !important;
                margin: 0 0 5px 2px !important;
                color: #526176 !important;
                font-size: 8px !important;
                line-height: 1 !important;
                font-weight: 900 !important;
            }

            #${FILTER_ID} select {
                width: 100% !important;
                height: 31px !important;
                padding: 0 9px !important;
                border: 1px solid #D8E0E9 !important;
                border-radius: 8px !important;
                background: #F9FBFD !important;
                color: #172236 !important;
                font-size: 9px !important;
                font-weight: 800 !important;
                outline: none !important;
            }

            #${FILTER_ID} select:focus {
                border-color: #FFD600 !important;
                box-shadow: 0 0 0 3px rgba(255,214,0,.15) !important;
            }

            #${FILTER_ID} .cc-reset-filter {
                height: 31px !important;
                padding: 0 15px !important;
                border: 0 !important;
                border-radius: 8px !important;
                background: #FFD600 !important;
                color: #172236 !important;
                font-size: 9px !important;
                font-weight: 950 !important;
                cursor: pointer !important;
                white-space: nowrap !important;
            }

            #${FILTER_ID} .cc-reset-filter:hover {
                background: #F3C900 !important;
            }

            /* Slightly reduce whitespace after new shell */
            #snapshotSectionGlobal {
                margin-top: 0 !important;
            }
        }

        /* ================================================================
           MOBILE / TABLET — keep existing navigation and layout
           ================================================================ */
        @media (max-width: 999px) {
            #${SIDEBAR_ID} {
                display: none !important;
            }
            #${FILTER_ID} {
                display: none !important;
            }
        }
        `;
        document.head.appendChild(style);
    }

    function getImageSource(selector, fallback) {
        const img = document.querySelector(selector);
        return img ? img.getAttribute("src") : fallback;
    }

    function buildSidebar() {
        if (document.getElementById(SIDEBAR_ID)) return;

        const existingTabs = [
            { id: "navTabSummary", label: "Executive Summary", icon: "fa-house-chimney" },
            { id: "navTabPst", label: "PST", icon: "fa-chart-pie" },
            { id: "navTabMonitoring", label: "Site Monitoring", icon: "fa-desktop" },
            { id: "navTabOutlet", label: "Detail Outlet", icon: "fa-store" },
            { id: "navTabDaily", label: "GAP Daily KPI DSE", icon: "fa-chart-column" },
            { id: "navTabPartner", label: "Partner Performance", icon: "fa-users" },
            { id: "navTabTodayInstruction", label: "Today Instruction", icon: "fa-clipboard-list" }
        ];

        const sidebar = document.createElement("aside");
        sidebar.id = SIDEBAR_ID;

        const indosatSrc = getImageSource(".header-left-brand .brand-logo-box img", "input_file_14.png");
        const im3Src = getImageSource(".im3-logo-box img", "im3.png");

        sidebar.innerHTML = `
            <div class="cc-brand">
                <img class="cc-indosat" src="${indosatSrc}" alt="Indosat">
                <img class="cc-im3" src="${im3Src}" alt="IM3">
                <div class="cc-brand-text">Simpel. Jujur.<br>Nyambung Terus.</div>
            </div>
            <nav class="cc-side-nav" aria-label="Dashboard navigation"></nav>
            <div class="cc-tagline" aria-hidden="true"></div>
        `;

        const nav = sidebar.querySelector(".cc-side-nav");

        existingTabs.forEach(item => {
            const source = document.getElementById(item.id);
            if (!source) return;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "cc-side-btn";
            btn.dataset.sourceTab = item.id;
            btn.innerHTML = `<i class="fa-solid ${item.icon}"></i><span>${item.label}</span>`;

            btn.addEventListener("click", () => {
                source.click();
                syncSidebarActive(item.id);
            });

            nav.appendChild(btn);
        });

        document.body.insertBefore(sidebar, document.body.firstChild);
        syncSidebarActive("navTabSummary");
    }

    function syncSidebarActive(sourceId) {
        const sidebar = document.getElementById(SIDEBAR_ID);
        if (!sidebar) return;
        sidebar.querySelectorAll(".cc-side-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.sourceTab === sourceId);
        });
    }

    function hookOriginalTabs() {
        const map = [
            ["navTabSummary", "all-summary-tab"],
            ["navTabPst", "ms-bengkayang"],
            ["navTabMonitoring", "outlet-mc"],
            ["navTabOutlet", "detail-outlet"],
            ["navTabDaily", "daily-dse"],
            ["navTabPartner", "partner-performance"],
            ["navTabTodayInstruction", "today-instruction-tab"]
        ];

        map.forEach(([sourceId, reportId]) => {
            const source = document.getElementById(sourceId);
            if (!source || source.dataset.ccShellHooked) return;
            source.dataset.ccShellHooked = "1";
            source.addEventListener("click", () => {
                setTimeout(() => {
                    syncSidebarActive(sourceId);
                }, 30);
            });
        });
    }

    function buildExecutiveFilterBar() {
        const summary = document.getElementById("all-summary-tab");
        const title = summary?.querySelector(".exec-summary-title-banner");
        if (!summary || !title) return;
        if (document.getElementById(FILTER_ID)) return;

        const bar = document.createElement("div");
        bar.id = FILTER_ID;
        bar.innerHTML = `
            <div class="cc-filter-item">
                <label>Periode</label>
                <select id="ccExecutivePeriodFilter">
                    <option value="MTD">MTD (September 2026)</option>
                </select>
            </div>
            <div class="cc-filter-item">
                <label>Kecamatan</label>
                <select id="ccExecutiveKecamatanFilter">
                    <option value="ALL">Semua Kecamatan</option>
                </select>
            </div>
            <div class="cc-filter-item">
                <label>SDP</label>
                <select id="ccExecutiveSdpFilter">
                    <option value="ALL">Semua SDP</option>
                </select>
            </div>
            <div class="cc-filter-item">
                <label>DSE</label>
                <select id="ccExecutiveDseFilter">
                    <option value="ALL">Semua DSE</option>
                </select>
            </div>
            <button class="cc-reset-filter" type="button" id="ccExecutiveResetFilter">Reset Filter</button>
        `;

        title.insertAdjacentElement("afterend", bar);
        populateExecutiveShellFilters();
        setupExecutiveShellFilterEvents();
    }

    function uniqueValuesFrom(rows, index) {
        const set = new Set();
        if (!Array.isArray(rows)) return [];
        rows.forEach(row => {
            const value = String(row?.[index] ?? "").trim();
            if (!value || value.toUpperCase() === "NAN" || value.toUpperCase().includes("HEADER")) return;
            set.add(value);
        });
        return Array.from(set).sort((a,b) => a.localeCompare(b, "id", {numeric:true}));
    }

    function fillSelect(selectId, values, allLabel) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const current = select.value || "ALL";
        select.innerHTML = `<option value="ALL">${allLabel}</option>` + values.map(v => `<option value="${v}">${v}</option>`).join("");
        if (values.includes(current)) select.value = current;
    }

    function populateExecutiveShellFilters() {
        /* Kecamatan / SDP / DSE use existing loaded datasets where available.
           This is a presentation filter bar; existing report calculations are untouched. */
        if (typeof globalDataSM !== "undefined" && Array.isArray(globalDataSM)) {
            /* SITE MONITORING columns: SITE ID, SITE NAME, PARTNER, DSE CODE, CATEGORY ... */
            fillSelect("ccExecutiveDseFilter", uniqueValuesFrom(globalDataSM, 3), "Semua DSE");
        }

        if (typeof globalDataDO !== "undefined" && Array.isArray(globalDataDO)) {
            /* DETAIL OUTLET columns: Outlet Id, Outlet Name, DSE Code, ..., SITE ID, SDP NAME ... */
            fillSelect("ccExecutiveDseFilter", uniqueValuesFrom(globalDataDO, 2), "Semua DSE");
            fillSelect("ccExecutiveSdpFilter", uniqueValuesFrom(globalDataDO, 6), "Semua SDP");
        }

        if (typeof globalDataMS !== "undefined" && Array.isArray(globalDataMS)) {
            /* Market Share / PST data commonly keeps Kecamatan in column 0. */
            fillSelect("ccExecutiveKecamatanFilter", uniqueValuesFrom(globalDataMS, 0), "Semua Kecamatan");
        }
    }

    function setupExecutiveShellFilterEvents() {
        const dse = document.getElementById("ccExecutiveDseFilter");
        const reset = document.getElementById("ccExecutiveResetFilter");
        const existingDse = document.getElementById("execDseFilter");

        if (dse) {
            dse.addEventListener("change", () => {
                if (existingDse) {
                    existingDse.value = dse.value === "ALL" ? "ALL" : dse.value;
                    existingDse.dispatchEvent(new Event("change", { bubbles: true }));
                }
            });
        }

        if (reset) {
            reset.addEventListener("click", () => {
                ["ccExecutivePeriodFilter","ccExecutiveKecamatanFilter","ccExecutiveSdpFilter","ccExecutiveDseFilter"].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = "ALL";
                });
                if (existingDse) {
                    existingDse.value = "ALL";
                    existingDse.dispatchEvent(new Event("change", { bubbles: true }));
                }
            });
        }
    }

    function refreshShell() {
        injectCommandCenterShellStyle();
        buildSidebar();
        hookOriginalTabs();
        buildExecutiveFilterBar();
    }

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(refreshShell, 250);
        setTimeout(refreshShell, 900);
    });

    document.addEventListener("click", event => {
        const tab = event.target.closest("#navTabSummary, #navTabExecutiveSummary, [data-tab='all-summary-tab']");
        if (tab) {
            setTimeout(refreshShell, 200);
        }
    });
})();

/* =========================================================
   IM3 COMMAND CENTER V4 — COMPACT HEADER + KPI/TABLE FIX
   ========================================================= */
(function () {
    "use strict";

    const STYLE_ID = "im3-command-center-v4";

    function injectV4() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
        /* =====================================================
           A. GLOBAL HEADER — REMOVE LARGE EMPTY AREA
           User row + action row only
           ===================================================== */
        body > .container > .header {
            height: 118px !important;
            min-height: 118px !important;
            max-height: 118px !important;
            padding: 0 14px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: block !important;
        }

        body > .container > .header .header-top-row {
            height: 58px !important;
            min-height: 58px !important;
            max-height: 58px !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            box-sizing: border-box !important;
        }

        body > .container > .header .header-bottom-row {
            height: 60px !important;
            min-height: 60px !important;
            max-height: 60px !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            box-sizing: border-box !important;
            border-top: 1px solid #E8EDF3 !important;
        }

        body > .container > .header .header-left-brand,
        body > .container > .header .controls-left {
            display: none !important;
        }

        body > .container > .header .header-right-im3 {
            margin-left: auto !important;
            display: flex !important;
            align-items: center !important;
            gap: 9px !important;
        }

        body > .container > .header .header-actions {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 9px !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        body > .container > .header .header-actions .btn-export {
            height: 38px !important;
            min-height: 38px !important;
            padding: 0 15px !important;
            font-size: 12px !important;
            border-radius: 10px !important;
        }

        body > .container > .header .dark-toggle-btn {
            width: 38px !important;
            height: 38px !important;
        }

        #all-summary-tab {
            margin-top: 12px !important;
        }

        /* =====================================================
           B. KPI GLOBAL — NEVER CLIP / NEVER WRAP
           ===================================================== */
        #snapshotSectionGlobal .exec-kpi-global-grid {
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
            gap: 8px !important;
        }

        #snapshotSectionGlobal .exec-kpi-box {
            min-width: 0 !important;
            overflow: hidden !important;
            padding: 13px 10px !important;
        }

        #snapshotSectionGlobal .exec-kpi-box .box-val,
        #snapshotSectionGlobal .exec-kpi-box .kpi-main-val,
        #snapshotSectionGlobal .exec-kpi-box .m-val,
        #snapshotSectionGlobal .exec-kpi-box [class*="value"] {
            font-size: 15px !important;
            line-height: 1.05 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: clip !important;
            letter-spacing: -0.45px !important;
        }

        #snapshotSectionGlobal .exec-kpi-box.box-purple .box-val,
        #snapshotSectionGlobal .exec-kpi-box.box-purple .kpi-main-val,
        #snapshotSectionGlobal .exec-kpi-box.box-purple .m-val {
            font-size: 14px !important;
            letter-spacing: -0.6px !important;
        }

        /* =====================================================
           C. NON KPI DSE — METRIC CONTENT ONE LINE
           ===================================================== */
        #snapshotSectionNonKpi {
            min-width: 0 !important;
            overflow: hidden !important;
        }

        #snapshotSectionNonKpi .table-responsive,
        #snapshotSectionNonKpi .exec-table-wrap,
        #snapshotSectionNonKpi .exec-panel-body {
            overflow-x: hidden !important;
        }

        #snapshotSectionNonKpi table {
            width: 100% !important;
            table-layout: fixed !important;
        }

        #snapshotSectionNonKpi th {
            padding: 9px 5px !important;
            font-size: 8.5px !important;
            line-height: 1.1 !important;
            white-space: normal !important;
            word-break: normal !important;
        }

        #snapshotSectionNonKpi td {
            padding: 9px 5px !important;
            font-size: 8.7px !important;
            line-height: 1.1 !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            word-break: keep-all !important;
            overflow: hidden !important;
        }

        #snapshotSectionNonKpi td:first-child {
            font-size: 8.7px !important;
            font-weight: 900 !important;
            white-space: nowrap !important;
        }

        #snapshotSectionNonKpi td strong,
        #snapshotSectionNonKpi td b,
        #snapshotSectionNonKpi td span {
            white-space: nowrap !important;
            word-break: keep-all !important;
        }

        #snapshotSectionNonKpi .progress-bar,
        #snapshotSectionNonKpi .progress-track {
            height: 5px !important;
            margin-top: 5px !important;
        }

        /* Give Non KPI slightly more desktop width than RSE */
        @media (min-width: 1000px) {
            #all-summary-tab .exec-summary-wrapper {
                grid-template-columns: minmax(0, 1.12fr) minmax(0, .88fr) !important;
            }
        }

        /* =====================================================
           D. DETAIL OUTLET — ONE KPI ROW
           ===================================================== */
        @media (min-width: 1000px) {
            #detail-outlet-tab .kpi-grid,
            #detail-outlet-tab .detail-kpi-grid,
            #detailOutletTab .kpi-grid,
            #detailOutletTab .detail-kpi-grid {
                display: grid !important;
                grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
                gap: 10px !important;
            }

            #detail-outlet-tab .kpi-card,
            #detail-outlet-tab .exec-kpi-box,
            #detailOutletTab .kpi-card,
            #detailOutletTab .exec-kpi-box {
                min-width: 0 !important;
            }
        }

        /* =====================================================
           E. MOBILE HEADER
           ===================================================== */
        @media (max-width: 999px) {
            body > .container > .header {
                height: 82px !important;
                min-height: 82px !important;
                max-height: 82px !important;
            }

            body > .container > .header .header-top-row {
                height: 41px !important;
                min-height: 41px !important;
                max-height: 41px !important;
            }

            body > .container > .header .header-bottom-row {
                height: 41px !important;
                min-height: 41px !important;
                max-height: 41px !important;
            }

            body > .container > .header .header-actions .btn-export {
                height: 32px !important;
                min-height: 32px !important;
                padding: 0 9px !important;
                font-size: 10px !important;
            }

            body > .container > .header .dark-toggle-btn {
                width: 32px !important;
                height: 32px !important;
            }

            #snapshotSectionGlobal .exec-kpi-global-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
        }
        `;

        document.head.appendChild(style);
    }

    function bootV4() {
        injectV4();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootV4, { once: true });
    } else {
        bootV4();
    }

    window.addEventListener("load", bootV4);
})();

/* =========================================================
   IM3 COMMAND CENTER V5 — FINAL UI FIX
   ---------------------------------------------------------
   1. Header benar-benar compact: User row + Action row
   2. Periode Executive dibuat INPUT MANUAL
   3. KPI Global angka tidak turun / tidak terpotong
   4. Target Non KPI per DSE: isi metric dibuat 2 baris yang rapi
   5. Detail Outlet: 5 KPI satu baris desktop
   6. Tidak mengubah sumber data / kalkulasi existing
   ========================================================= */
(function () {
    "use strict";

    const STYLE_ID = "im3-command-center-v5-final-fix";

    function injectV5Style() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
        /* =====================================================
           1. GLOBAL HEADER — COMPACT, NO LARGE EMPTY SPACE
           ===================================================== */
        @media (min-width: 1000px) {
            body > .container > .header {
                position: relative !important;
                height: 112px !important;
                min-height: 112px !important;
                max-height: 112px !important;
                padding: 0 14px !important;
                margin: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
            }

            body > .container > .header .header-top-row {
                position: absolute !important;
                top: 8px !important;
                right: 14px !important;
                left: 14px !important;
                width: auto !important;
                height: 45px !important;
                min-height: 45px !important;
                max-height: 45px !important;
                padding: 0 !important;
                margin: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                box-sizing: border-box !important;
            }

            body > .container > .header .header-bottom-row {
                position: absolute !important;
                right: 14px !important;
                bottom: 8px !important;
                left: 14px !important;
                width: auto !important;
                height: 45px !important;
                min-height: 45px !important;
                max-height: 45px !important;
                padding: 0 !important;
                margin: 0 !important;
                border-top: 1px solid #E8EDF3 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                box-sizing: border-box !important;
            }

            body > .container > .header .header-right-im3 {
                margin-left: auto !important;
                display: flex !important;
                align-items: center !important;
            }

            body > .container > .header .header-actions {
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 9px !important;
                margin: 0 !important;
            }

            body > .container > .header .header-actions .btn-export {
                height: 36px !important;
                min-height: 36px !important;
                padding: 0 14px !important;
                font-size: 11px !important;
                border-radius: 10px !important;
            }

            body > .container > .header .dark-toggle-btn {
                width: 36px !important;
                height: 36px !important;
            }

            #all-summary-tab {
                margin-top: 8px !important;
            }
        }

        /* =====================================================
           2. EXECUTIVE MANUAL PERIOD FIELD
           ===================================================== */
        #im3ManualPeriodWrap {
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            min-width: 170px !important;
        }

        #im3ManualPeriodWrap label {
            color: #526176 !important;
            font-size: 9px !important;
            line-height: 1 !important;
            font-weight: 900 !important;
            margin: 0 !important;
        }

        #im3ManualPeriodInput {
            width: 100% !important;
            height: 38px !important;
            box-sizing: border-box !important;
            border: 1px solid #D7E0EA !important;
            border-radius: 9px !important;
            background: #FFFFFF !important;
            color: #172236 !important;
            padding: 0 10px !important;
            font-family: Inter,"Segoe UI",Arial,sans-serif !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            outline: none !important;
        }

        #im3ManualPeriodInput:focus {
            border-color: #FFD600 !important;
            box-shadow: 0 0 0 3px rgba(255,214,0,.16) !important;
        }

        #im3ManualPeriodInput::placeholder {
            color: #94A3B8 !important;
            font-weight: 700 !important;
        }

        /* =====================================================
           3. KPI GLOBAL — NUMBERS MUST STAY ON ONE LINE
           ===================================================== */
        @media (min-width: 1000px) {
            #snapshotSectionGlobal .exec-kpi-global-grid {
                grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
                gap: 8px !important;
            }

            #snapshotSectionGlobal .exec-kpi-box {
                min-width: 0 !important;
                overflow: hidden !important;
                padding: 12px 9px !important;
            }

            #snapshotSectionGlobal .exec-kpi-box .box-val,
            #snapshotSectionGlobal .exec-kpi-box .kpi-main-val,
            #snapshotSectionGlobal .exec-kpi-box .m-val,
            #snapshotSectionGlobal .exec-kpi-box [class*="value"] {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                font-size: 14px !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: clip !important;
                letter-spacing: -0.55px !important;
            }

            #snapshotSectionGlobal .exec-kpi-box.box-red .box-val,
            #snapshotSectionGlobal .exec-kpi-box.box-yellow .box-val,
            #snapshotSectionGlobal .exec-kpi-box.box-magenta .box-val {
                font-size: 13.5px !important;
            }
        }

        /* =====================================================
           4. TARGET NON KPI — CLEAN METRIC CELLS
           ===================================================== */
        #snapshotSectionNonKpi {
            min-width: 0 !important;
            overflow: hidden !important;
        }

        #snapshotSectionNonKpi .mini-table-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            padding: 8px !important;
        }

        #snapshotSectionNonKpi .mini-exec-table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            border-collapse: separate !important;
            border-spacing: 0 5px !important;
        }

        #snapshotSectionNonKpi .mini-exec-table thead th {
            padding: 8px 5px !important;
            font-size: 7.5px !important;
            line-height: 1.15 !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
            vertical-align: middle !important;
        }

        #snapshotSectionNonKpi .mini-exec-table thead th:first-child {
            width: 25% !important;
        }

        #snapshotSectionNonKpi .mini-exec-table thead th:nth-child(2),
        #snapshotSectionNonKpi .mini-exec-table thead th:nth-child(3),
        #snapshotSectionNonKpi .mini-exec-table thead th:nth-child(4) {
            width: 25% !important;
        }

        #snapshotSectionNonKpi .mini-exec-table tbody td {
            padding: 7px 5px !important;
            font-size: 8px !important;
            line-height: 1.1 !important;
            vertical-align: middle !important;
            overflow: hidden !important;
        }

        #snapshotSectionNonKpi .non-kpi-metric {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 3px !important;
            width: 100% !important;
            min-width: 0 !important;
        }

        #snapshotSectionNonKpi .non-kpi-main {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            color: #334155 !important;
            font-size: 8px !important;
            line-height: 1.1 !important;
            font-weight: 800 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
        }

        #snapshotSectionNonKpi .non-kpi-gap {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            color: #E51B4B !important;
            font-size: 7.8px !important;
            line-height: 1 !important;
            font-weight: 900 !important;
            white-space: nowrap !important;
        }

        #snapshotSectionNonKpi .non-kpi-progress {
            width: 100% !important;
            height: 5px !important;
            margin-top: 1px !important;
            border-radius: 99px !important;
            background: #E7EDF3 !important;
            overflow: hidden !important;
        }

        #snapshotSectionNonKpi .non-kpi-progress > div {
            height: 100% !important;
            border-radius: 99px !important;
            background: linear-gradient(90deg,#0099C8,#12B5CF) !important;
        }

        #snapshotSectionNonKpi .non-kpi-dse {
            display: block !important;
            width: 100% !important;
            color: #172236 !important;
            font-size: 7.9px !important;
            line-height: 1.1 !important;
            font-weight: 900 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: clip !important;
        }

        /* =====================================================
           5. DETAIL OUTLET — FIVE KPI IN ONE DESKTOP ROW
           ===================================================== */
        @media (min-width: 1000px) {
            #detail-outlet .kpi-grid {
                display: grid !important;
                grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
                gap: 10px !important;
                width: 100% !important;
                align-items: stretch !important;
            }

            #detail-outlet .kpi-grid > .card {
                min-width: 0 !important;
                width: 100% !important;
                box-sizing: border-box !important;
                margin: 0 !important;
            }

            #detail-outlet .kpi-grid > .card .card-body {
                min-width: 0 !important;
            }

            #detail-outlet .kpi-grid > .card .kpi-main-val,
            #detail-outlet .kpi-grid > .card .kpi-main-val span {
                white-space: nowrap !important;
                font-size: 18px !important;
                line-height: 1 !important;
            }

            #detail-outlet .kpi-grid > .card .kpi-compare-row,
            #detail-outlet .kpi-grid > .card .kpi-row-info {
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: clip !important;
                font-size: 9px !important;
            }

            #detail-outlet .kpi-grid > .card .card-header-flex h3 {
                font-size: 9.5px !important;
                line-height: 1.15 !important;
                white-space: nowrap !important;
            }

            #detail-outlet .kpi-grid > .card .icon {
                width: 30px !important;
                height: 30px !important;
                min-width: 30px !important;
                font-size: 13px !important;
            }
        }

        /* =====================================================
           6. RSE SCORECARD — KEEP CLEAN / COMPACT
           ===================================================== */
        #snapshotSectionRse .mini-table-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
        }

        #snapshotSectionRse .mini-exec-table {
            width: 100% !important;
            table-layout: fixed !important;
        }

        #snapshotSectionRse .mini-exec-table th,
        #snapshotSectionRse .mini-exec-table td {
            padding: 7px 5px !important;
            line-height: 1.15 !important;
            font-size: 8px !important;
            vertical-align: middle !important;
        }

        /* =====================================================
           7. MOBILE — SAFE FALLBACK
           ===================================================== */
        @media (max-width: 999px) {
            #snapshotSectionNonKpi .mini-table-wrapper,
            #snapshotSectionRse .mini-table-wrapper {
                overflow-x: auto !important;
            }

            #snapshotSectionNonKpi .mini-exec-table {
                min-width: 620px !important;
            }

            #detail-outlet .kpi-grid {
                grid-template-columns: repeat(2, minmax(0,1fr)) !important;
            }

            #im3ManualPeriodWrap {
                min-width: 145px !important;
            }
        }
        `;

        document.head.appendChild(style);
    }

    /* =====================================================
       MANUAL PERIOD — REPLACE THE PRESENTATION SELECT ONLY
       ===================================================== */
    function buildManualPeriodField() {
        const oldSelect = document.getElementById("ccExecutivePeriodFilter");
        if (!oldSelect) return;

        if (document.getElementById("im3ManualPeriodWrap")) return;

        const wrap = document.createElement("div");
        wrap.id = "im3ManualPeriodWrap";
        wrap.className = "cc-filter-item";
        wrap.innerHTML = `
            <label for="im3ManualPeriodInput">Periode Report</label>
            <input
                id="im3ManualPeriodInput"
                type="text"
                maxlength="40"
                placeholder="Contoh: MTD - September 2026"
                autocomplete="off"
            >
        `;

        const parent = oldSelect.closest(".cc-filter-item") || oldSelect.parentElement;
        if (parent) {
            parent.replaceWith(wrap);
        }

        const input = document.getElementById("im3ManualPeriodInput");
        if (!input) return;

        const saved = localStorage.getItem("im3_manual_report_period");
        input.value = saved || "MTD - September 2026";

        input.addEventListener("input", () => {
            localStorage.setItem("im3_manual_report_period", input.value.trim());
            applyManualPeriodLabel(input.value.trim());
        });

        applyManualPeriodLabel(input.value.trim());
    }

    function applyManualPeriodLabel(value) {
        if (!value) return;

        const summary = document.getElementById("all-summary-tab");
        if (!summary) return;

        const replacements = summary.querySelectorAll(
            ".exec-section-header span, .exec-panel-header, .exec-summary-subtitle"
        );

        replacements.forEach(el => {
            if (!el.dataset.im3OriginalText) {
                el.dataset.im3OriginalText = el.textContent || "";
            }

            const original = el.dataset.im3OriginalText;
            if (/KPI GLOBAL/i.test(original)) {
                el.textContent = original.replace(/\(MTD\)/i, "(" + value + ")");
            }
            if (/Target vs Achievement \(MTD\)/i.test(original)) {
                el.textContent = original.replace(/\(MTD\)/i, "(" + value + ")");
            }
        });

        const periodBadge = document.querySelector("#im3ManualPeriodInput");
        if (periodBadge) periodBadge.title = "Periode laporan: " + value;
    }

    function replaceResetButton() {
        const oldReset = document.getElementById("ccExecutiveResetFilter");
        if (!oldReset || oldReset.dataset.im3V5Reset) return;

        const newReset = oldReset.cloneNode(true);
        newReset.dataset.im3V5Reset = "1";
        oldReset.replaceWith(newReset);

        newReset.addEventListener("click", () => {
            const input = document.getElementById("im3ManualPeriodInput");
            if (input) {
                input.value = localStorage.getItem("im3_manual_report_period") || "MTD - September 2026";
                applyManualPeriodLabel(input.value.trim());
            }

            ["ccExecutiveKecamatanFilter", "ccExecutiveSdpFilter", "ccExecutiveDseFilter"].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = "ALL";
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                }
            });
        });
    }

    /* =====================================================
       NON KPI — REFORMAT EXISTING RENDERED CONTENT
       ===================================================== */
    function formatNonKpiCells() {
        const table = document.querySelector("#snapshotSectionNonKpi .mini-exec-table");
        if (!table) return;

        table.querySelectorAll("tbody tr").forEach(row => {
            const cells = row.querySelectorAll("td");
            if (!cells.length) return;

            /* DSE name */
            const first = cells[0];
            if (first && !first.querySelector(".non-kpi-dse")) {
                const name = (first.textContent || "").replace(/\s+/g, " ").trim();
                first.innerHTML = `<span class="non-kpi-dse">${escapeHtml(name)}</span>`;
            }

            for (let i = 1; i < cells.length; i++) {
                const td = cells[i];
                if (td.dataset.im3Formatted === "1") continue;

                const progress = td.querySelector(
                    ".progress-bar-bg, .progress-track, .progress-bar"
                );

                let progressHtml = "";
                if (progress) {
                    const inner = progress.querySelector("div");
                    let width = "0%";
                    if (inner && inner.style && inner.style.width) width = inner.style.width;
                    progressHtml = `<div class="non-kpi-progress"><div style="width:${escapeAttr(width)}"></div></div>`;
                }

                const raw = (td.textContent || "").replace(/\s+/g, " ").trim();
                const parsed = parseNonKpiText(raw);
                if (!parsed) continue;

                td.innerHTML = `
                    <div class="non-kpi-metric">
                        <span class="non-kpi-main">${escapeHtml(parsed.main)}</span>
                        <span class="non-kpi-gap">${escapeHtml(parsed.gap)}</span>
                        ${progressHtml}
                    </div>
                `;
                td.dataset.im3Formatted = "1";
            }
        });
    }

    function parseNonKpiText(text) {
        if (!text) return null;

        const m = text.match(/Ach\s*:\s*([^|]+?)\s*\|\s*Target\s*:\s*([^()]+?)\s*\(\s*GAP\s*:\s*([^\)]+)\s*\)/i);
        if (!m) return null;

        return {
            main: "Ach: " + m[1].trim() + " | Target: " + m[2].trim(),
            gap: "GAP: " + m[3].trim()
        };
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttr(value) {
        return String(value ?? "0%").replace(/[^0-9.%]/g, "");
    }

    function watchNonKpi() {
        formatNonKpiCells();
        const body = document.getElementById("nonKpiTableBody");
        if (!body || body.dataset.im3Observer === "1") return;

        const observer = new MutationObserver(() => {
            setTimeout(formatNonKpiCells, 20);
        });
        observer.observe(body, { childList: true, subtree: true });
        body.dataset.im3Observer = "1";
    }

    /* =====================================================
       BOOT
       ===================================================== */
    function bootV5() {
        injectV5Style();
        buildManualPeriodField();
        replaceResetButton();
        formatNonKpiCells();
        watchNonKpi();

        setTimeout(buildManualPeriodField, 300);
        setTimeout(replaceResetButton, 300);
        setTimeout(formatNonKpiCells, 350);
        setTimeout(formatNonKpiCells, 1000);
        setTimeout(formatNonKpiCells, 1800);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootV5, { once: true });
    } else {
        bootV5();
    }

    window.addEventListener("load", bootV5);
})();

/* =========================================================
   HEADER + KPI GLOBAL ONLY — V1
   BASE: V6 STABLE
   ---------------------------------------------------------
   Scope is intentionally LIMITED to:
   1) Main header
   2) Executive Summary KPI Global
   No other dashboard section is changed here.
   ========================================================= */
(function () {
    "use strict";

    const STYLE_ID = "im3-header-kpi-only-v1";

    function injectHeaderKpiOnlyStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
        /* =====================================================
           HEADER — MATCH THE APPROVED MOCKUP
           ===================================================== */
        @media (min-width: 1000px) {
            body > .container > .header {
                height: 82px !important;
                min-height: 82px !important;
                max-height: 82px !important;
                padding: 0 14px !important;
                margin: 0 !important;
                border-radius: 0 0 18px 18px !important;
                overflow: visible !important;
                box-sizing: border-box !important;
            }

            /* Title / period stay on the left side of the white header */
            body > .container > .header .header-top-row {
                position: absolute !important;
                top: 0 !important;
                left: 14px !important;
                right: 14px !important;
                height: 48px !important;
                min-height: 48px !important;
                max-height: 48px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }

            /* Keep the existing left title/brand content where V6 places it. */
            body > .container > .header .header-left-brand {
                margin-right: auto !important;
                min-width: 0 !important;
            }

            body > .container > .header .header-right-im3 {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin-left: auto !important;
            }

            /* Action row: compact and aligned to the right */
            body > .container > .header .header-bottom-row {
                position: absolute !important;
                top: 48px !important;
                right: 14px !important;
                left: 14px !important;
                bottom: auto !important;
                width: auto !important;
                height: 34px !important;
                min-height: 34px !important;
                max-height: 34px !important;
                padding: 0 !important;
                margin: 0 !important;
                border-top: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                box-sizing: border-box !important;
            }

            body > .container > .header .controls-left {
                margin-right: auto !important;
                min-width: 0 !important;
            }

            body > .container > .header .header-actions {
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 8px !important;
                margin: 0 !important;
            }

            body > .container > .header .header-actions .btn-export {
                height: 34px !important;
                min-height: 34px !important;
                padding: 0 13px !important;
                border-radius: 10px !important;
                font-size: 10px !important;
                line-height: 1 !important;
                white-space: nowrap !important;
            }

            body > .container > .header .dark-toggle-btn {
                width: 34px !important;
                height: 34px !important;
                min-width: 34px !important;
                min-height: 34px !important;
                border-radius: 10px !important;
            }

            /* Executive Summary starts immediately under the header */
            #all-summary-tab {
                margin-top: 0 !important;
                padding-top: 0 !important;
            }

            /* =================================================
               KPI GLOBAL — 7 EQUAL CARDS / SINGLE ROW
               ================================================= */
            #snapshotSectionGlobal {
                margin-top: 0 !important;
                padding-top: 0 !important;
            }

            #snapshotSectionGlobal .exec-kpi-global-grid {
                display: grid !important;
                grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
                gap: 8px !important;
                width: 100% !important;
                align-items: stretch !important;
                box-sizing: border-box !important;
            }

            #snapshotSectionGlobal .exec-kpi-box {
                min-width: 0 !important;
                width: 100% !important;
                height: 68px !important;
                min-height: 68px !important;
                max-height: 68px !important;
                padding: 10px 10px 8px !important;
                margin: 0 !important;
                border-radius: 13px !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            }

            #snapshotSectionGlobal .exec-kpi-box .box-title,
            #snapshotSectionGlobal .exec-kpi-box .kpi-title,
            #snapshotSectionGlobal .exec-kpi-box .m-title,
            #snapshotSectionGlobal .exec-kpi-box [class*="label"] {
                font-size: 8.5px !important;
                line-height: 1.1 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }

            #snapshotSectionGlobal .exec-kpi-box .box-val,
            #snapshotSectionGlobal .exec-kpi-box .kpi-main-val,
            #snapshotSectionGlobal .exec-kpi-box .m-val,
            #snapshotSectionGlobal .exec-kpi-box [class*="value"] {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                margin-top: 4px !important;
                font-size: 14px !important;
                line-height: 1 !important;
                font-weight: 900 !important;
                letter-spacing: -0.45px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: clip !important;
            }

            #snapshotSectionGlobal .exec-kpi-box .box-growth,
            #snapshotSectionGlobal .exec-kpi-box .kpi-growth,
            #snapshotSectionGlobal .exec-kpi-box .m-growth,
            #snapshotSectionGlobal .exec-kpi-box [class*="growth"],
            #snapshotSectionGlobal .exec-kpi-box [class*="change"] {
                margin-top: 4px !important;
                font-size: 9px !important;
                line-height: 1 !important;
                white-space: nowrap !important;
            }

            /* Revenue / currency cards need a tiny size reduction only
               when the viewport is narrower, preventing clipping. */
            #snapshotSectionGlobal .exec-kpi-box.box-red .box-val,
            #snapshotSectionGlobal .exec-kpi-box.box-yellow .box-val,
            #snapshotSectionGlobal .exec-kpi-box.box-magenta .box-val,
            #snapshotSectionGlobal .exec-kpi-box.box-purple .box-val {
                font-size: 13.5px !important;
            }
        }

        /* =====================================================
           MOBILE — DO NOT CHANGE EXISTING MOBILE LAYOUT
           ===================================================== */
        @media (max-width: 999px) {
            #snapshotSectionGlobal .exec-kpi-global-grid {
                width: 100% !important;
                box-sizing: border-box !important;
            }
        }
        `;

        document.head.appendChild(style);
    }

    function bootHeaderKpiOnly() {
        injectHeaderKpiOnlyStyle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootHeaderKpiOnly, { once: true });
    } else {
        bootHeaderKpiOnly();
    }

    window.addEventListener("load", bootHeaderKpiOnly, { once: true });
})();

/* ============================================================================
   MARKET SHARE V2 PATCH
   - Executive Market Share membaca KAB MS MOM
   - Mapping KAB MS MOM: IM3 B/C/D, 3ID E/F/G, TSEL H/I/J, XLS K/L/M
   - LMTD / MTD / MoM = B/C/D, E/F/G, H/I/J, K/L/M
   - Tambah TAB PROFIL MARKET SHARE secara dinamis
   - Tidak menghapus / mengganti fungsi existing
   ============================================================================ */
(function MARKET_SHARE_V2_PATCH(){
    "use strict";

    const MS_FILE = "FB Market Share.xlsx";
    const MS_SHEET_KAB = "KAB MS MOM";
    const MS_SHEET_KEC = "KEC MS MOM ";

    const BRAND_META = {
        IM3:  { color:"#E51B4B", lt:1, mtd:2, growth:3, monthStart:29, monthEnd:33, blockStart:29 },
        "3ID": { color:"#F5B800", lt:4, mtd:5, growth:6, monthStart:40, monthEnd:44, blockStart:40 },
        TSEL: { color:"#08A9C7", lt:7, mtd:8, growth:9, monthStart:51, monthEnd:55, blockStart:51 },
        XLS:  { color:"#8B5CF6", lt:10, mtd:11, growth:12, monthStart:62, monthEnd:66, blockStart:62 }
    };

    let kabRows = [];
    let kecRows = [];
    let kabLoaded = false;
    let kecLoaded = false;
    let profileChart = null;
    let execChart = null;

    function num(v){
        if (typeof v === "number") return Number.isFinite(v) ? v : 0;
        if (typeof parseNum === "function") {
            const n = parseNum(v);
            return Number.isFinite(n) ? n : 0;
        }
        let s = String(v ?? "").trim();
        if (!s) return 0;
        s = s.replace(/%/g, "").replace(/\s/g, "");
        if (s.includes(",") && s.includes(".")) {
            s = s.replace(/\./g, "").replace(",", ".");
        } else if (s.includes(",")) {
            s = s.replace(",", ".");
        }
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    }

    function pct(v){
        const n = num(v);
        return `${(n * 100).toFixed(2)}%`;
    }

    function pctSigned(v){
        const n = num(v);
        const sign = n > 0 ? "+" : "";
        return `${sign}${(n * 100).toFixed(2)}%`;
    }

    function pctClass(v){
        return num(v) >= 0 ? "ms-positive" : "ms-negative";
    }

    function cleanText(v){
        return String(v ?? "").trim();
    }

    function monthLabel(v){
        if (v instanceof Date && !isNaN(v)) {
            return v.toLocaleDateString("en-US", {month:"short", year:"2-digit"});
        }
        const s = cleanText(v);
        if (!s) return "-";
        const d = new Date(s);
        if (!isNaN(d)) return d.toLocaleDateString("en-US", {month:"short", year:"2-digit"});
        return s;
    }

    async function readSheet(sheetName){
        const response = await fetch(MS_FILE, {cache:"no-store"});
        if (!response.ok) throw new Error(`${MS_FILE} tidak dapat diakses`);
        const buffer = await response.arrayBuffer();
        const wb = XLSX.read(buffer, {type:"array", cellDates:true});
        const actual = wb.SheetNames.find(s => cleanText(s).toUpperCase() === cleanText(sheetName).toUpperCase());
        if (!actual) throw new Error(`Sheet ${sheetName} tidak ditemukan`);
        const ws = wb.Sheets[actual];
        return XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:""});
    }

    async function loadKAB(){
        if (kabLoaded) return kabRows;
        const rows = await readSheet(MS_SHEET_KAB);
        // KAB MS MOM memiliki header data pada row Excel 3 dan data pada row 5.
        // Dalam array JS: row index 1 = LMTD/MTD/MoM, index 2 = brand, index 3 = value.
        const data = [];
        for (let i=0;i<rows.length;i++) {
            const r = rows[i] || [];
            const territory = cleanText(r[0]);
            if (!territory || territory.toUpperCase() === "TERRITORY") continue;
            if (i < 3) continue;
            data.push({
                territory,
                IM3:{lmtd:num(r[1]),mtd:num(r[2]),growth:num(r[3])},
                "3ID":{lmtd:num(r[4]),mtd:num(r[5]),growth:num(r[6])},
                TSEL:{lmtd:num(r[7]),mtd:num(r[8]),growth:num(r[9])},
                XLS:{lmtd:num(r[10]),mtd:num(r[11]),growth:num(r[12])}
            });
        }
        kabRows = data;
        kabLoaded = true;
        return data;
    }

    async function loadKEC(){
        if (kecLoaded) return kecRows;
        const rows = await readSheet(MS_SHEET_KEC);
        const data = [];
        // KEC MS MOM: header utama row Excel 4 => array index 3; data mulai row Excel 5.
        for (let i=4;i<rows.length;i++) {
            const r = rows[i] || [];
            const rawKec = cleanText(r[0]);
            if (!rawKec || rawKec.toUpperCase() === "KECAMATAN") continue;

            const kec = rawKec.split("|")[0].trim();
            if (!kec) continue;

            data.push({
                row:r,
                kecamatan:kec,
                partner:cleanText(r[1]),
                kabupaten:cleanText(r[2]),
                mtd:{
                    IM3:num(r[34]),
                    "3ID":num(r[45]),
                    TSEL:num(r[56]),
                    XLS:num(r[67])
                },
                lmtd:{
                    IM3:num(r[33]),
                    "3ID":num(r[44]),
                    TSEL:num(r[55]),
                    XLS:num(r[66])
                },
                growth:{
                    IM3:num(r[35]),
                    "3ID":num(r[46]),
                    TSEL:num(r[57]),
                    XLS:num(r[68])
                },
                monthly:{
                    IM3:{labels:r.slice(28,33).map(monthLabel), values:r.slice(28,33).map(num)},
                    "3ID":{labels:r.slice(39,44).map(monthLabel), values:r.slice(39,44).map(num)},
                    TSEL:{labels:r.slice(50,55).map(monthLabel), values:r.slice(50,55).map(num)},
                    XLS:{labels:r.slice(61,66).map(monthLabel), values:r.slice(61,66).map(num)}
                }
            });
        }
        kecRows = data;
        kecLoaded = true;
        return data;
    }

    function getCurrentKab(){
        return kabRows.find(r => cleanText(r.territory).toUpperCase() === "MC-BENGKAYANG") || kabRows[0] || null;
    }

    function renderExecutiveMarketShareV2(kab){
        const container = document.getElementById("executiveMarketShareContainer");
        if (!container || !kab) return;

        const brands = ["IM3","3ID","TSEL","XLS"];
        container.innerHTML = `
            <div class="ms-v2-content">
                <div class="ms-v2-kpi-grid">
                    ${brands.map(b => `
                        <div class="ms-v2-kpi" style="border-top:3px solid ${BRAND_META[b].color}">
                            <span>${b}</span>
                            <b>${pct(kab[b].mtd)}</b>
                            <small class="${pctClass(kab[b].growth)}">${pctSigned(kab[b].growth)} MoM</small>
                        </div>
                    `).join("")}
                </div>
                <div class="ms-v2-chart-title">MTD vs LMTD · MoM Growth</div>
                <div class="ms-v2-chart-wrap"><canvas id="executiveMarketShareV2Chart"></canvas></div>
                <div class="ms-footnote">Sumber: FB Market Share.xlsx · KAB MS MOM · MTD vs LMTD</div>
            </div>
        `;

        const canvas = document.getElementById("executiveMarketShareV2Chart");
        if (!canvas || typeof Chart === "undefined") return;
        if (execChart) execChart.destroy();

        const labels = ["LMTD","MTD"];
        execChart = new Chart(canvas.getContext("2d"), {
            type:"line",
            data:{
                labels:brands,
                datasets:[
                    {
                        label:"LMTD",
                        data:brands.map(b=>kab[b].lmtd*100),
                        borderColor:"#94A3B8",
                        backgroundColor:"transparent",
                        borderDash:[6,5],
                        borderWidth:1.8,
                        pointRadius:3,
                        pointBackgroundColor:"#94A3B8",
                        tension:.25
                    },
                    {
                        label:"MTD",
                        data:brands.map(b=>kab[b].mtd*100),
                        borderColor:"#E51B4B",
                        backgroundColor:"transparent",
                        borderWidth:3,
                        pointRadius:4,
                        pointBackgroundColor:brands.map(b=>BRAND_META[b].color),
                        pointBorderColor:"#FFFFFF",
                        pointBorderWidth:1.5,
                        tension:.25
                    }
                ]
            },
            options:{
                responsive:true,
                maintainAspectRatio:false,
                plugins:{
                    legend:{display:true,position:"bottom",labels:{usePointStyle:true,boxWidth:7,font:{size:8,weight:"700"}}},
                    tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${Number(c.raw).toFixed(2)}%`}}
                },
                scales:{
                    x:{grid:{display:false},ticks:{font:{size:8,weight:"700"}}},
                    y:{beginAtZero:true,suggestedMax:50,ticks:{callback:v=>`${v}%`,font:{size:8}},grid:{color:"rgba(148,163,184,.13)"}}
                }
            }
        });
    }

    async function bootExecutiveMS(){
        try {
            const rows = await loadKAB();
            const kab = rows.find(r => cleanText(r.territory).toUpperCase() === "MC-BENGKAYANG") || getCurrentKab();
            if (kab) renderExecutiveMarketShareV2(kab);
        } catch(err) {
            console.warn("Market Share V2 Executive:",err);
        }
    }

    function injectProfileTab(){
        if (document.getElementById("navTabMarketProfile")) return;
        const nav = document.getElementById("mainReportTabsContainer");
        if (!nav) return;

        const btn = document.createElement("button");
        btn.className = "tab-btn";
        btn.id = "navTabMarketProfile";
        btn.innerHTML = '<i class="fa-solid fa-ranking-star"></i> Profil Market Share';
        btn.onclick = function(){ switchReport("market-share-profile", btn); renderMarketShareProfile(); };
        nav.appendChild(btn);

        const todayBtn = document.getElementById("navTabTodayInstruction");
        if (todayBtn && todayBtn.parentNode === nav) nav.insertBefore(btn, todayBtn);

        const currentUser = localStorage.getItem("logged_in_user");
        if (currentUser && typeof ALLOWED_USERS !== "undefined" && ALLOWED_USERS[currentUser]?.type === "dse") {
            btn.style.display = "none";
        }
    }

    function injectProfileSection(){
        if (document.getElementById("market-share-profile")) return;
        const footer = document.querySelector(".dashboard-footer");
        if (!footer) return;

        const el = document.createElement("div");
        el.id = "market-share-profile";
        el.className = "report-content ms-profile-page";
        el.style.display = "none";
        el.innerHTML = `
            <div class="exec-summary-wrapper ms-profile-wrapper">
                <div class="ms-profile-head">
                    <div>
                        <div class="ms-profile-title"><i class="fa-solid fa-ranking-star"></i> PROFIL MARKET SHARE</div>
                        <div class="ms-profile-sub">Analisis Market Share Kecamatan · KAB MS MOM & KEC MS MOM</div>
                    </div>
                    <button class="btn-snapshot-section" onclick="takeSectionSnapshot('market-share-profile')"><i class="fa-solid fa-camera"></i> Snapshot</button>
                </div>

                <div class="ms-profile-filters">
                    <div><label>Kecamatan</label><select id="msProfileKec"></select></div>
                    <div><label>Brand</label><select id="msProfileBrand">
                        <option value="IM3">IM3</option><option value="3ID">3ID</option><option value="TSEL">TSEL</option><option value="XLS">XLS</option>
                    </select></div>
                </div>

                <div class="ms-profile-kpi-grid" id="msProfileKpiGrid"></div>

                <div class="ms-profile-analysis-grid">
                    <div class="exec-card-panel border-top-yellow">
                        <div class="exec-panel-header">TOP & BOTTOM KECAMATAN — MTD</div>
                        <div class="ms-topbottom-grid">
                            <div class="ms-rank-card"><h4><i class="fa-solid fa-arrow-up"></i> TOP 3 MTD</h4><div id="msTopMtd"></div></div>
                            <div class="ms-rank-card"><h4><i class="fa-solid fa-arrow-down"></i> BOTTOM 3 MTD</h4><div id="msBottomMtd"></div></div>
                        </div>
                    </div>
                    <div class="exec-card-panel border-top-red">
                        <div class="exec-panel-header">TOP & BOTTOM KECAMATAN — GROWTH</div>
                        <div class="ms-topbottom-grid">
                            <div class="ms-rank-card"><h4><i class="fa-solid fa-arrow-trend-up"></i> TOP 3 POSITIVE</h4><div id="msTopGrowth"></div></div>
                            <div class="ms-rank-card"><h4><i class="fa-solid fa-arrow-trend-down"></i> TOP 3 NEGATIVE</h4><div id="msBottomGrowth"></div></div>
                        </div>
                    </div>
                </div>

                <div class="exec-card-panel border-top-cyan ms-profile-chart-card">
                    <div class="exec-panel-header-flex">
                        <div>
                            <div class="exec-panel-header"><i class="fa-solid fa-chart-line color-cyan"></i> MONTHLY PERFORMANCE</div>
                            <div class="analysis-subtitle" id="msProfileChartSubtitle">MTD vs LMTD & Growth</div>
                        </div>
                    </div>
                    <div class="ms-profile-chart-wrap"><canvas id="msProfileChart"></canvas></div>
                </div>

                <div class="ms-profile-table-wrap">
                    <div class="exec-panel-header">DETAIL KECAMATAN</div>
                    <div class="mini-table-wrapper"><table class="mini-exec-table" id="msProfileDetailTable"></table></div>
                </div>
            </div>
        `;
        footer.parentNode.insertBefore(el, footer);

        const kecSelect = document.getElementById("msProfileKec");
        const brandSelect = document.getElementById("msProfileBrand");
        if (kecSelect) kecSelect.onchange = renderMarketShareProfile;
        if (brandSelect) brandSelect.onchange = renderMarketShareProfile;
    }

    function fillKecFilter(){
        const sel = document.getElementById("msProfileKec");
        if (!sel || !kecRows.length) return;
        const current = sel.value;
        const names = [...new Set(kecRows.map(r=>r.kecamatan))].sort((a,b)=>a.localeCompare(b,"id"));
        sel.innerHTML = `<option value="ALL">Semua Kecamatan</option>` + names.map(k=>`<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join("");
        if (names.includes(current)) sel.value=current;
    }

    function escapeHtml(v){
        return String(v??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
    }

    function rankHtml(items, emptyText){
        if (!items.length) return `<div class="ms-rank-empty">${emptyText}</div>`;
        return items.map((r,i)=>`
            <div class="ms-rank-row">
                <span class="ms-rank-no">${i+1}</span>
                <span class="ms-rank-name">${escapeHtml(r.kecamatan)}</span>
                <b class="${r.value>=0?'ms-positive':'ms-negative'}">${pctSigned(r.value)}</b>
            </div>
        `).join("");
    }

    function rankMtdHtml(items){
        if (!items.length) return `<div class="ms-rank-empty">Tidak ada data</div>`;
        return items.map((r,i)=>`
            <div class="ms-rank-row">
                <span class="ms-rank-no">${i+1}</span>
                <span class="ms-rank-name">${escapeHtml(r.kecamatan)}</span>
                <b>${pct(r.value)}</b>
            </div>
        `).join("");
    }

    function renderProfileKpi(row,brand){
        const grid=document.getElementById("msProfileKpiGrid");
        if(!grid||!row)return;
        const meta=BRAND_META[brand];
        grid.innerHTML=`
            <div class="ms-profile-kpi" style="border-left-color:${meta.color}"><span>MTD ${brand}</span><b>${pct(row.mtd[brand])}</b><small>Market Share saat ini</small></div>
            <div class="ms-profile-kpi" style="border-left-color:#64748B"><span>LMTD ${brand}</span><b>${pct(row.lmtd[brand])}</b><small>Periode sebelumnya</small></div>
            <div class="ms-profile-kpi ${pctClass(row.growth[brand])}" style="border-left-color:${meta.color}"><span>GROWTH ${brand}</span><b>${pctSigned(row.growth[brand])}</b><small>MTD vs LMTD</small></div>
        `;
    }

    function renderProfileChart(row,brand){
        const canvas=document.getElementById("msProfileChart");
        if(!canvas||!row||typeof Chart==="undefined")return;
        if(profileChart)profileChart.destroy();
        const meta=BRAND_META[brand];
        const m=row.monthly[brand];
        const labels=m.labels.length?m.labels:["Apr-26","May-26","Jun-26","Jul-26","Aug-26"];
        const values=m.values.map(v=>v*100);
        const lmtd=row.lmtd[brand]*100;
        const mtd=row.mtd[brand]*100;
        const growth=row.growth[brand]*100;
        profileChart=new Chart(canvas.getContext("2d"),{
            type:"line",
            data:{labels,datasets:[
                {label:`${brand} Monthly`,data:values,borderColor:meta.color,backgroundColor:"transparent",borderWidth:3,pointRadius:3,tension:.3},
                {label:"LMTD",data:labels.map(()=>lmtd),borderColor:"#94A3B8",borderDash:[6,5],borderWidth:1.6,pointRadius:0,tension:0},
                {label:"MTD",data:labels.map(()=>mtd),borderColor:"#172236",borderDash:[3,4],borderWidth:1.6,pointRadius:0,tension:0}
            ]},
            options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:"index"},plugins:{legend:{position:"bottom",labels:{usePointStyle:true,boxWidth:7,font:{size:8,weight:"700"}}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${Number(c.raw).toFixed(2)}%`}}},scales:{x:{grid:{display:false},ticks:{font:{size:8,weight:"700"}}},y:{beginAtZero:true,suggestedMax:60,ticks:{callback:v=>`${v}%`,font:{size:8}},grid:{color:"rgba(148,163,184,.13)"}}}}
        });
        const sub=document.getElementById("msProfileChartSubtitle");
        if(sub)sub.textContent=`${brand} · Monthly Performance · MTD ${pct(mtd/100)} vs LMTD ${pct(lmtd/100)} · Growth ${pctSigned(growth/100)}`;
    }

    function renderDetailTable(rows,brand){
        const table=document.getElementById("msProfileDetailTable");
        if(!table)return;
        table.innerHTML=`<thead><tr><th>Kecamatan</th><th>Partner</th><th>LMTD ${brand}</th><th>MTD ${brand}</th><th>Growth</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.kecamatan)}</td><td>${escapeHtml(r.partner)}</td><td>${pct(r.lmtd[brand])}</td><td>${pct(r.mtd[brand])}</td><td class="${pctClass(r.growth[brand])}">${pctSigned(r.growth[brand])}</td></tr>`).join("")}</tbody>`;
    }

    async function renderMarketShareProfile(){
        const page=document.getElementById("market-share-profile");
        if(!page)return;
        page.style.display="block";
        try{
            await loadKEC();
            fillKecFilter();
            const kecVal=document.getElementById("msProfileKec")?.value||"ALL";
            const brand=document.getElementById("msProfileBrand")?.value||"IM3";
            const selected=kecVal==="ALL"?kecRows:(kecRows.filter(r=>r.kecamatan===kecVal));
            let focus=selected[0]||kecRows[0];
            if(kecVal==="ALL"){
                const kab=getCurrentKab();
                if(kab){
                    focus={
                        kecamatan:"MC-BENGKAYANG",
                        partner:"All Kecamatan",
                        kabupaten:"BENGKAYANG",
                        mtd:{IM3:kab.IM3.mtd,"3ID":kab["3ID"].mtd,TSEL:kab.TSEL.mtd,XLS:kab.XLS.mtd},
                        lmtd:{IM3:kab.IM3.lmtd,"3ID":kab["3ID"].lmtd,TSEL:kab.TSEL.lmtd,XLS:kab.XLS.lmtd},
                        growth:{IM3:kab.IM3.growth,"3ID":kab["3ID"].growth,TSEL:kab.TSEL.growth,XLS:kab.XLS.growth},
                        monthly:{IM3:{labels:["LMTD","MTD"],values:[kab.IM3.lmtd,kab.IM3.mtd]},"3ID":{labels:["LMTD","MTD"],values:[kab["3ID"].lmtd,kab["3ID"].mtd]},TSEL:{labels:["LMTD","MTD"],values:[kab.TSEL.lmtd,kab.TSEL.mtd]},XLS:{labels:["LMTD","MTD"],values:[kab.XLS.lmtd,kab.XLS.mtd]}}
                    };
                }
            }
            if(focus)renderProfileKpi(focus,brand);

            const mtdRank=kecRows.map(r=>({kecamatan:r.kecamatan,value:r.mtd[brand]})).sort((a,b)=>b.value-a.value);
            const growthRank=kecRows.map(r=>({kecamatan:r.kecamatan,value:r.growth[brand]})).sort((a,b)=>b.value-a.value);
            document.getElementById("msTopMtd").innerHTML=rankMtdHtml(mtdRank.slice(0,3));
            document.getElementById("msBottomMtd").innerHTML=rankMtdHtml(mtdRank.slice(-3).reverse());
            document.getElementById("msTopGrowth").innerHTML=rankHtml(growthRank.filter(x=>x.value>0).slice(0,3),"Tidak ada growth positif");
            document.getElementById("msBottomGrowth").innerHTML=rankHtml(growthRank.filter(x=>x.value<0).slice(-3).reverse(),"Tidak ada growth negatif");
            if(focus)renderProfileChart(focus,brand);
            renderDetailTable(selected,brand);
        }catch(err){
            console.warn("Profil Market Share:",err);
            const pageBody=document.querySelector("#market-share-profile .ms-profile-wrapper");
            if(pageBody)pageBody.insertAdjacentHTML("beforeend",`<div class="ms-profile-error">Data Market Share gagal dimuat: ${escapeHtml(err.message)}</div>`);
        }
    }

    function injectStyles(){
        if(document.getElementById("market-share-v2-style"))return;
        const style=document.createElement("style");
        style.id="market-share-v2-style";
        style.textContent=`
            .ms-v2-content{width:100%;}
            .ms-v2-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:8px;}
            .ms-v2-kpi{background:#fff;border:1px solid #e4eaf1;border-radius:10px;padding:7px 8px;min-width:0;box-shadow:0 2px 8px rgba(23,34,54,.04);}
            .ms-v2-kpi span{display:block;font-size:8px;font-weight:800;color:#64748b;}
            .ms-v2-kpi b{display:block;font-size:13px;font-weight:900;color:#172236;margin-top:2px;}
            .ms-v2-kpi small{display:block;font-size:7.5px;font-weight:800;margin-top:2px;}
            .ms-v2-chart-title{font-size:8px;font-weight:800;color:#64748b;margin:4px 0;}
            .ms-v2-chart-wrap{height:150px;position:relative;}
            .ms-positive{color:#079455!important;}
            .ms-negative{color:#e51b4b!important;}
            .ms-profile-page{max-width:1440px;margin:0 auto;}
            .ms-profile-wrapper{padding:20px!important;}
            .ms-profile-head{display:flex;justify-content:space-between;align-items:center;gap:15px;padding-bottom:14px;border-bottom:1px solid #e4eaf1;margin-bottom:15px;}
            .ms-profile-title{font-size:18px;font-weight:900;color:#172236;}
            .ms-profile-title i{color:#f5b800;margin-right:6px;}
            .ms-profile-sub{font-size:10px;font-weight:600;color:#66758a;margin-top:4px;}
            .ms-profile-filters{display:grid;grid-template-columns:260px 220px;gap:10px;background:#f8fafc;border:1px solid #e4eaf1;border-radius:12px;padding:12px;margin-bottom:14px;}
            .ms-profile-filters label{display:block;font-size:9px;font-weight:800;color:#64748b;margin-bottom:5px;}
            .ms-profile-filters select{width:100%;height:34px;padding:0 10px;border:1px solid #d7dee8;border-radius:9px;background:#fff;color:#172236;font-size:10px;font-weight:800;outline:none;}
            .ms-profile-kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px;}
            .ms-profile-kpi{background:#fff;border:1px solid #e4eaf1;border-left:5px solid #172236;border-radius:12px;padding:13px 14px;min-height:88px;box-shadow:0 4px 14px rgba(23,34,54,.05);}
            .ms-profile-kpi span{display:block;font-size:9px;font-weight:900;color:#64748b;}
            .ms-profile-kpi b{display:block;font-size:21px;font-weight:900;color:#172236;margin-top:5px;}
            .ms-profile-kpi small{display:block;font-size:8px;color:#94a3b8;font-weight:700;margin-top:3px;}
            .ms-profile-analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
            .ms-topbottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
            .ms-rank-card{border:1px solid #e4eaf1;border-radius:10px;padding:9px;background:#fbfdff;}
            .ms-rank-card h4{font-size:8px;font-weight:900;color:#172236;margin:0 0 7px;}
            .ms-rank-card h4 i{margin-right:4px;color:#f5b800;}
            .ms-rank-row{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:5px;padding:6px 0;border-bottom:1px solid #eef2f6;font-size:8px;}
            .ms-rank-row:last-child{border-bottom:0;}
            .ms-rank-no{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#eef2f6;font-weight:900;color:#172236;}
            .ms-rank-name{font-weight:800;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
            .ms-rank-row b{font-weight:900;}
            .ms-rank-empty{font-size:8px;color:#94a3b8;padding:10px 0;font-weight:700;}
            .ms-profile-chart-card{margin-bottom:12px;}
            .ms-profile-chart-wrap{height:300px;position:relative;padding:8px 5px 5px;}
            .ms-profile-table-wrap{background:#fff;border:1px solid #e4eaf1;border-radius:12px;padding:12px;}
            .ms-profile-table-wrap .mini-table-wrapper{margin-top:8px;overflow:auto;}
            #msProfileDetailTable{width:100%;border-collapse:collapse;min-width:600px;font-size:9px;}
            #msProfileDetailTable th{background:#172236;color:#fff;padding:8px;text-align:left;font-size:8px;}
            #msProfileDetailTable td{padding:7px;border-bottom:1px solid #e4eaf1;font-weight:700;color:#334155;}
            .ms-profile-error{margin-top:12px;padding:12px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-size:10px;font-weight:800;}
            @media(max-width:900px){
                .ms-v2-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
                .ms-profile-filters,.ms-profile-kpi-grid,.ms-profile-analysis-grid{grid-template-columns:1fr;}
                .ms-topbottom-grid{grid-template-columns:1fr;}
                .ms-profile-chart-wrap{height:250px;}
                .ms-profile-title{font-size:15px;}
            }
        `;
        document.head.appendChild(style);
    }

    function boot(){
        injectStyles();
        injectProfileTab();
        injectProfileSection();
        setTimeout(bootExecutiveMS,500);
    }

    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
    else boot();
    window.addEventListener("load",()=>{injectProfileTab();injectProfileSection();bootExecutiveMS();},{once:true});
})();
