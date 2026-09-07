<script setup lang="ts">
import { computed } from 'vue'
import { BadgeDollarSign, Building2, ClipboardList, Clock3, FileText, LayoutDashboard, Settings2, Users } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const route = useRoute()

const navigationGroups = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, to: { name: 'dashboard' }, badge: 'Live' },
      { title: 'Employees', icon: Users, to: { name: 'employees' }, badge: '124' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Attendance', icon: Clock3, to: { name: 'attendance' }, badge: 'Today' },
      { title: 'PESO Services', icon: Building2, to: { name: 'services' }, badge: 'Core' },
      { title: 'Reports', icon: FileText, to: { name: 'reports' }, badge: 'Monthly' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { title: 'Payroll', icon: BadgeDollarSign, to: { name: 'payroll' }, badge: 'Beta' },
      { title: 'Requests', icon: ClipboardList, to: { name: 'requests' }, badge: '8' },
      { title: 'Settings', icon: Settings2, to: { name: 'settings' } },
    ],
  },
]

const currentRouteName = computed(() => route.name)
</script>

<template>
  <Sidebar collapsible="icon" class="border-r border-sidebar-border/50">
    <SidebarHeader class="p-3 flex items-center w-full transition-all duration-200">
      <div class="w-full max-w-50 flex justify-start mr-auto p-2">
        <div class="flex items-center gap-3">
          <div class="bg-sidebar-primary text-sidebar-primary-foreground flex h-10 w-10 items-center justify-center rounded-xl">
            <Building2 class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">Municipal PESO</p>
            <h1 class="text-sm font-semibold text-foreground">Employee Attendance</h1>
          </div>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent class="px-2 space-y-4">
      <SidebarGroup v-for="group in navigationGroups" :key="group.label" class="px-0 py-0">
        <SidebarGroupLabel class="px-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {{ group.label }}
        </SidebarGroupLabel>

        <SidebarGroupContent>
          <SidebarMenu class="gap-1 px-2">
            <SidebarMenuItem v-for="item in group.items" :key="item.title">
              <SidebarMenuButton as-child :tooltip="item.title" :is-active="currentRouteName === item.to.name">
                <RouterLink :to="item.to">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                  <SidebarMenuBadge v-if="item.badge" class="ml-auto">{{ item.badge }}</SidebarMenuBadge>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="p-2">
      <div class="w-full rounded-xl border border-sidebar-border/60 bg-sidebar-accent/40 p-3">
        <p class="text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
        <p class="mt-1 font-medium text-foreground">Municipal PESO Admin</p>
        <p class="text-sm text-muted-foreground">attendance@municipal.gov</p>
      </div>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>