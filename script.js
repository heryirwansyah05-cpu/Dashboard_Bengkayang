let globalHeaderMS = [], globalDataMS = [];
let globalHeaderSM = [], globalDataSM = [];
let globalHeaderDO = [], globalDataDO = [];
let globalHeaderDailyOSA = [], globalDataDailyOSA = [];
let globalHeaderDailySP = [], globalDataDailySP = [];

let globalHeaderPP = [], globalDataPP = [];
let chartPartnerPPInstance = null;
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
            const dseDosel = document.getElementById("dseFilterDO");
            if (dseDosel) {
                dseDosel.value = userInfo.dseCode;
                dseDosel.disabled = true;
            }
            const dseMcsel = document.getElementById("dseFilterMC");
            if (dseMcsel) {
                dseMcsel.value = userInfo.dseCode;
                dseMcsel.disabled = true;
            }
            const dseDailySel = document.getElementById("dseFilterDaily");
            if (dseDailySel) {
                dseDailySel.value = userInfo.dseCode;
                dseDailySel.disabled = true;
            }
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
    const dayCountText = document.getElementById("headerDayCountText");
    const hkInfo = getRemainingWorkingDaysInfo();

    if (updateText) {
        updateText.innerText = `Last Update : ${hkInfo.updateDateStr} (H-2) | Sisa HK: ${hkInfo.remainingDays} Hari`;
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
        if (userInfo && userInfo.type === "dse" && (s.id === "execDseFilter" || s.id === "dseFilterDO" || s.id === "dseFilterMC" || s.id === "dseFilterDaily")) {
            s.value = userInfo.dseCode;
        } else if (userInfo && userInfo.type === "sdp" && (s.id === "partnerFilter" || s.id === "partnerFilterMC" || s.id === "partnerFilterPP")) {
            s.value = userInfo.filter;
        } else {
            s.value = "ALL";
        }
    });
    container.querySelectorAll("input[type='text'], input[type='number']").forEach(i => i.value = "");
    
    if (tabId === 'detail-outlet') {
        quickFilterTypeDO = 'ALL';
        filterUnachModeDO = false;
    }

    if (tabId === 'ms-bengkayang') updateDashboardMS();
    else if (tabId === 'outlet-mc') updateDashboardSM();
    else if (tabId === 'detail-outlet') updateDashboardDO();
    else if (tabId === 'daily-dse') updateDashboardDaily();
    else if (tabId === 'partner-performance') updateDashboardPP();
}

const p1 = fetch("MS BENGKAYANG 19 JULI 2026.xlsx")
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

const p2 = fetch("SITE MONITORING.xlsx")
  .then((res) => res.arrayBuffer())
  .then((data) => {
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, raw: true });
    if (!rows || rows.length === 0) return;
    globalHeaderSM = (rows[0] || []).map((h) => String(h || "").replace(/\r?\n|\r/g, " ").trim());
    globalDataSM = rows.slice(1).filter(r => r.length > 0 && r[0] && String(r[0]).toUpperCase() !== "SITE ID");
    populateDropdown(globalDataSM, "partnerFilterMC", 2, "Semua Partner MC");
    populateDropdown(globalDataSM, "dseFilterMC", 3, "Semua DSE Code");
    populateDropdown(globalDataSM, "categoryFilterMC", 4, "Semua Category");
    updateDashboardSM();
  }).catch(e => console.log("SM load skip"));

const p3 = fetch("DETAIL OUTLET.xlsx")
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

    populateDropdown(globalDataDO, "dseFilterDO", 2, "Semua DSE Code");
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
    populateDropdown(combinedData, "dseFilterDaily", 0, "Semua DSE Code");
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

