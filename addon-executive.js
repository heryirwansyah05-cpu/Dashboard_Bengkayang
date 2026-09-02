/* ==========================================================================
   ADD-ON MODULE: TAB TODAY INSTRUCTION (DIRECT VARIABLE INTEGRATION)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    let checkInterval = setInterval(() => {
        if (window.globalDataDO && window.globalDataDO.length > 0) {
            populateTiDseDropdown();
            renderTodayInstructionAddon();
            clearInterval(checkInterval);
        }
    }, 300);
});

// Helper Ambil Data Asli
function getDODataAddon() {
    if (typeof globalDataDO !== "undefined" && globalDataDO.length > 0) return globalDataDO;
    if (window.globalDataDO && window.globalDataDO.length > 0) return window.globalDataDO;
    return [];
}

// Populate Dropdown DSE
function populateTiDseDropdown() {
    const dseSelect = document.getElementById("tiDseFilter");
    if (!dseSelect) return;

    const data = getDODataAddon();
    if (data.length === 0) return;

    const dseList = [...new Set(data.map(item => {
        let val = item['DSE Code'] || item['DSE CODE'] || item['Nama DSE'] || item['DSE'];
        return (val && String(val).trim() !== '') ? String(val).trim() : null;
    }).filter(Boolean))].sort();

    let options = '<option value="ALL">Semua DSE Code</option>';
    dseList.forEach(dse => {
        options += `<option value="${dse}">${dse}</option>`;
    });
    dseSelect.innerHTML = options;
}

function renderTodayInstructionAddon() {
    const container = document.getElementById("tiDseCardsContainer");
    if (!container) return;

    const data = getDODataAddon();
    if (!data || data.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444; font-weight:800;">⚠️ Data belum siap. Silakan upload file Excel atau tunggu sebentar.</div>`;
        return;
    }

    const dseSelect = document.getElementById("tiDseFilter");
    if (dseSelect && dseSelect.options.length <= 1) {
        populateTiDseDropdown();
    }

    const selectedDse = document.getElementById("tiDseFilter") ? document.getElementById("tiDseFilter").value : "ALL";
    const selectedHari = document.getElementById("tiHariFilter") ? document.getElementById("tiHariFilter").value : "ALL";

    // Filter Data Berdasarkan DSE dan Hari Kunjungan
    let filteredDO = data.filter(item => {
        let dseVal = String(item['DSE Code'] || item['DSE CODE'] || item['Nama DSE'] || item['DSE'] || '').trim();
        const dseMatch = (selectedDse === "ALL") || (dseVal.toLowerCase() === selectedDse.toLowerCase());
        
        let hariMatch = true;
        if (selectedHari !== "ALL") {
            let colHari = selectedHari.toUpperCase(); // SENIN, SELASA, RABU, dll
            if (item[colHari] !== undefined && item[colHari] !== null) {
                hariMatch = (parseInt(item[colHari]) === 1 || String(item[colHari]).toUpperCase() === 'YES' || String(item[colHari]).toUpperCase() === '1');
            } else {
                let hariText = String(item['Hari Kunjungan'] || item['HARI'] || '').toUpperCase();
                hariMatch = hariText.includes(colHari);
            }
        }
        
        return dseMatch && hariMatch;
    });

    // Grouping Berdasarkan DSE
    const dseGroups = {};
    filteredDO.forEach(item => {
        let dse = String(item['DSE Code'] || item['DSE CODE'] || item['Nama DSE'] || item['DSE'] || 'DSE').trim();
        if (!dseGroups[dse]) dseGroups[dse] = [];
        dseGroups[dse].push(item);
    });

    let html = "";
    const dseKeys = Object.keys(dseGroups).sort();

    if (dseKeys.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px; color:#64748b; font-weight:700;">Tidak ada data outlet untuk kombinasi DSE <b>${selectedDse}</b> dan Hari <b>${selectedHari}</b>.</div>`;
        return;
    }

    dseKeys.forEach((dseName, idx) => {
        const outlets = dseGroups[dseName];
        
        // Filter Outlet Kritis Sesuai Parameter Anda
        const criticalOutlets = outlets.filter(o => {
            const bio = parseFloat(o['RGUGA BIOMETRIX MTD'] || o['Biometrik'] || o['BIO'] || 0);
            const tag = parseFloat(o['SP TAGGING'] || o['TAGGING 3PCS'] || o['Tagging'] || 0);
            const osa = parseFloat(o['ACH OSA'] || o['OSA Rp'] || o['OSA'] || 0);
            const sellIn = parseFloat(o['SP SELL IN'] || o['Sell In SP'] || o['SELL_IN'] || 0);
            return bio === 0 || tag < 3 || osa < 300000 || sellIn < 3;
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
                                ${criticalOutlets.map(o => {
                                    const idOut = o['Outlet Id'] || o['ID Outlet'] || '-';
                                    const nameOut = o['Outlet Name'] || o['Nama Outlet'] || '-';
                                    
                                    const bio = parseFloat(o['RGUGA BIOMETRIX MTD'] || o['Biometrik'] || o['BIO'] || 0);
                                    const tag = parseFloat(o['SP TAGGING'] || o['TAGGING 3PCS'] || o['Tagging'] || 0);
                                    const osa = parseFloat(o['ACH OSA'] || o['OSA Rp'] || o['OSA'] || 0);
                                    const sellIn = parseFloat(o['SP SELL IN'] || o['Sell In SP'] || o['SELL_IN'] || 0);

                                    let notes = [];
                                    if (bio === 0) notes.push("⚠️ Belum Bio");
                                    if (tag < 3) notes.push("⚠️ Tag < 3 Pcs");
                                    if (osa < 300000) notes.push("⚠️ OSA < 300rb");
                                    if (sellIn < 3) notes.push("⚠️ SP < 3 Pcs");

                                    return `
                                        <tr style="border-bottom:1px solid #e2e8f0; text-align:center;">
                                            <td style="padding:8px; text-align:left; font-weight:700;">${idOut}</td>
                                            <td style="padding:8px; text-align:left; font-weight:700; color:#0f172a;">${nameOut}</td>
                                            <td style="padding:8px;"><b style="color:${sellIn < 3 ? '#e11d48' : '#10b981'};">${sellIn} pcs</b></td>
                                            <td style="padding:8px;"><b style="color:${osa < 300000 ? '#e11d48' : '#10b981'};">Rp ${Math.round(osa).toLocaleString('id-ID')}</b></td>
                                            <td style="padding:8px;"><b style="color:${bio === 0 ? '#e11d48' : '#10b981'};">${bio}</b></td>
                                            <td style="padding:8px;"><b style="color:${tag < 3 ? '#e11d48' : '#10b981'};">${tag} pcs</b></td>
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