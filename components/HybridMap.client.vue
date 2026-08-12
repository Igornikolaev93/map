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

    <!-- Элементы управления -->
    <div class="controls">
      <div class="control-group">
        <button 
          @click="toggleAddMode" 
          :class="{ active: addMode }" 
          class="btn-add"
        >
          {{ addMode ? '❌ Отмена' : '➕ Добавить' }}
        </button>
        <button @click="resetView" class="btn-secondary">
          🔄 Сброс
        </button>
        <button @click="toggleView" class="btn-secondary">
          {{ isGlobeView ? '🌍 Глобус' : '🗺️ Карта' }}
        </button>
        <button @click="fitAllMarkers" class="btn-secondary" v-if="store.markers.length > 0">
          📍 Все метки
        </button>
        <button @click="toggleLabels" class="btn-secondary" :class="{ active: showLabels }">
          🏷️ {{ showLabels ? 'Метки вкл' : 'Метки выкл' }}
        </button>
      </div>

      <div class="search-box">
        <input 
          v-model="searchQuery" 
          placeholder="Поиск места..."
          @keyup.enter="searchPlace"
        />
        <button @click="searchPlace">🔍</button>
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
        placeholder="Страна (необязательно)" 
        @keyup.enter="saveMarker"
      />
      <div class="form-actions">
        <button @click="saveMarker" class="btn-save">💾 Сохранить</button>
        <button @click="cancelAdd" class="btn-cancel">❌ Отмена</button>
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
      <span v-if="!isGlobeView" class="zoom-level">🔍 {{ Math.round(zoomLevel) }}x</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useMapStore } from '~/composables/useMapStore'
import * as THREE from 'three'
import * as L from 'leaflet'

const store = useMapStore()

const globeContainer = ref(null)
const mapContainer = ref(null)

let scene = null
let camera = null
let renderer = null
let globe = null
let markerGroups = []
let labelSprites = []
let raycaster = null
let mouse = null
let animationId = null

let map = null
let markersLayer = null

const selectedPlace = ref(null)
const searchQuery = ref('')
const addMode = ref(false)
const showAddForm = ref(false)
const newPlaceName = ref('')
const newCountry = ref('')
const isGlobeView = ref(true)
const globeOpacity = ref(1)
const mapOpacity = ref(0)
const globeScale = ref(1)
const zoomLevel = ref(3)
const showLabels = ref(true)

let tempClickPosition = null
let isDragging = false
let previousMousePosition = { x: 0, y: 0 }
let isInitialized = false
let isTransitioning = false
let lastGlobeRotation = { x: 0, y: 0 }
let isUpdating = false

const GLOBE_TO_MAP_ZOOM = 5
const MAP_TO_GLOBE_ZOOM = 4

function latLngToPosition(lat, lng, radius = 1.02) {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lng + 180) * Math.PI / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function positionToLatLng(position) {
  const lat = 90 - Math.acos(Math.min(1, Math.max(-1, position.y / 1))) * 180 / Math.PI
  const lng = (Math.atan2(position.z, position.x) * 180 / Math.PI) - 180
  return { lat, lng }
}

function getColor(index) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    '#F1948A', '#85C1E9', '#82E0AA', '#F8C471'
  ]
  return colors[index % colors.length]
}

function getColorHex(index) {
  const colors = [
    0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4,
    0xFFEAA7, 0xDDA0DD, 0x98D8C8, 0xF7DC6F,
    0xBB8FCE, 0x85C1E9, 0xF8C471, 0x82E0AA,
    0xF1948A, 0x85C1E9, 0x82E0AA, 0xF8C471
  ]
  return colors[index % colors.length]
}

onMounted(async () => {
  if (process.client) {
    await nextTick()
    
    setTimeout(async () => {
      try {
        await initGlobe()
        await initMap()
        
        isInitialized = true
        
        store.loadFromLocalStorage()
        
        setTimeout(() => {
          refreshMarkers()
        }, 300)

        watch(
          () => store.filteredMarkers,
          () => {
            if (isInitialized && !isUpdating) {
              refreshMarkers()
            }
          },
          { deep: true }
        )
      } catch (error) {
        console.error('Error initializing:', error)
      }
    }, 100)
  }
})

