import { CONFIG, LLAVES_MAP } from "./config.js";

export function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(CONFIG.overridesKey) || "{}"); }
  catch { return {}; }
}

export function saveOverrides(data) {
  localStorage.setItem(CONFIG.overridesKey, JSON.stringify(data));
}

export function applyOverrides(baseSites) {
  const overrides = loadOverrides();
  return baseSites.map((site) => overrides[site.id] ? { ...site, ...overrides[site.id] } : { ...site });
}

export function saveSiteOverride(siteId, folio, llaves) {
  const overrides = loadOverrides();
  if (!overrides[siteId]) overrides[siteId] = {};
  overrides[siteId].folio = folio;
  const zona = llaves.toUpperCase();
  if (LLAVES_MAP[zona]) {
    overrides[siteId].llaves = zona;
    overrides[siteId].llaves_zona = zona;
    overrides[siteId].llaves_full = LLAVES_MAP[zona];
  } else {
    overrides[siteId].llaves = llaves;
    overrides[siteId].llaves_zona = llaves;
    overrides[siteId].llaves_full = llaves;
  }
  saveOverrides(overrides);
}
