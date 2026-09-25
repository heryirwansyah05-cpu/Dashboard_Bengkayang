let chartPstRevLineInstance = null;
let chartPstVlrLineInstance = null;
let chartPstTertiaryLineInstance = null;
let globalHeaderMS = [], globalDataMS = [];

// ================================================================
// DYNAMIC TARGET RSE
// Target diambil dari file "Target RSE.xlsx".
// Jika target di Excel diubah, dashboard akan membaca target terbaru
// saat halaman di-refresh. Logic pencapaian tetap menggunakan
// perhitungan existing.
// ================================================================
let globalTargetRSE = {
    tradeSupply: 1616250360,
    sellInSP: 2412,
    retailerTagging: 155,
    fwa: 18,
    dseProductivity: 5
};

// LAST UPDATE RSE — sumber wajib Target RSE.xlsx!F2
let globalLastUpdateRSE = "";

function formatLastUpdateRSE(value) {
    if (value === undefined || value === null || value === "") return "-";

    if (value instanceof Date && !isNaN(value.getTime())) {
        const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
        return `${value.getDate()} ${months[value.getMonth()]} ${value.getFullYear()}`;
    }

    const raw = String(value).trim();
    if (!raw) return "-";

    const months = {
        JANUARI:"Januari", FEBRUARI:"Februari", MARET:"Maret", APRIL:"April", MEI:"Mei", JUNI:"Juni",
        JULI:"Juli", AGUSTUS:"Agustus", SEPTEMBER:"September", OKTOBER:"Oktober", NOVEMBER:"November", DESEMBER:"Desember"
    };

    return raw.replace(/\b(JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER)\b/gi, m => months[m.toUpperCase()] || m);
}

function applyLastUpdateRSEFromRows(rows) {
    // Target RSE.xlsx: F2 = baris index 1, kolom index 5.
    if (!Array.isArray(rows) || !rows[1]) return;
    globalLastUpdateRSE = formatLastUpdateRSE(rows[1][5]);
    const headerEl = document.getElementById("lastUpdateHeaderText");
    if (headerEl) headerEl.innerText = `Last Update: ${globalLastUpdateRSE}`;
    const legacyEl = document.getElementById("lastUpdateText");
    if (legacyEl) legacyEl.innerText = `Last Update : ${globalLastUpdateRSE}`;
}

function normalizeTargetLabel(value) {
    return String(value ?? "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim();
}

function readTargetNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    let s = String(value ?? "").trim();
    if (!s) return 0;

    // Mendukung angka Excel seperti "1,616,250,360", "1.616.250.360",
    // maupun angka biasa. Untuk target KPI, separator ribuan dibuang.
    s = s.replace(/RP\.?\s*/gi, "").replace(/\s/g, "");

    if (s.includes(",") && s.includes(".")) {
        // Jika format Indonesia: 1.616.250.360
        if (s.lastIndexOf(".") > s.lastIndexOf(",")) {
            s = s.replace(/,/g, "");
        } else {
            s = s.replace(/\./g, "").replace(",", ".");
        }
    } else if (s.includes(",")) {
        // Untuk target integer, koma dianggap separator ribuan.
        s = s.replace(/,/g, "");
    } else if (s.includes(".")) {
        // Jika seluruh bagian setelah titik berjumlah 3 digit, anggap ribuan.
        const parts = s.split(".");
        if (parts.length > 1 && parts.slice(1).every(p => /^\d{3}$/.test(p))) {
            s = parts.join("");
        }
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

function applyTargetRSEFromRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return;

    let headerRow = -1;
    let kpiCol = 0;
    let targetCol = 1;

    // Cari header "KPI" dan "TARGET" secara fleksibel.
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i] || [];
        const labels = row.map(normalizeTargetLabel);
        const k = labels.findIndex(v =>
            v === "KPI" || v.includes("KPI") || v.includes("METRIC") || v.includes("PARAMETER")
        );
        const t = labels.findIndex(v =>
            v === "TARGET" || v.includes("TARGET")
        );
        if (k !== -1 && t !== -1) {
            headerRow = i;
            kpiCol = k;
            targetCol = t;
            break;
        }
    }

    // Jika header tidak ditemukan, fallback: kolom A = KPI, B = Target.
    if (headerRow === -1) {
        headerRow = 0;
        kpiCol = 0;
        targetCol = 1;
    }

    for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const label = normalizeTargetLabel(row[kpiCol]);
        if (!label) continue;

        const value = readTargetNumber(row[targetCol]);
        if (!value && value !== 0) continue;

        if (label.includes("TRADE SUPPLY")) {
            globalTargetRSE.tradeSupply = value;
        } else if (
            label.includes("SELL IN SP") ||
            label.includes("SELL-IN SP") ||
            (label.includes("SELL IN") && label.includes("3GB"))
        ) {
            globalTargetRSE.sellInSP = value;
        } else if (
            label.includes("RETAILER TAGGING") ||
            label.includes("TAGGING")
        ) {
            globalTargetRSE.retailerTagging = value;
        } else if (
            label.includes("RGU GA FWA") ||
            label === "FWA" ||
            label.includes("FWA")
        ) {
            globalTargetRSE.fwa = value;
        } else if (
            label.includes("DSE PRODUCTIVITY") ||
            label.includes("PRODUCTIVITY")
        ) {
            globalTargetRSE.dseProductivity = value;
        }
    }
}

const pTargetRSE = (async function(){
    const candidates = [
        "./TARGET%20RSE.xlsx?v=" + Date.now(),
        "./Target%20RSE.xlsx?v=" + Date.now(),
        "./TARGET%20RSE(3).xlsx?v=" + Date.now()
    ];
    let lastError = null;
    for (const url of candidates) {
        try {
            const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
            if (res.ok) return await res.arrayBuffer();
            lastError = new Error("HTTP " + res.status + " for " + url);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error("TARGET RSE.xlsx tidak ditemukan");
})()
    .then(data => {
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            raw: true,
            defval: ""
        });

        applyTargetRSEFromRows(rows);
        applyLastUpdateRSEFromRows(rows);

        // Pastikan target dari Excel langsung diterapkan ke Executive Summary
        // setelah file Target RSE.xlsx selesai dibaca.
        if (typeof updateExecutiveSummaryNew === "function") {
            updateExecutiveSummaryNew();
        }

        console.log("Target RSE loaded:", globalTargetRSE);
    })
    .catch(err => {
        console.warn("Target RSE load fallback:", err.message);
        console.warn("Dashboard menggunakan target default existing:", globalTargetRSE);
    });

let globalHeaderSM = [], globalDataSM = [];
let globalHeaderDO = [], globalDataDO = [];
// Mapping Site ID -> Site Name + Kecamatan dari SITE PROFIL BENGKAYANG.xlsx
let siteMetaById = new Map();
let globalHeaderDailyOSA = [], globalDataDailyOSA = [];
let globalHeaderDailySP = [], globalDataDailySP = [];

let globalHeaderPP = [], globalDataPP = [];
let chartPrepaidRevPPInstance = null;
let chartPrimaryPPInstance = null;
let chartSecondaryPPInstance = null;
let chartTertiaryPPInstance = null;
let chartTradePPInstance = null;
let chartRguTradePPInstance = null;
let chartVlrSubsPPInstance = null;

let dailyOsaChartInstance = null;
let dailySpChartInstance = null;

let quickFilterTypeDO = 'ALL';
let filterUnachModeDO = false;
let currentActiveTabId = 'all-summary-tab';

// Selected DSE Sets for Multi-Select
let selectedDseSetDaily = new Set();
let selectedDseSetDO = new Set();

// DAFTAR USER YANG DIIZINKAN & ATURAN AKSESNYA
const ALLOWED_USERS = {
    "HERY IRWANSYAH": { type: "admin" },
    "SDP MONTERADO": { type: "sdp", filter: "MONTERADO" },
    "SDP JAGOI BABANG": { type: "sdp", filter: "JAGOI BABANG" },
    "DSE-BENGKAYANG01": { type: "dse", dseCode: "DSE-BENGKAYANG01" },
    "DSE1147": { type: "dse", dseCode: "DSE1147" },
    "DSE1082": { type: "dse", dseCode: "DSE1082" },
    "DSE-JAGOIBABNG02": { type: "dse", dseCode: "DSE-JAGOIBABNG02" },
    "DSE-JAGOIBABNG01": { type: "dse", dseCode: "DSE-JAGOIBABNG01" }
};

function handleUserLogin() {
    const inputVal = document.getElementById("loginUserInput").value.trim().toUpperCase();
    const errorMsg = document.getElementById("loginErrorMsg");

    if (ALLOWED_USERS[inputVal]) {
        localStorage.setItem("logged_in_user", inputVal);
        document.getElementById("loginModalOverlay").style.display = "none";
        applyUserSessionPermissions();
        location.reload();
    } else {
        if (errorMsg) errorMsg.style.display = "block";
    }
}

function handleLogout() {
    localStorage.removeItem("logged_in_user");
    location.reload();
}

function applyUserSessionPermissions() {
    const currentUser = localStorage.getItem("logged_in_user");
    if (!currentUser || !ALLOWED_USERS[currentUser]) {
        const modal = document.getElementById("loginModalOverlay");
        if (modal) modal.style.display = "flex";
        return;
    }

    const modal = document.getElementById("loginModalOverlay");
    if (modal) modal.style.display = "none";
    
    const userDisplay = document.getElementById("activeUserNameDisplay");
    if (userDisplay) userDisplay.innerText = currentUser;

    const userInfo = ALLOWED_USERS[currentUser];
    const navTabs = document.getElementById("mainReportTabsContainer");
    const rseCard = document.getElementById("snapshotSectionRse");

    if (userInfo.type === "dse") {
        if (navTabs) {
            const buttons = navTabs.getElementsByTagName("button");
            for (let btn of buttons) {
                if (btn.id !== "navTabSummary" && btn.id !== "navTabMonitoring" && btn.id !== "navTabOutlet" && btn.id !== "navTabDaily") {
                    btn.style.display = "none";
                }
            }
        }
        if (rseCard) rseCard.style.display = "none";

        setTimeout(() => {
            const execDseSel = document.getElementById("execDseFilter");
            if (execDseSel) {
                execDseSel.value = userInfo.dseCode;
                execDseSel.disabled = true;
            }
            const dseMcsel = document.getElementById("dseFilterMC");
            if (dseMcsel) {
                dseMcsel.value = userInfo.dseCode;
                dseMcsel.disabled = true;
            }

            // Lock Multi-select for DSE
            selectedDseSetDaily = new Set([userInfo.dseCode]);
            updateMultiSelectLabel('multiSelectLabelDaily', selectedDseSetDaily);
            selectedDseSetDO = new Set([userInfo.dseCode]);
            updateMultiSelectLabel('multiSelectLabelDO', selectedDseSetDO);

            updateExecutiveSummaryNew();
            updateDashboardDO();
            updateDashboardSM();
            updateDashboardDaily();
        }, 500);
    } else if (userInfo.type === "sdp") {
        if (navTabs) {
            const buttons = navTabs.getElementsByTagName("button");
            for (let btn of buttons) {
                if (btn.id === "navTabDaily") {
                    btn.style.display = "none";
                }
            }
        }

        setTimeout(() => {
            const partnerSel = document.getElementById("partnerFilter");
            if (partnerSel) {
                partnerSel.value = userInfo.filter;
                partnerSel.disabled = true;
            }
            const partnerSelMC = document.getElementById("partnerFilterMC");
            if (partnerSelMC) {
                partnerSelMC.value = userInfo.filter;
                partnerSelMC.disabled = true;
            }
            const partnerSelPP = document.getElementById("partnerFilterPP");
            if (partnerSelPP) {
                partnerSelPP.value = userInfo.filter;
                partnerSelPP.disabled = true;
            }
            updateDashboardMS();
            updateDashboardSM();
            updateDashboardPP();
            updateExecutiveSummaryNew();
        }, 500);
    } else {
        if (rseCard) rseCard.style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const savedUser = localStorage.getItem("logged_in_user");
    if (savedUser && ALLOWED_USERS[savedUser]) {
        applyUserSessionPermissions();
    } else {
        const modal = document.getElementById("loginModalOverlay");
        if (modal) modal.style.display = "flex";
    }
});

// MULTI-SELECT DROPDOWN LOGIC
function toggleMultiSelect(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    dropdown.classList.toggle("show");
}

document.addEventListener("click", function (e) {
    if (!e.target.closest('.custom-multiselect')) {
        document.querySelectorAll('.multiselect-dropdown').forEach(d => d.classList.remove('show'));
    }
});

function populateMultiSelectDse(dataRows, dropdownId, labelId, setRef, colIdx, callbackUpdate) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const valSet = new Set();
    dataRows.forEach((r) => {
        const val = r[colIdx] !== undefined && r[colIdx] !== null ? String(r[colIdx]).trim() : "";
        if (val && val !== "undefined" && val.toUpperCase() !== "NAN" && !val.toUpperCase().includes("HEADER") && !val.toUpperCase().includes("DSE CODE")) {
            valSet.add(val);
        }
    });

    const sortedList = Array.from(valSet).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));

    let html = `
        <div class="multiselect-option" style="border-bottom: 1px solid #e2e8f0; font-weight: 800;">
            <input type="checkbox" id="${dropdownId}_ALL" checked onchange="handleMultiSelectSelectAll('${dropdownId}', '${labelId}', this.checked, ${callbackUpdate.name})">
            <label for="${dropdownId}_ALL">PILIH SEMUA</label>
        </div>
    `;

    sortedList.forEach(val => {
        html += `
            <div class="multiselect-option">
                <input type="checkbox" value="${val}" class="item-chk-${dropdownId}" checked onchange="handleMultiSelectChange('${dropdownId}', '${labelId}', ${callbackUpdate.name})">
                <label>${val}</label>
            </div>
        `;
    });

    dropdown.innerHTML = html;
    setRef.clear();
    sortedList.forEach(v => setRef.add(v));
    updateMultiSelectLabel(labelId, setRef, sortedList.length);
}

function handleMultiSelectSelectAll(dropdownId, labelId, isChecked, callbackUpdate) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const checkboxes = dropdown.querySelectorAll(`.item-chk-${dropdownId}`);
    
    let targetSet = dropdownId.includes('Daily') ? selectedDseSetDaily : selectedDseSetDO;
    targetSet.clear();

    checkboxes.forEach(chk => {
        chk.checked = isChecked;
        if (isChecked) targetSet.add(chk.value);
    });

    updateMultiSelectLabel(labelId, targetSet, checkboxes.length);
    if (typeof callbackUpdate === "function") callbackUpdate();
}

function handleMultiSelectChange(dropdownId, labelId, callbackUpdate) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const checkboxes = dropdown.querySelectorAll(`.item-chk-${dropdownId}`);
    const allChk = document.getElementById(`${dropdownId}_ALL`);

    let targetSet = dropdownId.includes('Daily') ? selectedDseSetDaily : selectedDseSetDO;
    targetSet.clear();

    let checkedCount = 0;
    checkboxes.forEach(chk => {
        if (chk.checked) {
            targetSet.add(chk.value);
            checkedCount++;
        }
    });

    if (allChk) allChk.checked = (checkedCount === checkboxes.length);

    updateMultiSelectLabel(labelId, targetSet, checkboxes.length);
    if (typeof callbackUpdate === "function") callbackUpdate();
}

function updateMultiSelectLabel(labelId, setRef, totalCount = 0) {
    const labelElem = document.getElementById(labelId);
    if (!labelElem) return;

    if (setRef.size === 0) {
        labelElem.innerText = "Tidak Ada DSE Pilih";
    } else if (totalCount > 0 && setRef.size === totalCount) {
        labelElem.innerText = "Semua DSE Code";
    } else if (setRef.size === 1) {
        labelElem.innerText = Array.from(setRef)[0];
    } else {
        labelElem.innerText = `${setRef.size} DSE Terpilih`;
    }
}

