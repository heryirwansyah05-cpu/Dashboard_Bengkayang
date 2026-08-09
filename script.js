let globalHeaderMS = [], globalDataMS = [];
let globalHeaderSM = [], globalDataSM = [];
let globalHeaderDO = [], globalDataDO = [];
let globalHeaderDailyOSA = [], globalDataDailyOSA = [];
let globalHeaderDailySP = [], globalDataDailySP = [];

// VARIABEL PARTNER PERFORMANCE & CHART INSTANCES
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

function formatDailyHeader(row) {
    return (row || []).map(h => {
        if (h === undefined || h === null) return '';
        let str = String(h).trim();
        let num = Number(str);
        if (!isNaN(num) && num > 40000 && num < 50000) {
            let d = new Date(Math.round((num - 25569) * 86400 * 1000));
            return `${d.getDate()}/${d.getMonth() + 1}`;
        }
        if (str.includes('00:00:00') || (!isNaN(Date.parse(str)) && str.includes("-"))) {
            let d = new Date(str);
            if (!isNaN(d.getDate())) return `${d.getDate()}/${d.getMonth() + 1}`;
        }
        return str;
    });
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
        if (pct >= 120) { badge.className = "status-badge badge-excellent"; badge.innerText = "🔵 Excellent"; }
        else if (pct >= 100) { badge.className = "status-badge badge-success"; badge.innerText = "🟢 On Target"; }
        else if (pct >= 50) { badge.className = "status-badge badge-warning"; badge.innerText = "🟡 In Progress"; }
        else { badge.className = "status-badge badge-danger"; badge.innerText = "🔴 Under Target"; }
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
    const container = document.getElementById(tabId);
    if (!container) return;
    container.querySelectorAll("select").forEach(s => s.value = "ALL");
    container.querySelectorAll("input[type='text'], input[type='number']").forEach(i => i.value = "");
    quickFilterTypeDO = 'ALL';
    filterUnachModeDO = false;
    if (tabId === 'ms-bengkayang') updateDashboardMS();
    else if (tabId === 'outlet-mc') updateDashboardSM();
    else if (tabId === 'detail-outlet') updateDashboardDO();
    else if (tabId === 'daily-dse') updateDashboardDaily();
    else if (tabId === 'partner-performance') updateDashboardPP();
}

// Data Fetching Promisified
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

const p4 = fetch("DAILY SELL IN DSE.xlsx")
  .then((res) => res.arrayBuffer())
  .then((data) => {
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    if (!jsonData || jsonData.length === 0) return;
    let idxOsaHeader = jsonData.findIndex(r => r && r.some(c => String(c).toUpperCase().includes("TARGET OSA")));
    let idxSpHeader = jsonData.findIndex(r => r && r.some(c => String(c).toUpperCase().includes("TARGET SP SELL IN")));
    if (idxOsaHeader !== -1) {
        globalHeaderDailyOSA = formatDailyHeader(jsonData[idxOsaHeader]);
        let endIdx = idxSpHeader !== -1 ? idxSpHeader : jsonData.length;
        globalDataDailyOSA = jsonData.slice(idxOsaHeader + 1, endIdx).filter(r => r && r.some(c => c !== undefined && c !== null && c !== ''));
    }
    if (idxSpHeader !== -1) {
        globalHeaderDailySP = formatDailyHeader(jsonData[idxSpHeader]);
        globalDataDailySP = jsonData.slice(idxSpHeader + 1).filter(r => r && r.some(c => c !== undefined && c !== null && c !== ''));
    }
    let combinedData = globalDataDailyOSA.length > 0 ? globalDataDailyOSA : globalDataDailySP;
    populateDropdown(combinedData, "dseFilterDaily", 0, "Semua DSE Code");
    updateDashboardDaily();
  }).catch(e => console.log("Daily load skip"));

// FETCH PARTNER PERFORMANCE (Header di Baris index 4, Data di Baris index 5 dst)
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
        if (ptName === "PT NAME" || ptName === "NAMA PARTNER" || ptName === "PARAMETER" || ptName.includes("BENGKAYANG")) {
            return false;
        }
        return true;
    });

    populateDropdown(globalDataPP, "partnerFilterPP", 1, "Semua PT Partner");
    updateDashboardPP();
  }).catch(e => console.log("PP load skip"));

