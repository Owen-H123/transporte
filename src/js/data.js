import { CONFIG, LLAVES_MAP, SHEET_URLS } from "./config.js";

const REQUIRED_COLUMN_INDEXES = [0, 2, 5, 9, 10, 13, 15, 20, 26, 30, 31];

export function splitCSVLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function maxRequiredIndex() {
  return Math.max(...REQUIRED_COLUMN_INDEXES);
}

export function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.trim().length > 0);
  const sites = [];
  const seenIds = new Set();
  const headerRows = lines.slice(0, 2).map((line) => splitCSVLine(line));
  const stats = {
    totalRows: Math.max(lines.length - 2, 0),
    loadedRows: 0,
    skippedNoId: 0,
    skippedDuplicateId: 0,
    rowsWithoutCoords: 0,
    rowsWithBadCoords: 0,
    rowsOutOfRange: 0,
    rowsInvalidIdFormat: 0,
    shortRowCount: 0,
    duplicateIds: [],
    invalidCoordIds: [],
    outOfRangeIds: [],
    invalidIdFormatIds: [],
    shortRowIds: [],
    missingColumns: [],
    headerPreview: headerRows.map((row) => row.join(" | ")),
  };

  const headerCols = headerRows[1] || headerRows[0] || [];
  REQUIRED_COLUMN_INDEXES.forEach((index) => {
    if (!headerCols[index]) stats.missingColumns.push(index + 1);
  });

  for (let i = 2; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const id = (cols[0] || "").trim().toUpperCase();
    if (!id) {
      stats.skippedNoId++;
      continue;
    }
    if (seenIds.has(id)) {
      stats.skippedDuplicateId++;
      stats.duplicateIds.push(id);
      continue;
    }
    seenIds.add(id);

    if (cols.length <= maxRequiredIndex()) {
      stats.shortRowCount++;
      stats.shortRowIds.push(id);
    }

    if (!CONFIG.idPattern.test(id)) {
      stats.rowsInvalidIdFormat++;
      stats.invalidIdFormatIds.push(id);
    }

    let lat = null;
    let lon = null;
    let hasValidCoords = false;
    if (!cols[9] || !cols[10]) {
      stats.rowsWithoutCoords++;
    } else {
      const parsedLat = Number.parseFloat(cols[9]);
      const parsedLon = Number.parseFloat(cols[10]);
      if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
        stats.rowsWithBadCoords++;
        stats.invalidCoordIds.push(id);
      } else if (parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
        stats.rowsOutOfRange++;
        stats.outOfRangeIds.push(id);
      } else {
        lat = parsedLat;
        lon = parsedLon;
        hasValidCoords = true;
      }
    }

    const llaves = (cols[26] || "").trim();
    const folio = (cols[30] || "").trim() || (cols[31] || "").trim();
    sites.push({
      id,
      nombre: (cols[2] || "").trim().replace(/_/g, " "),
      tipo: (cols[5] || "").trim(),
      lat,
      lon,
      hasValidCoords,
      dpto: (cols[13] || "").trim(),
      direccion: (cols[15] || "").trim(),
      estatus: (cols[20] || "").trim(),
      llaves,
      llaves_zona: llaves,
      llaves_full: LLAVES_MAP[llaves] || llaves,
      folio,
    });
    stats.loadedRows++;
  }

  return { sites, stats };
}

export async function loadSheetData() {
  if (window.location.protocol === "file:") {
    throw new Error("CORS por file://. Abre via http://localhost.");
  }
  const requests = SHEET_URLS.map((buildUrl) => {
    const url = buildUrl(CONFIG);
    return new Promise(async (resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const resp = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!resp.ok) {
          reject(new Error(`HTTP ${resp.status} (${url.includes("/gviz/") ? "gviz" : "export"})`));
          return;
        }
        const csvText = await resp.text();
        if (!csvText || !csvText.trim()) {
          reject(new Error("CSV vacio"));
          return;
        }
        resolve(csvText);
      } catch (error) {
        if (error?.name === "AbortError") reject(new Error("Tiempo de espera agotado (5s)"));
        else reject(new Error(error?.message || "Error de red/CORS"));
      } finally {
        clearTimeout(timer);
      }
    });
  });
  try {
    return await Promise.any(requests);
  } catch {
    throw new Error("No se pudo conectar al Sheet (export/gviz).");
  }
}
