--
-- PostgreSQL database dump
--

\restrict RyyIdif6pJEAVM1JzIBPDytJsmfnzr7dtDKWafHmt5O6tyRU3q2Y1S4biRXyzrw

-- Dumped from database version 18.1 (32149dd)
-- Dumped by pg_dump version 18.1 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categorie; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.categorie (
    id integer NOT NULL,
    nome character varying(50) NOT NULL,
    ristorante_id integer,
    descrizione text,
    is_bar boolean DEFAULT false,
    is_pizzeria boolean DEFAULT false,
    posizione integer DEFAULT 0,
    varianti_default jsonb DEFAULT '[]'::jsonb,
    traduzioni jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.categorie OWNER TO neondb_owner;

--
-- Name: categorie_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.categorie_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorie_id_seq OWNER TO neondb_owner;

--
-- Name: categorie_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.categorie_id_seq OWNED BY public.categorie.id;


--
-- Name: haccp_assets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.haccp_assets (
    id integer NOT NULL,
    ristorante_id integer NOT NULL,
    nome character varying(100),
    tipo character varying(50),
    range_min numeric(5,2),
    range_max numeric(5,2),
    descrizione text,
    marca character varying(100),
    modello character varying(100),
    serial_number character varying(100),
    foto_url text,
    data_acquisto date,
    manutenzione_prevista date,
    etichetta_url text,
    stato text DEFAULT 'attivo'::text
);


ALTER TABLE public.haccp_assets OWNER TO neondb_owner;

--
-- Name: haccp_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.haccp_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.haccp_assets_id_seq OWNER TO neondb_owner;

--
-- Name: haccp_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.haccp_assets_id_seq OWNED BY public.haccp_assets.id;


--
-- Name: haccp_cleaning; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.haccp_cleaning (
    id integer NOT NULL,
    ristorante_id integer,
    data_ora timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    area text,
    prodotto text,
    operatore text,
    conformita boolean DEFAULT true
);


ALTER TABLE public.haccp_cleaning OWNER TO neondb_owner;

--
-- Name: haccp_cleaning_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.haccp_cleaning_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.haccp_cleaning_id_seq OWNER TO neondb_owner;

--
-- Name: haccp_cleaning_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.haccp_cleaning_id_seq OWNED BY public.haccp_cleaning.id;


--
-- Name: haccp_labels; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.haccp_labels (
    id integer NOT NULL,
    ristorante_id integer NOT NULL,
    prodotto character varying(200),
    lotto character varying(100),
    data_produzione timestamp without time zone,
    data_scadenza timestamp without time zone,
    operatore character varying(100),
    tipo_conservazione character varying(50),
    ingredienti text
);


ALTER TABLE public.haccp_labels OWNER TO neondb_owner;

--
-- Name: haccp_labels_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.haccp_labels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.haccp_labels_id_seq OWNER TO neondb_owner;

--
-- Name: haccp_labels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.haccp_labels_id_seq OWNED BY public.haccp_labels.id;


--
-- Name: haccp_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.haccp_logs (
    id integer NOT NULL,
    ristorante_id integer NOT NULL,
    asset_id integer,
    operatore character varying(100),
    tipo_log character varying(50),
    valore character varying(100),
    conformita boolean DEFAULT true,
    azione_correttiva text,
    data_ora timestamp without time zone DEFAULT now(),
    foto_prova_url text
);


ALTER TABLE public.haccp_logs OWNER TO neondb_owner;

--
-- Name: haccp_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.haccp_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.haccp_logs_id_seq OWNER TO neondb_owner;

--
-- Name: haccp_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.haccp_logs_id_seq OWNED BY public.haccp_logs.id;


--
-- Name: haccp_merci; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.haccp_merci (
    id integer NOT NULL,
    ristorante_id integer NOT NULL,
    data_ora timestamp without time zone DEFAULT now(),
    data_ricezione date NOT NULL,
    fornitore text,
    prodotto text NOT NULL,
    lotto text,
    scadenza date,
    temperatura numeric,
    conforme boolean DEFAULT true,
    integro boolean DEFAULT true,
    note text,
    operatore text,
    quantita text,
    allegato_url text,
    destinazione text,
    prezzo numeric(10,2) DEFAULT 0
);


ALTER TABLE public.haccp_merci OWNER TO neondb_owner;

--
-- Name: haccp_merci_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.haccp_merci_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.haccp_merci_id_seq OWNER TO neondb_owner;

--
-- Name: haccp_merci_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.haccp_merci_id_seq OWNED BY public.haccp_merci.id;


--
-- Name: haccp_ricette; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.haccp_ricette (
    id integer NOT NULL,
    ristorante_id integer,
    nome character varying(255) NOT NULL,
    descrizione text
);


ALTER TABLE public.haccp_ricette OWNER TO neondb_owner;

--
-- Name: haccp_ricette_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.haccp_ricette_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.haccp_ricette_id_seq OWNER TO neondb_owner;

--
-- Name: haccp_ricette_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.haccp_ricette_id_seq OWNED BY public.haccp_ricette.id;


--
-- Name: haccp_ricette_ingredienti; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.haccp_ricette_ingredienti (
    id integer NOT NULL,
    ricetta_id integer,
    ingrediente_nome character varying(255) NOT NULL
);


ALTER TABLE public.haccp_ricette_ingredienti OWNER TO neondb_owner;

--
-- Name: haccp_ricette_ingredienti_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.haccp_ricette_ingredienti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.haccp_ricette_ingredienti_id_seq OWNER TO neondb_owner;

--
-- Name: haccp_ricette_ingredienti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.haccp_ricette_ingredienti_id_seq OWNED BY public.haccp_ricette_ingredienti.id;


--
-- Name: ordini; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ordini (
    id integer NOT NULL,
    ristorante_id integer,
    tavolo text,
    prodotti text DEFAULT '[]'::text,
    totale real DEFAULT 0,
    stato text DEFAULT 'in_attesa'::text,
    dettagli text,
    data_ora timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cameriere text,
    utente_id integer,
    data_ordine text,
    coperti integer DEFAULT 0
);


ALTER TABLE public.ordini OWNER TO neondb_owner;

--
-- Name: ordini_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ordini_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ordini_id_seq OWNER TO neondb_owner;

--
-- Name: ordini_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ordini_id_seq OWNED BY public.ordini.id;


--
-- Name: playing_with_neon; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.playing_with_neon (
    id integer NOT NULL,
    name text NOT NULL,
    value real
);


ALTER TABLE public.playing_with_neon OWNER TO neondb_owner;

--
-- Name: playing_with_neon_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.playing_with_neon_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.playing_with_neon_id_seq OWNER TO neondb_owner;

--
-- Name: playing_with_neon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.playing_with_neon_id_seq OWNED BY public.playing_with_neon.id;


--
-- Name: prodotti; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.prodotti (
    id integer NOT NULL,
    nome character varying(100),
    prezzo numeric(5,2),
    categoria character varying(50),
    immagine_url text,
    ristorante_id integer,
    descrizione text,
    sottocategoria character varying(100),
    varianti jsonb DEFAULT '[]'::jsonb,
    posizione integer DEFAULT 0,
    allergeni jsonb DEFAULT '[]'::jsonb,
    traduzioni jsonb DEFAULT '{}'::jsonb,
    unita_misura text DEFAULT ''::text,
    qta_minima numeric(10,2) DEFAULT 1
);


ALTER TABLE public.prodotti OWNER TO neondb_owner;

--
-- Name: prodotti_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.prodotti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prodotti_id_seq OWNER TO neondb_owner;

--
-- Name: prodotti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.prodotti_id_seq OWNED BY public.prodotti.id;


--
-- Name: ristoranti; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ristoranti (
    id integer NOT NULL,
    nome character varying(100),
    slug character varying(100),
    email_titolare character varying(100),
    password character varying(100),
    ordini_abilitati boolean DEFAULT true,
    servizio_attivo boolean DEFAULT true,
    logo_url text,
    cover_url text,
    colore_sfondo character varying(20) DEFAULT '#222222'::character varying,
    colore_titolo character varying(20) DEFAULT '#ffffff'::character varying,
    colore_testo character varying(20) DEFAULT '#cccccc'::character varying,
    colore_prezzo character varying(20) DEFAULT '#27ae60'::character varying,
    font_style character varying(50) DEFAULT 'sans-serif'::character varying,
    email text,
    telefono text,
    account_attivo boolean DEFAULT true,
    cucina_super_active boolean DEFAULT true,
    pw_cassa text DEFAULT '1234'::text,
    pw_cucina text DEFAULT '1234'::text,
    pw_bar text DEFAULT '1234'::text,
    pw_pizzeria text DEFAULT '1234'::text,
    ip_wifi_locale text,
    colore_card text DEFAULT '#ffffff'::text,
    colore_btn text DEFAULT '#27ae60'::text,
    colore_btn_text text DEFAULT '#ffffff'::text,
    colore_border text DEFAULT '#e0e0e0'::text,
    colore_tavolo_bg text DEFAULT ''::text,
    colore_tavolo_text text DEFAULT ''::text,
    colore_carrello_bg text DEFAULT ''::text,
    colore_carrello_text text DEFAULT ''::text,
    colore_checkout_bg text DEFAULT ''::text,
    colore_checkout_text text DEFAULT ''::text,
    colore_modal_bg text DEFAULT '#ffffff'::text,
    colore_modal_text text DEFAULT '#000000'::text,
    info_footer text DEFAULT ''::text,
    url_allergeni text DEFAULT ''::text,
    colore_footer_text text DEFAULT '#888888'::text,
    dimensione_footer text DEFAULT '12'::text,
    allineamento_footer text DEFAULT 'center'::text,
    url_menu_giorno text DEFAULT ''::text,
    url_menu_pdf text DEFAULT ''::text,
    pw_haccp text DEFAULT '1234'::text,
    dati_fiscali text,
    nascondi_euro boolean DEFAULT false,
    prezzo_coperto numeric(10,2) DEFAULT 0
);


ALTER TABLE public.ristoranti OWNER TO neondb_owner;

--
-- Name: ristoranti_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ristoranti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ristoranti_id_seq OWNER TO neondb_owner;

--
-- Name: ristoranti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ristoranti_id_seq OWNED BY public.ristoranti.id;


--
-- Name: staff_docs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.staff_docs (
    id integer NOT NULL,
    utente_id integer,
    tipo_doc text,
    nome_file text,
    url text,
    data_caricamento timestamp without time zone DEFAULT now()
);


ALTER TABLE public.staff_docs OWNER TO neondb_owner;

--
-- Name: staff_docs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.staff_docs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_docs_id_seq OWNER TO neondb_owner;

--
-- Name: staff_docs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.staff_docs_id_seq OWNED BY public.staff_docs.id;


--
-- Name: utenti; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.utenti (
    id integer NOT NULL,
    nome character varying(100),
    email character varying(100),
    password character varying(100),
    telefono character varying(20),
    indirizzo text,
    data_registrazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ruolo character varying(50) DEFAULT 'cliente'::character varying,
    telefono_verificato boolean DEFAULT false,
    codice_otp text,
    ristorante_id integer
);


ALTER TABLE public.utenti OWNER TO neondb_owner;

--
-- Name: utenti_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.utenti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utenti_id_seq OWNER TO neondb_owner;

--
-- Name: utenti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.utenti_id_seq OWNED BY public.utenti.id;


--
-- Name: categorie id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categorie ALTER COLUMN id SET DEFAULT nextval('public.categorie_id_seq'::regclass);


--
-- Name: haccp_assets id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_assets ALTER COLUMN id SET DEFAULT nextval('public.haccp_assets_id_seq'::regclass);


--
-- Name: haccp_cleaning id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_cleaning ALTER COLUMN id SET DEFAULT nextval('public.haccp_cleaning_id_seq'::regclass);


--
-- Name: haccp_labels id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_labels ALTER COLUMN id SET DEFAULT nextval('public.haccp_labels_id_seq'::regclass);


--
-- Name: haccp_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_logs ALTER COLUMN id SET DEFAULT nextval('public.haccp_logs_id_seq'::regclass);


--
-- Name: haccp_merci id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_merci ALTER COLUMN id SET DEFAULT nextval('public.haccp_merci_id_seq'::regclass);


--
-- Name: haccp_ricette id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_ricette ALTER COLUMN id SET DEFAULT nextval('public.haccp_ricette_id_seq'::regclass);


--
-- Name: haccp_ricette_ingredienti id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_ricette_ingredienti ALTER COLUMN id SET DEFAULT nextval('public.haccp_ricette_ingredienti_id_seq'::regclass);


--
-- Name: ordini id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ordini ALTER COLUMN id SET DEFAULT nextval('public.ordini_id_seq'::regclass);


--
-- Name: playing_with_neon id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.playing_with_neon ALTER COLUMN id SET DEFAULT nextval('public.playing_with_neon_id_seq'::regclass);


--
-- Name: prodotti id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prodotti ALTER COLUMN id SET DEFAULT nextval('public.prodotti_id_seq'::regclass);


--
-- Name: ristoranti id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ristoranti ALTER COLUMN id SET DEFAULT nextval('public.ristoranti_id_seq'::regclass);


--
-- Name: staff_docs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_docs ALTER COLUMN id SET DEFAULT nextval('public.staff_docs_id_seq'::regclass);


--
-- Name: utenti id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.utenti ALTER COLUMN id SET DEFAULT nextval('public.utenti_id_seq'::regclass);


--
-- Data for Name: categorie; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.categorie (id, nome, ristorante_id, descrizione, is_bar, is_pizzeria, posizione, varianti_default, traduzioni) FROM stdin;
63	Friggitoria	2		f	f	1	[]	{}
64	Primi	2		f	f	2	[]	{}
65	Secondi	2		f	f	3	[]	{}
66	Pizze	2		f	f	4	[]	{}
67	Panini	2		f	f	5	[]	{}
68	Bevande	2		f	f	6	[]	{}
69	Vini	2		f	f	7	[]	{}
54	Friggitoria	1		f	f	0	[]	{}
55	Primi	1		f	f	1	[]	{}
56	Secondi	1		f	f	2	[]	{}
71	Panini	1		f	f	3	[]	{}
70	Pizzeria	1		f	t	4	[]	{}
73	Contorni	1		f	f	5	[]	{}
74	Insalatone	1		f	f	6	[]	{}
72	Dolci	1		f	f	7	[]	{}
62	Bevande	1		t	f	8	[]	{}
60	Vini	1		t	f	9	[]	{}
\.


--
-- Data for Name: haccp_assets; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.haccp_assets (id, ristorante_id, nome, tipo, range_min, range_max, descrizione, marca, modello, serial_number, foto_url, data_acquisto, manutenzione_prevista, etichetta_url, stato) FROM stdin;
1	1	Frigo Carni 1	frigo	0.00	4.00	\N	\N	\N	\N	\N	\N	\N	\N	attivo
2	1	2	frigo	0.00	4.00	\N	\N	\N	\N	\N	\N	\N	\N	attivo
3	1	3	frigo	0.00	4.00	\N	\N	\N	\N	\N	\N	\N	\N	attivo
6	1	6	zona	0.00	4.00	\N	\N	\N	\N	\N	\N	\N	\N	attivo
7	1	7	cella	0.00	-18.00	\N	\N	\N	\N	\N	\N	\N	\N	attivo
4	1	4	vetrina	0.00	4.00	\N	ISA	Cristal Power	is57689328979232	\N	\N	\N	\N	attivo
5	1	5	cella	0.00	4.00	\N	\N	\N	\N	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768531237/menu-app/nf2bojf1ualjwsexadjp.png	\N	\N	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768531242/menu-app/dpnqypptefjssseelimi.png	attivo
8	1	Sgummain	frigo	0.00	4.00	\N					\N	\N	\N	attivo
\.


--
-- Data for Name: haccp_cleaning; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.haccp_cleaning (id, ristorante_id, data_ora, area, prodotto, operatore, conformita) FROM stdin;
1	1	2026-01-16 18:32:19.747	affettatrice		Francesco	t
2	1	2026-01-16 18:32:19.937	affettatrice		Francesco	t
3	1	2026-01-16 18:32:26.913	Cappa		Francesco	t
4	1	2026-01-18 14:47:53.201	A		Peppe	t
\.


--
-- Data for Name: haccp_labels; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.haccp_labels (id, ristorante_id, prodotto, lotto, data_produzione, data_scadenza, operatore, tipo_conservazione, ingredienti) FROM stdin;
1	1	Prova	L-20260115-1246	2026-01-15 12:46:39.004825	2026-01-18 12:46:37.625	Peppe	positivo	
2	1	Prova	L-20260115-1246	2026-01-15 12:46:54.63533	2026-01-18 12:46:53.493	Peppe	negativo	
3	1	panini	L-20260115-1725	2026-01-15 17:25:19.70467	2026-01-18 17:25:19.349	Chef	positivo	\N
4	1	LASAGNA	L-20260115-1730	2026-01-15 17:30:38.719756	2026-01-18 17:30:37.288	PEPPE	positivo	\N
5	1	DCVGFD	L-20260115-1736	2026-01-15 17:36:26.002376	2026-01-18 17:36:25.476	DF	positivo	\N
6	1	Lasagna	L-20260116-0115	2026-01-16 00:15:38.765631	2026-01-19 00:15:37.734	Peppe	positivo	\N
7	1	Lasagna	L-20260116-0208	2026-01-16 01:08:28.592082	2026-01-26 01:08:27.74	Peppe	sottovuoto	\N
8	1	Lasagna	L-20260116-0259	2026-01-16 01:59:26.683161	2026-01-19 01:59:25.864	peppe	positivo	\N
9	1	Lasagna	L-20260116-0415	2026-01-16 03:15:35.097968	2026-07-15 02:15:34.864	derdfg	negativo	\N
10	1	A	L-20260116-1326	2026-01-16 12:26:43.320373	2026-01-19 12:26:43.262	Chef	positivo	\N
11	1	Lasagna	L-20260116-1826	2026-01-16 17:26:55.420841	2026-01-19 17:26:54.592	Chef	positivo	\N
12	1	Lasagna	L-20260116-2025	2026-01-16 19:25:07.870538	2026-01-29 00:00:00	Francesco	positivo	\N
13	1	fyghj	L-20260116-2153	2026-01-16 20:53:36.544179	2026-01-19 00:00:00	Francesco	positivo	
14	1	fyghj	L-20260116-2154	2026-01-16 20:54:18.692555	2026-01-19 00:00:00	Francesco	positivo	
15	1	Lasagna	L-20260116-2201	2026-01-16 21:01:10.30921	2026-01-29 00:00:00	Francesco	positivo	Mozzarelle (L:L-334567), dfvsgdhg (L:suqwudyqw), s (L:)
16	1	Lasagna	L-20260116-2216	2026-01-16 21:16:11.800771	2026-02-05 00:00:00	Gianni	positivo	Mozzarelle - Dedoni (L:L-334567), dfvsgdhg - vfghj (L:suqwudyqw), s - a (L:)
17	1	Lattuga	L-20260117-2247	2026-01-17 21:47:51.247472	2026-01-20 00:00:00	Gianni	positivo	Mozzarelle - Dedoni (L:L-334567), retyg - rety (L:gredg)
18	1	Lasagna	L-20260118-1136	2026-01-18 10:36:24.872377	2026-01-21 00:00:00	Francesco	positivo	Mozzarelle - Dedoni (L:L-334567), ⚠️ MANCANTE: lattuga, dfvsgdhg - vfghj (L:suqwudyqw)
19	1	Lasagna	L-20260120-1611	2026-01-20 15:11:03.874815	2026-07-19 00:00:00	Gianni	negativo	⚠️ MANCANTE: Macinato, Mozzarelle - Dedoni (L:L-334567), ⚠️ MANCANTE: lattuga
\.


--
-- Data for Name: haccp_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.haccp_logs (id, ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, data_ora, foto_prova_url) FROM stdin;
1	1	1	Staff	temperatura	2	t		2026-01-15 12:45:14.30117	\N
2	1	3	Staff	temperatura	4	t		2026-01-15 12:45:20.4663	\N
3	1	2	Staff	temperatura	6	f	Porta chiusa malissimo	2026-01-15 12:45:39.88883	\N
5	1	4	Staff	temperatura	3	t		2026-01-15 12:45:52.106786	\N
6	1	7	Staff	temperatura	-4.1	f	a	2026-01-15 12:48:45.760124	\N
7	1	4	Staff	temperatura	0.3	t		2026-01-15 13:04:27.624747	
8	1	4	Staff	temperatura	0.2	t		2026-01-15 17:09:03.605052	
9	1	7	Staff	temperatura	0.3	f	1defv	2026-01-15 17:09:26.910918	
4	1	5	Staff	temperatura	1	t		2026-01-15 12:45:47.733098	\N
10	1	8	Staff	temperatura	3	t		2026-01-15 17:24:51.735968	
11	1	5	Staff	temperatura	1.6	t		2026-01-15 23:45:51.662421	
12	1	5	Staff	temperatura	1.9	t		2026-01-16 00:12:16.644211	
13	1	7	Staff	temperatura	-6.2	t		2026-01-16 00:13:06.347992	
14	1	1	Staff	temperatura	2.6	t		2026-01-16 00:13:19.283841	
15	1	3	Staff	temperatura	3	t		2026-01-16 00:16:48.909403	
16	1	2	Staff	temperatura	4	t		2026-01-16 01:09:35.970212	
17	1	5	Staff	temperatura	3	t		2026-01-16 01:10:13.438748	
18	1	7	Staff	temperatura	-8	t		2026-01-16 01:31:37.423167	
19	1	5	Staff	temperatura	5.3	f	Normale	2026-01-16 01:32:07.09443	
20	1	5	Staff	temperatura	3.6	t		2026-01-16 01:56:08.272884	
21	1	8	Staff	temperatura	OFF	t	Macchinario spento/inutilizzato in data odierna	2026-01-16 02:34:06.736494	
22	1	8	Staff	temperatura	OFF	t	Macchinario spento/inutilizzato in data odierna	2026-01-16 02:35:54.158634	
23	1	5	Staff	temperatura	3.6	t		2026-01-16 03:06:14.991706	
24	1	5	Staff	temperatura	OFF	t	Macchinario spento/inutilizzato in data odierna	2026-01-16 03:15:56.132095	
25	1	5	Staff	temperatura	0.1	t		2026-01-16 03:16:02.455461	
26	1	5	Staff	temperatura	0.6	t		2026-01-16 03:16:38.594342	
27	1	2	Staff	temperatura	3	t		2026-01-16 03:17:11.691849	
28	1	5	Staff	temperatura	0.8	t		2026-01-16 03:20:35.916557	
29	1	5	Staff	temperatura	1.1	t		2026-01-16 03:20:47.395299	
30	1	5	Staff	temperatura	1.4	t		2026-01-16 03:37:51.003348	
31	1	5	Staff	temperatura	1.4	t		2026-01-16 12:05:05.571099	
32	1	2	Staff	temperatura	2.7	t		2026-01-16 12:20:24.57499	
33	1	5	Staff	temperatura	1.6	t		2026-01-16 12:32:58.132198	
34	1	5	Staff	temperatura	1	t		2026-01-16 12:33:55.453873	
35	1	5	Staff	temperatura	1.6	t		2026-01-16 12:52:15.549831	
36	1	5	Staff	temperatura	5	f	a	2026-01-16 14:21:29.331204	
37	1	5	Staff	temperatura	OFF	t	Macchinario spento	2026-01-16 14:21:53.732747	
38	1	5	Staff	temperatura	3	t		2026-01-16 14:39:03.117605	
39	1	2	Staff	temperatura	2.8	t		2026-01-16 17:53:32.15296	
40	1	5	Staff	temperatura	2.7	t		2026-01-16 18:48:19.685215	
41	1	7	Staff	temperatura	-8.3	t		2026-01-16 20:05:09.497926	
42	1	4	Staff	temperatura	OFF	t	Macchinario spento/inutilizzato in data odierna	2026-01-16 20:06:27.413392	
43	1	1	Staff	temperatura	3	t		2026-01-17 12:17:57.756618	
44	1	1	Staff	temperatura	2	t		2026-01-17 12:18:28.351049	
45	1	3	Staff	temperatura	0.8	t		2026-01-17 22:10:50.469191	
46	1	3	Staff	temperatura	OFF	t	Macchinario spento/inutilizzato in data odierna	2026-01-17 22:10:54.159876	
47	1	3	Staff	temperatura	0.4	t		2026-01-17 22:10:59.092756	
48	1	5	Staff	temperatura	2	t		2026-01-17 22:11:32.272619	
49	1	7	Staff	temperatura	OFF	t	Macchinario spento/inutilizzato in data odierna	2026-01-17 22:12:28.851587	
50	1	5	Staff	temperatura	OFF	t	Macchinario spento/inutilizzato in data odierna	2026-01-18 08:23:39.450375	
51	1	5	Staff	temperatura	0.6	t		2026-01-19 21:04:36.50411	
52	1	7	Staff	temperatura	-4.3	t		2026-01-19 21:44:55.42135	
53	1	5	Staff	temperatura	3	t		2026-01-20 11:06:31.808073	
54	1	2	Staff	temperatura	3	t		2026-01-20 15:08:14.598255	
55	1	2	Staff	temperatura	2	t		2026-01-20 15:08:20.556414	
\.


--
-- Data for Name: haccp_merci; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.haccp_merci (id, ristorante_id, data_ora, data_ricezione, fornitore, prodotto, lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, allegato_url, destinazione, prezzo) FROM stdin;
2	1	2026-01-16 03:37:25.388296	2026-01-16	a	a		\N	\N	t	t		Staff	\N			0.00
3	1	2026-01-16 03:44:18.678513	2026-01-16	a	b		\N	\N	t	t		Staff	\N			0.00
4	1	2026-01-16 16:25:15.985266	2026-01-16	a	s		2026-01-31	\N	t	t		Staff	1		2	0.00
1	1	2026-01-16 00:14:51.744561	2026-01-16	Dedoni	Mozzarelle	L-334567	2026-01-23	1.7	t	t	DDT 34 del 16-01-2026	Staff	0,500	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768586113/menu-app/tkf2kdojm81fpemwf6ut.pdf	Frigo Carni 1	0.00
5	1	2026-01-16 19:20:14.136406	2026-01-16	vfghj	dfvsgdhg	suqwudyqw	2026-01-30	1.1	t	t	Bolla 35	Staff	4		Frigo Carni 1	0.00
6	1	2026-01-17 21:47:08.954612	2026-01-17	rety	retyg	gredg	\N	\N	t	t	fdgc 	Staff	vg		5	0.00
7	1	2026-01-19 21:46:30.75024	2023-10-03	AZIENDA AGRICOLA VERDE	Nocciole		2026-01-30	\N	t	t	Importato da AI ✨	Staff	1		5	0.00
8	1	2026-01-19 21:46:49.287782	2026-01-19	regtw	ewrtrrte		\N	\N	t	t		Staff	1			0.00
9	1	2026-01-19 21:47:01.220913	2026-01-19	aaa	a		\N	\N	t	t		Staff	\N			0.00
10	1	2026-01-19 21:48:17.796227	2026-01-19	AZIENDA AGRICOLA VERDE	Acquisto nocciole		\N	\N	t	t	Importato da AI ✨	Staff	3.000			0.00
\.


--
-- Data for Name: haccp_ricette; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.haccp_ricette (id, ristorante_id, nome, descrizione) FROM stdin;
2	1	Lasagna	\N
3	1	Cotoletta	\N
4	1	aaaa	\N
\.


--
-- Data for Name: haccp_ricette_ingredienti; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.haccp_ricette_ingredienti (id, ricetta_id, ingrediente_nome) FROM stdin;
4	2	Macinato
5	2	Mozzarelle
6	2	lattuga
7	3	Mozzarelle
8	3	bresaola
9	4	Nocciole
\.


--
-- Data for Name: ordini; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ordini (id, ristorante_id, tavolo, prodotti, totale, stato, dettagli, data_ora, cameriere, utente_id, data_ordine, coperti) FROM stdin;
84	1	Banco	[{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita (No acciughe / +Bufala, +Basilico)","prezzo":10,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:22"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:22"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita (+Patatine Fritte)","prezzo":10,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	1842	pagato	\nORDINE #84\n[15:21:37] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita (No acciughe / +Bufala, +Basilico) - 10.00€\nTOTALE PARZIALE: 926.00€\n----------------------------------\n\nORDINE #82\n\n[1/9/2026, 3:22:01 PM] [CASSA 💶] HA SEGNATO SERVITO: dfergdh\n[1/9/2026, 3:22:02 PM] [CASSA 💶] HA SEGNATO SERVITO: dfergdh\nCHIUSO: 1842€	2026-01-09 15:21:38.436737	\N	\N	\N	0
90	1	Banco	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	39	pagato	\nORDINE #90\n[09/01/2026, 15:40:16] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\nTOTALE PARZIALE: 26.00€\n----------------------------------\n\nORDINE #91\n[09/01/2026, 15:40:36] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Mare e Monti - 1.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\nTOTALE PARZIALE: 13.00€\n----------------------------------\n\nCHIUSO: 39€	2026-01-09 15:40:16.825686	\N	\N	\N	0
87	1	Banco	[{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"16:24"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"16:24"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:23"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:24"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"16:25"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"16:25"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"16:25"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"16:23"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"16:25"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"16:25"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:24"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:38"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:24"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:24"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:24"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:24"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:24"}]	189	pagato	\nORDINE #87\n[15:26:12] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\nTOTALE PARZIALE: 3.00€\n----------------------------------\n\n[1/9/2026, 3:38:32 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x3)\nORDINE #88\n[09/01/2026, 15:31:48] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\nTOTALE PARZIALE: 3.00€\n----------------------------------\n\n[1/9/2026, 3:38:10 PM] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x3)\nORDINE #86\n[15:25:58] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Al ragù - 1.00€\n • Al ragù - 1.00€\nTOTALE PARZIALE: 2.00€\n----------------------------------\n\n[1/9/2026, 3:38:32 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\nORDINE #89\n[09/01/2026, 15:38:26] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\nTOTALE PARZIALE: 2.00€\n----------------------------------\n\n[1/9/2026, 3:38:33 PM] [CUCINA 👨‍🍳] HA SERVITO: Al sugo (x2)\nORDINE #85\n[15:23:22] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al ragù - 1.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 179.00€\n----------------------------------\n\n[1/9/2026, 3:23:45 PM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[1/9/2026, 3:23:46 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[1/9/2026, 3:23:47 PM] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[1/9/2026, 3:23:49 PM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[1/9/2026, 3:24:39 PM] [BAR 🍹] HA SERVITO: 3x Chardonnay\n[1/9/2026, 3:24:39 PM] [BAR 🍹] HA SERVITO: 2x Chianti\n[1/9/2026, 3:24:46 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 3:24:52 PM] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x1)\n[1/9/2026, 3:24:53 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 3:24:56 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x5)\n[1/9/2026, 3:24:58 PM] [CUCINA 👨‍🍳] HA SERVITO: Al sugo (x1)\n[1/9/2026, 3:25:03 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x5)\n[1/9/2026, 3:38:35 PM] [CUCINA 👨‍🍳] HA SERVITO: Al sugo (x1)\n[1/9/2026, 3:38:37 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x1)\nCHIUSO: 189€	2026-01-09 15:26:12.912292	\N	\N	\N	0
106	1	8	[{"id":103,"nome":"Margherita (No basilico, acciughe / +Bufala, +Basilico)","prezzo":10,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["basilico","acciughe"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Basilico","prezzo":1}]}}]	10	pagato	\nORDINE #106\n[09/01/2026, 23:59:05] 🆕 ORDINE DA: franco\n • Margherita (No basilico, acciughe / +Bufala, +Basilico) (No: basilico, acciughe) (+: Bufala, Basilico) - 10.00€\nTOTALE PARZIALE: 10.00€\n----------------------------------\n\n[10/01/2026, 02:44:44] 💰 CHIUSO E PAGATO: 10.00€	2026-01-09 22:59:05.758289	franco	\N	\N	0
107	1	88	[{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	21	pagato	\nORDINE #107\n[10/01/2026, 00:04:12] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 6.00€\nTOTALE PARZIALE: 21.00€\n----------------------------------\n\n[10/01/2026, 02:44:51] 💰 CHIUSO E PAGATO: 21.00€	2026-01-09 23:04:12.828166	franco	\N	\N	0
115	1	55	[{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:55"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:55"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:46"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:46"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:46"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:46"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"11:47"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"11:46"},{"id":103,"nome":"Margherita","prezzo":12,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":["acciughe","mozzarella"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Patatine Fritte","prezzo":3}]},"ora_servizio":"11:46"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"11:46"},{"id":102,"nome":"r34t3567uyi","prezzo":"66.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"11:46"},{"id":102,"nome":"r34t3567uyi","prezzo":74.5,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Crudo","prezzo":3.5},{"nome":"Maiale","prezzo":5}]},"ora_servizio":"11:47"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"11:46"},{"id":100,"nome":"dfgbvn","prezzo":4,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"granbiscotto","prezzo":3}]},"ora_servizio":"11:47"},{"id":83,"nome":"deqwfre","prezzo":9,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8}]},"ora_servizio":"11:54"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:55"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:55"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:55"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:55"}]	1210.5	pagato	\nORDINE #115\n[10/01/2026, 11:52:14] 🆕 ORDINE DA: franco\n • Chianti - 25.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 50.00€\n----------------------------------\n\n[10/01/2026, 11:55:26] [CASSA 💶] HA SEGNATO SERVITO: Chianti\n[10/01/2026, 11:55:28] [CASSA 💶] HA SEGNATO SERVITO: Chianti\nORDINE #114\n[10/01/2026, 11:45:32] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • Margherita (No: mozzarella, acciughe) (+: Bufala, Patatine Fritte) - 12.00€\n • Margherita - 6.00€\n • r34t3567uyi - 66.00€\n • r34t3567uyi (+: Crudo, Maiale) - 74.50€\n • dfgbvn - 1.00€\n • dfgbvn (+: granbiscotto) - 4.00€\n • deqwfre (+: Sanbuca) - 9.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 1160.50€\n----------------------------------\n\n[10/01/2026, 11:46:28] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x2)\n[10/01/2026, 11:46:30] [CUCINA 👨‍🍳] HA SERVITO: dfergdh (x2)\n[10/01/2026, 11:46:33] [PIZZERIA 🍕] HA SFORNATO: Scilatelle (x1)\n[10/01/2026, 11:46:45] [PIZZERIA 🍕] HA SFORNATO: dfgbvn (x1)\n[10/01/2026, 11:46:46] [PIZZERIA 🍕] HA SFORNATO: r34t3567uyi (x1)\n[10/01/2026, 11:46:48] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[10/01/2026, 11:46:49] [PIZZERIA 🍕] HA SFORNATO: Scilatelle (x1)\n[10/01/2026, 11:46:53] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[10/01/2026, 11:46:57] [CASSA 💶] HA SEGNATO IN ATTESA: Scilatelle\n[10/01/2026, 11:47:04] [PIZZERIA 🍕] HA SFORNATO: Scilatelle (x1)\n[10/01/2026, 11:47:09] [CASSA 💶] HA SEGNATO SERVITO: r34t3567uyi\n[10/01/2026, 11:47:18] [CASSA 💶] HA SEGNATO SERVITO: dfgbvn\n[10/01/2026, 11:50:41] [CASSA 💶] HA SEGNATO SERVITO: deqwfre\n[10/01/2026, 11:51:16] [CASSA 💶] HA SEGNATO IN ATTESA: deqwfre\n[10/01/2026, 11:54:59] [CASSA 💶] HA SEGNATO SERVITO: deqwfre\n[10/01/2026, 11:55:00] [CASSA 💶] HA SEGNATO SERVITO: Chardonnay\n[10/01/2026, 11:55:22] [CASSA 💶] HA SEGNATO SERVITO: Chianti\n[10/01/2026, 11:55:23] [CASSA 💶] HA SEGNATO SERVITO: Chardonnay\n[10/01/2026, 11:55:24] [CASSA 💶] HA SEGNATO SERVITO: Chianti\n[10/01/2026, 11:55:33] 💰 CHIUSO E PAGATO: 1210.50€	2026-01-10 10:52:14.396819	franco	\N	\N	0
108	1	66	[{"id":102,"nome":"r34t3567uyi (+Sanbuca, +Maiale)","prezzo":79,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8},{"nome":"Maiale","prezzo":5}]}},{"id":84,"nome":"edfwre","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn (+granbiscotto)","prezzo":4,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"granbiscotto","prezzo":3}]}},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"}]	220	pagato	\nORDINE #108\n[10/01/2026, 01:39:01] 🆕 ORDINE DA: franco\n • r34t3567uyi (+Sanbuca, +Maiale) (+: Sanbuca, Maiale) - 79.00€\n • edfwre - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn (+granbiscotto) (+: granbiscotto) - 4.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 220.00€\n----------------------------------\n\n[10/01/2026, 02:44:48] 💰 CHIUSO E PAGATO: 220.00€	2026-01-10 00:39:01.078543	franco	\N	\N	0
191	1	Banco	[{"id":285,"nome":"Prova","prezzo":14,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2}]},"riaperto":true,"ora_servizio":"02:24"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:10"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:10"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:10"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:10","chiuso_da_cassa":true},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:10"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"00:56"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"00:56"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"00:56"},{"id":230,"nome":"Filetto del cowboy","prezzo":"20.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"00:41"},{"id":230,"nome":"Filetto del cowboy","prezzo":"20.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"00:41"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","chiuso_da_cassa":true,"riaperto":true,"ora_servizio":"01:47"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:47","chiuso_da_cassa":true},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"00:48"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"01:50","chiuso_da_cassa":true},{"id":228,"nome":"Senza Nome","prezzo":"0.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":228,"nome":"Senza Nome","prezzo":"0.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"}]	109	pagato	\nORDINE #191\n[15/01/2026, 02:04:00] 🆕 ORDINE DA: Ospite\n • Prova (No: pomodoro) (+: Bufala) - 14.00€\nTOTALE PARZIALE: 14.00€\n----------------------------------\n\n[15/01/2026, 02:10:58] [CUCINA 👨‍🍳] HA SERVITO: Prova\n[15/01/2026, 02:11:06] [CASSA 💶] ⚠️ RIAPERTO: Prova\n[15/01/2026, 02:24:28] [CUCINA 👨‍🍳] HA SERVITO: Prova\nORDINE #190\n[15/01/2026, 02:00:31] 🆕 ORDINE DA: Ospite\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 02:10:45] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:10:45] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\nORDINE #189\n[15/01/2026, 02:00:18] 🆕 ORDINE DA: Ospite\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\n[15/01/2026, 02:10:34] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:10:44] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:10:45] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\nORDINE #182\n[15/01/2026, 01:47:31] 🆕 ORDINE DA: a\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\n[15/01/2026, 01:56:37] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:56:37] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:56:37] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\nORDINE #181\n[15/01/2026, 01:40:35] 🆕 ORDINE DA: a\n • Filetto del cowboy - 20.00€\n • Filetto del cowboy - 20.00€\n • Nachos - 5.00€\n • Nachos - 5.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 56.00€\n----------------------------------\n\n[15/01/2026, 01:41:14] [CUCINA 👨‍🍳] HA SERVITO: Filetto del cowboy\n[15/01/2026, 01:41:14] [CUCINA 👨‍🍳] HA SERVITO: Filetto del cowboy\n[15/01/2026, 01:41:58] [CASSA 💶] ✅ FATTO: Nachos\n[15/01/2026, 01:42:11] [CASSA 💶] ⚠️ RIAPERTO: Nachos\n[15/01/2026, 01:42:17] [CASSA 💶] ✅ FATTO: Nachos\n[15/01/2026, 01:47:57] [CASSA 💶] ⚠️ RIAPERTO: Nachos\n[15/01/2026, 01:47:58] [CASSA 💶] ✅ FATTO: Nachos\n[15/01/2026, 01:48:00] [CASSA 💶] ✅ FATTO: Nachos\n[15/01/2026, 01:48:12] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:48:13] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:50:35] [CASSA 💶] ⚠️ RIAPERTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:50:38] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\nORDINE #186\n[15/01/2026, 01:56:06] 🆕 ORDINE DA: a\n • Senza Nome - 0.00€\n • Senza Nome - 0.00€\nTOTALE PARZIALE: 0.00€\n----------------------------------\n\n[15/01/2026, 02:24:28] [CUCINA 👨‍🍳] HA SERVITO: Senza Nome\n[15/01/2026, 02:24:29] [CUCINA 👨‍🍳] HA SERVITO: Senza Nome\nORDINE #185\n[15/01/2026, 01:55:16] 🆕 ORDINE DA: a\n • Nachos - 5.00€\n • Nachos - 5.00€\n • Nachos - 5.00€\nTOTALE PARZIALE: 15.00€\n----------------------------------\n\n[15/01/2026, 02:24:30] [CUCINA 👨‍🍳] HA SERVITO: Nachos\n[15/01/2026, 02:24:30] [CUCINA 👨‍🍳] HA SERVITO: Nachos\n[15/01/2026, 02:24:30] [CUCINA 👨‍🍳] HA SERVITO: Nachos\n[15/01/2026, 02:24:59] 💰 CHIUSO E PAGATO: 109.00€	2026-01-15 01:04:00.302206	\N	\N	\N	0
105	1	6	[{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn (+granbiscotto)","prezzo":4,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"granbiscotto","prezzo":3}]},"ora_servizio":"00:57"},{"id":102,"nome":"r34t3567uyi","prezzo":"66.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":102,"nome":"r34t3567uyi","prezzo":66,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[]}}]	138	pagato	\nORDINE #105\n[09/01/2026, 23:55:21] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn (+granbiscotto) (+: granbiscotto) - 4.00€\n • r34t3567uyi - 66.00€\n • r34t3567uyi - 66.00€\nTOTALE PARZIALE: 138.00€\n----------------------------------\n\n[10/01/2026, 00:57:06] [CASSA 💶] HA SEGNATO SERVITO: dfgbvn (+granbiscotto)\n[10/01/2026, 02:44:40] 💰 CHIUSO E PAGATO: 138.00€	2026-01-09 22:55:21.977795	franco	\N	\N	0
94	1	Banco	[{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":97,"nome":"vedure","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":97,"nome":"vedure","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":97,"nome":"vedure","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":97,"nome":"vedure","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:10"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:10"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":95,"nome":"carbonara","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":95,"nome":"carbonara","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":95,"nome":"carbonara","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":95,"nome":"carbonara","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:49"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:49"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"16:49"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:09"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"17:10"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	212	pagato	\nORDINE #94\n[09/01/2026, 15:56:10] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\nTOTALE PARZIALE: 24.00€\n----------------------------------\n\n[1/9/2026, 4:09:29 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x4)\nORDINE #92\n[09/01/2026, 15:47:25] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • vedure - 1.00€\n • vedure - 1.00€\n • vedure - 1.00€\n • vedure - 1.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[1/9/2026, 4:09:17 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n[1/9/2026, 4:09:19 PM] [CUCINA 👨‍🍳] HA SERVITO: vedure (x1)\n[1/9/2026, 4:09:31 PM] [CUCINA 👨‍🍳] HA SERVITO: vedure (x1)\n[1/9/2026, 4:09:43 PM] [CUCINA 👨‍🍳] HA SERVITO: vedure (x2)\n[1/9/2026, 4:10:27 PM] [CASSA 💶] HA SEGNATO IN ATTESA: vedure\n[1/9/2026, 4:10:37 PM] [CASSA 💶] HA SEGNATO SERVITO: vedure\nORDINE #95\n[09/01/2026, 16:03:36] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\nTOTALE PARZIALE: 36.00€\n----------------------------------\n\n[1/9/2026, 4:09:03 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 4:09:04 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 4:09:22 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 4:09:29 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x3)\n[1/9/2026, 4:09:40 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\nORDINE #93\n[09/01/2026, 15:49:05] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • carbonara - 1.00€\n • carbonara - 1.00€\n • carbonara - 1.00€\n • carbonara - 1.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\nTOTALE PARZIALE: 125.00€\n----------------------------------\n\n[1/9/2026, 3:49:41 PM] [BAR 🍹] HA SERVITO: 3x Chianti\n[1/9/2026, 3:55:58 PM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[1/9/2026, 3:56:00 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[1/9/2026, 4:09:03 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 4:09:04 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 4:09:20 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n[1/9/2026, 4:09:22 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 4:09:29 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 4:09:32 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n[1/9/2026, 4:09:32 PM] [CUCINA 👨‍🍳] HA SERVITO: carbonara (x3)\n[1/9/2026, 4:09:32 PM] [CUCINA 👨‍🍳] HA SERVITO: dfgbvn (x2)\n[1/9/2026, 4:09:36 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n[1/9/2026, 4:09:40 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x3)\n[1/9/2026, 4:09:43 PM] [CUCINA 👨‍🍳] HA SERVITO: dfgbvn (x1)\n[1/9/2026, 4:09:43 PM] [CUCINA 👨‍🍳] HA SERVITO: carbonara (x1)\n[1/9/2026, 4:09:58 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Al ragù\n[1/9/2026, 4:10:05 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x1)\n[1/9/2026, 4:10:11 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[1/9/2026, 4:10:20 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\nORDINE #96\n[09/01/2026, 16:10:53] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 21.00€\n----------------------------------\n\nCHIUSO: 212€	2026-01-09 15:56:10.745866	\N	\N	\N	0
121	1	2	[{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","chiuso_da_cassa":true,"riaperto":true},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	4	pagato	\nORDINE #121\n[10/01/2026, 12:14:37] 🆕 ORDINE DA: Cliente (Ospite)\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\nTOTALE PARZIALE: 4.00€\n----------------------------------\n\n[10/01/2026, 12:58:25] [CASSA 💶] ✅ FATTO DALLA CASSA: Al sugo\n[10/01/2026, 12:58:40] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 12:58:54] [CASSA 💶] ✅ FATTO DALLA CASSA: Al sugo\n[10/01/2026, 12:59:03] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 13:01:43] 💰 CHIUSO E PAGATO: 4.00€	2026-01-10 11:14:37.724319	\N	\N	\N	0
123	1	66	[{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":13,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["basilico","acciughe"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Mozzarella","prezzo":1},{"nome":"Patatine Fritte","prezzo":3}]}},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"13:03"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"13:03"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:03"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:03"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"13:03"},{"id":83,"nome":"deqwfre","prezzo":14,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8},{"nome":"Maiale","prezzo":5}]}},{"id":83,"nome":"deqwfre","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":83,"nome":"deqwfre","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	587	pagato	\nORDINE #123\n[10/01/2026, 13:02:55] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Margherita (No: basilico, acciughe) (+: Bufala, Mozzarella, Patatine Fritte) - 13.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\n • deqwfre (+: Sanbuca, Maiale) - 14.00€\n • deqwfre - 1.00€\n • deqwfre - 1.00€\nTOTALE PARZIALE: 1032.00€\n----------------------------------\n\n[10/01/2026, 13:03:02] [BAR 🍹] HA SERVITO: 3x Chardonnay\n[10/01/2026, 13:03:03] [BAR 🍹] HA SERVITO: 2x Chianti\n[10/01/2026, 13:03:23] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chianti\n[10/01/2026, 13:03:24] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chardonnay\n[10/01/2026, 13:03:28] [BAR 🍹] HA SERVITO: Chianti\n[10/01/2026, 13:03:30] [BAR 🍹] HA SERVITO: Chardonnay\n[10/01/2026, 13:03:49] [CASSA 💶] HA ELIMINATO: Mare e Monti (1.00€). Nuovo Totale: 1031.00€\n[10/01/2026, 13:03:53] [CASSA 💶] HA ELIMINATO: dfergdh (444.00€). Nuovo Totale: 587.00€\n[10/01/2026, 13:03:57] 💰 CHIUSO E PAGATO: 587.00€	2026-01-10 12:02:55.208524	franco	\N	\N	0
109	1	99	[{"id":103,"nome":"Margherita","prezzo":10,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["acciughe"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Basilico","prezzo":1}]}}]	10	pagato	\nORDINE #109\n[10/01/2026, 02:26:32] 🆕 ORDINE DA: franco\n • Margherita (No: acciughe) (+: Bufala, Basilico) - 10.00€\nTOTALE PARZIALE: 10.00€\n----------------------------------\n\n[10/01/2026, 02:44:55] 💰 CHIUSO E PAGATO: 10.00€	2026-01-10 01:26:32.648859	franco	\N	\N	0
112	1	Banco	[{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"02:48"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"02:48"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"02:48"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:48"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:48"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:48"}]	15	pagato	\nORDINE #112\n[10/01/2026, 02:48:25] 🆕 ORDINE DA: franco\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\nTOTALE PARZIALE: 12.00€\n----------------------------------\n\n[10/01/2026, 02:48:39] [PIZZERIA 🍕] HA SFORNATO: Scilatelle (x3)\nORDINE #111\n[10/01/2026, 02:47:53] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\nTOTALE PARZIALE: 3.00€\n----------------------------------\n\n[10/01/2026, 02:48:47] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[10/01/2026, 02:48:48] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[10/01/2026, 02:48:49] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[10/01/2026, 11:43:47] 💰 CHIUSO E PAGATO: 15.00€	2026-01-10 01:48:25.970795	franco	\N	\N	0
176	1	Banco	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","chiuso_da_cassa":true,"riaperto":true,"ora_servizio":"01:20"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	24	pagato	\nORDINE #176\n[15/01/2026, 01:20:16] 🆕 ORDINE DA: Ospite\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\n[15/01/2026, 01:20:25] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:20:26] [CASSA 💶] ⚠️ RIAPERTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:20:27] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\nORDINE #177\n[15/01/2026, 01:22:39] 🆕 ORDINE DA: Ospite\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\nORDINE #175\n[15/01/2026, 01:10:15] 🆕 ORDINE DA: Ospite\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 01:25:43] 💰 CHIUSO E PAGATO: 24.00€	2026-01-15 00:20:17.004248	\N	\N	\N	0
163	2	Banco	[{"id":303,"nome":"Senza Nome","prezzo":"0.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:22","chiuso_da_cassa":true},{"id":303,"nome":"Senza Nome","prezzo":"0.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:24","chiuso_da_cassa":true},{"id":286,"nome":"Nachos","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:23","chiuso_da_cassa":true},{"id":286,"nome":"Nachos","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:24","chiuso_da_cassa":true},{"id":286,"nome":"Nachos","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:24","chiuso_da_cassa":true},{"id":286,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:21","chiuso_da_cassa":true},{"id":286,"nome":"Nachos","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:21","chiuso_da_cassa":true},{"id":297,"nome":"Costine di suino","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:21","chiuso_da_cassa":true},{"id":297,"nome":"Costine di suino","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:21","chiuso_da_cassa":true},{"id":298,"nome":"Pallottole fumanti","prezzo":5,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["Patate"],"aggiunte":[]},"ora_servizio":"23:21","chiuso_da_cassa":true},{"id":315,"nome":"Fiorentina","prezzo":"5.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:21","chiuso_da_cassa":true},{"id":315,"nome":"Fiorentina","prezzo":"5.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:21","chiuso_da_cassa":true},{"id":315,"nome":"Fiorentina","prezzo":7,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["Verdure grigliate"],"aggiunte":[{"nome":"Patate Friite","prezzo":2}]},"ora_servizio":"23:21","chiuso_da_cassa":true}]	57	pagato	\nORDINE #163\n[14/01/2026, 23:22:18] 🆕 ORDINE DA: Cliente (a)\n • Senza Nome - 0.00€\n • Senza Nome - 0.00€\n • Nachos - 5.00€\n • Nachos - 5.00€\n • Nachos - 5.00€\nTOTALE PARZIALE: 15.00€\n----------------------------------\n\n[14/01/2026, 23:22:58] [CASSA 💶] ✅ FATTO DALLA CASSA: Senza Nome\n[14/01/2026, 23:23:00] [CASSA 💶] ✅ FATTO DALLA CASSA: Nachos\n[14/01/2026, 23:24:01] [CASSA 💶] ✅ FATTO DALLA CASSA: Nachos\n[14/01/2026, 23:24:02] [CASSA 💶] ✅ FATTO DALLA CASSA: Nachos\n[14/01/2026, 23:24:03] [CASSA 💶] ✅ FATTO DALLA CASSA: Senza Nome\nORDINE #162\n[14/01/2026, 23:20:34] 🆕 ORDINE DA: Cliente (a)\n • Nachos - 5.00€\n • Nachos - 5.00€\n • Costine di suino - 5.00€\n • Costine di suino - 5.00€\n • Pallottole fumanti (No: Patate) - 5.00€\n • Fiorentina - 5.00€\n • Fiorentina - 5.00€\n • Fiorentina (No: Verdure grigliate) (+: Patate Friite) - 7.00€\nTOTALE PARZIALE: 42.00€\n----------------------------------\n\n[14/01/2026, 23:21:03] [CASSA 💶] ✅ FATTO DALLA CASSA: Nachos\n[14/01/2026, 23:21:11] [CASSA 💶] ✅ FATTO DALLA CASSA: Nachos\n[14/01/2026, 23:21:14] [CASSA 💶] ✅ FATTO DALLA CASSA: Costine di suino\n[14/01/2026, 23:21:17] [CASSA 💶] ✅ FATTO DALLA CASSA: Costine di suino\n[14/01/2026, 23:21:20] [CASSA 💶] ✅ FATTO DALLA CASSA: Pallottole fumanti\n[14/01/2026, 23:21:23] [CASSA 💶] ✅ FATTO DALLA CASSA: Fiorentina\n[14/01/2026, 23:21:24] [CASSA 💶] ✅ FATTO DALLA CASSA: Fiorentina\n[14/01/2026, 23:21:27] [CASSA 💶] ✅ FATTO DALLA CASSA: Fiorentina\n[14/01/2026, 23:24:10] 💰 CHIUSO E PAGATO: 57.00€	2026-01-14 22:22:19.009404	\N	11	14/01/2026, 23:22:18	0
110	1	54	[{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"02:46"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"02:46"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"02:47"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"02:47"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"02:47"}]	20	pagato	\nORDINE #110\n[10/01/2026, 02:46:12] 🆕 ORDINE DA: franco\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\nTOTALE PARZIALE: 20.00€\n----------------------------------\n\n[10/01/2026, 02:46:23] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[10/01/2026, 02:46:35] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[10/01/2026, 02:47:34] [PIZZERIA 🍕] HA SFORNATO: Scilatelle (x3)\n[10/01/2026, 02:49:02] 💰 CHIUSO E PAGATO: 20.00€	2026-01-10 01:46:13.009027	franco	\N	\N	0
51	1	1	[{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767795731656_0","stato":"servito","ora_servizio":"15:22"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767795731656_1","stato":"servito","ora_servizio":"15:22"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767795731656_2","stato":"servito","ora_servizio":"15:22"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767795731656_3","stato":"servito","ora_servizio":"15:22"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767795731656_4","stato":"servito","ora_servizio":"15:22"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":1,"uniqId":"new_1767795731656_5","stato":"servito","ora_servizio":"15:22"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767795731656_6","stato":"servito","ora_servizio":"15:22"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767795731656_7","stato":"servito","ora_servizio":"15:22"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767795762248_0","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767795762248_1","stato":"in_attesa"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767795762248_2","stato":"in_attesa"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767795762248_3","stato":"in_attesa"}]	48	pagato	\n--- ORDINE PARZIALE #51 ---\n[07/01/2026, 15:22:11] Ordine creato: 8 elementi. Tot: 32€\n[07/01/2026, 15:22:17] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[07/01/2026, 15:22:20] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x3)\n[07/01/2026, 15:22:26] [PIZZERIA 🍕] HA SFORNATO: Margherita (x2)\n[07/01/2026, 15:22:26] [PIZZERIA 🍕] HA SFORNATO: Margherita (x2)\n[07/01/2026, 15:22:30] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x2)\n\n--- ORDINE PARZIALE #52 ---\n[07/01/2026, 15:22:42] Ordine creato: 4 elementi. Tot: 16€\n\n================================\n[07/01/2026, 16:55:24] 💰 TAVOLO CHIUSO. TOTALE: 48.00€	2026-01-07 14:22:11.702422	\N	\N	\N	0
113	1	23	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	42	pagato	\nORDINE #113\n[10/01/2026, 02:58:54] 🆕 ORDINE DA: franco\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 42.00€\n----------------------------------\n\n[10/01/2026, 11:43:37] 💰 CHIUSO E PAGATO: 42.00€	2026-01-10 01:58:55.150911	franco	\N	\N	0
38	1	Banco	[{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767781283584_0","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767781283584_1","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767781283584_2","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767781283584_3","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767781283584_4","stato":"servito","ora_servizio":"12:14"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767781283584_5","stato":"servito","ora_servizio":"12:13"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767781283584_6","stato":"servito","ora_servizio":"12:13"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767781283584_7","stato":"servito","ora_servizio":"12:13"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781283584_8","stato":"servito","ora_servizio":"12:14"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781283584_9","stato":"servito","ora_servizio":"12:13"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781283584_10","stato":"servito","ora_servizio":"12:14"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781283584_11","stato":"servito","ora_servizio":"12:10"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781283584_12","stato":"servito","ora_servizio":"12:14"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781289576_0","stato":"servito","ora_servizio":"12:16"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781289576_1","stato":"servito","ora_servizio":"12:16"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781289576_2","stato":"servito","ora_servizio":"12:16"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767781289576_3","stato":"servito","ora_servizio":"12:16"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767782707232_0","stato":"in_attesa"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767782731905_0","stato":"servito","ora_servizio":"12:10"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767782731905_1","stato":"servito","ora_servizio":"12:10"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767782731905_2","stato":"servito","ora_servizio":"11:45"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767784901559_0","stato":"servito","ora_servizio":"12:24"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767784901559_1","stato":"servito","ora_servizio":"12:24"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767784901559_2","stato":"servito","ora_servizio":"12:23"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767784901559_3","stato":"in_attesa"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767784901559_4","stato":"servito","ora_servizio":"12:24"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767784901559_5","stato":"servito","ora_servizio":"12:23"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767785258288_0","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767785258288_1","stato":"in_attesa"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767785258288_2","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767785313475_0","stato":"in_attesa"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767785313475_1","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767785313475_2","stato":"in_attesa"}]	221	pagato	\n--- ORDINE PARZIALE #38 ---\n[07/01/2026, 11:21:23] Ordine creato: 13 elementi. Tot: 127€\n[07/01/2026, 11:21:36] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:29:21] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 11:29:29] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:29:33] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:29:33] [BAR 🍹] HA RIMESSO IN ATTESA: Cocacola\n[07/01/2026, 11:29:36] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:29:44] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:29:47] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:29:49] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:29:53] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:29:56] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:30:13] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 11:30:16] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 11:30:18] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 11:44:13] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 11:44:16] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:44:17] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:44:25] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 11:44:26] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 11:44:26] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 11:44:27] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 11:44:28] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 11:44:28] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 11:44:29] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 11:44:31] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 11:44:52] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 11:44:53] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:44:54] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:44:54] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:44:55] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:44:56] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:44:57] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:44:57] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 11:46:11] [CUCINA 👨‍🍳] HA SERVITO: Al ragù\n[07/01/2026, 11:46:12] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Al ragù\n[07/01/2026, 11:46:13] [CUCINA 👨‍🍳] HA SERVITO: Al ragù\n[07/01/2026, 11:46:14] [CUCINA 👨‍🍳] HA SERVITO: Al ragù\n[07/01/2026, 11:46:16] [CUCINA 👨‍🍳] HA SERVITO: Al ragù\n[07/01/2026, 11:46:17] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Al ragù\n[07/01/2026, 11:46:18] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Al ragù\n[07/01/2026, 11:46:18] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Al ragù\n[07/01/2026, 11:54:47] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 11:57:22] [BAR 🍹] HA RIMESSO IN ATTESA: 3x Chianti\n[07/01/2026, 11:57:25] [BAR 🍹] HA RIMESSO IN ATTESA: 4x Cocacola\n[07/01/2026, 11:57:29] [BAR 🍹] HA SERVITO: 4x Cocacola\n[07/01/2026, 11:57:33] [BAR 🍹] HA SERVITO: 4x Chianti\n[07/01/2026, 11:57:42] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 11:58:17] [BAR 🍹] HA RIMESSO IN ATTESA: 3x Chianti\n[07/01/2026, 12:10:04] [BAR 🍹] HA RIMESSO IN ATTESA: 4x Cocacola\n[07/01/2026, 12:10:05] [BAR 🍹] HA SERVITO: 4x Cocacola\n[07/01/2026, 12:10:10] [BAR 🍹] HA RIMESSO IN ATTESA: 4x Cocacola\n[07/01/2026, 12:10:13] [BAR 🍹] HA SERVITO: 4x Cocacola\n[07/01/2026, 12:10:29] [BAR 🍹] HA SERVITO: 4x Chianti\n[07/01/2026, 12:10:42] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 12:10:43] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 12:10:44] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 12:10:50] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 12:10:54] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 12:10:57] [BAR 🍹] HA RIMESSO IN ATTESA: 4x Chianti\n[07/01/2026, 12:11:13] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 12:11:15] [BAR 🍹] HA RIMESSO IN ATTESA: Brasilena\n[07/01/2026, 12:13:31] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 12:13:40] [BAR 🍹] HA SERVITO: 2x Cocacola\n[07/01/2026, 12:13:41] [BAR 🍹] HA SERVITO: 4x Chianti\n[07/01/2026, 12:13:51] [CASSA 💶] HA SEGNATO IN ATTESA: Chianti\n[07/01/2026, 12:13:53] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 12:13:55] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 12:13:56] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 12:14:06] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 12:14:08] [BAR 🍹] HA SERVITO: 2x Cocacola\n[07/01/2026, 12:14:12] [BAR 🍹] HA SERVITO: Chianti\n[07/01/2026, 12:20:51] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Al ragù\n[07/01/2026, 12:20:53] [CUCINA 👨‍🍳] HA SERVITO: Al ragù\n[07/01/2026, 12:21:05] [CUCINA 👨‍🍳] HA SERVITO: Al ragù\n[07/01/2026, 12:21:06] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Al ragù\n[07/01/2026, 12:21:20] [CASSA 💶] HA SEGNATO IN ATTESA: Al ragù\n[07/01/2026, 12:23:12] [CUCINA 👨‍🍳] HA SERVITO: Al ragù\n[07/01/2026, 12:23:13] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Al ragù\n[07/01/2026, 12:23:59] [CASSA 💶] HA SEGNATO SERVITO: Al ragù\n[07/01/2026, 12:24:33] [CASSA 💶] HA SEGNATO IN ATTESA: Al ragù\n\n--- ORDINE PARZIALE #39 ---\n[07/01/2026, 11:21:29] Ordine creato: 4 elementi. Tot: 12€\n[07/01/2026, 11:21:38] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 11:29:16] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 11:30:11] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 11:44:24] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 11:44:46] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 11:44:48] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 11:44:49] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 11:44:50] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 12:10:23] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 12:10:31] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 12:10:39] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 12:10:40] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 12:10:41] [CASSA 💶] HA SEGNATO IN ATTESA: Brasilena\n[07/01/2026, 12:11:07] [BAR 🍹] HA RIMESSO IN ATTESA: Brasilena\n[07/01/2026, 12:16:19] [BAR 🍹] HA SERVITO: 4x Brasilena\n\n--- ORDINE PARZIALE #40 ---\n[07/01/2026, 11:45:07] Ordine creato: 1 elementi. Tot: 20€\n[07/01/2026, 11:45:11] [BAR 🍹] HA SERVITO: Chardonnay\n[07/01/2026, 12:10:22] [CASSA 💶] HA SEGNATO IN ATTESA: Chardonnay\n[07/01/2026, 12:10:37] [CASSA 💶] HA SEGNATO SERVITO: Chardonnay\n[07/01/2026, 12:10:38] [CASSA 💶] HA SEGNATO IN ATTESA: Chardonnay\n\n--- ORDINE PARZIALE #41 ---\n[07/01/2026, 11:45:31] Ordine creato: 3 elementi. Tot: 15€\n[07/01/2026, 11:45:43] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:45:44] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:45:46] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:45:47] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 11:58:05] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 11:58:14] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 12:10:20] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 12:10:21] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 12:10:47] [CASSA 💶] HA SEGNATO SERVITO: Cocacola\n[07/01/2026, 12:10:48] [CASSA 💶] HA SEGNATO SERVITO: Cocacola\n\n--- ORDINE PARZIALE #42 ---\n[07/01/2026, 12:21:41] Ordine creato: 6 elementi. Tot: 25€\n[07/01/2026, 12:23:34] [CUCINA 👨‍🍳] HA SERVITO: 3x Scilatelle\n[07/01/2026, 12:23:45] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti\n[07/01/2026, 12:24:36] [CASSA 💶] HA SEGNATO IN ATTESA: Scilatelle\n[07/01/2026, 12:24:37] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[07/01/2026, 12:24:50] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle\n[07/01/2026, 12:24:53] [CUCINA 👨‍🍳] HA SERVITO: 2x Margherita\n\n--- ORDINE PARZIALE #43 ---\n[07/01/2026, 12:27:38] Ordine creato: 3 elementi. Tot: 11€\n\n--- ORDINE PARZIALE #44 ---\n[07/01/2026, 12:28:33] Ordine creato: 3 elementi. Tot: 11€\n\n================================\n[07/01/2026, 12:38:16] 💰 TAVOLO CHIUSO. TOTALE: 221.00€	2026-01-07 10:21:23.631494	\N	\N	\N	0
124	1	37	[{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":4,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"granbiscotto","prezzo":3}]}},{"id":84,"nome":"edfwre","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":102,"nome":"r34t3567uyi","prezzo":82.5,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Maiale","prezzo":5},{"nome":"Sanbuca","prezzo":8},{"nome":"Crudo","prezzo":3.5}]}},{"id":83,"nome":"deqwfre","prezzo":14,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8},{"nome":"Maiale","prezzo":5}]}},{"id":103,"nome":"Margherita","prezzo":10,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["basilico","mozzarella"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Mozzarella","prezzo":1}]}}]	135.5	pagato	\nORDINE #124\n[10/01/2026, 17:00:03] 🆕 ORDINE DA: Cliente (Ospite)\n • Scilatelle - 4.00€\n • Chardonnay - 20.00€\n • dfgbvn (+: granbiscotto) - 4.00€\n • edfwre - 1.00€\n • r34t3567uyi (+: Maiale, Sanbuca, Crudo) - 82.50€\n • deqwfre (+: Sanbuca, Maiale) - 14.00€\n • Margherita (No: basilico, mozzarella) (+: Bufala, Mozzarella) - 10.00€\nTOTALE PARZIALE: 135.50€\n----------------------------------\n\n[10/01/2026, 17:04:00] 💰 CHIUSO E PAGATO: 135.50€	2026-01-10 16:00:04.330546	\N	\N	\N	0
14	1	Banco	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767736903999_0","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767736903999_1","stato":"in_attesa"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767736903999_2","stato":"in_attesa"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767736903999_3","stato":"in_attesa"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767736903999_4","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767736903999_6","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767736903999_7","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767736903999_8","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767736903999_11","stato":"servito"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767736903999_12","stato":"servito"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767736903999_13","stato":"servito"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767736903999_14","stato":"servito"}]	90	pagato	[06/01/2026, 22:01:43] Ordine creato: 15 elementi. Tot: 90€\n[06/01/2026, 22:05:36] CONTO CHIUSO E PAGATO.	2026-01-06 22:01:44.045619	\N	\N	\N	0
27	1	Banco	[{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767777338927_0","stato":"servito","ora_servizio":"10:36"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767777338927_1","stato":"servito","ora_servizio":"10:36"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767777338927_2","stato":"servito","ora_servizio":"10:36"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767777338927_3","stato":"servito","ora_servizio":"10:36"}]	10	pagato	[07/01/2026, 10:15:38] Ordine creato: 4 elementi. Tot: 10€\n[07/01/2026, 10:36:41] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle\n[07/01/2026, 10:36:41] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle\n[07/01/2026, 10:36:42] [CUCINA 👨‍🍳] HA SERVITO: Pasta\n[07/01/2026, 10:36:43] [CUCINA 👨‍🍳] HA SERVITO: Pasta\n[07/01/2026, 10:36:56] CONTO CHIUSO E PAGATO.	2026-01-07 09:15:39.358382	\N	\N	\N	0
26	1	Banco	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775908665_0","stato":"servito","ora_servizio":"10:36"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775908665_1","stato":"servito","ora_servizio":"10:36"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775908665_2","stato":"servito","ora_servizio":"10:36"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775908665_3","stato":"servito","ora_servizio":"10:36"}]	7	pagato	[07/01/2026, 09:51:48] Ordine creato: 4 elementi. Tot: 7€\n[07/01/2026, 10:36:32] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[07/01/2026, 10:36:34] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[07/01/2026, 10:36:40] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti\n[07/01/2026, 10:36:43] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle\n[07/01/2026, 10:36:56] CONTO CHIUSO E PAGATO.	2026-01-07 08:51:49.278746	\N	\N	\N	0
150	1	38	[{"id":91,"nome":"Pasta","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":13,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["basilico","acciughe"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Basilico","prezzo":1},{"nome":"Patatine Fritte","prezzo":3}]}},{"id":100,"nome":"dfgbvn","prezzo":4,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"granbiscotto","prezzo":3}]}},{"id":84,"nome":"edfwre","prezzo":17.5,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8},{"nome":"Maiale","prezzo":5},{"nome":"Crudo","prezzo":3.5}]}},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"}]	100.5	pagato	\nORDINE #150\n[11/01/2026, 21:38:15] 🆕 ORDINE DA: Cliente (Paksh)\n • Pasta - 1.00€\n • Margherita (No: basilico, acciughe) (+: Bufala, Basilico, Patatine Fritte) - 13.00€\n • dfgbvn (+: granbiscotto) - 4.00€\n • edfwre (+: Sanbuca, Maiale, Crudo) - 17.50€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 100.50€\n----------------------------------\n\n[12/01/2026, 14:33:33] 💰 CHIUSO E PAGATO: 100.50€	2026-01-11 20:38:16.506685	\N	9	11/01/2026, 21:38:15	0
29	1	Banco	[{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778727457_0","stato":"servito","ora_servizio":"10:39"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778727457_3","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778727457_4","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778727457_5","stato":"in_attesa"}]	7	pagato	[07/01/2026, 10:38:47] Ordine creato: 6 elementi. Tot: 12€\n[07/01/2026, 10:39:29] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 10:39:32] [CASSA 💶] HA ELIMINATO: Carbonara (4.00€). Nuovo Totale: 8.00€\n[07/01/2026, 10:39:37] [CASSA 💶] HA ELIMINATO: Al sugo (1.00€). Nuovo Totale: 7.00€\n[07/01/2026, 10:40:17] CONTO CHIUSO E PAGATO.	2026-01-07 09:38:47.504413	\N	\N	\N	0
53	1	Banco	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767801434940_0","stato":"servito","ora_servizio":"16:57"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767801434940_1","stato":"servito","ora_servizio":"16:58"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767801434940_2","stato":"servito","ora_servizio":"16:58"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":1,"uniqId":"new_1767801434940_3","stato":"servito","ora_servizio":"16:57"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767801434940_4","stato":"servito","ora_servizio":"16:58"},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767801434940_5","stato":"servito","ora_servizio":"16:58"},{"nome":"montagna","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767801434940_6","stato":"servito","ora_servizio":"16:58"},{"nome":"montagna","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767801434940_7","stato":"servito","ora_servizio":"16:58"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767801434940_8","stato":"servito","ora_servizio":"16:59"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767801434940_9","stato":"servito","ora_servizio":"16:59"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767801434940_10","stato":"servito","ora_servizio":"16:59"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767801434940_11","stato":"servito","ora_servizio":"16:59"}]	53	pagato	\n--- ORDINE PARZIALE #53 ---\n[07/01/2026, 16:57:14] Ordine creato: 12 elementi. Tot: 53€\n[07/01/2026, 16:57:31] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti\n[07/01/2026, 16:57:35] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[07/01/2026, 16:57:50] [CUCINA 👨‍🍳] HA SERVITO: Margherita\n[07/01/2026, 16:58:12] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[07/01/2026, 16:58:30] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x2)\n[07/01/2026, 16:58:40] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[07/01/2026, 16:58:47] [CUCINA 👨‍🍳] HA SERVITO: montagna (x2)\n[07/01/2026, 16:58:52] [CUCINA 👨‍🍳] HA SERVITO: carbonara (x1)\n[07/01/2026, 16:59:01] [CASSA 💶] HA SEGNATO SERVITO: Chardonnay\n[07/01/2026, 16:59:02] [CASSA 💶] HA SEGNATO SERVITO: Brasilena\n[07/01/2026, 16:59:03] [CASSA 💶] HA SEGNATO SERVITO: Cocacola\n[07/01/2026, 16:59:05] [CASSA 💶] HA SEGNATO SERVITO: Acqua\n\n================================\n[07/01/2026, 16:59:26] 💰 TAVOLO CHIUSO. TOTALE: 53.00€	2026-01-07 15:57:15.544464	\N	\N	\N	0
54	2	Banco	[{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767802563784_0","stato":"in_attesa"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767802563784_1","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Pizze","categoria_posizione":2,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767802563784_2","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Pizze","categoria_posizione":2,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767802563784_3","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":2,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767802563784_4","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":2,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767802563784_5","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":2,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767802563784_6","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":3,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767802563784_7","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":3,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767802563784_8","stato":"in_attesa"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":3,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767802563784_9","stato":"in_attesa"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":3,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767802563784_10","stato":"in_attesa"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767802563784_11","stato":"in_attesa"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767802563784_12","stato":"in_attesa"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767802563784_13","stato":"in_attesa"}]	92	pagato	\n--- ORDINE PARZIALE #54 ---\n[07/01/2026, 17:16:03] Ordine creato: 14 elementi. Tot: 92€\n\n================================\n[07/01/2026, 17:16:57] 💰 TAVOLO CHIUSO. TOTALE: 92.00€	2026-01-07 16:16:04.395531	\N	\N	\N	0
55	1	Banco	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":1,"uniqId":"new_1767803014428_0","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767803014428_1","stato":"in_attesa"},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767803014428_2","stato":"in_attesa"},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767803014428_3","stato":"in_attesa"},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767803014428_4","stato":"in_attesa"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767803014428_5","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767803014428_6","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767803014428_7","stato":"in_attesa"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767803014428_8","stato":"in_attesa"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767803014428_9","stato":"in_attesa"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767803014428_10","stato":"in_attesa"}]	75	pagato	\n--- ORDINE PARZIALE #55 ---\n[07/01/2026, 17:23:34] Ordine creato: 11 elementi. Tot: 75€\n\n================================\n[07/01/2026, 18:34:24] 💰 TAVOLO CHIUSO. TOTALE: 75.00€	2026-01-07 16:23:34.474624	\N	\N	\N	0
125	1	38	[{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","chiuso_da_cassa":true,"riaperto":true},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","chiuso_da_cassa":true,"riaperto":true},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa","chiuso_da_cassa":true,"riaperto":true},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"}]	52	pagato	\nORDINE #125\n[10/01/2026, 17:00:55] 🆕 ORDINE DA: Cliente (Prova 22)\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 52.00€\n----------------------------------\n\n[10/01/2026, 17:02:01] [CASSA 💶] ✅ FATTO DALLA CASSA: Mare e Monti\n[10/01/2026, 17:02:06] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Mare e Monti\n[10/01/2026, 17:02:23] [CASSA 💶] ✅ FATTO DALLA CASSA: Chianti\n[10/01/2026, 17:02:27] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chianti\n[10/01/2026, 17:02:29] [CASSA 💶] ✅ FATTO DALLA CASSA: Mare e Monti\n[10/01/2026, 17:02:36] [CASSA 💶] ✅ FATTO DALLA CASSA: Mare e Monti\n[10/01/2026, 17:02:39] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Mare e Monti\n[10/01/2026, 17:02:41] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Mare e Monti\n[10/01/2026, 17:03:57] 💰 CHIUSO E PAGATO: 52.00€	2026-01-10 16:00:55.488033	\N	\N	\N	0
187	1	33	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"}]	9	pagato	\nORDINE #187\n[15/01/2026, 01:57:39] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\n[15/01/2026, 02:24:34] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:24:34] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:24:34] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:24:49] 💰 CHIUSO E PAGATO: 9.00€	2026-01-15 00:57:40.418076	Francesco	4	\N	0
188	1	22	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"}]	9	pagato	\nORDINE #188\n[15/01/2026, 01:57:45] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\n[15/01/2026, 02:24:37] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:24:37] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:24:38] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:24:42] 💰 CHIUSO E PAGATO: 9.00€	2026-01-15 00:57:45.057673	Francesco	4	\N	0
57	1	Banco	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767807639540_0","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767807639540_2","stato":"in_attesa"}]	2	pagato	\n--- ORDINE PARZIALE #57 ---\n[07/01/2026, 18:40:39] Ordine creato: 3 elementi. Tot: 3€\n[07/01/2026, 18:41:59] [CASSA 💶] HA ELIMINATO: Mare e Monti (1.00€). Nuovo Totale: 2.00€\n\n================================\n[07/01/2026, 19:08:29] 💰 TAVOLO CHIUSO. TOTALE: 2.00€	2026-01-07 17:40:40.158765	\N	\N	\N	0
56	1	38	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767807325917_0","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":1,"uniqId":"new_1767807325917_1","stato":"servito","ora_servizio":"18:36"},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767807325917_2","stato":"servito","ora_servizio":"18:36"},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767807325917_3","stato":"servito","ora_servizio":"18:36"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767807325917_4","stato":"servito","ora_servizio":"18:36"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767807325917_5","stato":"servito","ora_servizio":"18:36"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767807325917_6","stato":"servito","ora_servizio":"18:36"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767807325917_7","stato":"servito","ora_servizio":"18:36"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767807325917_8","stato":"servito","ora_servizio":"18:36"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767807325917_9","stato":"servito","ora_servizio":"18:36"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767807325917_10","stato":"servito","ora_servizio":"18:36"}]	98	pagato	\n--- ORDINE PARZIALE #56 ---\n[07/01/2026, 18:35:25] Ordine creato: 11 elementi. Tot: 98€\n[07/01/2026, 18:36:05] [BAR 🍹] HA SERVITO: 3x Chianti\n[07/01/2026, 18:36:07] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 18:36:08] [BAR 🍹] HA SERVITO: 3x Brasilena\n[07/01/2026, 18:36:28] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[07/01/2026, 18:36:39] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x1)\n[07/01/2026, 18:36:50] [CUCINA 👨‍🍳] HA SERVITO: carbonara (x2)\n[07/01/2026, 18:37:03] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n\n================================\n[07/01/2026, 18:37:44] 💰 TAVOLO CHIUSO. TOTALE: 98.00€	2026-01-07 17:35:25.963485	\N	\N	\N	0
130	1	37	[{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	2	pagato	\nORDINE #130\n[10/01/2026, 17:44:11] 🆕 ORDINE DA: Cliente (Pizzeria Stark)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\nTOTALE PARZIALE: 2.00€\n----------------------------------\n\n[10/01/2026, 20:14:42] 💰 CHIUSO E PAGATO: 2.00€	2026-01-10 16:44:11.199621	\N	\N	\N	0
126	1	Banco	[{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"20:14","chiuso_da_cassa":true},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"20:14","chiuso_da_cassa":true},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	2346	pagato	\nORDINE #126\n[10/01/2026, 17:42:05] 🆕 ORDINE DA: Cliente (Pizzeria Stark)\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\nTOTALE PARZIALE: 1332.00€\n----------------------------------\n\nORDINE #128\n[10/01/2026, 17:42:53] 🆕 ORDINE DA: Cliente (Prova 22)\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 21.00€\n----------------------------------\n\nORDINE #127\n[10/01/2026, 17:42:28] 🆕 ORDINE DA: Cliente (Pizzeria Stark)\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\nTOTALE PARZIALE: 80.00€\n----------------------------------\n\n[10/01/2026, 20:14:32] [CASSA 💶] ✅ FATTO DALLA CASSA: Chardonnay\nORDINE #129\n[10/01/2026, 17:43:42] 🆕 ORDINE DA: Cliente (franco)\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\nTOTALE PARZIALE: 913.00€\n----------------------------------\n\n[10/01/2026, 20:14:35] [CASSA 💶] ✅ FATTO DALLA CASSA: Margherita\n[10/01/2026, 20:14:51] 💰 CHIUSO E PAGATO: 2346.00€	2026-01-10 16:42:05.628225	\N	\N	\N	0
193	1	33	[{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:27"},{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:27"}]	24	pagato	\nORDINE #193\n[15/01/2026, 02:25:23] 🆕 ORDINE DA: Francesco\n • Prova - 12.00€\n • Prova - 12.00€\nTOTALE PARZIALE: 24.00€\n----------------------------------\n\n[15/01/2026, 02:27:48] [CUCINA 👨‍🍳] HA SERVITO: Prova\n[15/01/2026, 02:27:48] [CUCINA 👨‍🍳] HA SERVITO: Prova\n[15/01/2026, 02:31:58] 💰 CHIUSO E PAGATO: 24.00€	2026-01-15 01:25:23.957662	Francesco	4	\N	0
194	1	31	[{"id":207,"nome":"Supplì","prezzo":"4.50","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":207,"nome":"Supplì","prezzo":"4.50","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	9	pagato	\nORDINE #194\n[15/01/2026, 02:25:45] 🆕 ORDINE DA: Francesco\n • Supplì - 4.50€\n • Supplì - 4.50€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\n[15/01/2026, 02:31:47] 💰 CHIUSO E PAGATO: 9.00€	2026-01-15 01:25:46.556207	Francesco	4	\N	0
195	1	25	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:27"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:27"}]	6	pagato	\nORDINE #195\n[15/01/2026, 02:26:17] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 02:27:39] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:27:39] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:31:50] 💰 CHIUSO E PAGATO: 6.00€	2026-01-15 01:26:17.949166	Francesco	4	\N	0
15	1	Banco	[{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767737176169_0","stato":"servito","ora_servizio":"23:09"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767737176169_1","stato":"servito","ora_servizio":"23:09"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767737176169_3","stato":"servito","ora_servizio":"23:08"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767737176169_4","stato":"servito"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767737176169_5","stato":"servito"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767737176169_7","stato":"servito"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767737176169_8","stato":"servito"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767737176169_9","stato":"servito"}]	32	pagato	[06/01/2026, 22:06:16] Ordine creato: 10 elementi. Tot: 39€\n[06/01/2026, 22:06:48] ELIMINATO: Margherita (6.00€). Nuovo Totale: 33.00€\n[06/01/2026, 22:08:38] Scilatelle segnato come IN_ATTESA\n[06/01/2026, 22:08:40] Scilatelle segnato come SERVITO\n[06/01/2026, 22:09:11] Acqua segnato come IN_ATTESA\n[06/01/2026, 22:09:13] Acqua segnato come SERVITO\n[06/01/2026, 22:09:15] Acqua segnato come SERVITO\n[06/01/2026, 22:09:20] ELIMINATO: Acqua (1.00€). Nuovo Totale: 32.00€\n[06/01/2026, 22:09:48] CONTO CHIUSO E PAGATO.	2026-01-06 22:06:16.216206	\N	\N	\N	0
16	1	Banco	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767737499808_0","stato":"servito","ora_servizio":"23:11"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767737499808_1","stato":"servito","ora_servizio":"23:21"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767737499808_2","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767737499808_4","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767737499808_5","stato":"in_attesa"}]	12	pagato	[06/01/2026, 22:11:39] Ordine creato: 6 elementi. Tot: 13€\n[06/01/2026, 22:11:53] Margherita segnato come SERVITO\n[06/01/2026, 22:22:04] Pasta segnato come IN_ATTESA\n[06/01/2026, 22:22:11] ELIMINATO: Pasta (1.00€). Nuovo Totale: 12.00€\n[06/01/2026, 22:22:39] CONTO CHIUSO E PAGATO.	2026-01-06 22:11:39.855181	\N	\N	\N	0
131	1	555	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"20:14","chiuso_da_cassa":true},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":11,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["acciughe","basilico"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Basilico","prezzo":1},{"nome":"Mozzarella","prezzo":1}]}}]	25	pagato	\nORDINE #131\n[10/01/2026, 18:16:11] 🆕 ORDINE DA: a\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita (No: acciughe, basilico) (+: Bufala, Basilico, Mozzarella) - 11.00€\nTOTALE PARZIALE: 25.00€\n----------------------------------\n\n[10/01/2026, 20:14:28] [CASSA 💶] ✅ FATTO DALLA CASSA: Margherita\n[10/01/2026, 20:14:41] 💰 CHIUSO E PAGATO: 25.00€	2026-01-10 17:16:11.883961	a	\N	\N	0
17	1	Banco	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767740327274_0","stato":"servito","ora_servizio":"00:10"}]	1	pagato	[06/01/2026, 22:58:47] Ordine creato: 1 elementi. Tot: 1€\n[06/01/2026, 23:10:01] Mare e Monti segnato come SERVITO\n[06/01/2026, 23:10:05] CONTO CHIUSO E PAGATO.	2026-01-06 22:58:47.366674	\N	\N	\N	0
192	1	22	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:27"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:27"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"02:32"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:27"}]	12	pagato	\nORDINE #192\n[15/01/2026, 02:25:10] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 12.00€\n----------------------------------\n\n[15/01/2026, 02:27:53] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:27:53] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:27:53] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:27:53] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:31:59] [CASSA 💶] ⚠️ RIAPERTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:32:03] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:32:08] 💰 CHIUSO E PAGATO: 12.00€	2026-01-15 01:25:11.533478	Francesco	4	\N	0
62	1	2	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767808422735_0","stato":"in_attesa"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767808422735_1","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767808422735_2","stato":"in_attesa"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767808422735_3","stato":"in_attesa"}]	10	pagato	\n--- ORDINE PARZIALE #62 ---\n[07/01/2026, 18:53:42] Ordine creato: 4 elementi. Tot: 10€\n\n================================\n[07/01/2026, 19:08:23] 💰 TAVOLO CHIUSO. TOTALE: 10.00€	2026-01-07 17:53:42.782127	\N	\N	\N	0
58	1	147	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767808379558_0","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767808379558_1","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767808379558_2","stato":"in_attesa"}]	18	pagato	\n--- ORDINE PARZIALE #58 ---\n[07/01/2026, 18:52:59] Ordine creato: 3 elementi. Tot: 18€\n\n================================\n[07/01/2026, 19:08:27] 💰 TAVOLO CHIUSO. TOTALE: 18.00€	2026-01-07 17:52:59.604871	\N	\N	\N	0
18	1	Banco	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767741167324_0","stato":"servito","ora_servizio":"00:13"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767741167324_1","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767741167324_2","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767741167324_3","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767741167324_4","stato":"in_attesa"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767741167324_5","stato":"in_attesa"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"uniqId":"new_1767741167324_6","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767741167324_7","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767741167324_8","stato":"in_attesa"}]	61	pagato	[06/01/2026, 23:12:47] Ordine creato: 9 elementi. Tot: 61€\n[06/01/2026, 23:13:13] Mare e Monti segnato come SERVITO\n[06/01/2026, 23:13:15] Mare e Monti segnato come IN_ATTESA\n[06/01/2026, 23:13:18] Mare e Monti segnato come SERVITO\n[06/01/2026, 23:13:23] CONTO CHIUSO E PAGATO.	2026-01-06 23:12:47.370156	\N	\N	\N	0
19	1	Banco	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767741962431_0","stato":"servito","ora_servizio":"00:26"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767741962431_1","stato":"servito","ora_servizio":"00:26"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767741962431_2","stato":"servito","ora_servizio":"00:26"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767741962431_3","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767741962431_4","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767741962431_5","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767741962431_6","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767741962431_7","stato":"in_attesa"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767741962431_8","stato":"in_attesa"}]	96	pagato	[07/01/2026, 00:26:02] Ordine creato: 9 elementi. Tot: 96€\n[07/01/2026, 00:26:22] CONTO CHIUSO E PAGATO.	2026-01-06 23:26:03.15517	\N	\N	\N	0
20	1	Banco	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767742410804_0","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767742410804_1","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767742410804_2","stato":"servito","ora_servizio":"00:33"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767742410804_3","stato":"servito","ora_servizio":"00:33"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767742410804_4","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767742410804_5","stato":"servito","ora_servizio":"00:33"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767742410804_6","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767742410804_7","stato":"in_attesa"}]	18	pagato	[07/01/2026, 00:33:30] Ordine creato: 9 elementi. Tot: 19€\n[07/01/2026, 00:34:11] ELIMINATO: Pasta (1.00€). Nuovo Totale: 18.00€\n[07/01/2026, 00:34:14] CONTO CHIUSO E PAGATO.	2026-01-06 23:33:30.850641	\N	\N	\N	0
133	1	2	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	14	pagato	\nORDINE #133\n[10/01/2026, 19:25:58] 🆕 ORDINE DA: Cliente (Prova 22)\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 14.00€\n----------------------------------\n\n[10/01/2026, 20:14:44] 💰 CHIUSO E PAGATO: 14.00€	2026-01-10 18:25:59.002507	\N	\N	10/01/2026, 19:25:58	0
134	1	4321	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	14	pagato	\nORDINE #134\n[10/01/2026, 19:26:26] 🆕 ORDINE DA: a\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 14.00€\n----------------------------------\n\n[10/01/2026, 20:14:47] 💰 CHIUSO E PAGATO: 14.00€	2026-01-10 18:26:27.123675	a	\N	10/01/2026, 19:26:26	0
116	1	57	[{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:59"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:59"},{"id":91,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":92,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:58"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:59"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:59"},{"id":101,"nome":"dfergdh","prezzo":444,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[]},"ora_servizio":"11:59"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"12:00"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"11:59"}]	1354	pagato	\nORDINE #116\n[10/01/2026, 11:58:01] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al sugo - 1.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Pasta - 1.00€\n • Pasta - 1.00€\nTOTALE PARZIALE: 907.00€\n----------------------------------\n\n[10/01/2026, 11:58:13] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x2)\n[10/01/2026, 11:58:13] [CUCINA 👨‍🍳] HA SERVITO: dfergdh (x2)\n[10/01/2026, 11:58:22] [CASSA 💶] HA SEGNATO SERVITO: Pasta\n[10/01/2026, 11:58:24] [CASSA 💶] HA SEGNATO SERVITO: Al ragù\n[10/01/2026, 11:58:32] [CASSA 💶] HA SEGNATO IN ATTESA: dfergdh\n[10/01/2026, 11:58:35] [CUCINA 👨‍🍳] HA SERVITO: dfergdh (x1)\n[10/01/2026, 11:58:37] [CUCINA 👨‍🍳] HA SERVITO: Pasta (x1)\n[10/01/2026, 11:58:38] [CUCINA 👨‍🍳] HA SERVITO: Al sugo (x1)\n[10/01/2026, 11:58:41] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x5)\n[10/01/2026, 11:58:45] [CASSA 💶] HA SEGNATO IN ATTESA: Al ragù\n[10/01/2026, 11:58:58] [CASSA 💶] HA ELIMINATO: Al ragù (1.00€). Nuovo Totale: 906.00€\n[10/01/2026, 11:59:02] [CUCINA 👨‍🍳] HA SERVITO: Carbonara (x2)\nORDINE #118\n[10/01/2026, 11:59:48] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\nTOTALE PARZIALE: 2.00€\n----------------------------------\n\n[10/01/2026, 11:59:59] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x2)\nORDINE #117\n[10/01/2026, 11:59:22] 🆕 ORDINE DA: franco\n • dfergdh - 444.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\nTOTALE PARZIALE: 446.00€\n----------------------------------\n\n[10/01/2026, 11:59:37] [CUCINA 👨‍🍳] HA SERVITO: dfergdh (x1)\n[10/01/2026, 11:59:53] [CASSA 💶] HA SEGNATO SERVITO: dfgbvn\n[10/01/2026, 12:00:02] [CASSA 💶] HA SEGNATO SERVITO: dfgbvn\n[10/01/2026, 12:00:05] 💰 CHIUSO E PAGATO: 1354.00€	2026-01-10 10:58:02.574749	franco	\N	\N	0
21	1	Banco	[{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767742527646_0","stato":"servito","ora_servizio":"00:35"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767742527646_1","stato":"servito","ora_servizio":"00:35"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767742527646_2","stato":"in_attesa"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767742527646_3","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767742527646_4","stato":"servito","ora_servizio":"00:35"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767742527646_5","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767742527646_6","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767742527646_7","stato":"in_attesa"}]	16	pagato	[07/01/2026, 00:35:27] Ordine creato: 8 elementi. Tot: 16€\n[07/01/2026, 00:35:33] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[07/01/2026, 00:35:34] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[07/01/2026, 00:35:35] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti\n[07/01/2026, 00:35:37] [CUCINA 👨‍🍳] HA SERVITO: Margherita\n[07/01/2026, 00:35:40] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Mare e Monti\n[07/01/2026, 00:35:51] CONTO CHIUSO E PAGATO.	2026-01-06 23:35:27.694103	\N	\N	\N	0
59	1	37	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767808385236_0","stato":"servito","ora_servizio":"18:53"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767808385236_1","stato":"servito","ora_servizio":"18:53"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767808385236_2","stato":"servito","ora_servizio":"18:53"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767808385236_3","stato":"servito","ora_servizio":"18:53"},{"nome":"vedure","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767808385236_4","stato":"in_attesa"},{"nome":"vedure","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767808385236_5","stato":"in_attesa"},{"nome":"vedure","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767808385236_6","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767808394468_0","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767808394468_1","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767808394468_2","stato":"in_attesa"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767808412597_0","stato":"servito","ora_servizio":"18:54"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767808412597_1","stato":"servito","ora_servizio":"18:54"}]	31	pagato	\n--- ORDINE PARZIALE #59 ---\n[07/01/2026, 18:53:05] Ordine creato: 7 elementi. Tot: 7€\n[07/01/2026, 18:53:44] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[07/01/2026, 18:53:44] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[07/01/2026, 18:53:48] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[07/01/2026, 18:53:49] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n\n--- ORDINE PARZIALE #60 ---\n[07/01/2026, 18:53:14] Ordine creato: 3 elementi. Tot: 18€\n\n--- ORDINE PARZIALE #61 ---\n[07/01/2026, 18:53:32] Ordine creato: 3 elementi. Tot: 9€\n[07/01/2026, 18:54:07] [CASSA 💶] HA SEGNATO SERVITO: Brasilena\n[07/01/2026, 18:54:08] [CASSA 💶] HA SEGNATO SERVITO: Brasilena\n[07/01/2026, 18:54:09] [CASSA 💶] HA SEGNATO SERVITO: Brasilena\n[07/01/2026, 18:54:33] [CASSA 💶] HA ELIMINATO: Brasilena (3.00€). Nuovo Totale: 6.00€\n\n================================\n[07/01/2026, 19:08:32] 💰 TAVOLO CHIUSO. TOTALE: 31.00€	2026-01-07 17:53:05.282001	\N	\N	\N	0
132	1	77	[{"id":103,"nome":"Margherita","prezzo":13,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["acciughe","basilico"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Mozzarella","prezzo":1},{"nome":"Patatine Fritte","prezzo":3}]}},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":91,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	910	pagato	\nORDINE #132\n[10/01/2026, 19:19:21] 🆕 ORDINE DA: a\n • Margherita (No: acciughe, basilico) (+: Bufala, Mozzarella, Patatine Fritte) - 13.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Pasta - 1.00€\nTOTALE PARZIALE: 910.00€\n----------------------------------\n\n[10/01/2026, 20:14:19] 💰 CHIUSO E PAGATO: 910.00€	2026-01-10 18:19:21.778867	a	\N	10/01/2026, 19:19:21	0
135	1	2	[{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"20:25","chiuso_da_cassa":true},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"20:25","chiuso_da_cassa":true}]	888	pagato	\nORDINE #135\n[10/01/2026, 20:25:20] 🆕 ORDINE DA: Cliente (Prova 22)\n • dfergdh - 444.00€\n • dfergdh - 444.00€\nTOTALE PARZIALE: 888.00€\n----------------------------------\n\n[10/01/2026, 20:25:40] [CASSA 💶] ✅ FATTO DALLA CASSA: dfergdh\n[10/01/2026, 20:25:41] [CASSA 💶] ✅ FATTO DALLA CASSA: dfergdh\n[10/01/2026, 20:25:44] 💰 CHIUSO E PAGATO: 888.00€	2026-01-10 19:25:20.837813	\N	\N	10/01/2026, 20:25:20	0
22	1	Banco	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767774002897_1","stato":"servito","ora_servizio":"09:20"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767774002897_2","stato":"servito","ora_servizio":"09:20"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767774002897_3","stato":"servito","ora_servizio":"09:21"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767774002897_4","stato":"in_attesa"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774002897_5","stato":"in_attesa"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774002897_6","stato":"in_attesa"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774002897_7","stato":"in_attesa"}]	9	pagato	[07/01/2026, 09:20:02] Ordine creato: 8 elementi. Tot: 10€\n[07/01/2026, 09:20:18] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti\n[07/01/2026, 09:20:19] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti\n[07/01/2026, 09:20:21] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti\n[07/01/2026, 09:21:01] Mare e Monti segnato come IN_ATTESA\n[07/01/2026, 09:21:07] Mare e Monti segnato come SERVITO\n[07/01/2026, 09:21:18] ELIMINATO: Mare e Monti (1.00€). Nuovo Totale: 9.00€\n[07/01/2026, 09:21:21] prova22 segnato come SERVITO\n[07/01/2026, 09:21:28] CONTO CHIUSO E PAGATO.	2026-01-07 08:20:02.982622	\N	\N	\N	0
97	1	Banco	[{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":1,"course":4,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[]}},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"}]	180	pagato	\nORDINE #97\n[09/01/2026, 16:28:49] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\nTOTALE PARZIALE: 180.00€\n----------------------------------\n\n[1/9/2026, 4:28:59 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:29:04 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 4:29:10 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:29:13 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 4:29:23 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:29:26 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 4:29:28 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:29:34 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\nCHIUSO: 180€	2026-01-09 16:28:49.481133	\N	\N	\N	0
136	1	2	[{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":83,"nome":"deqwfre","prezzo":14,"course":4,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8},{"nome":"Maiale","prezzo":5}]}},{"id":83,"nome":"deqwfre","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":83,"nome":"deqwfre","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	19	pagato	\nORDINE #136\n[10/01/2026, 20:26:58] 🆕 ORDINE DA: Cliente (Giovanni )\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • deqwfre (+: Sanbuca, Maiale) - 14.00€\n • deqwfre - 1.00€\n • deqwfre - 1.00€\nTOTALE PARZIALE: 19.00€\n----------------------------------\n\n[10/01/2026, 20:27:22] 💰 CHIUSO E PAGATO: 19.00€	2026-01-10 19:26:59.04152	\N	\N	10/01/2026, 20:26:58	0
137	1	2	[{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	2	pagato	\nORDINE #137\n[10/01/2026, 20:40:40] 🆕 ORDINE DA: Cliente (Giovanni )\n • Al sugo - 1.00€\n • Al sugo - 1.00€\nTOTALE PARZIALE: 2.00€\n----------------------------------\n\n[10/01/2026, 20:40:59] 💰 CHIUSO E PAGATO: 2.00€	2026-01-10 19:40:40.635831	\N	8	10/01/2026, 20:40:40	0
24	1	Banco	[{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775309570_0","stato":"servito","ora_servizio":"09:41"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775309570_1","stato":"servito","ora_servizio":"09:42"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767775309570_3","stato":"servito","ora_servizio":"09:42"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767775309570_4","stato":"servito","ora_servizio":"09:42"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767775309570_5","stato":"in_attesa"}]	60	pagato	[07/01/2026, 09:41:49] Ordine creato: 6 elementi. Tot: 66€\n[07/01/2026, 09:41:57] [CASSA 💶] HA SEGNATO SERVITO: prova22\n[07/01/2026, 09:42:08] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[07/01/2026, 09:42:12] [CUCINA 👨‍🍳] HA SERVITO: prova22\n[07/01/2026, 09:42:15] [CUCINA 👨‍🍳] HA SERVITO: Margherita\n[07/01/2026, 09:42:19] [CASSA 💶] HA SEGNATO SERVITO: Chianti\n[07/01/2026, 09:42:21] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[07/01/2026, 09:42:25] [CASSA 💶] HA ELIMINATO: Margherita (6.00€). Nuovo Totale: 60.00€\n[07/01/2026, 09:42:32] CONTO CHIUSO E PAGATO.	2026-01-07 08:41:49.617137	\N	\N	\N	0
23	1	Banco	[{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774994192_0","stato":"servito","ora_servizio":"09:37"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774994192_1","stato":"servito","ora_servizio":"09:36"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774994192_2","stato":"servito","ora_servizio":"09:37"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774994192_3","stato":"servito","ora_servizio":"09:37"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774994192_4","stato":"servito","ora_servizio":"09:37"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774994192_5","stato":"servito","ora_servizio":"09:37"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767774994192_6","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767774994192_7","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767774994192_8","stato":"in_attesa"}]	28	pagato	[07/01/2026, 09:36:34] Ordine creato: 9 elementi. Tot: 28€\n[07/01/2026, 09:37:02] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 09:37:02] [CASSA 💶] HA SEGNATO IN ATTESA: Al sugo\n[07/01/2026, 09:37:02] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 09:37:03] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 09:37:04] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 09:37:06] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 09:37:18] [CUCINA 👨‍🍳] HA SERVITO: Carbonara\n[07/01/2026, 09:37:20] [CUCINA 👨‍🍳] HA SERVITO: Carbonara\n[07/01/2026, 09:37:21] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[07/01/2026, 09:37:40] [CASSA 💶] HA SEGNATO IN ATTESA: Carbonara\n[07/01/2026, 09:37:42] [CASSA 💶] HA SEGNATO SERVITO: Carbonara\n[07/01/2026, 09:39:52] CONTO CHIUSO E PAGATO.	2026-01-07 08:36:34.238738	\N	\N	\N	0
98	1	Banco	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	28	pagato	\nORDINE #98\n[09/01/2026, 16:29:51] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 7.00€\nTOTALE PARZIALE: 7.00€\n----------------------------------\n\nORDINE #99\n[09/01/2026, 16:30:06] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 28.00€\n----------------------------------\n\n[1/9/2026, 4:30:28 PM] [CASSA 💶] HA ELIMINATO: Margherita (7.00€). Nuovo Totale: 21.00€\n[1/9/2026, 4:30:32 PM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[1/9/2026, 4:30:37 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\nCHIUSO: 28€	2026-01-09 16:29:51.737616	\N	\N	\N	0
63	1	38	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767809335400_0","stato":"servito","ora_servizio":"19:09"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":1,"uniqId":"new_1767809335400_1","stato":"servito","ora_servizio":"19:10"},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767809335400_2","stato":"in_attesa"},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767809335400_3","stato":"in_attesa"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767809335400_4","stato":"servito","ora_servizio":"19:09"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767809335400_5","stato":"servito","ora_servizio":"19:09"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767809335400_6","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":1,"uniqId":"new_1767809335400_7","stato":"servito","ora_servizio":"19:09"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767809335400_8","stato":"in_attesa"}]	31	pagato	\n--- ORDINE PARZIALE #63 ---\n[07/01/2026, 19:08:55] Ordine creato: 9 elementi. Tot: 31€\n[07/01/2026, 19:09:35] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x1)\n[07/01/2026, 19:09:41] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[07/01/2026, 19:09:50] [BAR 🍹] HA SERVITO: 2x Brasilena\n[07/01/2026, 19:10:07] [PIZZERIA 🍕] HA SFORNATO: Scilatelle (x1)\n\n================================\n[07/01/2026, 19:29:04] 💰 TAVOLO CHIUSO. TOTALE: 31.00€	2026-01-07 18:08:55.447047	\N	\N	\N	0
138	1	2	[{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":83,"nome":"deqwfre","prezzo":6.5,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Crudo","prezzo":3.5}]}},{"id":103,"nome":"Margherita","prezzo":12,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["basilico","acciughe"],"aggiunte":[{"nome":"Basilico","prezzo":1},{"nome":"Mozzarella","prezzo":1},{"nome":"Patatine Fritte","prezzo":3}]}}]	20.5	pagato	\nORDINE #138\n[10/01/2026, 20:52:54] 🆕 ORDINE DA: Cliente (Giovanni )\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • deqwfre (+: Bufala, Crudo) - 6.50€\n • Margherita (No: basilico, acciughe) (+: Basilico, Mozzarella, Patatine Fritte) - 12.00€\nTOTALE PARZIALE: 20.50€\n----------------------------------\n\n[10/01/2026, 20:53:20] 💰 CHIUSO E PAGATO: 20.50€	2026-01-10 19:52:55.055868	\N	8	\N	0
198	1	11	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:36"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:36"}]	6	pagato	\nORDINE #198\n[15/01/2026, 02:35:58] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 02:36:10] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:36:10] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:36:22] 💰 CHIUSO E PAGATO: 6.00€	2026-01-15 01:35:59.062107	Francesco	4	\N	0
25	1	Banco	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767775691275_0","stato":"servito","ora_servizio":"09:50"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767775691275_1","stato":"servito","ora_servizio":"09:50"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767775691275_2","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767775691275_5","stato":"servito","ora_servizio":"09:48"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767775691275_6","stato":"servito","ora_servizio":"09:48"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775691275_7","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775691275_8","stato":"servito","ora_servizio":"09:48"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767775691275_9","stato":"servito","ora_servizio":"09:50"}]	61	pagato	[07/01/2026, 09:48:11] Ordine creato: 10 elementi. Tot: 87€\n[07/01/2026, 09:48:20] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[07/01/2026, 09:48:25] [CUCINA 👨‍🍳] HA SERVITO: Margherita\n[07/01/2026, 09:48:26] [CUCINA 👨‍🍳] HA SERVITO: Margherita\n[07/01/2026, 09:48:29] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti\n[07/01/2026, 09:48:31] [CUCINA 👨‍🍳] HA RIMESSO IN ATTESA: Margherita\n[07/01/2026, 09:50:43] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[07/01/2026, 09:50:44] [CASSA 💶] HA SEGNATO SERVITO: Chardonnay\n[07/01/2026, 09:50:45] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[07/01/2026, 09:50:47] [CASSA 💶] HA ELIMINATO: Margherita (6.00€). Nuovo Totale: 81.00€\n[07/01/2026, 09:50:51] [CASSA 💶] HA ELIMINATO: Chardonnay (20.00€). Nuovo Totale: 61.00€\n[07/01/2026, 09:51:02] CONTO CHIUSO E PAGATO.	2026-01-07 08:48:11.321843	\N	\N	\N	0
139	1	2	[{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	890	pagato	\nORDINE #139\n[10/01/2026, 20:54:42] 🆕 ORDINE DA: Cliente (Paksh)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\nTOTALE PARZIALE: 890.00€\n----------------------------------\n\n[10/01/2026, 20:55:04] 💰 CHIUSO E PAGATO: 890.00€	2026-01-10 19:54:42.353675	\N	9	\N	0
140	1	2	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	14	pagato	\nORDINE #140\n[10/01/2026, 21:04:01] 🆕 ORDINE DA: Cliente (Paksh)\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 14.00€\n----------------------------------\n\n[10/01/2026, 21:04:14] 💰 CHIUSO E PAGATO: 14.00€	2026-01-10 20:04:02.398562	\N	9	\N	0
68	1	37	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":1},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"is_pizzeria":true,"course":2},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"carbonara","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":3},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:10"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:10"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:10"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:10"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:10"}]	85	pagato	\nORDINE #68\n\n[1/9/2026, 12:10:33 AM] [BAR 🍹] HA SERVITO: 2x Chianti\n[1/9/2026, 12:10:34 AM] [BAR 🍹] HA SERVITO: 2x Acqua\n[1/9/2026, 12:10:36 AM] [BAR 🍹] HA SERVITO: Brasilena\nCHIUSO: 85€	2026-01-08 13:39:34.402535	\N	\N	\N	0
64	1	37	[{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767809573306_0","stato":"servito","ora_servizio":"19:13"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767809573306_1","stato":"servito","ora_servizio":"19:13"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767809604571_0","stato":"servito","ora_servizio":"19:13"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767809604571_1","stato":"servito","ora_servizio":"19:13"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767809604571_2","stato":"servito","ora_servizio":"19:13"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767809660526_0","stato":"servito","ora_servizio":"19:14"}]	14	pagato	\n--- ORDINE PARZIALE #64 ---\n[07/01/2026, 19:12:53] Ordine creato: 2 elementi. Tot: 6€\n[07/01/2026, 19:13:01] [BAR 🍹] HA SERVITO: 2x Brasilena\n\n--- ORDINE PARZIALE #65 ---\n[07/01/2026, 19:13:24] Ordine creato: 3 elementi. Tot: 3€\n[07/01/2026, 19:13:37] [BAR 🍹] HA SERVITO: 3x Acqua\n\n--- ORDINE PARZIALE #66 ---\n[07/01/2026, 19:14:20] Ordine creato: 1 elementi. Tot: 5€\n[07/01/2026, 19:14:40] [BAR 🍹] HA SERVITO: Cocacola\n\n================================\n[07/01/2026, 19:14:54] 💰 TAVOLO CHIUSO. TOTALE: 14.00€	2026-01-07 18:12:53.352436	\N	\N	\N	0
165	1	Banco	[{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","chiuso_da_cassa":true,"riaperto":true,"ora_servizio":"00:00"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:56","chiuso_da_cassa":true},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":285,"nome":"Prova","prezzo":14,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["pomodoro","Basilico"],"aggiunte":[{"nome":"Bufala","prezzo":2}]}},{"id":207,"nome":"Supplì","prezzo":"4.50","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":207,"nome":"Supplì","prezzo":"4.50","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":209,"nome":"Polpette di carne","prezzo":"3.50","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":218,"nome":"Pallottole fumanti","prezzo":5,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["Patate"],"aggiunte":[]}},{"id":235,"nome":"Fiorentina","prezzo":"5.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:57","chiuso_da_cassa":true},{"id":234,"nome":"Costata","prezzo":"5.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":284,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"00:00","chiuso_da_cassa":true},{"id":284,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"00:01","chiuso_da_cassa":true},{"id":284,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"}]	135.5	pagato	\nORDINE #165\n[14/01/2026, 23:57:10] 🆕 ORDINE DA: Cliente (a)\n • Nachos - 5.00€\n • Nachos - 5.00€\nTOTALE PARZIALE: 10.00€\n----------------------------------\n\nORDINE #164\n[14/01/2026, 23:55:31] 🆕 ORDINE DA: Cliente (a)\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Prova (No: pomodoro, Basilico) (+: Bufala) - 14.00€\n • Supplì - 4.50€\n • Supplì - 4.50€\n • Polpette di carne - 3.50€\n • Pallottole fumanti (No: Patate) - 5.00€\n • Fiorentina - 5.00€\n • Costata - 5.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 125.50€\n----------------------------------\n\n[14/01/2026, 23:56:22] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[14/01/2026, 23:56:23] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[14/01/2026, 23:57:28] [CASSA 💶] ✅ FATTO: Fiorentina\n[15/01/2026, 00:00:31] [CASSA 💶] ⚠️ RIAPERTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 00:00:38] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 00:00:58] [CASSA 💶] ✅ FATTO: Chianti\n[15/01/2026, 00:01:00] [CASSA 💶] ✅ FATTO: Chianti\n[15/01/2026, 00:01:07] 💰 CHIUSO E PAGATO: 135.50€	2026-01-14 22:57:11.485637	\N	11	14/01/2026, 23:57:10	0
67	1	Banco	[{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767822448795_0","stato":"in_attesa"},{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"dfergdh","prezzo":"444.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"deqwfre","prezzo":"1.00","categoria":"1","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2}]	611	pagato	\nORDINE #67\n[07/01/2026, 22:47:28] Ordine creato: 1 elementi. Tot: 1€\nCHIUSO: 611€	2026-01-07 21:47:29.744936	\N	\N	\N	0
70	1	Banco	[{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"stato":"servito","ora_servizio":"01:12"},{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"stato":"servito","ora_servizio":"01:12"},{"nome":"dfergdh","prezzo":"444.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"dfergdh","prezzo":"444.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2}]	988	pagato	\nORDINE #70\n\n[1/9/2026, 12:12:04 AM] [CUCINA 👨‍🍳] HA SERVITO: dfgbvn (x2)\nCHIUSO: 988€	2026-01-09 00:11:41.615341	\N	\N	\N	0
196	1	44	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:36","chiuso_da_cassa":true},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:36","chiuso_da_cassa":true}]	6	pagato	\nORDINE #196\n[15/01/2026, 02:32:17] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 02:36:16] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:36:17] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:36:28] 💰 CHIUSO E PAGATO: 6.00€	2026-01-15 01:32:17.730797	Francesco	4	\N	0
197	1	25	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:36","chiuso_da_cassa":true},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:36","chiuso_da_cassa":true}]	6	pagato	\nORDINE #197\n[15/01/2026, 02:32:28] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 02:36:14] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:36:18] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:36:25] 💰 CHIUSO E PAGATO: 6.00€	2026-01-15 01:32:28.118386	Francesco	4	\N	0
71	1	Banco	[{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"stato":"servito","ora_servizio":"01:18"},{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"r34t3567uyi","prezzo":"66.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"r34t3567uyi","prezzo":"66.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":7,"is_bar":false,"is_pizzeria":true,"course":1,"stato":"servito","ora_servizio":"01:18"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":7,"is_bar":false,"is_pizzeria":true,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":7,"is_bar":false,"is_pizzeria":true,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":8,"is_bar":false,"is_pizzeria":false,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":8,"is_bar":false,"is_pizzeria":false,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":9,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:18"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":9,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:18"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":9,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:18"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":9,"is_bar":true,"is_pizzeria":false,"course":0,"stato":"servito","ora_servizio":"01:18"},{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"dfgbvn","prezzo":"1.00","categoria":"4","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":2,"stato":"servito","ora_servizio":"01:18"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"stato":"servito","ora_servizio":"02:01"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"is_pizzeria":false,"course":1,"stato":"servito","ora_servizio":"02:01"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:01"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:01"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:01"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita (No mozzarella, basilico / +Bufala, +Basilico, +Patatine Fritte)","prezzo":13,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita (No basilico, acciughe / +Bufala)","prezzo":9,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	455	pagato	\nORDINE #71\n\n[1/9/2026, 12:18:07 AM] [CUCINA 👨‍🍳] HA SERVITO: dfgbvn (x1)\n[1/9/2026, 12:18:09 AM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[1/9/2026, 12:18:20 AM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x2)\n[1/9/2026, 12:18:23 AM] [CUCINA 👨‍🍳] HA SERVITO: r34t3567uyi (x2)\n[1/9/2026, 12:18:23 AM] [CUCINA 👨‍🍳] HA SERVITO: dfgbvn (x2)\n[1/9/2026, 12:18:24 AM] [CUCINA 👨‍🍳] HA SERVITO: r34t3567uyi (x2)\n[1/9/2026, 12:18:24 AM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n[1/9/2026, 12:18:33 AM] [BAR 🍹] HA SERVITO: 3x Chardonnay\nORDINE #72\n\n[1/9/2026, 12:18:56 AM] [BAR 🍹] HA SERVITO: Chardonnay\n[1/9/2026, 12:18:58 AM] [CUCINA 👨‍🍳] HA SERVITO: dfgbvn (x2)\nORDINE #73\n\n[1/9/2026, 1:01:34 AM] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x2)\nORDINE #74\n\n[1/9/2026, 1:01:35 AM] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x3)\nCHIUSO: 455€	2026-01-09 00:17:55.255574	\N	\N	\N	0
28	1	Banco	[{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778716933_0","stato":"servito","ora_servizio":"10:39"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778716933_1","stato":"servito","ora_servizio":"10:38"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778716933_2","stato":"servito","ora_servizio":"10:38"},{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778716933_3","stato":"servito","ora_servizio":"10:39"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778716933_4","stato":"servito","ora_servizio":"10:39"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778716933_5","stato":"servito","ora_servizio":"10:39"},{"nome":"amatriciana","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778716933_7","stato":"in_attesa"}]	7	pagato	[07/01/2026, 10:38:36] Ordine creato: 8 elementi. Tot: 8€\n[07/01/2026, 10:38:58] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 10:38:59] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 10:38:59] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 10:39:00] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 10:39:01] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[07/01/2026, 10:39:02] [CASSA 💶] HA SEGNATO SERVITO: Pasta\n[07/01/2026, 10:39:03] [CASSA 💶] HA SEGNATO SERVITO: Pasta\n[07/01/2026, 10:39:05] [CASSA 💶] HA ELIMINATO: Pasta (1.00€). Nuovo Totale: 7.00€\n[07/01/2026, 10:40:17] CONTO CHIUSO E PAGATO.	2026-01-07 09:38:36.97998	\N	\N	\N	0
122	1	544534	[{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"12:56"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":83,"nome":"deqwfre","prezzo":14,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8},{"nome":"Maiale","prezzo":5}]}},{"id":103,"nome":"Margherita","prezzo":13,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["acciughe","basilico"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Basilico","prezzo":1},{"nome":"Patatine Fritte","prezzo":3}]}}]	35	pagato	\nORDINE #122\n[10/01/2026, 12:55:17] 🆕 ORDINE DA: franco\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • deqwfre (+: Sanbuca, Maiale) - 14.00€\n • Margherita (No: basilico, acciughe) (+: Bufala, Basilico, Patatine Fritte) - 13.00€\nTOTALE PARZIALE: 35.00€\n----------------------------------\n\n[10/01/2026, 12:55:27] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[10/01/2026, 12:55:28] [CASSA 💶] HA SEGNATO IN ATTESA: Scilatelle\n[10/01/2026, 12:55:58] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[10/01/2026, 12:56:03] [CASSA 💶] HA SEGNATO IN ATTESA: Scilatelle\n[10/01/2026, 12:56:31] [PIZZERIA 🍕] HA SFORNATO: Scilatelle (x2)\n[10/01/2026, 12:56:37] [CASSA 💶] HA SEGNATO IN ATTESA: Scilatelle\n[10/01/2026, 12:56:44] 💰 CHIUSO E PAGATO: 35.00€	2026-01-10 11:55:17.936541	franco	\N	\N	0
142	1	38	[{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"21:43"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"21:43"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"22:44","chiuso_da_cassa":true},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"21:48"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"chiuso_da_cassa":true,"ora_servizio":"21:47"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"22:45","chiuso_da_cassa":true},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"21:48"}]	515	pagato	\nORDINE #142\n[10/01/2026, 22:43:11] 🆕 ORDINE DA: Cliente (Paksh)\n • Chianti - 25.00€\n • Chianti - 25.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\nTOTALE PARZIALE: 52.00€\n----------------------------------\n\n[10/01/2026, 22:43:27] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[10/01/2026, 22:43:28] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\nORDINE #141\n[10/01/2026, 22:42:15] 🆕 ORDINE DA: Cliente (Paksh)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • dfgbvn - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • dfergdh - 444.00€\nTOTALE PARZIALE: 463.00€\n----------------------------------\n\n[10/01/2026, 22:43:27] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[10/01/2026, 22:43:28] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[10/01/2026, 22:43:28] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[10/01/2026, 22:43:28] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[10/01/2026, 22:43:36] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 22:43:41] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 22:43:47] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 22:43:55] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 22:44:54] [CASSA 💶] ✅ FATTO DALLA CASSA: Al sugo\n[10/01/2026, 22:45:07] [CASSA 💶] ✅ FATTO DALLA CASSA: Al sugo\n[10/01/2026, 22:45:13] [CASSA 💶] ✅ FATTO DALLA CASSA: Al sugo\n[10/01/2026, 22:45:25] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 22:47:34] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[10/01/2026, 22:47:34] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[10/01/2026, 22:48:00] [CUCINA 👨‍🍳] HA SERVITO: dfergdh\n[10/01/2026, 22:48:08] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 22:48:51] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[10/01/2026, 23:24:16] 💰 CHIUSO E PAGATO: 515.00€	2026-01-10 21:43:11.484189	\N	9	\N	0
30	1	Banco	[{"nome":"Al sugo","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778916199_0","stato":"in_attesa"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767778924171_0","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767778931708_0","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767779834215_0","stato":"in_attesa"},{"nome":"Mare e Monti","prezzo":"1.00","categoria":"Antipasti","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767779834215_1","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767779840865_0","stato":"in_attesa"}]	14	pagato	[07/01/2026, 10:41:56] Ordine creato: 1 elementi. Tot: 1€\n[07/01/2026, 10:42:04] Ordine creato: 1 elementi. Tot: 4€\n[07/01/2026, 10:42:11] Ordine creato: 1 elementi. Tot: 1€\n[07/01/2026, 10:57:14] Ordine creato: 2 elementi. Tot: 2€\n[07/01/2026, 10:57:20] Ordine creato: 1 elementi. Tot: 6€\n\n[07/01/2026, 10:57:45] 💰 CONTO CHIUSO E UNIFICATO.	2026-01-07 09:41:56.246193	\N	\N	\N	0
35	1	Banco	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767781170301_0","stato":"servito","ora_servizio":"11:19"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767781170301_1","stato":"servito","ora_servizio":"11:20"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767781170301_2","stato":"servito","ora_servizio":"11:20"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767781178314_0","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767781185220_1","stato":"in_attesa"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767781185220_2","stato":"in_attesa"}]	22	pagato	[07/01/2026, 11:19:30] Ordine creato: 3 elementi. Tot: 18€\n[07/01/2026, 11:19:57] [CUCINA 👨‍🍳] HA SERVITO: Margherita\n[07/01/2026, 11:20:03] [CUCINA 👨‍🍳] HA SERVITO: Margherita\n[07/01/2026, 11:20:06] [CUCINA 👨‍🍳] HA SERVITO: Margherita\n[07/01/2026, 11:19:38] Ordine creato: 1 elementi. Tot: 2€\n[07/01/2026, 11:19:45] Ordine creato: 3 elementi. Tot: 3€\n[07/01/2026, 11:20:16] [CASSA 💶] HA ELIMINATO: Pasta (1.00€). Nuovo Totale: 2.00€\n\n[07/01/2026, 11:20:28] 💰 CONTO CHIUSO E UNIFICATO.	2026-01-07 10:19:30.453269	\N	\N	\N	0
100	1	Banco	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:15"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"18:06"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"17:56"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"18:15"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:45"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:02"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:02"},{"id":84,"nome":"edfwre (+Bufala, +Crudo)","prezzo":6.5,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Crudo","prezzo":3.5}]}},{"id":100,"nome":"dfgbvn (+granbiscotto)","prezzo":4,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"granbiscotto","prezzo":3}]}}]	101.5	pagato	\nORDINE #100\n[09/01/2026, 16:42:53] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\nTOTALE PARZIALE: 91.00€\n----------------------------------\n\n[1/9/2026, 4:43:07 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:43:10 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 4:43:17 PM] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x4)\n[1/9/2026, 4:43:20 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 4:43:51 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:43:56 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 4:56:32 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 4:56:34 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:56:37 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 4:56:46 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:56:50 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[1/9/2026, 4:56:55 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 5:06:10 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 5:06:13 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Mare e Monti\n[1/9/2026, 5:06:25 PM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[1/9/2026, 5:06:29 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[1/9/2026, 5:06:32 PM] [CASSA 💶] HA SEGNATO SERVITO: Mare e Monti\n[09/01/2026, 18:15:09] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[09/01/2026, 18:15:11] [CASSA 💶] HA SEGNATO SERVITO: Al ragù\n[10/01/2026, 01:02:02] [BAR 🍹] HA SERVITO: 3x Chardonnay\n[10/01/2026, 02:45:09] [CASSA 💶] HA SEGNATO IN ATTESA: Chardonnay\n[10/01/2026, 02:45:12] [CASSA 💶] HA SEGNATO SERVITO: Chardonnay\nORDINE #104\n[09/01/2026, 19:17:44] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • edfwre (+Bufala, +Crudo) (+: Bufala, Crudo) - 6.50€\n • dfgbvn (+granbiscotto) (+: granbiscotto) - 4.00€\nTOTALE PARZIALE: 10.50€\n----------------------------------\n\n[10/01/2026, 01:37:41] [PIZZERIA 🍕] HA SFORNATO: edfwre (+Bufala, +Crudo) (x1)\n[10/01/2026, 02:45:02] [CASSA 💶] HA SEGNATO IN ATTESA: edfwre (+Bufala, +Crudo)\n[10/01/2026, 02:45:41] 💰 CHIUSO E PAGATO: 101.50€	2026-01-09 16:42:53.78106	\N	\N	\N	0
199	1	11	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"02:46","chiuso_da_cassa":true},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:45"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:45"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:45"},{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:45"},{"id":209,"nome":"Polpette di carne","prezzo":"3.50","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:51","chiuso_da_cassa":true},{"id":207,"nome":"Supplì","prezzo":"4.50","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:45"},{"id":212,"nome":"Patatine Twister","prezzo":"3.50","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:51","chiuso_da_cassa":true},{"id":210,"nome":"Olive all’Ascolana","prezzo":"3.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:51","chiuso_da_cassa":true},{"id":211,"nome":"Mozzarelline Stick","prezzo":"3.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:51","chiuso_da_cassa":true},{"id":285,"nome":"Prova","prezzo":14,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2}]},"ora_servizio":"12:52","chiuso_da_cassa":true}]	55.5	pagato	\nORDINE #199\n[15/01/2026, 02:44:57] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 12.00€\n----------------------------------\n\n[15/01/2026, 02:45:08] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:45:08] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:45:09] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:45:09] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:45:55] [CASSA 💶] ⚠️ RIAPERTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:46:07] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\nORDINE #200\n[15/01/2026, 02:45:24] 🆕 ORDINE DA: Francesco\n • Prova - 12.00€\n • Polpette di carne - 3.50€\n • Supplì - 4.50€\n • Patatine Twister - 3.50€\n • Olive all’Ascolana - 3.00€\n • Mozzarelline Stick - 3.00€\nTOTALE PARZIALE: 29.50€\n----------------------------------\n\n[15/01/2026, 02:45:32] [CUCINA 👨‍🍳] HA SERVITO: Prova\n[15/01/2026, 02:45:33] [CUCINA 👨‍🍳] HA SERVITO: Supplì\n[15/01/2026, 12:51:40] [CASSA 💶] ✅ FATTO: Polpette di carne\n[15/01/2026, 12:51:44] [CASSA 💶] ✅ FATTO: Patatine Twister\n[15/01/2026, 12:51:45] [CASSA 💶] ✅ FATTO: Olive all’Ascolana\n[15/01/2026, 12:51:48] [CASSA 💶] ✅ FATTO: Mozzarelline Stick\nORDINE #201\n[15/01/2026, 12:52:38] 🆕 ORDINE DA: Francesco\n • Prova (No: pomodoro) (+: Bufala) - 14.00€\nTOTALE PARZIALE: 14.00€\n----------------------------------\n\n[15/01/2026, 12:52:46] [CASSA 💶] ✅ FATTO: Prova\n[15/01/2026, 13:00:48] 💰 CHIUSO E PAGATO: 55.50€	2026-01-15 01:44:58.102594	Francesco	4	\N	0
204	1	147	[{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":285,"nome":"Prova","prezzo":14,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["Basilico","pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2}]}},{"id":209,"nome":"Polpette di carne","prezzo":"3.50","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":218,"nome":"Pallottole fumanti","prezzo":"5.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":454,"nome":"Birra Artigianale","prezzo":"6.50","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":454,"nome":"Birra Artigianale","prezzo":"6.50","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":457,"nome":"Amaro della Casa","prezzo":"3.50","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":457,"nome":"Amaro della Casa","prezzo":"3.50","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":466,"nome":"Pinot Grigio","prezzo":"19.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":466,"nome":"Pinot Grigio","prezzo":"19.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":458,"nome":"Tiramisù","prezzo":"5.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":458,"nome":"Tiramisù","prezzo":"5.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":394,"nome":"4 Formaggi","prezzo":"9.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":394,"nome":"4 Formaggi","prezzo":"9.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":385,"nome":"Margherita","prezzo":"6.50","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":413,"nome":"Pulled Pork","prezzo":"12.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":413,"nome":"Pulled Pork","prezzo":"12.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	163	in_attesa	[20/01/2026, 18:05:46] 🆕 ORDINE DA: Francesco\n • Prova - 12.00€\n • Prova - 12.00€\n • Prova (No: Basilico, pomodoro) (+: Bufala) - 14.00€\n • Polpette di carne - 3.50€\n • Pallottole fumanti - 5.00€\n • Birra Artigianale - 6.50€\n • Birra Artigianale - 6.50€\n • Amaro della Casa - 3.50€\n • Amaro della Casa - 3.50€\n • Pinot Grigio - 19.00€\n • Pinot Grigio - 19.00€\n • Tiramisù - 5.00€\n • Tiramisù - 5.00€\n • 4 Formaggi - 9.00€\n • 4 Formaggi - 9.00€\n • Margherita - 6.50€\n • Pulled Pork - 12.00€\n • Pulled Pork - 12.00€\nTOTALE PARZIALE: 163.00€\n----------------------------------\n	2026-01-20 17:05:46.912785	Francesco	4	\N	0
101	1	147	[{"id":88,"nome":"Al ragù","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"18:08"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"18:08"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:08"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:08"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:08"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:08"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:08"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:08"},{"id":103,"nome":"Margherita (+Bufala)","prezzo":9,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Bufala","prezzo":2}]},"ora_servizio":"18:08"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:09"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:08"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"18:08"},{"id":103,"nome":"Margherita (No basilico / +Bufala, +Basilico)","prezzo":10,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":["basilico"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Basilico","prezzo":1}]},"ora_servizio":"18:08"}]	79	pagato	\nORDINE #101\n[09/01/2026, 17:07:12] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Margherita - 7.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 41.00€\n----------------------------------\n\n[1/9/2026, 5:08:47 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x6)\n[1/9/2026, 5:08:53 PM] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\nORDINE #103\n[09/01/2026, 17:08:04] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita (+Bufala) (+: Bufala) - 9.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\n[1/9/2026, 5:08:47 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (+Bufala) (x1)\nORDINE #102\n[09/01/2026, 17:07:33] 🆕 NUOVO ORDINE (Cliente: Ospite)\n • Margherita - 6.00€\n • Margherita - 6.00€\n • Margherita - 7.00€\n • Margherita (No basilico / +Bufala, +Basilico) (No: basilico) (+: Bufala, Basilico) - 10.00€\nTOTALE PARZIALE: 29.00€\n----------------------------------\n\n[1/9/2026, 5:08:46 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (No basilico / +Bufala, +Basilico) (x1)\n[1/9/2026, 5:08:47 PM] [PIZZERIA 🍕] HA SFORNATO: Margherita (x3)\n[1/9/2026, 5:09:09 PM] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[1/9/2026, 5:09:20 PM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\nCHIUSO: 79€	2026-01-09 17:07:12.204561	\N	\N	\N	0
205	1	14	[{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	12	in_attesa	[20/01/2026, 18:18:04] 🆕 ORDINE DA: Francesco\n • Prova - 12.00€\nTOTALE PARZIALE: 12.00€\n----------------------------------\n	2026-01-20 17:18:05.001386	Francesco	4	\N	0
45	1	Banco	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767786119627_0","stato":"servito","ora_servizio":"14:31"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"uniqId":"new_1767786119627_1","stato":"servito","ora_servizio":"14:33"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767786119627_2","stato":"servito","ora_servizio":"15:02"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767786119627_3","stato":"servito","ora_servizio":"15:02"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"uniqId":"new_1767786119627_4","stato":"servito","ora_servizio":"14:33"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767786119627_5","stato":"servito","ora_servizio":"15:02"},{"nome":"Pasta","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767786119627_6","stato":"servito","ora_servizio":"15:02"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767786119627_7","stato":"servito","ora_servizio":"15:02"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"uniqId":"new_1767786119627_8","stato":"servito","ora_servizio":"15:02"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767786119627_9","stato":"servito","ora_servizio":"13:25"},{"nome":"Chianti","prezzo":"25.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"uniqId":"new_1767786119627_10","stato":"servito","ora_servizio":"13:25"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":1,"uniqId":"new_1767792722958_0","stato":"servito","ora_servizio":"14:36"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767792722958_1","stato":"servito","ora_servizio":"15:00"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767792722958_2","stato":"servito","ora_servizio":"15:02"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767792722958_3","stato":"servito","ora_servizio":"15:02"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767792722958_4","stato":"servito","ora_servizio":"14:35"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767792722958_5","stato":"servito","ora_servizio":"14:35"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767794520452_0","stato":"servito","ora_servizio":"15:02"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767794520452_1","stato":"servito","ora_servizio":"15:02"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":3,"uniqId":"new_1767794520452_2","stato":"servito","ora_servizio":"15:21"},{"nome":"Cocacola","prezzo":"5.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767794520452_3","stato":"servito","ora_servizio":"15:22"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":0,"uniqId":"new_1767794520452_4","stato":"servito","ora_servizio":"15:03"}]	121	pagato	\n--- ORDINE PARZIALE #45 ---\n[07/01/2026, 12:41:59] Ordine creato: 11 elementi. Tot: 79€\n[07/01/2026, 13:25:22] [BAR 🍹] HA SERVITO: 2x Chianti\n[07/01/2026, 14:03:43] [CASSA 💶] HA SEGNATO SERVITO: Al ragù\n[07/01/2026, 14:03:44] [CASSA 💶] HA SEGNATO IN ATTESA: Al ragù\n[07/01/2026, 14:31:08] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[07/01/2026, 14:33:09] [CUCINA 👨‍🍳] HA SERVITO: Margherita alle 14:33\n[07/01/2026, 14:33:12] [CUCINA 👨‍🍳] HA SERVITO: prova22 alle 14:33\n[07/01/2026, 15:02:53] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x2)\n[07/01/2026, 15:02:56] [CUCINA 👨‍🍳] HA SERVITO: Pasta (x2)\n[07/01/2026, 15:02:57] [CUCINA 👨‍🍳] HA SERVITO: Carbonara (x1)\n[07/01/2026, 15:02:58] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x1)\n\n--- ORDINE PARZIALE #46 ---\n[07/01/2026, 14:32:02] Ordine creato: 6 elementi. Tot: 22€\n[07/01/2026, 14:32:36] [PIZZERIA 🍕] HA SFORNATO: 2x Margherita\n[07/01/2026, 14:32:48] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[07/01/2026, 14:32:51] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[07/01/2026, 14:35:44] [CUCINA 👨‍🍳] HA SERVITO: 2x Scilatelle alle 14:35\n[07/01/2026, 14:35:55] [PIZZERIA 🍕] HA SFORNATO: Margherita alle 14:35\n[07/01/2026, 14:36:14] [CASSA 💶] HA SEGNATO IN ATTESA: Margherita\n[07/01/2026, 14:36:33] [PIZZERIA 🍕] HA SFORNATO: Margherita alle 14:36\n[07/01/2026, 15:00:13] [PIZZERIA 🍕] HA SFORNATO: Margherita (x1)\n[07/01/2026, 15:02:58] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n\n--- ORDINE PARZIALE #50 ---\n[07/01/2026, 15:02:00] Ordine creato: 5 elementi. Tot: 20€\n[07/01/2026, 15:02:46] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x1)\n[07/01/2026, 15:02:53] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x1)\n[07/01/2026, 15:03:00] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x1)\n[07/01/2026, 15:03:25] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 15:03:26] [BAR 🍹] HA SERVITO: Brasilena\n[07/01/2026, 15:03:28] [BAR 🍹] HA SERVITO: Cocacola\n[07/01/2026, 15:03:35] [CASSA 💶] HA SEGNATO IN ATTESA: Cocacola\n[07/01/2026, 15:03:37] [CASSA 💶] HA SEGNATO IN ATTESA: Scilatelle\n[07/01/2026, 15:21:50] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x1)\n[07/01/2026, 15:22:56] [BAR 🍹] HA SERVITO: Cocacola\n\n================================\n[07/01/2026, 15:29:07] 💰 TAVOLO CHIUSO. TOTALE: 121.00€	2026-01-07 11:41:59.673905	\N	\N	\N	0
78	1	147	[{"id":103,"nome":"Margherita (No basilico, acciughe / +Bufala, +Mozzarella, +Patatine Fritte)","prezzo":13,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"03:18"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"03:43"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"}]	138	pagato	\nORDINE #78\n\n[1/9/2026, 2:18:59 AM] [PIZZERIA 🍕] HA SFORNATO: Margherita (No basilico, acciughe / +Bufala, +Mozzarella, +Patatine Fritte) (x1)\n[1/9/2026, 2:43:42 AM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\nCHIUSO: 138€	2026-01-09 02:18:02.493803	\N	\N	\N	0
80	1	Banco	[{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"05:21"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":87,"nome":"Margherita","prezzo":"6.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"03:48"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":7,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	670	pagato	\nORDINE #79\n\n[1/9/2026, 2:48:19 AM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\n[1/9/2026, 2:48:27 AM] [CASSA 💶] HA ELIMINATO: Margherita (+Bufala) (9€). Nuovo Totale: 32.00€\n[1/9/2026, 2:48:30 AM] [CASSA 💶] HA ELIMINATO: Margherita (7.00€). Nuovo Totale: 25.00€\n[1/9/2026, 3:09:44 AM] [CASSA 💶] HA ELIMINATO: Margherita (7.00€). Nuovo Totale: 18.00€\n[1/9/2026, 4:21:36 AM] [CASSA 💶] HA SEGNATO SERVITO: Margherita\nCHIUSO: 670€	2026-01-09 02:47:11.353573	\N	\N	\N	0
202	1	Banco	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","chiuso_da_cassa":true,"riaperto":true,"ora_servizio":"12:56"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:58"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:58"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:58"},{"id":212,"nome":"Patatine Twister","prezzo":"3.50","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:58"},{"id":210,"nome":"Olive all’Ascolana","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:58"}]	18.5	pagato	\nORDINE #202\n[15/01/2026, 12:54:13] 🆕 ORDINE DA: Ospite\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 12:55:27] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 12:55:29] [CASSA 💶] ⚠️ RIAPERTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 12:56:00] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 12:58:44] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\nORDINE #203\n[15/01/2026, 12:57:03] 🆕 ORDINE DA: a\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Patatine Twister - 3.50€\n • Olive all’Ascolana - 3.00€\nTOTALE PARZIALE: 12.50€\n----------------------------------\n\n[15/01/2026, 12:58:44] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 12:58:45] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 12:58:46] [CUCINA 👨‍🍳] HA SERVITO: Olive all’Ascolana\n[15/01/2026, 12:58:47] [CUCINA 👨‍🍳] HA SERVITO: Patatine Twister\n[15/01/2026, 13:00:41] 💰 CHIUSO E PAGATO: 18.50€	2026-01-15 11:54:13.383317	\N	\N	\N	0
206	1	16	[{"id":413,"nome":"Pulled Pork","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	12	in_attesa	[20/01/2026, 18:39:39] 🆕 ORDINE DA: Francesco\n • Pulled Pork - 12.00€\nTOTALE PARZIALE: 12.00€\n----------------------------------\n	2026-01-20 17:39:39.295701	Francesco	4	\N	0
207	1	169	[{"id":416,"nome":"Lasagna classica","prezzo":"10.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	10	in_attesa	[20/01/2026, 18:40:35] 🆕 ORDINE DA: Francesco\n • Lasagna classica - 10.00€\nTOTALE PARZIALE: 10.00€\n----------------------------------\n	2026-01-20 17:40:36.441967	Francesco	4	\N	0
208	1	165	[{"id":416,"nome":"Lasagna classica","prezzo":"10.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	10	in_attesa	[20/01/2026, 18:40:56] 🆕 ORDINE DA: Francesco\n • Lasagna classica - 10.00€\nTOTALE PARZIALE: 10.00€\n----------------------------------\n	2026-01-20 17:40:57.148776	Francesco	4	\N	0
151	1	2	[{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:45"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:45"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:45"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":11,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["basilico","acciughe"],"aggiunte":[{"nome":"Basilico","prezzo":1},{"nome":"Bufala","prezzo":2},{"nome":"Mozzarella","prezzo":1}]}},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:48"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:48"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	507	pagato	\nORDINE #151\n[12/01/2026, 14:39:24] 🆕 ORDINE DA: Cliente (Paksh)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • dfergdh - 444.00€\n • Margherita - 7.00€\n • Margherita (No: basilico, acciughe) (+: Basilico, Bufala, Mozzarella) - 11.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\nTOTALE PARZIALE: 504.00€\n----------------------------------\n\n[12/01/2026, 14:39:46] [BAR 🍹] HA SERVITO: Chardonnay\n[12/01/2026, 14:39:47] [BAR 🍹] HA SERVITO: Chardonnay\n[12/01/2026, 14:40:05] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[12/01/2026, 14:40:05] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[12/01/2026, 14:40:08] [CUCINA 👨‍🍳] HA SERVITO: dfergdh\n[12/01/2026, 14:40:30] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[12/01/2026, 14:45:12] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chardonnay\n[12/01/2026, 14:45:13] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chardonnay\n[12/01/2026, 14:45:16] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[12/01/2026, 14:45:17] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: dfergdh\n[12/01/2026, 14:45:45] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[12/01/2026, 14:45:45] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[12/01/2026, 14:45:46] [CUCINA 👨‍🍳] HA SERVITO: dfergdh\n[12/01/2026, 14:48:02] [BAR 🍹] HA SERVITO: Chardonnay\n[12/01/2026, 14:48:02] [BAR 🍹] HA SERVITO: Chardonnay\nORDINE #152\n[12/01/2026, 14:59:16] 🆕 ORDINE DA: Cliente (Paksh)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\nTOTALE PARZIALE: 3.00€\n----------------------------------\n\n[14/01/2026, 12:19:22] 💰 CHIUSO E PAGATO: 507.00€	2026-01-12 13:39:24.292965	\N	9	12/01/2026, 14:39:24	0
47	1	1	[{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767793042225_0","stato":"in_attesa"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767793042225_1","stato":"servito","ora_servizio":"14:50"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767793042225_2","stato":"servito","ora_servizio":"14:50"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767793042225_3","stato":"servito","ora_servizio":"14:50"},{"nome":"prova22","prezzo":"2.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767793042225_4","stato":"servito","ora_servizio":"14:50"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767793042225_5","stato":"in_attesa"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767793042225_6","stato":"in_attesa"},{"nome":"Carbonara","prezzo":"4.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767793042225_7","stato":"in_attesa"},{"nome":"Al ragù","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767793042225_8","stato":"in_attesa"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793042225_9","stato":"servito","ora_servizio":"14:38"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793042225_10","stato":"servito","ora_servizio":"14:38"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793042225_11","stato":"servito","ora_servizio":"14:38"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793042225_12","stato":"servito","ora_servizio":"14:38"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":3,"uniqId":"new_1767793042225_13","stato":"servito","ora_servizio":"14:38"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":1,"uniqId":"new_1767793355411_0","stato":"servito","ora_servizio":"14:42"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767793355411_1","stato":"servito","ora_servizio":"14:43"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767793355411_2","stato":"servito","ora_servizio":"14:43"},{"nome":"amatriciana","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767793355411_3","stato":"in_attesa"},{"nome":"cacio e pepe","prezzo":"1.00","categoria":"Secondi","categoria_posizione":2,"is_bar":false,"is_pizzeria":false,"course":2,"uniqId":"new_1767793355411_4","stato":"in_attesa"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793355411_5","stato":"in_attesa"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793355411_6","stato":"in_attesa"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793355411_7","stato":"in_attesa"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793355411_8","stato":"in_attesa"},{"nome":"Acqua","prezzo":"1.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793355412_9","stato":"in_attesa"},{"nome":"Brasilena","prezzo":"3.00","categoria":"Bibite","categoria_posizione":4,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793355412_10","stato":"in_attesa"},{"nome":"Chardonnay","prezzo":"20.00","categoria":"Vini","categoria_posizione":3,"is_bar":true,"is_pizzeria":false,"course":2,"uniqId":"new_1767793859384_0","stato":"in_attesa"},{"nome":"Margherita","prezzo":"6.00","categoria":"Pizze","categoria_posizione":999,"is_bar":false,"is_pizzeria":true,"course":2,"uniqId":"new_1767793859384_1","stato":"in_attesa"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767793859384_2","stato":"servito","ora_servizio":"14:51"},{"nome":"Scilatelle","prezzo":"4.00","categoria":"Antipasti","categoria_posizione":1,"is_bar":false,"is_pizzeria":false,"course":1,"uniqId":"new_1767793859384_3","stato":"servito","ora_servizio":"14:51"}]	195	pagato	\n--- ORDINE PARZIALE #47 ---\n[07/01/2026, 14:37:22] Ordine creato: 14 elementi. Tot: 80€\n[07/01/2026, 14:38:02] [BAR 🍹] HA SERVITO: 2x Chardonnay\n[07/01/2026, 14:38:03] [BAR 🍹] HA SERVITO: Acqua\n[07/01/2026, 14:38:04] [BAR 🍹] HA SERVITO: 2x Brasilena\n[07/01/2026, 14:50:15] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x3)\n[07/01/2026, 14:50:16] [CUCINA 👨‍🍳] HA SERVITO: prova22 (x1)\n\n--- ORDINE PARZIALE #48 ---\n[07/01/2026, 14:42:35] Ordine creato: 11 elementi. Tot: 81€\n[07/01/2026, 14:42:55] [PIZZERIA 🍕] HA SFORNATO: Margherita alle 14:42\n[07/01/2026, 14:43:01] [CUCINA 👨‍🍳] HA SERVITO: 2x Scilatelle alle 14:43\n\n--- ORDINE PARZIALE #49 ---\n[07/01/2026, 14:50:59] Ordine creato: 4 elementi. Tot: 34€\n[07/01/2026, 14:51:10] [CUCINA 👨‍🍳] HA SERVITO: Scilatelle (x2)\n\n================================\n[07/01/2026, 14:51:50] 💰 TAVOLO CHIUSO. TOTALE: 195.00€	2026-01-07 13:37:22.271988	\N	\N	\N	0
143	1	2	[{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":13,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":["basilico","mozzarella","acciughe"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Basilico","prezzo":1},{"nome":"Patatine Fritte","prezzo":3}]}},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":4,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"granbiscotto","prezzo":3}]}},{"id":84,"nome":"edfwre","prezzo":1,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[]}},{"id":84,"nome":"edfwre","prezzo":9,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8}]}},{"id":84,"nome":"edfwre","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":92,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":92,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":91,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:01"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:01"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa","riaperto":true},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:01"}]	1095	pagato	\nORDINE #143\n[10/01/2026, 23:00:16] 🆕 ORDINE DA: Cliente (Paksh)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita (No: basilico, mozzarella, acciughe) (+: Bufala, Basilico, Patatine Fritte) - 13.00€\n • dfgbvn - 1.00€\n • dfgbvn (+: granbiscotto) - 4.00€\n • edfwre - 1.00€\n • edfwre (+: Sanbuca) - 9.00€\n • edfwre - 1.00€\n • Pasta - 1.00€\n • Pasta - 1.00€\n • Pasta - 1.00€\n • Carbonara - 4.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\n • Chardonnay - 20.00€\nTOTALE PARZIALE: 1095.00€\n----------------------------------\n\n[10/01/2026, 23:01:05] [BAR 🍹] HA SERVITO: Chardonnay\n[10/01/2026, 23:01:05] [BAR 🍹] HA SERVITO: Chardonnay\n[10/01/2026, 23:01:05] [BAR 🍹] HA SERVITO: Chardonnay\n[10/01/2026, 23:01:06] [BAR 🍹] HA SERVITO: Chardonnay\n[10/01/2026, 23:01:18] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chardonnay\n[10/01/2026, 23:24:10] 💰 CHIUSO E PAGATO: 1095.00€	2026-01-10 22:00:16.47378	\N	9	\N	0
209	1	143	[{"id":483,"nome":"Carne (x11/hg)","prezzo":55,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[]},"unita_misura":"/hg","qty_originale":11},{"id":482,"nome":"Pasta","prezzo":15,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[]},"unita_misura":"","qty_originale":1},{"id":481,"nome":"Carne (x4/hg)","prezzo":20,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[]},"unita_misura":"/hg","qty_originale":4},{"id":221,"nome":"Mix di verdure pastellate","prezzo":5,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[]},"unita_misura":"","qty_originale":1}]	104	in_attesa	[20/01/2026, 19:55:26] 🆕 ORDINE DA: Francesco\n👥 COPERTI: 3\n • Carne (x11/hg) - 55.00€ /hg\n • Pasta - 15.00€\n • Carne (x4/hg) - 20.00€ /hg\n • Mix di verdure pastellate - 5.00€\nTOTALE PARZIALE: 104.00€\n----------------------------------\n	2026-01-20 18:55:27.57532	Francesco	4	\N	3
144	1	Banco	[{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	448	pagato	\nORDINE #144\n[10/01/2026, 23:16:31] 🆕 ORDINE DA: Cliente (a)\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • dfergdh - 444.00€\nTOTALE PARZIALE: 448.00€\n----------------------------------\n\n[10/01/2026, 23:24:10] 💰 CHIUSO E PAGATO: 448.00€	2026-01-10 22:16:31.468708	\N	10	\N	0
153	1	77	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":1,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"}]	21	pagato	\nORDINE #153\n[12/01/2026, 15:01:18] 🆕 ORDINE DA: Francesco\n • Margherita - 7.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 21.00€\n----------------------------------\n\n[14/01/2026, 12:19:16] 💰 CHIUSO E PAGATO: 21.00€	2026-01-12 14:01:18.63438	Francesco	4	12/01/2026, 15:01:18	0
161	1	Banco	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:56","chiuso_da_cassa":true},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:56","chiuso_da_cassa":true},{"id":285,"nome":"Prova","prezzo":14,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2}]},"ora_servizio":"22:56","chiuso_da_cassa":true},{"id":209,"nome":"Polpette di carne","prezzo":"3.50","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:56","chiuso_da_cassa":true},{"id":220,"nome":"Jalapenos","prezzo":6,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["Peperoni con crema di formaggio"],"aggiunte":[]},"ora_servizio":"22:56","chiuso_da_cassa":true},{"id":206,"nome":"Nachos","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:53","chiuso_da_cassa":true},{"id":206,"nome":"Nachos","prezzo":11,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Patate fritte","prezzo":3},{"nome":"basilico","prezzo":1}]},"ora_servizio":"22:53","chiuso_da_cassa":true},{"id":223,"nome":"PROVA","prezzo":"0.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:53","chiuso_da_cassa":true},{"id":283,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"22:53","chiuso_da_cassa":true},{"id":283,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","chiuso_da_cassa":true,"riaperto":true,"ora_servizio":"22:53"}]	85.5	pagato	\nORDINE #161\n[14/01/2026, 22:52:41] 🆕 ORDINE DA: Cliente (a)\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Prova (No: pomodoro) (+: Bufala) - 14.00€\n • Polpette di carne - 3.50€\n • Jalapenos (No: Peperoni con crema di formaggio) - 6.00€\n • Nachos - 5.00€\n • Nachos - 5.00€\n • Nachos (No: pomodoro) (+: Bufala, Patate fritte, basilico) - 11.00€\n • PROVA - 0.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\nTOTALE PARZIALE: 90.50€\n----------------------------------\n\n[14/01/2026, 22:53:24] [CASSA 💶] ✅ FATTO DALLA CASSA: Nachos\n[14/01/2026, 22:53:38] [CASSA 💶] ✅ FATTO DALLA CASSA: Nachos\n[14/01/2026, 22:53:38] [CASSA 💶] ✅ FATTO DALLA CASSA: Nachos\n[14/01/2026, 22:53:40] [CASSA 💶] ✅ FATTO DALLA CASSA: PROVA\n[14/01/2026, 22:53:50] [CASSA 💶] ✅ FATTO DALLA CASSA: Chardonnay\n[14/01/2026, 22:53:50] [CASSA 💶] ✅ FATTO DALLA CASSA: Chardonnay\n[14/01/2026, 22:53:54] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chardonnay\n[14/01/2026, 22:53:59] [CASSA 💶] ✅ FATTO DALLA CASSA: Chardonnay\n[14/01/2026, 22:54:05] [CASSA 💶] HA ELIMINATO: Nachos (5.00€). Nuovo Totale: 85.50€\n[14/01/2026, 22:56:27] [CASSA 💶] ✅ FATTO DALLA CASSA: Prova\n[14/01/2026, 22:56:27] [CASSA 💶] ✅ FATTO DALLA CASSA: Crocchette di patate (3 pz) € 3,00\n[14/01/2026, 22:56:28] [CASSA 💶] ✅ FATTO DALLA CASSA: Crocchette di patate (3 pz) € 3,00\n[14/01/2026, 22:56:28] [CASSA 💶] ✅ FATTO DALLA CASSA: Polpette di carne\n[14/01/2026, 22:56:29] [CASSA 💶] ✅ FATTO DALLA CASSA: Jalapenos\n[14/01/2026, 22:56:31] [CASSA 💶] ✅ FATTO DALLA CASSA: Crocchette di patate (3 pz) € 3,00\n[14/01/2026, 22:56:31] [CASSA 💶] ✅ FATTO DALLA CASSA: Polpette di carne\n[14/01/2026, 22:56:37] 💰 CHIUSO E PAGATO: 85.50€	2026-01-14 21:52:41.64799	\N	11	14/01/2026, 22:52:41	0
145	1	2	[{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	3	pagato	\nORDINE #145\n[10/01/2026, 23:33:41] 🆕 ORDINE DA: Cliente (Paksh)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\nTOTALE PARZIALE: 3.00€\n----------------------------------\n\n[10/01/2026, 23:34:37] 💰 CHIUSO E PAGATO: 3.00€	2026-01-10 22:33:41.607329	\N	9	\N	0
146	1	Banco	[{"id":90,"nome":"Carbonara","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	16	pagato	\nORDINE #146\n[10/01/2026, 23:34:08] 🆕 ORDINE DA: Cliente (a)\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\nTOTALE PARZIALE: 16.00€\n----------------------------------\n\n[10/01/2026, 23:34:40] 💰 CHIUSO E PAGATO: 16.00€	2026-01-10 22:34:08.323168	\N	10	\N	0
119	1	59	[{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:00"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:00"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:00"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"12:02"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"12:02"},{"id":86,"nome":"Scilatelle","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"12:02"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:01"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:01"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:01"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:01"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:01"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","riaperto":true},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","riaperto":true},{"id":91,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:01"},{"id":91,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:00"},{"id":92,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:00"},{"id":92,"nome":"Pasta","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"12:00"},{"id":97,"nome":"vedure","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00","chiuso_da_cassa":true},{"id":97,"nome":"vedure","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00","chiuso_da_cassa":true},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":85,"nome":"Mare e Monti","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"},{"id":88,"nome":"Al ragù","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","riaperto":true,"ora_servizio":"13:00"}]	979	pagato	\nORDINE #119\n[10/01/2026, 12:00:39] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • Scilatelle - 4.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Pasta - 1.00€\n • Pasta - 1.00€\n • Pasta - 1.00€\n • Pasta - 1.00€\n • vedure - 1.00€\n • vedure - 1.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 109.00€\n----------------------------------\n\n[10/01/2026, 12:00:48] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x3)\n[10/01/2026, 12:00:50] [CUCINA 👨‍🍳] HA SERVITO: Pasta (x4)\n[10/01/2026, 12:00:54] [CASSA 💶] HA SEGNATO IN ATTESA: Pasta\n[10/01/2026, 12:01:01] [CUCINA 👨‍🍳] HA SERVITO: Pasta (x1)\n[10/01/2026, 12:01:35] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[10/01/2026, 12:01:38] [CASSA 💶] HA SEGNATO SERVITO: Carbonara\n[10/01/2026, 12:01:42] [CASSA 💶] HA SEGNATO SERVITO: Chianti\n[10/01/2026, 12:01:45] [CASSA 💶] HA ELIMINATO: Chianti (25.00€). Nuovo Totale: 84.00€\n[10/01/2026, 12:01:47] [CASSA 💶] HA SEGNATO SERVITO: Chianti\n[10/01/2026, 12:01:58] [CUCINA 👨‍🍳] HA SERVITO: Carbonara (x1)\n[10/01/2026, 12:01:58] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n[10/01/2026, 12:01:59] [CUCINA 👨‍🍳] HA SERVITO: Al sugo (x2)\n[10/01/2026, 12:02:02] [CUCINA 👨‍🍳] HA SERVITO: Carbonara (x1)\n[10/01/2026, 12:02:02] [CUCINA 👨‍🍳] HA SERVITO: vedure (x2)\n[10/01/2026, 12:02:25] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[10/01/2026, 12:02:25] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[10/01/2026, 12:02:26] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[10/01/2026, 12:02:31] [CASSA 💶] HA SEGNATO SERVITO: Scilatelle\n[10/01/2026, 12:59:49] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chianti\n[10/01/2026, 12:59:50] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Chianti\n[10/01/2026, 12:59:51] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: vedure\n[10/01/2026, 12:59:52] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: vedure\n[10/01/2026, 12:59:53] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Carbonara\n[10/01/2026, 12:59:53] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Carbonara\n[10/01/2026, 13:00:50] [BAR 🍹] HA SERVITO: 2x Chianti\n[10/01/2026, 13:00:56] [CASSA 💶] ✅ FATTO DALLA CASSA: vedure\n[10/01/2026, 13:00:57] [CASSA 💶] ✅ FATTO DALLA CASSA: vedure\nORDINE #120\n[10/01/2026, 12:01:19] 🆕 ORDINE DA: franco\n • Mare e Monti - 1.00€\n • Mare e Monti - 1.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Al ragù - 1.00€\n • Al ragù - 1.00€\nTOTALE PARZIALE: 895.00€\n----------------------------------\n\n[10/01/2026, 12:01:27] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x2)\n[10/01/2026, 12:01:30] [CUCINA 👨‍🍳] HA SERVITO: dfergdh (x2)\n[10/01/2026, 12:01:50] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[10/01/2026, 12:01:50] [CASSA 💶] HA SEGNATO SERVITO: Al sugo\n[10/01/2026, 12:01:52] [CUCINA 👨‍🍳] HA SERVITO: Al sugo (x1)\n[10/01/2026, 12:01:54] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n[10/01/2026, 12:59:38] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al ragù\n[10/01/2026, 12:59:39] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al ragù\n[10/01/2026, 12:59:40] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 12:59:41] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 12:59:42] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al sugo\n[10/01/2026, 12:59:43] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Al ragù\n[10/01/2026, 12:59:44] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: dfergdh\n[10/01/2026, 12:59:45] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Mare e Monti\n[10/01/2026, 12:59:47] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Mare e Monti\n[10/01/2026, 12:59:48] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: dfergdh\n[10/01/2026, 13:00:17] [CUCINA 👨‍🍳] HA SERVITO: Mare e Monti (x2)\n[10/01/2026, 13:00:19] [CUCINA 👨‍🍳] HA SERVITO: dfergdh (x2)\n[10/01/2026, 13:00:26] [CUCINA 👨‍🍳] HA SERVITO: Al sugo (x3)\n[10/01/2026, 13:00:27] [CUCINA 👨‍🍳] HA SERVITO: Al ragù (x2)\n[10/01/2026, 13:00:29] [CUCINA 👨‍🍳] HA SERVITO: Al sugo (x3)\n[10/01/2026, 13:01:48] 💰 CHIUSO E PAGATO: 979.00€	2026-01-10 11:00:39.996792	franco	\N	\N	0
210	1	22	[{"id":208,"nome":"Crocchette di patate","prezzo":3,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","unita_misura":"","qty_originale":1},{"id":207,"nome":"Supplì","prezzo":4.5,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","unita_misura":"","qty_originale":1},{"id":212,"nome":"Patatine Twister","prezzo":3.5,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","unita_misura":"","qty_originale":1},{"id":210,"nome":"Olive all’Ascolana","prezzo":3,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","unita_misura":"","qty_originale":1},{"id":483,"nome":"Carne (x12/hg)","prezzo":60,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[]},"unita_misura":"/hg","qty_originale":12}]	83	in_attesa	[20/01/2026, 21:25:27] 🆕 ORDINE DA: Francesco\n👥 COPERTI: 3\n • Crocchette di patate - 3.00€\n • Supplì - 4.50€\n • Patatine Twister - 3.50€\n • Olive all’Ascolana - 3.00€\n • Carne (x12/hg) - 60.00€ /hg\nTOTALE PARZIALE: 83.00€\n----------------------------------\n	2026-01-20 20:25:28.538551	Francesco	4	\N	3
159	1	56	[{"id":285,"nome":"Prova","prezzo":14,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["Basilico","pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2}]},"riaperto":true,"ora_servizio":"11:27"},{"id":209,"nome":"Polpette di carne","prezzo":"3.50","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:27"},{"id":233,"nome":"Ripieno killer","prezzo":20,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["Pancetta","Bacon"],"aggiunte":[]},"ora_servizio":"12:27","chiuso_da_cassa":true},{"id":235,"nome":"Fiorentina","prezzo":7,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["Verdure grigliate"],"aggiunte":[{"nome":"Patate Friite","prezzo":2}]},"ora_servizio":"12:27","chiuso_da_cassa":true},{"id":283,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:27"},{"id":283,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"11:27"}]	84.5	pagato	\nORDINE #159\n[14/01/2026, 12:25:41] 🆕 ORDINE DA: Francesco\n • Prova (No: Basilico, pomodoro) (+: Bufala) - 14.00€\n • Polpette di carne - 3.50€\n • Ripieno killer (No: Pancetta, Bacon) - 20.00€\n • Fiorentina (No: Verdure grigliate) (+: Patate Friite) - 7.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\nTOTALE PARZIALE: 84.50€\n----------------------------------\n\n[14/01/2026, 12:26:25] [CUCINA 👨‍🍳] HA SERVITO: Prova\n[14/01/2026, 12:26:43] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Prova\n[14/01/2026, 12:27:00] [CUCINA 👨‍🍳] HA SERVITO: Prova\n[14/01/2026, 12:27:05] [CUCINA 👨‍🍳] HA SERVITO: Polpette di carne\n[14/01/2026, 12:27:11] [BAR 🍹] HA SERVITO: Chardonnay\n[14/01/2026, 12:27:12] [BAR 🍹] HA SERVITO: Chardonnay\n[14/01/2026, 12:27:43] [CASSA 💶] ✅ FATTO DALLA CASSA: Ripieno killer\n[14/01/2026, 12:27:44] [CASSA 💶] ✅ FATTO DALLA CASSA: Fiorentina\n[14/01/2026, 12:27:47] [CASSA 💶] ✅ FATTO DALLA CASSA: Ripieno killer\n[14/01/2026, 12:28:02] 💰 CHIUSO E PAGATO: 84.50€	2026-01-14 11:25:41.834937	Francesco	4	14/01/2026, 12:25:41	0
154	1	54	[{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","chiuso_da_cassa":true,"riaperto":true,"ora_servizio":"15:25"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"15:25","chiuso_da_cassa":true},{"id":125,"nome":"deqwfre (Copia)","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":125,"nome":"deqwfre (Copia)","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	41	pagato	\nORDINE #154\n[12/01/2026, 15:04:32] 🆕 ORDINE DA: Francesco\n • Margherita - 7.00€\n • Margherita - 7.00€\n • deqwfre (Copia) - 1.00€\n • deqwfre (Copia) - 1.00€\n • Pasta - 1.00€\n • Pasta - 1.00€\n • Margherita - 7.00€\n • Margherita - 7.00€\nTOTALE PARZIALE: 32.00€\n----------------------------------\n\n[12/01/2026, 15:11:06] [CASSA 💶] HA ELIMINATO: Pasta (1.00€). Nuovo Totale: 31.00€\n[12/01/2026, 15:25:18] [CASSA 💶] HA ELIMINATO: Pasta (1.00€). Nuovo Totale: 30.00€\n[12/01/2026, 15:25:32] [CASSA 💶] ✅ FATTO DALLA CASSA: Margherita\n[12/01/2026, 15:25:35] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: Margherita\n[12/01/2026, 15:25:36] [CASSA 💶] ✅ FATTO DALLA CASSA: Margherita\n[12/01/2026, 15:25:41] [CASSA 💶] ✅ FATTO DALLA CASSA: Margherita\nORDINE #157\n[14/01/2026, 02:50:09] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Nachos - 5.00€\nTOTALE PARZIALE: 11.00€\n----------------------------------\n\n[14/01/2026, 12:19:18] 💰 CHIUSO E PAGATO: 41.00€	2026-01-12 14:04:32.448062	Francesco	4	12/01/2026, 15:04:32	0
155	1	38	[{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":206,"nome":"Nachos","prezzo":11,"course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["pomodoro","bufala"],"aggiunte":[{"nome":"basilico","prezzo":1},{"nome":"Patate fritte","prezzo":3},{"nome":"Bufala","prezzo":2}]}}]	34	pagato	\nORDINE #155\n[14/01/2026, 02:47:41] 🆕 ORDINE DA: Cliente (Ospite)\n • Prova - 12.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Nachos - 5.00€\n • Nachos (No: pomodoro, bufala) (+: basilico, Patate fritte, Bufala) - 11.00€\nTOTALE PARZIALE: 34.00€\n----------------------------------\n\n[14/01/2026, 12:19:07] 💰 CHIUSO E PAGATO: 34.00€	2026-01-14 01:47:42.431332	\N	\N	14/01/2026, 02:47:41	0
147	1	37	[{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:01"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:01"},{"id":103,"nome":"Margherita","prezzo":14,"course":1,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":["basilico","acciughe"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Basilico","prezzo":1},{"nome":"Mozzarella","prezzo":1},{"nome":"Patatine Fritte","prezzo":3}]},"ora_servizio":"23:01"},{"id":103,"nome":"Margherita","prezzo":"7.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"23:02"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","riaperto":true,"ora_servizio":"23:02"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","riaperto":true,"ora_servizio":"23:02"},{"id":100,"nome":"dfgbvn","prezzo":4,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"granbiscotto","prezzo":3}]},"ora_servizio":"23:02"},{"id":84,"nome":"edfwre","prezzo":14,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8},{"nome":"Maiale","prezzo":5}]},"ora_servizio":"23:02"},{"id":102,"nome":"r34t3567uyi","prezzo":69.5,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Crudo","prezzo":3.5}]},"ora_servizio":"23:02"},{"id":83,"nome":"deqwfre","prezzo":9,"course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Sanbuca","prezzo":8}]},"ora_servizio":"23:02"},{"id":83,"nome":"deqwfre","prezzo":"1.00","course":2,"is_bar":false,"is_pizzeria":true,"stato":"servito","ora_servizio":"23:02"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:02"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:03"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:03"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:03"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:03"},{"id":99,"nome":"Chianti","prezzo":"25.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"servito","ora_servizio":"23:03"}]	215.5	pagato	\nORDINE #147\n[11/01/2026, 00:01:28] 🆕 ORDINE DA: Cliente (Paksh)\n • Al sugo - 1.00€\n • Al sugo - 1.00€\n • Margherita (No: basilico, acciughe) (+: Bufala, Basilico, Mozzarella, Patatine Fritte) - 14.00€\n • Margherita - 7.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn (+: granbiscotto) - 4.00€\n • edfwre (+: Sanbuca, Maiale) - 14.00€\n • r34t3567uyi (+: Crudo) - 69.50€\n • deqwfre (+: Sanbuca) - 9.00€\n • deqwfre - 1.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Chianti - 25.00€\nTOTALE PARZIALE: 215.50€\n----------------------------------\n\n[11/01/2026, 00:01:50] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[11/01/2026, 00:01:50] [CUCINA 👨‍🍳] HA SERVITO: Al sugo\n[11/01/2026, 00:01:52] [PIZZERIA 🍕] HA SERVITO: Margherita\n[11/01/2026, 00:02:08] [CUCINA 👨‍🍳] HA SERVITO: Carbonara\n[11/01/2026, 00:02:10] [PIZZERIA 🍕] HA SERVITO: Margherita\n[11/01/2026, 00:02:10] [PIZZERIA 🍕] HA SERVITO: dfgbvn\n[11/01/2026, 00:02:11] [PIZZERIA 🍕] HA SERVITO: dfgbvn\n[11/01/2026, 00:02:14] [PIZZERIA 🍕] HA SERVITO: dfgbvn\n[11/01/2026, 00:02:15] [PIZZERIA 🍕] HA SERVITO: edfwre\n[11/01/2026, 00:02:16] [PIZZERIA 🍕] HA SERVITO: r34t3567uyi\n[11/01/2026, 00:02:17] [PIZZERIA 🍕] HA SERVITO: deqwfre\n[11/01/2026, 00:02:18] [PIZZERIA 🍕] HA SERVITO: deqwfre\n[11/01/2026, 00:02:43] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: dfgbvn\n[11/01/2026, 00:02:47] [CASSA 💶] ⚠️ RIAPERTO DALLA CASSA: dfgbvn\n[11/01/2026, 00:02:51] [PIZZERIA 🍕] HA SERVITO: dfgbvn\n[11/01/2026, 00:02:51] [PIZZERIA 🍕] HA SERVITO: dfgbvn\n[11/01/2026, 00:03:01] [CUCINA 👨‍🍳] HA SERVITO: Carbonara\n[11/01/2026, 00:03:10] [BAR 🍹] HA SERVITO: Chardonnay\n[11/01/2026, 00:03:10] [BAR 🍹] HA SERVITO: Chardonnay\n[11/01/2026, 00:03:10] [BAR 🍹] HA SERVITO: Chardonnay\n[11/01/2026, 00:03:12] [BAR 🍹] HA SERVITO: Chianti\n[11/01/2026, 00:03:17] 💰 CHIUSO E PAGATO: 215.50€	2026-01-10 23:01:28.860524	\N	9	11/01/2026, 00:01:28	0
156	1	78	[{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	35	pagato	\nORDINE #156\n[14/01/2026, 02:49:23] 🆕 ORDINE DA: Francesco\n • Prova - 12.00€\n • Prova - 12.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Nachos - 5.00€\nTOTALE PARZIALE: 35.00€\n----------------------------------\n\n[14/01/2026, 12:19:14] 💰 CHIUSO E PAGATO: 35.00€	2026-01-14 01:49:23.52627	Francesco	4	14/01/2026, 02:49:23	0
160	1	2	[{"id":285,"nome":"Prova","prezzo":14,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["Basilico","pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2}]}},{"id":206,"nome":"Nachos","prezzo":11,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2},{"nome":"Patate fritte","prezzo":3},{"nome":"basilico","prezzo":1}]},"ora_servizio":"17:40"},{"id":283,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"}]	45	pagato	\nORDINE #160\n[14/01/2026, 18:31:43] 🆕 ORDINE DA: Cliente (Ospite)\n • Prova (No: Basilico, pomodoro) (+: Bufala) - 14.00€\n • Nachos (No: pomodoro) (+: Bufala, Patate fritte, basilico) - 11.00€\n • Chardonnay - 20.00€\nTOTALE PARZIALE: 45.00€\n----------------------------------\n\n[14/01/2026, 18:40:26] [CUCINA 👨‍🍳] HA SERVITO: Nachos\n[14/01/2026, 22:53:08] 💰 CHIUSO E PAGATO: 45.00€	2026-01-14 17:31:43.186837	\N	\N	14/01/2026, 18:31:43	0
166	1	Banco	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	30	pagato	\nORDINE #166\n[15/01/2026, 00:02:29] 🆕 ORDINE DA: Cliente (a)\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\nORDINE #167\n[15/01/2026, 00:13:01] 🆕 ORDINE DA: Cliente (a)\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\nORDINE #168\n[15/01/2026, 00:13:43] 🆕 ORDINE DA: Cliente (a)\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\nORDINE #169\n[15/01/2026, 00:35:23] 🆕 ORDINE DA: a\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 00:35:49] 💰 CHIUSO E PAGATO: 30.00€	2026-01-14 23:02:29.916698	\N	11	15/01/2026, 00:02:29	0
148	1	37	[{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":98,"nome":"Chardonnay","prezzo":"20.00","course":0,"is_bar":true,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":90,"nome":"Carbonara","prezzo":"4.00","course":3,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":89,"nome":"Al sugo","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":101,"nome":"dfergdh","prezzo":"444.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":84,"nome":"edfwre","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":84,"nome":"edfwre","prezzo":"1.00","course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":100,"nome":"dfgbvn","prezzo":"1.00","course":4,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa"},{"id":102,"nome":"r34t3567uyi","prezzo":82.5,"course":3,"is_bar":false,"is_pizzeria":true,"stato":"in_attesa","varianti_scelte":{"rimozioni":[],"aggiunte":[{"nome":"Maiale","prezzo":5},{"nome":"Crudo","prezzo":3.5},{"nome":"Sanbuca","prezzo":8}]}}]	1922.5	pagato	\nORDINE #148\n[11/01/2026, 01:50:59] 🆕 ORDINE DA: Cliente (Paksh)\n • Chardonnay - 20.00€\n • Chardonnay - 20.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\n • Carbonara - 4.00€\nTOTALE PARZIALE: 56.00€\n----------------------------------\n\nORDINE #149\n[11/01/2026, 02:11:42] 🆕 ORDINE DA: Cliente (Paksh)\n • Al sugo - 1.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • dfergdh - 444.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • dfgbvn - 1.00€\n • edfwre - 1.00€\n • edfwre - 1.00€\n • dfgbvn - 1.00€\n • r34t3567uyi (+: Maiale, Crudo, Sanbuca) - 82.50€\nTOTALE PARZIALE: 1866.50€\n----------------------------------\n\n[12/01/2026, 14:33:30] 💰 CHIUSO E PAGATO: 1922.50€	2026-01-11 00:50:59.902401	\N	9	11/01/2026, 01:50:59	0
158	1	65	[{"id":223,"nome":"PROVA","prezzo":"0.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":230,"nome":"Filetto del cowboy","prezzo":22,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["Rucola"],"aggiunte":[{"nome":"Patate Friite","prezzo":2}]}},{"id":233,"nome":"Ripieno killer","prezzo":20,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["Bacon","Pancetta"],"aggiunte":[]}},{"id":235,"nome":"Fiorentina","prezzo":7,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["Verdure grigliate"],"aggiunte":[{"nome":"Patate Friite","prezzo":2}]}},{"id":235,"nome":"Fiorentina","prezzo":7,"course":2,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa","varianti_scelte":{"rimozioni":["Verdure grigliate"],"aggiunte":[{"nome":"Patate Friite","prezzo":2}]}}]	56	pagato	\nORDINE #158\n[14/01/2026, 03:44:33] 🆕 ORDINE DA: Francesco\n • PROVA - 0.00€\n • Filetto del cowboy (No: Rucola) (+: Patate Friite) - 22.00€\n • Ripieno killer (No: Bacon, Pancetta) - 20.00€\n • Fiorentina (No: Verdure grigliate) (+: Patate Friite) - 7.00€\n • Fiorentina (No: Verdure grigliate) (+: Patate Friite) - 7.00€\nTOTALE PARZIALE: 56.00€\n----------------------------------\n\n[14/01/2026, 12:19:11] 💰 CHIUSO E PAGATO: 56.00€	2026-01-14 02:44:34.561743	Francesco	4	14/01/2026, 03:44:33	0
173	1	Banco	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":206,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	21	pagato	\nORDINE #173\n[15/01/2026, 01:09:06] 🆕 ORDINE DA: a\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\nORDINE #174\n[15/01/2026, 01:09:44] 🆕 ORDINE DA: Ospite\n • Nachos - 5.00€\n • Nachos - 5.00€\n • Nachos - 5.00€\nTOTALE PARZIALE: 15.00€\n----------------------------------\n\n[15/01/2026, 01:10:02] 💰 CHIUSO E PAGATO: 21.00€	2026-01-15 00:09:06.983298	\N	11	\N	0
178	1	Banco	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":212,"nome":"Patatine Twister","prezzo":"3.50","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":210,"nome":"Olive all’Ascolana","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":210,"nome":"Olive all’Ascolana","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:39","chiuso_da_cassa":true},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:39","chiuso_da_cassa":true},{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"01:39","chiuso_da_cassa":true},{"id":285,"nome":"Prova","prezzo":14,"course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","varianti_scelte":{"rimozioni":["pomodoro"],"aggiunte":[{"nome":"Bufala","prezzo":2}]},"ora_servizio":"01:39","chiuso_da_cassa":true}]	50.5	pagato	\nORDINE #178\n[15/01/2026, 01:25:52] 🆕 ORDINE DA: Ospite\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Patatine Twister - 3.50€\n • Olive all’Ascolana - 3.00€\n • Olive all’Ascolana - 3.00€\nTOTALE PARZIALE: 18.50€\n----------------------------------\n\nORDINE #180\n[15/01/2026, 01:28:20] 🆕 ORDINE DA: a\n • Filetto del cowboy - 20.00€\n • Filetto del cowboy - 20.00€\nTOTALE PARZIALE: 40.00€\n----------------------------------\n\n[15/01/2026, 01:28:41] [CASSA 💶] HA ELIMINATO: Filetto del cowboy (20.00€). Nuovo Totale: 20.00€\n[15/01/2026, 01:28:43] [CASSA 💶] HA ELIMINATO: Filetto del cowboy (20.00€). Nuovo Totale: 0.00€\nORDINE #179\n[15/01/2026, 01:26:16] 🆕 ORDINE DA: a\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Prova - 12.00€\n • Prova (No: pomodoro) (+: Bufala) - 14.00€\n • Supplì - 4.50€\nTOTALE PARZIALE: 36.50€\n----------------------------------\n\n[15/01/2026, 01:29:03] [CASSA 💶] HA ELIMINATO: Supplì (4.50€). Nuovo Totale: 32.00€\n[15/01/2026, 01:39:12] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:39:13] [CASSA 💶] ✅ FATTO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 01:39:23] [CASSA 💶] ✅ FATTO: Prova\n[15/01/2026, 01:39:24] [CASSA 💶] ✅ FATTO: Prova\n[15/01/2026, 01:39:52] 💰 CHIUSO E PAGATO: 50.50€	2026-01-15 00:25:52.592381	\N	\N	\N	0
170	1	Banco	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":285,"nome":"Prova","prezzo":"12.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":209,"nome":"Polpette di carne","prezzo":"3.50","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":209,"nome":"Polpette di carne","prezzo":"3.50","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	58	pagato	\nORDINE #170\n[15/01/2026, 00:36:05] 🆕 ORDINE DA: a\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Prova - 12.00€\n • Prova - 12.00€\n • Prova - 12.00€\n • Polpette di carne - 3.50€\n • Polpette di carne - 3.50€\nTOTALE PARZIALE: 52.00€\n----------------------------------\n\nORDINE #171\n[15/01/2026, 00:56:32] 🆕 ORDINE DA: a\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 00:56:42] 💰 CHIUSO E PAGATO: 58.00€	2026-01-14 23:36:05.963782	\N	11	\N	0
172	1	Banco	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	9	pagato	\nORDINE #172\n[15/01/2026, 00:56:55] 🆕 ORDINE DA: a\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 9.00€\n----------------------------------\n\n[15/01/2026, 01:05:15] 💰 CHIUSO E PAGATO: 9.00€	2026-01-14 23:56:55.246006	\N	11	\N	0
183	1	44	[{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"},{"id":208,"nome":"Crocchette di patate (3 pz) € 3,00","prezzo":"3.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"servito","ora_servizio":"02:24"}]	6	pagato	\nORDINE #183\n[15/01/2026, 01:50:03] 🆕 ORDINE DA: Francesco\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\n • Crocchette di patate (3 pz) € 3,00 - 3.00€\nTOTALE PARZIALE: 6.00€\n----------------------------------\n\n[15/01/2026, 02:24:15] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:24:16] [CUCINA 👨‍🍳] HA SERVITO: Crocchette di patate (3 pz) € 3,00\n[15/01/2026, 02:24:45] 💰 CHIUSO E PAGATO: 6.00€	2026-01-15 00:50:03.983061	Francesco	4	\N	0
184	2	Banco	[{"id":286,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":286,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"},{"id":286,"nome":"Nachos","prezzo":"5.00","course":1,"is_bar":false,"is_pizzeria":false,"stato":"in_attesa"}]	15	pagato	\nORDINE #184\n[15/01/2026, 01:52:15] 🆕 ORDINE DA: Francesco\n • Nachos - 5.00€\n • Nachos - 5.00€\n • Nachos - 5.00€\nTOTALE PARZIALE: 15.00€\n----------------------------------\n\n[15/01/2026, 01:53:59] 💰 CHIUSO E PAGATO: 15.00€	2026-01-15 00:52:15.596509	\N	4	\N	0
\.


