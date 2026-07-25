/* Owner Preview safety service worker.
 * This worker intentionally does not cache application data. It exists to
 * replace any older worker that may have intercepted API or Firestore traffic.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  let url = null;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (
    url.pathname.startsWith("/api/")
    || url.pathname.startsWith("/__/firebase/")
    || url.hostname === "firestore.googleapis.com"
    || url.hostname.endsWith(".googleapis.com")
  ) {
    return;
  }

  return;
});
