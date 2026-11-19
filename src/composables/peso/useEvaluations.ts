import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type EvaluationsTab = 'submitted' | 'questions'

/** Admin Evaluations page: tabs kept in the URL (?tab=questions) so a reload stays on the same tab. */
export function useEvaluations() {
  const route = useRoute()
  const router = useRouter()

  const tabs: { key: EvaluationsTab; label: string }[] = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'questions', label: 'Questions' },
  ]

  const activeTab = computed<EvaluationsTab>(() => (route.query.tab === 'questions' ? 'questions' : 'submitted'))

  const setTab = (tab: EvaluationsTab) => {
    if (tab === activeTab.value) return
    // Switching tabs also leaves the office opened on the Submitted tab
    void router.replace({ query: { ...route.query, tab: tab === 'submitted' ? undefined : tab, office: undefined } })
  }

  return { tabs, activeTab, setTab }
}