Promise.all([p1, p2, p3, p4, p5]).then(() => {
  updateAutoDateH2();
  updateGlobalAiHeaderSummary();
  updateExecutiveSummaryNew();
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
    const val = r[colIdx] ? String(r[colIdx]).trim() : "";
    if (val && val !== "undefined" && !val.toUpperCase().includes("HEADER") && !val.toUpperCase().includes("NAME") && !val.toUpperCase().includes("BENGKAYANG")) {
      valSet.add(val);
    }
  });
  selectElem.innerHTML = `<option value="ALL">${defaultText}</option>`;
  Array.from(valSet).sort().forEach((val) => {
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
    if (growth >= 0) {
        elem.className = "growth-badge growth-positive";
    } else {
        elem.className = "growth-badge growth-negative";
    }
}

function updateDashboardMS() {
  const selectedPartner = document.getElementById("partnerFilter")?.value || "ALL";
  const searchKeyword = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
  
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

  const filteredRows = globalDataMS.filter((r) => {
    const partnerName = String(r[idxPartner !== -1 ? idxPartner : 1] || "").trim();
    return (selectedPartner === "ALL" || partnerName === selectedPartner) && r.join(" ").toLowerCase().includes(searchKeyword);
  });

  let totalRevMtd = 0, totalRevLmtd = 0;
  let totalPrimaryMtd = 0, totalPrimaryLmtd = 0;
  let totalSecondaryMtd = 0, totalSecondaryLmtd = 0;
  let totalTertiaryMtd = 0, totalTertiaryLmtd = 0;
  let totalTradeMtd = 0, totalTradeLmtd = 0;

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
  });

  animateCounter("kpiRevenuePST", totalRevMtd, true);
  animateCounter("kpiPrimaryPST", totalPrimaryMtd);
  animateCounter("kpiSecondaryPST", totalSecondaryMtd);
  animateCounter("kpiTertiaryPST", totalTertiaryMtd);
  animateCounter("kpiTradeSupplyPST", totalTradeMtd);

  document.getElementById("kpiRevLmtdPST").innerText = Math.round(totalRevLmtd).toLocaleString("id-ID");
  document.getElementById("kpiPrimaryLmtdPST").innerText = Math.round(totalPrimaryLmtd).toLocaleString("id-ID");
  document.getElementById("kpiSecondaryLmtdPST").innerText = Math.round(totalSecondaryLmtd).toLocaleString("id-ID");
  document.getElementById("kpiTertiaryLmtdPST").innerText = Math.round(totalTertiaryLmtd).toLocaleString("id-ID");
  document.getElementById("kpiTradeLmtdPST").innerText = Math.round(totalTradeLmtd).toLocaleString("id-ID");

  updateGrowthBadge("kpiRevGrowthPST", totalRevMtd, totalRevLmtd);
  updateGrowthBadge("kpiPrimaryGrowthPST", totalPrimaryMtd, totalPrimaryLmtd);
  updateGrowthBadge("kpiSecondaryGrowthPST", totalSecondaryMtd, totalSecondaryLmtd);
  updateGrowthBadge("kpiTertiaryGrowthPST", totalTertiaryMtd, totalTertiaryLmtd);
  updateGrowthBadge("kpiTradeGrowthPST", totalTradeMtd, totalTradeLmtd);

  document.getElementById("stickyRev").innerText = "Rp " + Math.round(totalRevMtd).toLocaleString("id-ID");
  renderTable("dataTable", globalHeaderMS, filteredRows);
}

function updateDashboardSM() {
  const selectedPartner = document.getElementById("partnerFilterMC")?.value || "ALL";
  const selectedDse = document.getElementById("dseFilterMC")?.value || "ALL";
  const selectedCategory = document.getElementById("categoryFilterMC")?.value || "ALL";
  const searchKeyword = document.getElementById("searchInputMC")?.value.toLowerCase().trim() || "";

  let idxPartner = 2, idxDse = 3, idxCategory = 4;
  let idxRevLmtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("REVENUE LMTD"));
  let idxRevMtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("REVENUE MTD"));
  let idxVlrLmtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("VLR LMTD"));
  let idxVlrMtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("VLR MTD"));
  let idxRguLmtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("RGU GA LMTD"));
  let idxRguMtd = globalHeaderSM.findIndex(h => h.toUpperCase().includes("RGU GA MTD"));
  let idxOutletAgustus = globalHeaderSM.findIndex(h => h.toUpperCase().includes("OUTLET AGUSTUS") || h.toUpperCase().includes("OUTLET"));

  const filteredRows = globalDataSM.filter((r) => {
    return (selectedPartner === "ALL" || String(r[idxPartner] || "").trim() === selectedPartner) &&
           (selectedDse === "ALL" || String(r[idxDse] || "").trim() === selectedDse) &&
           (selectedCategory === "ALL" || String(r[idxCategory] || "").trim() === selectedCategory) &&
           r.join(" ").toLowerCase().includes(searchKeyword);
  });

  let totRevLmtd = 0, totRevMtd = 0;
  let totVlrLmtd = 0, totVlrMtd = 0;
  let totRguLmtd = 0, totRguMtd = 0;
  let totOutletAgustus = 0, siteBelow3Outlet = 0;
  let cntLrs = 0, cntAtRisk = 0, cntProfit = 0;

  filteredRows.forEach((r) => {
    if (idxRevLmtd !== -1) totRevLmtd += parseNum(r[idxRevLmtd]);
    if (idxRevMtd !== -1) totRevMtd += parseNum(r[idxRevMtd]);
    if (idxVlrLmtd !== -1) totVlrLmtd += parseNum(r[idxVlrLmtd]);
    if (idxVlrMtd !== -1) totVlrMtd += parseNum(r[idxVlrMtd]);
    if (idxRguLmtd !== -1) totRguLmtd += parseNum(r[idxRguLmtd]);
    if (idxRguMtd !== -1) totRguMtd += parseNum(r[idxRguMtd]);
    
    if (idxOutletAgustus !== -1) {
      let jmlOutlet = parseNum(r[idxOutletAgustus]);
      totOutletAgustus += jmlOutlet;
      if (jmlOutlet < 3) siteBelow3Outlet++;
    }
    const catVal = String(r[idxCategory] || "").toUpperCase();
    if (catVal.includes("LRS")) cntLrs++;
    else if (catVal.includes("AT RISK")) cntAtRisk++;
    else if (catVal.includes("PROFIT")) cntProfit++;
  });

  animateCounter("kpiRevMTDMC", totRevMtd, true);
  animateCounter("kpiVlrMTDMC", totVlrMtd, false);
  animateCounter("kpiRguGaMTDMC", totRguMtd, false);

  document.getElementById("kpiRevLmtdMC").innerText = Math.round(totRevLmtd).toLocaleString("id-ID");
  document.getElementById("kpiVlrLmtdMC").innerText = Math.round(totVlrLmtd).toLocaleString("id-ID");
  document.getElementById("kpiRguGaLmtdMC").innerText = Math.round(totRguLmtd).toLocaleString("id-ID");

  updateGrowthBadge("kpiRevGrowthMC", totRevMtd, totRevLmtd);
  updateGrowthBadge("kpiVlrGrowthMC", totVlrMtd, totVlrLmtd);
  updateGrowthBadge("kpiRguGaGrowthMC", totRguMtd, totRguLmtd);

  animateCounter("kpiTotalOutletAgustusMC", totOutletAgustus);
  document.getElementById("kpiTotalSiteMC").innerText = filteredRows.length + " Site";
  document.getElementById("kpiSiteBelow3OutletMC").innerText = siteBelow3Outlet.toLocaleString("id-ID");
  document.getElementById("kpiSiteLrsMC").innerText = cntLrs.toLocaleString("id-ID");
  document.getElementById("kpiSiteAtRiskMC").innerText = cntAtRisk.toLocaleString("id-ID");
  document.getElementById("kpiSiteProfitMC").innerText = cntProfit.toLocaleString("id-ID");

  renderSiteLeaderboards(filteredRows, idxRevMtd);
  renderTable("dataTableMC", globalHeaderSM, filteredRows);
}