--
-- Data for Name: playing_with_neon; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.playing_with_neon (id, name, value) FROM stdin;
1	c4ca4238a0	0.82588714
2	c81e728d9d	0.108143546
3	eccbc87e4b	0.8403453
4	a87ff679a2	0.16304627
5	e4da3b7fbb	0.2560589
6	1679091c5a	0.622762
7	8f14e45fce	0.2520795
8	c9f0f895fb	0.7779329
9	45c48cce2e	0.753066
10	d3d9446802	0.20289928
11	c4ca4238a0	0.05928393
12	c81e728d9d	0.41980493
13	eccbc87e4b	0.5267105
14	a87ff679a2	0.14849006
15	e4da3b7fbb	0.46437404
16	1679091c5a	0.736427
17	8f14e45fce	0.1359814
18	c9f0f895fb	0.97417605
19	45c48cce2e	0.31138313
20	d3d9446802	0.27986312
21	c4ca4238a0	0.79933465
22	c81e728d9d	0.9248699
23	eccbc87e4b	0.92916024
24	a87ff679a2	0.46391407
25	e4da3b7fbb	0.25878888
26	1679091c5a	0.6289372
27	8f14e45fce	0.38587466
28	c9f0f895fb	0.14161737
29	45c48cce2e	0.6352922
30	d3d9446802	0.23989831
31	c4ca4238a0	0.55796933
32	c81e728d9d	0.9726489
33	eccbc87e4b	0.4272882
34	a87ff679a2	0.4549709
35	e4da3b7fbb	0.68982404
36	1679091c5a	0.28330782
37	8f14e45fce	0.19355078
38	c9f0f895fb	0.26663408
39	45c48cce2e	0.27423552
40	d3d9446802	0.8344332
41	c4ca4238a0	0.71520823
42	c81e728d9d	0.24950372
43	eccbc87e4b	0.8775352
44	a87ff679a2	0.12235493
45	e4da3b7fbb	0.8386457
46	1679091c5a	0.7251775
47	8f14e45fce	0.9731402
48	c9f0f895fb	0.7188718
49	45c48cce2e	0.47253254
50	d3d9446802	0.69109523
51	c4ca4238a0	0.7740487
52	c81e728d9d	0.4228346
53	eccbc87e4b	0.7421537
54	a87ff679a2	0.27671942
55	e4da3b7fbb	0.4163974
56	1679091c5a	0.8660365
57	8f14e45fce	0.4225752
58	c9f0f895fb	0.8792788
59	45c48cce2e	0.688201
60	d3d9446802	0.7691616
61	c4ca4238a0	0.40201914
62	c81e728d9d	0.9405894
63	eccbc87e4b	0.6726898
64	a87ff679a2	0.5780005
65	e4da3b7fbb	0.09102859
66	1679091c5a	0.38949645
67	8f14e45fce	0.3418427
68	c9f0f895fb	0.28888237
69	45c48cce2e	0.8339794
70	d3d9446802	0.55476487
71	c4ca4238a0	0.99295104
72	c81e728d9d	0.53759396
73	eccbc87e4b	0.078175776
74	a87ff679a2	0.92643476
75	e4da3b7fbb	0.13909085
76	1679091c5a	0.5704273
77	8f14e45fce	0.18174517
78	c9f0f895fb	0.10787735
79	45c48cce2e	0.91516036
80	d3d9446802	0.3064002
81	c4ca4238a0	0.09663494
82	c81e728d9d	0.5345251
83	eccbc87e4b	0.4559006
84	a87ff679a2	0.101717636
85	e4da3b7fbb	0.1334641
86	1679091c5a	0.6431714
87	8f14e45fce	0.34879974
88	c9f0f895fb	0.10530049
89	45c48cce2e	0.27841026
90	d3d9446802	0.5762427
91	c4ca4238a0	0.63275266
92	c81e728d9d	0.0660641
93	eccbc87e4b	0.12192605
94	a87ff679a2	0.26065075
95	e4da3b7fbb	0.30365032
96	1679091c5a	0.73192966
97	8f14e45fce	0.4141744
98	c9f0f895fb	0.061975773
99	45c48cce2e	0.24849077
100	d3d9446802	0.35522473
101	c4ca4238a0	0.9583582
102	c81e728d9d	0.76097995
103	eccbc87e4b	0.410399
104	a87ff679a2	0.63755256
105	e4da3b7fbb	0.7321268
106	1679091c5a	0.0045999866
107	8f14e45fce	0.16771816
108	c9f0f895fb	0.760314
109	45c48cce2e	0.66953474
110	d3d9446802	0.84288013
111	c4ca4238a0	0.6953301
112	c81e728d9d	0.8146685
113	eccbc87e4b	0.16839807
114	a87ff679a2	0.37095812
115	e4da3b7fbb	0.10513163
116	1679091c5a	0.15419905
117	8f14e45fce	0.50540996
118	c9f0f895fb	0.093594804
119	45c48cce2e	0.39475128
120	d3d9446802	0.9125005
121	c4ca4238a0	0.7723599
122	c81e728d9d	0.7786395
123	eccbc87e4b	0.59303737
124	a87ff679a2	0.4489822
125	e4da3b7fbb	0.14789228
126	1679091c5a	0.37619218
127	8f14e45fce	0.92616063
128	c9f0f895fb	0.17572403
129	45c48cce2e	0.2224743
130	d3d9446802	0.76625776
131	c4ca4238a0	0.80111784
132	c81e728d9d	0.0934289
133	eccbc87e4b	0.18933728
134	a87ff679a2	0.13935912
135	e4da3b7fbb	0.7154158
136	1679091c5a	0.6528776
137	8f14e45fce	0.6921899
138	c9f0f895fb	0.0061639776
139	45c48cce2e	0.6999648
140	d3d9446802	0.26404572
141	c4ca4238a0	0.43449157
142	c81e728d9d	0.84937316
143	eccbc87e4b	0.68862087
144	a87ff679a2	0.71205115
145	e4da3b7fbb	0.60184723
146	1679091c5a	0.82926756
147	8f14e45fce	0.22649772
148	c9f0f895fb	0.5161208
149	45c48cce2e	0.41378567
150	d3d9446802	0.24117531
\.


