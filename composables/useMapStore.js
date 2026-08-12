import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', {
  state: () => ({
    markers: [],
    selectedPlace: null,
    filterCountry: null
  }),

  getters: {
    countriesVisited: (state) => {
      const countries = new Set()
      state.markers.forEach(marker => {
        if (marker.country) countries.add(marker.country)
      })
      return Array.from(countries).sort()
    },
    
    filteredMarkers: (state) => {
      if (!state.filterCountry) return state.markers
      return state.markers.filter(m => m.country === state.filterCountry)
    }
  },

  actions: {
    addMarker(lat, lng, placeName, country = null) {
      const marker = {
        id: Date.now(),
        lat,
        lng,
        placeName: placeName || 'Новое место',
        country: country || 'Неизвестная страна',
        date: new Date().toISOString(),
        visited: true
      }
      this.markers.push(marker)
      this.saveToLocalStorage()
      return marker
    },

    removeMarker(id) {
      this.markers = this.markers.filter(m => m.id !== id)
      this.saveToLocalStorage()
    },

    updateMarker(id, data) {
      const index = this.markers.findIndex(m => m.id === id)
      if (index !== -1) {
        this.markers[index] = { ...this.markers[index], ...data }
        this.saveToLocalStorage()
      }
    },

    setFilter(country) {
      this.filterCountry = country
    },

    clearFilter() {
      this.filterCountry = null
    },

    loadFromLocalStorage() {
      if (process.client) {
        const stored = localStorage.getItem('visitedPlaces')
        if (stored) {
          try {
            this.markers = JSON.parse(stored)
          } catch (e) {
            console.error('Error loading markers', e)
          }
        }
      }
    },

    saveToLocalStorage() {
      if (process.client) {
        localStorage.setItem('visitedPlaces', JSON.stringify(this.markers))
      }
    }
  }
})