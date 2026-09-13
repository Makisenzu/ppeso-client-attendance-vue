import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { officeService } from '@/services/peso/officeService'
import type { OfficeFormData, OfficeRecord, OfficeStatsSummary } from '@/types/peso/office'

export const useOfficeStore = defineStore('office', () => {
  const offices = ref<OfficeRecord[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const activeOffices = computed<OfficeRecord[]>(() =>
    offices.value.filter((off) => off.isActive),
  )

  const statsSummary = computed<OfficeStatsSummary>(() => {
    let activeCount = 0
    let inactiveCount = 0
    let totalBeneficiaries = 0

    for (const off of offices.value) {
      if (off.isActive) {
        activeCount++
      } else {
        inactiveCount++
      }
      totalBeneficiaries += off.totalBeneficiaries || 0
    }

    return {
      total: offices.value.length,
      activeCount,
      inactiveCount,
      totalBeneficiaries,
    }
  })

  const fetchOffices = async () => {
    isLoading.value = true
    error.value = null
    try {
      offices.value = await officeService.getOffices()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch offices'
      error.value = msg
      console.error('OfficeStore.fetchOffices failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  const addOffice = async (formData: OfficeFormData) => {
    const result = await officeService.createOffice(formData)
    if (result.success) {
      await fetchOffices()
    }
    return result
  }

  const updateOffice = async (id: string, formData: OfficeFormData) => {
    const result = await officeService.updateOffice(id, formData)
    if (result.success) {
      await fetchOffices()
    }
    return result
  }

  const deleteOffice = async (id: string) => {
    const result = await officeService.deleteOffice(id)
    if (result.success) {
      offices.value = offices.value.filter((o) => o.id !== id)
    }
    return result
  }

  const toggleStatus = async (id: string, isActive: boolean) => {
    const result = await officeService.toggleOfficeStatus(id, isActive)
    if (result.success) {
      const target = offices.value.find((o) => o.id === id)
      if (target) {
        target.isActive = isActive
      }
    }
    return result
  }

  return {
    offices,
    activeOffices,
    isLoading,
    error,
    statsSummary,
    fetchOffices,
    addOffice,
    updateOffice,
    deleteOffice,
    toggleStatus,
  }
})
