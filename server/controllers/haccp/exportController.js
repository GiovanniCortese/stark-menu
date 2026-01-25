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
            new Date(l.data_produzione).toLocaleDateString('it-IT'), 
            String(l.prodotto || ''), 
            String(l.ingredienti || '').replace(/, /g, '\n'), 
            String(l.tipo_conservazione || ''), 
            String(l.lotto || ''), 
            new Date(l.data_scadenza).toLocaleDateString('it-IT'), 
            String(l.operatore || '')
        ]);
        
        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            // FIX CRASH: Buffer Mode
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
            // EXCEL (Tua logica originale)
            const wb = xlsx.utils.book_new();
            const rowAzienda = [azienda.dati_fiscali || azienda.nome];
            const rowPeriodo = [`Periodo: ${rangeName || 'Tutto lo storico'}`];
            const rowTitolo = [titoloReport];
            const rowEmpty = [""];
            const finalData = [rowAzienda, rowPeriodo, rowTitolo, rowEmpty, headers, ...rows];
            const ws = xlsx.utils.aoa_to_sheet(finalData);
            
            // Merge Header
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

// 1. GESTIONE SPECIALE: MATRICE TEMPERATURE (LAYOUT CORRETTO)
        if (tipo === 'temperature_matrix') {
            const assetsRes = await pool.query("SELECT id, nome FROM haccp_assets WHERE ristorante_id = $1 AND tipo IN ('frigo','cella','vetrina','congelatore','abbattitore') ORDER BY nome", [ristorante_id]);
            const assets = assetsRes.rows;

            let sqlLogs = `SELECT l.data_ora, l.asset_id, l.valore, l.operatore FROM haccp_logs l WHERE l.ristorante_id = $1 AND l.data_ora >= $2 AND l.data_ora <= $3`;
            const logsRes = await pool.query(sqlLogs, [ristorante_id, start, end]);
            const logs = logsRes.rows;

            // FIX DATA: Impostiamo l'ora a mezzogiorno (12:00) per evitare che il fuso orario ci porti al giorno prima
            const days = [];
            let curr = new Date(start);
            curr.setHours(12, 0, 0, 0); // <--- FIX CRUCIALE
            
            const endDate = new Date(end);
            endDate.setHours(12, 0, 0, 0); // <--- FIX CRUCIALE

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
                    res.setHeader('Content-Disposition', `attachment; filename="registro_temperature.pdf"`);
                    res.send(pdfData);
                });

                // MISURE
                const pageWidth = 595.28; 
                const margin = 20;
                const contentWidth = pageWidth - (margin * 2);
                
                const headerY = 20;
                const headerH = 50; 
                
                const xDiv1 = margin + (contentWidth * 0.30); 
                const xDiv2 = margin + (contentWidth * 0.85);

                doc.lineWidth(0.5);

                // HEADER DISEGNATO
                doc.rect(margin, headerY, contentWidth, headerH).stroke(); 
                doc.moveTo(xDiv1, headerY).lineTo(xDiv1, headerY + headerH).stroke(); 
                doc.moveTo(xDiv2, headerY).lineTo(xDiv2, headerY + headerH).stroke(); 

                // TESTI HEADER (CENTRATI MEGLIO)
                doc.font("Helvetica-Bold").fontSize(11)
                   .text(aziendaInfo.nome.toUpperCase(), margin + 5, headerY + 20, { width: (xDiv1 - margin) - 10, align: 'center' });
                
                doc.fontSize(10)
                   .text("SCHEDA DI ATTUAZIONE DEL", xDiv1, headerY + 12, { width: (xDiv2 - xDiv1), align: 'center' })
                   .text("PIANO DI AUTOCONTROLLO", xDiv1, headerY + 25, { width: (xDiv2 - xDiv1), align: 'center' });

                doc.fontSize(9).text("Rev 00", xDiv2, headerY + 20, { width: (margin + contentWidth - xDiv2), align: 'center' });

                doc.moveDown(4.5);

                // SOTTOTITOLO CENTRALE
                doc.font("Helvetica-Bold").fontSize(12).text("DOTAZIONI FRIGORIFERE", margin, doc.y, { width: contentWidth, align: 'center' });
                doc.moveDown(0.5);

                // INFO MESE / ANNO / LOCALE (Con parsing sicuro della data start)
                const partiData = start.split('-'); // [2026, 01, 01]
                const annoStr = partiData[0];
                const meseIndex = parseInt(partiData[1]) - 1; 
                const mesi = ["GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO","LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"];
                const nomeMese = mesi[meseIndex];

                doc.font("Helvetica").fontSize(10);
                const infoY = doc.y;
                
                doc.text(`MESE: ...........................`, margin, infoY);
                doc.font("Helvetica-Bold").text(`${nomeMese}`, margin + 35, infoY);
                
                doc.font("Helvetica").text(`ANNO: ...........................`, margin + 180, infoY);
                doc.font("Helvetica-Bold").text(`${annoStr}`, margin + 215, infoY);

                doc.font("Helvetica").text(`LOCALE: ......................................................`, margin + 320, infoY);
                doc.text(`CUCINA`, margin + 370, infoY);

                doc.moveDown(0.5);

                // TABELLA (COLONNE CENTRATE)
                const colGiornoWidth = 30;
                const remainingWidth = contentWidth - colGiornoWidth;
                const colAssetWidth = remainingWidth / assets.length;

                const tableOptions = {
                    width: contentWidth,
                    x: margin,
                    divider: { header: { disabled: false, width: 0.5, opacity: 1 }, horizontal: { disabled: false, width: 0.5, opacity: 0.5 } },
                    columnsSize: [colGiornoWidth, ...assets.map(() => colAssetWidth)], 
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(6), 
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.rect(rectCell.x, rectCell.y, rectCell.width, rectCell.height).strokeColor('#888').stroke();
                        return doc.font("Helvetica").fontSize(8).fillColor('black');
                    },
                    align: 'center' // <--- CENTRA TUTTO IL CONTENUTO DELLE CELLE
                };

                await doc.table({ headers: tableHeaders, rows: tableRows }, tableOptions);

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

        // 2. GESTIONE STANDARD (Tua logica originale integrata)
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
                return [d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}), String(row.asset || ''), String(row.valore === 'OFF' ? 'SPENTO' : `${row.valore}°C`), row.conformita ? "OK" : "NO", String(row.azione_correttiva || ""), String(row.operatore || "")]; 
            });

        } else if (tipo === 'merci') { 
            // TUA LOGICA ORIGINALE PER LE MERCI (CON CALCOLI PRECISI)
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
                    new Date(row.data_ricezione).toLocaleDateString('it-IT'),
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
            // TUA LOGICA ORIGINALE ASSETS
            sheetName = "Lista Macchine";
            titoloReport = "LISTA MACCHINE E ATTREZZATURE";
            headers = ["Stato", "Nome", "Tipo", "Marca", "Matricola", "Range"];
            const r = await pool.query(`SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY nome ASC`, [ristorante_id]);
            rows = r.rows.map(row => [String(row.stato ? row.stato.toUpperCase() : "ATTIVO"), String(row.nome || ''), String(row.tipo || ''), String(row.marca || ''), String(row.serial_number || '-'), `${row.range_min}°C / ${row.range_max}°C`]);

        } else if (tipo === 'pulizie') {
            // TUA LOGICA ORIGINALE PULIZIE
            sheetName = "Registro Pulizie";
            titoloReport = "REGISTRO PULIZIE E SANIFICAZIONI";
            headers = ["Data", "Ora", "Area/Attrezzatura", "Detergente", "Operatore", "Esito"];
            let sql = `SELECT * FROM haccp_cleaning WHERE ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND data_ora >= $2 AND data_ora <= $3`; params.push(start, end); }
            sql += ` ORDER BY data_ora ASC`;
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => [new Date(row.data_ora).toLocaleDateString('it-IT'), new Date(row.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}), String(row.area || ''), String(row.prodotto || ''), String(row.operatore || ''), row.conformita ? "OK" : "NON CONFORME"]);
        }

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            // FIX CRASH: Buffer Mode
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

        // EXCEL STANDARD (Tua logica)
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