Promise.all([p1, p2, p3, p4, p5]).then(() => {
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
  let idxRevMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
  let idxRevLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("REVENUE LMTD"));
  let idxPrimMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("PRIMARY MTD"));
  let idxPrimLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("PRIMARY LMTD"));
  let idxSecMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("SECONDARY MTD"));
  let idxSecLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("SECONDARY LMTD"));
  let idxTertMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TERTIARY B# MTD"));
  let idxTertLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TERTIARY B# LMTD"));
  let idxTradeMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TRADE SUPPLY MTD"));
  let idxTradeLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TRADE SUPPLY LMTD"));
  let idxVlrMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("VLR SUBS MTD"));
  let idxVlrLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("VLR SUBS LMTD"));

  const filteredRows = globalDataMS.filter((r) => {
    const kecName = String(r[idxKec] || "").trim();
    const partnerName = String(r[idxPartner !== -1 ? idxPartner : 1] || "").trim();
    return (selectedPartner === "ALL" || partnerName === selectedPartner) &&
           (selectedKecamatan === "ALL" || kecName === selectedKecamatan) &&
           r.join(" ").toLowerCase().includes(searchKeyword);
  });

  let totalRevMtd = 0, totalRevLmtd = 0;
  let totalPrimaryMtd = 0, totalPrimaryLmtd = 0;
  let totalSecondaryMtd = 0, totalSecondaryLmtd = 0;
  let totalTertiaryMtd = 0, totalTertiaryLmtd = 0;
  let totalTradeMtd = 0, totalTradeLmtd = 0;
  let totalVlrMtd = 0, totalVlrLmtd = 0;

  filteredRows.forEach((r) => {
    if (idxRevMtd !== -1) totalRevMtd += parseNum(r[idxRevMtd]);
    if (idxRevLmtd !== -1) totalRevLmtd += parseNum(r[idxRevLmtd]);
    if (idxPrimMtd !== -1) totalPrimaryMtd += parseNum(r[idxPrimMtd]);
    if (idxPrimLmtd !== -1) totalPrimaryLmtd += parseNum(r[idxPrimLmtd]);
    if (idxSecMtd !== -1) totalSecondaryMtd += parseNum(r[idxSecMtd]);
    if (idxSecLmtd !== -1) totalSecondaryLmtd += parseNum(r[idxSecLmtd]);
    if (idxTertMtd !== -1) totalTertiaryMtd += parseNum(r[idxTertMtd]);
    if (idxTertLmtd !== -1) totalTertiaryLmtd += parseNum(r[idxTertLmtd]);
    if (idxTradeMtd !== -1) totalTradeMtd += parseNum(r[idxTradeMtd]);
    if (idxTradeLmtd !== -1) totalTradeLmtd += parseNum(r[idxTradeLmtd]);
    if (idxVlrMtd !== -1) totalVlrMtd += parseNum(r[idxVlrMtd]);
    if (idxVlrLmtd !== -1) totalVlrLmtd += parseNum(r[idxVlrLmtd]);
  });

  animateCounter("kpiRevenuePST", totalRevMtd, true);
  animateCounter("kpiPrimaryPST", totalPrimaryMtd);
  animateCounter("kpiSecondaryPST", totalSecondaryMtd);
  animateCounter("kpiTertiaryPST", totalTertiaryMtd);
  animateCounter("kpiTradeSupplyPST", totalTradeMtd, true);
  animateCounter("kpiVlrPST", totalVlrMtd);

  document.getElementById("kpiRevLmtdPST").innerText = Math.round(totalRevLmtd).toLocaleString("id-ID");
  document.getElementById("kpiPrimaryLmtdPST").innerText = Math.round(totalPrimaryLmtd).toLocaleString("id-ID");
  document.getElementById("kpiSecondaryLmtdPST").innerText = Math.round(totalSecondaryLmtd).toLocaleString("id-ID");
  document.getElementById("kpiTertiaryLmtdPST").innerText = Math.round(totalTertiaryLmtd).toLocaleString("id-ID");
  document.getElementById("kpiTradeLmtdPST").innerText = Math.round(totalTradeLmtd).toLocaleString("id-ID");
  document.getElementById("kpiVlrLmtdPST").innerText = Math.round(totalVlrLmtd).toLocaleString("id-ID");

  updateGrowthBadge("kpiRevGrowthPST", totalRevMtd, totalRevLmtd);
  updateGrowthBadge("kpiPrimaryGrowthPST", totalPrimaryMtd, totalPrimaryLmtd);
  updateGrowthBadge("kpiSecondaryGrowthPST", totalSecondaryMtd, totalSecondaryLmtd);
  updateGrowthBadge("kpiTertiaryGrowthPST", totalTertiaryMtd, totalTertiaryLmtd);
  updateGrowthBadge("kpiTradeGrowthPST", totalTradeMtd, totalTradeLmtd);
  updateGrowthBadge("kpiVlrGrowthPST", totalVlrMtd, totalVlrLmtd);

  document.getElementById("stickyRev").innerText = "Rp " + Math.round(totalRevMtd).toLocaleString("id-ID");
  renderKecamatanTopBottomLeaderboards(filteredRows);
  renderTable("dataTable", globalHeaderMS, filteredRows);
}