--
-- Data for Name: prodotti; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.prodotti (id, nome, prezzo, categoria, immagine_url, ristorante_id, descrizione, sottocategoria, varianti, posizione, allergeni, traduzioni, unita_misura, qta_minima) FROM stdin;
483	Carne	5.00	Friggitoria		1			{"base": [], "aggiunte": []}	198	["Glutine 🌾", "Crostacei 🦐", "Soia 🫘"]	{"de": {"nome": "", "descrizione": ""}, "en": {"nome": "", "descrizione": ""}}	/hg	8.00
285	Prova	13.00	Friggitoria		1			{"base": ["Provola", "Mozzarella", "Basilico", "pomodoro"], "aggiunte": [{"nome": "Bufala", "prezzo": 2}]}	0	["Glutine 🌾", "Crostacei 🦐", "Prodotto Surgelato/Abbattuto ❄️"]	{"de": {"nome": "Piatto 3", "descrizione": ""}, "en": {"nome": "Piatto 2", "descrizione": ""}}		1.00
208	Crocchette di patate	3.00	Friggitoria	\N	1	3 pz		{"base": [], "aggiunte": []}	1	[]	{"de": {"nome": "", "descrizione": ""}, "en": {"nome": "", "descrizione": ""}}		1.00
209	Polpette di carne	3.50	Friggitoria	\N	1	3 pz		{"base": [], "aggiunte": []}	2	[]	{}		1.00
207	Supplì	4.50	Friggitoria	\N	1	3 pz		{"base": [], "aggiunte": []}	3	[]	{}		1.00
494	CRUDO SAN DANIELE CON MOZZARELLA	15.00	Antipasto di Terra		1			{"base": [], "aggiunte": []}	209	"[]"	"{}"		1.00
484	APERIFISH	35.00	Antipasto di Mare		1	Frittura di calamari, gamberi, bruschetta, patatine		{"base": [], "aggiunte": []}	199	"[]"	"{}"		1.00
212	Patatine Twister	3.50	Friggitoria	\N	1			{"base": [], "aggiunte": []}	4	[]	{}		1.00
210	Olive all’Ascolana	3.00	Friggitoria	\N	1	6 pz		{"base": [], "aggiunte": []}	5	[]	{}		1.00
211	Mozzarelline Stick	3.00	Friggitoria	\N	1	5 pz		{"base": [], "aggiunte": []}	6	[]	{}		1.00
213	Patate Dippers	3.50	Friggitoria	\N	1			{"base": [], "aggiunte": []}	7	[]	{}		1.00
214	Patatine Fritte	3.50	Friggitoria	\N	1			{"base": [], "aggiunte": []}	8	[]	{}		1.00
215	Alette di pollo	5.00	Friggitoria	\N	1	5 pz		{"base": [], "aggiunte": []}	9	[]	{}		1.00
216	Nuggets di pollo	5.00	Friggitoria	\N	1	5 pz		{"base": [], "aggiunte": []}	10	[]	{}		1.00
217	Costine di suino	5.00	Friggitoria	\N	1	3 pz		{"base": [], "aggiunte": []}	11	[]	{}		1.00
485	ANTIPASTO SAVERIO	20.00	Antipasto di Mare		1	Insalata di mare, spada affumicato, cocktail di gamberi, gambero pasta kataifi, alici marinate		{"base": [], "aggiunte": []}	200	"[]"	"{}"		1.00
482	Pasta	15.00	Friggitoria		1			{"base": [], "aggiunte": []}	197	["Glutine 🌾", "Crostacei 🦐", "Pesce 🐟"]	{"de": {"nome": "", "descrizione": ""}, "en": {"nome": "", "descrizione": ""}}		1.00
486	INSALATA DI MARE	15.00	Antipasto di Mare		1			{"base": [], "aggiunte": []}	201	"[]"	"{}"		1.00
487	POLPO E PATATE	15.00	Antipasto di Mare		1			{"base": [], "aggiunte": []}	202	"[]"	"{}"		1.00
488	GAMBERI IN PASTA KATAIFI	15.00	Antipasto di Mare		1			{"base": [], "aggiunte": []}	203	"[]"	"{}"		1.00
230	Filetto del cowboy	20.00	Secondi	\N	1			{"base": ["Bufala", "Pancetta coppata", "Rucola"], "aggiunte": [{"nome": "Patate Friite", "prezzo": 2}]}	1	[]	{}		1.00
231	Filetto alla griglia	20.00	Secondi	\N	1			{"base": ["Verdure grigliate"], "aggiunte": [{"nome": "Patate Friite", "prezzo": 2}]}	2	[]	{}		1.00
232	Filetto alla Bounty	20.00	Secondi	\N	1	Aromatizzato all'aceto balsamico e cipolla		{"base": [], "aggiunte": []}	3	[]	{}		1.00
233	Ripieno killer	20.00	Secondi	\N	1			{"base": ["Scamorza", "Lardo", "Pancetta", "Pomodoro", "Bacon"], "aggiunte": []}	4	[]	{}		1.00
234	Costata	5.00	Secondi	\N	1	con contorno		{"base": ["Verdure grigliate"], "aggiunte": [{"nome": "Patate Friite", "prezzo": 2}]}	5	[]	{}		1.00
235	Fiorentina	5.00	Secondi	\N	1	con contorno		{"base": ["Verdure grigliate"], "aggiunte": [{"nome": "Patate Friite", "prezzo": 2}]}	6	[]	{}		1.00
489	POLPO ALLA GRIGLIA CON FRIARIELLI	18.00	Antipasto di Mare		1			{"base": [], "aggiunte": []}	204	"[]"	"{}"		1.00
490	PEPATA DI COZZE	15.00	Antipasto di Mare		1			{"base": [], "aggiunte": []}	205	"[]"	"{}"		1.00
491	SPADA AFFUMICATO	15.00	Antipasto di Mare		1			{"base": [], "aggiunte": []}	206	"[]"	"{}"		1.00
492	COCKTAIL DI GAMBERI	18.00	Antipasto di Mare		1			{"base": [], "aggiunte": []}	207	"[]"	"{}"		1.00
493	SELEZIONE DI SALUMI E FORMAGGI	15.00	Antipasto di Terra		1			{"base": [], "aggiunte": []}	208	"[]"	"{}"		1.00
495	CRUDO E MELONE	15.00	Antipasto di Terra		1			{"base": [], "aggiunte": []}	210	"[]"	"{}"		1.00
496	BUFALA, RUCOLA E BRESAOLA	15.00	Antipasto di Terra		1			{"base": [], "aggiunte": []}	211	"[]"	"{}"		1.00
341	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	56	[]	{}		1.00
342	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	57	[]	{}		1.00
343	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	58	[]	{}		1.00
344	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	59	[]	{}		1.00
345	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	60	[]	{}		1.00
346	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	61	[]	{}		1.00
347	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	62	[]	{}		1.00
348	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	63	[]	{}		1.00
349	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	64	[]	{}		1.00
429	Filetto Cowboy	20.00	Secondi	\N	1		Carne	{"base": [], "aggiunte": []}	144	[]	{}		1.00
430	Tagliata Sale Grosso	18.00	Secondi	\N	1		Carne	{"base": [], "aggiunte": []}	145	[]	{}		1.00
303	Senza Nome	0.00	Primi	\N	2			{"base": [], "aggiunte": []}	18	[]	{}		1.00
304	Senza Nome	0.00	Primi	\N	2			{"base": [], "aggiunte": []}	19	[]	{}		1.00
305	Senza Nome	0.00	Primi	\N	2			{"base": [], "aggiunte": []}	20	[]	{}		1.00
306	Senza Nome	0.00	Primi	\N	2			{"base": [], "aggiunte": []}	21	[]	{}		1.00
307	Senza Nome	0.00	Primi	\N	2			{"base": [], "aggiunte": []}	22	[]	{}		1.00
308	Senza Nome	0.00	Primi	\N	2			{"base": [], "aggiunte": []}	23	[]	{}		1.00
309	Senza Nome	0.00	Primi	\N	2			{"base": [], "aggiunte": []}	24	[]	{}		1.00
310	Filetto del cowboy	20.00	Secondi	\N	2			{"base": ["Bufala", "Pancetta coppata", "Rucola"], "aggiunte": [{"nome": "Patate Friite", "prezzo": 2}]}	25	[]	{}		1.00
311	Filetto alla griglia	20.00	Secondi	\N	2			{"base": ["Verdure grigliate"], "aggiunte": [{"nome": "Patate Friite", "prezzo": 2}]}	26	[]	{}		1.00
312	Filetto alla Bounty	20.00	Secondi	\N	2	Aromatizzato all'aceto balsamico e cipolla		{"base": [], "aggiunte": []}	27	[]	{}		1.00
313	Ripieno killer	20.00	Secondi	\N	2			{"base": ["Scamorza", "Lardo", "Pancetta", "Pomodoro", "Bacon"], "aggiunte": []}	28	[]	{}		1.00
314	Costata	5.00	Secondi	\N	2	con contorno		{"base": ["Verdure grigliate"], "aggiunte": [{"nome": "Patate Friite", "prezzo": 2}]}	29	[]	{}		1.00
315	Fiorentina	5.00	Secondi	\N	2	con contorno		{"base": ["Verdure grigliate"], "aggiunte": [{"nome": "Patate Friite", "prezzo": 2}]}	30	[]	{}		1.00
316	Senza Nome	0.00	Secondi	\N	2			{"base": [], "aggiunte": []}	31	[]	{}		1.00
317	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	32	[]	{}		1.00
318	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	33	[]	{}		1.00
319	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	34	[]	{}		1.00
320	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	35	[]	{}		1.00
321	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	36	[]	{}		1.00
322	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	37	[]	{}		1.00
323	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	38	[]	{}		1.00
324	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	39	[]	{}		1.00
325	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	40	[]	{}		1.00
326	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	41	[]	{}		1.00
327	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	42	[]	{}		1.00
328	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	43	[]	{}		1.00
329	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	44	[]	{}		1.00
330	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	45	[]	{}		1.00
331	Senza Nome	0.00	Pizze	\N	2			{"base": [], "aggiunte": []}	46	[]	{}		1.00
332	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	47	[]	{}		1.00
333	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	48	[]	{}		1.00
334	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	49	[]	{}		1.00
335	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	50	[]	{}		1.00
431	Tagliata Aceto Bals.	19.00	Secondi	\N	1		Carne	{"base": [], "aggiunte": []}	146	[]	{}		1.00
336	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	51	[]	{}		1.00
337	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	52	[]	{}		1.00
338	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	53	[]	{}		1.00
339	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	54	[]	{}		1.00
340	Senza Nome	0.00	Panini	\N	2			{"base": [], "aggiunte": []}	55	[]	{}		1.00
289	Polpette di carne	3.50	Friggitoria	\N	2	3 pz		{"base": [], "aggiunte": []}	3	[]	{}		1.00
290	Olive all’Ascolana	3.00	Friggitoria	\N	2	6 pz		{"base": [], "aggiunte": []}	4	[]	{}		1.00
291	Mozzarelline Stick	3.00	Friggitoria	\N	2	5 pz		{"base": [], "aggiunte": []}	5	[]	{}		1.00
292	Patatine Twister	3.50	Friggitoria	\N	2			{"base": [], "aggiunte": []}	6	[]	{}		1.00
293	Patate Dippers	3.50	Friggitoria	\N	2			{"base": [], "aggiunte": []}	7	[]	{}		1.00
294	Patatine Fritte	3.50	Friggitoria	\N	2			{"base": [], "aggiunte": []}	8	[]	{}		1.00
295	Alette di pollo	5.00	Friggitoria	\N	2	5 pz		{"base": [], "aggiunte": []}	9	[]	{}		1.00
296	Nuggets di pollo	5.00	Friggitoria	\N	2	5 pz		{"base": [], "aggiunte": []}	10	[]	{}		1.00
297	Costine di suino	5.00	Friggitoria	\N	2	3 pz		{"base": [], "aggiunte": []}	11	[]	{}		1.00
298	Pallottole fumanti	5.00	Friggitoria	\N	2			{"base": ["Wurstel", "Patate"], "aggiunte": []}	12	[]	{}		1.00
299	Anelli di cipolla	3.50	Friggitoria	\N	2	6 pz		{"base": [], "aggiunte": []}	13	[]	{}		1.00
300	Jalapenos	6.00	Friggitoria	\N	2	4 pz		{"base": ["Peperoni con crema di formaggio"], "aggiunte": []}	14	[]	{}		1.00
301	Mix di verdure pastellate	5.00	Friggitoria	\N	2			{"base": [], "aggiunte": []}	15	[]	{}		1.00
302	Patate bacon cheddar	5.50	Friggitoria	\N	2			{"base": [], "aggiunte": []}	16	[]	{}		1.00
286	Nachos	5.00	Friggitoria	\N	2	con salsa tex mex		{"base": [], "aggiunte": []}	0	[]	{}		1.00
350	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	65	[]	{}		1.00
351	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	66	[]	{}		1.00
352	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	67	[]	{}		1.00
353	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	68	[]	{}		1.00
354	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	69	[]	{}		1.00
355	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	70	[]	{}		1.00
356	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	71	[]	{}		1.00
357	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	72	[]	{}		1.00
358	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	73	[]	{}		1.00
359	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	74	[]	{}		1.00
360	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	75	[]	{}		1.00
361	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	76	[]	{}		1.00
362	Senza Nome	0.00	Bevande	\N	2			{"base": [], "aggiunte": []}	77	[]	{}		1.00
363	Chardonnay	20.00	Vini	\N	2	Ottimo vino fermo	Bianchi	{"base": [], "aggiunte": []}	78	[]	{}		1.00
364	Chianti	25.00	Vini	\N	2	Classico toscano	Rossi	{"base": [], "aggiunte": []}	79	[]	{}		1.00
287	Supplì	4.50	Friggitoria	\N	2	3 pz		{"base": [], "aggiunte": []}	1	[]	{}		1.00
288	Crocchette di patate (3 pz) € 3,00	3.00	Friggitoria	\N	2	3 pz		{"base": [], "aggiunte": []}	2	[]	{}		1.00
432	Fiorentina (al kg)	50.00	Secondi	\N	1		Carne	{"base": [], "aggiunte": []}	147	[]	{}		1.00
433	Cotoletta Milanese	14.00	Secondi	\N	1		Carne	{"base": [], "aggiunte": []}	148	[]	{}		1.00
434	Grigliata Mista	22.00	Secondi	\N	1		Carne	{"base": [], "aggiunte": []}	149	[]	{}		1.00
435	Scaloppina Limone	12.00	Secondi	\N	1		Carne	{"base": [], "aggiunte": []}	150	[]	{}		1.00
436	Grigliata Pesce	25.00	Secondi	\N	1		Pesce	{"base": [], "aggiunte": []}	151	[]	{}		1.00
437	Fritto Misto	18.00	Secondi	\N	1		Pesce	{"base": [], "aggiunte": []}	152	[]	{}		1.00
438	Orata al Forno	20.00	Secondi	\N	1		Pesce	{"base": [], "aggiunte": []}	153	[]	{}		1.00
439	Pesce Spada Grill	17.00	Secondi	\N	1		Pesce	{"base": [], "aggiunte": []}	154	[]	{}		1.00
440	Polpo Rosticciato	19.00	Secondi	\N	1		Pesce	{"base": [], "aggiunte": []}	155	[]	{}		1.00
405	Classic Burger	9.00	Panini	\N	1		Hamburger	{"base": [], "aggiunte": []}	120	[]	{}		1.00
406	Cheese Burger	10.00	Panini	\N	1		Hamburger	{"base": [], "aggiunte": []}	121	[]	{}		1.00
407	Bacon Burger	11.00	Panini	\N	1		Hamburger	{"base": [], "aggiunte": []}	122	[]	{}		1.00
408	BBQ Special	12.00	Panini	\N	1		Hamburger	{"base": [], "aggiunte": []}	123	[]	{}		1.00
409	Egg Burger	12.50	Panini	\N	1		Hamburger	{"base": [], "aggiunte": []}	124	[]	{}		1.00
410	Monster Burger	16.00	Panini	\N	1		Hamburger	{"base": [], "aggiunte": []}	125	[]	{}		1.00
411	Chicken Sandwich	10.00	Panini	\N	1		Pollo	{"base": [], "aggiunte": []}	126	[]	{}		1.00
412	Grilled Chicken	10.00	Panini	\N	1		Pollo	{"base": [], "aggiunte": []}	127	[]	{}		1.00
413	Pulled Pork	12.00	Panini	\N	1		Gourmet	{"base": [], "aggiunte": []}	128	[]	{}		1.00
414	Hot Dog XXL	8.00	Panini	\N	1		Gourmet	{"base": [], "aggiunte": []}	129	[]	{}		1.00
415	Veggie Burger	11.00	Panini	\N	1		Vegetariani	{"base": [], "aggiunte": []}	130	[]	{}		1.00
385	Margherita	6.50	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	100	[]	{}		1.00
386	Marinara	5.00	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	101	[]	{}		1.00
387	Diavola	8.00	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	102	[]	{}		1.00
388	Napoletana	7.50	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	103	[]	{}		1.00
389	Capricciosa	9.00	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	104	[]	{}		1.00
390	4 Stagioni	9.00	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	105	[]	{}		1.00
391	Prosciutto e Funghi	8.50	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	106	[]	{}		1.00
392	Americana	8.50	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	107	[]	{}		1.00
393	Tonno e Cipolla	8.50	Pizzeria	\N	1		Classiche	{"base": [], "aggiunte": []}	108	[]	{}		1.00
394	4 Formaggi	9.00	Pizzeria	\N	1		Bianche	{"base": [], "aggiunte": []}	109	[]	{}		1.00
395	Ortolana	8.50	Pizzeria	\N	1		Bianche	{"base": [], "aggiunte": []}	110	[]	{}		1.00
396	Boscaiola	9.00	Pizzeria	\N	1		Bianche	{"base": [], "aggiunte": []}	111	[]	{}		1.00
397	Primavera	9.50	Pizzeria	\N	1		Bianche	{"base": [], "aggiunte": []}	112	[]	{}		1.00
398	Pistacchiosa	11.00	Pizzeria	\N	1		Bianche	{"base": [], "aggiunte": []}	113	[]	{}		1.00
399	Tartufata	13.00	Pizzeria	\N	1		Gourmet	{"base": [], "aggiunte": []}	114	[]	{}		1.00
417	Carbonara	11.00	Primi	\N	1		Carne	{"base": [], "aggiunte": []}	132	[]	{}		1.00
400	Calabrese	10.50	Pizzeria	\N	1		Gourmet	{"base": [], "aggiunte": []}	115	[]	{}		1.00
401	Carbonara	11.00	Pizzeria	\N	1		Gourmet	{"base": [], "aggiunte": []}	116	[]	{}		1.00
402	Norcina	12.00	Pizzeria	\N	1		Gourmet	{"base": [], "aggiunte": []}	117	[]	{}		1.00
403	Zola e Noci	10.00	Pizzeria	\N	1		Gourmet	{"base": [], "aggiunte": []}	118	[]	{}		1.00
404	Salmone	14.00	Pizzeria	\N	1		Gourmet	{"base": [], "aggiunte": []}	119	[]	{}		1.00
473	Verdure Grigliate	4.50	Contorni	\N	1			{"base": [], "aggiunte": []}	188	[]	{}		1.00
474	Insalata Mista	4.00	Contorni	\N	1			{"base": [], "aggiunte": []}	189	[]	{}		1.00
475	Patate al Forno	4.50	Contorni	\N	1			{"base": [], "aggiunte": []}	190	[]	{}		1.00
476	Cicoria Ripassata	5.00	Contorni	\N	1			{"base": [], "aggiunte": []}	191	[]	{}		1.00
477	Spinaci al Burro	4.50	Contorni	\N	1			{"base": [], "aggiunte": []}	192	[]	{}		1.00
478	Caesar Salad	10.00	Insalatone	\N	1			{"base": [], "aggiunte": []}	193	[]	{}		1.00
479	Greca	9.00	Insalatone	\N	1			{"base": [], "aggiunte": []}	194	[]	{}		1.00
480	Tonno	9.50	Insalatone	\N	1			{"base": [], "aggiunte": []}	195	[]	{}		1.00
458	Tiramisù	5.00	Dolci	\N	1		Casa	{"base": [], "aggiunte": []}	173	[]	{}		1.00
459	Panna Cotta	4.50	Dolci	\N	1		Casa	{"base": [], "aggiunte": []}	174	[]	{}		1.00
460	Cheesecake	5.50	Dolci	\N	1		Casa	{"base": [], "aggiunte": []}	175	[]	{}		1.00
461	Cuore Caldo	6.00	Dolci	\N	1		Casa	{"base": [], "aggiunte": []}	176	[]	{}		1.00
462	Sorbetto Limone	3.50	Dolci	\N	1		Casa	{"base": [], "aggiunte": []}	177	[]	{}		1.00
441	Acqua Naturale 0.5L	1.50	Bevande	\N	1		Acqua	{"base": [], "aggiunte": []}	156	[]	{}		1.00
442	Acqua Frizzante 0.5L	1.50	Bevande	\N	1		Acqua	{"base": [], "aggiunte": []}	157	[]	{}		1.00
443	Acqua Naturale 1L	2.50	Bevande	\N	1		Acqua	{"base": [], "aggiunte": []}	158	[]	{}		1.00
444	Acqua Frizzante 1L	2.50	Bevande	\N	1		Acqua	{"base": [], "aggiunte": []}	159	[]	{}		1.00
445	Coca Cola Lattina	3.00	Bevande	\N	1	33cl	Bibite	{"base": [], "aggiunte": []}	160	[]	{}		1.00
446	Coca Zero Lattina	3.00	Bevande	\N	1	33cl	Bibite	{"base": [], "aggiunte": []}	161	[]	{}		1.00
447	Fanta Lattina	3.00	Bevande	\N	1	33cl	Bibite	{"base": [], "aggiunte": []}	162	[]	{}		1.00
448	Sprite Lattina	3.00	Bevande	\N	1	33cl	Bibite	{"base": [], "aggiunte": []}	163	[]	{}		1.00
449	Tè Pesca	3.00	Bevande	\N	1	33cl	Bibite	{"base": [], "aggiunte": []}	164	[]	{}		1.00
450	Tè Limone	3.00	Bevande	\N	1	33cl	Bibite	{"base": [], "aggiunte": []}	165	[]	{}		1.00
451	Birra Spina Piccola	3.50	Bevande	\N	1	0.2L	Birre	{"base": [], "aggiunte": []}	166	[]	{}		1.00
452	Birra Spina Media	5.50	Bevande	\N	1	0.4L	Birre	{"base": [], "aggiunte": []}	167	[]	{}		1.00
453	Birra Bottiglia	4.00	Bevande	\N	1	33cl	Birre	{"base": [], "aggiunte": []}	168	[]	{}		1.00
454	Birra Artigianale	6.50	Bevande	\N	1	33cl	Birre	{"base": [], "aggiunte": []}	169	[]	{}		1.00
455	Espresso	1.20	Bevande	\N	1		Caffè	{"base": [], "aggiunte": []}	170	[]	{}		1.00
456	Cappuccino	2.00	Bevande	\N	1		Caffè	{"base": [], "aggiunte": []}	171	[]	{}		1.00
457	Amaro della Casa	3.50	Bevande	\N	1		Caffè	{"base": [], "aggiunte": []}	172	[]	{}		1.00
284	Chianti	25.00	Vini	\N	1	Classico toscano	Rossi	{"base": [], "aggiunte": []}	79	[]	{}		1.00
463	Chardonnay	20.00	Vini	\N	1		Bianchi	{"base": [], "aggiunte": []}	178	[]	{}		1.00
464	Falanghina	18.00	Vini	\N	1		Bianchi	{"base": [], "aggiunte": []}	179	[]	{}		1.00
465	Prosecco DOC	22.00	Vini	\N	1		Bianchi	{"base": [], "aggiunte": []}	180	[]	{}		1.00
466	Pinot Grigio	19.00	Vini	\N	1		Bianchi	{"base": [], "aggiunte": []}	181	[]	{}		1.00
218	Pallottole fumanti	5.00	Friggitoria	\N	1			{"base": ["Wurstel", "Patate"], "aggiunte": []}	12	[]	{}		1.00
222	Patate bacon cheddar	5.50	Friggitoria	\N	1			{"base": [], "aggiunte": []}	13	[]	{}		1.00
219	Anelli di cipolla	3.50	Friggitoria	\N	1	6 pz		{"base": [], "aggiunte": []}	14	[]	{}		1.00
220	Jalapenos	6.00	Friggitoria	\N	1	4 pz		{"base": ["Peperoni con crema di formaggio"], "aggiunte": []}	15	[]	{}		1.00
221	Mix di verdure pastellate	5.00	Friggitoria	\N	1			{"base": [], "aggiunte": []}	16	[]	{}		1.00
206	Nachos	5.00	Friggitoria	\N	1	con salsa tex mex		{"base": ["mozzarella", "bufala", "pomodoro"], "aggiunte": [{"nome": "Bufala", "prezzo": 2}, {"nome": "Patate fritte", "prezzo": 3}, {"nome": "basilico", "prezzo": 1}]}	37	["Crostacei 🦐", "Arachidi 🥜", "Prodotto Surgelato/Abbattuto ❄️"]	{"de": {"nome": "", "descrizione": ""}, "en": {"nome": "", "descrizione": ""}}		1.00
416	Lasagna classica	10.00	Primi	\N	1		Carne	{"base": [], "aggiunte": []}	131	[]	{}		1.00
418	Amatriciana	10.00	Primi	\N	1		Carne	{"base": [], "aggiunte": []}	133	[]	{}		1.00
419	Gricia	10.00	Primi	\N	1		Carne	{"base": [], "aggiunte": []}	134	[]	{}		1.00
420	Pappardelle Cinghiale	13.00	Primi	\N	1		Carne	{"base": [], "aggiunte": []}	135	[]	{}		1.00
421	Tagliatelle Ragù	9.00	Primi	\N	1		Carne	{"base": [], "aggiunte": []}	136	[]	{}		1.00
422	Spaghetti allo Scoglio	15.00	Primi	\N	1		Pesce	{"base": [], "aggiunte": []}	137	[]	{}		1.00
423	Risotto Pescatora	16.00	Primi	\N	1		Pesce	{"base": [], "aggiunte": []}	138	[]	{}		1.00
424	Linguine Astice	22.00	Primi	\N	1		Pesce	{"base": [], "aggiunte": []}	139	[]	{}		1.00
425	Gnocchi Gamberi	14.00	Primi	\N	1		Pesce	{"base": [], "aggiunte": []}	140	[]	{}		1.00
426	Ravioli Ricotta/Spinaci	10.00	Primi	\N	1		Terra	{"base": [], "aggiunte": []}	141	[]	{}		1.00
427	Risotto Funghi	12.00	Primi	\N	1		Terra	{"base": [], "aggiunte": []}	142	[]	{}		1.00
428	Orecchiette Cime	10.00	Primi	\N	1		Terra	{"base": [], "aggiunte": []}	143	[]	{}		1.00
481	Carne	5.00	Friggitoria		1	a		{"base": [], "aggiunte": []}	196	["Glutine 🌾"]	{"de": {"nome": "", "descrizione": ""}, "en": {"nome": "", "descrizione": ""}}	/hg	1.00
283	Chardonnay	20.00	Vini	\N	1		Bianchi	{"base": [], "aggiunte": []}	78	[]	{}		1.00
467	Vermentino	21.00	Vini	\N	1		Bianchi	{"base": [], "aggiunte": []}	182	[]	{}		1.00
468	Chianti Classico	25.00	Vini	\N	1		Rossi	{"base": [], "aggiunte": []}	183	[]	{}		1.00
469	Nero d'Avola	19.00	Vini	\N	1		Rossi	{"base": [], "aggiunte": []}	184	[]	{}		1.00
470	Montepulciano	20.00	Vini	\N	1		Rossi	{"base": [], "aggiunte": []}	185	[]	{}		1.00
471	Merlot	18.00	Vini	\N	1		Rossi	{"base": [], "aggiunte": []}	186	[]	{}		1.00
472	Barbera	20.00	Vini	\N	1		Rossi	{"base": [], "aggiunte": []}	187	[]	{}		1.00
\.