function initGlobe() {
  return new Promise((resolve) => {
    const container = globeContainer.value
    if (!container) {
      setTimeout(() => {
        initGlobe().then(resolve)
      }, 500)
      return
    }

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a1a)

    camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 1000)
    camera.position.set(0, 0.2, 2.8)

    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const textureLoader = new THREE.TextureLoader()
    const texture = textureLoader.load(
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
    )
    
    const geometry = new THREE.SphereGeometry(1, 128, 128)
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      specular: new THREE.Color(0x333333),
      shininess: 25,
      emissive: new THREE.Color(0x000022),
      emissiveIntensity: 0.05
    })
    
    globe = new THREE.Mesh(geometry, material)
    globe.position.set(0, 0, 0)
    scene.add(globe)

    const starsGeom = new THREE.BufferGeometry()
    const starsCount = 3000
    const positions = new Float32Array(starsCount * 3)
    for (let i = 0; i < starsCount * 3; i += 3) {
      const r = 200 + Math.random() * 800
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i] = r * Math.sin(phi) * Math.cos(theta)
      positions[i + 1] = r * Math.cos(phi)
      positions[i + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const starsMat = new THREE.PointsMaterial({ 
      color: 0xffffff, 
      size: 0.5,
      transparent: true,
      opacity: 0.8
    })
    const stars = new THREE.Points(starsGeom, starsMat)
    scene.add(stars)

    const ambient = new THREE.AmbientLight(0x404060, 0.5)
    scene.add(ambient)
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(5, 3, 5)
    scene.add(dirLight)

    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()

    renderer.domElement.addEventListener('click', onGlobeClick)
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('wheel', onGlobeWheel, { passive: false })

    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false })
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false })
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: false })

    function animate() {
      animationId = requestAnimationFrame(animate)
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (camera && renderer) {
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
    })
    resizeObserver.observe(container)

    resolve()
  })
}

function initMap() {
  return new Promise((resolve) => {
    const container = mapContainer.value
    if (!container) {
      setTimeout(() => {
        initMap().then(resolve)
      }, 500)
      return
    }

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })

    map = L.map(container, {
      center: [55.76, 37.64],
      zoom: 3,
      zoomControl: false,
      minZoom: 2,
      maxZoom: 19
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CartoDB',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map)

    markersLayer = L.layerGroup().addTo(map)

    map.on('click', onMapClick)
    map.on('zoomend', () => {
      const newZoom = map.getZoom()
      zoomLevel.value = newZoom
      checkZoomLevel(newZoom)
    })

    setTimeout(() => {
      if (map) map.invalidateSize()
    }, 200)

    resolve()
  })
}

function checkZoomLevel(newZoom) {
  if (isTransitioning) return
  
  if (isGlobeView.value && newZoom >= GLOBE_TO_MAP_ZOOM) {
    switchToMap()
  } else if (!isGlobeView.value && newZoom <= MAP_TO_GLOBE_ZOOM) {
    switchToGlobe()
  }
}

function switchToMap() {
  if (isTransitioning) return
  isTransitioning = true
  isGlobeView.value = false
  
  if (globe) {
    lastGlobeRotation = {
      x: globe.rotation.x,
      y: globe.rotation.y
    }
  }
  
  globeOpacity.value = 0
  setTimeout(() => {
    mapOpacity.value = 1
    if (map) {
      map.invalidateSize()
      const center = map.getCenter()
      map.setView(center, Math.max(zoomLevel.value, 5))
    }
    refreshMarkers()
    isTransitioning = false
  }, 400)
}

function switchToGlobe() {
  if (isTransitioning) return
  isTransitioning = true
  isGlobeView.value = true
  
  mapOpacity.value = 0
  setTimeout(() => {
    globeOpacity.value = 1
    if (globe && lastGlobeRotation) {
      globe.rotation.x = lastGlobeRotation.x
      globe.rotation.y = lastGlobeRotation.y
    }
    refreshMarkers()
    isTransitioning = false
  }, 400)
}

