import { computed, onMounted, ref, watch } from 'vue'
import { pacdFileService } from '@/services/peso/pacdFileService'
import type { PacdFile, PacdFileCategory, PacdFileFormData, PacdFileFormErrors } from '@/types/peso/pacdFile'
import {
  formatFileSize,
  formatFileType,
  formatPacdCategory,
  getFileTypeBadgeClass,
  getPacdCategoryBadgeClass,
  isPdf,
  PACD_CATEGORY_FILTER_OPTIONS,
  PACD_CATEGORY_OPTIONS,
  PACD_DESCRIPTION_MAX,
  PACD_FILE_ACCEPT,
  PACD_TITLE_MAX,
  pacdFileMatches,
  resolvePacdMimeType,
  titleFromFileName,
  validatePacdFile,
  validatePacdForm,
} from '@/helpers/peso/pacdFileHelper'
import { getPageRange, getVisiblePages } from '@/helpers/common/paginationHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { usePrintDocument } from '@/composables/common/usePrintDocument'

/** Files page (admins): the PACD file container — upload, open, download, edit and delete forms. */
export function usePacdFiles() {
  const toast = useToastAlert()
  const { printPdf } = usePrintDocument()

  // ─── Data ───
  const files = ref<PacdFile[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  const fetchFiles = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      files.value = await pacdFileService.getFiles()
    } catch (err) {
      console.error('Failed to load the PACD files.')
      loadError.value = err instanceof Error ? err.message : 'Failed to load the files.'
    } finally {
      isLoading.value = false
    }
  }

  // ─── Search, filter & pagination ───
  const searchQuery = ref('')
  const categoryFilter = ref<string>('ALL')

  const filteredFiles = computed(() =>
    files.value.filter((f) => pacdFileMatches(f, searchQuery.value, categoryFilter.value)),
  )
  const hasActiveFilters = computed(() => searchQuery.value.trim() !== '' || categoryFilter.value !== 'ALL')
  const resetFilters = () => {
    searchQuery.value = ''
    categoryFilter.value = 'ALL'
  }
  const clearSearch = () => {
    searchQuery.value = ''
  }

  const pageSize = 10
  const currentPage = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredFiles.value.length / pageSize)))
  const paginatedFiles = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredFiles.value.slice(start, start + pageSize)
  })
  const pageRange = computed(() => getPageRange(currentPage.value, pageSize, filteredFiles.value.length))
  const visiblePages = computed(() => getVisiblePages(currentPage.value, totalPages.value))
  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
  }
  watch([searchQuery, categoryFilter], () => {
    currentPage.value = 1
  })
  watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
  })

  // ─── Bulk selection ───
  const selectedIds = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)
  const isSelected = (id: string) => selectedIds.value.has(id)
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }
  const isAllPageSelected = computed(
    () => paginatedFiles.value.length > 0 && paginatedFiles.value.every((f) => selectedIds.value.has(f.id)),
  )
  const isPagePartiallySelected = computed(
    () => !isAllPageSelected.value && paginatedFiles.value.some((f) => selectedIds.value.has(f.id)),
  )
  const isAllFilteredSelected = computed(
    () => filteredFiles.value.length > 0 && selectedIds.value.size === filteredFiles.value.length,
  )
  const toggleSelectPage = () => {
    const next = new Set(selectedIds.value)
    if (isAllPageSelected.value) paginatedFiles.value.forEach((f) => next.delete(f.id))
    else paginatedFiles.value.forEach((f) => next.add(f.id))
    selectedIds.value = next
  }
  const selectAllFiltered = () => {
    selectedIds.value = new Set(filteredFiles.value.map((f) => f.id))
  }
  const clearSelection = () => {
    selectedIds.value = new Set()
  }
  // Never keep hidden rows selected
  watch(filteredFiles, (rows) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(rows.map((f) => f.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  // ─── Upload / edit dialog ───
  const emptyForm = (): PacdFileFormData => ({ title: '', category: 'forms', description: '' })
  const isFormOpen = ref(false)
  const editingFile = ref<PacdFile | null>(null)
  const isEditMode = computed(() => editingFile.value !== null)
  const formData = ref<PacdFileFormData>(emptyForm())
  const formErrors = ref<PacdFileFormErrors>({})
  const pickedFile = ref<File | null>(null)
  const isSubmitting = ref(false)
  /** Bumped to clear the native file input (it can't be bound with v-model) */
  const fileInputKey = ref(0)
  const pickedFileLabel = computed(() =>
    pickedFile.value ? `${pickedFile.value.name} · ${formatFileSize(pickedFile.value.size)}` : '',
  )

  const openUpload = () => {
    editingFile.value = null
    formData.value = emptyForm()
    if (categoryFilter.value !== 'ALL') formData.value.category = categoryFilter.value as PacdFileCategory
    formErrors.value = {}
    pickedFile.value = null
    fileInputKey.value++
    isFormOpen.value = true
  }
  const openEdit = (file: PacdFile) => {
    editingFile.value = file
    formData.value = { title: file.title, category: file.category, description: file.description }
    formErrors.value = {}
    pickedFile.value = null
    isFormOpen.value = true
  }
  const closeForm = () => {
    if (isSubmitting.value) return
    isFormOpen.value = false
    editingFile.value = null
  }
  const onFormOpenChange = (open: boolean) => {
    if (!open) closeForm()
  }

  const onFilePicked = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] ?? null
    pickedFile.value = file
    const error = validatePacdFile(file)
    formErrors.value = { ...formErrors.value, file: error }
    // A new file fills an empty title
    if (file && !error && !formData.value.title.trim()) formData.value.title = titleFromFileName(file.name)
  }
  const onCategoryChange = (value: string) => {
    formData.value.category = value as PacdFileCategory
  }

  const handleSubmit = async () => {
    const errors = validatePacdForm(formData.value)
    const file = pickedFile.value
    if (!isEditMode.value) errors.file = validatePacdFile(file)
    formErrors.value = errors
    if (errors.title || errors.description || errors.file) return

    isSubmitting.value = true
    try {
      if (editingFile.value) {
        await pacdFileService.updateFile(editingFile.value.id, formData.value)
        toast.show('File details saved.', 'success')
      } else if (file) {
        const mimeType = resolvePacdMimeType(file)
        if (!mimeType) return
        await pacdFileService.uploadFile(file, mimeType, formData.value)
        toast.show(`"${formData.value.title.trim()}" uploaded.`, 'success')
      }
      isSubmitting.value = false
      closeForm()
      await fetchFiles()
    } catch (err) {
      formErrors.value = { submit: err instanceof Error ? err.message : 'Something went wrong. Please try again.' }
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Open & download ───
  const openingId = ref<string | null>(null)

  /** PDFs open in a new tab (print from there); Word and Excel files download */
  const openFile = async (file: PacdFile) => {
    if (!isPdf(file)) return downloadFile(file)
    // Open the tab now, while the click still counts, so the popup blocker lets it through
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    openingId.value = file.id
    try {
      const url = await pacdFileService.getFileUrl(file, false)
      if (tab) tab.location.href = url
      else window.location.assign(url)
    } catch (err) {
      tab?.close()
      toast.show(err instanceof Error ? err.message : 'This file could not be opened.', 'error')
    } finally {
      openingId.value = null
    }
  }

  const downloadFile = async (file: PacdFile) => {
    openingId.value = file.id
    try {
      const url = await pacdFileService.getFileUrl(file, true)
      const link = document.createElement('a')
      link.href = url
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'This file could not be downloaded.', 'error')
    } finally {
      openingId.value = null
    }
  }

  /** PDFs print straight from the page; Word and Excel files have to be downloaded and printed from their app */
  const printingId = ref<string | null>(null)
  const printFile = async (file: PacdFile) => {
    if (!isPdf(file) || printingId.value) return
    printingId.value = file.id
    try {
      printPdf(await pacdFileService.getFileBlob(file))
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'This file could not be printed.', 'error')
    } finally {
      printingId.value = null
    }
  }

  // ─── Delete (single + bulk share one dialog) ───
  const filesToDelete = ref<PacdFile[]>([])
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)
  const deletePreview = computed(() => filesToDelete.value.slice(0, 50))
  const deleteOverflow = computed(() => Math.max(0, filesToDelete.value.length - 50))

  const requestDelete = (file: PacdFile) => {
    filesToDelete.value = [file]
    isDeleteDialogOpen.value = true
  }
  const requestBulkDelete = () => {
    const selected = filteredFiles.value.filter((f) => selectedIds.value.has(f.id))
    if (selected.length === 0) return
    filesToDelete.value = selected
    isDeleteDialogOpen.value = true
  }
  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    isDeleteDialogOpen.value = false
    filesToDelete.value = []
  }
  const onDeleteDialogOpenChange = (open: boolean) => {
    if (!open) closeDeleteDialog()
  }
  const confirmDelete = async () => {
    const targets = filesToDelete.value
    if (targets.length === 0) return
    isDeleting.value = true
    try {
      const deleted = new Set(await pacdFileService.deleteFiles(targets))
      files.value = files.value.filter((f) => !deleted.has(f.id))
      selectedIds.value = new Set([...selectedIds.value].filter((id) => !deleted.has(id)))
      isDeleting.value = false
      closeDeleteDialog()
      if (deleted.size < targets.length) {
        toast.show(`Deleted ${deleted.size} of ${targets.length} files.`, 'error')
      } else {
        toast.show(`${deleted.size} ${deleted.size === 1 ? 'file' : 'files'} deleted.`, 'success')
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to delete the files.', 'error')
      await fetchFiles()
    } finally {
      isDeleting.value = false
    }
  }

  onMounted(() => {
    void fetchFiles()
  })

  return {
    files,
    isLoading,
    loadError,
    fetchFiles,
    searchQuery,
    categoryFilter,
    categoryFilterOptions: PACD_CATEGORY_FILTER_OPTIONS,
    categoryOptions: PACD_CATEGORY_OPTIONS,
    hasActiveFilters,
    resetFilters,
    clearSearch,
    filteredFiles,
    paginatedFiles,
    currentPage,
    totalPages,
    pageRange,
    visiblePages,
    setPage,
    selectedCount,
    isSelected,
    toggleSelect,
    isAllPageSelected,
    isPagePartiallySelected,
    isAllFilteredSelected,
    toggleSelectPage,
    selectAllFiltered,
    clearSelection,
    isFormOpen,
    isEditMode,
    editingFile,
    formData,
    formErrors,
    isSubmitting,
    fileInputKey,
    pickedFileLabel,
    fileAccept: PACD_FILE_ACCEPT,
    titleMax: PACD_TITLE_MAX,
    descriptionMax: PACD_DESCRIPTION_MAX,
    openUpload,
    openEdit,
    closeForm,
    onFormOpenChange,
    onFilePicked,
    onCategoryChange,
    handleSubmit,
    openingId,
    openFile,
    downloadFile,
    printingId,
    printFile,
    filesToDelete,
    deletePreview,
    deleteOverflow,
    isDeleteDialogOpen,
    isDeleting,
    requestDelete,
    requestBulkDelete,
    closeDeleteDialog,
    onDeleteDialogOpenChange,
    confirmDelete,
    isPdf,
    formatFileSize,
    formatFileType,
    getFileTypeBadgeClass,
    formatPacdCategory,
    getPacdCategoryBadgeClass,
  }
}
