import { LLAVES_MAP } from "./config.js";

export function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sampleText(list) {
  return list.length ? list.slice(0, 6).map(escapeHtml).join(", ") : "-";
}

function metricCard(label, value, tone = "slate") {
  const tones = {
    slate: "bg-white/80 text-slate-800 border-slate-200",
    teal: "bg-teal-50 text-teal-900 border-teal-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200",
  };
  return `<article class="rounded-2xl border ${tones[tone]} px-4 py-3 shadow-sm">
    <div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">${escapeHtml(label)}</div>
    <div class="mt-2 text-2xl font-extrabold">${escapeHtml(value)}</div>
  </article>`;
}

function detailCard(title, body, tone = "slate") {
  const tones = {
    slate: "border-slate-200 bg-slate-50",
    teal: "border-teal-200 bg-teal-50",
    amber: "border-amber-200 bg-amber-50",
    rose: "border-rose-200 bg-rose-50",
  };
  return `<article class="rounded-2xl border ${tones[tone]} px-4 py-3">
    <div class="text-sm font-bold text-slate-900">${escapeHtml(title)}</div>
    <div class="mt-1 text-xs leading-5 text-slate-700">${body}</div>
  </article>`;
}

function issuePill(label, tone) {
  const tones = {
    amber: "bg-amber-100 text-amber-800",
    teal: "bg-teal-100 text-teal-800",
    rose: "bg-rose-100 text-rose-800",
    slate: "bg-slate-200 text-slate-700",
  };
  return `<span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone] || tones.slate}">${escapeHtml(label)}</span>`;
}

export function refs() {
  return {
    subtitle: document.getElementById("header-subtitle"),
    syncWrap: document.getElementById("sync-wrap"),
    overviewWrap: document.getElementById("overview-wrap"),
    loadWrap: document.getElementById("load-wrap"),
    searchWrap: document.getElementById("search-wrap"),
    searchInput: document.getElementById("search-input"),
    searchMeta: document.getElementById("search-meta"),
    searchResults: document.getElementById("search-results"),
    clearSearch: document.getElementById("clear-search"),
    exportSearch: document.getElementById("export-search"),
    pendingFilter: document.getElementById("pending-filter"),
    pendingMeta: document.getElementById("pending-meta"),
    pendingResults: document.getElementById("pending-results"),
    exportPending: document.getElementById("export-pending"),
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
      ? "tab-btn rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 bg-slate-900"
      : "tab-btn rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 bg-white/80 border border-white/70 hover:bg-white";
  });
  document.getElementById("panel-search").classList.toggle("hidden", tab !== "search");
  document.getElementById("panel-pending").classList.toggle("hidden", tab !== "pending");
  document.getElementById("panel-config").classList.toggle("hidden", tab !== "config");
}

export function renderSyncWrap(el, onRefresh, syncing = false) {
  el.syncWrap.innerHTML = syncing
    ? `<div class="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-500">Actualizando datos del Sheet...</div>`
    : `<div class="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            Fuente en vivo desde Google Sheets
          </div>
          <button id="btn-refresh" class="sm:ml-auto rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Actualizar</button>
        </div>
      </div>`;
  if (!syncing) document.getElementById("btn-refresh").addEventListener("click", onRefresh);
}

