<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import {
  ChevronUp,
  LayoutDashboard,
  Clock,
  Book,
  UserRound,
} from '@lucide/vue'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/services/supabase'
import { buildFullName } from '@/helpers/peso/userManagementHelper'
import { getInitials } from '@/helpers/peso/attendanceHelper'

const route = useRoute()
const router = useRouter()

const { state, isMobile } = useSidebar()

const displayName = ref('User')
const userInitials = ref('U')
const userEmail = ref('')
const isVerified = ref(false)
const isLoading = ref(true)

const operationsItems = [
  { title: 'Daily Time Record', to: { name: 'supervisor-dashboard' }, icon: Clock },
  { title: 'Client Records', to: { name: 'supervisor-dashboard' }, icon: Book },
]

const authSubscription = ref<ReturnType<typeof supabase.auth.onAuthStateChange> | null>(null)

const updateUserInfo = async () => {
  try {
    const { data, error } = await supabase.auth.getUser()
    const user = data?.user

    if (error || !user) {
      displayName.value = 'User'
      userInitials.value = 'U'
      userEmail.value = ''
      isVerified.value = false
      isLoading.value = false
      return
    }

    userEmail.value = user.email || ''
    isVerified.value = !!user.email_confirmed_at

    // Fetch user profile from public.profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('firstname, middlename, lastname, position, role, status')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.warn('Error fetching profile in sidebar:', profileError.message)
    }

    if (profile && (profile.firstname || profile.lastname)) {
      const completeName = buildFullName(profile.firstname, profile.middlename, profile.lastname)
      displayName.value = completeName
      userInitials.value = getInitials(completeName)
    } else {
      const fallbackFullName = (user.user_metadata?.full_name || user.user_metadata?.name || '') as string
      const resolvedName = fallbackFullName.trim() || user.email?.split('@')[0] || 'User'
      displayName.value = resolvedName
      userInitials.value = getInitials(resolvedName)
    }
  } catch (err) {
    console.error('Failed to update user info in sidebar:', err)
  } finally {
    isLoading.value = false
  }
}

const handleSignOut = async () => {
  await supabase.auth.signOut()
  await router.replace({ name: 'login' })
}

onMounted(async () => {
  await updateUserInfo()
  authSubscription.value = supabase.auth.onAuthStateChange(async () => {
    await updateUserInfo()
  })
})

onUnmounted(() => {
  authSubscription.value?.data.subscription.unsubscribe()
})

const isDashboard = computed(() => route.name === 'supervisor-dashboard')
</script>