// LOGIKA PARTNER PERFORMANCE (Mapping Indeks Kolom Sesuai Baris Header ke-4)
function updateDashboardPP() {
  const selPT = document.getElementById("partnerFilterPP")?.value || "ALL";
  const search = document.getElementById("searchInputPP")?.value.toLowerCase().trim() || "";
  
  let idxPtName = 1; 
  const filteredRows = globalDataPP.filter(r => {
      let ptName = String(r[idxPtName] || "").trim();
      return (selPT === "ALL" || ptName === selPT) && r.join(" ").toLowerCase().includes(search);
  });

  let uniquePartners = [...new Set(filteredRows.map(r => String(r[idxPtName]).trim()))].filter(p => p.toUpperCase() !== "NAMA PARTNER" && p.toUpperCase() !== "PT NAME");
  document.getElementById("kpiTotalPartnersPP").innerText = uniquePartners.length;

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
  
  // Mapping kolom dari baris header PARTNER PERFORMANCE.xlsx:
  // [0:KECAMATAN, 1:NAMA PARTNER]
  // Prepaid Rev: Jan=2, Feb=3, Mar=4, Apr=5, Mei=6, Juni=7
  // Primary: Jan=8, Feb=9, Mar=10, Apr=11, Mei=12, Juni=13
  // RGUGA FWA: Jan=14, Feb=15, Mar=16, Apr=17, Mei=18, Juni=19
  // RGUGA-Trad: Jan=20, Feb=21, Mar=22, Apr=23, Mei=24, Juni=25
  // Secondary: Jan=26, Feb=27, Mar=28, Apr=29, Mei=30, Juni=31
  // Tertiary B#: Jan=32, Feb=33, Mar=34, Apr=35, Mei=36, Juni=37
  // Trade Supply: Jan=38, Feb=39, Mar=40, Apr=41, Mei=42, Juni=43
  // VLR_SUBS: Jan=44, Feb=45, Mar=46, Apr=47, Mei=48, Juni=49
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

  // Growth Pembanding Mei (index 4) vs Juni (index 5)
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

function renderSiteLeaderboards(filteredRows, idxRevMtd) {
  let siteArr = filteredRows.map(r => ({
    name: String(r[1] || r[0] || "Site").trim(),
    subText: `Site ID: ${String(r[0] || '-').trim()} | DSE: ${String(r[3] || '-').trim()}`,
    rev: parseNum(r[idxRevMtd !== -1 ? idxRevMtd : 6])
  })).filter(s => s.name !== "" && s.name.toUpperCase() !== "SITE NAME");

  siteArr.sort((a, b) => b.rev - a.rev);
  renderLeaderboardList("topSiteList", siteArr.slice(0, 3).map(s => ({ name: s.name, subText: s.subText, val: "Rp " + Math.round(s.rev).toLocaleString('id-ID') })));

  let bottomArr = [...siteArr].reverse();
  renderLeaderboardList("bottomSiteList", bottomArr.slice(0, 3).map(s => ({ name: s.name, subText: s.subText, val: "Rp " + Math.round(s.rev).toLocaleString('id-ID') })), true);
}

function updateDashboardDO() {
  const selDse = document.getElementById("dseFilterDO")?.value || "ALL";
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
  document.getElementById("kpiTargetOsaDO").innerText = (targetOsa / 1000000).toFixed(3) + " Juta";
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
  const selDSE = document.getElementById("dseFilterDaily")?.value || "ALL";
  const searchKeyword = document.getElementById("searchInputDaily")?.value.toLowerCase().trim() || "";

  const hkInfo = getRemainingWorkingDaysInfo();
  document.getElementById("osaSectionTitleText").innerHTML = `<i class="fa-solid fa-bullseye color-green"></i> 1. MONITORING TARGET OSA PER DSE (GAP / ${hkInfo.remainingDays} SISA HK)`;
  document.getElementById("spSectionTitleText").innerHTML = `<i class="fa-solid fa-cart-shopping color-cyan"></i> 2. MONITORING TARGET SP SELL IN PER DSE (GAP / ${hkInfo.remainingDays} SISA HK)`;
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

  let totTarget = 0, sumW1 = 0, sumW2 = 0, sumW3 = 0, sumW4 = 0;
  let tableHtml = "";

  rows.forEach(r => {
    let dse = String(r[0] || "").trim();
    if (!dse || dse.toUpperCase() === "DSE CODE") return;
    let tgt = parseNum(r[2]);
    let ach = parseNum(r[3]);
    let remaining = Math.max(0, tgt - ach);
    let dailyTarget = remaining / remainingDays; 
    let pct = tgt > 0 ? ((ach / tgt) * 100).toFixed(1) : "0.0";

    totTarget += tgt;
    for (let colIdx = 5; colIdx < globalHeaderDailyOSA.length; colIdx++) {
      let day = parseInt(globalHeaderDailyOSA[colIdx].split('/')[0]);
      let val = parseNum(r[colIdx]);
      if (!isNaN(day)) {
        if (day >= 1 && day <= 7) sumW1 += val;
        else if (day >= 8 && day <= 14) sumW2 += val;
        else if (day >= 15 && day <= 21) sumW3 += val;
        else if (day >= 22 && day <= 31) sumW4 += val;
      }
    }

    tableHtml += `
      <tr>
        <td><b>${dse}</b></td>
        <td>Rp ${Math.round(remaining).toLocaleString('id-ID')}</td>
        <td><b>Rp ${Math.round(dailyTarget).toLocaleString('id-ID')}</b></td>
        <td>Rp ${Math.round(ach).toLocaleString('id-ID')}</td>
        <td><span style="color:${parseFloat(pct) >= 100 ? '#15803d' : '#ef4444'}; font-weight:700;">${pct}%</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = tableHtml || `<tr><td colspan="5" style="text-align:center;">Tidak ada data OSA</td></tr>`;

  let tw1 = Math.round(totTarget * (7 / 31)), tw2 = Math.round(totTarget * (7 / 31)), tw3 = Math.round(totTarget * (7 / 31)), tw4 = Math.round(totTarget * (10 / 31));
  let pw1 = tw1 > 0 ? ((sumW1 / tw1) * 100).toFixed(1) : "0.0";
  let pw2 = tw2 > 0 ? ((sumW2 / tw2) * 100).toFixed(1) : "0.0";
  let pw3 = tw3 > 0 ? ((sumW3 / tw3) * 100).toFixed(1) : "0.0";
  let pw4 = tw4 > 0 ? ((sumW4 / tw4) * 100).toFixed(1) : "0.0";

  document.getElementById("dashOsaTitle").innerText = "Pencapaian Mingguan Target OSA";
  document.getElementById("weeklyOsaKpiContainer").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(0,0,0,0.1); padding:4px 0;">
      <span><b>Minggu 1 (Tgl 1-7):</b> Rp ${sumW1.toLocaleString('id-ID')} / Rp ${tw1.toLocaleString('id-ID')}</span>
      <span class="status-badge ${parseFloat(pw1) >= 100 ? 'badge-success' : 'badge-danger'}">(${pw1}%)</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(0,0,0,0.1); padding:4px 0;">
      <span><b>Minggu 2 (Tgl 8-14):</b> Rp ${sumW2.toLocaleString('id-ID')} / Rp ${tw2.toLocaleString('id-ID')}</span>
      <span class="status-badge ${parseFloat(pw2) >= 100 ? 'badge-success' : 'badge-danger'}">(${pw2}%)</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(0,0,0,0.1); padding:4px 0;">
      <span><b>Minggu 3 (Tgl 15-21):</b> Rp ${sumW3.toLocaleString('id-ID')} / Rp ${tw3.toLocaleString('id-ID')}</span>
      <span class="status-badge ${parseFloat(pw3) >= 100 ? 'badge-success' : 'badge-danger'}">(${pw3}%)</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
      <span><b>Minggu 4 (Tgl 22-31):</b> Rp ${sumW4.toLocaleString('id-ID')} / Rp ${tw4.toLocaleString('id-ID')}</span>
      <span class="status-badge ${parseFloat(pw4) >= 100 ? 'badge-success' : 'badge-danger'}">(${pw4}%)</span>
    </div>
  `;

  renderDailyChartCanvas('dailyOsaChartCanvas', globalHeaderDailyOSA, rows, 'Penjualan OSA Harian', '#10b981', 'rgba(16, 185, 129, 0.15)', 'dailyOsaChartInstance');
}

function renderDailySpSection(rows, remainingDays) {
  const tbody = document.getElementById("execDailySpTableBody");
  if (!tbody) return;

  let totTarget = 0, sumW1 = 0, sumW2 = 0, sumW3 = 0, sumW4 = 0;
  let tableHtml = "";

  rows.forEach(r => {
    let dse = String(r[0] || "").trim();
    if (!dse || dse.toUpperCase() === "DSE CODE") return;
    let tgt = parseNum(r[2]);
    let ach = parseNum(r[3]);
    let remaining = Math.max(0, tgt - ach);
    let dailyTarget = remaining / remainingDays; 
    let pct = tgt > 0 ? ((ach / tgt) * 100).toFixed(1) : "0.0";

    totTarget += tgt;
    for (let colIdx = 5; colIdx < globalHeaderDailySP.length; colIdx++) {
      let day = parseInt(globalHeaderDailySP[colIdx].split('/')[0]);
      let val = parseNum(r[colIdx]);
      if (!isNaN(day)) {
        if (day >= 1 && day <= 7) sumW1 += val;
        else if (day >= 8 && day <= 14) sumW2 += val;
        else if (day >= 15 && day <= 21) sumW3 += val;
        else if (day >= 22 && day <= 31) sumW4 += val;
      }
    }

    tableHtml += `
      <tr>
        <td><b>${dse}</b></td>
        <td>${Math.round(remaining).toLocaleString('id-ID')} pcs</td>
        <td><b>${Math.round(dailyTarget).toLocaleString('id-ID')} pcs</b></td>
        <td>${Math.round(ach).toLocaleString('id-ID')} pcs</td>
        <td><span style="color:${parseFloat(pct) >= 100 ? '#15803d' : '#ef4444'}; font-weight:700;">${pct}%</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = tableHtml || `<tr><td colspan="5" style="text-align:center;">Tidak ada data SP Sell In</td></tr>`;

  let tw1 = Math.round(totTarget * (7 / 31)), tw2 = Math.round(totTarget * (7 / 31)), tw3 = Math.round(totTarget * (7 / 31)), tw4 = Math.round(totTarget * (10 / 31));
  let pw1 = tw1 > 0 ? ((sumW1 / tw1) * 100).toFixed(1) : "0.0";
  let pw2 = tw2 > 0 ? ((sumW2 / tw2) * 100).toFixed(1) : "0.0";
  let pw3 = tw3 > 0 ? ((sumW3 / tw3) * 100).toFixed(1) : "0.0";
  let pw4 = tw4 > 0 ? ((sumW4 / tw4) * 100).toFixed(1) : "0.0";

  document.getElementById("dashSpTitle").innerText = "Pencapaian Mingguan Target SP Sell In";
  document.getElementById("weeklySpKpiContainer").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(0,0,0,0.1); padding:4px 0;">
      <span><b>Minggu 1 (Tgl 1-7):</b> ${sumW1.toLocaleString('id-ID')} / ${tw1.toLocaleString('id-ID')} pcs</span>
      <span class="status-badge ${parseFloat(pw1) >= 100 ? 'badge-success' : 'badge-danger'}">(${pw1}%)</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(0,0,0,0.1); padding:4px 0;">
      <span><b>Minggu 2 (Tgl 8-14):</b> ${sumW2.toLocaleString('id-ID')} / ${tw2.toLocaleString('id-ID')} pcs</span>
      <span class="status-badge ${parseFloat(pw2) >= 100 ? 'badge-success' : 'badge-danger'}">(${pw2}%)</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(0,0,0,0.1); padding:4px 0;">
      <span><b>Minggu 3 (Tgl 15-21):</b> ${sumW3.toLocaleString('id-ID')} / ${tw3.toLocaleString('id-ID')} pcs</span>
      <span class="status-badge ${parseFloat(pw3) >= 100 ? 'badge-success' : 'badge-danger'}">(${pw3}%)</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
      <span><b>Minggu 4 (Tgl 22-31):</b> ${sumW4.toLocaleString('id-ID')} / ${tw4.toLocaleString('id-ID')} pcs</span>
      <span class="status-badge ${parseFloat(pw4) >= 100 ? 'badge-success' : 'badge-danger'}">(${pw4}%)</span>
    </div>
  `;

  renderDailyChartCanvas('dailySpChartCanvas', globalHeaderDailySP, rows, 'Penjualan SP Sell In Harian', '#0891b2', 'rgba(8, 145, 178, 0.15)', 'dailySpChartInstance');
}

function renderDailyChartCanvas(canvasId, header, dataRows, datasetLabel, borderColor, bgColor, instanceName) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  let dateLabels = [], dailyTotals = [];
  for (let c = 5; c < header.length; c++) {
    dateLabels.push(header[c]);
    let colTotal = 0;
    dataRows.forEach(r => colTotal += parseNum(r[c]));
    dailyTotals.push(colTotal);
  }

  if (instanceName === 'dailyOsaChartInstance') {
      if (dailyOsaChartInstance) dailyOsaChartInstance.destroy();
  } else {
      if (dailySpChartInstance) dailySpChartInstance.destroy();
  }

  let newChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: dateLabels,
      datasets: [{
        label: datasetLabel,
        data: dailyTotals,
        borderColor: borderColor,
        backgroundColor: bgColor,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { font: { size: 9 }, color: '#475569' } }, y: { ticks: { font: { size: 9 }, color: '#475569' } } }
    }
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

    let totalOutlet = globalDataDO.length;
    let targetSellIn = 0, achSellIn = 0, targetOsa = 0, achOsa = 0, bioAchCount = 0, tagAchCount = 0;

    globalDataDO.forEach(r => {
        targetSellIn += Math.ceil(parseNum(r[7]));
        achSellIn += parseNum(r[8]);
        targetOsa += parseNum(r[11]);
        achOsa += parseNum(r[12]);
        if (parseNum(r[18]) >= 1) bioAchCount++; 
        if (parseNum(r[15]) >= 3 || parseNum(r[16]) >= 1) tagAchCount++; 
    });

    let pctSellIn = targetSellIn > 0 ? (achSellIn / targetSellIn) * 100 : 0;
    let pctOsa = targetOsa > 0 ? (achOsa / targetOsa) * 100 : 0;
    let pctBio = totalOutlet > 0 ? (bioAchCount / totalOutlet) * 100 : 0;
    let pctTag = totalOutlet > 0 ? (tagAchCount / totalOutlet) * 100 : 0;

    document.getElementById("exKpiRev").innerText = "Rp " + Math.round(totalRev).toLocaleString('id-ID');
    document.getElementById("exKpiTertiary").innerText = Math.round(totalTertiary).toLocaleString('id-ID');
    document.getElementById("exKpiTradeSupply").innerText = Math.round(totalTradeSupply).toLocaleString('id-ID');
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

    let tagTargetVal = totalOutlet > 0 ? totalOutlet : 163;
    let tagAchPct = tagTargetVal > 0 ? (tagAchCount / tagTargetVal) * 100 : 0;
    let tagScore = Math.min(tagAchPct, 140);
    let tagWeighted = tagScore * 0.175;

    let fwaTargetVal = 10;
    let fwaAchCount = 1; 
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
    document.getElementById("rseActTag").innerText = tagAchCount.toLocaleString('id-ID');
    document.getElementById("rseAchTag").innerText = tagAchPct.toFixed(2) + "%";
    document.getElementById("rseWScoreTag").innerText = tagWeighted.toFixed(2) + "%";

    document.getElementById("rseActFwa").innerText = fwaAchCount.toLocaleString('id-ID');
    document.getElementById("rseAchFwa").innerText = fwaAchPct.toFixed(2) + "%";
    document.getElementById("rseWScoreFwa").innerText = fwaWeighted.toFixed(2) + "%";

    document.getElementById("rseWScoreProd").innerText = dseProdWeighted.toFixed(2) + "%";
    document.getElementById("rseTotalScoreText").innerText = totalRseScore.toFixed(2) + "%";
    document.getElementById("rseFooterTotal").innerText = totalRseScore.toFixed(2) + "%";

    let selDse = document.getElementById("execDseFilter")?.value || "ALL";
    let selHari = document.getElementById("execHariFilter")?.value.toUpperCase() || "ALL";
    let colIdxHari = selHari !== "ALL" ? globalHeaderDO.findIndex(h => h.toUpperCase() === selHari) : -1;

    let missionRows = globalDataDO.filter(r => {
        let matchDse = (selDse === "ALL" || String(r[2] || "").trim() === selDse);
        let matchHari = (colIdxHari === -1 || parseNum(r[colIdxHari]) > 0);
        return matchDse && matchHari;
    });

    let mTargetSellInTotal = 0, mTargetOsaTotal = 0, mUnachBio = 0, mUnachTag = 0;
    let subAchSellIn = 0, subAchOsa = 0;

    missionRows.forEach(r => {
        mTargetSellInTotal += parseNum(r[7]);
        mTargetOsaTotal += parseNum(r[11]);
        subAchSellIn += parseNum(r[8]);
        subAchOsa += parseNum(r[12]);
        if (parseNum(r[18]) < 1) mUnachBio++;
        if (parseNum(r[15]) < 3 && parseNum(r[16]) < 1) mUnachTag++;
    });

    let totalGapSellIn = Math.max(0, mTargetSellInTotal - subAchSellIn);
    let totalGapOsa = Math.max(0, mTargetOsaTotal - subAchOsa);

    document.getElementById("exMissionSellInTgt").innerText = Math.round(totalGapSellIn).toLocaleString('id-ID') + " pcs";
    document.getElementById("exTotalGapSelIn").innerText = "Total GAP: " + Math.round(totalGapSellIn).toLocaleString('id-ID') + " pcs";
    document.getElementById("exMissionOsaTgt").innerText = "Rp " + Math.round(totalGapOsa).toLocaleString('id-ID');
    document.getElementById("exTotalGapOsa").innerText = "Total GAP OSA";
    document.getElementById("exMissionBioUnach").innerText = mUnachBio.toLocaleString('id-ID') + " Outlet";
    document.getElementById("exMissionTagUnach").innerText = mUnachTag.toLocaleString('id-ID') + " Outlet";

    renderTargetNonKpiTable(selDse);
    renderDseAttentionTable();
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

        let tgtTag50 = Math.ceil(dseMap[k].totalOutlet * 0.5);
        let tagAch = dseMap[k].tagAch;
        let gapTag = Math.max(0, tgtTag50 - tagAch);

        let tgtBio80 = Math.ceil(dseMap[k].totalOutlet * 0.8);
        let bioAch = dseMap[k].bioAch;
        let gapBio = Math.max(0, tgtBio80 - bioAch);

        return `
            <tr>
                <td><b>${k}</b></td>
                <td><span class="badge-target">Ach: ${fwaAch} | Target: ${tgtFwa} <br><b style="color:#e11d48;">GAP: ${gapFwa} pcs</b></span></td>
                <td><span class="badge-target">Ach: ${tagAch} | Target: ${tgtTag50} <br><b style="color:#e11d48;">GAP: ${gapTag} Outlet</b></span></td>
                <td><span class="badge-target">Ach: ${bioAch} | Target: ${tgtBio80} <br><b style="color:#e11d48;">GAP: ${gapBio} Outlet</b></span></td>
            </tr>
        `;
    }).join('');
}

function renderDseAttentionTable() {
    const tbody = document.getElementById("dseAttentionTableBody");
    if (!tbody) return;

    let dseMap = {};
    globalDataDO.forEach(r => {
        let dName = String(r[2] || '').trim();
        if (!dName || dName === 'undefined') return;
        if (!dseMap[dName]) {
            dseMap[dName] = { 
                name: dName, 
                achOsa: 0, 
                targetOsa: 0, 
                achSellIn: 0, 
                targetSellIn: 0, 
                outletSellIn3PcsAch: 0,
                outletSellIn3PcsTgt: 25 
            };
        }
        dseMap[dName].achOsa += parseNum(r[12]);
        dseMap[dName].targetOsa += parseNum(r[11]);
        dseMap[dName].achSellIn += parseNum(r[8]);
        dseMap[dName].targetSellIn += Math.ceil(parseNum(r[7]));
        
        if (parseNum(r[8]) >= 3) {
            dseMap[dName].outletSellIn3PcsAch++;
        }
    });

    let keys = Object.keys(dseMap).sort();
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tidak ada data DSE</td></tr>`;
        return;
    }

    tbody.innerHTML = keys.map(k => {
        let d = dseMap[k];
        let osaPct = d.targetOsa > 0 ? ((d.achOsa / d.targetOsa) * 100).toFixed(1) : "0.0";
        let sellInPct = d.targetSellIn > 0 ? ((d.achSellIn / d.targetSellIn) * 100).toFixed(1) : "0.0";
        let sellIn3PcsPct = d.outletSellIn3PcsTgt > 0 ? ((d.outletSellIn3PcsAch / d.outletSellIn3PcsTgt) * 100).toFixed(1) : "0.0";

        let formattedAchOsa = "Rp " + Math.round(d.achOsa).toLocaleString('id-ID');
        let formattedTgtOsa = (d.targetOsa / 1000000).toFixed(1) + " Juta";

        return `
            <tr>
                <td><b>${k}</b></td>
                <td>${formattedAchOsa} / ${formattedTgtOsa}</td>
                <td><span style="color:${parseFloat(osaPct) >= 100 ? '#15803d' : '#ef4444'}; font-weight:700;">${osaPct}%</span></td>
                <td>${d.achSellIn.toLocaleString('id-ID')} / ${d.targetSellIn.toLocaleString('id-ID')}</td>
                <td><span style="color:${parseFloat(sellInPct) >= 100 ? '#15803d' : '#ef4444'}; font-weight:700;">${sellInPct}%</span></td>
                <td><b>${d.outletSellIn3PcsAch} / ${d.outletSellIn3PcsTgt} Outlet</b> <span style="color:#64748b; font-size:10px;">(${sellIn3PcsPct}%)</span></td>
            </tr>
        `;
    }).join('');
}

function actionGotoOutletUnach(filterType) {
    filterUnachModeDO = true;
    quickFilterTypeDO = filterType;
    const tabDOBtn = document.querySelectorAll('.tab-btn')[3];
    switchReport('detail-outlet', tabDOBtn);
}

function takeSectionSnapshot(sectionId) {
    const targetElem = document.getElementById(sectionId);
    if (!targetElem) {
        alert("Bagian/Section tidak ditemukan!");
        return;
    }
    html2canvas(targetElem, { scale: 2, useCORS: true, logging: false }).then(canvas => {
        let link = document.createElement("a");
        link.download = `Snapshot_${sectionId}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }).catch(err => {
        console.error("Gagal mengambil snapshot:", err);
        alert("Gagal mengambil snapshot section.");
    });
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

    let focusList = [
        "penanganan site berstatus AT RISK secara intensif",
        "percepatan eksekusi target SP Sell In pada outlet tier-2",
        "optimalisasi kunjungan DSE ke wilayah dengan penetrasi rendah",
        "peningkatan kepatuhan Tagging 3PCS di seluruh titik mikro cluster"
    ];

    let actionList = [
        "Fokuskan supervisi harian pada DSE dengan pencapaian di bawah rata-rata.",
        "Pastikan ketersediaan stok produk IM3 mencukupi di level outlet.",
        "Jadwalkan program jemput bola untuk outlet yang belum bertransaksi.",
        "Evaluasi pencapaian harian secara berkala setiap sore menjelang tutup logistik."
    ];

    let prefixTypes = [
        `⚡ <b>AI Executive Insight #${Math.floor(Math.random() * 900) + 100}:</b>`,
        `💡 <b>AI Strategic Recommendation:</b>`,
        `📈 <b>AI Performance Analytics:</b>`
    ];

    let randPrefix = prefixTypes[Math.floor(Math.random() * prefixTypes.length)];
    let randFocus = focusList[Math.floor(Math.random() * focusList.length)];
    let randAction = actionList[Math.floor(Math.random() * actionList.length)];

    let dynamicText = `${randPrefix} Total Revenue MTD tercatat <b>Rp ${Math.round(totRevPST).toLocaleString('id-ID')}</b> dari ${totalSite} site aktif dan ${totalOutlet} outlet. Rekomendasi taktis saat ini diarahkan pada <b>${randFocus}</b>. ${randAction}`;

    elem.innerHTML = dynamicText;
}