export function renderOverview(el, stats, diff, loadedSites) {
  const pendingCount = loadedSites.filter((site) => !site.folio || !site.llaves || !site.hasValidCoords).length;
  const diffBody = diff
    ? `Entraron <strong>${diff.entered.length}</strong>, cambiaron <strong>${diff.changed.length}</strong>, salieron <strong>${diff.removed.length}</strong>.`
    : "Primera carga local. Aun no hay una referencia anterior para comparar.";
  const validationBody = [
    `Sin ID: <strong>${stats.skippedNoId}</strong>`,
    `IDs duplicados: <strong>${stats.skippedDuplicateId}</strong>`,
    `Filas cortas: <strong>${stats.shortRowCount}</strong>`,
    `IDs con formato dudoso: <strong>${stats.rowsInvalidIdFormat}</strong>`,
  ].join(" | ");

  el.overviewWrap.innerHTML = `
    <div class="grid gap-3 md:grid-cols-4">
      ${metricCard("Sitios cargados", String(stats.loadedRows), "teal")}
      ${metricCard("Pendientes", String(pendingCount), pendingCount ? "amber" : "teal")}
      ${metricCard("Sin coordenadas", String(stats.rowsWithoutCoords + stats.rowsWithBadCoords + stats.rowsOutOfRange), (stats.rowsWithoutCoords + stats.rowsWithBadCoords + stats.rowsOutOfRange) ? "amber" : "teal")}
      ${metricCard("Cambios detectados", diff ? String(diff.entered.length + diff.changed.length + diff.removed.length) : "0", diff && (diff.entered.length + diff.changed.length + diff.removed.length) ? "rose" : "slate")}
    </div>
    <div class="mt-3 grid gap-3 lg:grid-cols-2">
      ${detailCard("Cambios desde la ultima carga", `${diffBody}<br>Entraron: ${sampleText(diff?.entered || [])}<br>Cambiaron: ${sampleText(diff?.changed || [])}<br>Salieron: ${sampleText(diff?.removed || [])}`, diff && (diff.entered.length || diff.changed.length || diff.removed.length) ? "rose" : "slate")}
      ${detailCard("Validacion del Sheet", `${validationBody}<br>Columnas faltantes: ${stats.missingColumns.length ? sampleText(stats.missingColumns.map((value) => `col ${value}`)) : "ninguna"}<br>IDs duplicados: ${sampleText(stats.duplicateIds)}<br>IDs formato dudoso: ${sampleText(stats.invalidIdFormatIds)}`, stats.missingColumns.length || stats.skippedDuplicateId || stats.rowsInvalidIdFormat ? "amber" : "teal")}
    </div>
    <div class="mt-3 grid gap-3 lg:grid-cols-2">
      ${detailCard("Coordenadas observadas", `Sin coordenadas: <strong>${stats.rowsWithoutCoords}</strong><br>Invalidas: <strong>${stats.rowsWithBadCoords}</strong> (${sampleText(stats.invalidCoordIds)})<br>Fuera de rango: <strong>${stats.rowsOutOfRange}</strong> (${sampleText(stats.outOfRangeIds)})`, (stats.rowsWithoutCoords + stats.rowsWithBadCoords + stats.rowsOutOfRange) ? "amber" : "teal")}
      ${detailCard("Estructura detectada", `Filas CSV leidas: <strong>${stats.totalRows}</strong><br>Vista previa encabezado: <strong>${escapeHtml((stats.headerPreview[1] || stats.headerPreview[0] || "sin encabezado").slice(0, 180))}</strong><br>Filas cortas: <strong>${stats.shortRowCount}</strong> (${sampleText(stats.shortRowIds)})`, stats.shortRowCount || stats.missingColumns.length ? "amber" : "slate")}
    </div>`;
}

export function renderError(el, message, onRetry) {
  el.loadWrap.innerHTML = `<div class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-sm text-rose-800">
      No se pudo cargar el Google Sheet.
      <br><br>1) Verifica ID y gid.
      <br>2) Verifica permisos de lectura publica.
      <br>3) Abre desde http://localhost y no file://.
      <br><br><span class="text-xs">Detalle tecnico: ${escapeHtml(message)}</span>
      <br><br><button id="btn-retry" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Reintentar</button>
    </div>`;
  document.getElementById("btn-retry").addEventListener("click", onRetry);
}

export function showToast(el, message = "Copiado") {
  el.toast.textContent = message;
  el.toast.classList.remove("opacity-0");
  setTimeout(() => el.toast.classList.add("opacity-0"), 1400);
}

export function badgeClass(status) {
  if (status === "VISITADO") return "bg-emerald-100 text-emerald-700";
  if (status === "RECHAZADO") return "bg-rose-100 text-rose-700";
  if (status === "ANULADO") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-700";
}

export function llavesText(site) {
  const key = (site.llaves_zona || site.llaves || "").trim();
  return LLAVES_MAP[key] || site.llaves_full || site.llaves || "Sin informacion de llaves";
}

