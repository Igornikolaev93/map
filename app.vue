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
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #0a0a0a;
}

.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
}

header {
  background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
  color: white;
  padding: 16px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.filter-section {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-section select {
  padding: 8px 14px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  font-size: 14px;
  color: white;
  cursor: pointer;
  min-width: 150px;
}

.filter-section select option {
  background: #1a1a2e;
  color: white;
}

.filter-section select:focus {
  outline: 2px solid #667eea;
}

.clear-filter {
  padding: 8px 16px;
  background: rgba(255,255,255,0.1);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.clear-filter:hover {
  background: rgba(255,255,255,0.2);
}

main {
  flex: 1;
  padding: 16px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 600px;
  color: rgba(255,255,255,0.6);
  gap: 20px;
}

.loader {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  header {
    flex-direction: column;
    text-align: center;
    padding: 12px 16px;
  }

  header h1 {
    font-size: 20px;
  }

  .filter-section {
    width: 100%;
    justify-content: center;
  }

  .filter-section select {
    width: 100%;
  }

  main {
    padding: 8px;
  }
}

/* Leaflet styles from CDN */
@import 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
</style>