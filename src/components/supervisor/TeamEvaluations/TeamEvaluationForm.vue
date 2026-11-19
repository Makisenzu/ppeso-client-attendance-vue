<script setup lang="ts">
import { ArrowLeft, Check, CircleAlert, Loader2, Lock, Send, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import RubberSegment from '@/components/common/RubberSegment.vue'
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
  ratingOptions,
  getRatingValue,
  onRatingChange,
  remarks,
  remarksMax,
  formError,
  formatScore,
  progressTicks,
  progressText,
  remainingText,
  isComplete,
  categoryProgress,
  overallScoreText,
  overallScoreLabel,
  remarksCount,
  getSectionId,
  isRated,
  isMissing,
  getRatingLabel,
  scaleStartLabel,
  scaleEndLabel,
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

// ─── Class constants ───
const questionCardClass = 'scroll-mt-24 rounded-xl border bg-card p-4 shadow-xs transition-colors sm:p-5'
const questionIdleClass = 'border-border'
const questionRatedClass = 'border-border bg-card'
const questionMissingClass = 'border-destructive/50 bg-destructive/5'

const badgeBaseClass = 'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors'
const badgeIdleClass = 'bg-muted text-muted-foreground'
const badgeRatedClass = 'bg-primary text-primary-foreground'

const tickClass = 'h-1.5 flex-1 rounded-full transition-colors'
const tickRatedClass = 'bg-primary'
const tickIdleClass = 'bg-muted'

const textareaClass =
  'w-full min-h-28 resize-y rounded-lg border border-input bg-transparent px-3 py-2.5 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-60'
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12">
    <!-- ─── Back ─── -->
    <Button variant="ghost" size="sm" class="-ml-2 gap-1.5 self-start text-xs text-muted-foreground cursor-pointer" @click="goBack">
      <ArrowLeft class="h-3.5 w-3.5" />
      <span>Back to Evaluation</span>
    </Button>

    <!-- ─── Loading ─── -->
    <div v-if="isLoading" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="flex flex-col gap-4">
        <Skeleton class="h-20 w-full rounded-xl" />
        <Skeleton class="h-40 w-full rounded-xl" />
        <Skeleton class="h-40 w-full rounded-xl" />
      </div>
      <Skeleton class="hidden h-96 w-full rounded-xl lg:block" />
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
      <header class="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="flex items-center gap-4 min-w-0">
          <Avatar class="size-14 shrink-0 rounded-xl text-base font-semibold">
            <AvatarFallback class="rounded-xl bg-primary/10 text-primary">{{ memberInitials }}</AvatarFallback>
          </Avatar>
          <div class="min-w-0 space-y-1">
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monthly Evaluation · {{ periodLabel }}</p>
            <h1 class="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{{ memberName }}</h1>
            <p class="text-sm text-muted-foreground">{{ memberPosition }}</p>
          </div>
        </div>
        <div class="flex flex-col items-start gap-1.5 sm:items-end">
          <Badge variant="outline" :class="[statusBadgeClass, 'gap-1 text-[11px]']">
            <Lock v-if="isReadOnly" class="size-3" />
            <span>{{ statusLabel }}</span>
          </Badge>
          <span class="text-xs text-muted-foreground">{{ statusLine }}</span>
        </div>
      </header>

      <!-- ─── No questions ─── -->
      <div
        v-if="!hasQuestions && !isReadOnly"
        class="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm"
      >
        <CircleAlert class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p class="text-muted-foreground">There are no evaluation questions yet. Ask a PESO admin to add them.</p>
      </div>

      <div v-else class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <!-- ═══ Summary (top on phones, sticky right column on desktop) ═══ -->
        <aside class="lg:sticky lg:top-20 lg:order-2" aria-label="Evaluation summary">
          <Card class="gap-0 overflow-hidden border py-0 shadow-xs">
            <!-- Overall score -->
            <div class="border-b border-border bg-muted/30 px-5 py-5">
              <p class="text-xs font-medium text-muted-foreground">{{ isReadOnly ? 'Overall Rating' : 'Live Overall Rating' }}</p>
              <div class="mt-1 flex items-baseline gap-2">
                <span class="font-mono text-4xl font-bold tracking-tight text-foreground">{{ overallScoreText }}</span>
                <span class="text-sm text-muted-foreground">/ 5.00</span>
              </div>
              <p class="mt-0.5 text-sm font-medium text-foreground">{{ overallScoreLabel }}</p>
            </div>

            <!-- Progress -->
            <div class="space-y-2.5 border-b border-border px-5 py-4">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-foreground">{{ progressText }}</span>
                <span :class="isComplete ? 'text-success' : 'text-muted-foreground'">{{ remainingText }}</span>
              </div>
              <div class="flex gap-0.5" aria-hidden="true">
                <span
                  v-for="tick in progressTicks"
                  :key="tick.id"
                  :class="[tickClass, tick.rated ? tickRatedClass : tickIdleClass]"
                />
              </div>
            </div>

            <!-- Categories -->
            <nav class="divide-y divide-border" aria-label="Evaluation sections">
              <a
                v-for="item in categoryProgress"
                :key="item.category"
                :href="`#${getSectionId(item.category)}`"
                class="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground">{{ item.label }}</p>
                  <p class="text-xs text-muted-foreground">{{ item.rated }} of {{ item.total }} rated</p>
                </div>
                <span class="font-mono text-sm font-semibold text-foreground">{{ formatScore(item.average) }}</span>
              </a>
            </nav>

            <!-- Actions (desktop) -->
            <div v-if="canEdit" class="hidden flex-col gap-2 border-t border-border px-5 py-4 lg:flex">
              <Button class="w-full gap-1.5 cursor-pointer font-semibold" :disabled="isSaving" @click="requestSubmit">
                <Send class="h-4 w-4" />
                <span>Submit Evaluation</span>
              </Button>
              <Button variant="outline" class="w-full gap-1.5 cursor-pointer" :disabled="isSaving" @click="saveDraft">
                <Loader2 v-if="savingAction === 'Draft'" class="h-4 w-4 animate-spin" />
                <span>{{ savingAction === 'Draft' ? 'Saving...' : 'Save Draft' }}</span>
              </Button>
              <Button
                v-if="canDiscard"
                variant="ghost"
                size="sm"
                class="w-full gap-1.5 text-xs text-destructive hover:text-destructive cursor-pointer"
                :disabled="isSaving"
                @click="openDiscardDialog"
              >
                <Trash2 class="h-3.5 w-3.5" />
                <span>Discard draft</span>
              </Button>
            </div>
            <div v-else-if="isReadOnly" class="flex items-center gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground">
              <Lock class="size-3.5 shrink-0" />
              <span>Submitted evaluations can't be changed.</span>
            </div>
          </Card>
        </aside>

        <!-- ═══ Questions ═══ -->
        <div class="flex min-w-0 flex-col gap-8 lg:order-1">
          <section
            v-for="group in formGroups"
            :id="getSectionId(group.category)"
            :key="group.category"
            class="scroll-mt-24 space-y-3"
          >
            <div class="flex items-end justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold tracking-tight text-foreground">{{ group.label }}</h2>
                <p class="text-xs text-muted-foreground">{{ group.hint }}</p>
              </div>
              <p class="hidden text-[11px] text-muted-foreground sm:block">{{ scaleStartLabel }} 1 → 5 {{ scaleEndLabel }}</p>
            </div>

            <article
              v-for="item in group.items"
              :key="item.id"
              :class="[questionCardClass, isMissing(item.id) ? questionMissingClass : isRated(item.id) ? questionRatedClass : questionIdleClass]"
            >
              <div class="flex items-start gap-3">
                <span :class="[badgeBaseClass, isRated(item.id) ? badgeRatedClass : badgeIdleClass]" aria-hidden="true">
                  <Check v-if="isRated(item.id)" class="size-3.5" />
                  <template v-else>{{ item.number }}</template>
                </span>
                <p :id="`question-${item.id}`" class="pt-0.5 text-sm font-medium leading-relaxed text-foreground">
                  {{ item.question }}
                </p>
              </div>

              <div class="mt-4 sm:pl-10">
                <RubberSegment
                  :model-value="getRatingValue(item.id)"
                  :options="ratingOptions"
                  :disabled="!canEdit || isSaving"
                  :aria-labelledby="`question-${item.id}`"
                  @update:model-value="onRatingChange(item.id, $event)"
                />
                <p
                  class="mt-2 text-xs"
                  :class="isMissing(item.id) ? 'text-destructive' : isRated(item.id) ? 'font-medium text-foreground' : 'text-muted-foreground'"
                >
                  {{ getRatingLabel(item.id) }}
                </p>
              </div>
            </article>
          </section>

          <!-- Remarks -->
          <section class="space-y-3">
            <div>
              <h2 class="text-lg font-semibold tracking-tight text-foreground">
                <label for="evaluation-remarks">Remarks</label>
              </h2>
              <p class="text-xs text-muted-foreground">Optional notes on strengths and areas to improve.</p>
            </div>
            <div class="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
              <textarea
                id="evaluation-remarks"
                v-model="remarks"
                rows="4"
                :maxlength="remarksMax"
                :class="textareaClass"
                :placeholder="isReadOnly ? 'No remarks.' : 'e.g. Reliable with deadlines; can improve on documentation.'"
                :disabled="!canEdit || isSaving"
              />
              <p v-if="canEdit" class="mt-1.5 text-right font-mono text-[11px] text-muted-foreground">{{ remarksCount }}</p>
            </div>
          </section>

          <p
            v-if="formError"
            class="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
            role="alert"
          >
            <CircleAlert class="mt-px size-3.5 shrink-0" />
            <span>{{ formError }}</span>
          </p>

          <!-- Actions (phones & tablets): sticks to the bottom of the screen -->
          <div
            v-if="canEdit"
            class="sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6 lg:hidden"
          >
            <Button
              v-if="canDiscard"
              variant="ghost"
              size="icon"
              class="size-10 shrink-0 text-destructive hover:text-destructive cursor-pointer"
              title="Discard draft"
              aria-label="Discard draft"
              :disabled="isSaving"
              @click="openDiscardDialog"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
            <Button variant="outline" class="h-10 flex-1 gap-1.5 cursor-pointer" :disabled="isSaving" @click="saveDraft">
              <Loader2 v-if="savingAction === 'Draft'" class="h-4 w-4 animate-spin" />
              <span>{{ savingAction === 'Draft' ? 'Saving...' : 'Save Draft' }}</span>
            </Button>
            <Button class="h-10 flex-1 gap-1.5 cursor-pointer font-semibold" :disabled="isSaving" @click="requestSubmit">
              <Send class="h-4 w-4" />
              <span>Submit</span>
            </Button>
          </div>
        </div>
      </div>
    </template>

    <!-- ─── Submit confirmation ─── -->
    <Dialog :open="isSubmitDialogOpen" @update:open="onSubmitDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">Submit Evaluation</DialogTitle>
          <DialogDescription class="text-xs">You can't change the evaluation of {{ memberName }} after submitting it.</DialogDescription>
        </DialogHeader>
        <div class="flex items-baseline justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <span class="text-xs text-muted-foreground">Overall rating</span>
          <span class="text-sm">
            <span class="font-mono font-bold text-foreground">{{ overallScoreText }}</span>
            <span class="text-muted-foreground"> · {{ overallScoreLabel }}</span>
          </span>
        </div>
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