export function renderSearchMeta(el, query, count, exportEnabled) {
  el.searchMeta.innerHTML = query
    ? `<div class="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center">
        <div><strong class="text-slate-900">${count}</strong> resultados para <strong class="text-slate-900">${escapeHtml(query)}</strong></div>
        <div class="text-xs text-slate-500 sm:ml-auto">Teclas: flechas para navegar, Enter para abrir, Esc para limpiar.</div>
      </div>`
    : `<div class="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-4 text-sm text-slate-500">Busca por codigo o nombre. Puedes exportar solo la lista filtrada cuando haya resultados.</div>`;
  el.exportSearch.disabled = !exportEnabled;
  el.exportSearch.classList.toggle("opacity-40", !exportEnabled);
}

export function renderSuggestions(el, list, page, pageSize, selectedIndex, onPick, onPage) {
  const total = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(Math.max(1, page), total);
  const start = (safePage - 1) * pageSize;
  const slice = list.slice(start, safePage * pageSize);
  if (!slice.length) {
    el.searchResults.innerHTML = `<div class="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">No se encontraron resultados.</div>`;
    return;
  }
  el.searchResults.innerHTML = `
    <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      ${slice.map((site, index) => {
        const absoluteIndex = start + index;
        const active = absoluteIndex === selectedIndex;
        return `<button class="result-row flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${active ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}" data-id="${escapeHtml(site.id)}" data-index="${absoluteIndex}">
            <span class="min-w-[72px] text-sm font-extrabold ${active ? "text-white" : "text-teal-700"}">${escapeHtml(site.id)}</span>
            <span class="flex-1">
              <span class="block text-sm font-semibold">${escapeHtml(site.nombre || "-")}</span>
              <span class="mt-1 block text-xs ${active ? "text-slate-200" : "text-slate-500"}">${escapeHtml(site.tipo || "-")} | ${escapeHtml(site.dpto || "-")}</span>
            </span>
            <span class="rounded-full px-2 py-1 text-[11px] font-bold ${badgeClass(site.estatus)}">${escapeHtml(site.estatus || "SIN ESTATUS")}</span>
          </button>`;
      }).join("")}
    </div>
    <div class="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-500">
      <span>Pagina ${safePage} de ${total}</span>
      <div class="flex gap-2">
        <button id="prev-page" class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 ${safePage === 1 ? "opacity-40 pointer-events-none" : ""}">Anterior</button>
        <button id="next-page" class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 ${safePage === total ? "opacity-40 pointer-events-none" : ""}">Siguiente</button>
      </div>
    </div>`;
  el.searchResults.querySelectorAll(".result-row").forEach((row) => row.addEventListener("click", () => onPick(row.dataset.id)));
  const prev = document.getElementById("prev-page");
  const next = document.getElementById("next-page");
  if (prev) prev.addEventListener("click", () => onPage(safePage - 1));
  if (next) next.addEventListener("click", () => onPage(safePage + 1));
}

