<template>
  <div class="globe-container">
    <div ref="globeContainer" class="globe"></div>
    
    <!-- Панель управления -->
    <div class="controls">
      <div class="control-group">
        <button @click="toggleAddMode" :class="{ active: addMode }" class="btn-add">
          {{ addMode ? '❌ Отмена' : '➕ Добавить место' }}
        </button>
        <button @click="resetView" class="btn-secondary">
          🔄 Сбросить вид
        </button>
        <button @click="fitToMarkers" class="btn-secondary" v-if="store.markers.length > 0">
          📍 Показать все
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
    </div>

    <!-- Форма добавления места -->
    <div v-if="showAddForm" class="add-form">
      <h4>📍 Новое место</h4>
      <div class="form-group">
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
    </div>

    <!-- Информация о маркере -->
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

    <!-- Статистика -->
    <div class="stats">
      <span>📍 {{ store.markers.length }}</span>
      <span>🏳️ {{ store.countriesVisited.length }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useMapStore } from '~/composables/useMapStore'

let THREE = null
let scene, camera, renderer, globe
let markerMeshes = []
let isDragging = false
let previousMousePosition = { x: 0, y: 0 }
let raycaster, mouse
let animationId = null
let isInitialized = false
let lastClickTime = 0

const store = useMapStore()
const globeContainer = ref(null)
const selectedPlace = ref(null)
const searchQuery = ref('')
const addMode = ref(false)
const showAddForm = ref(false)
const newPlaceName = ref('')
const newCountry = ref('')
let tempClickPosition = null

// Конвертация координат в позицию на сфере
function latLngToPosition(lat, lng, radius = 1.02) {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lng + 180) * Math.PI / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Конвертация позиции в координаты
function positionToLatLng(position) {
  const lat = 90 - Math.acos(position.y / 1) * 180 / Math.PI
  const lng = (Math.atan2(position.z, position.x) * 180 / Math.PI) - 180
  return { lat, lng }
}

function getColor(index) {
  const colors = [
    0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4,
    0xFFEAA7, 0xDDA0DD, 0x98D8C8, 0xF7DC6F,
    0xBB8FCE, 0x85C1E9, 0xF8C471, 0x82E0AA
  ]
  return colors[index % colors.length]
}

onMounted(async () => {
  if (process.client) {
    try {
      THREE = await import('three')
      await initGlobe()
      isInitialized = true
      
      store.loadFromLocalStorage()
      updateMarkers()

      watch(
        () => store.filteredMarkers,
        () => {
          if (isInitialized) updateMarkers()
        },
        { deep: true }
      )
    } catch (error) {
      console.error('Error loading Three.js:', error)
    }
  }
})

function initGlobe() {
  return new Promise((resolve) => {
    const container = globeContainer.value
    if (!container) { resolve(); return }

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    // Сцена
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a1a)

    // Камера
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0.5, 3)

    // Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Глобус
    const geometry = new THREE.SphereGeometry(1, 64, 64)
    const textureLoader = new THREE.TextureLoader()
    const texture = textureLoader.load(
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
    )
    
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      specular: new THREE.Color(0x333333),
      shininess: 25
    })
    
    globe = new THREE.Mesh(geometry, material)
    scene.add(globe)

    // Атмосфера
    const atmosphereGeometry = new THREE.SphereGeometry(1.01, 64, 64)
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    })
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    scene.add(atmosphere)

    // Звезды
    const starsGeometry = new THREE.BufferGeometry()
    const starsCount = 3000
    const starsPositions = new Float32Array(starsCount * 3)
    for (let i = 0; i < starsCount * 3; i += 3) {
      const radius = 300 + Math.random() * 700
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starsPositions[i] = radius * Math.sin(phi) * Math.cos(theta)
      starsPositions[i + 1] = radius * Math.cos(phi)
      starsPositions[i + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3))
    const starsMaterial = new THREE.PointsMaterial({ 
      color: 0xffffff, 
      size: 0.5,
      transparent: true,
      opacity: 0.8
    })
    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)

    // Свет
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
    directionalLight.position.set(5, 3, 5)
    scene.add(directionalLight)
    
    const backLight = new THREE.DirectionalLight(0x4488ff, 0.3)
    backLight.position.set(-5, -3, -5)
    scene.add(backLight)

    // Raycaster для кликов
    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()

    // Обработка кликов
    renderer.domElement.addEventListener('click', onGlobeClick)

    // Обработка перетаскивания (вращение)
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    // Touch support
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false })
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false })
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: false })

    // Анимация
    function animate() {
      animationId = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // Адаптация размера
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

function onGlobeClick(event) {
  // Игнорируем клик если это перетаскивание
  if (isDragging) return
  
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  
  // Проверяем клик по маркеру
  const markerIntersects = raycaster.intersectObjects(markerMeshes)
  
  if (markerIntersects.length > 0) {
    const clickedMesh = markerIntersects[0].object
    const place = store.markers.find(m => m.id === clickedMesh.userData.id)
    if (place) {
      selectedPlace.value = place
      return
    }
  }
  
  // Если нажали на пустое место - закрываем информацию
  selectedPlace.value = null
  
  // Проверяем клик по глобусу для добавления места
  if (addMode.value) {
    const globeIntersects = raycaster.intersectObject(globe)
    if (globeIntersects.length > 0) {
      const point = globeIntersects[0].point
      const coords = positionToLatLng(point)
      
      // Проверяем, что координаты валидные
      if (coords.lat > -85 && coords.lat < 85) {
        tempClickPosition = coords
        showAddForm.value = true
        newPlaceName.value = ''
        newCountry.value = ''
        // Фокусируемся на поле ввода
        nextTick(() => {
          const input = document.querySelector('.add-form input:first-child')
          if (input) input.focus()
        })
      }
    }
  }
}

function onMouseDown(event) {
  isDragging = false
  previousMousePosition = { x: event.clientX, y: event.clientY }
}

function onMouseMove(event) {
  if (event.buttons === 1) {
    const deltaX = event.clientX - previousMousePosition.x
    const deltaY = event.clientY - previousMousePosition.y
    
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      isDragging = true
    }
    
    if (globe) {
      globe.rotation.y += deltaX * 0.005
      globe.rotation.x += deltaY * 0.005
      globe.rotation.x = Math.max(-0.8, Math.min(0.8, globe.rotation.x))
    }
    
    previousMousePosition = { x: event.clientX, y: event.clientY }
  }
}

