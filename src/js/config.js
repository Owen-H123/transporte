export const CONFIG = {
  sheetId: "1d7L6QNUIkrplyQn-zgpDT0B8LOgiQp_SrRljDgqK_uc",
  gid: "0",
  locale: "es-PE",
  overridesKey: "sitios_overrides",
};

export const LLAVES_MAP = {
  "LIMA - ESTE": "Jr. Varela 1230 interior 102 - Brena / -12.060488, -77.047281",
  "LIMA - NORTE": "Asoc. Universo MZ. F LT.10 Referencia: 5 casas del mercado Universo / -11.993580, -77.103088",
  "LIMA - SUR": "CENS Andres Avelino Caceres 575 Surquillo / -12.119431, -77.019613",
};

export const SHEET_URLS = [
  (cfg) => `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/export?format=csv&gid=${cfg.gid}`,
  (cfg) => `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv&gid=${cfg.gid}`,
];