export function renderSiteCard(el, site, onCopy, onGoConfig) {
  const hasCoords = Boolean(site.hasValidCoords && site.lat != null && site.lon != null);
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${site.lat},${site.lon}` : "";
  const folio = site.folio || "";
  const group = `${site.id} ${site.nombre}`;
  const siteMessage = hasCoords ? `${mapsUrl} SITE` : "Sin coordenadas registradas para este sitio.";
  const keysMessage = `${site.direccion ? `${site.direccion}\n` : ""}${llavesText(site)} LLAVES`;
  const folioMessage = folio ? `${folio} FOLIO` : "";

  el.searchResults.innerHTML = `<article class="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
    <div class="bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.95),_rgba(15,118,110,0.88))] px-5 py-5 text-white">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="text-xs uppercase tracking-[0.22em] text-white/70">Sitio encontrado</div>
          <div class="mt-2 text-3xl font-black leading-none">${escapeHtml(site.id)}</div>
          <div class="mt-2 text-lg font-semibold">${escapeHtml(site.nombre || "-")}</div>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-white/80">
            <span>${escapeHtml(site.tipo || "-")}</span>
            <span>${escapeHtml(site.dpto || "-")}</span>
            <span>${escapeHtml(site.direccion || "Sin direccion")}</span>
          </div>
        </div>
        <span class="h-fit rounded-full px-3 py-1.5 text-xs font-bold ${badgeClass(site.estatus)}">${escapeHtml(site.estatus || "SIN ESTATUS")}</span>
      </div>
    </div>
    <div class="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Grupo</div>
              <div class="mt-1 text-sm font-semibold text-slate-900">${escapeHtml(group)}</div>
            </div>
            <button id="copy-group" class="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Copiar grupo</button>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Bloque site</div>
            <button id="copy-1" class="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">Copiar site</button>
          </div>
          <div class="mt-3 text-sm text-slate-700">${hasCoords ? `<a class="font-semibold text-teal-700 hover:underline" target="_blank" rel="noopener" href="${mapsUrl}">${escapeHtml(mapsUrl)}</a> SITE` : `<span class="text-amber-700">Sin coordenadas registradas en el Sheet para este codigo.</span>`}</div>
        </div>
        <div class="rounded-2xl border border-slate-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Bloque llaves</div>
            <button id="copy-2" class="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">Copiar llaves</button>
          </div>
          <div class="mt-3 whitespace-pre-wrap text-sm text-slate-700">${escapeHtml(keysMessage)}</div>
        </div>
        <div class="rounded-2xl border border-slate-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">${folio ? "Bloque folio" : "Folio"}</div>
            ${folio ? `<button id="copy-3" class="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">Copiar folio</button>` : ""}
          </div>
          <div class="mt-3 text-sm text-slate-700">${folio ? escapeHtml(folioMessage) : `Sin folio registrado. <button id="go-config" class="font-semibold text-teal-700 underline">Agregar aqui</button>`}</div>
        </div>
      </section>
      <aside class="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <div class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Acciones rapidas</div>
        <div class="mt-4 grid gap-3">
          <button id="copy-all" class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Copiar todo</button>
          <button id="copy-summary" class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">Copiar resumen</button>
          <button id="go-config-side" class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">Editar llaves o folio</button>
        </div>
        <div class="mt-5 space-y-3 text-sm text-slate-600">
          <div class="flex items-start gap-2">${issuePill(hasCoords ? "Con mapa" : "Sin mapa", hasCoords ? "teal" : "amber")}<span>${hasCoords ? "El bloque site incluye enlace a Maps." : "El codigo existe, pero necesita coordenadas."}</span></div>
          <div class="flex items-start gap-2">${issuePill(folio ? "Con folio" : "Falta folio", folio ? "teal" : "amber")}<span>${folio ? "Ya puedes copiar el bloque completo." : "Puedes completarlo desde editar datos."}</span></div>
          <div class="flex items-start gap-2">${issuePill(site.llaves ? "Con llaves" : "Faltan llaves", site.llaves ? "teal" : "amber")}<span>${escapeHtml(llavesText(site))}</span></div>
        </div>
      </aside>
    </div>
  </article>`;

  const summaryMessage = [group, siteMessage, keysMessage, folioMessage].filter(Boolean).join("\n\n");
  document.getElementById("copy-group").addEventListener("click", () => onCopy(group, "Grupo copiado"));
  document.getElementById("copy-1").addEventListener("click", () => onCopy(siteMessage, "Bloque site copiado"));
  document.getElementById("copy-2").addEventListener("click", () => onCopy(keysMessage, "Bloque llaves copiado"));
  const copy3 = document.getElementById("copy-3");
  if (copy3) copy3.addEventListener("click", () => onCopy(folioMessage, "Bloque folio copiado"));
  document.getElementById("copy-all").addEventListener("click", () => onCopy([siteMessage, keysMessage, folioMessage].filter(Boolean).join("\n\n"), "Mensajes copiados"));
  document.getElementById("copy-summary").addEventListener("click", () => onCopy(summaryMessage, "Resumen copiado"));
  const goConfig = document.getElementById("go-config");
  if (goConfig) goConfig.addEventListener("click", () => onGoConfig(site.id));
  document.getElementById("go-config-side").addEventListener("click", () => onGoConfig(site.id));
}

export function renderPendingMeta(el, filterLabel, count) {
  el.pendingMeta.innerHTML = `<div class="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
    <strong class="text-slate-900">${count}</strong> sitios en <strong class="text-slate-900">${escapeHtml(filterLabel)}</strong>
  </div>`;
}

export function renderPendingList(el, list, onPickConfig) {
  if (!list.length) {
    el.pendingResults.innerHTML = `<div class="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">No hay pendientes para este filtro.</div>`;
    return;
  }
  el.pendingResults.innerHTML = `<div class="grid gap-3 lg:grid-cols-2">
    ${list.map((site) => {
      const flags = [];
      if (!site.folio) flags.push(issuePill("Falta folio", "amber"));
      if (!site.llaves) flags.push(issuePill("Faltan llaves", "rose"));
      if (!site.hasValidCoords) flags.push(issuePill("Sin coordenadas", "slate"));
      return `<article class="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-lg font-extrabold text-slate-900">${escapeHtml(site.id)}</div>
            <div class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(site.nombre || "-")}</div>
            <div class="mt-1 text-xs text-slate-500">${escapeHtml(site.tipo || "-")} | ${escapeHtml(site.dpto || "-")}</div>
          </div>
          <span class="rounded-full px-2 py-1 text-[11px] font-bold ${badgeClass(site.estatus)}">${escapeHtml(site.estatus || "SIN ESTATUS")}</span>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">${flags.join("")}</div>
        <div class="mt-4 text-xs leading-5 text-slate-600">
          <div><strong>Direccion:</strong> ${escapeHtml(site.direccion || "-")}</div>
          <div><strong>Llaves:</strong> ${escapeHtml(site.llaves_full || site.llaves || "-")}</div>
          <div><strong>Folio:</strong> ${escapeHtml(site.folio || "-")}</div>
        </div>
        <button class="pending-edit mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" data-id="${escapeHtml(site.id)}">Editar este sitio</button>
      </article>`;
    }).join("")}
  </div>`;
  el.pendingResults.querySelectorAll(".pending-edit").forEach((button) => button.addEventListener("click", () => onPickConfig(button.dataset.id)));
}

export function renderConfigSuggestions(el, list, onPick) {
  if (!list.length) {
    el.configSuggestions.innerHTML = `<div class="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-sm text-slate-500">No se encontraron resultados.</div>`;
    return;
  }
  el.configSuggestions.innerHTML = `<div class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
    ${list.map((site) => `<button class="cfg-row flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50" data-id="${escapeHtml(site.id)}">
      <span class="min-w-[72px] text-sm font-extrabold text-teal-700">${escapeHtml(site.id)}</span>
      <span class="flex-1">
        <span class="block text-sm font-semibold text-slate-900">${escapeHtml(site.nombre || "-")}</span>
        <span class="mt-1 block text-xs text-slate-500">${escapeHtml(site.dpto || "-")}</span>
      </span>
    </button>`).join("")}
  </div>`;
  el.configSuggestions.querySelectorAll(".cfg-row").forEach((row) => row.addEventListener("click", () => onPick(row.dataset.id)));
}

export function renderConfigForm(el, site, onSave) {
  const folio = escapeHtml(site.folio || "");
  const llaves = escapeHtml(site.llaves_full || site.llaves || "");
  el.configForm.innerHTML = `<div class="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4">
        <div class="text-xs uppercase tracking-[0.18em] text-slate-500">Editar sitio</div>
        <div class="mt-2 text-xl font-extrabold text-slate-900">${escapeHtml(site.id)} - ${escapeHtml(site.nombre || "-")}</div>
      </div>
      <label class="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Folio</label>
      <input id="edit-folio" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900" value="${folio}" />
      <p id="folio-warn" class="mt-2 hidden text-xs text-amber-700">Folio vacio.</p>
      <label class="mb-1 mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Ubicacion de llaves</label>
      <input id="edit-llaves" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900" value="${llaves}" />
      <p id="llaves-warn" class="mt-2 hidden text-xs text-amber-700">Llaves vacias.</p>
      <button id="save-edit" class="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Guardar cambios</button>
    </div>`;
  document.getElementById("save-edit").addEventListener("click", () => {
    const folioEl = document.getElementById("edit-folio");
    const llavesEl = document.getElementById("edit-llaves");
    const newFolio = folioEl.value.trim();
    const newLlaves = llavesEl.value.trim();
    const folioWarn = document.getElementById("folio-warn");
    const llavesWarn = document.getElementById("llaves-warn");
    folioWarn.classList.toggle("hidden", !!newFolio);
    llavesWarn.classList.toggle("hidden", !!newLlaves);
    folioEl.classList.toggle("border-amber-400", !newFolio);
    llavesEl.classList.toggle("border-amber-400", !newLlaves);
    onSave(site.id, newFolio, newLlaves);
  });
}
