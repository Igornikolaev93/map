<template>
  <div class="map-container">
    <div ref="mapContainer" class="map"></div>
    
    <div class="map-controls">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          placeholder="Поиск места..."
          @keyup.enter="searchPlace"
        />
        <button @click="searchPlace">🔍 Найти</button>
      </div>

      <button @click="toggleAddMode" :class="{ active: addMode }" class="btn-add">
        {{ addMode ? '❌ Отмена' : '➕ Добавить место' }}
      </button>
    </div>

    <div v-if="showAddPopup" class="add-popup">
      <h4>📍 Новое место</h4>
      <input v-model="newPlaceName" placeholder="Название места" />
      <input v-model="newCountry" placeholder="Страна" />
      <div class="popup-actions">
        <button @click="saveMarker" class="btn-save">💾 Сохранить</button>
        <button @click="closeAddPopup" class="btn-cancel">❌ Отмена</button>
      </div>
    </div>

    <div v-if="selectedMarker" class="marker-info">
      <h5>{{ selectedMarker.placeName }}</h5>
      <p>🌍 {{ selectedMarker.country }}</p>
      <p>📅 {{ formatDate(selectedMarker.date) }}</p>
      <div class="info-actions">
        <button @click="editMarker" class="btn-edit">✏️ Редактировать</button>
        <button @click="deleteMarker" class="btn-delete">🗑️ Удалить</button>
      </div>
    </div>

    <div class="stats">
      <span>📍 Мест: {{ store.markers.length }}</span>
      <span>🏳️ Стран: {{ store.countriesVisited.length }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useMapStore } from '~/composables/useMapStore'

// Импорт Leaflet ТОЛЬКО на клиенте
let L = null
let icon = null
let iconShadow = null

const store = useMapStore()

const mapContainer = ref(null)
let map = null
let markersLayer = null
const addMode = ref(false)
const showAddPopup = ref(false)
const newPlaceName = ref('')
const newCountry = ref('')
const selectedMarker = ref(null)
const searchQuery = ref('')
let tempLatLng = null

onMounted(async () => {
  // Динамический импорт Leaflet только на клиенте
  if (process.client) {
    const leaflet = await import('leaflet')
    L = leaflet.default
    
    // Импорт иконок
    icon = (await import('leaflet/dist/images/marker-icon.png')).default
    iconShadow = (await import('leaflet/dist/images/marker-shadow.png')).default
    
    // Настройка иконок
    const DefaultIcon = L.icon({
      iconUrl: icon,
      shadowUrl: iconShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    })
    L.Marker.prototype.options.icon = DefaultIcon
    
    // Инициализация карты
    store.loadFromLocalStorage()
    initMap()
    
    watch(
      () => store.filteredMarkers,
      () => updateMarkers(),
      { deep: true }
    )
  }
})

