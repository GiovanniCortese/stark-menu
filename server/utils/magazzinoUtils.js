// server/utils/magazzinoUtils.js
// Logica centralizzata per calcoli e aggiornamento magazzino

async function gestisciMagazzino(client, data) {
    const { ristorante_id, prodotto, quantita, prezzo_unitario, iva, fornitore, unita_misura, lotto, data_bolla, numero_bolla, codice_articolo, sconto } = data;
    
    // 1. Normalizzazione numeri
    const qta = parseFloat(quantita) || 0;
    const przUnit = parseFloat(prezzo_unitario) || 0;
    const aliIva = parseFloat(iva) || 0;
    const sc = parseFloat(sconto) || 0;

    // 2. CALCOLI MATEMATICI
    // Prezzo unitario scontato
    const prezzoNettoUnitario = przUnit * (1 - (sc / 100));
    
    // Totali riga
    const totaleNetto = qta * prezzoNettoUnitario;
    const totaleIva = totaleNetto * (aliIva / 100);
    const totaleLordo = totaleNetto + totaleIva;

    // 3. Cerca se esiste in Magazzino (Case Insensitive)
    const check = await client.query(
        `SELECT id, giacenza, prezzo_medio FROM magazzino_prodotti WHERE ristorante_id = $1 AND LOWER(nome) = LOWER($2)`,
        [ristorante_id, prodotto.trim()]
    );

    let magazzinoId = null;

    if (check.rows.length > 0) {
        // --- UPDATE ESISTENTE ---
        const existing = check.rows[0];
        magazzinoId = existing.id;
        const oldGiacenza = parseFloat(existing.giacenza) || 0;
        const oldPrezzo = parseFloat(existing.prezzo_medio) || 0;
        
        // Calcolo nuovo prezzo medio ponderato
        let newPrezzoMedio = oldPrezzo;
        if ((oldGiacenza + qta) > 0) {
            newPrezzoMedio = ((oldGiacenza * oldPrezzo) + (qta * prezzoNettoUnitario)) / (oldGiacenza + qta);
        }

        await client.query(
            `UPDATE magazzino_prodotti SET 
                giacenza = giacenza + $1,
                prezzo_ultimo = $2,
                prezzo_medio = $3,
                prezzo_unitario_netto = $4,
                valore_totale_netto = $5,
                valore_totale_iva = $6,
                valore_totale_lordo = $7,
                sconto = $8,
                aliquota_iva = $9,
                codice_articolo = COALESCE(NULLIF($10, ''), codice_articolo),
                data_bolla = $11,
                numero_bolla = $12,
                lotto = COALESCE(NULLIF($13, ''), lotto),
                updated_at = NOW()
             WHERE id = $14`,
            [
                qta, 
                prezzoNettoUnitario, newPrezzoMedio, prezzoNettoUnitario, 
                totaleNetto, totaleIva, totaleLordo, 
                sc, aliIva, 
                codice_articolo, data_bolla, numero_bolla, lotto, 
                magazzinoId 
            ]
        );
    } else {
        // --- INSERT NUOVO ---
        const resInsert = await client.query(
            `INSERT INTO magazzino_prodotti 
            (ristorante_id, nome, marca, unita_misura, giacenza, scorta_minima, 
             prezzo_ultimo, prezzo_medio, prezzo_unitario_netto,
             valore_totale_netto, valore_totale_iva, valore_totale_lordo,
             aliquota_iva, codice_articolo, sconto,
             data_bolla, numero_bolla, lotto)
            VALUES ($1, $2, $3, $4, $5, 5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
            [
                ristorante_id, prodotto.trim(), fornitore || '', unita_misura || 'Pz', 
                qta, 
                prezzoNettoUnitario, prezzoNettoUnitario, prezzoNettoUnitario, 
                totaleNetto, totaleIva, totaleLordo, 
                aliIva, codice_articolo || '', sc, 
                data_bolla, numero_bolla, lotto 
            ]
        );
        magazzinoId = resInsert.rows[0].id;
    }
    
    return { id: magazzinoId, totaleNetto, totaleIva, totaleLordo, prezzoNettoUnitario };
}

module.exports = { gestisciMagazzino };