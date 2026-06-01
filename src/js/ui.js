import { LLAVES_MAP } from "./config.js";

export function refs() {
  return {
    subtitle: document.getElementById("header-subtitle"),
    syncWrap: document.getElementById("sync-wrap"),
    loadWrap: document.getElementById("load-wrap"),
    searchWrap: document.getElementById("search-wrap"),
    searchInput: document.getElementById("search-input"),
    searchResults: document.getElementById("search-results"),
    configInput: document.getElementById("config-input"),
    configSuggestions: document.getElementById("config-suggestions"),
    configForm: document.getElementById("config-form"),
    toast: document.getElementById("toast"),
  };
}

export function setTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.className = active
      ? "tab-btn px-3 py-2 rounded-md border text-sm font-semibold border-teal-600 text-teal-700 bg-teal-50"
      : "tab-btn px-3 py-2 rounded-md border text-sm font-semibold border-slate-300 text-slate-600 bg-white";
  });
  document.getElementById("panel-search").classList.toggle("hidden", tab !== "search");
  document.getElementById("panel-config").classList.toggle("hidden", tab !== "config");
}

export function renderSyncWrap(el, onRefresh, syncing = false) {
  el.syncWrap.innerHTML = syncing
    ? `<div class="text-xs text-slate-500 mb-3">Actualizando datos...</div>`
    : `<div class="flex items-center gap-2 text-xs text-slate-500 mb-3"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Datos en vivo desde Google Sheets <button id="btn-refresh" class="ml-auto px-3 py-1.5 rounded-md bg-teal-700 text-white font-semibold">Actualizar</button></div>`;
  if (!syncing) document.getElementById("btn-refresh").addEventListener("click", onRefresh);
}

export function renderValidationSummary(el, stats) {
  const skipped = stats.totalRows - stats.validRows;
  el.syncWrap.insertAdjacentHTML(
    "beforeend",
    `<div class="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-2">
      Filas CSV: <strong>${stats.totalRows}</strong> | Cargadas: <strong>${stats.validRows}</strong> | Descartadas: <strong>${skipped}</strong>
      <br>Detalle descarte: sin ID ${stats.skippedNoId}, sin coordenadas ${stats.skippedNoCoords}, coordenadas inválidas ${stats.skippedBadCoords}, fuera de rango ${stats.skippedOutOfRange}, ID duplicado ${stats.skippedDuplicateId}.
    </div>`
  );
}

export function renderError(el, message, onRetry) {
  el.loadWrap.innerHTML = `
    <div class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-left">
      No se pudo cargar el Google Sheet.
      <br><br>1) Verifica ID y gid.
      <br>2) Verifica permisos de lectura publica.
      <br>3) Abre desde http://localhost y no file://.
      <br><br><span class="text-xs">Detalle tecnico: ${message}</span>
      <br><br><button id="btn-retry" class="px-3 py-1.5 rounded-md bg-teal-700 text-white font-semibold">Reintentar</button>
    </div>`;
  document.getElementById("btn-retry").addEventListener("click", onRetry);
}

export function showToast(el) {
  el.toast.classList.remove("opacity-0");
  setTimeout(() => el.toast.classList.add("opacity-0"), 1200);
}

export function badgeClass(status) {
  if (status === "VISITADO") return "bg-emerald-100 text-emerald-700";
  if (status === "RECHAZADO") return "bg-red-100 text-red-700";
  if (status === "ANULADO") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-700";
}

export function llavesText(site) {
  const key = (site.llaves_zona || site.llaves || "").trim();
  return LLAVES_MAP[key] || site.llaves_full || site.llaves || "Sin informacion de llaves";
}

export function renderSuggestions(el, list, onPick) {
  if (!list.length) {
    el.searchResults.innerHTML = `<div class="text-sm text-slate-500 py-6 text-center">No se encontraron resultados.</div>`;
    return;
  }
  el.searchResults.innerHTML = `<div class="border border-slate-200 rounded-lg overflow-hidden">
    ${list.map((s) => `
      <button class="result-row w-full text-left px-3 py-2 bg-white hover:bg-slate-50 border-b border-slate-100 last:border-b-0" data-id="${s.id}">
        <span class="text-sm font-bold text-teal-700 inline-block min-w-[72px]">${s.id}</span>
        <span class="text-sm">${s.nombre}</span>
        <span class="text-xs text-slate-500 float-right">${s.dpto}</span>
      </button>
    `).join("")}
  </div>`;
  el.searchResults.querySelectorAll(".result-row").forEach((row) => {
    row.addEventListener("click", () => onPick(row.dataset.id));
  });
}