// ================= ULTRA HD SNAPSHOT ENGINE =================
function takeScreenshot() {
    const container = document.querySelector(".container");
    if (!container) return;

    const snapBtns = document.querySelectorAll(".btn-snapshot-section, .btn-snapshot-table");
    snapBtns.forEach(btn => btn.style.visibility = "hidden");

    /*
       IMPORTANT: do not force html2canvas to use a 1300px viewport.
       The live dashboard is desktop-first and several CSS rules change
       at <=1100px. Forcing 1300px can make the snapshot render differently
       from the browser (including the header).
    */
    const snapshotViewportWidth = window.innerWidth >= 1000
        ? Math.max(window.innerWidth, container.scrollWidth, 1440)
        : window.innerWidth;

    html2canvas(container, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#f8fafc",
        logging: false,
        windowWidth: snapshotViewportWidth,
        windowHeight: Math.max(window.innerHeight, container.scrollHeight),
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
            /* Guarantee the Executive Summary title is present in snapshot. */
            const clonedHeaderBrand = clonedDoc.querySelector("body > .container > .header .header-left-brand");
            if (clonedHeaderBrand) {
                clonedHeaderBrand.style.setProperty("visibility", "visible", "important");
                clonedHeaderBrand.style.setProperty("display", "flex", "important");
                clonedHeaderBrand.style.setProperty("width", "auto", "important");
                clonedHeaderBrand.style.setProperty("max-width", "none", "important");
                clonedHeaderBrand.style.setProperty("overflow", "visible", "important");
            }
        }
    }).then(canvas => {
        snapBtns.forEach(btn => btn.style.visibility = "visible");
        let link = document.createElement('a');
        link.download = `Dashboard-Full-HD-${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();
    }).catch(err => {
        snapBtns.forEach(btn => btn.style.visibility = "visible");
        console.error("Snapshot error:", err);
    });
}

function takeSectionSnapshot(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const snapBtns = section.querySelectorAll(".btn-snapshot-section, .btn-snapshot-table");
    snapBtns.forEach(btn => btn.style.visibility = "hidden");

    html2canvas(section, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY
    }).then(canvas => {
        snapBtns.forEach(btn => btn.style.visibility = "visible");
        let link = document.createElement('a');
        link.download = `Snapshot-HD-${sectionId}-${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();
    }).catch(err => {
        snapBtns.forEach(btn => btn.style.visibility = "visible");
        console.error("Section snapshot error:", err);
    });
}

function takeTableSnapshotDO() {
    const tableContainer = document.querySelector("#detail-outlet .table-container");
    const table = document.getElementById("dataTableDO");
    if (!tableContainer || !table) return;

    const origContainerStyle = tableContainer.getAttribute("style") || "";
    const origTableStyle = table.getAttribute("style") || "";

    tableContainer.style.overflow = "visible";
    tableContainer.style.maxHeight = "none";
    tableContainer.style.width = "auto";
    table.style.width = table.scrollWidth + "px";

    html2canvas(table, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: table.scrollWidth + 100
    }).then(canvas => {
        tableContainer.setAttribute("style", origContainerStyle);
        table.setAttribute("style", origTableStyle);

        let link = document.createElement('a');
        link.download = `Snapshot-Detail-Outlet-Table-Full-HD-${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();
    }).catch(err => {
        tableContainer.setAttribute("style", origContainerStyle);
        table.setAttribute("style", origTableStyle);
        console.error("Table snapshot error:", err);
    });
}

function takeTableSnapshotPST() {
    const tableContainer = document.querySelector("#ms-bengkayang .table-container");
    const table = document.getElementById("dataTable");
    if (!tableContainer || !table) return;

    const origContainerStyle = tableContainer.getAttribute("style") || "";
    const origTableStyle = table.getAttribute("style") || "";

    tableContainer.style.overflow = "visible";
    tableContainer.style.maxHeight = "none";
    tableContainer.style.width = "auto";
    table.style.width = table.scrollWidth + "px";

    html2canvas(table, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: table.scrollWidth + 100
    }).then(canvas => {
        tableContainer.setAttribute("style", origContainerStyle);
        table.setAttribute("style", origTableStyle);

        let link = document.createElement('a');
        link.download = `Snapshot-PST-Table-Full-HD-${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();
    }).catch(err => {
        tableContainer.setAttribute("style", origContainerStyle);
        table.setAttribute("style", origTableStyle);
        console.error("PST Table snapshot error:", err);
    });
}

function getRemainingWorkingDaysInfo() {
    let now = new Date(); 
    let lastUpdate = new Date(now);
    lastUpdate.setDate(now.getDate() - 2); 
    
    let updateDay = lastUpdate.getDate(); 
    let currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); 
    let remainingDays = currentMonthDays - updateDay; 
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    return {
        updateDateStr: `${updateDay} ${monthNames[lastUpdate.getMonth()]} ${lastUpdate.getFullYear()}`,
        currentDayNum: now.getDate(),
        currentMonthName: monthNames[now.getMonth()],
        currentYear: now.getFullYear(),
        updateDay: updateDay,
        remainingDays: remainingDays > 0 ? remainingDays : 1
    };
}

function parseNum(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;
  let str = String(val).trim().replace(/,/g, "");
  let num = Number(str);
  return isNaN(num) ? 0 : num;
}

function updateAutoDateH2() {
    const updateText = document.getElementById("lastUpdateText");
    const headerUpdateText = document.getElementById("lastUpdateHeaderText");
    const dayCountText = document.getElementById("headerDayCountText");
    const hkInfo = getRemainingWorkingDaysInfo();
    const lastUpdateDisplay = globalLastUpdateRSE || hkInfo.updateDateStr;

    if (updateText) {
        updateText.innerText = `Last Update : ${lastUpdateDisplay}`;
    }
    if (headerUpdateText) {
        headerUpdateText.innerText = `Last Update: ${lastUpdateDisplay}`;
    }
    if (dayCountText) {
        dayCountText.innerText = `Hari ke-${hkInfo.currentDayNum} ${hkInfo.currentMonthName} ${hkInfo.currentYear}`;
    }
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const icon = document.getElementById("themeIcon");
    if (icon) {
        icon.className = document.body.classList.contains("dark-mode") ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
}

function updateProgressBarAndBadge(pct, progressId, badgeId) {
    const progressBar = document.getElementById(progressId);
    const badge = document.getElementById(badgeId);
    let safePct = Math.min(Math.max(pct, 0), 100);
    if (progressBar) progressBar.style.width = safePct.toFixed(1) + "%";
    if (badge) {
        if (pct >= 120) { badge.className = "status-badge badge-excellent"; badge.innerText = "⭐ Excellent"; }
        else if (pct >= 100) { badge.className = "status-badge badge-success"; badge.innerText = "🎯 On Target"; }
        else if (pct >= 50) { badge.className = "status-badge badge-warning"; badge.innerText = "📈 In Progress"; }
        else { badge.className = "status-badge badge-danger"; badge.innerText = "⚠️ Under Target"; }
    }
}

function animateCounter(elemId, targetVal, isCurrency = false, isPercent = false) {
    const elem = document.getElementById(elemId);
    if (!elem) return;
    let start = 0, duration = 400, stepTime = 20, steps = duration / stepTime, increment = targetVal / steps;
    let timer = setInterval(() => {
        start += increment;
        if ((increment >= 0 && start >= targetVal) || (increment < 0 && start <= targetVal)) {
            start = targetVal;
            clearInterval(timer);
        }
        if (isCurrency) elem.innerText = "Rp " + Math.round(start).toLocaleString("id-ID");
        else if (isPercent) elem.innerText = start.toFixed(1) + "%";
        else elem.innerText = Math.round(start).toLocaleString("id-ID");
    }, stepTime);
}

window.addEventListener("scroll", function () {
    const stickyBar = document.getElementById("stickyKpiBar");
    if (stickyBar) {
        if (window.scrollY > 300) stickyBar.classList.add("visible");
        else stickyBar.classList.remove("visible");
    }
});

function resetFilters(tabId) {
    const currentUser = localStorage.getItem("logged_in_user");
    const userInfo = ALLOWED_USERS[currentUser];

    const container = document.getElementById(tabId);
    if (!container) return;
    container.querySelectorAll("select").forEach(s => {
        if (userInfo && userInfo.type === "sdp" && (s.id === "partnerFilter" || s.id === "partnerFilterMC" || s.id === "partnerFilterPP")) {
            s.value = userInfo.filter;
        } else {
            s.value = "ALL";
        }
    });
    container.querySelectorAll("input[type='text'], input[type='number']").forEach(i => i.value = "");
    
    if (tabId === 'detail-outlet') {
        quickFilterTypeDO = 'ALL';
        filterUnachModeDO = false;
        populateDetailOutletLocationFilters();
        handleMultiSelectSelectAll('multiSelectDropdownDO', 'multiSelectLabelDO', true, updateDashboardDO);
    } else if (tabId === 'outlet-mc') {
        populateKecamatanSM();
    } else if (tabId === 'daily-dse') {
        handleMultiSelectSelectAll('multiSelectDropdownDaily', 'multiSelectLabelDaily', true, updateDashboardDaily);
    }

    if (tabId === 'ms-bengkayang') updateDashboardMS();
    else if (tabId === 'outlet-mc') updateDashboardSM();
    else if (tabId === 'partner-performance') updateDashboardPP();
}


// ================================================================
// SITE MASTER MAPPING
// Sumber: SITE PROFIL BENGKAYANG.xlsx
// Dipakai untuk menghubungkan:
// Site Monitoring: SITE ID -> SITE NAME -> KECAMATAN
// Detail Outlet  : SITE ID -> SITE NAME -> KECAMATAN
// ================================================================
function normalizeSiteId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeKecamatan(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // Data Excel berbentuk "LEDO|BENGKAYANG"; filter memakai nama kecamatan saja.
  return raw.split("|")[0].trim();
}

function getSiteMeta(siteId) {
  const key = normalizeSiteId(siteId);
  return siteMetaById.get(key) || { id: String(siteId ?? "").trim(), name: "", kec: "" };
}

function populateKecamatanSM() {
  const select = document.getElementById("kecamatanFilterMC");
  if (!select) return;

  const vals = new Set();
  (globalDataSM || []).forEach(r => {
    const meta = getSiteMeta(r[0]);
    if (meta.kec) vals.add(meta.kec);
  });

  const current = select.value || "ALL";
  select.innerHTML = '<option value="ALL">Semua Kecamatan</option>';
  Array.from(vals).sort((a,b) => a.localeCompare(b, 'id')).forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
  if (Array.from(vals).includes(current)) select.value = current;
}

function populateDetailOutletLocationFilters() {
  const kecSelect = document.getElementById("kecamatanFilterDO");
  const siteSelect = document.getElementById("siteFilterDO");
  if (!kecSelect || !siteSelect) return;

  const siteIdIdx = globalHeaderDO.findIndex(h => String(h || "").toUpperCase().trim() === "SITE ID");
  if (siteIdIdx === -1) {
    console.warn("SITE ID tidak ditemukan pada Detail Outlet.");
    return;
  }

  const kecVals = new Set();
  const siteMap = new Map();
  const selectedKec = kecSelect.value || "ALL";

  (globalDataDO || []).forEach(r => {
    const siteId = String(r[siteIdIdx] ?? "").trim();
    if (!siteId) return;
    const meta = getSiteMeta(siteId);
    if (!meta.kec) return;
    kecVals.add(meta.kec);
    siteMap.set(normalizeSiteId(siteId), meta);
  });

  const oldKec = selectedKec;
  kecSelect.innerHTML = '<option value="ALL">Semua Kecamatan</option>';
  Array.from(kecVals).sort((a,b) => a.localeCompare(b, 'id')).forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    kecSelect.appendChild(opt);
  });
  if (oldKec === "ALL" || kecVals.has(oldKec)) kecSelect.value = oldKec;
  else kecSelect.value = "ALL";

  const activeKec = kecSelect.value || "ALL";
  const validSites = new Map();
  siteMap.forEach((meta, id) => {
    if (activeKec === "ALL" || meta.kec === activeKec) validSites.set(id, meta);
  });

  const oldSite = siteSelect.value || "ALL";
  siteSelect.innerHTML = '<option value="ALL">Semua Site</option>';
  Array.from(validSites.entries())
    .sort((a,b) => String(a[1].name || a[0]).localeCompare(String(b[1].name || b[0]), 'id'))
    .forEach(([id, meta]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = meta.name ? `${id} - ${meta.name}` : id;
      siteSelect.appendChild(opt);
    });

  if (oldSite !== "ALL" && validSites.has(normalizeSiteId(oldSite))) {
    siteSelect.value = normalizeSiteId(oldSite);
  } else {
    siteSelect.value = "ALL";
  }
}

async function loadSiteMasterMapping() {
  const candidates = ["SITE PROFIL BENGKAYANG.xlsx", "SITE PROFIL BENGKAYANG(5).xlsx"];
  let response = null;
  for (const fileName of candidates) {
    try {
      const res = await fetch(fileName, { cache: "no-store" });
      if (res.ok) { response = res; break; }
    } catch (e) {}
  }
  if (!response) throw new Error("SITE PROFIL BENGKAYANG.xlsx tidak ditemukan.");

  const buffer = await response.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames.find(s => String(s).trim().toUpperCase() === "SITE") || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  if (!rows || !rows.length) return;

  const headerIdx = rows.findIndex(r => r && r.some(c => String(c ?? "").trim().toUpperCase() === "SITE ID"));
  if (headerIdx === -1) throw new Error("Header SITE ID pada SITE PROFIL tidak ditemukan.");

  const headers = rows[headerIdx].map(h => String(h ?? "").trim());
  const idxId = headers.findIndex(h => h.toUpperCase() === "SITE ID");
  const idxName = headers.findIndex(h => h.toUpperCase() === "SITE NAME");
  const idxKec = headers.findIndex(h => h.toUpperCase() === "KECAMATAN");
  const idxMth = headers.findIndex(h => h.toUpperCase() === "MTH");

  rows.slice(headerIdx + 1).forEach(r => {
    const id = normalizeSiteId(r[idxId]);
    if (!id) return;
    const meta = {
      id: String(r[idxId] ?? "").trim(),
      name: String(r[idxName] ?? "").trim(),
      kec: normalizeKecamatan(r[idxKec])
    };
    // Prefer row MTD when the same Site ID appears several times.
    const existing = siteMetaById.get(id);
    if (!existing || String(r[idxMth] ?? "").trim().toLowerCase() === "mtd") {
      siteMetaById.set(id, meta);
    }
  });
}

const pSiteMaster = loadSiteMasterMapping()
  .catch(e => console.warn("Site master mapping gagal dimuat:", e));

const p1 = fetch("PST.xlsx")
  .then((res) => res.arrayBuffer())
  .then((data) => {
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    if (!rawRows || rawRows.length === 0) return;
    let headerIdx = rawRows.findIndex(r => r && r.some(c => String(c).toUpperCase().includes("KECAMATAN") || String(c).toUpperCase().includes("PARTNER")));
    if (headerIdx === -1) headerIdx = 4;
    globalHeaderMS = (rawRows[headerIdx] || []).map((h) => String(h || "").replace(/\r?\n|\r/g, " ").trim());
    globalDataMS = rawRows.slice(headerIdx + 1).filter((row) => {
      if (!row || row.length === 0) return false;
      const firstVal = String(row[0] || row[1] || "").trim().toUpperCase();
      return firstVal !== "" && firstVal !== "KECAMATAN" && !firstVal.includes("TOTAL");
    });
    populateDropdown(globalDataMS, "partnerFilter", 1, "Semua Partner");
    populateDropdown(globalDataMS, "kecamatanFilter", 0, "Semua Kecamatan");
    updateDashboardMS();
  }).catch(e => console.log("PST load skip"));

const p2 = pSiteMaster.then(() => fetch("SITE MONITORING.xlsx"))
  .then((res) => res.arrayBuffer())
  .then((data) => {
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, raw: true });
    if (!rows || rows.length === 0) return;
    globalHeaderSM = (rows[0] || []).map((h) => String(h || "").replace(/\r?\n|\r/g, " ").trim());
    globalDataSM = rows.slice(1).filter(r => r.length > 0 && r[0] && String(r[0]).toUpperCase() !== "SITE ID");
    populateKecamatanSM();
    populateDropdown(globalDataSM, "partnerFilterMC", 2, "Semua Partner MC");
    populateDropdown(globalDataSM, "dseFilterMC", 3, "Semua DSE Code");
    populateDropdown(globalDataSM, "categoryFilterMC", 4, "Semua Category");
    updateDashboardSM();
  }).catch(e => console.log("SM load skip"));