function onGlobeClick(event) {
  if (isDragging) return
  
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  
  // Проверяем клик по маркерам
  const allMeshes = []
  markerGroups.forEach(group => {
    group.children.forEach(child => {
      if (child.type === 'Mesh' && child.userData && child.userData.id) {
        allMeshes.push(child)
      }
    })
  })
  
  const markerIntersects = raycaster.intersectObjects(allMeshes)
  if (markerIntersects.length > 0) {
    const clicked = markerIntersects[0].object
    if (clicked.userData && clicked.userData.id) {
      const place = store.markers.find(m => m.id === clicked.userData.id)
      if (place) {
        selectedPlace.value = place
        return
      }
    }
  }
  
  if (addMode.value) {
    const globeIntersects = raycaster.intersectObject(globe)
    if (globeIntersects.length > 0) {
      const point = globeIntersects[0].point
      const coords = positionToLatLng(point)
      
      if (coords.lat > -85 && coords.lat < 85) {
        tempClickPosition = coords
        showAddForm.value = true
        newPlaceName.value = ''
        newCountry.value = ''
      }
    }
  }
}

function onGlobeWheel(event) {
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? 1 : -1
  const currentZoom = zoomLevel.value
  
  if (isGlobeView.value) {
    const newZoom = Math.max(1, Math.min(10, currentZoom + delta * 0.5))
    zoomLevel.value = newZoom
    globeScale.value = 1 + (newZoom - 1) * 0.15
    const distance = 2.8 - (newZoom - 1) * 0.15
    camera.position.z = Math.max(1.5, distance)
    
    if (newZoom >= GLOBE_TO_MAP_ZOOM) {
      switchToMap()
    }
  } else {
    const newZoom = Math.max(2, Math.min(19, currentZoom + delta))
    zoomLevel.value = newZoom
    if (map) {
      map.setZoom(newZoom)
    }
    
    if (newZoom <= MAP_TO_GLOBE_ZOOM) {
      switchToGlobe()
    }
  }
}

function onMapClick(e) {
  // Если включен режим добавления - показываем форму
  if (addMode.value) {
    tempClickPosition = { lat: e.latlng.lat, lng: e.latlng.lng }
    showAddForm.value = true
    newPlaceName.value = ''
    newCountry.value = ''
    return
  }
  
  // Просто закрываем информацию о месте, если она открыта
  // Метка НЕ перемещается и НЕ выбирается автоматически
  if (selectedPlace.value) {
    selectedPlace.value = null
  }
}

function onMouseDown(event) {
  isDragging = false
  previousMousePosition = { x: event.clientX, y: event.clientY }
}

function onMouseMove(event) {
  if (event.buttons === 1 && globe) {
    const deltaX = event.clientX - previousMousePosition.x
    const deltaY = event.clientY - previousMousePosition.y
    
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      isDragging = true
    }
    
    if (!isDragging) return
    
    globe.rotation.y += deltaX * 0.005
    globe.rotation.x += deltaY * 0.005
    globe.rotation.x = Math.max(-0.8, Math.min(0.8, globe.rotation.x))
    
    lastGlobeRotation = {
      x: globe.rotation.x,
      y: globe.rotation.y
    }
    
    previousMousePosition = { x: event.clientX, y: event.clientY }
  }
}

function onMouseUp() {
  setTimeout(() => { isDragging = false }, 100)
}

function onTouchStart(event) {
  event.preventDefault()
  const touch = event.touches[0]
  isDragging = false
  previousMousePosition = { x: touch.clientX, y: touch.clientY }
}

function onTouchMove(event) {
  event.preventDefault()
  if (event.touches.length === 1 && globe) {
    const touch = event.touches[0]
    const deltaX = touch.clientX - previousMousePosition.x
    const deltaY = touch.clientY - previousMousePosition.y
    
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      isDragging = true
    }
    
    globe.rotation.y += deltaX * 0.005
    globe.rotation.x += deltaY * 0.005
    globe.rotation.x = Math.max(-0.8, Math.min(0.8, globe.rotation.x))
    
    lastGlobeRotation = {
      x: globe.rotation.x,
      y: globe.rotation.y
    }
    
    previousMousePosition = { x: touch.clientX, y: touch.clientY }
  }
}