--
-- Data for Name: ristoranti; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ristoranti (id, nome, slug, email_titolare, password, ordini_abilitati, servizio_attivo, logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, font_style, email, telefono, account_attivo, cucina_super_active, pw_cassa, pw_cucina, pw_bar, pw_pizzeria, ip_wifi_locale, colore_card, colore_btn, colore_btn_text, colore_border, colore_tavolo_bg, colore_tavolo_text, colore_carrello_bg, colore_carrello_text, colore_checkout_bg, colore_checkout_text, colore_modal_bg, colore_modal_text, info_footer, url_allergeni, colore_footer_text, dimensione_footer, allineamento_footer, url_menu_giorno, url_menu_pdf, pw_haccp, dati_fiscali, nascondi_euro, prezzo_coperto) FROM stdin;
1	Stark Enterprise	pizzeria-stark	tony@stark.it	12345	t	f	https://res.cloudinary.com/di4yvcbmr/image/upload/v1767794034/menu-pizzeria/o99becnf8sbv9ib9trz3.jpg	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768217662/menu-app/pooxuwpnsmbmmho33ilz.jpg	#000	#ffffff	#050505	#fe0101	sans-serif	prova11@b.it	45676543	t	t	1234	1235	123	1234	\N	#fcfcfc	#030303	#faf9f9	#00faaf	#ffffff	#050505		#f50505	#050505	#41f500	#ffffff	#f20202	Coperto 3€	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768325916/menu-app/tzztjbiqgrazfmnp2htt.png	#f20707	12	center	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768348826/menu-app/sq8cueevg1drrxyuvaal.png	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768604182/menu-app/kxaxyhugtd5gkcjo7okj.pdf	1234	Stark Enterprise - P.IVA: 03439610795 - Corso Umberto I, 128 - Tel: 3519225262	f	3.00
2	Da Luigi	da-luigi	luigi@mario.it	123	t	t	\N	\N	#222222	#ffffff	#cccccc	#27ae60	sans-serif	prova11@a.it		t	t	1234	1234	1234	1234	\N	#ffffff	#27ae60	#ffffff	#e0e0e0							#ffffff	#000000			#888888	12	center			1234	\N	f	0.00
4	Prova22	prova33333	\N	Prova11	f	t	https://res.cloudinary.com/di4yvcbmr/image/upload/v1767717036/menu-pizzeria/ok50vdcnvwhtprdjama2.jpg	\N	#000000	#ffffff	#cccccc	#000000	'Courier New', monospace			t	t	1234	1234	1234	1234	\N	#ffffff	#27ae60	#ffffff	#e0e0e0							#ffffff	#000000			#888888	12	center			1234	\N	f	0.00
\.