const p3 = pSiteMaster.then(() => fetch("DETAIL OUTLET.xlsx"))
  .then((res) => res.arrayBuffer())
  .then((data) => {
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 4, raw: true });
    if (!rows || rows.length === 0) return;
    globalHeaderDO = (rows[0] || []).map((h) => String(h || "").replace(/\r?\n|\r/g, " ").trim());
    let targetRgugaIdx = globalHeaderDO.findIndex(h => h.toUpperCase().includes("TARGET RGUGA BIOMETRIX"));
    globalDataDO = rows.slice(1).filter(r => r.length > 0 && r[0] && String(r[0]).toUpperCase() !== "OUTLET ID").map(r => {
        let newRow = [...r];
        if (targetRgugaIdx !== -1 && newRow[targetRgugaIdx] !== undefined) {
            newRow[targetRgugaIdx] = Math.floor(parseNum(newRow[targetRgugaIdx]));
        }
        return newRow;
    });

    populateDetailOutletLocationFilters();
    populateMultiSelectDse(globalDataDO, "multiSelectDropdownDO", "multiSelectLabelDO", selectedDseSetDO, 2, updateDashboardDO);
    populateDropdown(globalDataDO, "execDseFilter", 2, "Semua DSE Code");
    populateDropdown(globalDataDO, "categoryFilterDO", 3, "Semua Category");
    populateDropdown(globalDataDO, "isimpleFilterDO", 4, "Semua ISIMPLE");
    populateColumnFilterDO();
    updateDashboardDO();
  }).catch(e => console.log("DO load skip"));

const p4 = fetch("GAP DAILY KPI DSE.xlsx")
  .then((res) => res.arrayBuffer())
  .then((data) => {
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    if (!jsonData || jsonData.length === 0) return;
    let idxOsaHeader = jsonData.findIndex(r => r && r.some(c => String(c).toUpperCase().includes("TARGET OSA")));
    let idxSpHeader = jsonData.findIndex(r => r && r.some(c => String(c).toUpperCase().includes("TARGET SP SELL IN")));
    if (idxOsaHeader !== -1) {
        let endIdx = idxSpHeader !== -1 ? idxSpHeader : jsonData.length;
        globalDataDailyOSA = jsonData.slice(idxOsaHeader + 1, endIdx).filter(r => r && r.some(c => c !== undefined && c !== null && c !== ''));
    }
    if (idxSpHeader !== -1) {
        globalDataDailySP = jsonData.slice(idxSpHeader + 1).filter(r => r && r.some(c => c !== undefined && c !== null && c !== ''));
    }
    let combinedData = globalDataDailyOSA.length > 0 ? globalDataDailyOSA : globalDataDailySP;
    populateMultiSelectDse(combinedData, "multiSelectDropdownDaily", "multiSelectLabelDaily", selectedDseSetDaily, 0, updateDashboardDaily);
    updateDashboardDaily();
  }).catch(e => console.log("GAP DAILY KPI DSE load skip"));

const p5 = fetch("PARTNER PERFORMANCE.xlsx")
  .then((res) => res.arrayBuffer())
  .then((data) => {
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, raw: true });
    if (!rows || rows.length < 5) return;
    globalHeaderPP = (rows[4] || []).map((h) => String(h || "").replace(/\r?\n|\r/g, " ").trim());
    globalDataPP = rows.slice(5).filter(r => {
        if (!r || r.length === 0 || !r[1]) return false;
        let ptName = String(r[1]).trim().toUpperCase();
        if (ptName === "PT NAME" || ptName === "NAMA PARTNER" || ptName === "PARAMETER" || ptName.includes("BENGKAYANG")) return false;
        return true;
    });
    populateDropdown(globalDataPP, "partnerFilterPP", 1, "Semua PT Partner");
    updateDashboardPP();
  }).catch(e => console.log("PP load skip"));

Promise.all([p1, p2, p3, p4, p5, pTargetRSE]).then(() => {
  updateAutoDateH2();
  updateGlobalAiHeaderSummary();
  updateExecutiveSummaryNew();
  applyUserSessionPermissions();
  const loadingElem = document.getElementById("loading");
  if (loadingElem) loadingElem.style.display = "none";
}).catch(error => {
  const loadingElem = document.getElementById("loading");
  if (loadingElem) loadingElem.style.display = "none";
});

function populateDropdown(dataRows, selectId, colIdx, defaultText) {
  const selectElem = document.getElementById(selectId);
  if (!selectElem) return;
  const valSet = new Set();
  dataRows.forEach((r) => {
    const val = r[colIdx] !== undefined && r[colIdx] !== null ? String(r[colIdx]).trim() : "";
    if (val && val !== "undefined" && val.toUpperCase() !== "NAN" && !val.toUpperCase().includes("HEADER") && !val.toUpperCase().includes("DSE CODE")) {
      valSet.add(val);
    }
  });
  selectElem.innerHTML = `<option value="ALL">${defaultText}</option>`;
  Array.from(valSet).sort((a, b) => a.localeCompare(b, 'id', { numeric: true })).forEach((val) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.innerText = val;
    selectElem.appendChild(opt);
  });
}

function populateColumnFilterDO() {
    const colSelect = document.getElementById("columnFilterDO");
    if (!colSelect || !globalHeaderDO || globalHeaderDO.length === 0) return;
    colSelect.innerHTML = `<option value="ALL">🔍 Pilih Kolom Filter (ID s/d Biometrix)</option>`;
    for (let i = 0; i <= Math.min(18, globalHeaderDO.length - 1); i++) {
        let hName = globalHeaderDO[i];
        if (hName) {
            const opt = document.createElement("option");
            opt.value = i;
            opt.innerText = `Kolom: ${hName}`;
            colSelect.appendChild(opt);
        }
    }
}

function updateGrowthBadge(elemId, currentVal, prevVal) {
    const elem = document.getElementById(elemId);
    if (!elem) return;
    let growth = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : (currentVal > 0 ? 100 : 0);
    let sign = growth >= 0 ? "+" : "";
    elem.innerText = `${sign}${growth.toFixed(1)}%`;
    if (growth >= 0) elem.className = "growth-badge growth-positive";
    else elem.className = "growth-badge growth-negative";
}

function updateDashboardMS() {
  const currentUser = localStorage.getItem("logged_in_user");
  const userInfo = ALLOWED_USERS[currentUser];
  let selectedPartner = document.getElementById("partnerFilter")?.value || "ALL";
  if (userInfo && userInfo.type === "sdp") selectedPartner = userInfo.filter;

  const selectedKecamatan = document.getElementById("kecamatanFilter")?.value || "ALL";
  const searchKeyword = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
  let idxKec = 0;
  let idxPartner = globalHeaderMS.findIndex(h => h.toUpperCase().includes("PARTNER"));

  const findCol = (name) => globalHeaderMS.findIndex(h => h.toUpperCase().includes(name));
  const idxRevMtd = findCol("REVENUE MTD"), idxRevLmtd = findCol("REVENUE LMTD");
  const idxPrimMtd = findCol("PRIMARY MTD"), idxPrimLmtd = findCol("PRIMARY LMTD");
  const idxSecMtd = findCol("SECONDARY MTD"), idxSecLmtd = findCol("SECONDARY LMTD");
  const idxTertMtd = findCol("TERTIARY B# MTD"), idxTertLmtd = findCol("TERTIARY B# LMTD");
  const idxTradeMtd = findCol("TRADE SUPPLY MTD"), idxTradeLmtd = findCol("TRADE SUPPLY LMTD");
  const idxVlrMtd = findCol("VLR SUBS MTD"), idxVlrLmtd = findCol("VLR SUBS LMTD");
  const idxRguMtd = findCol("RGUGA TRADE MTD"), idxRguLmtd = findCol("RGUGA TRADE LMTD");
  const idxSellInMtd = findCol("SP SELL IN MTD"), idxSellInLmtd = findCol("SP SELL IN LMTD");

  const filteredRows = globalDataMS.filter((r) => {
    const kecName = String(r[idxKec] || "").trim();
    const partnerName = String(r[idxPartner !== -1 ? idxPartner : 1] || "").trim();
    return (selectedPartner === "ALL" || partnerName === selectedPartner) &&
           (selectedKecamatan === "ALL" || kecName === selectedKecamatan) &&
           r.join(" ").toLowerCase().includes(searchKeyword);
  });

  let totalRevMtd=0,totalRevLmtd=0,totalPrimaryMtd=0,totalPrimaryLmtd=0,totalSecondaryMtd=0,totalSecondaryLmtd=0;
  let totalTertiaryMtd=0,totalTertiaryLmtd=0,totalTradeMtd=0,totalTradeLmtd=0,totalVlrMtd=0,totalVlrLmtd=0,totalRguMtd=0,totalRguLmtd=0,totalSellInMtd=0,totalSellInLmtd=0;
  filteredRows.forEach(r => {
    if(idxRevMtd!==-1) totalRevMtd+=parseNum(r[idxRevMtd]); if(idxRevLmtd!==-1) totalRevLmtd+=parseNum(r[idxRevLmtd]);
    if(idxPrimMtd!==-1) totalPrimaryMtd+=parseNum(r[idxPrimMtd]); if(idxPrimLmtd!==-1) totalPrimaryLmtd+=parseNum(r[idxPrimLmtd]);
    if(idxSecMtd!==-1) totalSecondaryMtd+=parseNum(r[idxSecMtd]); if(idxSecLmtd!==-1) totalSecondaryLmtd+=parseNum(r[idxSecLmtd]);
    if(idxTertMtd!==-1) totalTertiaryMtd+=parseNum(r[idxTertMtd]); if(idxTertLmtd!==-1) totalTertiaryLmtd+=parseNum(r[idxTertLmtd]);
    if(idxTradeMtd!==-1) totalTradeMtd+=parseNum(r[idxTradeMtd]); if(idxTradeLmtd!==-1) totalTradeLmtd+=parseNum(r[idxTradeLmtd]);
    if(idxVlrMtd!==-1) totalVlrMtd+=parseNum(r[idxVlrMtd]); if(idxVlrLmtd!==-1) totalVlrLmtd+=parseNum(r[idxVlrLmtd]);
    if(idxRguMtd!==-1) totalRguMtd+=parseNum(r[idxRguMtd]); if(idxRguLmtd!==-1) totalRguLmtd+=parseNum(r[idxRguLmtd]);
    if(idxSellInMtd!==-1) totalSellInMtd+=parseNum(r[idxSellInMtd]); if(idxSellInLmtd!==-1) totalSellInLmtd+=parseNum(r[idxSellInLmtd]);
  });

  animateCounter("kpiRevenuePST", totalRevMtd);
  animateCounter("kpiPrimaryPST", totalPrimaryMtd);
  animateCounter("kpiSecondaryPST", totalSecondaryMtd);
  animateCounter("kpiTertiaryPST", totalTertiaryMtd);
  animateCounter("kpiTradeSupplyPST", totalTradeMtd);
  animateCounter("kpiVlrPST", totalVlrMtd);
  animateCounter("kpiRguTradePST", totalRguMtd);
  animateCounter("kpiSpSellInPST", totalSellInMtd);

  const setText=(id,val)=>{const e=document.getElementById(id);if(e)e.innerText=val;};
  setText("kpiRevLmtdPST",Math.round(totalRevLmtd).toLocaleString("id-ID"));
  setText("kpiPrimaryLmtdPST",Math.round(totalPrimaryLmtd).toLocaleString("id-ID"));
  setText("kpiSecondaryLmtdPST",Math.round(totalSecondaryLmtd).toLocaleString("id-ID"));
  setText("kpiTertiaryLmtdPST",Math.round(totalTertiaryLmtd).toLocaleString("id-ID"));
  setText("kpiTradeLmtdPST",Math.round(totalTradeLmtd).toLocaleString("id-ID"));
  setText("kpiVlrLmtdPST",Math.round(totalVlrLmtd).toLocaleString("id-ID"));
  setText("kpiRguTradeLmtdPST",Math.round(totalRguLmtd).toLocaleString("id-ID"));
  setText("kpiSpSellInLmtdPST",Math.round(totalSellInLmtd).toLocaleString("id-ID")+" pcs");

  updateGrowthBadge("kpiRevGrowthPST",totalRevMtd,totalRevLmtd); updateGrowthBadge("kpiPrimaryGrowthPST",totalPrimaryMtd,totalPrimaryLmtd);
  updateGrowthBadge("kpiSecondaryGrowthPST",totalSecondaryMtd,totalSecondaryLmtd); updateGrowthBadge("kpiTertiaryGrowthPST",totalTertiaryMtd,totalTertiaryLmtd);
  updateGrowthBadge("kpiTradeGrowthPST",totalTradeMtd,totalTradeLmtd); updateGrowthBadge("kpiVlrGrowthPST",totalVlrMtd,totalVlrLmtd);
  updateGrowthBadge("kpiRguTradeGrowthPST",totalRguMtd,totalRguLmtd); updateGrowthBadge("kpiSpSellInGrowthPST",totalSellInMtd,totalSellInLmtd);

  const sticky=document.getElementById("stickyRev"); if(sticky) sticky.innerText="Rp "+Math.round(totalRevMtd).toLocaleString("id-ID");
  currentPstFilteredRows=filteredRows; renderPstMainLineChart(filteredRows); renderTable("dataTable",globalHeaderMS,filteredRows);
  // Sinkronkan KPI GLOBAL langsung dari dataset PST yang sama.
  if (typeof updateExecutiveSummaryNew === "function") updateExecutiveSummaryNew();
}

