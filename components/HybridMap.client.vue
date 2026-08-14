<template>
  <div class="hybrid-container">
    <!-- 3D Глобус -->
    <div 
      ref="globeContainer" 
      class="globe-layer"
      :style="{ 
        opacity: globeOpacity, 
        pointerEvents: isGlobeView ? 'auto' : 'none',
        transform: `scale(${globeScale})`
      }"
    ></div>
    
    <!-- 2D Карта -->
    <div 
      ref="mapContainer" 
      class="map-layer"
      :style="{ 
        opacity: mapOpacity, 
        pointerEvents: !isGlobeView ? 'auto' : 'none' 
      }"
    ></div>

    <!-- Элементы управления - мобильная версия -->
    <div class="controls">
      <div class="controls-top">
        <div class="control-group">
          <button 
            @click="toggleAddMode" 
            :class="{ active: addMode }" 
            class="btn-add"
          >
            {{ addMode ? '✕' : '+' }}
          </button>
          <button @click="resetView" class="btn-secondary">
            🔄
          </button>
          <button @click="toggleView" class="btn-secondary">
            {{ isGlobeView ? '🌍' : '🗺️' }}
          </button>
          <button @click="fitAllMarkers" class="btn-secondary" v-if="store.markers.length > 0">
            📍
          </button>
          <button @click="toggleLabels" class="btn-secondary" :class="{ active: showLabels }">
            🏷️
          </button>
        </div>

        <div class="search-box">
          <input 
            v-model="searchQuery" 
            placeholder="Поиск..."
            @keyup.enter="searchPlace"
          />
          <button @click="searchPlace">🔍</button>
        </div>
      </div>

      <div class="zoom-controls">
        <button @click="zoomIn" class="btn-zoom">+</button>
        <button @click="zoomOut" class="btn-zoom">−</button>
      </div>
    </div>

    <div class="switch-indicator" :class="{ active: !isGlobeView }">
      {{ isGlobeView ? '🌍' : '🗺️' }}
    </div>

    <div v-if="showAddForm" class="add-form">
      <h4>📍 Новое место</h4>
      <input 
        v-model="newPlaceName" 
        placeholder="Название места" 
        @keyup.enter="saveMarker"
      />
      <input 
        v-model="newCountry" 
        placeholder="Страна" 
        @keyup.enter="saveMarker"
      />
      <div class="form-actions">
        <button @click="saveMarker" class="btn-save">💾</button>
        <button @click="cancelAdd" class="btn-cancel">✕</button>
      </div>
    </div>

    <div v-if="selectedPlace" class="place-info">
      <h4>{{ selectedPlace.placeName }}</h4>
      <p>🌍 {{ selectedPlace.country || 'Неизвестная страна' }}</p>
      <p>📍 {{ selectedPlace.lat?.toFixed(4) }}, {{ selectedPlace.lng?.toFixed(4) }}</p>
      <div class="info-actions">
        <button @click="editPlace" class="btn-edit">✏️</button>
        <button @click="deletePlace" class="btn-danger">🗑️</button>
        <button @click="closeInfo" class="btn-close">✕</button>
      </div>
    </div>

    <div class="stats">
      <span>📍 {{ store.markers.length }}</span>
      <span>🏳️ {{ store.countriesVisited.length }}</span>
    </div>
  </div>
</template>

<script setup>
// ... (весь JavaScript код остается без изменений, 
// только стили ниже адаптированы для мобильных)
</script>

<style>
.hybrid-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #0a0a1a;
  border-radius: 8px;
  overflow: hidden;
}

.globe-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.6s ease, transform 0.6s ease;
  transform-origin: center center;
}

.globe-layer > * {
  pointer-events: auto;
}

.map-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.6s ease;
}

.map-layer > * {
  pointer-events: auto;
}

.map-layer .leaflet-control-zoom {
  display: none !important;
}

.map-layer .leaflet-tile-pane {
  filter: brightness(0.95) contrast(1.1);
}

.map-layer .custom-marker {
  background: none;
  border: none;
}

.map-layer .custom-marker div:hover {
  transform: scale(1.2) !important;
}

.map-layer .custom-popup .leaflet-popup-content-wrapper {
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
}

.map-layer .custom-popup .leaflet-popup-tip {
  background: rgba(0, 0, 0, 0.9);
}

.switch-indicator {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  font-size: 20px;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 12px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.5s ease;
  opacity: 0.6;
  pointer-events: none;
}

.switch-indicator.active {
  opacity: 1;
  background: rgba(0, 0, 0, 0.8);
}

.controls {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.85);
  padding: 8px 12px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  flex-wrap: wrap;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.1);
  max-width: 95%;
  min-width: 280px;
}

.controls-top {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}

.control-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-add {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-add:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-add.active {
  background: linear-gradient(135deg, #f44336, #d32f2f);
}

.btn-secondary {
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,0.1);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.05);
}

.btn-secondary.active {
  background: rgba(102, 126, 234, 0.3);
  border-color: #667eea;
}