--
-- Data for Name: staff_docs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.staff_docs (id, utente_id, tipo_doc, nome_file, url, data_caricamento) FROM stdin;
6	4	Contratto	haccp_assets (2).pdf	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768601700/menu-app/mfeoogptvf1bdvtj5a1k.pdf	2026-01-16 22:15:01.341174
7	4	Contratto	haccp_assets (1).pdf	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768603913/menu-app/sjkq3oc0vasdf97eeitv.pdf	2026-01-16 22:51:54.911122
8	1	Contratto	Allergeni.pdf	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768605045/menu-app/vecq5madwbjmcjvuxb6t.pdf	2026-01-16 23:10:47.369869
13	4	Contratto	Screenshot 2026-01-17 alle 00.11.00.png	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768606692/menu-app/fqmvagknay0smjhbmkv3.png	2026-01-16 23:38:14.097473
19	4	Contratto	Allergeni.pdf	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768609472/menu-app/yl4igi1ftl0krhtwkzcp.pdf	2026-01-17 00:24:33.60725
20	4	Contratto	Screenshot 2026-01-09 alle 03.11.02.png	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768609959/menu-app/xalnppwr6aogc0g53jno.png	2026-01-17 00:32:40.806624
21	4	Contratto	Allergeni.pdf	https://res.cloudinary.com/di4yvcbmr/image/upload/v1768609982/menu-app/lk9464nxltruyt2gtvr2.pdf	2026-01-17 00:33:04.157341
\.


