<script setup lang="ts">
import { ChevronLeft, ChevronRight, ListChecks, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SearchSelect from '@/components/common/SearchSelect.vue'
import SwipeRow from '@/components/vuebits/SwipeRow.vue'
import { useEvaluationQuestions } from '@/composables/peso/useEvaluationQuestions'

const {
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
  categoryFilterOptions,
  categoryOptions,
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
  questionMax,
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
} = useEvaluationQuestions()

const COLUMN_COUNT = 6

const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
const textareaClass =
  'w-full min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring aria-invalid:border-destructive'
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">Evaluation Questions</CardTitle>
            <CardDescription class="text-xs">
              {{ stats.active }} active · {{ stats.performance }} performance · {{ stats.attitude }} attitude
            </CardDescription>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button size="sm" class="gap-1.5 text-xs cursor-pointer" @click="openCreate">
              <Plus class="h-3.5 w-3.5" />
              <span>Add Question</span>
            </Button>
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isLoading" @click="fetchQuestions">
              <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="relative sm:col-span-2">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="searchQuery" placeholder="Search questions..." class="h-9 pl-9 pr-8 text-base md:text-xs" />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
              @click="clearSearch"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <SearchSelect v-model="categoryFilter" :options="categoryFilterOptions" :searchable="false" />
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- ─── Bulk Selection Bar ─── -->
        <div
          v-if="selectedCount > 0"
          class="flex flex-col gap-2 border-t bg-primary/5 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="font-semibold text-foreground">
              {{ selectedCount }} {{ selectedCount === 1 ? 'question' : 'questions' }} selected
            </span>
            <button
              v-if="!isAllFilteredSelected"
              type="button"
              class="font-medium text-primary hover:underline cursor-pointer"
              @click="selectAllFiltered"
            >
              Select all {{ filteredQuestions.length }} matching questions
            </button>
            <button type="button" class="text-muted-foreground hover:text-foreground cursor-pointer" @click="clearSelection">
              Clear selection
            </button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            class="h-7 gap-1.5 text-xs cursor-pointer self-start sm:self-auto"
            :disabled="isDeleting"
            @click="openBulkDeleteDialog"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>Delete selected</span>
          </Button>
        </div>

        <!-- ─── Table ─── -->
        <!-- Mobile: swipe rows (DESIGN.md §11.2) -->
        <div class="divide-y border-t md:hidden">
          <div v-if="isLoading && questions.length === 0" class="flex justify-center py-10">
            <Loader2 class="h-6 w-6 animate-spin text-primary" />
          </div>
          <template v-else-if="paginatedQuestions.length > 0">
            <SwipeRow
              v-for="item in paginatedQuestions"
              :key="item.id"
              label="Evaluation question"
              :actions="[
                { id: 'delete', label: 'Delete', icon: Trash2, onSelect: () => openDeleteDialog(item) },
                { id: 'edit', label: 'Edit', icon: Pencil, color: 'var(--primary)', textColor: 'var(--primary-foreground)', onSelect: () => openEdit(item) },
              ]"
            >
              <input
                type="checkbox"
                :class="[checkboxClass, 'shrink-0']"
                :checked="isSelected(item.id)"
                aria-label="Select question"
                @change="toggleSelect(item.id)"
              />
              <div class="min-w-0 flex-1">
                <p class="line-clamp-2 text-sm font-semibold text-foreground">{{ item.sortOrder }}. {{ item.question }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ formatCategoryLabel(item.category) }}</p>
              </div>
              <Badge variant="outline" :class="[getQuestionStatusBadgeClass(item), 'shrink-0 text-[10px]']">
                {{ item.isActive ? 'Active' : 'Inactive' }}
              </Badge>
            </SwipeRow>
          </template>
          <p v-else class="py-10 text-center text-xs text-muted-foreground">No questions found.</p>
        </div>

        <div class="relative hidden overflow-x-auto border-t md:block">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-10 pl-4">
                  <input
                    type="checkbox"
                    :class="checkboxClass"
                    :checked="isAllPageSelected"
                    :indeterminate="isPagePartiallySelected"
                    :disabled="isLoading || paginatedQuestions.length === 0"
                    aria-label="Select all questions on this page"
                    @change="toggleSelectPage"
                  />
                </TableHead>
                <TableHead class="w-16 text-xs font-semibold">Order</TableHead>
                <TableHead class="min-w-72 text-xs font-semibold">Question</TableHead>
                <TableHead class="min-w-28 text-xs font-semibold">Category</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Status</TableHead>
                <TableHead class="min-w-24 pr-4 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow v-if="isLoading && questions.length === 0">
                <TableCell :colspan="COLUMN_COUNT" class="h-44 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading the questions...</p>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedQuestions.length > 0">
                <TableRow
                  v-for="item in paginatedQuestions"
                  :key="item.id"
                  class="transition-colors"
                  :class="isSelected(item.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'"
                  :data-state="isSelected(item.id) ? 'selected' : undefined"
                >
                  <TableCell class="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      :class="checkboxClass"
                      :checked="isSelected(item.id)"
                      aria-label="Select question"
                      @change="toggleSelect(item.id)"
                    />
                  </TableCell>
                  <TableCell class="py-3 font-mono text-xs text-muted-foreground">{{ item.sortOrder }}</TableCell>
                  <TableCell class="py-3 text-xs text-foreground sm:text-sm">{{ item.question }}</TableCell>
                  <TableCell class="py-3 text-xs text-foreground">{{ formatCategoryLabel(item.category) }}</TableCell>
                  <TableCell class="py-3">
                    <Badge variant="outline" :class="[getQuestionStatusBadgeClass(item), 'text-[10px]']">
                      {{ item.isActive ? 'Active' : 'Inactive' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="py-3 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 cursor-pointer"
                        title="Edit question"
                        aria-label="Edit question"
                        @click="openEdit(item)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        title="Delete question"
                        aria-label="Delete question"
                        @click="openDeleteDialog(item)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty v-else :colspan="COLUMN_COUNT">
                <Empty class="py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ListChecks />
                    </EmptyMedia>
                    <EmptyTitle>{{ loadError ? 'Could not load the questions' : 'No questions found' }}</EmptyTitle>
                    <EmptyDescription>
                      {{
                        loadError
                          ? loadError
                          : questions.length === 0
                            ? 'Add the questions supervisors will rate their GIPs on.'
                            : 'No questions match your search or filter.'
                      }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button v-if="loadError" variant="outline" size="sm" class="text-xs cursor-pointer" @click="fetchQuestions">
                      Try again
                    </Button>
                    <Button v-else-if="hasActiveFilters" variant="outline" size="sm" class="text-xs cursor-pointer" @click="resetFilters">
                      Reset filters
                    </Button>
                    <Button v-else size="sm" class="gap-1.5 text-xs cursor-pointer" @click="openCreate">
                      <Plus class="h-3.5 w-3.5" />
                      <span>Add Question</span>
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Pagination (10 per page) ─── -->
        <div
          v-if="filteredQuestions.length > 0"
          class="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{{ pageRange.start }}–{{ pageRange.end }} of {{ filteredQuestions.length }}</span>
          <div class="flex items-center gap-2">
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <Button variant="outline" size="icon" class="h-8 w-8 cursor-pointer" :disabled="currentPage <= 1" aria-label="Previous page" @click="prevPage">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8 cursor-pointer"
              :disabled="currentPage >= totalPages"
              aria-label="Next page"
              @click="nextPage"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── Add / Edit Question ─── -->
    <Dialog :open="isFormOpen" @update:open="onFormOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">{{ isEditMode ? 'Edit Question' : 'Add Question' }}</DialogTitle>
          <DialogDescription class="text-xs">
            {{ isEditMode ? 'Submitted evaluations keep the wording they were rated on.' : 'Supervisors rate it from 1 to 5.' }}
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-4 py-2" @submit.prevent="handleSubmit">
          <div
            v-if="formErrors.submit"
            class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            {{ formErrors.submit }}
          </div>

          <div class="space-y-1.5">
            <label for="question-category" class="text-xs font-medium text-foreground">
              Category <span class="text-destructive">*</span>
            </label>
            <SearchSelect
              id="question-category"
              :model-value="formData.category"
              :options="categoryOptions"
              :searchable="false"
              @update:model-value="onCategoryChange"
            />
          </div>

          <div class="space-y-1.5">
            <label for="question-text" class="text-xs font-medium text-foreground">
              Question <span class="text-destructive">*</span>
            </label>
            <textarea
              id="question-text"
              v-model="formData.question"
              rows="3"
              :maxlength="questionMax"
              :class="textareaClass"
              :aria-invalid="!!formErrors.question"
              placeholder="e.g. Completes assigned tasks on time"
            />
            <p v-if="formErrors.question" class="text-[11px] text-destructive">{{ formErrors.question }}</p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label for="question-order" class="text-xs font-medium text-foreground">Order</label>
              <Input
                id="question-order"
                v-model.number="formData.sortOrder"
                type="number"
                inputmode="numeric"
                min="0"
                max="999"
                class="h-9 text-base md:text-xs"
                :class="formErrors.sortOrder ? 'border-destructive focus-visible:ring-destructive' : ''"
              />
              <p v-if="formErrors.sortOrder" class="text-[11px] text-destructive">{{ formErrors.sortOrder }}</p>
            </div>

            <div class="space-y-1.5">
              <span class="text-xs font-medium text-foreground">Status</span>
              <label class="flex h-9 items-center gap-2 text-xs text-foreground cursor-pointer">
                <input v-model="formData.isActive" type="checkbox" :class="checkboxClass" />
                <span>Ask supervisors this question</span>
              </label>
            </div>
          </div>

          <DialogFooter class="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isSubmitting" @click="closeForm">
              Cancel
            </Button>
            <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Question' }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ─── Delete Confirmation (single & bulk) ─── -->
    <Dialog :open="isDeleteDialogOpen" @update:open="onDeleteDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold text-foreground">
                Delete {{ recordsToDelete.length }} {{ recordsToDelete.length === 1 ? 'Question' : 'Questions' }}
              </DialogTitle>
              <DialogDescription class="mt-0.5 text-xs">
                This cannot be undone. Submitted evaluations keep their answers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="max-h-56 divide-y overflow-y-auto rounded-lg border bg-muted/30 text-xs">
          <div v-for="item in deletePreview" :key="item.id" class="flex items-center justify-between gap-3 px-3.5 py-2">
            <span class="line-clamp-2 text-foreground">{{ item.question }}</span>
            <span class="shrink-0 text-muted-foreground">{{ formatCategoryLabel(item.category) }}</span>
          </div>
          <div v-if="deleteOverflow > 0" class="px-3.5 py-2 text-muted-foreground">…and {{ deleteOverflow }} more</div>
        </div>

        <DialogFooter class="mt-2 gap-2">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isDeleting" @click="closeDeleteDialog">
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer"
            :disabled="isDeleting || recordsToDelete.length === 0"
            @click="confirmDelete"
          >
            <Loader2 v-if="isDeleting" class="h-3.5 w-3.5 animate-spin" />
            <Trash2 v-else class="h-3.5 w-3.5" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
