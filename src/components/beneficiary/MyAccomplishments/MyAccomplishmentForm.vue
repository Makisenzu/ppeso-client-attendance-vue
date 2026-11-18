<script setup lang="ts">
import { ArrowLeft, Loader2, Plus, Printer, WandSparkles, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMyAccomplishmentForm } from '@/composables/beneficiary/useMyAccomplishmentForm'

const {
  isLoading,
  isNotFound,
  context,
  currentReport,
  funding,
  isDole,
  formTitle,
  isReadOnly,
  pageTitle,
  periodFrom,
  periodTo,
  periodMin,
  periodMax,
  periodFromMax,
  periodError,
  isEarly,
  days,
  dayErrors,
  dayStatuses,
  missingDays,
  setDayStatus,
  onDayInput,
  entryMax,
  activities,
  activityErrors,
  canAddActivity,
  addActivity,
  removeActivity,
  onActivityInput,
  activityMax,
  outputMax,
  remarksMax,
  details,
  detailErrors,
  onAmountInput,
  fillAmountInWords,
  amountPreview,
  nameMax,
  wordsMax,
  savingMode,
  isSaving,
  canSaveDraft,
  submitLabel,
  saveDraft,
  submitReport,
  isEarlySubmitDialogOpen,
  confirmEarlySubmit,
  onEarlySubmitDialogChange,
  printCurrent,
  reviewedDocument,
  previewBoxStyle,
  previewFrameStyle,
  onPreviewLoad,
  printReviewed,
  goBack,
  formatWeekday,
  formatDisplayDate,
  getReportStatusBadgeClass,
} = useMyAccomplishmentForm()

