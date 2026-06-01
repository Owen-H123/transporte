import { CONFIG, LLAVES_MAP, SHEET_URLS } from "./config.js";

export function splitCSVLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) { out.push(current); current = ""; }
    else current += c;
  }
  out.push(current);
  return out;
}

export function parseCSV(text) {
  const lines = text.split("\n");
  const sites = [];
  const seenIds = new Set();
  const stats = {
    totalRows: Math.max(lines.length - 2, 0),
    validRows: 0,
    skippedNoId: 0,
    skippedNoCoords: 0,
    skippedBadCoords: 0,
    skippedOutOfRange: 0,
    skippedDuplicateId: 0,
  };
  for (let i = 2; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const id = (cols[0] || "").trim();
    if (!id) { stats.skippedNoId++; continue; }
    if (!cols[9] || !cols[10]) { stats.skippedNoCoords++; continue; }
    const lat = Number.parseFloat(cols[9]);
    const lon = Number.parseFloat(cols[10]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) { stats.skippedBadCoords++; continue; }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) { stats.skippedOutOfRange++; continue; }
    if (seenIds.has(id)) { stats.skippedDuplicateId++; continue; }
    seenIds.add(id);
    const llaves = (cols[26] || "").trim();
    const folio = (cols[30] || "").trim() || (cols[31] || "").trim();
    sites.push({
      id,
      nombre: (cols[2] || "").trim().replace(/_/g, " "),
      tipo: (cols[5] || "").trim(),
      lat, lon,
      dpto: (cols[13] || "").trim(),
      direccion: (cols[15] || "").trim(),
      estatus: (cols[20] || "").trim(),
      llaves,
      llaves_zona: llaves,
      llaves_full: LLAVES_MAP[llaves] || llaves,
      folio,
    });
    stats.validRows++;
  }
  return { sites, stats };
}

export async function loadSheetData() {
  if (window.location.protocol === "file:") {
    throw new Error("CORS por file://. Abre via http://localhost.");
  }
  let lastError = "No se pudo conectar";
  for (const buildUrl of SHEET_URLS) {
    const url = buildUrl(CONFIG);
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) {
        lastError = `HTTP ${resp.status} (${url.includes("/gviz/") ? "gviz" : "export"})`;
        continue;
      }
      const text = await resp.text();
      if (!text || !text.trim()) {
        lastError = "CSV vacio";
        continue;
      }
      return text;
    } catch (e) {
      lastError = e?.message || "Error de red/CORS";
    }
  }
  throw new Error(lastError);
}