function onTouchEnd() {
  setTimeout(() => { isDragging = false }, 100)
}

function refreshMarkers() {
  if (isUpdating) return
  isUpdating = true
  
  updateGlobeMarkers()
  updateMapMarkers()
  
  isUpdating = false
}

function updateGlobeMarkers() {
  if (!scene || !globe) return
  
  // ПОЛНАЯ ОЧИСТКА
  markerGroups.forEach(group => {
    if (group.parent) globe.remove(group)
    group.children.forEach(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
    })
  })
  markerGroups = []
  
  labelSprites.forEach(sprite => {
    if (sprite.parent) globe.remove(sprite)
    if (sprite.material) sprite.material.dispose()
  })
  labelSprites = []

  const markers = store.filteredMarkers
  if (markers.length === 0) return

  markers.forEach((place, index) => {
    const pos = latLngToPosition(place.lat, place.lng)
    const color = getColorHex(index)
    const colorStr = getColor(index)
    
    const group = new THREE.Group()
    group.position.copy(pos)
    
    // Основной маркер
    const sphereGeom = new THREE.SphereGeometry(0.04, 16, 16)
    const sphereMat = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      shininess: 100
    })
    const sphere = new THREE.Mesh(sphereGeom, sphereMat)
    sphere.userData.id = place.id
    sphere.userData.type = 'marker'
    group.add(sphere)
    
    // Свечение
    const glowGeom = new THREE.SphereGeometry(0.055, 16, 16)
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15
    })
    const glow = new THREE.Mesh(glowGeom, glowMat)
    group.add(glow)
    
    // ДОБАВЛЯЕМ МАРКЕР КАК ДОЧЕРНИЙ ЭЛЕМЕНТ ГЛОБУСА
    globe.add(group)
    markerGroups.push(group)
    
    // Текстовая метка
    if (showLabels.value) {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.font = 'Bold 24px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 12
      ctx.fillStyle = 'white'
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.lineWidth = 3
      
      const text = place.placeName.length > 15 ? place.placeName.substring(0, 13) + '...' : place.placeName
      ctx.strokeText(text, canvas.width/2, canvas.height/2)
      ctx.fillText(text, canvas.width/2, canvas.height/2)
      
      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        sizeAttenuation: true
      })
      
      const sprite = new THREE.Sprite(spriteMaterial)
      const labelPos = pos.clone().multiplyScalar(1.12)
      sprite.position.copy(labelPos)
      sprite.scale.set(0.35, 0.1, 1)
      
      // ДОБАВЛЯЕМ МЕТКУ КАК ДОЧЕРНИЙ ЭЛЕМЕНТ ГЛОБУСА
      globe.add(sprite)
      labelSprites.push(sprite)
    }
  })
}

function updateMapMarkers() {
  if (!markersLayer) return
  
  markersLayer.clearLayers()

  const markers = store.filteredMarkers
  if (markers.length === 0) return

  markers.forEach((place, index) => {
    const color = getColor(index)
    
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          background: ${color};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${index + 1}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    })
    
    const marker = L.marker([place.lat, place.lng], { icon: customIcon })
      .bindPopup(`
        <div style="min-width: 150px;">
          <b style="font-size: 16px;">${place.placeName}</b><br>
          🌍 ${place.country || 'Неизвестная страна'}<br>
          📍 ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}
        </div>
      `, {
        className: 'custom-popup'
      })
      .addTo(markersLayer)
    
    marker.on('click', () => {
      selectedPlace.value = place
    })
  })
}

function toggleAddMode() {
  addMode.value = !addMode.value
  if (!addMode.value) {
    showAddForm.value = false
    tempClickPosition = null
  }
}

function toggleLabels() {
  showLabels.value = !showLabels.value
  refreshMarkers()
}

function saveMarker() {
  if (tempClickPosition && newPlaceName.value.trim()) {
    const existing = store.markers.find(m => 
      Math.abs(m.lat - tempClickPosition.lat) < 0.001 && 
      Math.abs(m.lng - tempClickPosition.lng) < 0.001
    )
    
    if (existing) {
      showMessage('⚠️ В этом месте уже есть метка!')
      return
    }
    
    store.addMarker(
      tempClickPosition.lat,
      tempClickPosition.lng,
      newPlaceName.value.trim(),
      newCountry.value.trim() || 'Неизвестная страна'
    )
    cancelAdd()
    showMessage('✅ Место добавлено!')
    
    setTimeout(() => {
      refreshMarkers()
    }, 50)
  }
}