--
-- Data for Name: utenti; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.utenti (id, nome, email, password, telefono, indirizzo, data_registrazione, ruolo, telefono_verificato, codice_otp, ristorante_id) FROM stdin;
1	Gianni	info@giovannicortese.it	Prova22	333		2026-01-09 04:07:17.531531	cliente	f	\N	1
3	Prova22	sss@s.it	123			2026-01-10 12:28:27.465517	admin	f	\N	1
4	Francesco	Pippo@a.it	123			2026-01-10 15:17:53.883391	cameriere	f	\N	1
5	aqasa	sxax@das.it	csdcsd			2026-01-10 15:22:22.490624	cameriere	f	\N	5
6	Prova 22	aaaaa@a.it	123	3442459351		2026-01-10 15:58:06.287528	cliente	f	\N	\N
2	franco	dwedweew@libe.it	111	111		2026-01-09 22:49:56.66546	cameriere	f	\N	1
8	Giovanni 	prova373728@live.com	123	33346464546		2026-01-10 19:26:41.068368	cliente	f	\N	\N
9	Paksh	im@jj.it	shshs	767		2026-01-10 19:54:35.229989	cliente	f	\N	\N
10	a	a@a.it	a	22		2026-01-10 22:15:59.666415	cliente	f	\N	\N
11	a	aa@a.it	a	2222		2026-01-14 21:45:06.446165	cliente	f	\N	\N
13	eee	s@a.it	a			2026-01-16 16:44:08.728958	cameriere	f	\N	1
12	Peppe	a@b.it	a			2026-01-16 16:42:04.582491	manager	f	\N	1
14	ss	ssss@a.it	a			2026-01-16 16:44:29.772192	pizzaiolo	f	\N	1
15	efs	sfss@l.it	a			2026-01-16 16:54:41.295805	lavapiatti	f	\N	1
\.


