<script setup lang="ts">
import { ArrowLeft, CircleAlert, Loader2, Send, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useTeamEvaluationForm } from '@/composables/supervisor/useTeamEvaluationForm'

const props = defineProps<{ profileId: string }>()

const {
  isLoading,
  loadError,
  fetchAll,
  goBack,
  memberName,
  memberInitials,
  memberPosition,
  periodLabel,
  statusLabel,
  statusBadgeClass,
  statusLine,
  isReadOnly,
  hasQuestions,
  canEdit,
  formGroups,
  ratingScale,
  isRatingSelected,
  setRating,
  remarks,
  remarksMax,
  formError,
  answeredLabel,
  scores,
  formatScore,
  formatScoreLabel,
  savingAction,
  isSaving,
  saveDraft,
  isSubmitDialogOpen,
  onSubmitDialogOpenChange,
  requestSubmit,
  closeSubmitDialog,
  confirmSubmit,
  canDiscard,
  isDiscardDialogOpen,
  isDiscarding,
  onDiscardDialogOpenChange,
  openDiscardDialog,
  closeDiscardDialog,
  confirmDiscard,
} = useTeamEvaluationForm(props)

const ratingButtonClass =
  'flex min-h-10 flex-1 flex-col items-center justify-center rounded-md border px-1 py-1.5 text-center transition-colors cursor-pointer disabled:cursor-default'
