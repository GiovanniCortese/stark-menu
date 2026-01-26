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

            doc.font("Helvetica-Bold").fontSize(14).text(titoloReport, { align: 'center' });
            doc.moveDown(0.5);
            doc.font("Helvetica").fontSize(9).text(azienda?.nome || '', { align: 'center' });
            doc.moveDown(1);

            await doc.table(
                { headers, rows },
                {
                    width: 760,
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9),
                    prepareRow: () => doc.font("Helvetica").fontSize(8),
                    columnsSize: [70, 140, 200, 90, 70, 70, 110],
                }
            );

            doc.end();
        } else {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
            xlsx.utils.book_append_sheet(wb, ws, titoloReport);

            const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="produzione_${rangeName || 'export'}.xlsx"`);
            res.send(buf);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
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
            const assetsRes = await pool.query("SELECT id, nome, locale FROM haccp_assets WHERE ristorante_id = $1 AND tipo IN ('frigo','cella','vetrina','congelatore','abbattitore') ORDER BY nome", [ristorante_id]);
            const assets = assetsRes.rows;

            let sqlLogs = `SELECT l.data_ora, l.asset_id, l.valore, l.operatore FROM haccp_logs l WHERE l.ristorante_id = $1 AND l.data_ora >= $2 AND l.data_ora <= $3`;
            const logsRes = await pool.query(sqlLogs, [ristorante_id, start, end]);
            const logs = logsRes.rows;

            // FIX DATE: Parsing manuale
            const [yearS, monthS, dayS] = start.split('-').map(Number);
            const [yearE, monthE, dayE] = end.split('-').map(Number);

            const days = [];
            // Creiamo le date a MEZZOGIORNO (12:00) per evitare problemi di timezone
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
                // Impostiamo margini stretti per far stare tutto in una pagina
                const doc = new PDFDocument({ margin: 20, bottom: 10, size: 'A4', layout: 'portrait' });
                
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
                const headerBoxH = 65; // Altezza del box intestazione fiscale
                
                const xDiv1 = margin + (contentWidth * 0.35);
                const xDiv2 = margin + (contentWidth * 0.85);

                doc.lineWidth(0.5);

                // Box Intestazione
                doc.rect(margin, headerY, contentWidth, headerBoxH).stroke(); 
                doc.moveTo(xDiv1, headerY).lineTo(xDiv1, headerY + headerBoxH).stroke(); 
                doc.moveTo(xDiv2, headerY).lineTo(xDiv2, headerY + headerBoxH).stroke(); 

                // Contenuto Box
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
                    height: headerBoxH - 30,
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

                // MODIFICA 1: Ridotto lo spazio dopo l'header per recuperare spazio verticale
                doc.moveDown(1.5); // Era moveDown(5)

                // Titolo Sezione
                doc.font("Helvetica-Bold").fontSize(12);
                doc.text("DOTAZIONI FRIGORIFERE", margin, doc.y, { width: contentWidth, align: 'center' });
                doc.moveDown(0.5);

                // Info Mese/Anno/Locale
                const mesi = ["GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO","LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"];
                const nomeMese = mesi[monthS - 1]; 

                doc.font("Helvetica").fontSize(10);
                const infoY = doc.y;
                
                doc.text(`MESE: ${nomeMese}`, margin, infoY);
                doc.text(`ANNO: ${yearS}`, margin + 180, infoY);

                const localiUnici = [...new Set(assets.map(a => a.locale).filter(Boolean))];
                const localeStr = localiUnici.length === 1 ? localiUnici[0].toUpperCase() : (localiUnici.length > 1 ? "LOCALI VARI" : "CUCINA");
                
                doc.text(`LOCALE: ${localeStr}`, margin + 300, infoY);

                doc.moveDown(1);

                // --- TABELLA VERTICALE ---
                const colGiornoWidth = 55;
                const remainingWidth = contentWidth - colGiornoWidth;

                const baseAssetW = Math.floor(remainingWidth / assets.length);
                const remainder = remainingWidth - (baseAssetW * assets.length);

                const assetWidths = assets.map((_, i) => baseAssetW + (i === assets.length - 1 ? remainder : 0));
                const colWidths = [colGiornoWidth, ...assetWidths];

                const tableWidth = colWidths.reduce((a, b) => a + b, 0);
                const tableX = margin + Math.round((contentWidth - tableWidth) / 2);

                // MODIFICA 2: Definite altezze separate per Header Tabella e Righe
                // MODIFICA 3: Ridotta altezza riga a 16 per far stare 31 giorni comodamente
                const tableHeaderH = 22; 
                const rowH = 16; 

                doc.lineWidth(0.5).strokeColor('#888').fillColor('black');

                function drawRow(cells, y, isHeader = false) {
                    let x = tableX;
                    const fontSize = isHeader ? 7 : 8;

                    doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);

                    // MODIFICA 4: Usa l'altezza corretta (header piccolo per la tabella, non headerBoxH)
                    const currentH = isHeader ? tableHeaderH : rowH;

                    for (let i = 0; i < colWidths.length; i++) {
                        const w = colWidths[i];
                        
                        // bordo cella
                        doc.rect(x, y, w, currentH).stroke();

                        // testo centrato
                        const txt = cells[i] == null ? "" : String(cells[i]);
                        const yText = y + (currentH - fontSize) / 2 - 1;

                        doc.text(txt, x + 2, yText, {
                            width: w - 4,
                            align: "center",
                            lineBreak: false,
                            ellipsis: true
                        });

                        x += w;
                    }
                }

                const tableStartY = doc.y;

                // Disegna Header Tabella
                drawRow(tableHeaders, tableStartY, true);

                // Disegna Body Tabella
                let y = tableStartY + tableHeaderH;
                for (const r of tableRows) {
                    drawRow(r, y, false);
                    y += rowH;
                }

                // Sposta cursore dopo la tabella
                doc.y = y + 8;

                // --- PIÈ DI PAGINA ---
                // Verifica spazio: se siamo troppo in basso, il pdfkit andrà a nuova pagina da solo, 
                // ma con le modifiche sopra (rowH=16 e moveDown ridotto) dovrebbe stare tutto in pagina 1.
                
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
                // EXCEL (Invariato)
                const wb = xlsx.utils.book_new();
                const sheetData = [
                    [aziendaInfo.nome, "SCHEDA DI ATTUAZIONE PIANO AUTOCONTROLLO", "", "Rev 00"],
                    ["DOTAZIONI FRIGORIFERE"],
                    [`MESE: ${new Date(start).toLocaleString('it-IT',{month:'long'})}`, `ANNO: ${new Date(start).getFullYear()}`],
                    [""],
                    tableHeaders,
                    ...tableRows,
                    [""],
                    ["Condizioni:"],
                    ["Assenza di promiscuità e di merce non protetta"],
                    ["Assenza segni di sporco visibile, macchie, untuosità al tatto sulle parti a contatto e non con gli alimenti,"],
                    ["Assenza di odori sgradevoli o anomali,"],
                    ["Assenza di prodotti con caratteristiche organolettiche (odore, colore, consistenza) anomali."],
                    [""],
                    ["C: Conforme ai limiti sopra indicati", "NC: Non conforme ai limiti sopra indicati"],
                    [""],
                    ["Firma RHACCP:"]
                ];
                const ws = xlsx.utils.aoa_to_sheet(sheetData);
                xlsx.utils.book_append_sheet(wb, ws, "Temperature");

                const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="registro_temperature_${rangeName || 'export'}.xlsx"`);
                res.send(buf);
            }

            return;
        }

        // 2. EXPORT STANDARD PER GLI ALTRI TIPI
        let sql = `SELECT * FROM haccp_logs WHERE ristorante_id = $1 AND tipo = $2`;
        const params = [ristorante_id, tipo];
        if (start && end) {
            sql += ` AND data_ora >= $3 AND data_ora <= $4`;
            params.push(start, end);
        }
        sql += ` ORDER BY data_ora ASC`;
        const r = await pool.query(sql, params);

        const headers = ["Data", "Ora", "Voce", "Valore", "Operatore"];
        const rows = r.rows.map(l => [
            new Date(l.data_ora).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }),
            new Date(l.data_ora).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' }).slice(0, 5),
            String(l.voce || ''),
            String(l.valore || ''),
            String(l.operatore || '')
        ]);

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${tipo}_${rangeName || 'export'}.pdf"`);
                res.send(pdfData);
            });

            doc.font("Helvetica-Bold").fontSize(14).text(`REGISTRO ${tipo.toUpperCase()}`, { align: 'center' });
            doc.moveDown(0.5);
            doc.font("Helvetica").fontSize(9).text(aziendaInfo?.nome || '', { align: 'center' });
            doc.moveDown(1);

            await doc.table(
                { headers, rows },
                {
                    width: 760,
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9),
                    prepareRow: () => doc.font("Helvetica").fontSize(8),
                }
            );

            doc.end();
        } else {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
            xlsx.utils.book_append_sheet(wb, ws, tipo);

            const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${tipo}_${rangeName || 'export'}.xlsx"`);
            res.send(buf);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};