function updateDashboardSM() {
  const currentUser = localStorage.getItem("logged_in_user");
  const userInfo = ALLOWED_USERS[currentUser];
  let selectedPartner = document.getElementById("partnerFilterMC")?.value || "ALL";
  if (userInfo && userInfo.type === "sdp") selectedPartner = userInfo.filter;
  
  let selectedDse = document.getElementById("dseFilterMC")?.value || "ALL";
  if (userInfo && userInfo.type === "dse") selectedDse = userInfo.dseCode;

  const selectedCategory = document.getElementById("categoryFilterMC")?.value || "ALL";
  const selectedKecamatan = document.getElementById("kecamatanFilterMC")?.value || "ALL";
  const searchKeyword = document.getElementById("searchInputMC")?.value.toLowerCase().trim() || "";

  let idxPartner = 2, idxDse = 3, idxCategory = 4;
  let idxRevLmtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("REVENUE LMTD"));
  let idxRevMtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
  let idxVlrLmtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("VLR LMTD"));
  let idxVlrMtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("VLR MTD"));
  let idx90DLmtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("90D LMTD") || h.toUpperCase().includes("90D"));
  let idx90DMtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("90D MTD") || (h.toUpperCase().includes("90D") && !h.toUpperCase().includes("LMTD")));
  let idxRguLmtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("RGU GA LMTD"));
  let idxRguMtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("RGU GA MTD"));

  const filteredRows = globalDataSM.filter((r) => {
    const siteMeta = getSiteMeta(r[0]);
    return (selectedPartner === "ALL" || String(r[idxPartner] || "").trim() === selectedPartner) &&
           (selectedDse === "ALL" || String(r[idxDse] || "").trim() === selectedDse) &&
           (selectedCategory === "ALL" || String(r[idxCategory] || "").trim() === selectedCategory) &&
           (selectedKecamatan === "ALL" || siteMeta.kec === selectedKecamatan) &&
           r.join(" ").toLowerCase().includes(searchKeyword);
  });

  let totRevLmtd = 0, totRevMtd = 0;
  let totVlrLmtd = 0, totVlrMtd = 0;
  let tot90DLmtd = 0, tot90DMtd = 0;
  let totRguMtd = 0;
  let zeroRguSiteList = [];

  filteredRows.forEach((r) => {
    if (idxRevLmtd !== -1) totRevLmtd += parseNum(r[idxRevLmtd]);
    if (idxRevMtd !== -1) totRevMtd += parseNum(r[idxRevMtd]);
    if (idxVlrLmtd !== -1) totVlrLmtd += parseNum(r[idxVlrLmtd]);
    if (idxVlrMtd !== -1) totVlrMtd += parseNum(r[idxVlrMtd]);
    if (idx90DLmtd !== -1) tot90DLmtd += parseNum(r[idx90DLmtd]);
    if (idx90DMtd !== -1) tot90DMtd += parseNum(r[idx90DMtd]);
    let rguVal = idxRguMtd !== -1 ? parseNum(r[idxRguMtd]) : 0;
    totRguMtd += rguVal;
    if (rguVal === 0) {
      let sName = String(r[1] || r[0] || "Site").trim();
      zeroRguSiteList.push(sName);
    }
  });

  animateCounter("kpiRevMTDMC", totRevMtd, true);
  animateCounter("kpiVlrMTDMC", totVlrMtd, false);
  animateCounter("kpi90DMC", tot90DMtd, false);
  animateCounter("kpiRguGaMTDMC", totRguMtd, false);

  document.getElementById("kpiRevLmtdMC").innerText = Math.round(totRevLmtd).toLocaleString("id-ID");
  document.getElementById("kpiVlrLmtdMC").innerText = Math.round(totVlrLmtd).toLocaleString("id-ID");
  document.getElementById("kpi90DLmtdMC").innerText = Math.round(tot90DLmtd).toLocaleString("id-ID");
  document.getElementById("kpiZeroRguSiteCountMC").innerText = zeroRguSiteList.length;

  updateGrowthBadge("kpiRevGrowthMC", totRevMtd, totRevLmtd);
  updateGrowthBadge("kpiVlrGrowthMC", totVlrMtd, totVlrLmtd);
  updateGrowthBadge("kpi90DGrowthMC", tot90DMtd, tot90DLmtd);

  const smallListElem = document.getElementById("zeroRguSiteSmallList");
  if (smallListElem) {
      if (zeroRguSiteList.length > 0) smallListElem.innerHTML = zeroRguSiteList.join(", ");
      else smallListElem.innerHTML = "<i>Tidak ada site dengan RGU GA MTD = 0</i>";
  }

  renderSiteLeaderboards(filteredRows, idxRevMtd, idxRevLmtd, idxVlrMtd, idxVlrLmtd, idx90DMtd, idx90DLmtd);
  renderTable("dataTableMC", globalHeaderSM, filteredRows);
}

function renderSiteLeaderboards(filteredRows, idxRevMtd, idxRevLmtd, idxVlrMtd, idxVlrLmtd, idx90DMtd, idx90DLmtd) {
    let siteArr = filteredRows.map(r => {
        let siteName = String(r[1] || r[0] || "Site").trim();
        let siteId = String(r[0] || '-').trim();
        let dseName = String(r[3] || '-').trim();
        let subText = `ID: ${siteId} | DSE: ${dseName}`;
        let revM = parseNum(r[idxRevMtd]);
        let revL = parseNum(r[idxRevLmtd]);
        let revG = revL > 0 ? (revM - revL) / revL : (revM > 0 ? 1 : 0);
        let vlrM = parseNum(r[idxVlrMtd]);
        let vlrL = parseNum(r[idxVlrLmtd]);
        let vlrG = vlrL > 0 ? (vlrM - vlrL) / vlrL : (vlrM > 0 ? 1 : 0);
        let m90M = parseNum(r[idx90DMtd]);
        let m90L = parseNum(r[idx90DLmtd]);
        let m90G = m90L > 0 ? (m90M - m90L) / m90L : (m90M > 0 ? 1 : 0);
        return {
            name: siteName, subText: subText,
            revMtd: revM, revLmtd: revL, revGrowth: revG,
            vlrMtd: vlrM, vlrLmtd: vlrL, vlrGrowth: vlrG,
            m90Mtd: m90M, m90Lmtd: m90L, m90Growth: m90G
        };
    }).filter(s => s.name !== "" && s.name.toUpperCase() !== "SITE NAME");

    function makeDetailedSiteListHtml(arr, mtdKey, lmtdKey, growthKey, isCurrency = false) {
        let sorted = [...arr].sort((a,b) => b[growthKey] - a[growthKey]);
        let top3 = sorted.slice(0, 3);
        let bot3 = sorted.slice(-3).reverse();
        let html = `<div style="font-size:11px; font-weight:800; color:#15803d; margin-bottom:4px;">TOP 3 SITE</div>`;
        top3.forEach((item, idx) => {
            let mtdStr = isCurrency ? "Rp " + Math.round(item[mtdKey]).toLocaleString('id-ID') : Math.round(item[mtdKey]).toLocaleString('id-ID');
            let lmtdStr = isCurrency ? "Rp " + Math.round(item[lmtdKey]).toLocaleString('id-ID') : Math.round(item[lmtdKey]).toLocaleString('id-ID');
            let gVal = item[growthKey] * 100;
            let gStr = (gVal >= 0 ? "+" : "") + gVal.toFixed(2) + "%";
            let gColor = gVal >= 0 ? "#15803d" : "#be123c";
            html += `
              <div style="font-size:11px; padding:4px 0; border-bottom:1px dashed #f1f5f9;">
                <div style="display:flex; justify-content:space-between; font-weight:700;">
                  <span>${idx+1}. ${item.name}</span>
                  <span style="color:${gColor};">${gStr}</span>
                </div>
                <div style="font-size:10px; color:#64748b; margin-top:1px;">${item.subText}</div>
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-top:2px;">
                  <span>MTD: ${mtdStr}</span>
                  <span>LMTD: ${lmtdStr}</span>
                </div>
              </div>
            `;
        });
        html += `<div style="font-size:11px; font-weight:800; color:#be123c; margin-top:8px; margin-bottom:4px;">BOTTOM 3 SITE</div>`;
        bot3.forEach((item, idx) => {
            let mtdStr = isCurrency ? "Rp " + Math.round(item[mtdKey]).toLocaleString('id-ID') : Math.round(item[mtdKey]).toLocaleString('id-ID');
            let lmtdStr = isCurrency ? "Rp " + Math.round(item[lmtdKey]).toLocaleString('id-ID') : Math.round(item[lmtdKey]).toLocaleString('id-ID');
            let gVal = item[growthKey] * 100;
            let gStr = (gVal >= 0 ? "+" : "") + gVal.toFixed(2) + "%";
            let gColor = gVal >= 0 ? "#15803d" : "#be123c";
            html += `
              <div style="font-size:11px; padding:4px 0; border-bottom:1px dashed #f1f5f9;">
                <div style="display:flex; justify-content:space-between; font-weight:700;">
                  <span>${idx+1}. ${item.name}</span>
                  <span style="color:${gColor};">${gStr}</span>
                </div>
                <div style="font-size:10px; color:#64748b; margin-top:1px;">${item.subText}</div>
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-top:2px;">
                  <span>MTD: ${mtdStr}</span>
                  <span>LMTD: ${lmtdStr}</span>
                </div>
              </div>
            `;
        });
        return html;
    }

    let elRev = document.getElementById("topBottomRevGrowthSiteList");
    let elVlr = document.getElementById("topBottomVlrSiteList");
    let el90D = document.getElementById("topBottom90DSiteList");
    if (elRev) elRev.innerHTML = makeDetailedSiteListHtml(siteArr, 'revMtd', 'revLmtd', 'revGrowth', true);
    if (elVlr) elVlr.innerHTML = makeDetailedSiteListHtml(siteArr, 'vlrMtd', 'vlrLmtd', 'vlrGrowth', false);
    if (el90D) el90D.innerHTML = makeDetailedSiteListHtml(siteArr, 'm90Mtd', 'm90Lmtd', 'm90Growth', false);
}

// ================= TAB PARTNER PERFORMANCE (DINAMIS OTOMATIS) =================
function updateDashboardPP() {
  const currentUser = localStorage.getItem("logged_in_user");
  const userInfo = ALLOWED_USERS[currentUser];
  let selPT = document.getElementById("partnerFilterPP")?.value || "ALL";
  if (userInfo && userInfo.type === "sdp") selPT = userInfo.filter;

  const search = document.getElementById("searchInputPP")?.value.toLowerCase().trim() || "";
  let idxPtName = 1; 

  const filteredRows = globalDataPP.filter(r => {
      let ptName = String(r[idxPtName] || "").trim();
      return (selPT === "ALL" || ptName === selPT) && r.join(" ").toLowerCase().includes(search);
  });

  const allMonthsList = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
  let activeMonthNames = [];
  let colsMap = { rev: [], primary: [], secondary: [], tertiary: [], trade: [], rguTrade: [], vlr: [] };

  if (globalHeaderPP && globalHeaderPP.length > 0) {
      globalHeaderPP.forEach((h, idx) => {
          let hUpper = String(h || "").toUpperCase();
          
          allMonthsList.forEach(m => {
              if (hUpper.includes(m) && !activeMonthNames.includes(m)) {
                  activeMonthNames.push(m);
              }
          });

          if (hUpper.includes("PREPAID REV")) colsMap.rev.push(idx);
          else if (hUpper.includes("PRIMARY") && !hUpper.includes("LMTD")) colsMap.primary.push(idx);
          else if (hUpper.includes("SECONDARY") && !hUpper.includes("LMTD")) colsMap.secondary.push(idx);
          else if (hUpper.includes("TERTIARY") && !hUpper.includes("LMTD")) colsMap.tertiary.push(idx);
          else if (hUpper.includes("TRADE SUPPLY") && !hUpper.includes("LMTD")) colsMap.trade.push(idx);
          else if (hUpper.includes("RGUGA-TRAD") || hUpper.includes("RGU GA TRADE") || hUpper.includes("RGU TRADE")) colsMap.rguTrade.push(idx);
          else if (hUpper.includes("VLR")) colsMap.vlr.push(idx);
      });
  }

  if (activeMonthNames.length === 0) {
      activeMonthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli"];
  }

  let totalMonths = activeMonthNames.length;
  let formattedMonthLabels = activeMonthNames.map(m => m.charAt(0) + m.slice(1).toLowerCase());

  let mRev = new Array(totalMonths).fill(0);
  let mPrimary = new Array(totalMonths).fill(0);
  let mSecondary = new Array(totalMonths).fill(0);
  let mTertiary = new Array(totalMonths).fill(0);
  let mTrade = new Array(totalMonths).fill(0);
  let mRguTrade = new Array(totalMonths).fill(0);
  let mVlr = new Array(totalMonths).fill(0);

  filteredRows.forEach(r => {
      for (let i = 0; i < totalMonths; i++) {
          if (colsMap.rev[i] !== undefined) mRev[i] += parseNum(r[colsMap.rev[i]]);
          if (colsMap.primary[i] !== undefined) mPrimary[i] += parseNum(r[colsMap.primary[i]]);
          if (colsMap.secondary[i] !== undefined) mSecondary[i] += parseNum(r[colsMap.secondary[i]]);
          if (colsMap.tertiary[i] !== undefined) mTertiary[i] += parseNum(r[colsMap.tertiary[i]]);
          if (colsMap.trade[i] !== undefined) mTrade[i] += parseNum(r[colsMap.trade[i]]);
          if (colsMap.rguTrade[i] !== undefined) mRguTrade[i] += parseNum(r[colsMap.rguTrade[i]]);
          if (colsMap.vlr[i] !== undefined) mVlr[i] += parseNum(r[colsMap.vlr[i]]);
      }
  });

  let totRev = mRev.reduce((a,b)=>a+b,0), avgRev = totalMonths > 0 ? totRev / totalMonths : 0;
  let totPrimary = mPrimary.reduce((a,b)=>a+b,0), avgPrimary = totalMonths > 0 ? totPrimary / totalMonths : 0;
  let totSecondary = mSecondary.reduce((a,b)=>a+b,0), avgSecondary = totalMonths > 0 ? totSecondary / totalMonths : 0;
  let totTertiary = mTertiary.reduce((a,b)=>a+b,0), avgTertiary = totalMonths > 0 ? totTertiary / totalMonths : 0;
  let totTrade = mTrade.reduce((a,b)=>a+b,0), avgTrade = totalMonths > 0 ? totTrade / totalMonths : 0;
  let totRguTrade = mRguTrade.reduce((a,b)=>a+b,0), avgRguTrade = totalMonths > 0 ? totRguTrade / totalMonths : 0;
  let totVlr = mVlr.reduce((a,b)=>a+b,0), avgVlr = totalMonths > 0 ? totVlr / totalMonths : 0;

  animateCounter("kpiPrepaidRevPP", totRev, true);
  document.getElementById("avgPrepaidRevPP").innerText = "Rata-rata: Rp " + Math.round(avgRev).toLocaleString('id-ID');

  animateCounter("kpiPrimaryPP", totPrimary);
  document.getElementById("avgPrimaryPP").innerText = "Rata-rata: " + Math.round(avgPrimary).toLocaleString('id-ID');

  animateCounter("kpiSecondaryPP", totSecondary);
  document.getElementById("avgSecondaryPP").innerText = "Rata-rata: " + Math.round(avgSecondary).toLocaleString('id-ID');

  animateCounter("kpiTertiaryPP", totTertiary);
  document.getElementById("avgTertiaryPP").innerText = "Rata-rata: " + Math.round(avgTertiary).toLocaleString('id-ID');

  animateCounter("kpiTradePP", totTrade, true);
  document.getElementById("avgTradePP").innerText = "Rata-rata: Rp " + Math.round(avgTrade).toLocaleString('id-ID');

  animateCounter("kpiRguTradePP", totRguTrade);
  document.getElementById("avgRguTradePP").innerText = "Rata-rata: " + Math.round(avgRguTrade).toLocaleString('id-ID');

  animateCounter("kpiVlrSubsPP", totVlr);
  document.getElementById("avgVlrSubsPP").innerText = "Rata-rata: " + Math.round(avgVlr).toLocaleString('id-ID');

  let lastIdx = totalMonths - 1;
  let prevIdx = Math.max(0, totalMonths - 2);
  let lastMonthName = formattedMonthLabels[lastIdx] || "";
  let prevMonthName = formattedMonthLabels[prevIdx] || "";

  updateGrowthBadge("ppRevGrowthBadge", mRev[lastIdx], mRev[prevIdx]);
  updateGrowthBadge("ppPrimaryGrowthBadge", mPrimary[lastIdx], mPrimary[prevIdx]);
  updateGrowthBadge("ppSecondaryGrowthBadge", mSecondary[lastIdx], mSecondary[prevIdx]);
  updateGrowthBadge("ppTertiaryGrowthBadge", mTertiary[lastIdx], mTertiary[prevIdx]);
  updateGrowthBadge("ppTradeGrowthBadge", mTrade[lastIdx], mTrade[prevIdx]);
  updateGrowthBadge("ppRguTradeGrowthBadge", mRguTrade[lastIdx], mRguTrade[prevIdx]);
  updateGrowthBadge("ppVlrGrowthBadge", mVlr[lastIdx], mVlr[prevIdx]);

  let rangeLabelText = `(JAN - ${lastMonthName.substring(0,3).toUpperCase()})`;
  let growthLabelText = `Growth (${prevMonthName} vs ${lastMonthName}): `;

  document.querySelectorAll(".pp-range-label").forEach(el => el.innerText = rangeLabelText);
  document.querySelectorAll(".pp-growth-label").forEach(el => el.innerText = growthLabelText);

  const summaryTbody = document.getElementById("ppMonthlySummaryBody");
  if (summaryTbody) {
      let summaryHtml = "";
      for (let i = 0; i < totalMonths; i++) {
          summaryHtml += `
            <tr>
                <td><b>${formattedMonthLabels[i]}</b></td>
                <td>Rp ${Math.round(mRev[i]).toLocaleString('id-ID')}</td>
                <td>${Math.round(mPrimary[i]).toLocaleString('id-ID')}</td>
                <td>${Math.round(mSecondary[i]).toLocaleString('id-ID')}</td>
                <td>${Math.round(mTertiary[i]).toLocaleString('id-ID')}</td>
                <td>Rp ${Math.round(mTrade[i]).toLocaleString('id-ID')}</td>
                <td>${Math.round(mRguTrade[i]).toLocaleString('id-ID')}</td>
                <td>${Math.round(mVlr[i]).toLocaleString('id-ID')}</td>
            </tr>
          `;
      }
      summaryTbody.innerHTML = summaryHtml;
  }

  renderPpItemCharts(formattedMonthLabels, mRev, mPrimary, mSecondary, mTertiary, mTrade, mRguTrade, mVlr, filteredRows);
  renderTable("dataTablePP", globalHeaderPP, filteredRows);
}

