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
  return baseSites.map((site) => (overrides[site.id] ? { ...site, ...overrides[site.id] } : { ...site }));
}

export function saveSiteOverride(siteId, folio, llaves) {
  const overrides = loadOverrides();
  if (!overrides[siteId]) overrides[siteId] = {};
  overrides[siteId].folio = folio;
  const zoneKey = llaves.toUpperCase();
  if (LLAVES_MAP[zoneKey]) {
    overrides[siteId].llaves = zoneKey;
    overrides[siteId].llaves_zona = zoneKey;
    overrides[siteId].llaves_full = LLAVES_MAP[zoneKey];
  } else {
    overrides[siteId].llaves = llaves;
    overrides[siteId].llaves_zona = llaves;
    overrides[siteId].llaves_full = llaves;
  }
  saveOverrides(overrides);
}

export function loadSheetSnapshot() {
  try { return JSON.parse(localStorage.getItem(CONFIG.sheetSnapshotKey) || "null"); }
  catch { return null; }
}

export function saveSheetSnapshot(snapshot) {
  localStorage.setItem(CONFIG.sheetSnapshotKey, JSON.stringify(snapshot));
}