function onMouseUp() {
  setTimeout(() => {
    isDragging = false
  }, 100)
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
    
    previousMousePosition = { x: touch.clientX, y: touch.clientY }
  }
}

function onTouchEnd() {
  setTimeout(() => {
    isDragging = false
  }, 100)
}

function updateMarkers() {
  if (!scene || !globe) return
  
  // Удаляем старые маркеры
  markerMeshes.forEach(mesh => {
    scene.remove(mesh)
  })
  markerMeshes = []

  store.filteredMarkers.forEach((place, index) => {
    const pos = latLngToPosition(place.lat, place.lng)
    const color = getColor(index)
    
    // Группа для маркера
    const group = new THREE.Group()
    group.position.copy(pos)
    
    // Основной маркер
    const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16)
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.2,
      shininess: 100
    })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphere.userData.id = place.id
    sphere.userData.type = 'marker'
    group.add(sphere)
    
    // Свечение
    const glowGeometry = new THREE.SphereGeometry(0.055, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    group.add(glow)
    
    scene.add(group)
    markerMeshes.push(sphere, glow)
  })
}

function toggleAddMode() {
  addMode.value = !addMode.value
  if (!addMode.value) {
    showAddForm.value = false
    tempClickPosition = null
  }
}

function saveMarker() {
  if (tempClickPosition && newPlaceName.value.trim()) {
    store.addMarker(
      tempClickPosition.lat,
      tempClickPosition.lng,
      newPlaceName.value.trim(),
      newCountry.value.trim() || 'Неизвестная страна'
    )
    cancelAdd()
    // Показываем визуальное подтверждение
    showTemporaryMessage('✅ Место добавлено!')
  }
}

function cancelAdd() {
  showAddForm.value = false
  tempClickPosition = null
  newPlaceName.value = ''
  newCountry.value = ''
  addMode.value = false
}

function showTemporaryMessage(text) {
  // Создаем временное сообщение
  const message = document.createElement('div')
  message.className = 'temp-message'
  message.textContent = text
  document.querySelector('.globe-container').appendChild(message)
  
  setTimeout(() => {
    message.classList.add('fade-out')
    setTimeout(() => message.remove(), 300)
  }, 1500)
}

function deletePlace() {
  if (selectedPlace.value) {
    store.removeMarker(selectedPlace.value.id)
    selectedPlace.value = null
    showTemporaryMessage('🗑️ Место удалено')
  }
}

function editPlace() {
  if (selectedPlace.value) {
    const newName = prompt('Новое название:', selectedPlace.value.placeName)
    if (newName && newName.trim()) {
      store.updateMarker(selectedPlace.value.id, { placeName: newName.trim() })
      showTemporaryMessage('✏️ Название обновлено')
    }
  }
}

function closeInfo() {
  selectedPlace.value = null
}

function resetView() {
  if (!camera || !globe) return
  
  // Анимируем возврат камеры
  const startPos = camera.position.clone()
  const endPos = new THREE.Vector3(0, 0.5, 3)
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
    
    if (progress < 1) {
      requestAnimationFrame(animateReset)
    }
  }
  
  animateReset()
  selectedPlace.value = null
}

function fitToMarkers() {
  if (store.markers.length === 0 || !globe) return
  
  // Показываем все маркеры - просто сбрасываем вид
  resetView()
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
        
        // Вращаем глобус к найденному месту
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
        searchQuery.value = ''
        showTemporaryMessage('📍 Место найдено!')
      }
    })
    .catch(err => {
      console.error('Search error:', err)
      showTemporaryMessage('❌ Ошибка поиска')
    })
}

// Cleanup
onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.globe-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 700px;
  background: #0a0a1a;
  border-radius: 12px;
  overflow: hidden;
}

.globe {
  width: 100%;
  height: 100%;
  min-height: 700px;
  cursor: grab;
}

.globe:active {
  cursor: grabbing;
}

.controls {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
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

.add-form {
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
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

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group input {
  padding: 10px 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: white;
  font-size: 14px;
}

.form-group input::placeholder {
  color: rgba(255,255,255,0.5);
}

.form-group input:focus {
  outline: 2px solid #667eea;
  border-color: transparent;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-save {
  flex: 1;
  padding: 8px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-save:hover {
  background: #45a049;
  transform: scale(1.02);
}

.btn-cancel {
  flex: 1;
  padding: 8px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #d32f2f;
  transform: scale(1.02);
}

.place-info {
  position: absolute;
  bottom: 120px;
  right: 20px;
  z-index: 100;
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
  z-index: 100;
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

.stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Временное сообщение */
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
}
</style>