const ratingSelectedClass = 'border-primary bg-primary text-primary-foreground'
const ratingIdleClass = 'border-input bg-background text-foreground hover:bg-muted'
const ratingReadOnlyIdleClass = 'border-border bg-muted/30 text-muted-foreground'
const textareaClass =
  'w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-12">
    <!-- ─── Back ─── -->
    <Button variant="ghost" size="sm" class="-ml-2 gap-1.5 self-start text-xs cursor-pointer" @click="goBack">
      <ArrowLeft class="h-3.5 w-3.5" />
      <span>Back to Evaluation</span>
    </Button>

    <!-- ─── Loading ─── -->
    <div v-if="isLoading" class="flex flex-col gap-4">
      <Skeleton class="h-16 w-full" />
      <Skeleton class="h-64 w-full" />
    </div>

    <!-- ─── Can't open ─── -->
    <Card v-else-if="loadError" class="border shadow-xs">
      <CardContent>
        <Empty class="border-0 p-6 md:p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlert class="size-5 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Can't open this evaluation</EmptyTitle>
            <EmptyDescription>{{ loadError }}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent class="flex-row justify-center gap-2">
            <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="fetchAll">Try again</Button>
            <Button size="sm" class="text-xs cursor-pointer" @click="goBack">Back to Evaluation</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <template v-else>
      <!-- ─── Header ─── -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <Avatar class="h-12 w-12 shrink-0 text-sm font-medium">
            <AvatarFallback class="bg-primary/10 text-primary">{{ memberInitials }}</AvatarFallback>
          </Avatar>
          <div class="min-w-0 space-y-0.5">
            <h1 class="truncate text-2xl font-bold tracking-tight text-foreground">{{ memberName }}</h1>
            <p class="text-sm text-muted-foreground">{{ memberPosition }} · Evaluation for {{ periodLabel }}</p>
          </div>
        </div>
        <div class="flex flex-col items-start gap-1 sm:items-end">
          <Badge variant="outline" :class="[statusBadgeClass, 'text-[11px]']">{{ statusLabel }}</Badge>
          <span class="text-xs text-muted-foreground">{{ statusLine }}</span>
        </div>
      </div>

      <!-- ─── No questions ─── -->
      <div
        v-if="!hasQuestions && !isReadOnly"
        class="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm"
      >
        <CircleAlert class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p class="text-muted-foreground">There are no evaluation questions yet. Ask a PESO admin to add them.</p>
      </div>

      <!-- ─── Scores (submitted) ─── -->
      <div v-if="scores" class="grid grid-cols-3 gap-3">
        <Card class="border shadow-xs bg-card/60">
          <CardContent class="p-4">
            <p class="text-xs font-medium text-muted-foreground">Performance</p>
            <p class="font-mono text-2xl font-bold text-foreground">{{ formatScore(scores.performance) }}</p>
            <p class="text-[11px] text-muted-foreground">{{ formatScoreLabel(scores.performance) }}</p>
          </CardContent>
        </Card>
        <Card class="border shadow-xs bg-card/60">
          <CardContent class="p-4">
            <p class="text-xs font-medium text-muted-foreground">Attitude</p>
            <p class="font-mono text-2xl font-bold text-foreground">{{ formatScore(scores.attitude) }}</p>
            <p class="text-[11px] text-muted-foreground">{{ formatScoreLabel(scores.attitude) }}</p>
          </CardContent>
        </Card>
        <Card class="border shadow-xs bg-primary/5">
          <CardContent class="p-4">
            <p class="text-xs font-medium text-muted-foreground">Overall</p>
            <p class="font-mono text-2xl font-bold text-foreground">{{ formatScore(scores.overall) }}</p>
            <p class="text-[11px] text-muted-foreground">{{ formatScoreLabel(scores.overall) }}</p>
          </CardContent>
        </Card>
      </div>

      <!-- Rating scale key -->
      <p v-else-if="hasQuestions" class="text-xs text-muted-foreground">
        1 Poor · 2 Unsatisfactory · 3 Satisfactory · 4 Very Satisfactory · 5 Outstanding · {{ answeredLabel }}
      </p>

      <!-- ─── Question groups ─── -->
      <Card v-for="group in formGroups" :key="group.category" class="border shadow-xs">
        <CardHeader class="pb-2">
          <CardTitle class="text-lg font-semibold">{{ group.label }}</CardTitle>
          <CardDescription class="text-xs">{{ group.hint }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <div v-for="(item, index) in group.items" :key="item.id" class="space-y-2">
            <p :id="`question-${item.id}`" class="text-sm text-foreground">
              <span class="text-muted-foreground">{{ index + 1 }}.</span> {{ item.question }}
            </p>
            <div role="radiogroup" :aria-labelledby="`question-${item.id}`" class="flex gap-1.5">
              <button
                v-for="option in ratingScale"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="isRatingSelected(item.id, option.value)"
                :aria-label="`${option.value} – ${option.label}`"
                :title="option.label"
                :disabled="!canEdit || isSaving"
                :class="[
                  ratingButtonClass,
                  isRatingSelected(item.id, option.value)
                    ? ratingSelectedClass
                    : isReadOnly
                      ? ratingReadOnlyIdleClass
                      : ratingIdleClass,
                ]"
                @click="setRating(item.id, option.value)"
              >
                <span class="text-sm font-semibold">{{ option.value }}</span>
                <span class="hidden text-[10px] leading-tight sm:block">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- ─── Remarks ─── -->
      <Card v-if="hasQuestions || isReadOnly" class="border shadow-xs">
        <CardHeader class="pb-2">
          <CardTitle class="text-lg font-semibold">
            <label for="evaluation-remarks">Remarks</label>
          </CardTitle>
          <CardDescription class="text-xs">Optional notes on strengths and areas to improve.</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            id="evaluation-remarks"
            v-model="remarks"
            rows="4"
            :maxlength="remarksMax"
            :class="textareaClass"
            :disabled="!canEdit || isSaving"
          />
        </CardContent>
      </Card>

      <p
        v-if="formError"
        class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
        role="alert"
      >
        {{ formError }}
      </p>

      <!-- ─── Actions ─── -->
      <div v-if="canEdit" class="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          v-if="canDiscard"
          variant="ghost"
          size="sm"
          class="mr-auto gap-1.5 text-xs text-destructive hover:text-destructive cursor-pointer"
          :disabled="isSaving"
          @click="openDiscardDialog"
        >
          <Trash2 class="h-3.5 w-3.5" />
          <span>Discard draft</span>
        </Button>
        <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSaving" @click="saveDraft">
          <Loader2 v-if="savingAction === 'Draft'" class="h-3.5 w-3.5 animate-spin" />
          <span>{{ savingAction === 'Draft' ? 'Saving...' : 'Save Draft' }}</span>
        </Button>
        <Button size="sm" class="gap-1.5 text-xs cursor-pointer font-semibold" :disabled="isSaving" @click="requestSubmit">
          <Send class="h-3.5 w-3.5" />
          <span>Submit</span>
        </Button>
      </div>
    </template>

    <!-- ─── Submit confirmation ─── -->
    <Dialog :open="isSubmitDialogOpen" @update:open="onSubmitDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">Submit Evaluation</DialogTitle>
          <DialogDescription class="text-xs">You can't change the evaluation of {{ memberName }} after submitting it.</DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-2 gap-2 sm:gap-0">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isSaving" @click="closeSubmitDialog">
            Cancel
          </Button>
          <Button size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isSaving" @click="confirmSubmit">
            <Loader2 v-if="savingAction === 'Submitted'" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ savingAction === 'Submitted' ? 'Submitting...' : 'Submit' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── Discard draft confirmation ─── -->
    <Dialog :open="isDiscardDialogOpen" @update:open="onDiscardDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold text-foreground">Discard Draft</DialogTitle>
              <DialogDescription class="mt-0.5 text-xs">The ratings for {{ memberName }} will be deleted.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter class="mt-2 gap-2 sm:gap-0">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" :disabled="isDiscarding" @click="closeDiscardDialog">
            Cancel
          </Button>
          <Button variant="destructive" size="sm" class="gap-1.5 text-xs cursor-pointer" :disabled="isDiscarding" @click="confirmDiscard">
            <Loader2 v-if="isDiscarding" class="h-3.5 w-3.5 animate-spin" />
            <Trash2 v-else class="h-3.5 w-3.5" />
            <span>{{ isDiscarding ? 'Discarding...' : 'Discard' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
