// server/controllers/haccp/exportController.js
const pool = require('../../config/db');
const PDFDocument = require('pdfkit-table');
const xlsx = require('xlsx');

// --- EXPORT ETICHETTE PRODUZIONE ---
exports.exportLabels = async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const { format, start, end, rangeName } = req.query; 
        
        const ristRes = await pool.query("SELECT nome, dati_fiscali FROM ristoranti WHERE id = $1", [ristorante_id]);
        const azienda = ristRes.rows[0];
        
        let sql = "SELECT * FROM haccp_labels WHERE ristorante_id = $1";
        const params = [ristorante_id];
        if (start && end) { 
            sql += " AND data_produzione >= $2 AND data_produzione <= $3"; 
            params.push(start, end); 
        }
        sql += " ORDER BY data_produzione ASC";
        const r = await pool.query(sql, params);
        
        const titoloReport = "REGISTRO PRODUZIONE";
        const headers = ["Data Prod.", "Prodotto", "Ingredienti", "Tipo", "Lotto", "Scadenza", "Operatore"];
        const rows = r.rows.map(l => [
            new Date(l.data_produzione).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }), 
            String(l.prodotto || ''), 
            String(l.ingredienti || '').replace(/, /g, '\n'), 
            String(l.tipo_conservazione || ''), 
            String(l.lotto || ''), 
            new Date(l.data_scadenza).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }), 
            String(l.operatore || '')
        ]);
        
        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="produzione_${rangeName || 'export'}.pdf"`);
                res.send(pdfData);
            });

            doc.fontSize(16).text(String(azienda.nome), { align: 'center' });
            doc.fontSize(10).text(String(azienda.dati_fiscali || ""), { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`${titoloReport}: ${rangeName || 'Completo'}`, { align: 'center' });
            doc.moveDown();
            
            await doc.table({ headers, rows }, { 
                width: 750, 
                columnsSize: [70, 100, 250, 60, 100, 70, 80], 
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), 
                prepareRow: () => doc.font("Helvetica").fontSize(8) 
            });
            doc.end();
        } else {
            const wb = xlsx.utils.book_new();
            const rowAzienda = [azienda.dati_fiscali || azienda.nome];
            const rowPeriodo = [`Periodo: ${rangeName || 'Tutto lo storico'}`];
            const rowTitolo = [titoloReport];
            const rowEmpty = [""];
            const finalData = [rowAzienda, rowPeriodo, rowTitolo, rowEmpty, headers, ...rows];
            const ws = xlsx.utils.aoa_to_sheet(finalData);
            if(!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });
            xlsx.utils.book_append_sheet(wb, ws, "Produzione");
            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', `attachment; filename="produzione.xlsx"`);
            res.send(buffer);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- EXPORT GENERICO ---
exports.exportGeneric = async (req, res) => {
    try {
        const { tipo, ristorante_id } = req.params;
        const { start, end, rangeName, format } = req.query; 
        
        const ristRes = await pool.query("SELECT nome, dati_fiscali FROM ristoranti WHERE id = $1", [ristorante_id]);
        const aziendaInfo = ristRes.rows[0];

        // 1. GESTIONE SPECIALE: MATRICE TEMPERATURE (LAYOUT VERTICALE & FIX DATE)
        if (tipo === 'temperature_matrix') {
            // FIX LOCALE: Recuperiamo anche il campo 'locale' dagli assets
            const assetsRes = await pool.query("SELECT id, nome, locale FROM haccp_assets WHERE ristorante_id = $1 AND tipo IN ('frigo','cella','vetrina','congelatore','abbattitore') ORDER BY nome", [ristorante_id]);
            const assets = assetsRes.rows;

            // FIX TIMEZONE: Usiamo il database per filtrare ma poi la logica date la facciamo in JS
            let sqlLogs = `SELECT l.data_ora, l.asset_id, l.valore, l.operatore FROM haccp_logs l WHERE l.ristorante_id = $1 AND l.data_ora >= $2 AND l.data_ora <= $3`;
            const logsRes = await pool.query(sqlLogs, [ristorante_id, start, end]);
            const logs = logsRes.rows;

            // FIX DATE 1: Parsing manuale per evitare il problema del fuso orario nel loop
            const [yearS, monthS, dayS] = start.split('-').map(Number);
            const [yearE, monthE, dayE] = end.split('-').map(Number);

            const days = [];
            // Creiamo le date a MEZZOGIORNO (12:00) per evitare che 00:00 diventi 23:00 del giorno prima
            let curr = new Date(yearS, monthS - 1, dayS, 12, 0, 0); 
            const endDate = new Date(yearE, monthE - 1, dayE, 12, 0, 0);

            while (curr <= endDate) {
                days.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }

            // Headers Tabella (Centrati)
            const tableHeaders = ["GIORNO", ...assets.map(a => a.nome.substring(0, 15).toUpperCase())];
            
            const tableRows = days.map(day => {
                const dayNum = new Date(day).getDate();
                const rowData = [String(dayNum)];
                assets.forEach(asset => {
                    const log = logs.find(l => {
                        const logDate = new Date(l.data_ora).toISOString().split('T')[0];
                        return logDate === day && l.asset_id === asset.id;
                    });
                    rowData.push(log ? (log.valore === 'OFF' ? 'OFF' : `${log.valore}`) : "");
                });
                return rowData;
            });

            if (format === 'pdf') {
                const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'portrait' });
                
                let buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    let pdfData = Buffer.concat(buffers);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="registro_temperature_ufficiale.pdf"`);
                    res.send(pdfData);
                });

                // --- HEADER DISEGNATO ---
                const pageWidth = 595.28; 
                const margin = 20;
                const contentWidth = pageWidth - (margin * 2);
                const headerY = 20;
                const headerH = 65; // Aumentato per spazio dati fiscali
                
                const xDiv1 = margin + (contentWidth * 0.35); // Allargata colonna sinistra
                const xDiv2 = margin + (contentWidth * 0.85);

                doc.lineWidth(0.5);

                // Box
                doc.rect(margin, headerY, contentWidth, headerH).stroke(); 
                doc.moveTo(xDiv1, headerY).lineTo(xDiv1, headerY + headerH).stroke(); 
                doc.moveTo(xDiv2, headerY).lineTo(xDiv2, headerY + headerH).stroke(); 

                // FIX 2: INTESTAZIONE DA DASHBOARD
                // Usiamo Nome Azienda in Grassetto e Dati Fiscali sotto
                const nomeAz = aziendaInfo.nome ? aziendaInfo.nome.toUpperCase() : "AZIENDA";
                const datiFisc = aziendaInfo.dati_fiscali || "";

                doc.font("Helvetica-Bold").fontSize(11);
                doc.text(nomeAz, margin + 5, headerY + 10, { 
                    width: (xDiv1 - margin) - 10, 
                    align: 'center',
                    ellipsis: true
                });
                
                doc.font("Helvetica").fontSize(8);
                doc.text(datiFisc, margin + 5, headerY + 25, { 
                    width: (xDiv1 - margin) - 10, 
                    align: 'center',
                    height: headerH - 30,
                    ellipsis: true
                });
                
                // Titolo Documento
                doc.font("Helvetica").fontSize(10);
                doc.text("SCHEDA DI ATTUAZIONE DEL", xDiv1, headerY + 15, { width: (xDiv2 - xDiv1), align: 'center' });
                doc.font("Helvetica-Bold").fontSize(12);
                doc.text("PIANO DI AUTOCONTROLLO", xDiv1, headerY + 30, { width: (xDiv2 - xDiv1), align: 'center' });

                // Rev
                doc.font("Helvetica").fontSize(9);
                doc.text("Rev 00", xDiv2, headerY + 25, { width: (margin + contentWidth - xDiv2), align: 'center' });

                // Spazio dopo header box (layout fisso per restare su UNA pagina)
                doc.y = headerY + headerH + 18;

                // FIX 3: CENTRATURA TITOLO "DOTAZIONI FRIGORIFERE"
                doc.font("Helvetica-Bold").fontSize(12);
                doc.text("DOTAZIONI FRIGORIFERE", margin, doc.y, { width: contentWidth, align: 'center' });
                doc.moveDown(0.5);

                // FIX 4: MESE E ANNO DALLE STRINGHE ORIGINALI
                const mesi = ["GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO","LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"];
                const nomeMese = mesi[monthS - 1]; // monthS va da 1 a 12

                doc.font("Helvetica").fontSize(10);
                const infoY = doc.y;
                
                doc.text(`MESE: ${nomeMese}`, margin, infoY);
                doc.text(`ANNO: ${yearS}`, margin + 180, infoY);

                // FIX LOCALE: Logica per determinare cosa scrivere
                // Se tutti gli asset sono nello stesso locale, scrivilo. Se misti, scrivi "LOCALI VARI".
                const localiUnici = [...new Set(assets.map(a => a.locale).filter(Boolean))];
                const localeStr = localiUnici.length === 1 ? localiUnici[0].toUpperCase() : (localiUnici.length > 1 ? "LOCALI VARI" : "CUCINA");
                
                doc.text(`LOCALE: ${localeStr}`, margin + 300, infoY);

                doc.moveDown(1);
                // --- TABELLA (FULL WIDTH) - CONTENUTO CENTRATO ---