function cancelAdd() {
  showAddForm.value = false
  tempClickPosition = null
  newPlaceName.value = ''
  newCountry.value = ''
  addMode.value = false
}

function showMessage(text) {
  const message = document.createElement('div')
  message.className = 'temp-message'
  message.textContent = text
  document.querySelector('.hybrid-container').appendChild(message)
  
  setTimeout(() => {
    message.classList.add('fade-out')
    setTimeout(() => message.remove(), 300)
  }, 1500)
}

function deletePlace() {
  if (selectedPlace.value) {
    store.removeMarker(selectedPlace.value.id)
    selectedPlace.value = null
    showMessage('🗑️ Место удалено')
    
    setTimeout(() => {
      refreshMarkers()
    }, 50)
  }
}

function editPlace() {
  if (selectedPlace.value) {
    const newName = prompt('Новое название:', selectedPlace.value.placeName)
    if (newName && newName.trim()) {
      store.updateMarker(selectedPlace.value.id, { placeName: newName.trim() })
      showMessage('✏️ Название обновлено')
      
      setTimeout(() => {
        refreshMarkers()
      }, 50)
    }
  }
}

function closeInfo() {
  selectedPlace.value = null
}

function resetView() {
  if (!camera || !globe) return
  
  if (!isGlobeView.value) {
    switchToGlobe()
  }
  
  const startPos = camera.position.clone()
  const endPos = new THREE.Vector3(0, 0.2, 2.8)
  const startRot = globe.rotation.clone()
  const endRot = new THREE.Euler(0, 0, 0)
  const duration = 800
  const startTime = Date.now()
  
  function animateReset() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)
    
    camera.position.lerpVectors(startPos, endPos, ease)
    globe.rotation.x = startRot.x + (endRot.x - startRot.x) * ease
    globe.rotation.y = startRot.y + (endRot.y - startRot.y) * ease
    globe.rotation.z = startRot.z + (endRot.z - startRot.z) * ease
    
    lastGlobeRotation = {
      x: globe.rotation.x,
      y: globe.rotation.y
    }
    
    if (progress < 1) {
      requestAnimationFrame(animateReset)
    }
  }
  
  animateReset()
  selectedPlace.value = null
  zoomLevel.value = 3
  globeScale.value = 1
}

function fitAllMarkers() {
  if (store.markers.length === 0) return
  
  if (!isGlobeView.value && map) {
    const bounds = L.latLngBounds(
      store.markers.map(m => [m.lat, m.lng])
    )
    map.fitBounds(bounds, { padding: [50, 50] })
  } else {
    resetView()
  }
}

function toggleView() {
  if (isTransitioning) return
  
  if (isGlobeView.value) {
    switchToMap()
    if (map) {
      map.setZoom(Math.max(zoomLevel.value, 5))
    }
  } else {
    switchToGlobe()
  }
}

function zoomIn() {
  if (isGlobeView.value) {
    const newZoom = Math.min(10, zoomLevel.value + 0.5)
    zoomLevel.value = newZoom
    globeScale.value = 1 + (newZoom - 1) * 0.15
    camera.position.z = Math.max(1.5, 2.8 - (newZoom - 1) * 0.15)
    
    if (newZoom >= GLOBE_TO_MAP_ZOOM) {
      switchToMap()
    }
  } else if (map) {
    map.zoomIn()
  }
}

function zoomOut() {
  if (isGlobeView.value) {
    const newZoom = Math.max(1, zoomLevel.value - 0.5)
    zoomLevel.value = newZoom
    globeScale.value = 1 + (newZoom - 1) * 0.15
    camera.position.z = Math.max(1.5, 2.8 - (newZoom - 1) * 0.15)
  } else if (map) {
    map.zoomOut()
    const newZoom = map.getZoom()
    if (newZoom <= MAP_TO_GLOBE_ZOOM) {
      switchToGlobe()
    }
  }
}