--
-- Name: categorie_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.categorie_id_seq', 74, true);


--
-- Name: haccp_assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.haccp_assets_id_seq', 8, true);


--
-- Name: haccp_cleaning_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.haccp_cleaning_id_seq', 4, true);


--
-- Name: haccp_labels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.haccp_labels_id_seq', 19, true);


--
-- Name: haccp_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.haccp_logs_id_seq', 55, true);


--
-- Name: haccp_merci_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.haccp_merci_id_seq', 10, true);


--
-- Name: haccp_ricette_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.haccp_ricette_id_seq', 4, true);


--
-- Name: haccp_ricette_ingredienti_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.haccp_ricette_ingredienti_id_seq', 9, true);


--
-- Name: ordini_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.ordini_id_seq', 210, true);


--
-- Name: playing_with_neon_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.playing_with_neon_id_seq', 150, true);


--
-- Name: prodotti_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.prodotti_id_seq', 496, true);


--
-- Name: ristoranti_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.ristoranti_id_seq', 5, true);


--
-- Name: staff_docs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.staff_docs_id_seq', 21, true);


--
-- Name: utenti_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.utenti_id_seq', 15, true);


--
-- Name: categorie categorie_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categorie
    ADD CONSTRAINT categorie_pkey PRIMARY KEY (id);


