// Safe cross-site navigation helper. Never put user_id, email, tokens, or PII in URLs.
(function () {
  const blockedParams = ["token", "access_token", "refresh_token", "email", "user_id", "uid", "password", "invite"];

  function sanitizeUrl(url) {
    const next = new URL(url, window.location.href);
    blockedParams.forEach((key) => next.searchParams.delete(key));
    return next.toString();
  }

  function openExternalSite(url, options) {
    const safeUrl = sanitizeUrl(url);
    const target = options?.target || "_blank";
    const features = "noopener,noreferrer";
    window.open(safeUrl, target, features);
  }

  window.PMShared = window.PMShared || {};
  window.PMShared.navigation = { sanitizeUrl, openExternalSite, blockedParams };
})();
