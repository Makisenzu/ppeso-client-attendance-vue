<script setup lang="ts">
import EvaluationQuestionsTab from '@/components/peso/Evaluations/EvaluationQuestionsTab.vue'
import EvaluationRecordsTab from '@/components/peso/Evaluations/EvaluationRecordsTab.vue'
import { useEvaluations } from '@/composables/peso/useEvaluations'

const { tabs, activeTab, setTab } = useEvaluations()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">GIP Evaluations</h1>
      <p class="text-sm text-muted-foreground">Monthly supervisor ratings of GIP performance and attitude.</p>
    </div>

    <div
      role="tablist"
      aria-label="Evaluation sections"
      class="inline-flex w-full self-start rounded-lg border bg-muted/40 p-1 sm:w-auto"
    >
      <button
        v-for="tab in tabs"
        :id="`evaluation-tab-${tab.key}`"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :aria-controls="`evaluation-panel-${tab.key}`"
        class="flex-1 rounded-md px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer sm:flex-none"
        :class="activeTab === tab.key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
        @click="setTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="activeTab === 'questions'"
      id="evaluation-panel-questions"
      role="tabpanel"
      aria-labelledby="evaluation-tab-questions"
    >
      <EvaluationQuestionsTab />
    </div>
    <div v-else id="evaluation-panel-submitted" role="tabpanel" aria-labelledby="evaluation-tab-submitted">
      <EvaluationRecordsTab />
    </div>
  </div>
</template>