// La tabella resta estesa come prima (a tutta larghezza utile).
// Centriamo SOLO i valori dentro le celle.
const pageHeight = doc.page.height;
const tableX = margin;
const tableY = doc.y + 8;
const footerReserve = 155; // spazio fisso per "Condizioni" + firma (una sola pagina)
const tableW = contentWidth;

const rowCount = tableRows.length + 1; // + header
const availableH = (pageHeight - margin - footerReserve) - tableY;
const rowH = Math.max(12, availableH / rowCount);

const dayColW = 45;
const assetColW = (tableW - dayColW) / Math.max(1, assets.length);

// Disegno griglia
doc.save();
doc.strokeColor('#888').lineWidth(0.5);

// linee orizzontali
for (let r = 0; r <= rowCount; r++) {
  const y = tableY + (r * rowH);
  doc.moveTo(tableX, y).lineTo(tableX + tableW, y).stroke();
}

// linee verticali (colonna giorno + asset)
let x = tableX;
doc.moveTo(x, tableY).lineTo(x, tableY + (rowCount * rowH)).stroke();

x += dayColW;
doc.moveTo(x, tableY).lineTo(x, tableY + (rowCount * rowH)).stroke();

for (let c = 0; c < assets.length; c++) {
  x += assetColW;
  doc.moveTo(x, tableY).lineTo(x, tableY + (rowCount * rowH)).stroke();
}
doc.restore();

