import { CONFIG } from "./config.js";
import { loadSheetData, parseCSV } from "./data.js";
import { applyOverrides, loadSheetSnapshot, saveSheetSnapshot, saveSiteOverride } from "./store.js";
import {
  refs,
  setTab,
  renderSyncWrap,
  renderOverview,
  renderError,
  showToast,
  renderSearchMeta,
  renderSuggestions,
  renderSiteCard,
  renderPendingMeta,
  renderPendingList,
  renderConfigSuggestions,
  renderConfigForm,
  llavesText,
} from "./ui.js";

window.__appBooted = true;

const state = {
  baseSites: [],
  lastSync: null,
  lastStats: null,
  lastDiff: null,
  searchPage: 1,
  pageSize: 8,
  lastSearchList: [],
  searchCursor: -1,
};

const el = refs();
const pendingLabels = {
  all: "cualquier pendiente",
  no-folio: "sin folio",
  no-llaves: "sin llaves",
  no-coords: "sin coordenadas",
};

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function mergedSites() {
  return applyOverrides(state.baseSites);
}

function siteById(id) {
  return mergedSites().find((site) => site.id === id) || null;
}

function copyText(text, message = "Copiado") {
  navigator.clipboard.writeText(text).then(() => showToast(el, message)).catch(() => {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    showToast(el, message);
  });
}

function smartMatches(query, site) {
  const qText = normalizeText(query);
  const qCode = normalizeCode(query);
  const id = normalizeText(site.id);
  const idCode = normalizeCode(site.id);
  const name = normalizeText(site.nombre);
  if (!qText) return false;
  if (id.includes(qText) || name.includes(qText) || idCode.includes(qCode)) return true;
  if (qCode.length >= 4 && levenshtein(qCode, idCode.slice(0, qCode.length)) <= 1) return true;
  if (qText.length >= 4 && levenshtein(qText, name.slice(0, qText.length)) <= 2) return true;
  return false;
}

function compareRank(query, site) {
  const qCode = normalizeCode(query);
  const qText = normalizeText(query);
  const siteCode = normalizeCode(site.id);
  const siteName = normalizeText(site.nombre);
  if (siteCode === qCode) return 0;
  if (siteCode.startsWith(qCode)) return 1;
  if (siteName.startsWith(qText)) return 2;
  if (siteCode.includes(qCode)) return 3;
  return 4;
}

function getPendingIssues(site) {
  const issues = [];
  if (!site.folio) issues.push("no-folio");
  if (!site.llaves) issues.push("no-llaves");
  if (!site.hasValidCoords) issues.push("no-coords");
  return issues;
}

function pendingMatches(site, filter) {
  const issues = getPendingIssues(site);
  if (filter === "all") return issues.length > 0;
  return issues.includes(filter);
}

function buildSnapshot(sites) {
  const entries = {};
  sites.forEach((site) => {
    entries[site.id] = [
      site.nombre || "",
      site.tipo || "",
      site.lat ?? "",
      site.lon ?? "",
      site.dpto || "",
      site.direccion || "",
      site.estatus || "",
      site.llaves || "",
      site.folio || "",
    ].join("|");
  });
  return { savedAt: new Date().toISOString(), entries };
}

function compareSnapshots(previousSnapshot, currentSites) {
  if (!previousSnapshot?.entries) return null;
  const currentSnapshot = buildSnapshot(currentSites);
  const previousEntries = previousSnapshot.entries;
  const currentEntries = currentSnapshot.entries;
  const previousIds = Object.keys(previousEntries);
  const currentIds = Object.keys(currentEntries);
  const entered = currentIds.filter((id) => !previousEntries[id]).sort();
  const removed = previousIds.filter((id) => !currentEntries[id]).sort();
  const changed = currentIds.filter((id) => previousEntries[id] && previousEntries[id] !== currentEntries[id]).sort();
  return { entered, removed, changed };
}

