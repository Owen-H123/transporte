import { CONFIG } from "./config.js";
import { loadSheetData, parseCSV } from "./data.js";
import { applyOverrides, saveSiteOverride } from "./store.js";
import {
  refs, setTab, renderSyncWrap, renderError, showToast,
  renderSuggestions, renderSiteCard, renderConfigSuggestions, renderConfigForm, renderValidationSummary
} from "./ui.js";

const state = { baseSites: [], lastSync: null };
const el = refs();
const welcomeOverlay = document.getElementById("welcome-overlay");

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

function runSearch() {
  const q = el.searchInput.value.trim().toUpperCase();
  if (!q) {
    el.searchResults.innerHTML = "";
    return;
  }
  const all = mergedSites();
  const exact = all.find((s) => s.id === q);
  if (exact) {
    renderSiteCard(el, exact, copyText, goConfigFromSearch);
    return;
  }
  const picks = all.filter((s) => s.id.includes(q) || s.nombre.toUpperCase().includes(q)).slice(0, 8);
  renderSuggestions(el, picks, (id) => {
    el.searchInput.value = id;
    runSearch();
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  const picks = all.filter((s) => s.id.includes(q) || s.nombre.toUpperCase().includes(q)).slice(0, 6);
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
  el.searchInput.addEventListener("input", runSearch);
  el.configInput.addEventListener("input", runConfigSearch);
}

bindEvents();
refreshData();
setTimeout(hideWelcomeOverlay, 1400);