<template>
  <Sidebar collapsible="icon" class="border-r border-sidebar-border/50">
    <template v-if="isLoading">
      <SidebarHeader class="p-4 flex items-center w-full">
        <Skeleton v-if="state === 'expanded'" class="h-7 w-32 mr-auto" />
        <Skeleton v-else class="size-8 rounded-md mx-auto" />
      </SidebarHeader>

      <SidebarContent class="px-2 space-y-6">
        <div class="space-y-2 pt-2">
          <Skeleton v-if="state === 'expanded'" class="h-3 w-16 mx-2 mb-3" />
          <div v-for="i in 3" :key="`gen-${i}`" class="flex items-center gap-3 h-9 px-2">
            <Skeleton class="size-4 shrink-0 rounded" />
            <Skeleton v-if="state === 'expanded'" class="h-4 flex-1 max-w-27.5" />
          </div>
        </div>

        <div class="h-px bg-sidebar-border/50 my-1 mx-2" />

        <div class="space-y-2">
          <Skeleton v-if="state === 'expanded'" class="h-3 w-20 mx-2 mb-3" />
          <div v-for="i in 2" :key="`op-${i}`" class="flex items-center gap-3 h-9 px-2">
            <Skeleton class="size-4 shrink-0 rounded" />
            <Skeleton v-if="state === 'expanded'" class="h-4 flex-1 max-w-22.5" />
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter class="p-2">
        <div class="w-full flex items-center gap-2 h-12" :class="state === 'collapsed' ? 'justify-center p-0' : 'justify-start px-2'">
          <Skeleton class="size-8 rounded-lg shrink-0" />
          <div v-if="state === 'expanded'" class="space-y-1.5 flex-1 min-w-0 pr-2">
            <Skeleton class="h-4 w-[85%]" />
            <Skeleton class="h-3 w-[60%]" />
          </div>
        </div>
      </SidebarFooter>
    </template>

    <template v-else>
      <SidebarHeader class="p-2 flex items-center w-full transition-all duration-200">
        <div v-if="state === 'expanded'" class="w-full max-w-50 flex justify-start mr-auto p-2">
          <img src="/agsur.png" alt="AGSURJOBS Logo" class="dark:hidden w-10 h-10 object-contain">
        </div>
        <div v-else class="flex items-center justify-center size-8 mx-auto overflow-hidden">
          <img src="/agsur.png" alt="AGSURJOBS Logo" class="w-10 h-10 object-contain">
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarMenuItem>
            <SidebarMenuButton as-child :tooltip="'Dashboard'" :is-active="isDashboard">
              <RouterLink :to="{ name: 'supervisor-dashboard' }">
                <LayoutDashboard />
                <span>Dashboard</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <div class="my-1 h-px bg-sidebar-border" />

          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in operationsItems" :key="item.title">
                <SidebarMenuButton as-child :tooltip="item.title">
                  <RouterLink :to="item.to">
                    <component :is="item.icon" />
                    <span>{{ item.title }}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu :modal="false">
              <DropdownMenuTrigger as-child>
                <SidebarMenuButton
                  class="w-full flex items-center gap-2 h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  :class="state === 'collapsed' ? 'justify-center p-0' : 'justify-start px-2'"
                >
                  <Avatar class="size-8 rounded-lg shrink-0">
                    <AvatarFallback class="rounded-lg">{{ userInitials }}</AvatarFallback>
                  </Avatar>

                  <div v-if="state === 'expanded'" class="min-w-0 flex-1 text-left text-sm leading-tight pr-2">
                    <div class="flex items-center gap-1.5 w-full min-w-0">
                      <span class="truncate font-semibold">{{ displayName }}</span>
                      <Badge
                        class="text-[9px] px-1 py-0 h-3.5 uppercase tracking-wider font-extrabold shrink-0 select-none"
                        :class="isVerified ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-500 text-black'"
                      >
                        {{ isVerified ? 'Verified' : 'Pending' }}
                      </Badge>
                    </div>
                    <span class="truncate text-xs text-muted-foreground block">{{ userEmail }}</span>
                  </div>

                  <ChevronUp v-if="state === 'expanded'" class="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                :side="isMobile ? 'top' : 'right'"
                align="end"
                class="w-64 p-1 mb-2 data-[side=right]:ml-2"
              >
                <div class="flex items-center gap-2 px-2 py-1.5 text-sm font-normal">
                  <Avatar class="size-8 rounded-lg shrink-0">
                    <AvatarFallback class="rounded-lg">{{ userInitials }}</AvatarFallback>
                  </Avatar>

                  <div class="min-w-0 flex-1 text-left text-sm leading-tight">
                    <div class="flex items-center gap-1.5 w-full min-w-0">
                      <span class="truncate font-semibold text-foreground">{{ displayName }}</span>
                      <Badge
                        class="text-[9px] px-1 py-0 h-3.5 uppercase tracking-wider font-extrabold shrink-0 select-none"
                        :class="isVerified ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-500 text-black'"
                      >
                        {{ isVerified ? 'Verified' : 'Pending' }}
                      </Badge>
                    </div>
                    <span class="truncate text-xs text-muted-foreground block">{{ userEmail }}</span>
                  </div>
                </div>

                <div class="my-1 h-px bg-sidebar-border" />

                <DropdownMenuItem class="cursor-pointer gap-2">
                  <UserRound class="size-4" />
                  <span>Account</span>
                </DropdownMenuItem>

                <div class="my-1 h-px bg-sidebar-border" />

                <DropdownMenuItem class="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 gap-2" @click="handleSignOut">
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </template>
  </Sidebar>
</template>