// Native textarea until the shadcn `textarea` primitive is added (the CLI needs a newer Node).
const textareaClass =
  'w-full min-h-16 rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <!-- The editor stays narrow; a reviewed report (shown as printed) uses the full width -->
  <div class="mx-auto flex w-full flex-col gap-6 pb-12" :class="isReadOnly ? '' : 'max-w-3xl'">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-1">
      <Button variant="ghost" size="sm" class="-ml-2 w-fit gap-1.5 text-xs cursor-pointer" :disabled="isSaving" @click="goBack">
        <ArrowLeft class="h-4 w-4" />
        <span>Back to Accomplishments</span>
      </Button>
      <h1 v-if="pageTitle" class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">{{ pageTitle }}</h1>
      <Skeleton v-else class="h-8 w-64 sm:h-9" />
    </div>

    <Skeleton v-if="isLoading" class="h-[28rem] w-full" />

    <Card v-else-if="isNotFound">
      <CardContent>
        <Empty class="py-10">
          <EmptyHeader>
            <EmptyTitle>Report not found</EmptyTitle>
            <EmptyDescription>It may have been removed.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" class="text-xs cursor-pointer" @click="goBack">Back to Accomplishments</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <Card v-else-if="!funding">
      <CardContent>
        <Empty class="py-10">
          <EmptyHeader>
            <EmptyTitle>Funding not set</EmptyTitle>
            <EmptyDescription>Ask PESO to set your funding (DOLE or PGAS) before writing a report.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>

    <!-- ─── Reviewed: the report as it prints ─── -->
    <Card v-else-if="isReadOnly && currentReport">
      <CardHeader class="gap-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 space-y-1">
            <CardTitle class="text-base">{{ formTitle }}</CardTitle>
            <CardDescription class="text-xs">
              Reviewed {{ formatDisplayDate(currentReport.reviewedAt) }}. It can no longer be changed.
            </CardDescription>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline" :class="getReportStatusBadgeClass(currentReport.status)">{{ currentReport.status }}</Badge>
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" @click="printReviewed">
              <Printer class="h-3.5 w-3.5" />
              <span>Print</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="rounded-lg bg-muted/30 p-2 sm:p-4">
          <!-- The official form is black on white in both themes, like the printout. No sandbox: the document is
               built by accomplishmentPrintHelper (every value escaped, no scripts), and a sandbox only made the
               browser log "Blocked script execution" when extensions inject scripts into frames. -->
          <!-- Paper-width page scaled to fit (sizes are computed at runtime, hence the inline styles) -->
          <div ref="previewBox" class="relative w-full overflow-hidden" :style="previewBoxStyle">
            <iframe
              :srcdoc="reviewedDocument"
              title="Accomplishment report as printed"
              class="absolute left-0 top-0 border-0 shadow-md"
              :style="previewFrameStyle"
              @load="onPreviewLoad"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── The report ─── -->
    <Card v-else>
      <CardHeader class="gap-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 space-y-1">
            <CardTitle class="text-base">{{ formTitle }}</CardTitle>
            <CardDescription class="text-xs">
              {{ funding }} · {{ context?.fullName }}<template v-if="context?.officeName"> · {{ context.officeName }}</template>
            </CardDescription>
          </div>
          <Badge v-if="currentReport" variant="outline" :class="getReportStatusBadgeClass(currentReport.status)">
            {{ currentReport.status }}
          </Badge>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="grid min-w-0 grid-cols-2 gap-3 sm:w-80">
            <div class="grid gap-1.5">
              <Label for="report-from" class="text-xs">Date from</Label>
              <Input id="report-from" v-model="periodFrom" type="date" :min="periodMin" :max="periodFromMax" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" />
            </div>
            <div class="grid gap-1.5">
              <Label for="report-to" class="text-xs">Date to</Label>
              <Input id="report-to" v-model="periodTo" type="date" :min="periodFrom || periodMin" :max="periodMax" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" />
            </div>
          </div>
          <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer self-start sm:self-auto" @click="printCurrent">
            <Printer class="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>
        </div>
        <p v-if="periodError && !isReadOnly" class="text-xs text-destructive">{{ periodError }}</p>
      </CardHeader>

      <CardContent class="grid gap-6">
        <!-- Reviewer's remarks to act on -->
        <div v-if="currentReport?.status === 'Returned' && currentReport.reviewRemarks" class="border-l-2 border-destructive pl-3">
          <p class="text-xs font-semibold text-destructive uppercase">Returned with remarks</p>
          <p class="text-sm text-foreground whitespace-pre-line">{{ currentReport.reviewRemarks }}</p>
        </div>

        <!-- ─── PGAS: Activities / Output / Remarks ─── -->
        <section v-if="!isDole" class="grid gap-3" aria-labelledby="report-activities-title">
          <h2 id="report-activities-title" class="text-sm font-semibold">Activities</h2>
          <ul class="grid gap-3">
            <li v-for="(row, index) in activities" :key="row.key" class="grid gap-3 rounded-lg border p-3">
              <div class="flex items-center justify-between gap-2">
                <Label :for="`activity-${row.key}`" class="text-xs">Activity {{ index + 1 }}</Label>
                <Button
                  v-if="!isReadOnly && activities.length > 1"
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
                  :aria-label="`Remove activity ${index + 1}`"
                  :disabled="isSaving"
                  @click="removeActivity(row.key)"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
              <textarea
                :id="`activity-${row.key}`"
                v-model="row.activity"
                rows="2"
                :maxlength="activityMax"
                :class="textareaClass"
                :aria-invalid="!!activityErrors[row.key]"
                :disabled="isReadOnly || isSaving"
                @input="onActivityInput(row)"
              />
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div class="grid gap-1.5">
                  <Label :for="`output-${row.key}`" class="text-xs">Output</Label>
                  <Input :id="`output-${row.key}`" v-model="row.output" :maxlength="outputMax" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" @input="onActivityInput(row)" />
                </div>
                <div class="grid gap-1.5">
                  <Label :for="`remarks-${row.key}`" class="text-xs">Remarks</Label>
                  <Input :id="`remarks-${row.key}`" v-model="row.remarks" :maxlength="remarksMax" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" />
                </div>
              </div>
              <p v-if="activityErrors[row.key]" class="text-xs text-destructive">{{ activityErrors[row.key] }}</p>
            </li>
          </ul>
          <Button
            v-if="!isReadOnly && canAddActivity"
            type="button"
            variant="outline"
            size="sm"
            class="w-fit gap-1.5 text-xs cursor-pointer"
            :disabled="isSaving"
            @click="addActivity"
          >
            <Plus class="h-3.5 w-3.5" />
            <span>Add activity</span>
          </Button>
          <p v-if="detailErrors.activities" class="text-xs text-destructive">{{ detailErrors.activities }}</p>
        </section>

        <!-- ─── Daily entries (DOLE only: the report itself) ─── -->
        <section v-if="isDole" class="grid gap-3" aria-labelledby="report-daily-title">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="report-daily-title" class="text-sm font-semibold">What you did each day</h2>
            <span v-if="missingDays > 0 && !isReadOnly" class="text-xs text-muted-foreground">
              {{ missingDays }} weekday{{ missingDays > 1 ? 's' : '' }} left to fill
            </span>
          </div>

          <p v-if="!days.length" class="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No weekdays in these dates yet.
          </p>
          <ul v-else class="divide-y rounded-lg border">
            <li v-for="day in days" :key="day.date" class="grid gap-2 px-3 py-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-sm font-medium font-mono">{{ formatWeekday(day.date) }}</span>
                <div class="flex gap-1 rounded-lg bg-muted p-1" role="radiogroup" :aria-label="`Status on ${formatWeekday(day.date)}`">
                  <Button
                    v-for="status in dayStatuses"
                    :key="status"
                    type="button"
                    variant="ghost"
                    size="sm"
                    role="radio"
                    :aria-checked="day.status === status"
                    :disabled="isReadOnly || isSaving"
                    :class="['h-7 cursor-pointer px-2.5 text-xs', day.status === status && 'bg-background shadow-xs hover:bg-background']"
                    @click="setDayStatus(day, status)"
                  >
                    {{ status }}
                  </Button>
                </div>
              </div>
              <textarea
                v-if="day.status === 'Worked'"
                v-model="day.entry"
                rows="3"
                :maxlength="entryMax"
                placeholder="One accomplishment per line"
                :class="textareaClass"
                :aria-invalid="!!dayErrors[day.date]"
                :disabled="isReadOnly || isSaving"
                @input="onDayInput(day)"
              />
              <Input v-else v-model="day.entry" :maxlength="entryMax" placeholder="Note (optional)" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" />
              <p v-if="dayErrors[day.date]" class="text-xs text-destructive">{{ dayErrors[day.date] }}</p>
            </li>
          </ul>
        </section>

        <!-- ─── PGAS: Acknowledgement Receipt of Payment ─── -->
        <section v-if="!isDole" class="grid gap-3" aria-labelledby="report-payment-title">
          <h2 id="report-payment-title" class="text-sm font-semibold">
            Payment <span class="font-normal text-muted-foreground">(days on duty × daily stipend)</span>
          </h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div class="grid gap-1.5 content-start">
              <Label for="report-amount" class="text-xs">Amount (₱)</Label>
              <Input
                id="report-amount"
                v-model="details.amount"
                inputmode="decimal"
                placeholder="0.00"
                class="h-9 font-mono text-base md:text-xs"
                :aria-invalid="!!detailErrors.amount"
                :disabled="isReadOnly || isSaving"
                @input="onAmountInput"
              />
              <p v-if="amountPreview && !detailErrors.amount" class="text-xs text-muted-foreground font-mono">₱{{ amountPreview }}</p>
              <p v-if="detailErrors.amount" class="text-xs text-destructive">{{ detailErrors.amount }}</p>
            </div>
            <div class="grid gap-1.5">
              <div class="flex items-center justify-between gap-2">
                <Label for="report-words" class="text-xs">Amount in words</Label>
                <Button
                  v-if="!isReadOnly"
                  type="button"
                  variant="link"
                  size="sm"
                  class="h-auto gap-1 p-0 text-xs cursor-pointer"
                  :disabled="isSaving"
                  @click="fillAmountInWords"
                >
                  <WandSparkles class="h-3.5 w-3.5" />
                  <span>Fill in</span>
                </Button>
              </div>
              <textarea
                id="report-words"
                v-model="details.amount_in_words"
                rows="2"
                :maxlength="wordsMax"
                :class="[textareaClass, 'uppercase']"
                :aria-invalid="!!detailErrors.amount_in_words"
                :disabled="isReadOnly || isSaving"
              />
              <p v-if="detailErrors.amount_in_words" class="text-xs text-destructive">{{ detailErrors.amount_in_words }}</p>
            </div>
          </div>
        </section>

        <Separator />

        <!-- ─── Printed on the form: designation & signatories ─── -->
        <section class="grid gap-3" aria-labelledby="report-signatories-title">
          <h2 id="report-signatories-title" class="text-sm font-semibold">Signatories</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-if="!isDole" class="grid gap-1.5 sm:col-span-2">
              <Label for="report-designation" class="text-xs">Designation</Label>
              <Input id="report-designation" v-model="details.designation" :maxlength="nameMax" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" />
            </div>
            <div class="grid gap-1.5 sm:col-span-2">
              <Label for="report-supervisor" class="text-xs">Supervisor</Label>
              <Input id="report-supervisor" v-model="details.supervisor_name" :maxlength="nameMax" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" />
            </div>
            <div class="grid gap-1.5">
              <Label for="report-approver" class="text-xs">Office head</Label>
              <Input id="report-approver" v-model="details.approver_name" :maxlength="nameMax" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" />
            </div>
            <div class="grid gap-1.5">
              <Label for="report-approver-position" class="text-xs">Position</Label>
              <Input id="report-approver-position" v-model="details.approver_position" :maxlength="nameMax" class="h-9 text-base md:text-xs" :disabled="isReadOnly || isSaving" />
            </div>
          </div>
          <p class="text-[11px] text-muted-foreground">The office head is filled from your office. Change it if someone else approves.</p>
        </section>
      </CardContent>

      <CardFooter v-if="!isReadOnly" class="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-muted-foreground">
          <template v-if="isEarly">These dates end {{ formatDisplayDate(periodTo) }}.</template>
          <template v-else-if="currentReport?.status === 'Submitted'">Submitted {{ formatDisplayDate(currentReport.submittedAt) }}.</template>
        </p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <Button v-if="canSaveDraft" variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSaving" @click="saveDraft">
            <Loader2 v-if="savingMode === 'draft'" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ savingMode === 'draft' ? 'Saving...' : 'Save draft' }}</span>
          </Button>
          <Button size="sm" class="gap-1.5 text-xs cursor-pointer font-semibold" :disabled="isSaving" @click="submitReport">
            <Loader2 v-if="savingMode === 'submit'" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ savingMode === 'submit' ? 'Submitting...' : submitLabel }}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>

    <!-- ─── Submitting before the last day ─── -->
    <Dialog :open="isEarlySubmitDialogOpen" @update:open="onEarlySubmitDialogChange">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base">Submit before {{ formatDisplayDate(periodTo) }}?</DialogTitle>
          <DialogDescription class="text-xs">These dates aren't over yet, so days after today won't be included.</DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isSaving" @click="onEarlySubmitDialogChange(false)">Cancel</Button>
          <Button size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSaving" @click="confirmEarlySubmit">
            <Loader2 v-if="savingMode === 'submit'" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ savingMode === 'submit' ? 'Submitting...' : 'Submit anyway' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