function initMap() {
  if (!mapContainer.value || !L) return

  map = L.map(mapContainer.value, {
    center: [55.76, 37.64],
    zoom: 10,
    zoomControl: true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  map.on('click', onMapClick)
  updateMarkers()

  nextTick(() => {
    map.invalidateSize()
  })
}

function onMapClick(e) {
  if (addMode.value && L) {
    tempLatLng = e.latlng
    showAddPopup.value = true
  } else if (L) {
    const clicked = L.latLng(e.latlng)
    let closest = null
    let closestDist = Infinity
    
    store.filteredMarkers.forEach(marker => {
      const dist = clicked.distanceTo(L.latLng(marker.lat, marker.lng))
      if (dist < closestDist) {
        closestDist = dist
        closest = marker
      }
    })
    
    if (closest && closestDist < 100) {
      selectedMarker.value = closest
    } else {
      selectedMarker.value = null
    }
  }
}

function updateMarkers() {
  if (!markersLayer || !L) return
  markersLayer.clearLayers()
  
  store.filteredMarkers.forEach(marker => {
    const m = L.marker([marker.lat, marker.lng])
      .bindPopup(`<b>${marker.placeName}</b><br>🌍 ${marker.country}`)
      .addTo(markersLayer)
    
    m.on('click', () => {
      selectedMarker.value = marker
    })
  })
}

function toggleAddMode() {
  addMode.value = !addMode.value
  if (!addMode.value) {
    showAddPopup.value = false
  }
}

function saveMarker() {
  if (tempLatLng && newPlaceName.value) {
    store.addMarker(
      tempLatLng.lat,
      tempLatLng.lng,
      newPlaceName.value,
      newCountry.value || 'Неизвестная страна'
    )
    closeAddPopup()
  } else {
    alert('⚠️ Введите название места')
  }
}

function closeAddPopup() {
  showAddPopup.value = false
  tempLatLng = null
  newPlaceName.value = ''
  newCountry.value = ''
  addMode.value = false
}

function deleteMarker() {
  if (selectedMarker.value) {
    if (confirm(`Удалить место "${selectedMarker.value.placeName}"?`)) {
      store.removeMarker(selectedMarker.value.id)
      selectedMarker.value = null
    }
  }
}

function editMarker() {
  if (selectedMarker.value) {
    const newName = prompt('Новое название:', selectedMarker.value.placeName)
    if (newName && newName.trim()) {
      store.updateMarker(selectedMarker.value.id, { placeName: newName.trim() })
    }
  }
}

function searchPlace() {
  if (!searchQuery.value || !map) return
  
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}&limit=1`
  )
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        const result = data[0]
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        map.setView([lat, lng], 13)
        searchQuery.value = ''
      } else {
        alert('⚠️ Место не найдено')
      }
    })
    .catch(err => {
      console.error('Search error:', err)
      alert('❌ Ошибка поиска')
    })
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

if (process.client) {
  window.addEventListener('resize', () => {
    if (map) map.invalidateSize()
  })
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.map {
  width: 100%;
  height: 100%;
  min-height: 600px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.map-controls {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  flex-wrap: wrap;
  justify-content: center;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  width: 200px;
}

.search-box input:focus {
  outline: 2px solid #667eea;
  border-color: transparent;
}

.search-box button {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.search-box button:hover {
  background: #45a049;
  transform: scale(1.05);
}

.btn-add {
  padding: 8px 20px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-add:hover {
  transform: scale(1.05);
}

.btn-add.active {
  background: #f44336;
}

.btn-add.active:hover {
  background: #d32f2f;
}

.add-popup {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  min-width: 320px;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.add-popup h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.add-popup input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.add-popup input:focus {
  outline: none;
  border-color: #667eea;
}

.popup-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
}

.popup-actions button {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-save:hover {
  background: #45a049;
  transform: scale(1.05);
}

.btn-cancel {
  background: #f44336;
  color: white;
}

.btn-cancel:hover {
  background: #d32f2f;
  transform: scale(1.05);
}

.marker-info {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  min-width: 200px;
  animation: slideUp 0.3s ease;
}

.marker-info h5 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.marker-info p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.info-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.info-actions button {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-edit {
  background: #FFC107;
  color: #333;
}

.btn-edit:hover {
  background: #ffb300;
  transform: scale(1.05);
}

.btn-delete {
  background: #f44336;
  color: white;
}

.btn-delete:hover {
  background: #d32f2f;
  transform: scale(1.05);
}

.stats {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 14px;
  color: #333;
  display: flex;
  gap: 16px;
  backdrop-filter: blur(10px);
}

.stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .map-controls {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
    top: 10px;
    width: calc(100% - 20px);
  }

  .search-box {
    flex-direction: column;
  }

  .search-box input {
    width: 100%;
  }

  .add-popup {
    min-width: auto;
    width: calc(100% - 40px);
    bottom: 80px;
  }

  .marker-info {
    bottom: 10px;
    right: 10px;
    min-width: auto;
    width: calc(100% - 40px);
  }

  .stats {
    bottom: 10px;
    left: 10px;
    font-size: 12px;
    flex-wrap: wrap;
  }
}
</style>