function renderKecamatanTopBottomLeaderboards(rows) {
    let idxKec = 0;
    let idxRevGrowth = globalHeaderMS.findIndex(h => h.toUpperCase() === "GROWTH" || h.toUpperCase().includes("GROWTH"));
    let idxRevMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
    let idxRevLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("REVENUE LMTD"));
    let idxVlrMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("VLR SUBS MTD"));
    let idxVlrLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("VLR SUBS LMTD"));
    let idxVlrGrowth = globalHeaderMS.findIndex(h => h.toUpperCase().includes("VLR") && h.toUpperCase().includes("GROWTH"));
    let idxTertMtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TERTIARY B# MTD"));
    let idxTertLmtd = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TERTIARY B# LMTD"));
    let idxTertGrowth = globalHeaderMS.findIndex(h => h.toUpperCase().includes("TERTIARY") && h.toUpperCase().includes("GROWTH"));

    let dataList = rows.map(r => {
        let revM = parseNum(r[idxRevMtd !== -1 ? idxRevMtd : 2]);
        let revL = parseNum(r[idxRevLmtd !== -1 ? idxRevLmtd : 3]);
        let revG = idxRevGrowth !== -1 ? parseNum(r[idxRevGrowth]) : (revL > 0 ? (revM - revL) / revL : 0);
        let vlrM = parseNum(r[idxVlrMtd !== -1 ? idxVlrMtd : 17]);
        let vlrL = parseNum(r[idxVlrLmtd !== -1 ? idxVlrLmtd : 18]);
        let vlrG = idxVlrGrowth !== -1 ? parseNum(r[idxVlrGrowth]) : (vlrL > 0 ? (vlrM - vlrL) / vlrL : 0);
        let tertM = parseNum(r[idxTertMtd !== -1 ? idxTertMtd : 11]);
        let tertL = parseNum(r[idxTertLmtd !== -1 ? idxTertLmtd : 12]);
        let tertG = idxTertGrowth !== -1 ? parseNum(r[idxTertGrowth]) : (tertL > 0 ? (tertM - tertL) / tertL : 0);
        return {
            kec: String(r[idxKec] || "Kecamatan").trim(),
            revMtd: revM, revLmtd: revL, revGrowth: revG,
            vlrMtd: vlrM, vlrLmtd: vlrL, vlrGrowth: vlrG,
            tertMtd: tertM, tertLmtd: tertL, tertGrowth: tertG
        };
    });

    function makeDetailedListHtml(arr, mtdKey, lmtdKey, growthKey, isCurrency = false) {
        let sorted = [...arr].sort((a,b) => b[growthKey] - a[growthKey]);
        let top3 = sorted.slice(0, 3);
        let bot3 = sorted.slice(-3).reverse();
        let html = `<div style="font-size:11px; font-weight:800; color:#15803d; margin-bottom:4px;">TOP 3 KECAMATAN</div>`;
        top3.forEach((item, idx) => {
            let mtdStr = isCurrency ? "Rp " + Math.round(item[mtdKey]).toLocaleString('id-ID') : Math.round(item[mtdKey]).toLocaleString('id-ID');
            let lmtdStr = isCurrency ? "Rp " + Math.round(item[lmtdKey]).toLocaleString('id-ID') : Math.round(item[lmtdKey]).toLocaleString('id-ID');
            let gVal = item[growthKey] * 100;
            let gStr = (gVal >= 0 ? "+" : "") + gVal.toFixed(2) + "%";
            let gColor = gVal >= 0 ? "#15803d" : "#be123c";
            html += `
              <div style="font-size:11px; padding:4px 0; border-bottom:1px dashed #f1f5f9;">
                <div style="display:flex; justify-content:space-between; font-weight:700;">
                  <span>${idx+1}. ${item.kec}</span>
                  <span style="color:${gColor};">${gStr}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-top:2px;">
                  <span>MTD: ${mtdStr}</span>
                  <span>LMTD: ${lmtdStr}</span>
                </div>
              </div>
            `;
        });
        html += `<div style="font-size:11px; font-weight:800; color:#be123c; margin-top:8px; margin-bottom:4px;">BOTTOM 3 KECAMATAN</div>`;
        bot3.forEach((item, idx) => {
            let mtdStr = isCurrency ? "Rp " + Math.round(item[mtdKey]).toLocaleString('id-ID') : Math.round(item[mtdKey]).toLocaleString('id-ID');
            let lmtdStr = isCurrency ? "Rp " + Math.round(item[lmtdKey]).toLocaleString('id-ID') : Math.round(item[lmtdKey]).toLocaleString('id-ID');
            let gVal = item[growthKey] * 100;
            let gStr = (gVal >= 0 ? "+" : "") + gVal.toFixed(2) + "%";
            let gColor = gVal >= 0 ? "#15803d" : "#be123c";
            html += `
              <div style="font-size:11px; padding:4px 0; border-bottom:1px dashed #f1f5f9;">
                <div style="display:flex; justify-content:space-between; font-weight:700;">
                  <span>${idx+1}. ${item.kec}</span>
                  <span style="color:${gColor};">${gStr}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-top:2px;">
                  <span>MTD: ${mtdStr}</span>
                  <span>LMTD: ${lmtdStr}</span>
                </div>
              </div>
            `;
        });
        return html;
    }

    let elRev = document.getElementById("topBottomRevGrowthList");
    let elVlr = document.getElementById("topBottomVlrList");
    let elTert = document.getElementById("topBottomTertiaryList");
    if (elRev) elRev.innerHTML = makeDetailedListHtml(dataList, 'revMtd', 'revLmtd', 'revGrowth', true);
    if (elVlr) elVlr.innerHTML = makeDetailedListHtml(dataList, 'vlrMtd', 'vlrLmtd', 'vlrGrowth', false);
    if (elTert) elTert.innerHTML = makeDetailedListHtml(dataList, 'tertMtd', 'tertLmtd', 'tertGrowth', true);
}

