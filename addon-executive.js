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