--
-- Name: haccp_assets haccp_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_assets
    ADD CONSTRAINT haccp_assets_pkey PRIMARY KEY (id);


--
-- Name: haccp_cleaning haccp_cleaning_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_cleaning
    ADD CONSTRAINT haccp_cleaning_pkey PRIMARY KEY (id);


--
-- Name: haccp_labels haccp_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_labels
    ADD CONSTRAINT haccp_labels_pkey PRIMARY KEY (id);


--
-- Name: haccp_logs haccp_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_logs
    ADD CONSTRAINT haccp_logs_pkey PRIMARY KEY (id);


--
-- Name: haccp_merci haccp_merci_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_merci
    ADD CONSTRAINT haccp_merci_pkey PRIMARY KEY (id);


--
-- Name: haccp_ricette_ingredienti haccp_ricette_ingredienti_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_ricette_ingredienti
    ADD CONSTRAINT haccp_ricette_ingredienti_pkey PRIMARY KEY (id);


--
-- Name: haccp_ricette haccp_ricette_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_ricette
    ADD CONSTRAINT haccp_ricette_pkey PRIMARY KEY (id);


--
-- Name: ordini ordini_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ordini
    ADD CONSTRAINT ordini_pkey PRIMARY KEY (id);


--
-- Name: playing_with_neon playing_with_neon_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.playing_with_neon
    ADD CONSTRAINT playing_with_neon_pkey PRIMARY KEY (id);


--
-- Name: prodotti prodotti_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prodotti
    ADD CONSTRAINT prodotti_pkey PRIMARY KEY (id);


--
-- Name: ristoranti ristoranti_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ristoranti
    ADD CONSTRAINT ristoranti_pkey PRIMARY KEY (id);


--
-- Name: ristoranti ristoranti_slug_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ristoranti
    ADD CONSTRAINT ristoranti_slug_key UNIQUE (slug);


--
-- Name: staff_docs staff_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_docs
    ADD CONSTRAINT staff_docs_pkey PRIMARY KEY (id);


--
-- Name: utenti unique_email; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.utenti
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- Name: utenti utenti_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.utenti
    ADD CONSTRAINT utenti_email_key UNIQUE (email);


--
-- Name: utenti utenti_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.utenti
    ADD CONSTRAINT utenti_pkey PRIMARY KEY (id);


--
-- Name: categorie categorie_ristorante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categorie
    ADD CONSTRAINT categorie_ristorante_id_fkey FOREIGN KEY (ristorante_id) REFERENCES public.ristoranti(id) ON DELETE CASCADE;


--
-- Name: haccp_ricette_ingredienti haccp_ricette_ingredienti_ricetta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_ricette_ingredienti
    ADD CONSTRAINT haccp_ricette_ingredienti_ricetta_id_fkey FOREIGN KEY (ricetta_id) REFERENCES public.haccp_ricette(id) ON DELETE CASCADE;


--
-- Name: haccp_ricette haccp_ricette_ristorante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.haccp_ricette
    ADD CONSTRAINT haccp_ricette_ristorante_id_fkey FOREIGN KEY (ristorante_id) REFERENCES public.ristoranti(id);


--
-- Name: ordini ordini_ristorante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ordini
    ADD CONSTRAINT ordini_ristorante_id_fkey FOREIGN KEY (ristorante_id) REFERENCES public.ristoranti(id) ON DELETE CASCADE;


--
-- Name: prodotti prodotti_ristorante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prodotti
    ADD CONSTRAINT prodotti_ristorante_id_fkey FOREIGN KEY (ristorante_id) REFERENCES public.ristoranti(id) ON DELETE CASCADE;


--
-- Name: staff_docs staff_docs_utente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_docs
    ADD CONSTRAINT staff_docs_utente_id_fkey FOREIGN KEY (utente_id) REFERENCES public.utenti(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict RyyIdif6pJEAVM1JzIBPDytJsmfnzr7dtDKWafHmt5O6tyRU3q2Y1S4biRXyzrw