function renderPpItemCharts(labels, rev, primary, secondary, tertiary, trade, rguTrade, vlr, filteredRows) {
    function makeLineChart(instanceVarName, canvasId, dataArr, color, borderColor) {
        if (window[instanceVarName]) window[instanceVarName].destroy();
        let ctx = document.getElementById(canvasId)?.getContext('2d');
        if (ctx) {
            window[instanceVarName] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{ data: dataArr, borderColor: borderColor, backgroundColor: color, fill: true, tension: 0.3, pointRadius: 2 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 8 } } }, y: { ticks: { font: { size: 8 } } } } }
            });
        }
    }

    makeLineChart('chartPrepaidRevPPInstance', 'chartPrepaidRevPP', rev, 'rgba(245, 158, 11, 0.1)', '#f59e0b');
    makeLineChart('chartPrimaryPPInstance', 'chartPrimaryPP', primary, 'rgba(6, 182, 212, 0.1)', '#06b6d4');
    makeLineChart('chartSecondaryPPInstance', 'chartSecondaryPP', secondary, 'rgba(217, 70, 239, 0.1)', '#d946ef');
    makeLineChart('chartTertiaryPPInstance', 'chartTertiaryPP', tertiary, 'rgba(239, 68, 68, 0.1)', '#ef4444');
    makeLineChart('chartTradePPInstance', 'chartTradePP', trade, 'rgba(245, 158, 11, 0.1)', '#f59e0b');
    makeLineChart('chartRguTradePPInstance', 'chartRguTradePP', rguTrade, 'rgba(6, 182, 212, 0.1)', '#06b6d4');
    makeLineChart('chartVlrSubsPPInstance', 'chartVlrSubsPP', vlr, 'rgba(217, 70, 239, 0.1)', '#d946ef');
}

function updateDashboardDO() {
  const currentUser = localStorage.getItem("logged_in_user");
  const userInfo = ALLOWED_USERS[currentUser];

  const selCategory = document.getElementById("categoryFilterDO")?.value || "ALL";
  const selIsimple = document.getElementById("isimpleFilterDO")?.value || "ALL";
  const selHari = document.getElementById("hariFilterDO")?.value.toUpperCase() || "ALL";
  const selKecamatan = document.getElementById("kecamatanFilterDO")?.value || "ALL";
  const selSite = document.getElementById("siteFilterDO")?.value || "ALL";
  const searchKeyword = document.getElementById("searchInputDO")?.value.toLowerCase().trim() || "";
  const colFilterIdx = document.getElementById("columnFilterDO")?.value || "ALL";
  const siteIdIdxDO = globalHeaderDO.findIndex(h => String(h || "").toUpperCase().trim() === "SITE ID");

  let colIdxHari = selHari !== "ALL" ? globalHeaderDO.findIndex(h => h.toUpperCase() === selHari) : -1;

  const filteredRows = globalDataDO.filter((r) => {
    let dseVal = String(r[2] || "").trim();
    let matchDSE = selectedDseSetDO.size === 0 || selectedDseSetDO.has(dseVal);

    let matchHari = (colIdxHari === -1 || parseNum(r[colIdxHari]) > 0);
    let matchQuick = true;
    if (filterUnachModeDO) {
        if (quickFilterTypeDO === 'SELL_IN') matchQuick = (parseNum(r[8]) === 0);
        else if (quickFilterTypeDO === 'OSA') matchQuick = (parseNum(r[12]) < parseNum(r[11]) || parseNum(r[12]) === 0);
        else if (quickFilterTypeDO === 'BIO') matchQuick = (parseNum(r[18]) < 1);
        else if (quickFilterTypeDO === 'TAG') matchQuick = (parseNum(r[15]) < 3 && parseNum(r[16]) < 1);
    } else {
        if (quickFilterTypeDO === 'BIO') matchQuick = (parseNum(r[18]) >= 1);
        else if (quickFilterTypeDO === 'TAG') matchQuick = (parseNum(r[15]) >= 3 || parseNum(r[16]) >= 1);
        else if (quickFilterTypeDO === 'OSA') matchQuick = (parseNum(r[12]) > 0);
    }

    let matchColFilter = true;
    const rawInputVal = document.getElementById("columnFilterValDO")?.value.trim();

    if (colFilterIdx !== "ALL" && rawInputVal !== "" && rawInputVal !== undefined) {
        let inputNum = parseNum(rawInputVal);
        let cellVal = parseNum(r[parseInt(colFilterIdx)]);

        if (inputNum === 0) {
            matchColFilter = (cellVal === 0);
        } else {
            matchColFilter = (cellVal >= inputNum);
        }
    }

    const rowSiteId = siteIdIdxDO >= 0 ? String(r[siteIdIdxDO] ?? "").trim() : "";
    const rowSiteMeta = getSiteMeta(rowSiteId);
    return matchDSE &&
           (selCategory === "ALL" || String(r[3] || "").trim() === selCategory) &&
           (selIsimple === "ALL" || String(r[4] || "").trim() === selIsimple) &&
           (selKecamatan === "ALL" || rowSiteMeta.kec === selKecamatan) &&
           (selSite === "ALL" || normalizeSiteId(rowSiteId) === normalizeSiteId(selSite)) &&
           matchHari && matchQuick && matchColFilter && r.join(" ").toLowerCase().includes(searchKeyword);
  });

  let totalOutlet = filteredRows.length;
  let targetSellIn = 0, achSellIn = 0, targetOsa = 0, achOsa = 0, outletWithBio = 0, outletWithTag = 0;
  let targetRgugaBio = 0, achRgugaBio = 0;

  filteredRows.forEach((r) => {
    targetSellIn += Math.ceil(parseNum(r[7]));
    achSellIn += parseNum(r[8]);
    targetOsa += parseNum(r[11]);
    achOsa += parseNum(r[12]);
    if (parseNum(r[18]) >= 1) outletWithBio++;
    if (parseNum(r[15]) >= 3 || parseNum(r[16]) >= 1) outletWithTag++;
    targetRgugaBio += parseNum(r[17]);
    achRgugaBio += parseNum(r[18]);
  });

  let pctSellIn = targetSellIn > 0 ? ((achSellIn / targetSellIn) * 100) : 0;
  let pctOsa = targetOsa > 0 ? ((achOsa / targetOsa) * 100) : 0;
  let pctBio = totalOutlet > 0 ? ((outletWithBio / totalOutlet) * 100) : 0;
  let pctTag = totalOutlet > 0 ? ((outletWithTag / totalOutlet) * 100) : 0;
  let pctRgugaBio = targetRgugaBio > 0 ? ((achRgugaBio / targetRgugaBio) * 100) : 0;

  animateCounter("kpiPctSellInDO", pctSellIn, false, true);
  document.getElementById("kpiTargetSellInDO").innerText = Math.round(targetSellIn).toLocaleString("id-ID");
  document.getElementById("kpiSellInDO").innerText = Math.round(achSellIn).toLocaleString("id-ID");
  document.getElementById("kpiGapSellInDO").innerText = Math.round(targetSellIn - achSellIn).toLocaleString("id-ID");
  updateProgressBarAndBadge(pctSellIn, "progressSellInDO", "badgeSellInDO");

  const gaugeFill = document.getElementById("gaugeOsaFill");
  if (gaugeFill) gaugeFill.style.width = Math.min(pctOsa, 100).toFixed(1) + "%";
  animateCounter("kpiPctOsaDO", pctOsa, false, true);
  document.getElementById("kpiTargetOsaDO").innerText = "Rp " + Math.round(targetOsa).toLocaleString("id-ID");
  document.getElementById("kpiAchOsaDO").innerText = "Rp " + Math.round(achOsa).toLocaleString("id-ID");
  document.getElementById("kpiGapOsaDO").innerText = "Rp " + Math.round(targetOsa - achOsa).toLocaleString("id-ID");
  updateProgressBarAndBadge(pctOsa, "gaugeOsaFill", "badgeOsaDO");

  animateCounter("kpiPctBiometrixDO", pctBio, false, true);
  document.getElementById("kpiBiometrixOutletDO").innerText = outletWithBio.toLocaleString("id-ID");
  document.getElementById("kpiTotalOutletBioDO").innerText = totalOutlet.toLocaleString("id-ID");
  updateProgressBarAndBadge(pctBio, "progressBiometrixDO", "badgeBiometrixDO");

  animateCounter("kpiPctTaggingDO", pctTag, false, true);
  document.getElementById("kpiTagging3pcsDO").innerText = outletWithTag.toLocaleString("id-ID");
  document.getElementById("kpiTotalOutletTagDO").innerText = totalOutlet.toLocaleString("id-ID");
  updateProgressBarAndBadge(pctTag, "progressTaggingDO", "badgeTaggingDO");

  animateCounter("kpiPctRgugaBioDO", pctRgugaBio, false, true);
  document.getElementById("kpiTargetRgugaBioDO").innerText = Math.round(targetRgugaBio).toLocaleString("id-ID");
  document.getElementById("kpiAchRgugaBioDO").innerText = Math.round(achRgugaBio).toLocaleString("id-ID");
  document.getElementById("kpiGapRgugaBioDO").innerText = Math.round(targetRgugaBio - achRgugaBio).toLocaleString("id-ID");
  updateProgressBarAndBadge(pctRgugaBio, "progressRgugaBioDO", "badgeRgugaBioDO");

  document.getElementById("stickyOsa").innerText = `${pctOsa.toFixed(1)}%`;
  document.getElementById("stickySellIn").innerText = `${pctSellIn.toFixed(1)}%`;
  document.getElementById("stickyBio").innerText = `${pctBio.toFixed(1)}%`;

  renderTable("dataTableDO", globalHeaderDO, filteredRows);
}

function updateDashboardDaily() {
  const searchKeyword = document.getElementById("searchInputDaily")?.value.toLowerCase().trim() || "";

  const hkInfo = getRemainingWorkingDaysInfo();
  document.getElementById("osaSectionTitleText").innerHTML = `<i class="fa-solid fa-bullseye color-green"></i> 1. GAP DAILY KPI OSA PER DSE (${hkInfo.remainingDays} SISA HK)`;
  document.getElementById("spSectionTitleText").innerHTML = `<i class="fa-solid fa-cart-shopping color-cyan"></i> 2. GAP DAILY KPI SP SELL IN PER DSE (${hkInfo.remainingDays} SISA HK)`;
  document.getElementById("thOsaDailyHeader").innerText = `Target Daily (Gap / ${hkInfo.remainingDays} HK)`;
  document.getElementById("thSpDailyHeader").innerText = `Target Daily (Gap / ${hkInfo.remainingDays} HK)`;

  const filteredOsaRows = globalDataDailyOSA.filter((r) => {
    let dseVal = String(r[0] || "").trim();
    let matchDSE = selectedDseSetDaily.size === 0 || selectedDseSetDaily.has(dseVal);
    return matchDSE && r.join(" ").toLowerCase().includes(searchKeyword);
  });
  renderDailyOsaSection(filteredOsaRows, hkInfo.remainingDays);

  const filteredSpRows = globalDataDailySP.filter((r) => {
    let dseVal = String(r[0] || "").trim();
    let matchDSE = selectedDseSetDaily.size === 0 || selectedDseSetDaily.has(dseVal);
    return matchDSE && r.join(" ").toLowerCase().includes(searchKeyword);
  });
  renderDailySpSection(filteredSpRows, hkInfo.remainingDays);
}

function renderDailyOsaSection(rows, remainingDays) {
  const tbody = document.getElementById("execDailyOsaTableBody");
  if (!tbody) return;

  let totTarget = 0;
  let tableHtml = "";

  rows.forEach(r => {
    let dse = String(r[0] || "").trim();
    if (!dse || dse.toUpperCase() === "DSE CODE") return;
    let targetMonthly = parseNum(r[2]);
    let ach = parseNum(r[3]);
    let pctVal = targetMonthly > 0 ? (ach / targetMonthly) * 100 : 0;
    
    let remaining = Math.abs(parseNum(r[5]));
    let dailyTarget = remainingDays > 0 ? (remaining / remainingDays) : remaining;
    
    totTarget += targetMonthly;

    tableHtml += `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="border-right: 1px solid #cbd5e1; padding: 10px;"><b>${dse}</b></td>
        <td style="border-right: 1px solid #cbd5e1; padding: 10px;"><b>Rp ${Math.round(remaining).toLocaleString('id-ID')}</b></td>
        <td style="border-right: 1px solid #cbd5e1; padding: 10px; background-color: #fef2f2; color: #b91c1c;"><b>Rp ${Math.round(dailyTarget).toLocaleString('id-ID')}</b></td>
        <td style="border-right: 1px solid #cbd5e1; padding: 10px;"><b>Rp ${Math.round(ach).toLocaleString('id-ID')}</b></td>
        <td style="padding: 10px;"><span style="color:${pctVal >= 100 ? '#15803d' : '#ef4444'}; font-weight:800;">${pctVal.toFixed(1)}%</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = tableHtml || `<tr><td colspan="5" style="text-align:center;">Tidak ada data OSA</td></tr>`;
  document.getElementById("weeklyOsaKpiContainer").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0;">
      <span><b>Total Target Full Month MC Bengkayang:</b> Rp ${Math.round(totTarget).toLocaleString('id-ID')}</span>
      <span class="status-badge badge-success">Gap Daily Tracker (${remainingDays} HK)</span>
    </div>
  `;

  renderDailyBarChartCanvas('dailyOsaChartInstance', 'dailyOsaChartCanvas', rows, 'Target Monthly OSA', 'MTD Actual OSA', '#f59e0b', '#0284c7');
}

function renderDailySpSection(rows, remainingDays) {
  const tbody = document.getElementById("execDailySpTableBody");
  if (!tbody) return;

  let totTarget = 0;
  let tableHtml = "";

  rows.forEach(r => {
    let dse = String(r[0] || "").trim();
    if (!dse || dse.toUpperCase() === "DSE CODE") return;
    let targetMonthly = parseNum(r[2]);
    let ach = parseNum(r[3]);
    let pctVal = targetMonthly > 0 ? (ach / targetMonthly) * 100 : 0;
    
    let remaining = Math.abs(parseNum(r[5]));
    let dailyTarget = remainingDays > 0 ? (remaining / remainingDays) : remaining;

    totTarget += targetMonthly;

    tableHtml += `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="border-right: 1px solid #cbd5e1; padding: 10px;"><b>${dse}</b></td>
        <td style="border-right: 1px solid #cbd5e1; padding: 10px;"><b>${Math.round(remaining).toLocaleString('id-ID')} pcs</b></td>
        <td style="border-right: 1px solid #cbd5e1; padding: 10px; background-color: #fef2f2; color: #b91c1c;"><b>${Math.round(dailyTarget).toLocaleString('id-ID')} pcs</b></td>
        <td style="border-right: 1px solid #cbd5e1; padding: 10px;"><b>${Math.round(ach).toLocaleString('id-ID')} pcs</b></td>
        <td style="padding: 10px;"><span style="color:${pctVal >= 100 ? '#15803d' : '#ef4444'}; font-weight:800;">${pctVal.toFixed(1)}%</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = tableHtml || `<tr><td colspan="5" style="text-align:center;">Tidak ada data SP Sell In</td></tr>`;
  document.getElementById("weeklySpKpiContainer").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0;">
      <span><b>Total Target Full Month MC Bengkayang:</b> ${Math.round(totTarget).toLocaleString('id-ID')} pcs</span>
      <span class="status-badge badge-success">Gap Daily Tracker (${remainingDays} HK)</span>
    </div>
  `;

  renderDailyBarChartCanvas('dailySpChartInstance', 'dailySpChartCanvas', rows, 'Target Monthly SP Sell In', 'MTD Actual SP', '#f59e0b', '#0284c7');
}

function renderDailyBarChartCanvas(instanceName, canvasId, dataRows, labelTarget, labelAch, colorTarget, colorAch) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  let dseLabels = [];
  let targetArr = [];
  let achArr = [];

  dataRows.forEach(r => {
    let dse = String(r[0] || "").trim();
    if (!dse || dse.toUpperCase() === "DSE CODE") return;
    dseLabels.push(dse);
    targetArr.push(Math.round(parseNum(r[2])));
    achArr.push(Math.round(parseNum(r[3])));
  });

  if (instanceName === 'dailyOsaChartInstance') {
      if (dailyOsaChartInstance) dailyOsaChartInstance.destroy();
  } else {
      if (dailySpChartInstance) dailySpChartInstance.destroy();
  }

  const permanentLabelPlugin = {
    id: 'permanentLabelPlugin',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          let val = dataset.data[index];
          if (val === undefined || val === null || val === 0) return;
          let valStr = Math.round(val).toLocaleString('id-ID');
          
          ctx.save();
          ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          let position = bar.tooltipPosition();
          ctx.fillText(valStr, position.x, position.y - 5);
          ctx.restore();
        });
      });
    }
  };

  let newChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: dseLabels,
      datasets: [
        { label: labelTarget, data: targetArr, backgroundColor: colorTarget, borderWidth: 1 },
        { label: labelAch, data: achArr, backgroundColor: colorAch, borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: true, position: 'top', labels: { font: { size: 10, weight: 'bold' } } },
        tooltip: { enabled: true }
      },
      scales: { 
        x: { ticks: { font: { size: 10, weight: 'bold' }, color: '#0f172a' } }, 
        y: { 
          beginAtZero: true,
          ticks: { 
            font: { size: 10, weight: 'bold' }, 
            color: '#0f172a',
            callback: function(value) {
              return Math.round(value).toLocaleString('id-ID');
            }
          } 
        } 
      }
    },
    plugins: [permanentLabelPlugin]
  });

  if (instanceName === 'dailyOsaChartInstance') dailyOsaChartInstance = newChart;
  else dailySpChartInstance = newChart;
}

