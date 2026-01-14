// client/src/translations.js
export const dictionary = {
    it: {
        ingredients: "Ingredienti",
        allergens: "Allergeni",
        add: "AGGIUNGI",
        modify: "MODIFICA",
        total: "Totale",
        cart: "Carrello",
        empty_cart: "Il carrello è vuoto",
        see_order: "VEDI ORDINE",
        confirm: "CONFERMA E INVIA",
        back: "Torna al Menu",
        frozen: "Prodotto Surgelato/Abbattuto",
        course_1: "1ª PORTATA",
        course_2: "2ª PORTATA",
        course_3: "3ª PORTATA",
        course_4: "DESSERT",
        others: "Altri Piatti"
    },
    en: {
        ingredients: "Ingredients",
        allergens: "Allergens",
        add: "ADD",
        modify: "EDIT",
        total: "Total",
        cart: "Cart",
        empty_cart: "Cart is empty",
        see_order: "VIEW ORDER",
        confirm: "CONFIRM ORDER",
        back: "Back to Menu",
        frozen: "Frozen Product",
        course_1: "STARTERS / 1ST COURSE",
        course_2: "MAIN COURSE",
        course_3: "SECOND COURSE",
        course_4: "DESSERT",
        others: "Other Dishes"
    }
};

// Funzione Helper per ottenere il testo dinamico (DB)
export const getContent = (item, field, lang) => {
    if (!item) return "";
    if (lang === 'it') return item[field]; // Default
    
    // Controlla traduzione DB
    if (item.traduzioni && item.traduzioni[lang] && item.traduzioni[lang][field]) {
        return item.traduzioni[lang][field];
    }
    
    return item[field]; // Fallback italiano
};