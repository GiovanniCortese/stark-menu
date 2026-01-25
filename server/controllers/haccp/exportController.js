const pool = require('../../config/db');
const PDFDocument = require('pdfkit-table');
const xlsx = require('xlsx');

exports.exportLabels = async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const { format, start, end, rangeName } = req.query; 
        const ristRes = await pool.query("SELECT nome, dati_fiscali FROM ristoranti WHERE id = $1", [ristorante_id]);
        const azienda = ristRes.rows[0];
        let sql = "SELECT * FROM haccp_labels WHERE ristorante_id = $1";
        const params = [ristorante_id];
        if (start && end) { sql += " AND data_produzione >= $2 AND data_produzione <= $3"; params.push(start, end); }
        sql += " ORDER BY data_produzione ASC";
        const r = await pool.query(sql, params);
        const titoloReport = "REGISTRO PRODUZIONE";
        const headers = ["Data Prod.", "Prodotto", "Ingredienti", "Tipo", "Lotto", "Scadenza", "Operatore"];
        const rows = r.rows.map(l => [new Date(l.data_produzione).toLocaleDateString('it-IT'), l.prodotto, l.ingredienti, l.tipo_conservazione, l.lotto, new Date(l.data_scadenza).toLocaleDateString('it-IT'), l.operatore]);
        
        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="produzione.pdf"`);
            doc.pipe(res);
            doc.fontSize(16).text(azienda.nome, { align: 'center' });
            doc.fontSize(10).text(azienda.dati_fiscali || "", { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`${titoloReport}: ${rangeName}`, { align: 'center' });
            doc.moveDown();
            await doc.table({ headers, rows }, { width: 750, prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), prepareRow: () => doc.font("Helvetica").fontSize(8) });
            doc.end();
        } else {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
            xlsx.utils.book_append_sheet(wb, ws, "Produzione");
            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', `attachment; filename="produzione.xlsx"`);
            res.send(buffer);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.exportGeneric = async (req, res) => {
    try {
        const { tipo, ristorante_id } = req.params;
        const { start, end, rangeName, format } = req.query; 
        
        // Recupero Info Ristorante
        const ristRes = await pool.query("SELECT nome, dati_fiscali FROM ristoranti WHERE id = $1", [ristorante_id]);
        const aziendaInfo = ristRes.rows[0];

        // --- NUOVA LOGICA: MATRICE TEMPERATURE (Vista Calendario) ---
        if (tipo === 'temperature_matrix') {
            // 1. Recupera Assets (Colonne) - Solo macchine attive
            const assetsRes = await pool.query("SELECT id, nome FROM haccp_assets WHERE ristorante_id = $1 AND tipo IN ('frigo','cella','vetrina','congelatore','abbattitore') ORDER BY nome", [ristorante_id]);
            const assets = assetsRes.rows;

            // 2. Recupera Logs (Dati Cella) nel range
            let sqlLogs = `SELECT l.data_ora, l.asset_id, l.valore, l.operatore FROM haccp_logs l WHERE l.ristorante_id = $1 AND l.data_ora >= $2 AND l.data_ora <= $3`;
            const logsRes = await pool.query(sqlLogs, [ristorante_id, start, end]);
            const logs = logsRes.rows;

            // 3. Genera la lista dei giorni (Righe)
            const days = [];
            let curr = new Date(start);
            const endDate = new Date(end);
            while (curr <= endDate) {
                days.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }

            // 4. Costruisci Header e Rows per la matrice
            const headers = ["Data", ...assets.map(a => a.nome)];
            const rows = days.map(day => {
                const rowData = [new Date(day).toLocaleDateString('it-IT')]; // Prima colonna: Data
                
                assets.forEach(asset => {
                    // Cerca il log per questo giorno e questo asset
                    const log = logs.find(l => {
                        const logDate = new Date(l.data_ora).toISOString().split('T')[0];
                        return logDate === day && l.asset_id === asset.id;
                    });
                    
                    if (log) {
                        // Cella piena: Valore + Operatore
                        rowData.push(`${log.valore}°\n(${log.operatore})`);
                    } else {
                        // Cella vuota
                        rowData.push("-");
                    }
                });
                return rowData;
            });

            const titoloReport = "REGISTRO TEMPERATURE (MENSILE)";

            if (format === 'pdf') {
                const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="registro_temperature_mensile.pdf"`);
                doc.pipe(res);
                
                doc.fontSize(16).text(aziendaInfo.nome, { align: 'center' });
                doc.fontSize(10).text(aziendaInfo.dati_fiscali || "", { align: 'center' });
                doc.moveDown();
                doc.fontSize(14).text(`${titoloReport} - ${rangeName}`, { align: 'center' });
                doc.moveDown();

                await doc.table({ headers, rows }, { 
                    width: 750, 
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9), 
                    prepareRow: () => doc.font("Helvetica").fontSize(8).padding(2) 
                });
                doc.end();
            } else {
                // EXCEL
                const wb = xlsx.utils.book_new();
                const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
                
                // Imposta larghezza colonne (Data stretta, Frighi larghi)
                ws['!cols'] = [{ wch: 12 }, ...assets.map(() => ({ wch: 18 }))];

                xlsx.utils.book_append_sheet(wb, ws, "Registro Mensile");
                const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
                res.setHeader('Content-Disposition', `attachment; filename="registro_temperature_mensile.xlsx"`);
                res.send(buffer);
            }
            return; // STOP QUI per la matrice
        }

        // --- LOGICA STANDARD (Liste Sequenziali) ---
        let headers = [], rows = [], sheetName = "Export", titoloReport = "REPORT";
        
        if (tipo === 'temperature') {
            sheetName = "Temperature"; titoloReport = "REGISTRO TEMPERATURE (LISTA)";
            headers = ["Data", "Ora", "Macchina", "Temp", "Esito", "Az. Correttiva", "Op."];
            let sql = `SELECT l.data_ora, a.nome as asset, l.valore, l.conformita, l.azione_correttiva, l.operatore FROM haccp_logs l JOIN haccp_assets a ON l.asset_id = a.id WHERE l.ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND l.data_ora >= $2 AND l.data_ora <= $3`; params.push(start, end); }
            sql += ` ORDER BY l.data_ora ASC`; 
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => { const d = new Date(row.data_ora); return [d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}), row.asset, `${row.valore}°C`, row.conformita ? "OK" : "NO", row.azione_correttiva, row.operatore]; });
        
        } else if (tipo === 'merci') { 
            sheetName = "Registro Acquisti"; titoloReport = "CONTABILITÀ MAGAZZINO & ACQUISTI";
            headers = ["Data", "Fornitore", "Prodotto", "Qta", "Unitario €", "Imponibile €", "IVA %", "Totale IVA €", "Totale Lordo €", "Lotto/Doc", "HACCP?"];
            let sql = `SELECT * FROM haccp_merci WHERE ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND data_ricezione >= $2 AND data_ricezione <= $3`; params.push(start, end); }
            sql += ` ORDER BY data_ricezione ASC`; 
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => {
                const qta = parseFloat(row.quantita)||0; const unit = parseFloat(row.prezzo_unitario)||0; const imp = qta * unit; const ivaV = imp * (parseFloat(row.iva)/100);
                return [new Date(row.data_ricezione).toLocaleDateString('it-IT'), row.fornitore, row.prodotto, qta, `€ ${unit.toFixed(2)}`, `€ ${imp.toFixed(2)}`, `${row.iva}%`, `€ ${ivaV.toFixed(2)}`, `€ ${(imp+ivaV).toFixed(2)}`, row.lotto, row.is_haccp ? "SI" : "NO"];
            });
        }

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="haccp_${tipo}.pdf"`);
            doc.pipe(res);
            doc.fontSize(16).text(aziendaInfo.nome, { align: 'center' });
            doc.fontSize(12).text(`${titoloReport} - ${rangeName}`, { align: 'center' }); doc.moveDown();
            await doc.table({ headers, rows }, { width: 500, prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), prepareRow: () => doc.font("Helvetica").fontSize(8) });
            doc.end();
            return; 
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
        xlsx.utils.book_append_sheet(wb, ws, sheetName);
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="haccp_${tipo}.xlsx"`);
        res.send(buffer);
    } catch (err) { res.status(500).json({ error: err.message }); }
};