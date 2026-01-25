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

// 1. GESTIONE SPECIALE: MATRICE TEMPERATURE (LAYOUT FOTO)
        if (tipo === 'temperature_matrix') {
            const assetsRes = await pool.query("SELECT id, nome FROM haccp_assets WHERE ristorante_id = $1 AND tipo IN ('frigo','cella','vetrina','congelatore','abbattitore') ORDER BY nome", [ristorante_id]);
            const assets = assetsRes.rows;

            // Recupera Logs
            let sqlLogs = `SELECT l.data_ora, l.asset_id, l.valore, l.operatore FROM haccp_logs l WHERE l.ristorante_id = $1 AND l.data_ora >= $2 AND l.data_ora <= $3`;
            const logsRes = await pool.query(sqlLogs, [ristorante_id, start, end]);
            const logs = logsRes.rows;

            // Genera giorni mese
            const days = [];
            let curr = new Date(start);
            const endDate = new Date(end);
            while (curr <= endDate) {
                days.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }

            // Headers Tabella (Giorno + Nomi Asset)
            const tableHeaders = ["GIORNO", ...assets.map(a => a.nome.toUpperCase())];
            
            // Righe Tabella
            const tableRows = days.map(day => {
                const dayNum = new Date(day).getDate(); // Solo il numero del giorno (1, 2, 3...)
                const rowData = [String(dayNum)];
                assets.forEach(asset => {
                    const log = logs.find(l => {
                        const logDate = new Date(l.data_ora).toISOString().split('T')[0];
                        return logDate === day && l.asset_id === asset.id;
                    });
                    // Se c'è il valore lo mostro, altrimenti cella vuota
                    rowData.push(log ? `${log.valore}°` : "");
                });
                return rowData;
            });

            if (format === 'pdf') {
                const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
                let buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    let pdfData = Buffer.concat(buffers);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="registro_temperature_ufficiale.pdf"`);
                    res.send(pdfData);
                });

                // --- INTESTAZIONE IDENTICA ALLA FOTO ---
                // Box Header
                doc.rect(30, 30, 780, 40).stroke(); // Box esterno header
                doc.moveTo(250, 30).lineTo(250, 70).stroke(); // Separatore 1
                doc.moveTo(680, 30).lineTo(680, 70).stroke(); // Separatore 2
                
                // Testi Header
                doc.font("Helvetica-Bold").fontSize(12).text(aziendaInfo.nome.toUpperCase(), 40, 45, { width: 200, align: 'center' });
                doc.fontSize(10).text("SCHEDA DI ATTUAZIONE DEL\nPIANO DI AUTOCONTROLLO", 250, 40, { width: 430, align: 'center' });
                doc.fontSize(10).text("Rev 00", 680, 45, { width: 100, align: 'center' });

                doc.moveDown(3);
                
                // Titolo Sezione
                doc.fontSize(14).text("DOTAZIONI FRIGORIFERE", { align: 'center' });
                doc.moveDown(0.5);

                // Info Mese/Anno/Locale
                const meseRif = new Date(start).toLocaleString('it-IT', { month: 'long' }).toUpperCase();
                const annoRif = new Date(start).getFullYear();
                
                doc.fontSize(10).text(`MESE: ${meseRif}          ANNO: ${annoRif}          LOCALE: CUCINA/LABORATORIO`, { align: 'left' });
                doc.moveDown(0.5);

                // TABELLA
                await doc.table({ headers: tableHeaders, rows: tableRows }, { 
                    width: 780, 
                    x: 30,
                    divider: { header: { disabled: false, width: 1, opacity: 1 }, horizontal: { disabled: false, width: 0.5, opacity: 0.5 } },
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), 
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        // Bordi verticali per simulare la griglia della foto
                        doc.rect(rectCell.x, rectCell.y, rectCell.width, rectCell.height).strokeColor('#999').stroke();
                        return doc.font("Helvetica").fontSize(9).fillColor('black');
                    }
                });

                // --- PIÈ DI PAGINA IDENTICO ALLA FOTO ---
                doc.moveDown(1);
                doc.font("Helvetica-Bold").fontSize(9).text("Condizioni:", { underline: true });
                doc.font("Helvetica").fontSize(8)
                   .text("Assenza di promiscuità e di merce non protetta")
                   .text("Assenza segni di sporco visibile, macchie, untuosità al tatto sulle parti a contatto e non con gli alimenti,")
                   .text("Assenza di odori sgradevoli o anomali,")
                   .text("Assenza di prodotti con caratteristiche organolettiche (odore, colore, consistenza) anomali.");
                
                doc.moveDown(0.5);
                doc.font("Helvetica-Bold").text("C: Conforme ai limiti sopra indicati");
                doc.text("NC: Non conforme ai limiti sopra indicati");
                
                doc.moveDown(1);
                doc.text("Firma RHACCP: ........................................................................................");
                
                doc.end();

            } else {
                // EXCEL (Layout simile)
                const wb = xlsx.utils.book_new();
                const sheetData = [
                    [aziendaInfo.nome, "", "SCHEDA DI ATTUAZIONE PIANO AUTOCONTROLLO", "", "", "Rev 00"],
                    ["DOTAZIONI FRIGORIFERE"],
                    [`MESE: ${new Date(start).toLocaleString('it-IT',{month:'long'})}`, `ANNO: ${new Date(start).getFullYear()}`],
                    [""],
                    tableHeaders,
                    ...tableRows,
                    [""],
                    ["Condizioni:"],
                    ["Assenza di promiscuità e di merce non protetta"],
                    ["Assenza segni di sporco visibile, macchie, untuosità"],
                    ["Assenza di odori sgradevoli o anomali"],
                    [""],
                    ["Firma RHACCP: __________________________"]
                ];
                
                const ws = xlsx.utils.aoa_to_sheet(sheetData);
                
                // Merge Header Excel (Simulazione)
                ws['!merges'] = [
                    { s: {r:0, c:2}, e: {r:0, c:4} }, // Titolo centrale
                    { s: {r:1, c:0}, e: {r:1, c:6} }  // Dotazioni Frigorifere
                ];

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