export function renderSiteCard(el, site, onCopy, onGoConfig) {
  const mapsUrl = `https://www.google.com/maps?q=${site.lat},${site.lon}`;
  const folio = site.folio || "";
  const group = `${site.id} ${site.nombre}`;
  const m1 = `${mapsUrl} SITE`;
  const m2 = `${site.direccion ? `${site.direccion}\n` : ""}${llavesText(site)} LLAVES`;
  const m3 = folio ? `${folio} FOLIO` : "";

  el.searchResults.innerHTML = `
  <article class="border border-slate-200 rounded-lg overflow-hidden bg-white">
    <div class="p-3 bg-slate-50 border-b border-slate-200 flex justify-between gap-3">
      <div>
        <div class="text-2xl font-extrabold leading-none">${site.id}</div>
        <div class="text-sm mt-1">${site.nombre}</div>
        <div class="text-xs text-slate-500 mt-0.5">${site.tipo || "-"} | ${site.dpto || "-"}</div>
      </div>
      <span class="h-fit text-xs font-bold px-2 py-1 rounded-full ${badgeClass(site.estatus)}">${site.estatus || "SIN ESTATUS"}</span>
    </div>
    <div class="p-3 border-b border-slate-200 text-xs flex items-center gap-2">
      <span>Grupo:</span><strong class="flex-1">${group}</strong>
      <button id="copy-group" class="px-3 py-1.5 rounded-md bg-slate-200 text-slate-800 font-semibold">Copiar</button>
    </div>
    <div class="p-3 border-b border-slate-100">
      <div class="flex justify-between items-center mb-1"><span class="text-xs text-slate-500 uppercase">Mensaje 1 - Site</span><button id="copy-1" class="px-3 py-1.5 rounded-md bg-slate-200 text-slate-800 font-semibold text-xs">Copiar</button></div>
      <a class="text-sm text-teal-700 hover:underline" target="_blank" rel="noopener" href="${mapsUrl}">${mapsUrl}</a> SITE
    </div>
    <div class="p-3 border-b border-slate-100">
      <div class="flex justify-between items-center mb-1"><span class="text-xs text-slate-500 uppercase">Mensaje 2 - Llaves</span><button id="copy-2" class="px-3 py-1.5 rounded-md bg-slate-200 text-slate-800 font-semibold text-xs">Copiar</button></div>
      <div class="text-sm whitespace-pre-wrap">${m2}</div>
    </div>
    <div class="p-3 border-b border-slate-100">
      <div class="flex justify-between items-center mb-1"><span class="text-xs text-slate-500 uppercase">${folio ? "Mensaje 3 - Folio" : "Folio"}</span>${folio ? `<button id="copy-3" class="px-3 py-1.5 rounded-md bg-slate-200 text-slate-800 font-semibold text-xs">Copiar</button>` : ""}</div>
      <div class="text-sm">${folio ? `${folio} FOLIO` : `Sin folio. <button id="go-config" class="text-teal-700 underline">Agregar aqui</button>`}</div>
    </div>
    <div class="p-3"><button id="copy-all" class="w-full px-3 py-2 rounded-md bg-teal-700 text-white font-semibold">Copiar mensajes</button></div>
  </article>`;

  document.getElementById("copy-group").addEventListener("click", () => onCopy(group));
  document.getElementById("copy-1").addEventListener("click", () => onCopy(m1));
  document.getElementById("copy-2").addEventListener("click", () => onCopy(m2));
  const copy3 = document.getElementById("copy-3");
  if (copy3) copy3.addEventListener("click", () => onCopy(m3));
  document.getElementById("copy-all").addEventListener("click", () => onCopy([m1, m2, m3].filter(Boolean).join("\n\n")));
  const goCfg = document.getElementById("go-config");
  if (goCfg) goCfg.addEventListener("click", () => onGoConfig(site.id));
}

export function renderConfigSuggestions(el, list, onPick) {
  if (!list.length) {
    el.configSuggestions.innerHTML = `<div class="text-sm text-slate-500 py-3">No se encontraron resultados.</div>`;
    return;
  }
  el.configSuggestions.innerHTML = `<div class="border border-slate-200 rounded-lg overflow-hidden">
    ${list.map((s) => `
      <button class="cfg-row w-full text-left px-3 py-2 bg-white hover:bg-slate-50 border-b border-slate-100 last:border-b-0" data-id="${s.id}">
        <span class="text-sm font-bold text-teal-700 inline-block min-w-[72px]">${s.id}</span>
        <span class="text-sm">${s.nombre}</span>
      </button>
    `).join("")}
  </div>`;
  el.configSuggestions.querySelectorAll(".cfg-row").forEach((row) => row.addEventListener("click", () => onPick(row.dataset.id)));
}

export function renderConfigForm(el, site, onSave) {
  const folio = (site.folio || "").replace(/"/g, "&quot;");
  const llaves = (site.llaves_full || site.llaves || "").replace(/"/g, "&quot;");
  el.configForm.innerHTML = `
    <div class="border border-slate-200 rounded-lg p-3 bg-slate-50">
      <div class="text-sm font-bold mb-3">${site.id} - ${site.nombre}</div>
      <label class="block text-xs uppercase text-slate-500 mb-1">Folio</label>
      <input id="edit-folio" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" value="${folio}" />
      <label class="block text-xs uppercase text-slate-500 mt-3 mb-1">Ubicacion de llaves</label>
      <input id="edit-llaves" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" value="${llaves}" />
      <button id="save-edit" class="mt-3 w-full px-3 py-2 rounded-md bg-teal-700 text-white font-semibold">Guardar cambios</button>
    </div>`;
  document.getElementById("save-edit").addEventListener("click", () => {
    const newFolio = document.getElementById("edit-folio").value.trim();
    const newLlaves = document.getElementById("edit-llaves").value.trim();
    onSave(site.id, newFolio, newLlaves);
  });
}
