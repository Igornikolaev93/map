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

<style scoped></style>