// Device registry facade. Stored locally now; Firestore collection later: user_devices.
(function () {
  const KEY = "pm:user_devices:v1";

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }

  function writeAll(devices) {
    localStorage.setItem(KEY, JSON.stringify(devices));
  }

  function detectDevice() {
    const ua = navigator.userAgent || "";
    return {
      deviceName: navigator.platform || "현재 기기",
      deviceType: /Mobi|Android/i.test(ua) ? "mobile" : "desktop",
      browser: ua,
      os: navigator.platform || ""
    };
  }

  function currentDeviceId() {
    let id = localStorage.getItem("pm:device:id");
    if (!id) {
      id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("pm:device:id", id);
    }
    return id;
  }

  function registerLoginDevice(uid, workspaceId) {
    const devices = readAll().filter((device) => device.deviceId !== currentDeviceId());
    const device = {
      deviceId: currentDeviceId(),
      uid,
      workspaceId,
      ...detectDevice(),
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      pushToken: null,
      isCurrentDevice: true,
      revokedAt: null
    };
    devices.push(device);
    writeAll(devices);
    return device;
  }

  function listDevices(uid, workspaceId) {
    return readAll().filter((device) => device.uid === uid && device.workspaceId === workspaceId);
  }

  function touchCurrentDevice() {
    const id = currentDeviceId();
    const devices = readAll().map((device) => device.deviceId === id ? { ...device, lastActiveAt: new Date().toISOString() } : device);
    writeAll(devices);
  }

  window.PMDeviceService = { currentDeviceId, registerLoginDevice, listDevices, touchCurrentDevice };
})();