function updateDashboardSM() {
  const currentUser = localStorage.getItem("logged_in_user");
  const userInfo = ALLOWED_USERS[currentUser];
  let selectedPartner = document.getElementById("partnerFilterMC")?.value || "ALL";
  if (userInfo && userInfo.type === "sdp") selectedPartner = userInfo.filter;
  
  let selectedDse = document.getElementById("dseFilterMC")?.value || "ALL";
  if (userInfo && userInfo.type === "dse") selectedDse = userInfo.dseCode;

  const selectedCategory = document.getElementById("categoryFilterMC")?.value || "ALL";
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
    return (selectedPartner === "ALL" || String(r[idxPartner] || "").trim() === selectedPartner) &&
           (selectedDse === "ALL" || String(r[idxDse] || "").trim() === selectedDse) &&
           (selectedCategory === "ALL" || String(r[idxCategory] || "").trim() === selectedCategory) &&
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

  let uniquePartners = [...new Set(filteredRows.map(r => String(r[idxPtName]).trim()))].filter(p => p.toUpperCase() !== "NAMA PARTNER" && p.toUpperCase() !== "PT NAME");
  document.getElementById("kpiTotalPartnersPP").innerText = uniquePartners.length;

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
  const colsMap = {
      rev: [2, 3, 4, 5, 6, 7],
      primary: [8, 9, 10, 11, 12, 13],
      secondary: [26, 27, 28, 29, 30, 31],
      tertiary: [32, 33, 34, 35, 36, 37],
      trade: [38, 39, 40, 41, 42, 43],
      rguTrade: [20, 21, 22, 23, 24, 25],
      vlr: [44, 45, 46, 47, 48, 49]
  };

  let mRev = [0,0,0,0,0,0], mPrimary = [0,0,0,0,0,0], mSecondary = [0,0,0,0,0,0];
  let mTertiary = [0,0,0,0,0,0], mTrade = [0,0,0,0,0,0], mRguTrade = [0,0,0,0,0,0], mVlr = [0,0,0,0,0,0];

  filteredRows.forEach(r => {
      for(let i=0; i<6; i++) {
          mRev[i] += parseNum(r[colsMap.rev[i]]);
          mPrimary[i] += parseNum(r[colsMap.primary[i]]);
          mSecondary[i] += parseNum(r[colsMap.secondary[i]]);
          mTertiary[i] += parseNum(r[colsMap.tertiary[i]]);
          mTrade[i] += parseNum(r[colsMap.trade[i]]);
          mRguTrade[i] += parseNum(r[colsMap.rguTrade[i]]);
          mVlr[i] += parseNum(r[colsMap.vlr[i]]);
      }
  });

  let totRev = mRev.reduce((a,b)=>a+b,0), avgRev = totRev / 6;
  let totPrimary = mPrimary.reduce((a,b)=>a+b,0), avgPrimary = totPrimary / 6;
  let totSecondary = mSecondary.reduce((a,b)=>a+b,0), avgSecondary = totSecondary / 6;
  let totTertiary = mTertiary.reduce((a,b)=>a+b,0), avgTertiary = totTertiary / 6;
  let totTrade = mTrade.reduce((a,b)=>a+b,0), avgTrade = totTrade / 6;
  let totRguTrade = mRguTrade.reduce((a,b)=>a+b,0), avgRguTrade = totRguTrade / 6;
  let totVlr = mVlr.reduce((a,b)=>a+b,0), avgVlr = totVlr / 6;

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

  updateGrowthBadge("ppRevGrowthBadge", mRev[5], mRev[4]);
  updateGrowthBadge("ppPrimaryGrowthBadge", mPrimary[5], mPrimary[4]);
  updateGrowthBadge("ppSecondaryGrowthBadge", mSecondary[5], mSecondary[4]);
  updateGrowthBadge("ppTertiaryGrowthBadge", mTertiary[5], mTertiary[4]);
  updateGrowthBadge("ppTradeGrowthBadge", mTrade[5], mTrade[4]);
  updateGrowthBadge("ppRguTradeGrowthBadge", mRguTrade[5], mRguTrade[4]);
  updateGrowthBadge("ppVlrGrowthBadge", mVlr[5], mVlr[4]);

  const summaryTbody = document.getElementById("ppMonthlySummaryBody");
  if (summaryTbody) {
      let summaryHtml = "";
      for (let i = 0; i < 6; i++) {
          summaryHtml += `
            <tr>
                <td><b>${monthNames[i]}</b></td>
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

  renderPpItemCharts(monthNames, mRev, mPrimary, mSecondary, mTertiary, mTrade, mRguTrade, mVlr, filteredRows);
  renderTable("dataTablePP", globalHeaderPP, filteredRows);
}

function renderPpItemCharts(labels, rev, primary, secondary, tertiary, trade, rguTrade, vlr, filteredRows) {
    let partnerCountMap = {};
    filteredRows.forEach(r => {
        let pName = String(r[1] || "").trim();
        if (pName && pName.toUpperCase() !== "NAMA PARTNER" && pName.toUpperCase() !== "PT NAME" && !pName.toUpperCase().includes("BENGKAYANG")) {
            partnerCountMap[pName] = (partnerCountMap[pName] || 0) + 1;
        }
    });
    if (chartPartnerPPInstance) chartPartnerPPInstance.destroy();
    let ctxP = document.getElementById("chartPartnerPP")?.getContext('2d');
    if (ctxP) {
        chartPartnerPPInstance = new Chart(ctxP, {
            type: 'bar',
            data: {
                labels: Object.keys(partnerCountMap),
                datasets: [{ label: 'Jumlah Area/Kecamatan', data: Object.values(partnerCountMap), backgroundColor: '#ef4444' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } }
        });
    }

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
  let selDse = document.getElementById("dseFilterDO")?.value || "ALL";
  if (userInfo && userInfo.type === "dse") selDse = userInfo.dseCode;

  const selCategory = document.getElementById("categoryFilterDO")?.value || "ALL";
  const selIsimple = document.getElementById("isimpleFilterDO")?.value || "ALL";
  const selHari = document.getElementById("hariFilterDO")?.value.toUpperCase() || "ALL";
  const searchKeyword = document.getElementById("searchInputDO")?.value.toLowerCase().trim() || "";
  const colFilterIdx = document.getElementById("columnFilterDO")?.value || "ALL";
  const colFilterVal = parseNum(document.getElementById("columnFilterValDO")?.value);

  let colIdxHari = selHari !== "ALL" ? globalHeaderDO.findIndex(h => h.toUpperCase() === selHari) : -1;

  const filteredRows = globalDataDO.filter((r) => {
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
    if (colFilterIdx !== "ALL" && !isNaN(colFilterVal)) {
        let cellVal = parseNum(r[parseInt(colFilterIdx)]);
        matchColFilter = (cellVal >= colFilterVal);
    }

    return (selDse === "ALL" || String(r[2] || "").trim() === selDse) &&
           (selCategory === "ALL" || String(r[3] || "").trim() === selCategory) &&
           (selIsimple === "ALL" || String(r[4] || "").trim() === selIsimple) &&
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
  const currentUser = localStorage.getItem("logged_in_user");
  const userInfo = ALLOWED_USERS[currentUser];
  let selDSE = document.getElementById("dseFilterDaily")?.value || "ALL";
  if (userInfo && userInfo.type === "dse") selDSE = userInfo.dseCode;

  const searchKeyword = document.getElementById("searchInputDaily")?.value.toLowerCase().trim() || "";

  const hkInfo = getRemainingWorkingDaysInfo();
  document.getElementById("osaSectionTitleText").innerHTML = `<i class="fa-solid fa-bullseye color-green"></i> 1. GAP DAILY KPI OSA PER DSE (${hkInfo.remainingDays} SISA HK)`;
  document.getElementById("spSectionTitleText").innerHTML = `<i class="fa-solid fa-cart-shopping color-cyan"></i> 2. GAP DAILY KPI SP SELL IN PER DSE (${hkInfo.remainingDays} SISA HK)`;
  document.getElementById("thOsaDailyHeader").innerText = `Target Daily (Gap / ${hkInfo.remainingDays} HK)`;
  document.getElementById("thSpDailyHeader").innerText = `Target Daily (Gap / ${hkInfo.remainingDays} HK)`;

  const filteredOsaRows = globalDataDailyOSA.filter((r) => {
    return (selDSE === "ALL" || String(r[0] || "").trim() === selDSE) && r.join(" ").toLowerCase().includes(searchKeyword);
  });
  renderDailyOsaSection(filteredOsaRows, hkInfo.remainingDays);

  const filteredSpRows = globalDataDailySP.filter((r) => {
    return (selDSE === "ALL" || String(r[0] || "").trim() === selDSE) && r.join(" ").toLowerCase().includes(searchKeyword);
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
    let rawPct = parseNum(r[4]);
    let pctVal = Math.abs(rawPct) <= 1 && rawPct !== 0 ? rawPct * 100 : rawPct;
    let remaining = Math.abs(parseNum(r[5]));
    let dailyTarget = Math.abs(parseNum(r[6]));
    if (dailyTarget === 0 && remaining > 0 && remainingDays > 0) {
        dailyTarget = remaining / remainingDays;
    }
    totTarget += targetMonthly;

    tableHtml += `
      <tr>
        <td><b>${dse}</b></td>
        <td><b>Rp ${Math.round(remaining).toLocaleString('id-ID')}</b></td>
        <td><b>Rp ${Math.round(dailyTarget).toLocaleString('id-ID')}</b></td>
        <td><b>Rp ${Math.round(ach).toLocaleString('id-ID')}</b></td>
        <td><span style="color:${pctVal >= 100 || rawPct >= 1 ? '#15803d' : '#ef4444'}; font-weight:800;">${pctVal.toFixed(1)}%</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = tableHtml || `<tr><td colspan="5" style="text-align:center;">Tidak ada data OSA</td></tr>`;
  document.getElementById("dashOsaTitle").innerText = "Monitoring Target Full Month, Gap Bulanan & Harian Target OSA";
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
    let rawPct = parseNum(r[4]);
    let pctVal = Math.abs(rawPct) <= 1 && rawPct !== 0 ? rawPct * 100 : rawPct;
    let remaining = Math.abs(parseNum(r[5]));
    let dailyTarget = Math.abs(parseNum(r[6]));
    if (dailyTarget === 0 && remaining > 0 && remainingDays > 0) {
        dailyTarget = remaining / remainingDays;
    }
    totTarget += targetMonthly;

    tableHtml += `
      <tr>
        <td><b>${dse}</b></td>
        <td><b>${Math.round(remaining).toLocaleString('id-ID')} pcs</b></td>
        <td><b>${Math.round(dailyTarget).toLocaleString('id-ID')} pcs</b></td>
        <td><b>${Math.round(ach).toLocaleString('id-ID')} pcs</b></td>
        <td><span style="color:${pctVal >= 100 || rawPct >= 1 ? '#15803d' : '#ef4444'}; font-weight:800;">${pctVal.toFixed(1)}%</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = tableHtml || `<tr><td colspan="5" style="text-align:center;">Tidak ada data SP Sell In</td></tr>`;
  document.getElementById("dashSpTitle").innerText = "Monitoring Target Full Month, Gap Bulanan & Harian Target SP Sell In";
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
            if (parseNum(r[15]) >= 3 || parseNum(r[16]) >= 1) globalTagAchCount++;
        }
    });
    let pctBio = totalOutlet > 0 ? (globalBioAchCount / totalOutlet) * 100 : 0;
    let pctTag = totalOutlet > 0 ? (globalTagAchCount / totalOutlet) * 100 : 0;

    document.getElementById("exKpiRev").innerText = "Rp " + Math.round(totalRev).toLocaleString('id-ID');
    document.getElementById("exKpiTertiary").innerText = Math.round(totalTertiary).toLocaleString('id-ID');
    document.getElementById("exKpiTradeSupply").innerText = "Rp " + Math.round(totalTradeSupply).toLocaleString('id-ID');
    document.getElementById("exKpiSellIn").innerText = pctSellIn.toFixed(1) + "%";
    document.getElementById("exKpiOsa").innerText = pctOsa.toFixed(1) + "%";
    document.getElementById("exKpiBio").innerText = pctBio.toFixed(1) + "%";
    document.getElementById("exKpiTag").innerText = pctTag.toFixed(1) + "%";

    let tradeTargetVal = 1569764247;
    let tradeAchPct = tradeTargetVal > 0 ? (totalTradeSupply / tradeTargetVal) * 100 : 0;
    let tradeScore = Math.min(tradeAchPct, 140);
    let tradeWeighted = tradeScore * 0.30;

    let sellInTargetVal = targetSellIn > 0 ? targetSellIn : 2288;
    let sellInAchPct = sellInTargetVal > 0 ? (achSellIn / sellInTargetVal) * 100 : 0;
    let sellInScore = Math.min(sellInAchPct, 140);
    let sellInWeighted = sellInScore * 0.175;

    let tagTargetVal = 167;
    let tagAchPct = tagTargetVal > 0 ? (globalTagAchCount / tagTargetVal) * 100 : 0;
    let tagScore = Math.min(tagAchPct, 140);
    let tagWeighted = tagScore * 0.175;

    let fwaTargetVal = 10;
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

    let dseProdScore = 0;
    let dseProdWeighted = dseProdScore * 0.20;
    let totalRseScore = tradeWeighted + sellInWeighted + tagWeighted + fwaWeighted + dseProdWeighted;

    document.getElementById("rseActTrade").innerText = Math.round(totalTradeSupply).toLocaleString('id-ID');
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

    document.getElementById("rseActFwa").innerText = fwaAchCount.toLocaleString('id-ID');
    document.getElementById("rseAchFwa").innerText = fwaAchPct.toFixed(2) + "%";
    document.getElementById("rseWScoreFwa").innerText = fwaWeighted.toFixed(2) + "%";

    document.getElementById("rseWScoreProd").innerText = dseProdWeighted.toFixed(2) + "%";
    document.getElementById("rseTotalScoreText").innerText = totalRseScore.toFixed(2) + "%";

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

    document.getElementById("exMissionSellInTgt").innerText = Math.round(dailySellInTgt).toLocaleString('id-ID') + " pcs";
    document.getElementById("exMissionOsaTgt").innerText = "Rp " + Math.round(dailyOsaTgt).toLocaleString('id-ID');
    document.getElementById("exMissionBioUnach").innerText = mUnachBioFiltered.toLocaleString('id-ID') + " Outlet";
    document.getElementById("exMissionTagUnach").innerText = mUnachTagFiltered.toLocaleString('id-ID') + " Outlet";

    let hariLabelStr = selHari !== "ALL" ? `${selHari.charAt(0) + selHari.slice(1).toLowerCase()}` : `Hari`;
    document.getElementById("pjpDisplayLabel").innerHTML = `<i class="fa-solid fa-route"></i> PJP ${hariLabelStr} : ${missionRows.length} Outlet`;

    document.getElementById("exTotalGapSelIn").innerText = `GAP Total: ${Math.round(totalGapSellIn).toLocaleString('id-ID')} pcs`;
    document.getElementById("exTotalGapOsa").innerText = `GAP Total: Rp ${Math.round(totalGapOsa).toLocaleString('id-ID')}`;
    document.getElementById("exTotalBioGap").innerText = `GAP Total: ${dseTotalBioGap} Outlet`;
    document.getElementById("exTotalTagGap").innerText = `GAP Total: ${dseTotalTagGap} Outlet`;

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
        let tgtFwa = 2; 
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
            <tr>
                <td><b>${k}</b></td>
                <td>
                    <div style="font-size:11px; margin-bottom:2px; font-weight:700;">Ach: ${fwaAch} | Target: ${tgtFwa} <b style="color:#e11d48;">(GAP: ${gapFwa})</b></div>
                    <div style="background:#e2e8f0; border-radius:4px; height:8px; width:100%; overflow:hidden;">
                        <div style="background:#0284c7; height:100%; width:${pctFwa}%;"></div>
                    </div>
                </td>
                <td>
                    <div style="font-size:11px; margin-bottom:2px; font-weight:700;">Ach: ${tagAch} | Target: ${tgtTag50} <b style="color:#e11d48;">(GAP: ${gapTag})</b></div>
                    <div style="background:#e2e8f0; border-radius:4px; height:8px; width:100%; overflow:hidden;">
                        <div style="background:#0284c7; height:100%; width:${pctTag}%;"></div>
                    </div>
                </td>
                <td>
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
  
  const isFreeze2Col = (tableId === "dataTablePP" || tableId === "dataTableMC" || tableId === "dataTableDO");
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
      let numVal = parseNum(rawStr);
      let isPercent = false;
      let pctVal = 0;

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

      if (tableId === "dataTableDO" && numVal === 0 && rawStr !== "" && !isNaN(Number(rawStr)) && !judulKolom.includes("ID") && !judulKolom.includes("NAME") && !judulKolom.includes("CODE")) {
        td.innerHTML = `<span class="text-red" style="font-weight:700;">${valDisplay}</span>`;
      } else {
        td.innerHTML = `<span style="font-weight:700;">${valDisplay}</span>`;
      }

      let tdStyle = "padding: 10px 16px !important; font-size: 12.5px !important; font-weight: 700 !important;";
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
  document.querySelectorAll('.sidebar-menu button').forEach(b => b.classList.remove('active'));

  const activeContent = document.getElementById(reportId);
  if (activeContent) activeContent.style.display = 'block';

  updateAutoDateH2();
  if (reportId === 'all-summary-tab') {
      updateExecutiveSummaryNew();
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
  if (e.target.id.includes("MC")) updateDashboardSM();
  if (e.target.id.includes("DO") || e.target.id === "columnFilterDO") updateDashboardDO();
  if (e.target.id.includes("Daily")) updateDashboardDaily();
  if (e.target.id.includes("PP")) updateDashboardPP();
  if (e.target.id === "execDseFilter" || e.target.id === "execHariFilter") updateExecutiveSummaryNew();
});