// In-app notification facade. FCM push send belongs behind Cloud Functions later.
(function () {
  const KEY = "pm:notifications:v1";

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }

  function writeAll(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function createNotification({ workspaceId, uid, type, title, message, relatedId }) {
    const item = {
      notificationId: `noti_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      uid,
      type: type || "app",
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      relatedId: relatedId || null
    };
    const items = readAll();
    items.unshift(item);
    writeAll(items);
    return item;
  }

  function listNotifications(workspaceId, uid) {
    return readAll().filter((item) => item.workspaceId === workspaceId && item.uid === uid);
  }

  function markRead(notificationId) {
    writeAll(readAll().map((item) => item.notificationId === notificationId ? { ...item, read: true } : item));
  }

  function savePushToken() {
    return { status: "todo_fcm_setup_required" };
  }

  window.PMNotificationService = { createNotification, listNotifications, markRead, savePushToken };
})();