function updateExecutiveSummaryNew() {
    let totalRev = 0, totalTertiary = 0, totalTradeSupply = 0;
    let idxRevMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
    let idxTertMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TERTIARY B# MTD"));
    let idxTradeMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TRADE SUPPLY MTD"));

    globalDataMS.forEach(r => {
        if (idxRevMtd !== -1) totalRev += parseNum(r[idxRevMtd]);
        if (idxTertMtd !== -1) totalTertiary += parseNum(r[idxTertMtd]);
        else totalTertiary += parseNum(r[5] || 0);
        if (idxTradeMtd !== -1) totalTradeSupply += parseNum(r[idxTradeMtd]);
        else totalTradeSupply += parseNum(r[6] || 0);
    });

    const currentUser = localStorage.getItem("logged_in_user");
    const userInfo = ALLOWED_USERS[currentUser];
    let selDse = document.getElementById("execDseFilter")?.value || "ALL";
    if (userInfo && userInfo.type === "dse") selDse = userInfo.dseCode;

    let selHari = document.getElementById("execHariFilter")?.value.toUpperCase() || "ALL";
    let colIdxHari = selHari !== "ALL" ? globalHeaderDO.findIndex(h => h.toUpperCase() === selHari) : -1;

    let missionRows = globalDataDO.filter(r => {
        let matchDse = (selDse === "ALL" || String(r[2] || "").trim() === selDse);
        let matchHari = (colIdxHari === -1 || parseNum(r[colIdxHari]) > 0);
        return matchDse && matchHari;
    });

    let totalOutlet = globalDataDO.length;
    let targetSellIn = 0, achSellIn = 0, targetOsa = 0, achOsa = 0;
    let filteredTargetSellIn = 0, filteredAchSellIn = 0, filteredTargetOsa = 0, filteredAchOsa = 0;

    globalDataDO.forEach(r => {
        let dName = String(r[2] || "").trim();
        let isMatchDse = (selDse === "ALL" || dName === selDse);
        let isMatchHari = (colIdxHari === -1 || parseNum(r[colIdxHari]) > 0);

        let tSi = Math.ceil(parseNum(r[7]));
        let aSi = parseNum(r[8]);
        let tOsa = parseNum(r[11]);
        let aOsa = parseNum(r[12]);

        targetSellIn += tSi;
        achSellIn += aSi;
        targetOsa += tOsa;
        achOsa += aOsa;

        if (isMatchDse && isMatchHari) {
            filteredTargetSellIn += tSi;
            filteredAchSellIn += aSi;
            filteredTargetOsa += tOsa;
            filteredAchOsa += aOsa;
        }
    });

    let pctSellIn = targetSellIn > 0 ? (achSellIn / targetSellIn) * 100 : 0;
    let pctOsa = targetOsa > 0 ? (achOsa / targetOsa) * 100 : 0;
    
    let globalBioAchCount = 0;
    let globalTagAchCount = 0;
    globalDataDO.forEach(r => {
        let matchDse = (selDse === "ALL" || String(r[2] || "").trim() === selDse);
        if (matchDse) {
            if (parseNum(r[18]) >= 1) globalBioAchCount++;
            // Detail Outlet: TAGGING 3PCS achievement = outlet with TAGGING 3PCS >= 1.
            if (parseNum(r[16]) >= 1) globalTagAchCount++;
        }
    });
    let pctBio = totalOutlet > 0 ? (globalBioAchCount / totalOutlet) * 100 : 0;
    let pctTag = totalOutlet > 0 ? (globalTagAchCount / totalOutlet) * 100 : 0;

    // KPI GLOBAL = PERSIS 8 KPI pada TAB PST.
    // Jika LMTD tersedia dan bernilai, tampilkan LMTD + Growth.
    // Jika LMTD tidak tersedia, fallback ke Target bila target tersedia.
    const globalPstConfig = [
        { key:"Rev", label:"REVENUE", mtd:"REVENUE MTD", lmtd:"REVENUE LMTD", target:null, unit:"" },
        { key:"Primary", label:"PRIMARY", mtd:"PRIMARY MTD", lmtd:"PRIMARY LMTD", target:null, unit:"" },
        { key:"Secondary", label:"SECONDARY", mtd:"SECONDARY MTD", lmtd:"SECONDARY LMTD", target:null, unit:"" },
        { key:"Tertiary", label:"TERTIARY B#", mtd:"TERTIARY B# MTD", lmtd:"TERTIARY B# LMTD", target:null, unit:"" },
        { key:"Trade", label:"TRADE SUPPLY", mtd:"TRADE SUPPLY MTD", lmtd:"TRADE SUPPLY LMTD", target:"tradeSupply", unit:"", mainId:"exKpiTradeSupply" },
        { key:"Vlr", label:"VLR SUBS", mtd:"VLR SUBS MTD", lmtd:"VLR SUBS LMTD", target:null, unit:"" },
        { key:"Rguga", label:"RGUGA TRADE", mtd:"RGUGA TRADE MTD", lmtd:"RGUGA TRADE LMTD", target:null, unit:"" },
        { key:"SpSellIn", label:"SP SELL IN", mtd:"SP SELL IN MTD", lmtd:"SP SELL IN LMTD", target:"sellInSP", unit:" pcs" }
    ];

    const setGlobal = (id,text)=>{const e=document.getElementById(id);if(e)e.innerText=text;};
    const setGlobalValue = (cfg,text)=>{ setGlobal(cfg.mainId || ('exKpi' + cfg.key), text); };
    const findGlobalCol = name => globalHeaderMS.findIndex(h => String(h || "").toUpperCase().includes(name));
    const parsePstValue = value => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        let raw = String(value ?? "").trim();
        if (!raw) return 0;
        raw = raw.replace(/Rp\.?/gi, "").replace(/\s/g, "");
        if (raw.includes(",") && raw.includes(".")) {
            if (raw.lastIndexOf(".") > raw.lastIndexOf(",")) raw = raw.replace(/,/g, "");
            else raw = raw.replace(/\./g, "").replace(",", ".");
        } else if (raw.includes(",")) {
            raw = raw.replace(/,/g, "");
        } else if (raw.includes(".")) {
            const parts = raw.split(".");
            if (parts.length > 1 && parts.slice(1).every(p => /^\d{3}$/.test(p))) raw = parts.join("");
        }
        const n = Number(raw);
        return Number.isFinite(n) ? n : 0;
    };
    const sumGlobalCol = idx => {
        if (idx === -1) return 0;
        let total = 0;
        globalDataMS.forEach(r => total += parsePstValue(r[idx]));
        return total;
    };
    const growthText = (m,l) => {
        const g = l !== 0 ? ((m-l)/Math.abs(l))*100 : (m > 0 ? 100 : 0);
        return (g >= 0 ? '+' : '') + g.toFixed(2) + '%';
    };
    const globalTotals = {};
    globalPstConfig.forEach(cfg => {
        const mtdVal = sumGlobalCol(findGlobalCol(cfg.mtd));
        const lmtdIdx = findGlobalCol(cfg.lmtd);
        const lmtdVal = sumGlobalCol(lmtdIdx);
        const hasLmtd = lmtdIdx !== -1 && lmtdVal !== 0;
        const targetVal = cfg.target ? Number(globalTargetRSE[cfg.target] || 0) : 0;
        globalTotals[cfg.key] = { mtdVal, lmtdVal, hasLmtd, targetVal };

        setGlobalValue(cfg, Math.round(mtdVal).toLocaleString('id-ID') + cfg.unit);
        if (hasLmtd) {
            setGlobal('exKpi' + cfg.key + 'Compare', 'LMTD: ' + Math.round(lmtdVal).toLocaleString('id-ID') + cfg.unit);
            setGlobal('exKpi' + cfg.key + 'Growth', 'Growth: ' + growthText(mtdVal,lmtdVal));
        } else if (targetVal > 0) {
            setGlobal('exKpi' + cfg.key + 'Compare', 'Target: ' + Math.round(targetVal).toLocaleString('id-ID') + cfg.unit);
            setGlobal('exKpi' + cfg.key + 'Growth', 'Ach: ' + ((mtdVal/targetVal)*100).toFixed(1) + '%');
        } else {
            setGlobal('exKpi' + cfg.key + 'Compare', 'LMTD: -');
            setGlobal('exKpi' + cfg.key + 'Growth', 'Growth: -');
        }
    });

    // Nilai total PST tetap dipakai oleh bagian RSE di bawah.
    totalRev = globalTotals.Rev.mtdVal;
    totalTertiary = globalTotals.Tertiary.mtdVal;
    totalTradeSupply = globalTotals.Trade.mtdVal;
    const totalPrimaryPstGlobal = globalTotals.Primary.mtdVal;
    const totalSecondaryPstGlobal = globalTotals.Secondary.mtdVal;
    const totalVlrPstGlobal = globalTotals.Vlr.mtdVal;
    const totalRgugaPstGlobal = globalTotals.Rguga.mtdVal;
    const totalSpSellInPstGlobal = globalTotals.SpSellIn.mtdVal;

    // SAFEGUARD: Trade Supply KPI Global wajib mengikuti TOTAL TRADE SUPPLY MTD dari PST.
    // PST.xlsx -> Sheet1 -> TRADE SUPPLY MTD = kolom O (index 14), sehingga tidak boleh tampil 0
    // hanya karena ID kartu atau pencarian header berbeda.
    if (globalDataMS.length) {
        const tradeIdxDirect = globalHeaderMS.findIndex(h => String(h || '').trim().toUpperCase() === 'TRADE SUPPLY MTD');
        if (tradeIdxDirect !== -1) {
            const tradeDirect = globalDataMS.reduce((sum, row) => sum + parsePstValue(row[tradeIdxDirect]), 0);
            totalTradeSupply = tradeDirect;
            globalTotals.Trade.mtdVal = tradeDirect;
            setGlobal('exKpiTradeSupply', Math.round(tradeDirect).toLocaleString('id-ID'));
        }
    }

    // TARGET DINAMIS dari Target RSE.xlsx
    let tradeTargetVal = globalTargetRSE.tradeSupply;
    let tradeAchPct = tradeTargetVal > 0 ? (totalTradeSupply / tradeTargetVal) * 100 : 0;
    let tradeScore = Math.min(tradeAchPct, 140);
    let tradeWeighted = tradeScore * 0.30;

    let sellInTargetVal = globalTargetRSE.sellInSP;
    let sellInAchPct = sellInTargetVal > 0 ? (achSellIn / sellInTargetVal) * 100 : 0;
    let sellInScore = Math.min(sellInAchPct, 140);
    let sellInWeighted = sellInScore * 0.175;

    let tagTargetVal = globalTargetRSE.retailerTagging;
    let tagAchPct = tagTargetVal > 0 ? (globalTagAchCount / tagTargetVal) * 100 : 0;
    let tagScore = Math.min(tagAchPct, 140);
    let tagWeighted = tagScore * 0.175;

    let fwaTargetVal = globalTargetRSE.fwa;
    let fwaAchCount = 0;
    globalDataDO.forEach(r => {
        let matchDse = (selDse === "ALL" || String(r[2] || "").trim() === selDse);
        if (matchDse) {
            fwaAchCount += parseNum(r[19]);
        }
    });

    let fwaAchPct = fwaTargetVal > 0 ? (fwaAchCount / fwaTargetVal) * 100 : 0;
    let fwaScore = Math.min(fwaAchPct, 160);
    let fwaWeighted = fwaScore * 0.15;

    // DSE Productivity saat ini belum memiliki logic achievement di script.
    // Target dibaca dinamis agar tampilan target ikut Excel, sedangkan
    // achievement/score tetap 0% sesuai logic existing.
    let dseProdTargetVal = globalTargetRSE.dseProductivity;
    let dseProdWeighted = 0.00;
    let totalRseScore = tradeWeighted + sellInWeighted + tagWeighted + fwaWeighted + dseProdWeighted;

    const tradeTargetDisplay = document.getElementById("rseTgtTrade");
    if (tradeTargetDisplay) tradeTargetDisplay.innerText = Math.round(tradeTargetVal).toLocaleString('id-ID');
    document.getElementById("rseActTrade").innerText = "Rp " + Math.round(totalTradeSupply).toLocaleString('id-ID');
    document.getElementById("rseAchTrade").innerText = tradeAchPct.toFixed(2) + "%";
    document.getElementById("rseWScoreTrade").innerText = tradeWeighted.toFixed(2) + "%";

    document.getElementById("rseTgtSellIn").innerText = Math.round(sellInTargetVal).toLocaleString('id-ID');
    document.getElementById("rseActSellIn").innerText = Math.round(achSellIn).toLocaleString('id-ID');
    document.getElementById("rseAchSellIn").innerText = sellInAchPct.toFixed(2) + "%";
    document.getElementById("rseWScoreSellIn").innerText = sellInWeighted.toFixed(2) + "%";

    document.getElementById("rseTgtTag").innerText = Math.round(tagTargetVal).toLocaleString('id-ID');
    document.getElementById("rseActTag").innerText = globalTagAchCount.toLocaleString('id-ID');
    document.getElementById("rseAchTag").innerText = tagAchPct.toFixed(2) + "%";
    document.getElementById("rseWScoreTag").innerText = tagWeighted.toFixed(2) + "%";

    const fwaTargetDisplay = document.getElementById("rseTgtFwa");
    if (fwaTargetDisplay) fwaTargetDisplay.innerText = Math.round(fwaTargetVal).toLocaleString('id-ID');
    document.getElementById("rseActFwa").innerText = fwaAchCount.toLocaleString('id-ID');
    document.getElementById("rseAchFwa").innerText = fwaAchPct.toFixed(2) + "%";
    document.getElementById("rseWScoreFwa").innerText = fwaWeighted.toFixed(2) + "%";

    const prodTargetDisplay = document.getElementById("rseTgtProd");
    if (prodTargetDisplay) prodTargetDisplay.innerText = Math.round(dseProdTargetVal).toLocaleString('id-ID');
    document.getElementById("rseWScoreProd").innerText = "0.00%";
    
    const formattedTotalScore = totalRseScore.toFixed(2) + "%";
    
    const rseTotalDisplay = document.getElementById("rseTotalScoreText");
    if (rseTotalDisplay) rseTotalDisplay.innerText = formattedTotalScore;

    const rseFooterDisplay = document.getElementById("rseFooterTotal");
    if (rseFooterDisplay) rseFooterDisplay.innerText = formattedTotalScore;

    let totalGapSellIn = Math.max(0, filteredTargetSellIn - filteredAchSellIn);
    let totalGapOsa = Math.max(0, filteredTargetOsa - filteredAchOsa);

    let hkInfo = getRemainingWorkingDaysInfo();
    let sisaHk = hkInfo.remainingDays;
    let dailySellInTgt = Math.ceil(totalGapSellIn / sisaHk);
    let dailyOsaTgt = Math.round(totalGapOsa / sisaHk);

    let mUnachBioFiltered = 0, mUnachTagFiltered = 0;
    missionRows.forEach(r => {
        if (parseNum(r[18]) < 1) mUnachBioFiltered++;
        if (parseNum(r[15]) < 3 && parseNum(r[16]) < 1) mUnachTagFiltered++;
    });

    let dseTotalBioGap = 0, dseTotalTagGap = 0;
    globalDataDO.forEach(r => {
        let dName = String(r[2] || "").trim();
        let matchDse = (selDse === "ALL" || dName === selDse);
        if (matchDse) {
            if (parseNum(r[18]) < 1) dseTotalBioGap++;
            if (parseNum(r[15]) < 3 && parseNum(r[16]) < 1) dseTotalTagGap++;
        }
    });

    // YOUR'S PRIORITY ACTION — hanya 4 KPI execution.
    const totalOutletCurrent = globalDataDO.length;
    const targetBioOutlet = Math.ceil(totalOutletCurrent * 0.80);
    const targetTagOutlet = Math.ceil(totalOutletCurrent * 0.60);
    const targetFwaCurrent = Math.round(globalTargetRSE.fwa || 18);
    const bioAchPct = targetBioOutlet > 0 ? (globalBioAchCount / targetBioOutlet) * 100 : 0;
    const priorityTagAchPct = targetTagOutlet > 0 ? (globalTagAchCount / targetTagOutlet) * 100 : 0;
    const fwaAchTotal = globalDataDO.reduce((sum,r) => sum + parseNum(r[19]), 0);
    const priorityFwaAchPct = targetFwaCurrent > 0 ? (fwaAchTotal / targetFwaCurrent) * 100 : 0;
    const gapFwaTotal = Math.max(0, targetFwaCurrent - fwaAchTotal);
    const gapOsaDisplay = Math.max(0, targetOsa - achOsa);
    const gapBioDisplay = Math.max(0, targetBioOutlet - globalBioAchCount);
    const gapTagDisplay = Math.max(0, targetTagOutlet - globalTagAchCount);

    const setPriority=(id,text)=>{const e=document.getElementById(id);if(e)e.innerText=text;};
    // Semua angka actual berasal langsung dari DETAIL OUTLET.
    // Tampilan priority sengaja tanpa prefix Rp sesuai request.
    setPriority("exPriorityOsaAch", pctOsa.toFixed(1) + "%");
    setPriority("exPriorityOsaActual", "Ach: " + Math.round(achOsa).toLocaleString('id-ID'));
    setPriority("exPriorityOsaGap", "GAP Total OSA: " + Math.round(gapOsaDisplay).toLocaleString('id-ID'));
    setPriority("exPriorityOsaTarget", "Target OSA: " + Math.round(targetOsa).toLocaleString('id-ID'));

    setPriority("exPriorityBioAch", bioAchPct.toFixed(2) + "%");
    setPriority("exPriorityBioActual", "Ach: " + globalBioAchCount.toLocaleString('id-ID') + " Outlet");
    setPriority("exPriorityBioGap", "GAP Total: " + gapBioDisplay.toLocaleString('id-ID') + " Outlet");
    setPriority("exPriorityBioTarget", "Target: " + targetBioOutlet.toLocaleString('id-ID') + " Outlet");

    setPriority("exPriorityTagAch", priorityTagAchPct.toFixed(2) + "%");
    setPriority("exPriorityTagActual", "Ach: " + globalTagAchCount.toLocaleString('id-ID') + " Outlet");
    setPriority("exPriorityTagGap", "GAP Total: " + gapTagDisplay.toLocaleString('id-ID') + " Outlet");
    setPriority("exPriorityTagTarget", "Target: " + targetTagOutlet.toLocaleString('id-ID') + " Outlet");

    setPriority("exPriorityFwaAch", priorityFwaAchPct.toFixed(1) + "%");
    setPriority("exPriorityFwaActual", "Ach: " + fwaAchTotal.toLocaleString('id-ID') + " pcs");
    setPriority("exPriorityFwaGap", "GAP Total: " + gapFwaTotal.toLocaleString('id-ID') + " pcs");
    setPriority("exPriorityFwaTarget", "Target: " + targetFwaCurrent.toLocaleString('id-ID') + " pcs");

    let hariLabelStr = selHari !== "ALL" ? `${selHari.charAt(0) + selHari.slice(1).toLowerCase()}` : `Hari`;
    document.getElementById("pjpDisplayLabel").innerText = `PJP ${hariLabelStr} : ${missionRows.length} Outlet`;

    renderTargetNonKpiTable(selDse);
}

