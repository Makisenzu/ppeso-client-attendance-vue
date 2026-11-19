import { computed, onMounted, ref, watch } from 'vue'
import { evaluationService } from '@/services/peso/evaluationService'
import type { EvaluationCategory, EvaluationQuestion, EvaluationQuestionFormData } from '@/types/common/evaluation'
import {
  EVALUATION_CATEGORY_OPTIONS,
  formatCategoryLabel,
  QUESTION_MAX_LENGTH,
  sortQuestions,
} from '@/helpers/common/evaluationHelper'
import { getPageRange } from '@/helpers/common/paginationHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { SearchSelectOption } from '@/types/common/searchSelect'

type CategoryFilter = 'ALL' | EvaluationCategory

const CATEGORY_FILTER_OPTIONS: SearchSelectOption[] = [
  { value: 'ALL', label: 'All Categories' },
  ...EVALUATION_CATEGORY_OPTIONS,
]

const emptyForm = (category: EvaluationCategory = 'performance', sortOrder = 1): EvaluationQuestionFormData => ({
  category,
  question: '',
  sortOrder,
  isActive: true,
})

/**
 * Questions tab of the admin Evaluations page (core.evaluation_questions). Supervisors rate every
 * active question; inactive ones are kept but no longer asked. Submitted evaluations keep their own copy.
 */