function updateGlobalAiHeaderSummary() {
    refreshGlobalAiSummary();
}

function renderLeaderboardList(elemId, items, isAlert = false) {
    const elem = document.getElementById(elemId);
    if (!elem) return;
    const badges = ["🥇", "🥈", "🥉"];
    elem.innerHTML = items.map((it, idx) => `
        <div class="lb-item">
            <span class="lb-rank">${badges[idx] || (idx + 1)}</span>
            <div class="lb-info-group">
                <span class="lb-name">${it.name}</span>
                ${it.subText ? `<span class="lb-subtext">${it.subText}</span>` : ''}
            </div>
            <span class="lb-val ${isAlert ? 'badge-danger' : 'badge-success'}">${it.val}</span>
        </div>
    `).join('');
}

function exportExcelCurrent() { alert("Proses Export Excel dimulai..."); }
function takeScreenshot() {
    html2canvas(document.body).then(canvas => {
        let link = document.createElement("a");
        link.download = "Dashboard_MC_Bengkayang_Snapshot.png";
        link.href = canvas.toDataURL();
        link.click();
    });
}

function takeTableSnapshotDO() {
    const originalTable = document.querySelector("#detail-outlet #dataTableDO");
    if (!originalTable) {
        alert("Tabel detail outlet tidak ditemukan!");
        return;
    }
    const cloneWrapper = document.createElement("div");
    cloneWrapper.style.position = "absolute";
    cloneWrapper.style.left = "-9999px";
    cloneWrapper.style.top = "0";
    cloneWrapper.style.width = "max-content";
    cloneWrapper.style.backgroundColor = "#ffffff";
    cloneWrapper.style.padding = "20px";

    const clonedTable = originalTable.cloneNode(true);
    clonedTable.style.width = "100%";
    clonedTable.style.display = "table";
    clonedTable.querySelectorAll("th, td").forEach(el => {
        el.style.position = "static";
        el.style.zIndex = "auto";
    });

    cloneWrapper.appendChild(clonedTable);
    document.body.appendChild(cloneWrapper);

    html2canvas(cloneWrapper, { scale: 2, useCORS: true, logging: false }).then(canvas => {
        document.body.removeChild(cloneWrapper);
        let link = document.createElement("a");
        link.download = "Snapshot_Detail_Outlet_Sales_Full.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    }).catch(err => {
        document.body.removeChild(cloneWrapper);
        console.error(err);
    });
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
  const isFreeze2Col = (tableId === "dataTableMC" || tableId === "dataTableDO" || tableId === "dataTablePP");

  activeHeader.forEach((judul, index) => {
    const th = document.createElement("th");
    const txt = String(judul || "").trim().toUpperCase();
    th.innerText = judul || "";
    let baseStyle = "padding: 12px 18px !important; font-size: 12px !important; text-align: center; white-space: nowrap; min-width: 140px; border-right: 1px solid rgba(255,255,255,0.1);";
    
    if (tableId === "dataTablePP") {
        let bgStyle = "background-color: #1e293b !important; color: #FFFFFF !important;";
        if (index === 0) {
          th.style.cssText = baseStyle + " background-color: #be123c !important; color: #FFFFFF !important; position: sticky; left: 0; min-width: 150px; border-right: 2px solid #f59e0b;";
        } else if (index === 1) {
          th.style.cssText = baseStyle + " background-color: #be123c !important; color: #FFFFFF !important; position: sticky; left: 150px; min-width: 200px; border-right: 2px solid #f59e0b;";
        } else {
          if (txt.includes("IM3") || txt.includes("PREPAID")) bgStyle = "background-color: #f59e0b !important; color: #000 !important;";
          else if (txt.includes("MTD") || txt.includes("REV")) bgStyle = "background-color: #e11d48 !important; color: #FFF !important;";
          else if (txt.includes("LMTD") || txt.includes("PRIMARY")) bgStyle = "background-color: #0891b2 !important; color: #FFF !important;";
          th.style.cssText = baseStyle + " " + bgStyle;
        }
    } else {
        if (index === 0) {
          th.style.cssText = baseStyle + " background-color: #be123c !important; color: #FFFFFF !important; position: sticky; left: 0; top: 0; z-index: 1000; min-width: 150px; border-right: 2px solid #f59e0b;";
        } else if (isFreeze2Col && index === 1) {
          th.style.cssText = baseStyle + " background-color: #be123c !important; color: #FFFFFF !important; position: sticky; left: 150px; top: 0; z-index: 1000; min-width: 200px; border-right: 2px solid #f59e0b;";
        } else {
          let bgStyle = "background-color: #1e293b !important; color: #FFFFFF !important;";
          if (txt.includes("IM3") || txt.includes("PREPAID")) bgStyle = "background-color: #f59e0b !important; color: #000 !important;";
          else if (txt.includes("MTD") || txt.includes("REV")) bgStyle = "background-color: #e11d48 !important; color: #FFF !important;";
          else if (txt.includes("LMTD") || txt.includes("PRIMARY")) bgStyle = "background-color: #0891b2 !important; color: #FFF !important;";
          th.style.cssText = baseStyle + " " + bgStyle + " position: sticky; top: 0; z-index: 900;";
        }
    }
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  activeData.forEach((baris) => {
    const tr = document.createElement("tr");
    baris.forEach((nilai, index) => {
      const td = document.createElement("td");
      const judulKolom = String(activeHeader[index] || "").trim().toUpperCase();
      let rawStr = String(nilai !== undefined && nilai !== null ? nilai : "").trim();
      let valDisplay = rawStr;
      let numVal = parseNum(rawStr);
      let isPercent = false;
      let pctVal = 0;

      if (judulKolom.includes("TARGET SP SELL IN")) valDisplay = Math.ceil(numVal).toLocaleString("id-ID");
      else if (judulKolom.includes("BIOMETRIX") || judulKolom.includes("RGUGA")) {
        valDisplay = Math.floor(numVal).toLocaleString("id-ID");
      }
      else if ((judulKolom.includes("ACH OSA") || judulKolom.includes("PREPAID REV")) && numVal >= 1000) {
        valDisplay = "Rp " + Math.round(numVal).toLocaleString("id-ID");
      }
      else if (judulKolom.includes("%") || judulKolom.includes("ACH %")) {
        if (rawStr !== "" && !isNaN(Number(rawStr))) {
          isPercent = true;
          pctVal = Math.abs(numVal) <= 1 && numVal !== 0 ? numVal * 100 : numVal;
          valDisplay = pctVal.toFixed(1) + "%";
        }
      } else if (rawStr !== "" && !isNaN(Number(rawStr)) && !judulKolom.includes("ID") && !judulKolom.includes("CODE") && Math.abs(numVal) >= 1000) {
        valDisplay = Math.round(numVal).toLocaleString("id-ID");
      }

      td.innerHTML = valDisplay;
      let tdStyle = "padding: 10px 16px !important; font-size: 12.5px !important; text-align: center; white-space: nowrap;";
      if (isPercent) {
        if (pctVal >= 120) tdStyle += " background-color: #dbeafe !important; color: #1e40af !important; font-weight: 800;";
        else if (pctVal >= 100) tdStyle += " background-color: #dcfce7 !important; color: #15803d !important; font-weight: 700;";
        else if (pctVal < 50) tdStyle += " background-color: #fee2e2 !important; color: #b91c1c !important; font-weight: 700;";
      }

      if (index === 0) td.style.cssText = tdStyle + " position: sticky; left: 0; font-weight: 700; z-index: 500; border-right: 2px solid #f59e0b;";
      else if (isFreeze2Col && index === 1) td.style.cssText = tdStyle + " position: sticky; left: 150px; font-weight: 700; z-index: 500; border-right: 2px solid #f59e0b;";
      else td.style.cssText = tdStyle;

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function switchReport(reportId, btnObj) {
  currentActiveTabId = reportId;
  document.querySelectorAll('.report-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

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
  if (e.target.id === "searchInput" || e.target.id === "partnerFilter") updateDashboardMS();
  if (e.target.id.includes("MC")) updateDashboardSM();
  if (e.target.id.includes("DO") || e.target.id === "columnFilterValDO") updateDashboardDO();
  if (e.target.id.includes("Daily")) updateDashboardDaily();
  if (e.target.id.includes("PP")) updateDashboardPP();
});

document.addEventListener("change", function (e) {
  if (e.target.id === "partnerFilter") updateDashboardMS();
  if (e.target.id.includes("MC")) updateDashboardSM();
  if (e.target.id.includes("DO" ) || e.target.id === "columnFilterDO") updateDashboardDO();
  if (e.target.id.includes("Daily")) updateDashboardDaily();
  if (e.target.id.includes("PP")) updateDashboardPP();
});