function renderTargetNonKpiTable(selectedDseFilter) {
    const tbody = document.getElementById("nonKpiTableBody");
    if (!tbody) return;

    let dseMap = {};
    globalDataDO.forEach(r => {
        let dName = String(r[2] || '').trim();
        if (!dName || dName === 'undefined') return;
        if (selectedDseFilter !== "ALL" && dName !== selectedDseFilter) return;

        if (!dseMap[dName]) {
            dseMap[dName] = { name: dName, fwaAch: 0, tagAch: 0, bioAch: 0, totalOutlet: 0 };
        }
        dseMap[dName].totalOutlet++;
        dseMap[dName].fwaAch += parseNum(r[19]);
        if (parseNum(r[15]) >= 3 || parseNum(r[16]) >= 1) dseMap[dName].tagAch++;
        if (parseNum(r[18]) >= 1) dseMap[dName].bioAch++;
    });

    let dseKeys = Object.keys(dseMap).sort();
    if (dseKeys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Tidak ada data DSE yang sesuai filter</td></tr>`;
        return;
    }

    tbody.innerHTML = dseKeys.map(k => {
        let tgtFwa = 4; // Target RGUGA FWA Default Per DSE
        let fwaAch = dseMap[k].fwaAch;
        let gapFwa = Math.max(0, tgtFwa - fwaAch);
        let pctFwa = Math.min(100, (fwaAch / tgtFwa) * 100);

        let tgtTag50 = Math.ceil(dseMap[k].totalOutlet * 0.5);
        let tagAch = dseMap[k].tagAch;
        let gapTag = Math.max(0, tgtTag50 - tagAch);
        let pctTag = tgtTag50 > 0 ? Math.min(100, (tagAch / tgtTag50) * 100) : 0;

        let tgtBio80 = Math.ceil(dseMap[k].totalOutlet * 0.8);
        let bioAch = dseMap[k].bioAch;
        let gapBio = Math.max(0, tgtBio80 - bioAch);
        let pctBio = tgtBio80 > 0 ? Math.min(100, (bioAch / tgtBio80) * 100) : 0;

        return `
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="border-right: 1px solid #cbd5e1; padding: 10px;"><b>${k}</b></td>
                <td style="border-right: 1px solid #cbd5e1; padding: 10px;">
                    <div style="font-size:11px; margin-bottom:2px; font-weight:700;">Ach: ${fwaAch} | Target: ${tgtFwa} <b style="color:#e11d48;">(GAP: ${gapFwa})</b></div>
                    <div style="background:#e2e8f0; border-radius:4px; height:8px; width:100%; overflow:hidden;">
                        <div style="background:#0284c7; height:100%; width:${pctFwa}%;"></div>
                    </div>
                </td>
                <td style="border-right: 1px solid #cbd5e1; padding: 10px;">
                    <div style="font-size:11px; margin-bottom:2px; font-weight:700;">Ach: ${tagAch} | Target: ${tgtTag50} <b style="color:#e11d48;">(GAP: ${gapTag})</b></div>
                    <div style="background:#e2e8f0; border-radius:4px; height:8px; width:100%; overflow:hidden;">
                        <div style="background:#0284c7; height:100%; width:${pctTag}%;"></div>
                    </div>
                </td>
                <td style="padding: 10px;">
                    <div style="font-size:11px; margin-bottom:2px; font-weight:700;">Ach: ${bioAch} | Target: ${tgtBio80} <b style="color:#e11d48;">(GAP: ${gapBio})</b></div>
                    <div style="background:#e2e8f0; border-radius:4px; height:8px; width:100%; overflow:hidden;">
                        <div style="background:#0284c7; height:100%; width:${pctBio}%;"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function refreshGlobalAiSummary() {
    let elem = document.getElementById("globalAiSummaryContent");
    if (!elem) return;
    let totRevPST = 0;
    globalDataMS.forEach(r => {
        let idxRev = globalHeaderMS.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
        totRevPST += parseNum(r[idxRev !== -1 ? idxRev : 2]);
    });
    let totalSite = globalDataSM.length;
    let totalOutlet = globalDataDO.length;
    let dynamicText = `💡 <b>AI Executive Insight:</b> Total Revenue MTD tercatat <b>Rp ${Math.round(totRevPST).toLocaleString('id-ID')}</b> dari ${totalSite} site aktif dan ${totalOutlet} outlet. Fokuskan supervisi harian pada DSE dengan pencapaian di bawah rata-rata.`;
    elem.innerHTML = dynamicText;
}

function updateGlobalAiHeaderSummary() {
    refreshGlobalAiSummary();
}

function renderTable(tableId, header, data) {
  const table = document.getElementById(tableId);
  if (!table) return;
  table.innerHTML = "";
  let activeHeader = header;
  let activeData = data;

  if (tableId === "dataTableDO") {
      const allowedColNames = [
          "OUTLET ID", "OUTLET NAME", "DSE CODE", "NEW CATEGORY OUTLET", "ISIMPLE", 
          "TARGET SP SELL IN", "SP SELL IN", "ACH 3PCS", "ACH % SP SELL IN", 
          "SP TAGGING", "TAGGING 3PCS", "TARGET RGUGA BIOMETRIX", "RGUGA BIOMETRIX MTD", 
          "ACH OSA", "OUTLET 300K", "TARGET OSA", "ACH % OSA"
      ];
      let allowedIndices = [];
      header.forEach((h, idx) => {
          let cleanH = String(h || "").trim().toUpperCase();
          if (allowedColNames.some(targetName => cleanH.includes(targetName))) allowedIndices.push(idx);
      });
      let selHari = document.getElementById("hariFilterDO")?.value.toUpperCase() || "ALL";
      if (selHari !== "ALL") {
          let hariIdx = header.findIndex(h => String(h || "").trim().toUpperCase() === selHari);
          if (hariIdx !== -1 && !allowedIndices.includes(hariIdx)) allowedIndices.push(hariIdx);
      }
      if (allowedIndices.length > 0) {
          activeHeader = allowedIndices.map(i => header[i]);
          activeData = data.map(row => allowedIndices.map(i => row[i]));
      }
  }

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  
  const isFreeze2Col = (tableId === "dataTablePP" || tableId === "dataTableMC" || tableId === "dataTableDO" || tableId === "dataTable");
  const colWidths = ["150px", "200px"];

  activeHeader.forEach((judul, index) => {
    const th = document.createElement("th");
    const txt = String(judul || "").trim().toUpperCase();
    th.innerText = judul || "";
    let baseStyle = "padding: 12px 16px !important; font-size: 12px !important; font-weight: 800 !important; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);";
    
    if (isFreeze2Col && index === 0) {
      th.style.cssText = baseStyle + ` background-color: #be123c !important; color: #FFFFFF !important; position: sticky; left: 0px; top: 0; z-index: 1050; min-width: ${colWidths[0]}; max-width: ${colWidths[0]}; white-space: normal; word-break: break-word; border-right: 2px solid #f59e0b;`;
    } else if (isFreeze2Col && index === 1) {
      th.style.cssText = baseStyle + ` background-color: #be123c !important; color: #FFFFFF !important; position: sticky; left: ${colWidths[0]}; top: 0; z-index: 1050; min-width: ${colWidths[1]}; max-width: ${colWidths[1]}; white-space: normal; word-break: break-word; border-right: 2px solid #f59e0b;`;
    } else {
      let bgStyle = "background-color: #1e293b !important; color: #FFFFFF !important;";
      if (txt.includes("IM3") || txt.includes("PREPAID")) bgStyle = "background-color: #f59e0b !important; color: #000 !important;";
      else if (txt.includes("MTD") || txt.includes("REV")) bgStyle = "background-color: #e11d48 !important; color: #FFF !important;";
      else if (txt.includes("LMTD") || txt.includes("PRIMARY")) bgStyle = "background-color: #0891b2 !important; color: #FFF !important;";
      th.style.cssText = baseStyle + " " + bgStyle + " position: sticky; top: 0; z-index: 900; min-width: 140px; white-space: nowrap;";
    }
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  activeData.forEach((baris, rowIndex) => {
    const tr = document.createElement("tr");
    if (rowIndex % 2 === 1) tr.style.backgroundColor = "#f8fafc";
    
    baris.forEach((nilai, index) => {
      const td = document.createElement("td");
      const judulKolom = String(activeHeader[index] || "").trim().toUpperCase();
      let rawStr = String(nilai !== undefined && nilai !== null ? nilai : "").trim();
      let valDisplay = rawStr;

      if ((judulKolom.includes("KECAMATAN") || index === 0) && rawStr.includes("|")) {
          let parts = rawStr.split("|");
          valDisplay = `<b>${parts[0]}</b><br><span style="font-size:10px; color:#64748b; font-weight:600;">${parts[1] || ''}</span>`;
      }

      let numVal = parseNum(rawStr);
      let isPercent = false;
      let pctVal = 0;

      if (!valDisplay.includes("<br>")) {
          if (judulKolom.includes("TARGET SP SELL IN")) valDisplay = Math.ceil(numVal).toLocaleString("id-ID");
          else if (judulKolom.includes("BIOMETRIX") || judulKolom.includes("RGUGA")) valDisplay = Math.floor(numVal).toLocaleString("id-ID");
          else if ((judulKolom.includes("ACH OSA") || judulKolom.includes("PREPAID REV") || judulKolom.includes("REVENUE") || judulKolom.includes("TARGET OSA")) && numVal >= 1000) {
            valDisplay = "Rp " + Math.round(numVal).toLocaleString("id-ID");
          }
          else if (judulKolom.includes("%") || judulKolom.includes("ACH %") || judulKolom.includes("MOM") || judulKolom.includes("GROWTH")) {
            if (rawStr !== "" && !isNaN(Number(rawStr))) {
              isPercent = true;
              pctVal = Math.abs(numVal) <= 1 && numVal !== 0 ? numVal * 100 : numVal;
              let sign = pctVal > 0 ? "+" : "";
              valDisplay = sign + pctVal.toFixed(2) + "%";
            }
          } else if (rawStr !== "" && !isNaN(Number(rawStr)) && !judulKolom.includes("ID") && !judulKolom.includes("CODE") && Math.abs(numVal) >= 1000) {
            valDisplay = Math.round(numVal).toLocaleString("id-ID");
          }
      }

      if (valDisplay.includes("<br>")) {
          td.innerHTML = valDisplay;
      } else if (tableId === "dataTableDO" && numVal === 0 && rawStr !== "" && !isNaN(Number(rawStr)) && !judulKolom.includes("ID") && !judulKolom.includes("NAME") && !judulKolom.includes("CODE")) {
        td.innerHTML = `<span class="text-red" style="font-weight:700;">${valDisplay}</span>`;
      } else {
        td.innerHTML = `<span style="font-weight:700;">${valDisplay}</span>`;
      }

      let tdStyle = "padding: 10px 16px !important; font-size: 12.5px !important; font-weight: 700 !important; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1;";
      if (isPercent) {
        if (pctVal > 0) tdStyle += " background-color: #dcfce7 !important; color: #15803d !important; font-weight: 800; text-align: center;";
        else if (pctVal < 0) tdStyle += " background-color: #fee2e2 !important; color: #b91c1c !important; font-weight: 800; text-align: center;";
        else tdStyle += " text-align: center;";
      } else {
        tdStyle += (index <= 1 && isFreeze2Col) ? " text-align: left;" : " text-align: center;";
      }

      if (isFreeze2Col && index === 0) {
          td.style.cssText = tdStyle + ` position: sticky; left: 0px; font-weight: 850; z-index: 500; border-right: 2px solid #f59e0b; background-color: #ffffff; min-width: ${colWidths[0]}; max-width: ${colWidths[0]}; white-space: normal; word-break: break-word;`;
      } else if (isFreeze2Col && index === 1) {
          td.style.cssText = tdStyle + ` position: sticky; left: ${colWidths[0]}; font-weight: 850; z-index: 500; border-right: 2px solid #f59e0b; background-color: #ffffff; min-width: ${colWidths[1]}; max-width: ${colWidths[1]}; white-space: normal; word-break: break-word;`;
      } else {
          td.style.cssText = tdStyle + " min-width: 140px; white-space: nowrap;";
      }

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function switchReport(reportId, btnObj) {
  currentActiveTabId = reportId;
  document.querySelectorAll('.report-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.report-tabs button').forEach(b => b.classList.remove('active'));

  const activeContent = document.getElementById(reportId);
  if (activeContent) activeContent.style.display = 'block';

  updateAutoDateH2();
  if (reportId === 'all-summary-tab') {
      updateExecutiveSummaryNew();
  } else if (reportId === 'ms-bengkayang') {
      updateDashboardMS();
  } else if (reportId === 'outlet-mc') {
      updateDashboardSM();
  } else if (reportId === 'detail-outlet') {
      updateDashboardDO();
  } else if (reportId === 'daily-dse') {
      updateDashboardDaily();
  } else if (reportId === 'partner-performance') {
      updateDashboardPP();
  }
  if (btnObj) btnObj.classList.add('active');
}

document.addEventListener("input", function (e) {
  if (e.target.id === "searchInput" || e.target.id === "partnerFilter" || e.target.id === "kecamatanFilter") updateDashboardMS();
  if (e.target.id.includes("MC")) updateDashboardSM();
  if (e.target.id.includes("DO") || e.target.id === "columnFilterValDO") updateDashboardDO();
  if (e.target.id.includes("Daily")) updateDashboardDaily();
  if (e.target.id.includes("PP")) updateDashboardPP();
});

document.addEventListener("change", function (e) {
  if (e.target.id === "partnerFilter" || e.target.id === "kecamatanFilter") updateDashboardMS();
  if (e.target.id === "kecamatanFilterMC") updateDashboardSM();
  if (e.target.id.includes("MC")) updateDashboardSM();
  if (e.target.id === "kecamatanFilterDO") {
      populateDetailOutletLocationFilters();
      updateDashboardDO();
      return;
  }
  if (e.target.id === "siteFilterDO") {
      updateDashboardDO();
      return;
  }
  if (e.target.id.includes("DO") || e.target.id === "columnFilterDO") updateDashboardDO();
  if (e.target.id.includes("Daily")) updateDashboardDaily();
  if (e.target.id === "partnerFilterPP") updateDashboardPP();
  if (e.target.id === "execDseFilter" || e.target.id === "execHariFilter") updateExecutiveSummaryNew();
});

let currentPstMetric = 'revenue';
let chartPstMainLineInstance = null;
let currentPstFilteredRows = [];

function switchPstMetric(metricKey) {
    currentPstMetric = metricKey;
    const btnMap = {
        'revenue': 'btnPstRevenue',
        'primary': 'btnPstPrimary',
        'secondary': 'btnPstSecondary',
        'tertiary': 'btnPstTertiary',
        'trade': 'btnPstTrade',
        'vlr': 'btnPstVlr',
        'rguga': 'btnPstRguga',
        'sellin': 'btnPstSellIn'
    };
    
    Object.keys(btnMap).forEach(key => {
        const btn = document.getElementById(btnMap[key]);
        if (btn) {
            if (key === metricKey) {
                btn.style.background = '#ffffff';
                btn.style.color = '#0f172a';
                btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#64748b';
                btn.style.boxShadow = 'none';
            }
        }
    });

    renderPstMainLineChart(currentPstFilteredRows);
}

function renderPstMainLineChart(rows) {
    currentPstFilteredRows = rows;
    let labels = [];
    let mtdArr = [];
    let lmtdArr = [];

    let idxKec = 0;
    let idxMtd = -1;
    let idxLmtd = -1;
    let isCurrency = true;

    if (currentPstMetric === 'revenue') {
        idxMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
        idxLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("REVENUE LMTD"));
    } else if (currentPstMetric === 'primary') {
        idxMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("PRIMARY MTD"));
        idxLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("PRIMARY LMTD"));
    } else if (currentPstMetric === 'secondary') {
        idxMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("SECONDARY MTD"));
        idxLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("SECONDARY LMTD"));
    } else if (currentPstMetric === 'tertiary') {
        idxMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TERTIARY B# MTD"));
        idxLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TERTIARY B# LMTD"));
    } else if (currentPstMetric === 'trade') {
        idxMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TRADE SUPPLY MTD"));
        idxLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TRADE SUPPLY LMTD"));
    } else if (currentPstMetric === 'vlr') {
        idxMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("VLR SUBS MTD"));
        idxLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("VLR SUBS LMTD"));
        isCurrency = false;
    } else if (currentPstMetric === 'rguga') {
        idxMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("RGUGA TRADE MTD"));
        idxLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("RGUGA TRADE LMTD"));
        isCurrency = false;
    }
 else if (currentPstMetric === 'sellin') {
        idxMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("SP SELL IN MTD"));
        idxLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("SP SELL IN LMTD"));
        isCurrency = false;
    }

    rows.forEach(r => {
        let kecName = String(r[idxKec] || '').trim().replace('|BENGKAYANG', '');
        if (kecName && kecName.toUpperCase() !== 'KECAMATAN' && !kecName.toUpperCase().includes('TOTAL')) {
            labels.push(kecName);
            mtdArr.push(parseNum(r[idxMtd]));
            lmtdArr.push(parseNum(r[idxLmtd]));
        }
    });

    if (chartPstMainLineInstance) chartPstMainLineInstance.destroy();
    const canvas = document.getElementById('chartPstMainLineCanvas');
    if (!canvas) return;

    chartPstMainLineInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'MTD (Bulan Ini)',
                    data: mtdArr,
                    borderColor: '#e11d48',
                    backgroundColor: 'rgba(225, 29, 72, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true
                },
                {
                    label: 'LMTD (Bulan Lalu)',
                    data: lmtdArr,
                    borderColor: '#0284c7',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top', labels: { font: { size: 11, weight: 'bold' } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let val = context.raw || 0;
                            let prefix = isCurrency ? "Rp " : "";
                            return context.dataset.label + ": " + prefix + Math.round(val).toLocaleString("id-ID");
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { font: { size: 10, weight: 'bold' }, color: '#0f172a' } },
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: 10 },
                        callback: function(v) { return isCurrency ? 'Rp ' + Math.round(v).toLocaleString('id-ID') : Math.round(v).toLocaleString('id-ID'); }
                    }
                }
            }
        }
    });
}
/* ============================================================================
   FINAL MARKET SHARE FIX
   - Dipasang di script.js agar tidak bergantung pada addon-executive.js
   - Sumber: FB Market Share.xlsx / sheet KAB MS MOM
   - Khusus Executive Summary: MC-BENGKAYANG
   ============================================================================ */
