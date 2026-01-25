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
export const updateMetaTags = (title, image, description, url) => {
  document.title = title;

  const setMetaByName = (name, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  const setMetaByProp = (property, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", property);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  // Base SEO
  setMetaByName("description", description);

  // Open Graph
  setMetaByProp("og:title", title);
  setMetaByProp("og:description", description);
  setMetaByProp("og:image", image);
  setMetaByProp("og:url", url);
  setMetaByProp("og:type", "website");
  setMetaByProp("og:site_name", "cosaedovemangiare.it");

  // Twitter
  setMetaByName("twitter:card", "summary_large_image");
  setMetaByName("twitter:title", title);
  setMetaByName("twitter:description", description);
  setMetaByName("twitter:image", image);
};

