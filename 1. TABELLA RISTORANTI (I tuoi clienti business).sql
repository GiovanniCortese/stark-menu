-- 1. TABELLA RISTORANTI (I tuoi clienti business)
CREATE TABLE ristoranti (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- Es: 'pizzeria-da-luigi' (per l'URL)
    email_titolare VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ordini_attivi BOOLEAN DEFAULT FALSE, -- IL TUO INTERRUTTORE (ON/OFF)
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELLA CATEGORIE (Es: Antipasti, Primi, Pizze)
CREATE TABLE categorie (
    id SERIAL PRIMARY KEY,
    ristorante_id INTEGER REFERENCES ristoranti(id),
    nome VARCHAR(50) NOT NULL,
    ordine_visualizzazione INTEGER DEFAULT 0
);

-- 3. TABELLA PRODOTTI (Il Menù)
CREATE TABLE prodotti (
    id SERIAL PRIMARY KEY,
    ristorante_id INTEGER REFERENCES ristoranti(id),
    categoria_id INTEGER REFERENCES categorie(id),
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT,
    prezzo DECIMAL(10, 2) NOT NULL, -- Es: 10.50
    foto_url TEXT,
    visibile BOOLEAN DEFAULT TRUE
);

-- 4. TABELLA CLIENTI FINALI (Utenti che mangiano)
CREATE TABLE clienti (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    telefono VARCHAR(20), -- Identificativo principale
    email VARCHAR(100),
    data_registrazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELLA RELAZIONE (Chi ha mangiato dove? CRM)
CREATE TABLE clienti_ristoranti (
    ristorante_id INTEGER REFERENCES ristoranti(id),
    cliente_id INTEGER REFERENCES clienti(id),
    ultima_visita TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ristorante_id, cliente_id)
);

-- 6. TABELLA ORDINI (Testata)
CREATE TABLE ordini (
    id SERIAL PRIMARY KEY,
    ristorante_id INTEGER REFERENCES ristoranti(id), -- Fondamentale per il Polling
    cliente_id INTEGER REFERENCES clienti(id),
    tavolo VARCHAR(10),
    totale DECIMAL(10, 2),
    stato_ordine VARCHAR(20) DEFAULT 'in_attesa', -- in_attesa, confermato, rifiutato
    stato_pagamento BOOLEAN DEFAULT FALSE,
    stato_stampa VARCHAR(20) DEFAULT 'pending', -- pending, printed (PER IL POLLING)
    data_ora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELLA DETTAGLI ORDINE (Cosa hanno ordinato)
CREATE TABLE dettagli_ordine (
    id SERIAL PRIMARY KEY,
    ordine_id INTEGER REFERENCES ordini(id),
    prodotto_nome VARCHAR(100) NOT NULL, -- Salviamo il nome (se cambia il menù, lo storico resta)
    prezzo_unitario DECIMAL(10, 2),
    quantita INTEGER,
    note_cliente TEXT -- Il campo libero che volevi
);