(function FINAL_MARKET_SHARE_FIX(){
    "use strict";

    const MS_FILE_URL = "./FB%20Market%20Share.xlsx?v=" + Date.now();
    const MS_SHEET = "KAB MS MOM";

    function msClean(v){ return String(v ?? "").trim(); }
    function msNum(v){
        if (typeof v === "number") return Number.isFinite(v) ? v : 0;
        let s = msClean(v).replace(/%/g, "").replace(/\s/g, "");
        if (!s) return 0;
        if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
        else if (s.includes(",")) s = s.replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    }
    function msPct(v){ return (msNum(v) * 100).toFixed(2) + "%"; }
    function msGrowth(v){
        const n = msNum(v);
        return (n >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%";
    }

    async function loadMarketShare(){
        const response = await fetch(MS_FILE_URL, {
            cache: "no-store",
            credentials: "same-origin"
        });
        if (!response.ok) throw new Error("FB Market Share.xlsx HTTP " + response.status);

        const buffer = await response.arrayBuffer();
        if (typeof XLSX === "undefined") throw new Error("SheetJS XLSX belum tersedia");

        const wb = XLSX.read(buffer, {type:"array", cellDates:true});
        const sheetName = wb.SheetNames.find(s => msClean(s).toUpperCase() === MS_SHEET.toUpperCase());
        if (!sheetName) throw new Error("Sheet KAB MS MOM tidak ditemukan");

        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
            header: 1,
            raw: true,
            defval: ""
        });

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i] || [];
            const territory = msClean(r[0]);
            if (!territory) continue;
            if (territory.toUpperCase() === "TERRITORY") continue;
            if (!territory.toUpperCase().includes("BENGKAYANG")) continue;

            /*
             * FORMAT KAB MS MOM YANG DIPAKAI DASHBOARD:
             * B:G  = weekly IM3 (5 minggu + WoW)
             * H:J  = IM3 LMTD / MTD / MoM
             * K:M  = 3ID LMTD / MTD / MoM
             * N:P  = TSEL LMTD / MTD / MoM
             * Q:S  = XLS LMTD / MTD / MoM
             *
             * Sebelumnya block ini membaca B:D sebagai LMTD/MTD/MoM,
             * sehingga nilai MoM terbaca sebagai 33.xx%. Ini yang menyebabkan
             * Growth IM3 salah. Profil Market Share menggunakan H:J.
             */
            const kab = {
                territory,
                weekly:[1,2,3,4,5].map(idx => msNum(r[idx])),
                weeklyWow:msNum(r[6]),
                IM3:  {lmtd:msNum(r[7]),  mtd:msNum(r[8]),  growth:msNum(r[9])},
                "3ID":{lmtd:msNum(r[10]), mtd:msNum(r[11]), growth:msNum(r[12])},
                TSEL: {lmtd:msNum(r[13]), mtd:msNum(r[14]), growth:msNum(r[15])},
                XLS:  {lmtd:msNum(r[16]), mtd:msNum(r[17]), growth:msNum(r[18])}
            };

            window.__executiveMarketShareSnapshot = kab;
            return kab;
        }
        throw new Error("MC-BENGKAYANG tidak ditemukan pada KAB MS MOM");
    }

    let executiveMarketShareScriptChart = null;

    function renderMarketShare(kab){
        const container = document.getElementById("executiveMarketShareContainer");
        if (!container || !kab) return;

        window.__executiveMarketShareSnapshot = kab;

        const brands = [
            {key:"IM3",  label:"IM3",  cls:"im3"},
            {key:"3ID",  label:"3ID",  cls:"tri"},
            {key:"TSEL", label:"TSEL", cls:"tsel"},
            {key:"XLS",  label:"XLS",  cls:"xls"}
        ];

        container.innerHTML = `
            <div class="ms-exec-chart-card">
                <div class="ms-exec-chart-head">
                    <div>
                        <div class="ms-exec-chart-title">Market Share MC Bengkayang</div>
                        <div class="ms-exec-chart-subtitle">IM3 Weekly Performance · LMTD vs MTD · MoM Growth</div>
                    </div>
                    <div class="ms-exec-chart-source">FB Market Share.xlsx<br>KAB MS MOM</div>
                </div>

                <div class="ms-exec-mini-kpis">
                    ${brands.map(b => `
                        <div class="ms-exec-mini-kpi">
                            <span>${b.label}</span>
                            <b>${msPct(kab[b.key].mtd)}</b>
                            <small class="${kab[b.key].growth >= 0 ? 'ms-positive' : 'ms-negative'}">${msGrowth(kab[b.key].growth)} MoM</small>
                        </div>
                    `).join("")}
                </div>

                <div class="ms-exec-main-chart-wrap">
                    <canvas id="executiveMarketShareChart"></canvas>
                </div>
                <div class="ms-exec-chart-foot">IM3 MTD ${msPct(kab.IM3.mtd)} · LMTD ${msPct(kab.IM3.lmtd)} · MoM ${msGrowth(kab.IM3.growth)}</div>
            </div>
        `;

        const canvas = document.getElementById("executiveMarketShareChart");
        if (!canvas || typeof Chart === "undefined") return;
        if (executiveMarketShareScriptChart) {
            try { executiveMarketShareScriptChart.destroy(); } catch(e) {}
        }

        const weeklyLabels = ["W4-Jul","W1-Aug","W2-Aug","W4-Aug","W5-Aug"];
        const weeklyValues = (kab.weekly || []).map(v => v * 100);
        const lmtd = msNum(kab.IM3.lmtd) * 100;
        const mtd = msNum(kab.IM3.mtd) * 100;

        executiveMarketShareScriptChart = new Chart(canvas.getContext("2d"), {
            type:"line",
            data:{
                labels:weeklyLabels,
                datasets:[
                    {
                        label:"IM3 Weekly",
                        data:weeklyValues,
                        borderColor:"#E51B4B",
                        backgroundColor:"rgba(229,27,75,.10)",
                        borderWidth:3,
                        pointRadius:4,
                        pointHoverRadius:6,
                        pointBackgroundColor:"#E51B4B",
                        pointBorderColor:"#FFFFFF",
                        pointBorderWidth:2,
                        fill:true,
                        tension:.3
                    },
                    {
                        label:"LMTD",
                        data:weeklyLabels.map(()=>lmtd),
                        borderColor:"#94A3B8",
                        borderDash:[6,5],
                        borderWidth:1.6,
                        pointRadius:0,
                        fill:false,
                        tension:0
                    },
                    {
                        label:"MTD",
                        data:weeklyLabels.map(()=>mtd),
                        borderColor:"#172236",
                        borderDash:[3,4],
                        borderWidth:1.6,
                        pointRadius:0,
                        fill:false,
                        tension:0
                    }
                ]
            },
            options:{
                responsive:true,
                maintainAspectRatio:false,
                interaction:{intersect:false,mode:"index"},
                plugins:{
                    legend:{position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:9,weight:"700"}}},
                    tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${Number(c.raw).toFixed(2)}%`}}
                },
                scales:{
                    x:{grid:{display:false},ticks:{font:{size:9,weight:"700"}}},
                    y:{beginAtZero:true,suggestedMax:50,ticks:{callback:v=>`${v}%`,font:{size:9}},grid:{color:"rgba(148,163,184,.13)"}}
                }
            }
        });
    }

    async function bootFinalMarketShare(){
        const container = document.getElementById("executiveMarketShareContainer");
        if (!container) return;
        try {
            const kab = await loadMarketShare();
            renderMarketShare(kab);
            console.log("FINAL MARKET SHARE FIX: loaded", kab);
        } catch (err) {
            console.error("FINAL MARKET SHARE FIX:", err);
            // Retry sekali setelah semua asset selesai dimuat.
            setTimeout(async () => {
                try {
                    const kab = await loadMarketShare();
                    renderMarketShare(kab);
                    console.log("FINAL MARKET SHARE FIX: retry loaded", kab);
                } catch (retryErr) {
                    console.error("FINAL MARKET SHARE FIX RETRY:", retryErr);
                }
            }, 1500);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootFinalMarketShare, {once:true});
    } else {
        bootFinalMarketShare();
    }
    window.addEventListener("load", bootFinalMarketShare, {once:true});
})();
