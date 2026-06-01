import { CONFIG } from "./config.js";
import { loadSheetData, parseCSV } from "./data.js";
import { applyOverrides, saveSiteOverride } from "./store.js";
import {
  refs, setTab, renderSyncWrap, renderError, showToast,
  renderSuggestions, renderSiteCard, renderConfigSuggestions, renderConfigForm, renderValidationSummary
} from "./ui.js";

window.__appBooted = true;

const state = { baseSites: [], lastSync: null, searchPage: 1, pageSize: 8, lastSearchList: [] };
const el = refs();
const welcomeOverlay = document.getElementById("welcome-overlay");

function normalizeText(v) {
  return (v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function levenshtein(a, b) {
  const m = a.length; const n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
    }
  }
  return dp[m][n];
}

function hideWelcomeOverlay() {
  if (!welcomeOverlay) return;
  welcomeOverlay.classList.add("opacity-0");
  setTimeout(() => welcomeOverlay.remove(), 520);
}

function mergedSites() {
  return applyOverrides(state.baseSites);
}

function siteById(id) {
  return mergedSites().find((s) => s.id === id) || null;
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast(el)).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(el);
  });
}

function smartMatches(q, site) {
  const qn = normalizeText(q);
  const id = normalizeText(site.id);
  const name = normalizeText(site.nombre);
  if (!qn) return false;
  if (id.includes(qn) || name.includes(qn)) return true;
  if (qn.length >= 4 && (levenshtein(qn, id.slice(0, qn.length)) <= 1 || levenshtein(qn, name.slice(0, qn.length)) <= 2)) return true;
  return false;
}

function runSearch() {
  const q = el.searchInput.value.trim();
  if (!q) {
    el.searchResults.innerHTML = "";
    state.lastSearchList = [];
    return;
  }
  const all = mergedSites();
  const qUpper = q.toUpperCase();
  const exact = all.find((s) => s.id === qUpper);
  if (exact) {
    renderSiteCard(el, exact, copyText, goConfigFromSearch);
    state.lastSearchList = [];
    return;
  }
  const picks = all.filter((s) => smartMatches(q, s));
  state.lastSearchList = picks;
  renderSuggestions(el, picks, state.searchPage, state.pageSize, (id) => {
    el.searchInput.value = id;
    runSearch();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, (nextPage) => {
    state.searchPage = nextPage;
    runSearch();
  });
}

function runConfigSearch() {
  const q = el.configInput.value.trim().toUpperCase();
  el.configForm.innerHTML = "";
  if (!q) {
    el.configSuggestions.innerHTML = "";
    return;
  }
  const all = mergedSites();
  const exact = all.find((s) => s.id === q);
  if (exact) {
    el.configSuggestions.innerHTML = "";
    renderConfigForm(el, exact, onSaveConfig);
    return;
  }
  const picks = all.filter((s) => smartMatches(q, s)).slice(0, 12);
  renderConfigSuggestions(el, picks, (id) => {
    const site = siteById(id);
    if (!site) return;
    el.configSuggestions.innerHTML = "";
    renderConfigForm(el, site, onSaveConfig);
  });
}

function onSaveConfig(siteId, folio, llaves) {
  saveSiteOverride(siteId, folio, llaves);
  showToast(el);
  if (el.searchInput.value.trim().toUpperCase() === siteId) {
    const current = siteById(siteId);
    if (current) renderSiteCard(el, current, copyText, goConfigFromSearch);
  }
}

function goConfigFromSearch(siteId) {
  setTab("config");
  el.configInput.value = siteId;
  runConfigSearch();
}

async function refreshData() {
  renderSyncWrap(el, refreshData, true);
  try {
    const text = await loadSheetData();
    const parsed = parseCSV(text);
    if (!parsed.sites.length) throw new Error("CSV cargado, pero sin filas validas.");
    state.baseSites = parsed.sites;
    state.lastSync = new Date();
    el.subtitle.textContent = `${parsed.sites.length} sitios | Actualizado ${state.lastSync.toLocaleTimeString(CONFIG.locale, { hour: "2-digit", minute: "2-digit" })}`;
    el.loadWrap.classList.add("hidden");
    el.searchWrap.classList.remove("hidden");
    renderSyncWrap(el, refreshData, false);
    renderValidationSummary(el, parsed.stats);
    if (el.searchInput.value.trim()) runSearch();
  } catch (e) {
    renderSyncWrap(el, refreshData, false);
    el.loadWrap.classList.remove("hidden");
    renderError(el, e?.message || "Error desconocido", refreshData);
    el.subtitle.textContent = "Error de carga";
  }
}

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
  el.searchInput.addEventListener("input", () => { state.searchPage = 1; runSearch(); });
  el.configInput.addEventListener("input", runConfigSearch);
}

bindEvents();
refreshData();
setTimeout(hideWelcomeOverlay, 1400);
