self.addEventListener("install", () => {
  console.log("Service Worker Installed");
});
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker Activated");
});