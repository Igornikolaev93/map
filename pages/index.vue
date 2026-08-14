<template>
  <div class="page-container">
    <header>
      <h1>🌍 Гибридная карта</h1>
      <div class="filter-section">
        <select v-model="filterCountry" @change="applyFilter">
          <option value="">🌐 Все страны</option>
          <option 
            v-for="country in store.countriesVisited" 
            :key="country" 
            :value="country"
          >
            {{ country }}
          </option>
        </select>
        <button v-if="filterCountry" @click="clearFilter" class="clear-filter">
          ✕ Сбросить
        </button>
      </div>
    </header>
    
    <main>
      <ClientOnly>
        <HybridMap />
        <template #fallback>
          <div class="loading">
            <div class="loader"></div>
            <p>Загрузка карты...</p>
          </div>
        </template>
      </ClientOnly>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMapStore } from '~/composables/useMapStore'

const store = useMapStore()
const filterCountry = ref('')

function applyFilter() {
  store.setFilter(filterCountry.value || null)
}

function clearFilter() {
  filterCountry.value = ''
  store.clearFilter()
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
}

header {
  background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.filter-section {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
}

.filter-section select {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  font-size: 13px;
  color: white;
  cursor: pointer;
  min-width: 120px;
  max-width: 160px;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: 32px;
}

.filter-section select option {
  background: #1a1a2e;
  color: white;
}

.filter-section select:focus {
  outline: 2px solid #667eea;
}

.clear-filter {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  white-space: nowrap;
}

.clear-filter:hover {
  background: rgba(255,255,255,0.2);
}

main {
  flex: 1;
  padding: 8px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  height: calc(100vh - 80px);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: rgba(255,255,255,0.6);
  gap: 20px;
}

.loader {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Мобильные устройства */
@media (max-width: 768px) {
  header {
    padding: 10px 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  header h1 {
    font-size: 18px;
    text-align: center;
  }

  .filter-section {
    justify-content: center;
    width: 100%;
  }

  .filter-section select {
    flex: 1;
    min-width: 0;
    max-width: none;
    font-size: 13px;
    padding: 8px 32px 8px 12px;
  }

  .clear-filter {
    font-size: 13px;
    padding: 8px 12px;
  }

  main {
    padding: 4px;
    height: calc(100vh - 120px);
  }

  .loading {
    min-height: 300px;
  }
}

/* Очень маленькие экраны */
@media (max-width: 400px) {
  header h1 {
    font-size: 16px;
  }

  .filter-section select {
    font-size: 12px;
    padding: 6px 28px 6px 10px;
  }

  .clear-filter {
    font-size: 12px;
    padding: 6px 10px;
  }
}
</style>