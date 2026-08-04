// NEIS and public school homepage integration helper.
// Keeps external fetch/parsing separate from app.js so a backend proxy can replace it later.
(function () {
  const NEIS_BASE_URL = "https://open.neis.go.kr/hub";
  const DEFAULT_HOMEPAGE_URL = "https://school.busanedu.net/dong-a-h/main.do";
  const PROXY_COOLDOWN_MS = 5 * 60 * 1000;
  const proxyCooldownUntilByReason = {};
  const proxyDiagnostics = {
    schoolProxyConfigured: false,
    schoolProxyRequestSent: false,
    schoolProxyRequestCount: 0,
    schoolProxyUnavailableCount: 0,
    schoolDirectExternalFetchBlockedCount: 0,
    schoolProxyCooldownHitCount: 0,
    schoolBoardFormatErrorCount: 0,
    schoolBoardNetworkFailureCount: 0,
    lastSchoolProxyReason: "none",
    lastSchoolProxyStatus: "not-started",
    lastSchoolBoardErrorCode: "none"
  };

  function compactText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function stripHtml(value) {
    const text = String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\(\s*\d+(\.\d+)*\s*\)/g, "")
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
    return text.split(/\n+/).map(compactText).filter(Boolean).join("\n");
  }

  function toDate(value) {
    const raw = String(value || "").replace(/[^\d]/g, "");
    if (raw.length >= 8) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    return "";
  }

  function toYmd(value) {
    return String(value || "").replace(/[^\d]/g, "").slice(0, 8);
  }

  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateRange(start, end) {
    const rows = [];
    const cursor = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    while (!Number.isNaN(cursor.getTime()) && cursor <= last) {
      rows.push(formatLocalDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return rows;
  }

  function monthRange(year, month) {
    const paddedMonth = String(month).padStart(2, "0");
    const start = `${year}-${paddedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  }

  function publicNeisKey() {
    return window.PM_PUBLIC_INTEGRATIONS?.neisApiKey || "";
  }

  function configuredSchoolProxyEndpoint() {
    const endpoint = String(
      window.PM_SCHOOL_PROXY_ENDPOINT
      || window.PM_SCHOOL_PROXY_BASE_URL
      || ""
    ).trim();
    return /^(?:https?:\/\/|\/)/i.test(endpoint) ? endpoint : "";
  }

  function schoolProxyConfigured() {
    return Boolean(configuredSchoolProxyEndpoint());
  }

  function updateProxyDiagnostics(patch = {}) {
    Object.assign(proxyDiagnostics, patch || {});
    proxyDiagnostics.schoolProxyConfigured = schoolProxyConfigured();
  }

  function safeProxyError(code, message = code) {
    const error = new Error(message);
    error.code = code;
    updateProxyDiagnostics({
      lastSchoolProxyStatus: code,
      lastSchoolBoardErrorCode: code
    });
    return error;
  }

  function ensureSchoolProxyAvailable(reason = "school-homepage-fetch") {
    updateProxyDiagnostics({ lastSchoolProxyReason: reason });
    const now = Date.now();
    if (proxyCooldownUntilByReason[reason] && now < proxyCooldownUntilByReason[reason]) {
      proxyDiagnostics.schoolProxyCooldownHitCount += 1;
      throw safeProxyError("school-proxy-cooldown");
    }
    if (schoolProxyConfigured()) return true;
    proxyDiagnostics.schoolProxyUnavailableCount += 1;
    proxyCooldownUntilByReason[reason] = now + PROXY_COOLDOWN_MS;
    updateProxyDiagnostics({ lastSchoolProxyStatus: "not_configured" });
    throw safeProxyError("school-proxy-not-configured");
  }

  function localProxyUrl(targetUrl) {
    if (!/^https?:\/\//i.test(String(targetUrl || ""))) return "";
    const endpoint = configuredSchoolProxyEndpoint();
    if (!endpoint) return "";
    const url = new URL(endpoint, location.origin);
    url.searchParams.set("url", targetUrl);
    return url.origin === location.origin ? `${url.pathname}${url.search}` : url.toString();
  }

  function cacheBustUrl(url) {
    try {
      const next = new URL(url);
      next.searchParams.set("_pm_sync", String(Date.now()));
      return next.toString();
    } catch {
      return url;
    }
  }

  async function fetchTextWithProxy(url) {
    const requestUrl = cacheBustUrl(url);
    ensureSchoolProxyAvailable("school-homepage-fetch");
    proxyDiagnostics.schoolDirectExternalFetchBlockedCount += 1;
    const proxy = localProxyUrl(requestUrl);
    if (!proxy || location.protocol === "file:") {
      throw safeProxyError("school-proxy-not-configured", "학교 게시판 연동 서버가 아직 설정되지 않았습니다.");
    }
    try {
      proxyDiagnostics.schoolProxyRequestCount += 1;
      updateProxyDiagnostics({ lastSchoolProxyStatus: "requesting", schoolProxyRequestSent: true });
      const response = await fetch(proxy, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok && response.status === 404) {
        proxyDiagnostics.schoolProxyUnavailableCount += 1;
        proxyCooldownUntilByReason["school-homepage-fetch"] = Date.now() + PROXY_COOLDOWN_MS;
        throw safeProxyError("school-proxy-unavailable", "학교 게시판 연동 서버가 아직 설정되지 않았습니다.");
      }
      if (!response.ok) {
        proxyDiagnostics.schoolBoardNetworkFailureCount += 1;
        throw safeProxyError("school-board-network-failed", "학교 게시판 연결에 실패했습니다.");
      }
      updateProxyDiagnostics({ lastSchoolProxyStatus: "success", lastSchoolBoardErrorCode: "none" });
      return response.text();
    } catch (error) {
      if (error?.code) throw error;
      proxyDiagnostics.schoolBoardNetworkFailureCount += 1;
      throw safeProxyError("school-board-network-failed", "학교 게시판 연결에 실패했습니다.");
    }
  }

  async function fetchProxyPayload(url) {
    const requestUrl = cacheBustUrl(url);
    ensureSchoolProxyAvailable("school-homepage-fetch");
    proxyDiagnostics.schoolDirectExternalFetchBlockedCount += 1;
    const proxy = localProxyUrl(requestUrl);
    if (!proxy || location.protocol === "file:") {
      throw safeProxyError("school-proxy-not-configured", "학교 게시판 연동 서버가 아직 설정되지 않았습니다.");
    }
    try {
      proxyDiagnostics.schoolProxyRequestCount += 1;
      updateProxyDiagnostics({ lastSchoolProxyStatus: "requesting", schoolProxyRequestSent: true });
      const response = await fetch(proxy, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
      if (!response.ok && response.status === 404) {
        proxyDiagnostics.schoolProxyUnavailableCount += 1;
        proxyCooldownUntilByReason["school-homepage-fetch"] = Date.now() + PROXY_COOLDOWN_MS;
        throw safeProxyError("school-proxy-unavailable", "학교 게시판 연동 서버가 아직 설정되지 않았습니다.");
      }
      if (!response.ok) {
        proxyDiagnostics.schoolBoardNetworkFailureCount += 1;
        throw safeProxyError("school-board-network-failed", "학교 게시판 연결에 실패했습니다.");
      }
      if (!contentType.includes("application/json")) {
        proxyDiagnostics.schoolBoardFormatErrorCount += 1;
        throw safeProxyError(
          contentType.includes("text/html") ? "school-proxy-content-type-html" : "school-proxy-content-type-invalid",
          "학교 게시판 응답을 확인할 수 없습니다."
        );
      }
      const payload = await response.json();
      if (!payload || typeof payload !== "object") {
        proxyDiagnostics.schoolBoardFormatErrorCount += 1;
        throw safeProxyError("school-board-format-invalid", "학교 게시판 응답을 확인할 수 없습니다.");
      }
      updateProxyDiagnostics({ lastSchoolProxyStatus: "success", lastSchoolBoardErrorCode: "none" });
      return payload;
    } catch (error) {
      if (error?.code) throw error;
      proxyDiagnostics.schoolBoardNetworkFailureCount += 1;
      throw safeProxyError("school-board-network-failed", "학교 게시판 연결에 실패했습니다.");
    }
  }

  function looksLikeBoardResponse(html) {
    const text = String(html || "");
    if (!text.trim()) return false;
    return /selectNttInfo|selectNttList|nttSn|bbsId|board|article|공지|게시|게시판|table|tbody|<li|<article/i.test(text);
  }

  function assertBoardResponseShape(html) {
    if (looksLikeBoardResponse(html)) return true;
    proxyDiagnostics.schoolBoardFormatErrorCount += 1;
    throw safeProxyError("school-board-format-invalid", "학교 게시판 응답을 확인할 수 없습니다.");
  }

  function neisUrl(endpoint, params = {}) {
    const url = new URL(`${NEIS_BASE_URL}/${endpoint}`);
    const apiKey = params.KEY || params.key || publicNeisKey();
    if (apiKey) url.searchParams.set("KEY", apiKey);
    url.searchParams.set("Type", "json");
    url.searchParams.set("pIndex", String(params.pIndex || 1));
    url.searchParams.set("pSize", String(params.pSize || 100));
    Object.entries(params).forEach(([key, value]) => {
      if (["KEY", "key", "Type", "pIndex", "pSize"].includes(key)) return;
      if (value !== undefined && value !== null && String(value).trim() !== "") url.searchParams.set(key, String(value).trim());
    });
    return url.toString();
  }

  async function fetchJson(url) {
    let data = null;
    try {
      const response = await fetch(url, { credentials: "omit", cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    } catch (directError) {
      const proxy = localProxyUrl(url);
      if (!proxy || location.protocol === "file:") throw directError;
      const response = await fetch(proxy, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(`프록시 HTTP ${response.status}`);
      data = await response.json();
    }
    const head = Object.values(data).find((value) => Array.isArray(value) && value[0]?.head)?.[0]?.head;
    const result = Array.isArray(head) ? head.find((item) => item.RESULT)?.RESULT : data.RESULT;
    if (result && result.CODE && !["INFO-000"].includes(result.CODE)) {
      if (["INFO-200", "INFO-300"].includes(result.CODE)) return data;
      throw new Error(result.MESSAGE || result.CODE);
    }
    return data;
  }

  function rowsFromNeis(data, key) {
    const bucket = data?.[key];
    if (!Array.isArray(bucket)) return [];
    const rowBlock = bucket.find((item) => Array.isArray(item.row));
    return rowBlock?.row || [];
  }

  function totalFromNeis(data, key) {
    const bucket = data?.[key];
    if (!Array.isArray(bucket)) return 0;
    const head = bucket.find((item) => Array.isArray(item.head))?.head || [];
    const total = head.find((item) => Object.prototype.hasOwnProperty.call(item, "list_total_count"))?.list_total_count;
    return Number(total || 0);
  }

  function uniqueRows(rows, fields) {
    const seen = new Set();
    return rows.filter((row) => {
      const key = fields.map((field) => row?.[field] || "").join("|") || JSON.stringify(row || {});
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function fetchDailyNeisRows({ endpoint, key, baseParams, dateParam, start, end, maxDays = 370, concurrency = 8 }) {
    const days = dateRange(start, end).slice(0, maxDays);
    const rows = [];
    let index = 0;
    async function worker() {
      while (index < days.length) {
        const day = days[index];
        index += 1;
        try {
          const data = await fetchJson(neisUrl(endpoint, {
            ...baseParams,
            [dateParam]: toYmd(day),
            pSize: 100
          }));
          rows.push(...rowsFromNeis(data, key));
        } catch (error) {
          if (!["INFO-200", "INFO-300"].includes(error?.message || "")) {
            console.info(`[NEIS ${endpoint} daily fetch]`, { day, message: error?.message || String(error) });
          }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, days.length)) }, worker));
    return rows;
  }

  async function findSchool({ schoolName, officeCode = "", apiKey = "" }) {
    const data = await fetchJson(neisUrl("schoolInfo", {
      KEY: apiKey,
      ATPT_OFCDC_SC_CODE: officeCode,
      SCHUL_NM: schoolName,
      pSize: 20
    }));
    return rowsFromNeis(data, "schoolInfo").map((row) => ({
      officeCode: row.ATPT_OFCDC_SC_CODE || "",
      officeName: row.ATPT_OFCDC_SC_NM || "",
      schoolCode: row.SD_SCHUL_CODE || "",
      schoolName: row.SCHUL_NM || "",
      address: row.ORG_RDNMA || row.ORG_RDNDA || "",
      type: row.SCHUL_KND_SC_NM || ""
    }));
  }

  async function fetchMeals({ officeCode, schoolCode, apiKey = "", start, end }) {
    if (!officeCode || !schoolCode) throw new Error("NEIS 교육청 코드와 학교 코드가 필요합니다.");
    let rows = [];
    let total = 0;
    let rangeError = null;
    const baseParams = {
      KEY: apiKey,
      ATPT_OFCDC_SC_CODE: officeCode,
      SD_SCHUL_CODE: schoolCode
    };
    try {
      const rangeData = await fetchJson(neisUrl("mealServiceDietInfo", {
        ...baseParams,
        MLSV_FROM_YMD: toYmd(start),
        MLSV_TO_YMD: toYmd(end),
        pSize: 1000
      }));
      rows = rowsFromNeis(rangeData, "mealServiceDietInfo");
      total = totalFromNeis(rangeData, "mealServiceDietInfo");
    } catch (error) {
      rangeError = error;
    }

    if (!rows.length || (total && rows.length < total)) {
      const dailyRows = await fetchDailyNeisRows({
        endpoint: "mealServiceDietInfo",
        key: "mealServiceDietInfo",
        baseParams,
        dateParam: "MLSV_YMD",
        start,
        end,
        maxDays: 45,
        concurrency: 8
      });
      rows = uniqueRows([...rows, ...dailyRows], ["MLSV_YMD", "MMEAL_SC_CODE", "MMEAL_SC_NM", "DDISH_NM"]);
    }

    if (!rows.length && rangeError) throw rangeError;

    return rows.map((row) => ({
      id: `neis-meal-${row.MLSV_YMD || ""}-${row.MMEAL_SC_CODE || row.MMEAL_SC_NM || ""}`,
      date: toDate(row.MLSV_YMD),
      meal: row.MMEAL_SC_NM || "급식",
      menu: stripHtml(row.DDISH_NM),
      calories: row.CAL_INFO || "",
      memo: [row.NTR_INFO ? `영양: ${stripHtml(row.NTR_INFO)}` : "", row.ORPLC_INFO ? `원산지: ${stripHtml(row.ORPLC_INFO)}` : ""].filter(Boolean).join("\n"),
      source: "NEIS",
      link: neisUrl("mealServiceDietInfo", {
        KEY: apiKey,
        ATPT_OFCDC_SC_CODE: officeCode,
        SD_SCHUL_CODE: schoolCode,
        MLSV_YMD: row.MLSV_YMD || toYmd(start)
      })
    })).filter((row) => row.date && row.menu);
  }

  async function fetchAcademicSchedules({ officeCode, schoolCode, apiKey = "", start, end }) {
    if (!officeCode || !schoolCode) throw new Error("NEIS 교육청 코드와 학교 코드가 필요합니다.");
    const baseParams = {
      KEY: apiKey,
      ATPT_OFCDC_SC_CODE: officeCode,
      SD_SCHUL_CODE: schoolCode
    };
    const data = await fetchJson(neisUrl("SchoolSchedule", {
      ...baseParams,
      AA_FROM_YMD: toYmd(start),
      AA_TO_YMD: toYmd(end),
      pSize: 1000
    }));
    let rows = rowsFromNeis(data, "SchoolSchedule");
    const total = totalFromNeis(data, "SchoolSchedule");
    if (!rows.length || (total && rows.length < total)) {
      const dailyRows = await fetchDailyNeisRows({
        endpoint: "SchoolSchedule",
        key: "SchoolSchedule",
        baseParams,
        dateParam: "AA_YMD",
        start,
        end,
        maxDays: 370,
        concurrency: 10
      });
      rows = uniqueRows([...rows, ...dailyRows], ["AA_YMD", "EVENT_NM", "SBTR_DD_SC_NM"]);
    }
    return rows.map((row) => ({
      id: `neis-academic-${row.AA_YMD || ""}-${compactText(row.EVENT_NM || "")}`,
      date: toDate(row.AA_YMD),
      title: compactText(row.EVENT_NM || row.SBTR_DD_SC_NM || "학사일정"),
      content: [
        row.SBTR_DD_SC_NM ? `구분: ${row.SBTR_DD_SC_NM}` : "",
        row.ONE_GRADE_EVENT_YN === "Y" ? "1학년" : "",
        row.TW_GRADE_EVENT_YN === "Y" ? "2학년" : "",
        row.THREE_GRADE_EVENT_YN === "Y" ? "3학년" : ""
      ].filter(Boolean).join(" · "),
      source: "NEIS",
      link: neisUrl("SchoolSchedule", {
        KEY: apiKey,
        ATPT_OFCDC_SC_CODE: officeCode,
        SD_SCHUL_CODE: schoolCode,
        AA_YMD: row.AA_YMD || toYmd(start)
      })
    })).filter((row) => row.date && row.title);
  }

  async function fetchHtml(url) {
    return fetchTextWithProxy(url);
  }

  function parseBoardDate(text) {
    const hit = String(text || "").match(/\b20\d{2}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}\b/);
    if (!hit) return "";
    const parts = hit[0].split(/[.\-/]/).map((part) => part.trim());
    if (parts.length < 3) return "";
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  function isBoardNoiseTitle(title) {
    return /본문|메인|로그인|회원가입|사이트맵|개인정보|이메일|검색|목록|이전|다음|처음|마지막|인쇄|공유|로딩|더보기/i.test(String(title || ""));
  }

  function boardLink(anchor, baseUrl) {
    try {
      return new URL(anchor.getAttribute("href") || "", baseUrl || DEFAULT_HOMEPAGE_URL).href;
    } catch {
      return baseUrl || DEFAULT_HOMEPAGE_URL;
    }
  }

  function boardRowFromAnchor(anchor, baseUrl, source) {
    const title = compactText(anchor.textContent);
    if (!title || title.length < 4 || isBoardNoiseTitle(title)) return null;
    const row = anchor.closest("tr, li, div, article") || anchor.parentElement;
    const rowText = compactText(row?.innerText || title);
    const href = anchor.getAttribute("href") || "";
    const date = parseBoardDate(rowText);
    const looksLikePost = /selectNttInfo|nttSn|bbsId|board|article|view/i.test(href);
    if (!date && !looksLikePost) return null;
    return {
      id: `school-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      date,
      link: boardLink(anchor, baseUrl),
      source,
      memo: ""
    };
  }

  function parseBoardHtml(html, baseUrl, source = "학교 홈페이지") {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    const rows = [];
    const seen = new Set();
    const pushRow = (row) => {
      if (!row) return;
      const key = `${row.title}|${row.date}|${row.link}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    };

    [...doc.querySelectorAll("table tbody tr, table tr")].forEach((tr) => {
      const anchor = [...tr.querySelectorAll("a[href]")]
        .map((item) => ({ item, text: compactText(item.textContent) }))
        .filter(({ text }) => text.length >= 4 && !isBoardNoiseTitle(text))
        .sort((a, b) => b.text.length - a.text.length)[0]?.item;
      if (anchor) pushRow(boardRowFromAnchor(anchor, baseUrl, source));
    });
    if (rows.length) return rows;

    [...doc.querySelectorAll('a[href*="selectNttInfo"], a[href*="nttSn"], td a[href], li a[href], article a[href]')]
      .forEach((anchor) => pushRow(boardRowFromAnchor(anchor, baseUrl, source)));
    return rows;
  }

  async function fetchBoard(url, source) {
    const html = await fetchHtml(url);
    assertBoardResponseShape(html);
    return parseBoardHtml(html, url, source);
  }

  window.PMSchoolIntegrationService = {
    defaultHomepageUrl: DEFAULT_HOMEPAGE_URL,
    monthRange,
    dateRange,
    neisUrl,
    findSchool,
    fetchMeals,
    fetchAcademicSchedules,
    fetchHtml,
    fetchProxyPayload,
    fetchBoard,
    parseBoardHtml,
    looksLikeBoardResponse,
    publicNeisKey,
    diagnostics: () => ({ ...proxyDiagnostics, schoolProxyConfigured: schoolProxyConfigured() }),
    safeUnavailableMessage: "학교 게시판 연동 서버가 아직 설정되지 않았습니다."
  };
})();
