<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #0a0a0a;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

* {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

input, textarea {
  -webkit-user-select: text;
  user-select: text;
}

::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
}

.leaflet-container {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.leaflet-container {
  touch-action: pan-x pan-y !important;
}

.leaflet-popup {
  max-width: 90vw !important;
}

.leaflet-popup-content {
  max-width: 90vw !important;
  overflow-wrap: break-word;
}

.custom-marker div {
  touch-action: manipulation;
}

/* iOS safe areas */
@supports (padding: max(0px)) {
  .page-container {
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
    padding-top: max(12px, env(safe-area-inset-top));
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
}

@media (max-width: 768px) {
  .leaflet-popup {
    max-width: 85vw !important;
  }
  
  .leaflet-popup-content {
    font-size: 14px !important;
  }
}

/* Улучшенная читаемость на мобильных */
@media (max-width: 480px) {
  body {
    font-size: 14px;
  }
}
</style>