// Header (centrato)
doc.font("Helvetica-Bold").fontSize(7);
let cx = tableX;
for (let c = 0; c < tableHeaders.length; c++) {
  const w = (c === 0) ? dayColW : assetColW;
  const textY = tableY + ((rowH - 7) / 2) - 1;
  doc.text(String(tableHeaders[c] || ""), cx + 1, textY, {
    width: w - 2,
    align: 'center',
    ellipsis: true
  });
  cx += w;
}

// Celle (centrate)
doc.font("Helvetica").fontSize(8);
for (let r = 0; r < tableRows.length; r++) {
  const row = tableRows[r];
  const y = tableY + ((r + 1) * rowH);
  let xCell = tableX;

  for (let c = 0; c < row.length; c++) {
    const w = (c === 0) ? dayColW : assetColW;
    const val = (row[c] == null) ? "" : String(row[c]);

    if (val) {
      const textY = y + ((rowH - 8) / 2) - 1;
      doc.text(val, xCell + 1, textY, {
        width: w - 2,
        align: 'center',
        ellipsis: true
      });
    }
    xCell += w;
  }
}

// Posiziona il cursore sotto la tabella (restando in una pagina)
doc.y = tableY + (rowCount * rowH) + 10;

// PIÈ DI PAGINA
                doc.moveDown(0.5); 
                doc.font("Helvetica-Bold").fontSize(8).text("Condizioni:", { underline: true });
                doc.font("Helvetica").fontSize(7).lineGap(1) 
                   .text("Assenza di promiscuità e di merce non protetta")
                   .text("Assenza segni di sporco visibile, macchie, untuosità al tatto sulle parti a contatto e non con gli alimenti,")
                   .text("Assenza di odori sgradevoli o anomali,")
                   .text("Assenza di prodotti con caratteristiche organolettiche (odore, colore, consistenza) anomali.");
                
                doc.moveDown(0.5);
                doc.font("Helvetica-Bold").text("C: Conforme ai limiti sopra indicati    NC: Non conforme ai limiti sopra indicati");
                
                doc.moveDown(1.5);
                doc.font("Helvetica-Bold").fontSize(9).text("Firma RHACCP:", margin, doc.y);
                const firmaX = margin + 80;
                const firmaY = doc.y - 2; 
                doc.fontSize(9).text("........................................................................................................................", firmaX, firmaY);
                
                doc.end();

            } else {
                // EXCEL
                const wb = xlsx.utils.book_new();
                const sheetData = [
                    [aziendaInfo.nome, "SCHEDA DI ATTUAZIONE PIANO AUTOCONTROLLO", "", "Rev 00"],
                    ["DOTAZIONI FRIGORIFERE"],
                    [`MESE: ${new Date(start).toLocaleString('it-IT',{month:'long'})}`, `ANNO: ${new Date(start).getFullYear()}`],
                    [""],
                    tableHeaders,
                    ...tableRows
                ];
                const ws = xlsx.utils.aoa_to_sheet(sheetData);
                xlsx.utils.book_append_sheet(wb, ws, "Registro");
                const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
                res.setHeader('Content-Disposition', `attachment; filename="registro_temperature.xlsx"`);
                res.send(buffer);
            }
            return;
        }

        // 2. GESTIONE STANDARD (Liste semplici)
        let headers = [], rows = [], sheetName = "Export", titoloReport = "REPORT";
        
        if (tipo === 'temperature') {
            sheetName = "Temperature";
            titoloReport = "REGISTRO TEMPERATURE (LISTA)";
            headers = ["Data", "Ora", "Macchina", "Temp", "Esito", "Az. Correttiva", "Op."];
            let sql = `SELECT l.data_ora, a.nome as asset, l.valore, l.conformita, l.azione_correttiva, l.operatore FROM haccp_logs l JOIN haccp_assets a ON l.asset_id = a.id WHERE l.ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND l.data_ora >= $2 AND l.data_ora <= $3`; params.push(start, end); }
            sql += ` ORDER BY l.data_ora ASC`; 
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => { 
                const d = new Date(row.data_ora); 
                // Fix fuso orario italiano
                return [
                    d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }), 
                    d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit', timeZone: 'Europe/Rome'}), 
                    String(row.asset || ''), 
                    String(row.valore === 'OFF' ? 'SPENTO' : `${row.valore}°C`), 
                    row.conformita ? "OK" : "NO", 
                    String(row.azione_correttiva || ""), 
                    String(row.operatore || "")
                ]; 
            });

        } else if (tipo === 'merci') { 
            sheetName = "Registro Acquisti";
            titoloReport = "CONTABILITÀ MAGAZZINO & ACQUISTI";
            headers = ["Data", "Fornitore", "Prodotto", "Qta", "Unitario €", "Imponibile €", "IVA %", "Totale IVA €", "Totale Lordo €", "Num. Doc", "Note"];
            
            let sql = `SELECT * FROM haccp_merci WHERE ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND data_ricezione >= $2 AND data_ricezione <= $3`; params.push(start, end); }
            sql += ` ORDER BY data_ricezione ASC`; 
            
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => {
                const qta = parseFloat(row.quantita)||0;
                const unit = parseFloat(row.prezzo_unitario)||0;
                const imponibile = parseFloat(row.prezzo) || (qta * unit);
                const ivaPerc = parseFloat(row.iva)||0;
                const ivaValore = imponibile * (ivaPerc / 100);
                const totaleLordo = imponibile + ivaValore;

                return [
                    new Date(row.data_ricezione).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }),
                    String(row.fornitore || ''),
                    String(row.prodotto || ''),
                    String(qta),
                    `€ ${unit.toFixed(2)}`,
                    `€ ${imponibile.toFixed(2)}`,
                    `${ivaPerc}%`,
                    `€ ${ivaValore.toFixed(2)}`,
                    `€ ${totaleLordo.toFixed(2)}`,
                    String(row.lotto || '-'),
                    String(row.note || '')
                ];
            });

        } else if (tipo === 'assets') { 
            sheetName = "Lista Macchine";
            titoloReport = "LISTA MACCHINE E ATTREZZATURE";
            headers = ["Stato", "Nome", "Locale", "Tipo", "Marca", "Matricola", "Range"];
            const r = await pool.query(`SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY nome ASC`, [ristorante_id]);
            rows = r.rows.map(row => [
                String(row.stato ? row.stato.toUpperCase() : "ATTIVO"), 
                String(row.nome || ''), 
                String(row.locale || ''), // Aggiunto export locale
                String(row.tipo || ''), 
                String(row.marca || ''), 
                String(row.serial_number || '-'), 
                `${row.range_min}°C / ${row.range_max}°C`
            ]);

        } else if (tipo === 'pulizie') {
            sheetName = "Registro Pulizie";
            titoloReport = "REGISTRO PULIZIE E SANIFICAZIONI";
            headers = ["Data", "Ora", "Area/Attrezzatura", "Detergente", "Operatore", "Esito"];
            let sql = `SELECT * FROM haccp_cleaning WHERE ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND data_ora >= $2 AND data_ora <= $3`; params.push(start, end); }
            sql += ` ORDER BY data_ora ASC`;
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => [
                new Date(row.data_ora).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }), 
                new Date(row.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit', timeZone: 'Europe/Rome'}), 
                String(row.area || ''), 
                String(row.prodotto || ''), 
                String(row.operatore || ''), 
                row.conformita ? "OK" : "NON CONFORME"
            ]);
        }

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="haccp_${tipo}.pdf"`);
                res.send(pdfData);
            });

            doc.fontSize(16).text(String(aziendaInfo.nome), { align: 'center' });
            doc.fontSize(10).text(String(aziendaInfo.dati_fiscali || ""), { align: 'center' });
            doc.moveDown(0.5); 
            doc.fontSize(12).text(`${titoloReport} - ${rangeName || 'Completo'}`, { align: 'center' }); 
            doc.moveDown(1);
            
            const table = { headers: headers, rows: rows };
            await doc.table(table, { 
                width: 500, 
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), 
                prepareRow: () => doc.font("Helvetica").fontSize(8).fillColor('black') 
            });
            doc.end();
            return; 
        }

        // EXCEL STANDARD
        const wb = xlsx.utils.book_new();
        const rowAzienda = [aziendaInfo.dati_fiscali || aziendaInfo.nome];
        const rowPeriodo = [`Periodo: ${rangeName || 'Tutto lo storico'}`];
        const rowTitolo = [titoloReport];
        const rowEmpty = [""];
        const finalData = [rowAzienda, rowPeriodo, rowTitolo, rowEmpty, headers, ...rows];
        
        const ws = xlsx.utils.aoa_to_sheet(finalData);
        if(!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }); 
        ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }); 
        ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }); 
        
        const wscols = headers.map(() => ({wch: 20}));
        ws['!cols'] = wscols;
        
        xlsx.utils.book_append_sheet(wb, ws, sheetName);
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="haccp_${tipo}_export.xlsx"`);
        res.send(buffer);

    } catch (err) { 
        if (!res.headersSent) res.status(500).json({ error: "Errore Export: " + err.message }); 
    }
};