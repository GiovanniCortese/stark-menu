// client/src/components/menu/menuUtils.js

export const getSafeVariants = (prodotto) => {
  if (!prodotto) return { base: [], aggiunte: [] };
  try {
    const v =
      typeof prodotto.varianti === "string"
        ? JSON.parse(prodotto.varianti || "{}")
        : prodotto.varianti || {};
    return {
      base: Array.isArray(v.base) ? v.base : [],
      aggiunte: Array.isArray(v.aggiunte) ? v.aggiunte : [],
    };
  } catch (e) {
    return { base: [], aggiunte: [] };
  }
};

export const getSafeAllergeni = (prodotto) => {
  if (!prodotto || !prodotto.allergeni) return [];
  try {
    if (Array.isArray(prodotto.allergeni)) return prodotto.allergeni;
    if (typeof prodotto.allergeni === "string")
      return JSON.parse(prodotto.allergeni);
    return [];
  } catch (e) {
    return [];
  }
};

export const getSafeCatVariants = (valore) => {
  if (!valore) return [];
  try {
    if (Array.isArray(valore)) return valore;
    if (typeof valore === "string") return JSON.parse(valore);
    return [];
  } catch (e) {
    return [];
  }
};

// Helper SEO / Social preview
export const updateMetaTags = (title, image, description) => {
  document.title = title;

  const setMeta = (property, content) => {
    if (!content) return;
    let element = document.querySelector(`meta[property="${property}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("property", property);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
  };

  setMeta("og:title", title);
  setMeta("og:description", description);
  setMeta("og:image", image);
  setMeta("og:type", "website");
};