export function useEvaluationQuestions() {
  const toast = useToastAlert()
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    toast.show(text, type)
  }

  // ─── Data ───
  const questions = ref<EvaluationQuestion[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  const fetchQuestions = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      questions.value = sortQuestions(await evaluationService.getQuestions())
    } catch (err) {
      console.error('Failed to load evaluation questions')
      loadError.value = err instanceof Error ? err.message : 'Failed to load the evaluation questions.'
    } finally {
      isLoading.value = false
    }
  }

  // ─── Search & Filter ───
  const searchQuery = ref('')
  const categoryFilter = ref<CategoryFilter>('ALL')

  const filteredQuestions = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return questions.value.filter((item) => {
      if (categoryFilter.value !== 'ALL' && item.category !== categoryFilter.value) return false
      return !q || item.question.toLowerCase().includes(q)
    })
  })

  const stats = computed(() => ({
    total: questions.value.length,
    active: questions.value.filter((q) => q.isActive).length,
    performance: questions.value.filter((q) => q.isActive && q.category === 'performance').length,
    attitude: questions.value.filter((q) => q.isActive && q.category === 'attitude').length,
  }))

  // ─── Pagination (10 per page) ───
  const PAGE_SIZE = 10
  const currentPage = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredQuestions.value.length / PAGE_SIZE)))
  const paginatedQuestions = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredQuestions.value.slice(start, start + PAGE_SIZE)
  })
  const pageRange = computed(() => getPageRange(currentPage.value, PAGE_SIZE, filteredQuestions.value.length))

  watch([searchQuery, categoryFilter], () => {
    currentPage.value = 1
  })
  watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
  })

  const prevPage = () => {
    if (currentPage.value > 1) currentPage.value--
  }
  const nextPage = () => {
    if (currentPage.value < totalPages.value) currentPage.value++
  }

  const hasActiveFilters = computed(() => searchQuery.value.trim() !== '' || categoryFilter.value !== 'ALL')
  const resetFilters = () => {
    searchQuery.value = ''
    categoryFilter.value = 'ALL'
  }
  const clearSearch = () => {
    searchQuery.value = ''
  }

  // ─── Bulk Selection ───
  const selectedIds = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)
  const selectedRecords = computed(() => filteredQuestions.value.filter((q) => selectedIds.value.has(q.id)))
  const isAllPageSelected = computed(
    () => paginatedQuestions.value.length > 0 && paginatedQuestions.value.every((q) => selectedIds.value.has(q.id)),
  )
  const isPagePartiallySelected = computed(
    () => !isAllPageSelected.value && paginatedQuestions.value.some((q) => selectedIds.value.has(q.id)),
  )
  const isAllFilteredSelected = computed(
    () => filteredQuestions.value.length > 0 && selectedIds.value.size === filteredQuestions.value.length,
  )

  const isSelected = (id: string) => selectedIds.value.has(id)
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }
  const toggleSelectPage = () => {
    const next = new Set(selectedIds.value)
    if (isAllPageSelected.value) paginatedQuestions.value.forEach((q) => next.delete(q.id))
    else paginatedQuestions.value.forEach((q) => next.add(q.id))
    selectedIds.value = next
  }
  const selectAllFiltered = () => {
    selectedIds.value = new Set(filteredQuestions.value.map((q) => q.id))
  }
  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  // Never keep hidden rows selected.
  watch(filteredQuestions, (items) => {
    if (selectedIds.value.size === 0) return
    const visible = new Set(items.map((q) => q.id))
    const pruned = new Set([...selectedIds.value].filter((id) => visible.has(id)))
    if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned
  })

  // ─── Add / Edit ───
  const isFormOpen = ref(false)
  const editingId = ref<string | null>(null)
  const isSubmitting = ref(false)
  const formData = ref<EvaluationQuestionFormData>(emptyForm())
  const formErrors = ref<Record<string, string>>({})
  const isEditMode = computed(() => editingId.value !== null)

  /** Next order number in a category (new questions go last). */
  const nextSortOrder = (category: EvaluationCategory) =>
    questions.value.filter((q) => q.category === category).reduce((max, q) => Math.max(max, q.sortOrder), 0) + 1

  const openCreate = () => {
    const category: EvaluationCategory = categoryFilter.value === 'attitude' ? 'attitude' : 'performance'
    editingId.value = null
    formData.value = emptyForm(category, nextSortOrder(category))
    formErrors.value = {}
    isFormOpen.value = true
  }

  const openEdit = (question: EvaluationQuestion) => {
    editingId.value = question.id
    formData.value = {
      category: question.category,
      question: question.question,
      sortOrder: question.sortOrder,
      isActive: question.isActive,
    }
    formErrors.value = {}
    isFormOpen.value = true
  }

  /** Picking a category on a new question moves it to the end of that category. */
  const onCategoryChange = (value: string) => {
    const category: EvaluationCategory = value === 'attitude' ? 'attitude' : 'performance'
    formData.value = {
      ...formData.value,
      category,
      sortOrder: isEditMode.value ? formData.value.sortOrder : nextSortOrder(category),
    }
  }

  const resetForm = () => {
    isFormOpen.value = false
    editingId.value = null
    formErrors.value = {}
  }
  const closeForm = () => {
    if (isSubmitting.value) return
    resetForm()
  }
  const onFormOpenChange = (open: boolean) => {
    if (!open) closeForm()
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const text = formData.value.question.trim()
    if (!text) errors.question = 'Question is required'
    else if (text.length < 3) errors.question = 'Question must be at least 3 characters'
    else if (text.length > QUESTION_MAX_LENGTH) errors.question = `Question cannot exceed ${QUESTION_MAX_LENGTH} characters`
    const order = Number(formData.value.sortOrder)
    if (!Number.isInteger(order) || order < 0 || order > 999) errors.sortOrder = 'Use a whole number from 0 to 999'
    formErrors.value = errors
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (): Promise<boolean> => {
    if (!validate()) return false
    isSubmitting.value = true
    try {
      if (editingId.value) {
        await evaluationService.updateQuestion(editingId.value, formData.value)
        showFeedback('Question updated.')
      } else {
        await evaluationService.createQuestion(formData.value)
        showFeedback(`${formatCategoryLabel(formData.value.category)} question added.`)
      }
      resetForm()
      await fetchQuestions()
      return true
    } catch (err) {
      formErrors.value = {
        ...formErrors.value,
        submit: err instanceof Error ? err.message : 'Failed to save the question.',
      }
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Delete (single + bulk share one confirmation dialog) ───
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)
  const recordsToDelete = ref<EvaluationQuestion[]>([])

  const openDeleteDialog = (question: EvaluationQuestion) => {
    recordsToDelete.value = [question]
    isDeleteDialogOpen.value = true
  }
  const openBulkDeleteDialog = () => {
    if (selectedRecords.value.length === 0) return
    recordsToDelete.value = [...selectedRecords.value]
    isDeleteDialogOpen.value = true
  }
  const resetDeleteDialog = () => {
    isDeleteDialogOpen.value = false
    recordsToDelete.value = []
  }
  const closeDeleteDialog = () => {
    if (isDeleting.value) return
    resetDeleteDialog()
  }
  const onDeleteDialogOpenChange = (open: boolean) => {
    if (!open) closeDeleteDialog()
  }

  const confirmDelete = async (): Promise<boolean> => {
    const ids = recordsToDelete.value.map((q) => q.id)
    if (ids.length === 0) return false
    isDeleting.value = true
    try {
      const deletedIds = await evaluationService.deleteQuestions(ids)
      const deleted = new Set(deletedIds)
      questions.value = questions.value.filter((q) => !deleted.has(q.id))
      selectedIds.value = new Set([...selectedIds.value].filter((id) => !deleted.has(id)))
      resetDeleteDialog()
      const skipped = ids.length - deletedIds.length
      if (skipped > 0) {
        showFeedback(`Deleted ${deletedIds.length} of ${ids.length} questions. ${skipped} could not be deleted.`, 'error')
      } else {
        showFeedback(`${deletedIds.length} ${deletedIds.length === 1 ? 'question' : 'questions'} deleted.`)
      }
      return true
    } catch (err) {
      console.error('Failed to delete evaluation questions')
      showFeedback(err instanceof Error ? err.message : 'Failed to delete. Please try again.', 'error')
      await fetchQuestions()
      return false
    } finally {
      isDeleting.value = false
    }
  }

  const DELETE_PREVIEW_LIMIT = 50
  const deletePreview = computed(() => recordsToDelete.value.slice(0, DELETE_PREVIEW_LIMIT))
  const deleteOverflow = computed(() => Math.max(0, recordsToDelete.value.length - DELETE_PREVIEW_LIMIT))

  // ─── Display ───
  const getQuestionStatusBadgeClass = (question: EvaluationQuestion) =>
    question.isActive ? 'bg-success/10 text-success border-success/30' : 'bg-muted text-muted-foreground border-border'

  onMounted(() => {
    void fetchQuestions()
  })

  return {
    questions,
    filteredQuestions,
    paginatedQuestions,
    currentPage,
    totalPages,
    pageRange,
    prevPage,
    nextPage,
    stats,
    isLoading,
    loadError,
    fetchQuestions,
    searchQuery,
    categoryFilter,
    categoryFilterOptions: CATEGORY_FILTER_OPTIONS,
    categoryOptions: EVALUATION_CATEGORY_OPTIONS,
    hasActiveFilters,
    resetFilters,
    clearSearch,
    selectedCount,
    isAllPageSelected,
    isPagePartiallySelected,
    isAllFilteredSelected,
    isSelected,
    toggleSelect,
    toggleSelectPage,
    selectAllFiltered,
    clearSelection,
    isFormOpen,
    isEditMode,
    isSubmitting,
    formData,
    formErrors,
    questionMax: QUESTION_MAX_LENGTH,
    openCreate,
    openEdit,
    onCategoryChange,
    closeForm,
    onFormOpenChange,
    handleSubmit,
    isDeleteDialogOpen,
    isDeleting,
    recordsToDelete,
    deletePreview,
    deleteOverflow,
    openDeleteDialog,
    openBulkDeleteDialog,
    closeDeleteDialog,
    onDeleteDialogOpenChange,
    confirmDelete,
    formatCategoryLabel,
    getQuestionStatusBadgeClass,
  }
}
