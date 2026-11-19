<script setup lang="ts">
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useHolidayCalendar } from '@/composables/peso/useHolidayCalendar'

const {
  isLoading,
  loadError,
  fetchHolidays,
  viewYear,
  monthTitle,
  weekdayLabels,
  calendarCells,
  prevMonth,
  nextMonth,
  goToToday,
  onDayClick,
  yearHolidays,
  selectedCount,
  isAllSelected,
  isPartiallySelected,
  isSelected,
  toggleSelect,
  toggleSelectAll,
  clearSelection,
  isFormOpen,
  isEditMode,
  isSubmitting,
  formData,
  formErrors,
  openCreate,
  openEdit,
  closeForm,
  handleSubmit,
  deleteFromForm,
  isDeleteDialogOpen,
  isDeleting,
  holidaysToDelete,
  deletePreview,
  deleteOverflow,
  openDeleteDialog,
  openBulkDeleteDialog,
  closeDeleteDialog,
  confirmDelete,
} = useHolidayCalendar()

const COLUMN_COUNT = 4

const checkboxClass =
  'h-4 w-4 cursor-pointer rounded border-input accent-primary align-middle disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Holiday Calendar</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <Button size="sm" class="gap-1.5 text-xs cursor-pointer" @click="openCreate()">
          <Plus class="h-3.5 w-3.5" />
          <span>Add Holiday</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer"
          :disabled="isLoading"
          @click="fetchHolidays"
        >
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start">
      <!-- ─── Month Grid ─── -->
      <Card class="border shadow-xs">
        <CardHeader class="pb-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <CardTitle class="text-lg font-semibold">{{ monthTitle }}</CardTitle>
            <div class="flex items-center gap-1">
              <Button variant="outline" size="sm" class="h-8 text-xs cursor-pointer" @click="goToToday">Today</Button>
              <Button
                variant="outline"
                size="icon"
                class="h-8 w-8 cursor-pointer"
                aria-label="Previous month"
                @click="prevMonth"
              >
                <ChevronLeft class="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                class="h-8 w-8 cursor-pointer"
                aria-label="Next month"
                @click="nextMonth"
              >
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription class="text-xs">Click a day to add or edit its holiday.</CardDescription>
        </CardHeader>

        <CardContent>
          <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
            <div v-for="label in weekdayLabels" :key="label" class="py-1">{{ label }}</div>
          </div>

          <div class="mt-1 grid grid-cols-7 gap-1">
            <button
              v-for="cell in calendarCells"
              :key="cell.date"
              type="button"
              class="flex min-h-14 flex-col items-stretch rounded-md border p-1 text-left transition-colors cursor-pointer sm:min-h-20 sm:p-1.5"
              :class="[
                cell.holiday
                  ? 'border-primary/40 bg-primary/10 hover:bg-primary/15'
                  : 'border-border/60 hover:bg-muted/50',
                cell.inMonth ? '' : 'opacity-40',
                cell.isWeekend && !cell.holiday ? 'bg-muted/30' : '',
              ]"
              :aria-label="cell.holiday ? `${cell.date}: ${cell.holiday.name}. Edit holiday` : `${cell.date}: add holiday`"
              @click="onDayClick(cell)"
            >
              <span
                class="inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-medium"
                :class="cell.isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'"
              >
                {{ cell.day }}
              </span>
              <span
                v-if="cell.holiday"
                class="mt-0.5 line-clamp-2 text-[10px] font-medium leading-tight text-primary sm:text-[11px]"
              >
                {{ cell.holiday.name }}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- ─── Holidays in the year ─── -->
      <section class="flex flex-col gap-3" aria-labelledby="year-holidays-heading">
        <div class="space-y-1">
          <h2 id="year-holidays-heading" class="text-lg font-semibold text-foreground">Holidays in {{ viewYear }}</h2>
          <p class="text-xs text-muted-foreground">{{ yearHolidays.length }} set</p>
        </div>

        <Card class="gap-0 overflow-hidden border py-0 shadow-xs">
          <CardContent class="p-0">
            <!-- Bulk selection bar -->
            <div
              v-if="selectedCount > 0"
              class="flex flex-col gap-2 border-b bg-primary/5 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="font-semibold text-foreground">{{ selectedCount }} selected</span>
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

            <div class="relative overflow-x-auto">
              <Table>
                <TableHeader class="bg-muted/40">
                  <TableRow>
                    <TableHead class="w-10 pl-4">
                      <input
                        type="checkbox"
                        :class="checkboxClass"
                        :checked="isAllSelected"
                        :indeterminate="isPartiallySelected"
                        :disabled="isLoading || yearHolidays.length === 0"
                        aria-label="Select all holidays in this year"
                        @change="toggleSelectAll"
                      />
                    </TableHead>
                    <TableHead class="min-w-32 text-xs font-semibold">Date</TableHead>
                    <TableHead class="min-w-40 text-xs font-semibold">Holiday</TableHead>
                    <TableHead class="min-w-20 text-right text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow v-if="isLoading">
                    <TableCell :colspan="COLUMN_COUNT" class="h-32 text-center">
                      <Loader2 class="mx-auto h-6 w-6 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>

                  <template v-else-if="yearHolidays.length > 0">
                    <TableRow
                      v-for="holiday in yearHolidays"
                      :key="holiday.id"
                      :class="isSelected(holiday.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'"
                      :data-state="isSelected(holiday.id) ? 'selected' : undefined"
                    >
                      <TableCell class="w-10 py-2.5 pl-4">
                        <input
                          type="checkbox"
                          :class="checkboxClass"
                          :checked="isSelected(holiday.id)"
                          :aria-label="`Select ${holiday.name}`"
                          @change="toggleSelect(holiday.id)"
                        />
                      </TableCell>
                      <TableCell class="py-2.5">
                        <div class="flex flex-col">
                          <span class="font-mono text-xs font-medium text-foreground">{{ holiday.displayDate }}</span>
                          <span class="text-[11px] text-muted-foreground">{{ holiday.weekday }}</span>
                        </div>
                      </TableCell>
                      <TableCell class="py-2.5 text-xs font-medium text-foreground sm:text-sm">{{ holiday.name }}</TableCell>
                      <TableCell class="py-2.5 text-right">
                        <div class="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 cursor-pointer"
                            :title="`Edit ${holiday.name}`"
                            :aria-label="`Edit ${holiday.name}`"
                            @click="openEdit(holiday)"
                          >
                            <Pencil class="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                            :title="`Delete ${holiday.name}`"
                            :aria-label="`Delete ${holiday.name}`"
                            @click="openDeleteDialog(holiday)"
                          >
                            <Trash2 class="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </template>

                  <TableEmpty v-else :colspan="COLUMN_COUNT">
                    <Empty class="py-8">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <CalendarDays />
                        </EmptyMedia>
                        <EmptyTitle>{{ loadError ? 'Could not load holidays' : `No holidays in ${viewYear}` }}</EmptyTitle>
                        <EmptyDescription>{{ loadError || 'Click a day on the calendar to add one.' }}</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableEmpty>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>

    <!-- ─── Add / Edit Holiday ─── -->
    <Dialog :open="isFormOpen" @update:open="(val: boolean) => (!val ? closeForm() : null)">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">{{ isEditMode ? 'Edit Holiday' : 'Add Holiday' }}</DialogTitle>
          <DialogDescription class="text-xs">This day prints as the holiday on every DTR.</DialogDescription>
        </DialogHeader>

        <form class="space-y-4 py-2" @submit.prevent="handleSubmit">
          <div
            v-if="formErrors.submit"
            class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            {{ formErrors.submit }}
          </div>

          <div class="space-y-1.5">
            <label for="holiday-date" class="text-xs font-medium text-foreground">
              Date <span class="text-destructive">*</span>
            </label>
            <Input
              id="holiday-date"
              v-model="formData.date"
              type="date"
              class="h-9 text-base md:text-xs"
              :class="formErrors.date ? 'border-destructive focus-visible:ring-destructive' : ''"
            />
            <p v-if="formErrors.date" class="text-[11px] text-destructive">{{ formErrors.date }}</p>
          </div>

          <div class="space-y-1.5">
            <label for="holiday-name" class="text-xs font-medium text-foreground">
              Holiday Name <span class="text-destructive">*</span>
            </label>
            <Input
              id="holiday-name"
              v-model="formData.name"
              placeholder="e.g. Independence Day"
              maxlength="60"
              class="h-9 text-base md:text-xs"
              :class="formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''"
            />
            <p v-if="formErrors.name" class="text-[11px] text-destructive">{{ formErrors.name }}</p>
          </div>

          <DialogFooter class="gap-2 pt-2 sm:justify-between">
            <Button
              v-if="isEditMode"
              type="button"
              variant="ghost"
              size="sm"
              class="gap-1.5 text-xs text-destructive hover:text-destructive cursor-pointer"
              :disabled="isSubmitting"
              @click="deleteFromForm"
            >
              <Trash2 class="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
            <div class="flex gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="text-xs cursor-pointer"
                :disabled="isSubmitting"
                @click="closeForm"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSubmitting">
                <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
                <span>{{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Holiday' }}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ─── Delete Confirmation (single & bulk) ─── -->
    <Dialog :open="isDeleteDialogOpen" @update:open="(val: boolean) => (!val ? closeDeleteDialog() : null)">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold text-foreground">
                Delete {{ holidaysToDelete.length }} {{ holidaysToDelete.length === 1 ? 'Holiday' : 'Holidays' }}
              </DialogTitle>
              <DialogDescription class="mt-0.5 text-xs">These days print as normal workdays again.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="max-h-56 divide-y overflow-y-auto rounded-lg border bg-muted/30 text-xs">
          <div v-for="holiday in deletePreview" :key="holiday.id" class="flex items-center justify-between gap-3 px-3.5 py-2">
            <span class="truncate font-semibold text-foreground">{{ holiday.name }}</span>
            <span class="shrink-0 font-mono text-muted-foreground">{{ holiday.displayDate }}</span>
          </div>
          <div v-if="deleteOverflow > 0" class="px-3.5 py-2 text-muted-foreground">…and {{ deleteOverflow }} more</div>
        </div>

        <DialogFooter class="mt-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer"
            :disabled="isDeleting"
            @click="closeDeleteDialog"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer"
            :disabled="isDeleting || holidaysToDelete.length === 0"
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
