// client/src/translations.js

export const flags = {
    it: "🇮🇹", en: "🇬🇧", fr: "🇫🇷", de: "🇩🇪", 
    es: "🇪🇸", pt: "🇵🇹", pl: "🇵🇱", ru: "🇷🇺"
};

export const dictionary = {
    it: {
        ingredients: "Ingredienti", allergens: "Allergeni", add: "AGGIUNGI", modify: "MODIFICA",
        total: "Totale", cart: "Carrello", empty_cart: "Il carrello è vuoto", see_order: "VEDI ORDINE",
        confirm: "CONFERMA E INVIA", back: "Torna al Menu", frozen: "Prodotto Surgelato/Abbattuto",
        others: "Altri Piatti", summary: "Riepilogo Ordine", order_list: "Lista Cameriere"
    },
    en: {
        ingredients: "Ingredients", allergens: "Allergens", add: "ADD", modify: "EDIT",
        total: "Total", cart: "Cart", empty_cart: "Cart is empty", see_order: "VIEW ORDER",
        confirm: "CONFIRM ORDER", back: "Back to Menu", frozen: "Frozen Product",
        others: "Other Dishes", summary: "Order Summary", order_list: "Waiter List"
    },
    fr: {
        ingredients: "Ingrédients", allergens: "Allergènes", add: "AJOUTER", modify: "MODIFIER",
        total: "Total", cart: "Panier", empty_cart: "Le panier est vide", see_order: "VOIR COMMANDE",
        confirm: "CONFIRMER", back: "Retour au menu", frozen: "Produit Surgelé",
        others: "Autres Plats", summary: "Résumé de la commande", order_list: "Liste Serveur"
    },
    de: {
        ingredients: "Zutaten", allergens: "Allergene", add: "HINZUFÜGEN", modify: "ÄNDERN",
        total: "Gesamt", cart: "Warenkorb", empty_cart: "Warenkorb ist leer", see_order: "BESTELLUNG ANSEHEN",
        confirm: "BESTÄTIGEN", back: "Zurück zum Menü", frozen: "Tiefkühlprodukt",
        others: "Andere Gerichte", summary: "Bestellübersicht", order_list: "Kellnerliste"
    },
    es: {
        ingredients: "Ingredientes", allergens: "Alérgenos", add: "AÑADIR", modify: "MODIFICAR",
        total: "Total", cart: "Carrito", empty_cart: "El carrito está vacío", see_order: "VER PEDIDO",
        confirm: "CONFIRMAR", back: "Volver al menú", frozen: "Producto Congelado",
        others: "Otros Platos", summary: "Resumen del pedido", order_list: "Lista Camarero"
    },
    pt: {
        ingredients: "Ingredientes", allergens: "Alergénios", add: "ADICIONAR", modify: "MODIFICAR",
        total: "Total", cart: "Carrinho", empty_cart: "O carrinho está vazio", see_order: "VER PEDIDO",
        confirm: "CONFIRMAR", back: "Voltar ao menu", frozen: "Produto Congelado",
        others: "Outros Pratos", summary: "Resumo do pedido", order_list: "Lista Garçom"
    },
    pl: {
        ingredients: "Składniki", allergens: "Alergeny", add: "DODAJ", modify: "ZMIEŃ",
        total: "Suma", cart: "Koszyk", empty_cart: "Koszyk jest pusty", see_order: "ZOBACZ ZAMÓWIENIE",
        confirm: "POTWIERDŹ", back: "Powrót do menu", frozen: "Produkt Mrożony",
        others: "Inne Dania", summary: "Podsumowanie zamówienia", order_list: "Lista Kelnera"
    },
    ru: {
        ingredients: "Ингредиенты", allergens: "Аллергены", add: "ДОБАВИТЬ", modify: "ИЗМЕНИТЬ",
        total: "Итого", cart: "Корзина", empty_cart: "Корзина пуста", see_order: "ПОСМОТРЕТЬ ЗАКАЗ",
        confirm: "ПОДТВЕРДИТЬ", back: "Вернуться в меню", frozen: "Замороженный продукт",
        others: "Другие блюда", summary: "Сводка заказа", order_list: "Список официанта"
    }
};

export const getContent = (item, field, lang) => {
    if (!item) return "";
    if (lang === 'it') return item[field]; 
    if (item.traduzioni) {
        let trads = item.traduzioni;
        if (typeof trads === 'string') {
            try { trads = JSON.parse(trads); } catch(e) { return item[field]; }
        }
        if (trads[lang] && trads[lang][field]) {
            return trads[lang][field];
        }
    }
    return item[field]; 
};