<script setup lang="ts">
import { computed } from 'vue'
import { BellRing, CalendarDays, ClipboardList, LayoutDashboard, LineChart, Users } from '@lucide/vue'

const summaryCards = [
  { label: 'Active employees', value: '124', description: '12 new profiles this week', icon: Users },
  { label: 'Checked in today', value: '96%', description: '14 employees currently on-site', icon: CalendarDays },
  { label: 'Pending requests', value: '18', description: 'Attendance and PESO follow-ups', icon: ClipboardList },
  { label: 'Service performance', value: '87%', description: 'Above the monthly target', icon: LineChart },
]

const quickActions = ['Register employee', 'Log attendance', 'Review service request', 'Export monthly report']

const recentActivity = [
  '5 employees checked in before 8:00 AM',
  '3 PESO service requests approved',
  'Attendance summary prepared for payroll',
]

const progressItems = computed(() => [
  { label: 'Attendance compliance', value: '87%', width: '87%', color: 'bg-slate-900' },
  { label: 'Request turnaround', value: '2.4 days', width: '68%', color: 'bg-emerald-500' },
])
</script>

<template>
  <div class="space-y-8">
    <section id="overview" class="space-y-6">
      <div class="max-w-3xl space-y-3">
        <p class="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Overview</p>
        <h2 class="text-3xl font-semibold tracking-tight text-slate-950">
          Keep employee attendance and PESO services in sync.
        </h2>
        <p class="text-slate-600">
          Monitor the daily headcount, service requests, and payroll-related activity from one central layout.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm text-slate-500">{{ card.label }}</p>
              <p class="mt-2 text-3xl font-semibold text-slate-950">{{ card.value }}</p>
            </div>
            <div class="rounded-xl bg-slate-100 p-3 text-slate-700">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
          </div>
          <p class="mt-4 text-sm text-slate-600">{{ card.description }}</p>
        </article>
      </div>
    </section>

    <section id="employees" class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Employees</p>
            <h3 class="mt-1 text-xl font-semibold text-slate-950">Attendance-ready workforce</h3>
          </div>
          <LayoutDashboard class="h-5 w-5 text-slate-400" />
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div class="rounded-xl bg-slate-50 p-4">
            <p class="text-sm text-slate-500">Active roster</p>
            <p class="mt-1 text-2xl font-semibold text-slate-950">124 employees</p>
            <p class="mt-2 text-sm text-slate-600">Managed across the municipal workforce directory.</p>
          </div>
          <div class="rounded-xl bg-slate-50 p-4">
            <p class="text-sm text-slate-500">Today's check-ins</p>
            <p class="mt-1 text-2xl font-semibold text-slate-950">96% complete</p>
            <p class="mt-2 text-sm text-slate-600">Late arrivals are highlighted for payroll review.</p>
          </div>
        </div>
      </article>

      <article id="attendance" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
          <BellRing class="h-4 w-4" />
          <span>Attendance</span>
        </div>
        <h3 class="mt-1 text-xl font-semibold text-slate-950">Quick activity</h3>
        <ul class="mt-5 space-y-4 text-sm text-slate-600">
          <li v-for="item in recentActivity" :key="item" class="flex gap-3">
            <span class="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
            <span>{{ item }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section id="services" class="grid gap-6 lg:grid-cols-3">
      <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <p class="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">PESO Services</p>
        <h3 class="mt-1 text-xl font-semibold text-slate-950">Requests, referrals, and support</h3>
        <p class="mt-3 text-slate-600">
          Centralize service intake so staff can resolve employment assistance and follow-up requests quickly.
        </p>
        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <div
            v-for="action in quickActions"
            :key="action"
            class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{ action }}
          </div>
        </div>
      </article>

      <article id="reports" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Reports</p>
        <h3 class="mt-1 text-xl font-semibold text-slate-950">Monthly snapshot</h3>
        <div class="mt-5 space-y-4 text-sm text-slate-600">
          <div v-for="item in progressItems" :key="item.label">
            <div class="flex items-center justify-between gap-4">
              <span>{{ item.label }}</span>
              <span class="font-semibold text-slate-900">{{ item.value }}</span>
            </div>
            <div class="mt-2 h-2 rounded-full bg-slate-100">
              <div :class="['h-2 rounded-full', item.color]" :style="{ width: item.width }" />
            </div>
          </div>
        </div>
      </article>
    </section>

    <section id="payroll" class="grid gap-6 md:grid-cols-2">
      <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Payroll</p>
        <h3 class="mt-1 text-xl font-semibold text-slate-950">Sync attendance for payroll</h3>
        <p class="mt-3 text-slate-600">
          Keep the attendance ledger aligned with payroll export requirements and reduce manual reconciliation.
        </p>
      </article>

      <article id="requests" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Requests</p>
        <h3 class="mt-1 text-xl font-semibold text-slate-950">Pending follow-ups</h3>
        <p class="mt-3 text-slate-600">
          Review service requests, route approvals, and close out pending employee cases.
        </p>
      </article>
    </section>

    <section id="settings" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Settings</p>
      <h3 class="mt-1 text-xl font-semibold text-slate-950">Layout shell ready for future modules</h3>
      <p class="mt-3 max-w-3xl text-slate-600">
        The sidebar and content sections are wired to the existing Vue layout structure, so additional routes or dashboards can be added without reworking the shell.
      </p>
    </section>
  </div>
</template>