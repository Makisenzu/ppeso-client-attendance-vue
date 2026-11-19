<script setup lang="ts">
import { Download, ExternalLink, FileText, Filter, FolderOpen, Loader2, Pencil, Printer, RefreshCw, Search, Trash2, Upload, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SearchSelect from '@/components/common/SearchSelect.vue'
import { usePacdFiles } from '@/composables/peso/usePacdFiles'

const {
  files,
  isLoading,
  loadError,
  fetchFiles,
  searchQuery,
  categoryFilter,
  categoryFilterOptions,
  categoryOptions,
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
  fileAccept,
  titleMax,
  descriptionMax,
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
} = usePacdFiles()

/** Selection, file, category, size, actions */
const COLUMN_COUNT = 5
const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
// Native textarea until the shadcn `textarea` primitive is added (the CLI needs a newer Node).
const textareaClass =
  'w-full min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Files</h1>
        <p class="text-sm text-muted-foreground">PACD file container: printable forms, templates and guidelines.</p>
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isLoading" @click="fetchFiles">
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
        <Button size="sm" class="gap-1.5 text-xs cursor-pointer" @click="openUpload">
          <Upload class="h-3.5 w-3.5" />
          <span>Upload File</span>
        </Button>
      </div>
    </div>

    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">All Files</CardTitle>
            <CardDescription class="text-xs">Showing {{ filteredFiles.length }} of {{ files.length }} files</CardDescription>
          </div>
          <Button
            v-if="hasActiveFilters"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 self-start sm:self-auto cursor-pointer"
            @click="resetFilters"
          >
            <X class="h-3.5 w-3.5" />
            <span>Clear filters</span>
          </Button>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="searchQuery" placeholder="Search by title, file name or description..." class="pl-9 pr-8 h-9 text-base md:text-xs" />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
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
        <!-- Bulk bar -->
        <div
          v-if="selectedCount > 0"
          class="flex flex-col gap-2 border-t bg-primary/5 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="font-semibold text-foreground">{{ selectedCount }} selected</span>
            <button v-if="!isAllFilteredSelected" type="button" class="font-medium text-primary hover:underline cursor-pointer" @click="selectAllFiltered">
              Select all {{ filteredFiles.length }} matching files
            </button>
            <button type="button" class="text-muted-foreground hover:text-foreground cursor-pointer" @click="clearSelection">Clear selection</button>
          </div>
          <Button variant="destructive" size="sm" class="h-7 gap-1.5 text-xs cursor-pointer self-start sm:self-auto" :disabled="isDeleting" @click="requestBulkDelete">
            <Trash2 class="h-3.5 w-3.5" />
            <span>Delete selected</span>
          </Button>
        </div>

        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-10 pl-4">
                  <input
                    type="checkbox"
                    :class="checkboxClass"
                    :checked="isAllPageSelected"
                    :indeterminate="isPagePartiallySelected"
                    :disabled="isLoading || paginatedFiles.length === 0"
                    aria-label="Select all files on this page"
                    @change="toggleSelectPage"
                  />
                </TableHead>
                <TableHead class="min-w-64 text-xs font-semibold">File</TableHead>
                <TableHead class="min-w-32 text-xs font-semibold">Category</TableHead>
                <TableHead class="min-w-24 text-xs font-semibold">Size</TableHead>
                <TableHead class="min-w-44 pr-4 text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell :colspan="COLUMN_COUNT" class="h-40 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-xs text-muted-foreground">Loading files...</p>
                  </div>
                </TableCell>
              </TableRow>

              <TableRow v-else-if="loadError">
                <TableCell :colspan="COLUMN_COUNT" class="h-32 text-center">
                  <div class="flex flex-col items-center gap-3 py-4">
                    <p class="text-xs text-destructive">{{ loadError }}</p>
                    <Button size="sm" variant="outline" class="text-xs cursor-pointer" @click="fetchFiles">Try Again</Button>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="paginatedFiles.length > 0">
                <TableRow
                  v-for="file in paginatedFiles"
                  :key="file.id"
                  :class="isSelected(file.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'"
                >
                  <TableCell class="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      :class="checkboxClass"
                      :checked="isSelected(file.id)"
                      :aria-label="`Select ${file.title}`"
                      @change="toggleSelect(file.id)"
                    />
                  </TableCell>
                  <TableCell class="py-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div
                        class="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md border text-[9px] font-bold tracking-wide"
                        :class="getFileTypeBadgeClass(file.mimeType)"
                      >
                        <FileText class="h-3.5 w-3.5" />
                        <span>{{ formatFileType(file.mimeType) }}</span>
                      </div>
                      <div class="flex min-w-0 flex-col">
                        <span class="truncate text-xs sm:text-sm font-semibold text-foreground">{{ file.title }}</span>
                        <span class="truncate text-[11px] text-muted-foreground">{{ file.description || file.fileName }}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell class="py-3">
                    <Badge variant="outline" :class="[getPacdCategoryBadgeClass(file.category), 'text-[10px]']">
                      {{ formatPacdCategory(file.category) }}
                    </Badge>
                  </TableCell>
                  <TableCell class="py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{{ formatFileSize(file.sizeBytes) }}</TableCell>
                  <TableCell class="py-3 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        v-if="isPdf(file)"
                        variant="ghost"
                        size="sm"
                        class="h-8 gap-1.5 text-xs cursor-pointer"
                        :disabled="openingId === file.id"
                        title="Open to view or print"
                        @click="openFile(file)"
                      >
                        <Loader2 v-if="openingId === file.id" class="h-3.5 w-3.5 animate-spin" />
                        <ExternalLink v-else class="h-3.5 w-3.5" />
                        <span class="hidden sm:inline">Open</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 cursor-pointer"
                        title="Download"
                        :aria-label="`Download ${file.title}`"
                        :disabled="openingId === file.id"
                        @click="downloadFile(file)"
                      >
                        <Loader2 v-if="openingId === file.id && !isPdf(file)" class="h-3.5 w-3.5 animate-spin" />
                        <Download v-else class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 cursor-pointer"
                        :title="isPdf(file) ? 'Print' : 'Download to print (only PDFs print from here)'"
                        :aria-label="`Print ${file.title}`"
                        :disabled="!isPdf(file) || printingId === file.id"
                        @click="printFile(file)"
                      >
                        <Loader2 v-if="printingId === file.id" class="h-3.5 w-3.5 animate-spin" />
                        <Printer v-else class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 cursor-pointer"
                        title="Edit details"
                        :aria-label="`Edit ${file.title}`"
                        @click="openEdit(file)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete file"
                        :aria-label="`Delete ${file.title}`"
                        @click="requestDelete(file)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty v-else :colspan="COLUMN_COUNT">
                <Empty class="border-0 p-6 md:p-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FolderOpen v-if="files.length === 0" class="size-5 text-muted-foreground" />
                      <Filter v-else class="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>{{ files.length === 0 ? 'No files yet' : 'No matching files' }}</EmptyTitle>
                    <EmptyDescription>
                      {{ files.length === 0 ? 'Upload PACD forms and documents (PDF, Word or Excel, up to 20 MB).' : 'No files match your search or filters.' }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button v-if="files.length === 0" size="sm" class="gap-1.5 text-xs cursor-pointer" @click="openUpload">
                      <Upload class="h-3.5 w-3.5" />
                      <span>Upload File</span>
                    </Button>
                    <Button v-else size="sm" variant="outline" class="text-xs cursor-pointer" @click="resetFilters">Clear Filters</Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
            </TableBody>
          </Table>
        </div>

        <div
          v-if="filteredFiles.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t text-xs text-muted-foreground bg-muted/10"
        >
          <div>
            Showing <span class="font-medium text-foreground">{{ pageRange.start }}</span>
            to <span class="font-medium text-foreground">{{ pageRange.end }}</span>
            of <span class="font-medium text-foreground">{{ filteredFiles.length }}</span> files
          </div>
          <div class="flex items-center gap-1">
            <Button
              v-for="p in visiblePages"
              :key="p"
              size="sm"
              :variant="currentPage === p ? 'default' : 'outline'"
              class="h-7 w-7 p-0 text-xs cursor-pointer"
              @click="setPage(p)"
            >
              {{ p }}
            </Button>
            <span v-if="totalPages > visiblePages.length" class="px-1">of {{ totalPages }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── Upload / edit ─── -->
    <Dialog :open="isFormOpen" @update:open="onFormOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">{{ isEditMode ? 'Edit File Details' : 'Upload File' }}</DialogTitle>
          <DialogDescription class="text-xs">
            {{ isEditMode ? editingFile?.fileName : 'PDF, Word (.docx) or Excel (.xlsx), up to 20 MB.' }}
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-4 py-2" @submit.prevent="handleSubmit">
          <div
            v-if="formErrors.submit"
            class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            {{ formErrors.submit }}
          </div>

          <div v-if="!isEditMode" class="space-y-1.5">
            <label for="pacd-file" class="text-xs font-medium text-foreground">
              File <span class="text-destructive">*</span>
            </label>
            <label
              for="pacd-file"
              class="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
              :class="formErrors.file ? 'border-destructive' : ''"
            >
              <Upload class="h-5 w-5 text-muted-foreground" />
              <span class="text-xs font-medium text-foreground">{{ pickedFileLabel || 'Choose a file' }}</span>
              <span class="text-[11px] text-muted-foreground">PDF, DOCX or XLSX · max 20 MB</span>
            </label>
            <input
              id="pacd-file"
              :key="fileInputKey"
              type="file"
              class="sr-only"
              :accept="fileAccept"
              @change="onFilePicked"
            />
            <p v-if="formErrors.file" class="text-[11px] text-destructive">{{ formErrors.file }}</p>
          </div>

          <div class="space-y-1.5">
            <label for="pacd-title" class="text-xs font-medium text-foreground">
              Title <span class="text-destructive">*</span>
            </label>
            <Input
              id="pacd-title"
              v-model="formData.title"
              :maxlength="titleMax"
              placeholder="e.g. Client Satisfaction Form"
              class="h-9 text-base md:text-xs"
              :class="formErrors.title ? 'border-destructive focus-visible:ring-destructive' : ''"
            />
            <p v-if="formErrors.title" class="text-[11px] text-destructive">{{ formErrors.title }}</p>
          </div>

          <div class="space-y-1.5">
            <label for="pacd-category" class="text-xs font-medium text-foreground">
              Category <span class="text-destructive">*</span>
            </label>
            <SearchSelect
              id="pacd-category"
              :model-value="formData.category"
              :options="categoryOptions"
              :searchable="false"
              @update:model-value="onCategoryChange"
            />
          </div>

          <div class="space-y-1.5">
            <label for="pacd-description" class="text-xs font-medium text-foreground">Description</label>
            <textarea
              id="pacd-description"
              v-model="formData.description"
              rows="3"
              :maxlength="descriptionMax"
              :class="textareaClass"
              :aria-invalid="!!formErrors.description"
              placeholder="What the file is for (optional)"
            />
            <p v-if="formErrors.description" class="text-[11px] text-destructive">{{ formErrors.description }}</p>
          </div>

          <DialogFooter class="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isSubmitting" @click="closeForm">
              Cancel
            </Button>
            <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ isSubmitting ? (isEditMode ? 'Saving...' : 'Uploading...') : isEditMode ? 'Save Changes' : 'Upload' }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ─── Delete confirmation (single & bulk) ─── -->
    <Dialog :open="isDeleteDialogOpen" @update:open="onDeleteDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold text-foreground">
                Delete {{ filesToDelete.length }} {{ filesToDelete.length === 1 ? 'File' : 'Files' }}
              </DialogTitle>
              <DialogDescription class="mt-0.5 text-xs">This cannot be undone. The files are removed for everyone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="max-h-56 divide-y overflow-y-auto rounded-lg border bg-muted/30 text-xs">
          <div v-for="item in deletePreview" :key="item.id" class="flex items-center justify-between gap-3 px-3.5 py-2">
            <span class="truncate font-semibold text-foreground">{{ item.title }}</span>
            <span class="shrink-0 text-muted-foreground">{{ formatFileType(item.mimeType) }} · {{ formatFileSize(item.sizeBytes) }}</span>
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
            :disabled="isDeleting || filesToDelete.length === 0"
            @click="confirmDelete"
          >
            <Loader2 v-if="isDeleting" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