.search-box {
  display: flex;
  gap: 4px;
  flex: 1;
  min-width: 120px;
  max-width: 250px;
}

.search-box input {
  padding: 6px 10px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: white;
  font-size: 13px;
  width: 100%;
  min-width: 60px;
}

.search-box input::placeholder {
  color: rgba(255,255,255,0.5);
}

.search-box input:focus {
  outline: 2px solid #667eea;
  border-color: transparent;
}

.search-box button {
  width: 36px;
  height: 36px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-box button:hover {
  background: #45a049;
  transform: scale(1.05);
}

.zoom-controls {
  display: flex;
  gap: 4px;
  position: absolute;
  right: 12px;
  bottom: 50%;
  transform: translateY(50%);
  flex-direction: column;
}

.btn-zoom {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.1);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-zoom:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.05);
}

.add-form {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.95);
  padding: 16px 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  min-width: 280px;
  max-width: 90%;
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

.add-form h4 {
  margin: 0 0 10px 0;
  color: white;
  font-size: 16px;
}

.add-form input {
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: white;
  font-size: 14px;
}

.add-form input::placeholder {
  color: rgba(255,255,255,0.5);
}

.add-form input:focus {
  outline: 2px solid #667eea;
  border-color: transparent;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.form-actions button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-save:hover {
  background: #45a049;
  transform: scale(1.02);
}

.btn-cancel {
  background: #f44336;
  color: white;
}

.btn-cancel:hover {
  background: #d32f2f;
  transform: scale(1.02);
}

.place-info {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.95);
  padding: 16px 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  min-width: 280px;
  max-width: 90%;
  color: white;
  animation: slideUp 0.3s ease;
}

.place-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #fff;
}

.place-info p {
  margin: 2px 0;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
}

.info-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.info-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  flex: 1;
}

.btn-edit {
  background: #FFC107;
  color: #333;
}

.btn-edit:hover {
  background: #ffb300;
  transform: scale(1.05);
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover {
  background: #d32f2f;
  transform: scale(1.05);
}

.btn-close {
  background: rgba(255,255,255,0.1);
  color: white;
}

.btn-close:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.05);
}

.stats {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  padding: 6px 12px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  display: flex;
  gap: 12px;
}

.temp-message {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  animation: slideUp 0.3s ease;
  border: 1px solid rgba(255,255,255,0.1);
  pointer-events: none;
}

.temp-message.fade-out {
  opacity: 0;
  transition: opacity 0.3s;
}

/* Мобильные устройства */
@media (max-width: 768px) {
  .hybrid-container {
    min-height: 300px;
    border-radius: 0;
  }

  .controls {
    top: 8px;
    padding: 6px 10px;
    min-width: auto;
    width: 96%;
    gap: 6px;
    border-radius: 10px;
  }

  .controls-top {
    gap: 6px;
  }

  .control-group {
    gap: 4px;
  }

  .btn-add, .btn-secondary {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .search-box {
    min-width: 80px;
    max-width: 180px;
  }

  .search-box input {
    font-size: 12px;
    padding: 4px 8px;
    min-width: 50px;
  }

  .search-box button {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .zoom-controls {
    right: 8px;
    bottom: 50%;
  }

  .btn-zoom {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }

  .add-form {
    min-width: auto;
    width: 92%;
    padding: 14px 16px;
    bottom: 80px;
  }

  .add-form h4 {
    font-size: 14px;
  }

  .add-form input {
    font-size: 13px;
    padding: 6px 10px;
  }

  .place-info {
    min-width: auto;
    width: 92%;
    padding: 14px 16px;
    bottom: 80px;
  }

  .place-info h4 {
    font-size: 14px;
  }

  .place-info p {
    font-size: 12px;
  }

  .switch-indicator {
    bottom: 60px;
    font-size: 16px;
    padding: 4px 10px;
  }

  .stats {
    font-size: 11px;
    padding: 4px 10px;
    gap: 10px;
    bottom: 8px;
    left: 8px;
  }

  .temp-message {
    bottom: 60px;
    font-size: 12px;
    padding: 6px 14px;
  }
}

/* Очень маленькие экраны */
@media (max-width: 400px) {
  .controls {
    padding: 4px 8px;
    gap: 4px;
  }

  .btn-add, .btn-secondary {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .search-box {
    max-width: 120px;
  }

  .search-box input {
    font-size: 11px;
    padding: 3px 6px;
  }

  .search-box button {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .btn-zoom {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }

  .add-form {
    padding: 10px 12px;
  }

  .place-info {
    padding: 10px 12px;
  }

  .switch-indicator {
    bottom: 50px;
    font-size: 14px;
    padding: 3px 8px;
  }
}

/* Альбомная ориентация на телефонах */
@media (max-width: 768px) and (orientation: landscape) {
  .hybrid-container {
    min-height: 200px;
  }

  .controls {
    top: 4px;
    padding: 4px 8px;
  }

  .switch-indicator {
    bottom: 40px;
  }

  .stats {
    bottom: 4px;
    left: 4px;
  }
}
</style>