import { ref, computed, watch } from 'vue'
import { getRegions, getProvinces, getCities, getBarangays } from '@/helpers/common/psgcHelpers'

export interface PsgcLocationEntity {
  code: string
  name: string
  [key: string]: any
}

export function usePsgc() {
  // Selected values
  const selectedRegion = ref<PsgcLocationEntity | null>(null)
  const selectedProvince = ref<PsgcLocationEntity | null>(null)
  const selectedCity = ref<PsgcLocationEntity | null>(null)
  const selectedBarangay = ref<PsgcLocationEntity | null>(null)

  // Search terms
  const regionSearch = ref('')
  const provinceSearch = ref('')
  const citySearch = ref('')
  const barangaySearch = ref('')

  // Data arrays
  const regions = ref<PsgcLocationEntity[]>([])
  const provinces = ref<PsgcLocationEntity[]>([])
  const cities = ref<PsgcLocationEntity[]>([])
  const barangays = ref<PsgcLocationEntity[]>([])

  // Loading states
  const isLoadingProvinces = ref(false)
  const isLoadingCities = ref(false)
  const isLoadingBarangays = ref(false)

  // Filtered computed properties
  const filteredRegions = computed(() => {
    if (!regionSearch.value) return regions.value
    return regions.value.filter(r =>
      r.name.toLowerCase().includes(regionSearch.value.toLowerCase())
    )
  })

  const filteredProvinces = computed(() => {
    if (!provinceSearch.value) return provinces.value
    return provinces.value.filter(p =>
      p.name.toLowerCase().includes(provinceSearch.value.toLowerCase())
    )
  })

  const filteredCities = computed(() => {
    if (!citySearch.value) return cities.value
    return cities.value.filter(c =>
      c.name.toLowerCase().includes(citySearch.value.toLowerCase())
    )
  })

  const filteredBarangays = computed(() => {
    if (!barangaySearch.value) return barangays.value
    return barangays.value.filter(b =>
      b.name.toLowerCase().includes(barangaySearch.value.toLowerCase())
    )
  })

  // Load functions
  const loadRegions = async () => {
    regions.value = await getRegions()
  }

  const loadProvinces = async (regionCode: string) => {
    isLoadingProvinces.value = true
    try {
      provinces.value = await getProvinces(regionCode)
    } finally {
      isLoadingProvinces.value = false
    }
  }

  const loadCities = async (provinceCode: string) => {
    isLoadingCities.value = true
    try {
      cities.value = await getCities(provinceCode)
    } finally {
      isLoadingCities.value = false
    }
  }

  const loadBarangays = async (cityCode: string) => {
    isLoadingBarangays.value = true
    try {
      barangays.value = await getBarangays(cityCode)
    } finally {
      isLoadingBarangays.value = false
    }
  }

  const isRestoring = ref(false)

  // Watchers for region selection changes
  watch(selectedRegion, async (newRegion) => {
    if (newRegion) {
      if (!isRestoring.value) {
        selectedProvince.value = null
        selectedCity.value = null
        selectedBarangay.value = null
        cities.value = []
        barangays.value = []
      }
      await loadProvinces(newRegion.code)
    }
  })

  // Watchers for province selection changes
  watch(selectedProvince, async (newProvince) => {
    if (newProvince) {
      if (!isRestoring.value) {
        selectedCity.value = null
        selectedBarangay.value = null
        barangays.value = []
      }
      await loadCities(newProvince.code)
    }
  })

  // Watchers for city selection changes
  watch(selectedCity, async (newCity) => {
    if (newCity) {
      if (!isRestoring.value) {
        selectedBarangay.value = null
      }
      await loadBarangays(newCity.code)
    }
  })

  // Reset function
  const reset = () => {
    selectedRegion.value = null
    selectedProvince.value = null
    selectedCity.value = null
    selectedBarangay.value = null
    regionSearch.value = ''
    provinceSearch.value = ''
    citySearch.value = ''
    barangaySearch.value = ''
    provinces.value = []
    cities.value = []
    barangays.value = []
  }

  // Initialize on first use with default or provided location
  const initialize = async (
    regionName?: string,
    provinceName?: string,
    cityName?: string,
    barangayName?: string
  ) => {
    if (regionName) {
      isRestoring.value = true
      try {
        await loadRegions()
        const region = regions.value.find(
          r => r.name?.trim().toLowerCase() === regionName.trim().toLowerCase()
        )
        if (region) {
          selectedRegion.value = region
          await loadProvinces(region.code)

          if (provinceName) {
            const province = provinces.value.find(
              p => p.name?.trim().toLowerCase() === provinceName.trim().toLowerCase()
            )
            if (province) {
              selectedProvince.value = province
              await loadCities(province.code)

              if (cityName) {
                const city = cities.value.find(
                  c => c.name?.trim().toLowerCase() === cityName.trim().toLowerCase()
                )
                if (city) {
                  selectedCity.value = city
                  await loadBarangays(city.code)

                  if (barangayName) {
                    const barangay = barangays.value.find(
                      b => b.name?.trim().toLowerCase() === barangayName.trim().toLowerCase()
                    )
                    if (barangay) {
                      selectedBarangay.value = barangay
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to restore location values:', error)
      } finally {
        isRestoring.value = false
      }
    } else {
      await loadRegions()
    }
  }

  return {
    // Selected values
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,

    // Search terms
    regionSearch,
    provinceSearch,
    citySearch,
    barangaySearch,

    // Data arrays
    regions,
    provinces,
    cities,
    barangays,

    // Loading states
    isLoadingProvinces,
    isLoadingCities,
    isLoadingBarangays,

    // Filtered computed properties
    filteredRegions,
    filteredProvinces,
    filteredCities,
    filteredBarangays,

    // Functions
    loadRegions,
    loadProvinces,
    loadCities,
    loadBarangays,
    reset,
    initialize,
  }
}