function searchPlace() {
  if (!searchQuery.value) return
  
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}&limit=1`
  )
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        const result = data[0]
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        
        if (!isGlobeView.value && map) {
          map.setView([lat, lng], 13)
        } else {
          const pos = latLngToPosition(lat, lng, 2.5)
          const startPos = camera.position.clone()
          const duration = 1000
          const startTime = Date.now()
          
          function animateFly() {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const ease = 1 - Math.pow(1 - progress, 3)
            camera.position.lerpVectors(startPos, pos, ease)
            if (progress < 1) {
              requestAnimationFrame(animateFly)
            }
          }
          animateFly()
        }
        
        searchQuery.value = ''
        showMessage('📍 Место найдено!')
      }
    })
    .catch(err => {
      console.error('Search error:', err)
      showMessage('❌ Ошибка поиска')
    })
}

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }
  if (map) {
    map.remove()
  }
})
</script>

<style scoped>
.hybrid-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 700px;
  background: #0a0a1a;
  border-radius: 12px;
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

.map-layer :deep(.leaflet-control-zoom) {
  display: none !important;
}

.map-layer :deep(.leaflet-tile-pane) {
  filter: brightness(0.95) contrast(1.1);
}

.map-layer :deep(.custom-marker) {
  background: none;
  border: none;
}

.map-layer :deep(.custom-marker div:hover) {
  transform: scale(1.2) !important;
}

.map-layer :deep(.custom-popup .leaflet-popup-content-wrapper) {
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
}

.map-layer :deep(.custom-popup .leaflet-popup-tip) {
  background: rgba(0, 0, 0, 0.9);
}

.switch-indicator {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  font-size: 24px;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 20px;
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
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 10px;
  background: rgba(0, 0, 0, 0.85);
  padding: 10px 16px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  flex-wrap: wrap;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.1);
  max-width: 95%;
}

.control-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-add {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-add:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-add.active {
  background: linear-gradient(135deg, #f44336, #d32f2f);
}

.btn-secondary {
  padding: 8px 16px;
  background: rgba(255,255,255,0.1);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
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
  gap: 6px;
}

.search-box input {
  padding: 8px 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  width: 180px;
}

.search-box input::placeholder {
  color: rgba(255,255,255,0.5);
}

.search-box input:focus {
  outline: 2px solid #667eea;
  border-color: transparent;
}

.search-box button {
  padding: 8px 14px;
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

.zoom-controls {
  display: flex;
  gap: 4px;
}

.btn-zoom {
  width: 34px;
  height: 34px;
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
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.95);
  padding: 20px 24px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  min-width: 300px;
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
  margin: 0 0 12px 0;
  color: white;
  font-size: 16px;
}

.add-form input {
  width: 100%;
  padding: 10px 12px;
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
  font-size: 14px;
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
  bottom: 120px;
  right: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.95);
  padding: 16px 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  min-width: 200px;
  color: white;
  animation: slideUp 0.3s ease;
}

.place-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
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
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
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
  margin-left: auto;
}

.btn-close:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.05);
}

.stats {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 14px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  display: flex;
  gap: 14px;
}

.zoom-level {
  color: #667eea;
}

.temp-message {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  animation: slideUp 0.3s ease;
  border: 1px solid rgba(255,255,255,0.1);
  pointer-events: none;
}

.temp-message.fade-out {
  opacity: 0;
  transition: opacity 0.3s;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
    padding: 10px;
    top: 10px;
    width: calc(100% - 20px);
  }

  .control-group {
    justify-content: center;
  }

  .search-box {
    flex-direction: column;
  }

  .search-box input {
    width: 100%;
  }

  .add-form {
    min-width: auto;
    width: calc(100% - 40px);
    bottom: 100px;
  }

  .place-info {
    bottom: 100px;
    right: 10px;
    min-width: auto;
    width: calc(100% - 40px);
  }

  .stats {
    bottom: 10px;
    left: 10px;
    font-size: 12px;
  }

  .switch-indicator {
    bottom: 60px;
    font-size: 18px;
    padding: 4px 12px;
  }
}
</style>