function updateHeader() {
  const sites = mergedSites();
  const pendingCount = sites.filter((site) => getPendingIssues(site).length > 0).length;
  const syncText = state.lastSync
    ? state.lastSync.toLocaleTimeString(CONFIG.locale, { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  el.subtitle.textContent = `${sites.length} sitios | ${pendingCount} pendientes | Actualizado ${syncText}`;
}

function refreshOverview() {
  if (!state.lastStats) return;
  renderOverview(el, state.lastStats, state.lastDiff, mergedSites());
  updateHeader();
}

function clearSearchResults() {
  state.lastSearchList = [];
  state.searchCursor = -1;
  el.searchResults.innerHTML = "";
  renderSearchMeta(el, "", 0, false);
}

function openSite(siteId) {
  const site = siteById(siteId);
  if (!site) return;
  el.searchInput.value = site.id;
  state.lastSearchList = [site];
  state.searchCursor = 0;
  renderSearchMeta(el, site.id, 1, true);
  renderSiteCard(el, site, copyText, goConfigFromSearch);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function runSearch() {
  const query = el.searchInput.value.trim();
  if (!query) {
    clearSearchResults();
    return;
  }

  const all = mergedSites();
  const exact = all.find((site) => normalizeCode(site.id) === normalizeCode(query));
  if (exact) {
    openSite(exact.id);
    return;
  }

  const picks = all
    .filter((site) => smartMatches(query, site))
    .sort((left, right) => {
      const rankDiff = compareRank(query, left) - compareRank(query, right);
      if (rankDiff !== 0) return rankDiff;
      return left.id.localeCompare(right.id);
    });

  state.lastSearchList = picks;
  if (!picks.length) {
    state.searchCursor = -1;
    renderSearchMeta(el, query, 0, false);
    renderSuggestions(el, picks, 1, state.pageSize, state.searchCursor, openSite, () => {});
    return;
  }

  if (state.searchCursor < 0 || state.searchCursor >= picks.length) state.searchCursor = 0;
  state.searchPage = Math.floor(state.searchCursor / state.pageSize) + 1;
  renderSearchMeta(el, query, picks.length, true);
  renderSuggestions(el, picks, state.searchPage, state.pageSize, state.searchCursor, openSite, (nextPage) => {
    state.searchPage = nextPage;
    state.searchCursor = Math.min((nextPage - 1) * state.pageSize, Math.max(0, state.lastSearchList.length - 1));
    runSearch();
  });
}

function moveSearchCursor(direction) {
  if (!state.lastSearchList.length) return;
  if (state.searchCursor < 0) state.searchCursor = 0;
  else state.searchCursor = Math.max(0, Math.min(state.lastSearchList.length - 1, state.searchCursor + direction));
  state.searchPage = Math.floor(state.searchCursor / state.pageSize) + 1;
  renderSearchMeta(el, el.searchInput.value.trim(), state.lastSearchList.length, true);
  renderSuggestions(el, state.lastSearchList, state.searchPage, state.pageSize, state.searchCursor, openSite, (nextPage) => {
    state.searchPage = nextPage;
    state.searchCursor = Math.min((nextPage - 1) * state.pageSize, Math.max(0, state.lastSearchList.length - 1));
    runSearch();
  });
}

function exportSitesToCsv(sites, filename) {
  if (!sites.length) return;
  const headers = ["id", "nombre", "tipo", "dpto", "direccion", "estatus", "folio", "llaves", "lat", "lon", "hasValidCoords"];
  const rows = [
    headers.join(","),
    ...sites.map((site) => headers.map((key) => {
      const raw = key === "llaves" ? llavesText(site) : site[key];
      const value = String(raw ?? "").replace(/"/g, '""');
      return `"${value}"`;
    }).join(",")),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(el, "CSV exportado");
}

function runPendingView() {
  const filter = el.pendingFilter.value;
  const list = mergedSites().filter((site) => pendingMatches(site, filter));
  renderPendingMeta(el, pendingLabels[filter], list.length);
  renderPendingList(el, list, (siteId) => {
    goConfigFromSearch(siteId);
  });
}

function runConfigSearch() {
  const query = el.configInput.value.trim();
  el.configForm.innerHTML = "";
  if (!query) {
    el.configSuggestions.innerHTML = "";
    return;
  }
  const all = mergedSites();
  const exact = all.find((site) => normalizeCode(site.id) === normalizeCode(query));
  if (exact) {
    el.configSuggestions.innerHTML = "";
    renderConfigForm(el, exact, onSaveConfig);
    return;
  }
  const picks = all.filter((site) => smartMatches(query, site)).slice(0, 12);
  renderConfigSuggestions(el, picks, (siteId) => {
    const site = siteById(siteId);
    if (!site) return;
    el.configSuggestions.innerHTML = "";
    renderConfigForm(el, site, onSaveConfig);
  });
}

function onSaveConfig(siteId, folio, llaves) {
  saveSiteOverride(siteId, folio, llaves);
  refreshOverview();
  runPendingView();
  if (el.searchInput.value.trim()) runSearch();
  if (el.configInput.value.trim()) runConfigSearch();
  showToast(el, "Cambios guardados");
}

function goConfigFromSearch(siteId) {
  setTab("config");
  el.configInput.value = siteId;
  runConfigSearch();
}

async function refreshData() {
  renderSyncWrap(el, refreshData, true);
  try {
    const csvText = await loadSheetData();
    const parsed = parseCSV(csvText);
    if (!parsed.sites.length) throw new Error("CSV cargado, pero sin filas utilizables.");
    const previousSnapshot = loadSheetSnapshot();
    state.baseSites = parsed.sites;
    state.lastStats = parsed.stats;
    state.lastDiff = compareSnapshots(previousSnapshot, parsed.sites);
    saveSheetSnapshot(buildSnapshot(parsed.sites));
    state.lastSync = new Date();
    el.loadWrap.classList.add("hidden");
    el.searchWrap.classList.remove("hidden");
    renderSyncWrap(el, refreshData, false);
    refreshOverview();
    runPendingView();
    if (el.searchInput.value.trim()) runSearch();
    else clearSearchResults();
    if (el.configInput.value.trim()) runConfigSearch();
  } catch (error) {
    renderSyncWrap(el, refreshData, false);
    el.loadWrap.classList.remove("hidden");
    renderError(el, error?.message || "Error desconocido", refreshData);
    el.subtitle.textContent = "Error de carga";
  }
}

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
  el.searchInput.addEventListener("input", () => {
    state.searchPage = 1;
    state.searchCursor = 0;
    runSearch();
  });
  el.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSearchCursor(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSearchCursor(-1);
    } else if (event.key === "Enter") {
      if (!state.lastSearchList.length) return;
      event.preventDefault();
      const picked = state.lastSearchList[Math.max(0, state.searchCursor)];
      if (picked) openSite(picked.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      el.searchInput.value = "";
      clearSearchResults();
    }
  });
  el.clearSearch.addEventListener("click", () => {
    el.searchInput.value = "";
    clearSearchResults();
  });
  el.exportSearch.addEventListener("click", () => {
    if (!state.lastSearchList.length) return;
    exportSitesToCsv(state.lastSearchList, "resultados-buscador.csv");
  });
  el.pendingFilter.addEventListener("change", runPendingView);
  el.exportPending.addEventListener("click", () => {
    const list = mergedSites().filter((site) => pendingMatches(site, el.pendingFilter.value));
    exportSitesToCsv(list, `pendientes-${el.pendingFilter.value}.csv`);
  });
  el.configInput.addEventListener("input", runConfigSearch);
}

bindEvents();
setTab("search");
clearSearchResults();
refreshData();
