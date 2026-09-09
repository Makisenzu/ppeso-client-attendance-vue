<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  Printer,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DtrSlip from './DtrSlip.vue'
import type { ProfileRecord } from '@/types/peso/userManagement'
import type { AttendanceRecord } from '@/types/peso/attendance'
import type { DtrGenerationResult, DtrOptions } from '@/types/peso/dtr'
import { attendanceService } from '@/services/peso/attendanceService'
import { userManagementService } from '@/services/peso/userManagementService'
import {
  generateDtrData,
  generateStandaloneDtrHtml,
  formatMonthHeader,
} from '@/helpers/peso/dtrHelper'
import { getInitials } from '@/helpers/peso/attendanceHelper'

const props = defineProps<{
  open: boolean
  initialProfileId?: string | null
  existingAttendances?: AttendanceRecord[]
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

// ─── State ───
const currentStep = ref<'config' | 'preview'>('config')
const isLoadingProfiles = ref(false)
const isGenerating = ref(false)
const profiles = ref<ProfileRecord[]>([])
const selectedProfileId = ref<string>('')
const employeeSearch = ref('')
const isEmployeeDropdownOpen = ref(false)

// Dates
const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1 // 1-12
const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate()

const defaultStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
const defaultEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
  Math.min(15, lastDayOfCurrentMonth)
).padStart(2, '0')}`

const startDate = ref<string>(defaultStart)
const endDate = ref<string>(defaultEnd)

// Official Hours & Signatories
const regularHours = ref<string>('')
const saturdayHours = ref<string>('')
const supervisorName = ref<string>('PGDH')
const supervisorTitle = ref<string>('(PESO Manager)')
const dualCopy = ref<boolean>(true)
const rightCopyHasName = ref<boolean>(false)

// Generated Output Data
const generatedData = ref<DtrGenerationResult | null>(null)
const fetchError = ref<string | null>(null)

// ─── Selected Employee Computed ───
const selectedEmployee = computed<ProfileRecord | null>(() => {
  if (!selectedProfileId.value) return null
  return profiles.value.find((p) => p.id === selectedProfileId.value) || null
})

// Filtered Employees for Selector Dropdown
const filteredEmployees = computed(() => {
  const q = employeeSearch.value.trim().toLowerCase()
  if (!q) return profiles.value
  return profiles.value.filter((p) => {
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.position || '').toLowerCase().includes(q) ||
      (p.firstname || '').toLowerCase().includes(q) ||
      (p.lastname || '').toLowerCase().includes(q)
    )
  })
})

// Load Profiles on open
const loadProfiles = async () => {
  if (profiles.value.length > 0) return
  isLoadingProfiles.value = true
  try {
    const list = await userManagementService.getProfiles()
    profiles.value = list
    if (!selectedProfileId.value && list.length > 0) {
      if (props.initialProfileId) {
        selectedProfileId.value = props.initialProfileId
      } else {
        selectedProfileId.value = list[0].id
      }
    }
  } catch (e) {
    console.error('Failed to load profiles for DTR modal:', e)
  } finally {
    isLoadingProfiles.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      currentStep.value = 'config'
      loadProfiles()
      if (props.initialProfileId) {
        selectedProfileId.value = props.initialProfileId
      }
    }
  }
)

// ─── Quick Preset Handlers ───
const applyPreset = (preset: 'firstHalf' | 'secondHalf' | 'wholeMonth' | 'toCurrentDay') => {
  const d = new Date(startDate.value || new Date())
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const daysInM = new Date(y, m, 0).getDate()

  if (preset === 'firstHalf') {
    startDate.value = `${y}-${String(m).padStart(2, '0')}-01`
    endDate.value = `${y}-${String(m).padStart(2, '0')}-15`
  } else if (preset === 'secondHalf') {
    startDate.value = `${y}-${String(m).padStart(2, '0')}-16`
    endDate.value = `${y}-${String(m).padStart(2, '0')}-${String(daysInM).padStart(2, '0')}`
  } else if (preset === 'wholeMonth') {
    startDate.value = `${y}-${String(m).padStart(2, '0')}-01`
    endDate.value = `${y}-${String(m).padStart(2, '0')}-${String(daysInM).padStart(2, '0')}`
  } else if (preset === 'toCurrentDay') {
    const now = new Date()
    startDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    endDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`
  }
}

// ─── Generate DTR Handler ───
const handleGenerate = async () => {
  if (!selectedProfileId.value) {
    fetchError.value = 'Please select an employee first.'
    return
  }
  if (!startDate.value || !endDate.value) {
    fetchError.value = 'Please provide both start date and end date.'
    return
  }
  if (startDate.value > endDate.value) {
    fetchError.value = 'Start date cannot be after end date.'
    return
  }

  fetchError.value = null
  isGenerating.value = true

  try {
    // 1. Fetch attendances for selected employee and date range
    let records: AttendanceRecord[] = []
    try {
      records = await attendanceService.getAttendancesByProfileAndDateRange(
        selectedProfileId.value,
        startDate.value,
        endDate.value
      )
    } catch (e) {
      console.warn('API fetch by date range returned error, checking in-memory cache:', e)
    }

    // Fallback to existing loaded attendances if direct query returned empty or failed
    if ((!records || records.length === 0) && props.existingAttendances) {
      records = props.existingAttendances.filter(
        (r) =>
          r.profileId === selectedProfileId.value &&
          r.attendanceDate >= startDate.value &&
          r.attendanceDate <= endDate.value
      )
    }

    // 2. Build DTR Options
    const options: DtrOptions = {
      employee: selectedEmployee.value,
      startDate: startDate.value,
      endDate: endDate.value,
      regularHours: regularHours.value,
      saturdayHours: saturdayHours.value,
      supervisorName: supervisorName.value || 'PGDH',
      supervisorTitle: supervisorTitle.value || '(PESO Manager)',
      duplicateLayout: dualCopy.value,
    }

    // 3. Compute DTR Data
    generatedData.value = generateDtrData(options, records)
    currentStep.value = 'preview'
  } catch (err: any) {
    console.error('Error generating DTR:', err)
    fetchError.value = err.message || 'Failed to generate DTR. Please try again.'
  } finally {
    isGenerating.value = false
  }
}

// ─── Actions in Preview Mode ───
const handlePrint = () => {
  window.print()
}

const handleDownloadHtml = () => {
  if (!generatedData.value) return
  const htmlContent = generateStandaloneDtrHtml(generatedData.value, {
    dualCopy: dualCopy.value,
    rightCopyHasName: rightCopyHasName.value,
  })

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const cleanName = generatedData.value.employeeName.replace(/\s+/g, '_')
  link.download = `DTR_Form48_${cleanName}_${startDate.value}_to_${endDate.value}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleClose = () => {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent
      :class="[
        'transition-all max-h-[92vh] flex flex-col p-0 overflow-hidden',
        currentStep === 'preview' ? 'sm:max-w-5xl max-w-5xl w-full' : 'sm:max-w-xl',
      ]"
    >
      <!-- Dialog Header (Hidden during Print) -->
      <DialogHeader class="p-5 pb-3 border-b bg-muted/20 shrink-0 print:hidden">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText class="h-4 w-4" />
              </span>
              <DialogTitle class="text-lg font-bold text-foreground">
                {{ currentStep === 'preview' ? 'Civil Service Form No. 48 - Preview' : 'Generate Daily Time Record (DTR)' }}
              </DialogTitle>
            </div>
            <DialogDescription class="text-xs text-muted-foreground">
              {{
                currentStep === 'preview'
                  ? 'Official Daily Time Record preview formatted to Civil Service Form No. 48 standards.'
                  : 'Select an employee and date range to produce the authentic Civil Service Form No. 48.'
              }}
            </DialogDescription>
          </div>

          <div v-if="currentStep === 'preview'" class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1.5 text-xs cursor-pointer"
              @click="currentStep = 'config'"
            >
              <ArrowLeft class="h-3.5 w-3.5" />
              <span>Edit Options</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              class="h-8 gap-1.5 text-xs cursor-pointer shadow-xs"
              @click="handlePrint"
            >
              <Printer class="h-3.5 w-3.5" />
              <span>Print DTR</span>
            </Button>
          </div>
        </div>
      </DialogHeader>

      <!-- ─── STEP 1: CONFIGURATION FORM ─── -->
      <div v-if="currentStep === 'config'" class="p-6 overflow-y-auto space-y-5">
        <!-- Error Banner -->
        <div
          v-if="fetchError"
          class="p-3 rounded-lg border bg-destructive/10 border-destructive/20 text-destructive text-xs font-medium flex items-center justify-between"
        >
          <span>{{ fetchError }}</span>
          <button @click="fetchError = null" class="cursor-pointer hover:opacity-70">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- 1. Employee Selector -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-foreground flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <User class="h-3.5 w-3.5 text-primary" />
              Select Employee
            </span>
            <span v-if="selectedEmployee" class="text-[11px] font-normal text-muted-foreground">
              ID: <code class="font-mono">{{ selectedEmployee.id.slice(0, 8) }}</code>
            </span>
          </label>

          <div class="relative">
            <!-- Custom Selected Item Trigger -->
            <div
              class="flex items-center justify-between w-full p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
              @click="isEmployeeDropdownOpen = !isEmployeeDropdownOpen"
            >
              <div v-if="selectedEmployee" class="flex items-center gap-2.5">
                <Avatar class="h-7 w-7 border text-xs">
                  <AvatarFallback class="bg-primary/10 text-primary font-semibold">
                    {{ getInitials(selectedEmployee.fullName) }}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div class="text-xs font-semibold text-foreground leading-none">
                    {{ selectedEmployee.fullName }}
                  </div>
                  <div class="text-[11px] text-muted-foreground capitalize mt-0.5">
                    {{ selectedEmployee.position || 'Employee' }}
                  </div>
                </div>
              </div>
              <div v-else class="text-xs text-muted-foreground">
                {{ isLoadingProfiles ? 'Loading employees...' : 'Choose an employee...' }}
              </div>
              <span class="text-xs text-muted-foreground font-mono">▼</span>
            </div>

            <!-- Dropdown List with Search -->
            <div
              v-if="isEmployeeDropdownOpen"
              class="absolute z-50 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden animate-in fade-in zoom-in-95"
            >
              <div class="p-2 border-b bg-muted/20">
                <div class="relative">
                  <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    v-model="employeeSearch"
                    placeholder="Search by name or position..."
                    class="h-8 pl-8 text-xs bg-background"
                    auto-focus
                  />
                </div>
              </div>

              <div class="max-h-52 overflow-y-auto divide-y divide-border/40">
                <div
                  v-for="p in filteredEmployees"
                  :key="p.id"
                  class="flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer text-xs transition-colors"
                  @click="
                    selectedProfileId = p.id;
                    isEmployeeDropdownOpen = false;
                  "
                >
                  <div class="flex items-center gap-2.5">
                    <Avatar class="h-6 w-6 border text-[10px]">
                      <AvatarFallback class="bg-primary/10 text-primary font-semibold">
                        {{ getInitials(p.fullName) }}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div class="font-medium text-foreground">{{ p.fullName }}</div>
                      <div class="text-[10px] text-muted-foreground capitalize">
                        {{ p.position || 'Employee' }}
                      </div>
                    </div>
                  </div>
                  <Check
                    v-if="selectedProfileId === p.id"
                    class="h-4 w-4 text-primary"
                  />
                </div>
                <div v-if="filteredEmployees.length === 0" class="p-3 text-center text-xs text-muted-foreground">
                  No matching employees found.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Date Range Picker & Presets -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-foreground flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <Calendar class="h-3.5 w-3.5 text-primary" />
              Attendance Date Range
            </span>
            <span class="text-[11px] font-normal text-muted-foreground">
              {{ formatMonthHeader(startDate, endDate) }}
            </span>
          </label>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-[11px] text-muted-foreground mb-1 block">Start Date</span>
              <Input
                type="date"
                v-model="startDate"
                class="h-9 text-xs"
              />
            </div>
            <div>
              <span class="text-[11px] text-muted-foreground mb-1 block">End Date</span>
              <Input
                type="date"
                v-model="endDate"
                class="h-9 text-xs"
              />
            </div>
          </div>

          <!-- Quick Presets -->
          <div class="flex items-center gap-1.5 pt-1 flex-wrap">
            <span class="text-[11px] text-muted-foreground mr-1">Presets:</span>
            <Button
              variant="outline"
              size="sm"
              class="h-6 px-2 text-[10px] cursor-pointer"
              @click="applyPreset('firstHalf')"
            >
              1st Half (1-15)
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-6 px-2 text-[10px] cursor-pointer"
              @click="applyPreset('secondHalf')"
            >
              2nd Half (16-End)
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-6 px-2 text-[10px] cursor-pointer"
              @click="applyPreset('wholeMonth')"
            >
              Full Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-6 px-2 text-[10px] cursor-pointer"
              @click="applyPreset('toCurrentDay')"
            >
              Month to Date
            </Button>
          </div>
        </div>

        <!-- 3. Form 48 Customization Options -->
        <div class="rounded-lg border bg-muted/10 p-3.5 space-y-3">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Settings class="h-3.5 w-3.5 text-muted-foreground" />
            <span>Form 48 Layout & Signatories</span>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span class="text-[11px] text-muted-foreground block mb-1">Regular Days Hours</span>
              <Input
                v-model="regularHours"
                placeholder="Leave blank or e.g. 8:00 AM - 5:00 PM"
                class="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <span class="text-[11px] text-muted-foreground block mb-1">Saturdays Hours</span>
              <Input
                v-model="saturdayHours"
                placeholder="Leave blank or e.g. None"
                class="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span class="text-[11px] text-muted-foreground block mb-1">Supervisor Name</span>
              <Input
                v-model="supervisorName"
                placeholder="PGDH"
                class="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <span class="text-[11px] text-muted-foreground block mb-1">Supervisor Title</span>
              <Input
                v-model="supervisorTitle"
                placeholder="(PESO Manager)"
                class="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div class="pt-2 border-t flex flex-col gap-2">
            <label class="flex items-center gap-2 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                v-model="dualCopy"
                class="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span class="font-medium text-foreground">
                2 Copies Side-by-Side (Civil Service Form 48 Reference Standard)
              </span>
            </label>

            <label
              v-if="dualCopy"
              class="flex items-center gap-2 cursor-pointer text-xs select-none pl-6 text-muted-foreground"
            >
              <input
                type="checkbox"
                v-model="rightCopyHasName"
                class="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Print employee name on right copy too (leave unchecked for blank signature line as in reference)</span>
            </label>
          </div>
        </div>
      </div>

      <!-- STEP 1 FOOTER -->
      <DialogFooter v-if="currentStep === 'config'" class="p-4 border-t bg-muted/10 shrink-0 gap-2">
        <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="handleClose">
          Cancel
        </Button>
        <Button
          size="sm"
          class="text-xs cursor-pointer gap-1.5 font-semibold"
          :disabled="isGenerating || !selectedProfileId"
          @click="handleGenerate"
        >
          <Loader2 v-if="isGenerating" class="h-3.5 w-3.5 animate-spin" />
          <FileText v-else class="h-3.5 w-3.5" />
          <span>{{ isGenerating ? 'Generating DTR...' : 'Generate DTR' }}</span>
        </Button>
      </DialogFooter>

      <!-- ─── STEP 2: GENERATED DTR LIVE PREVIEW & PRINT ─── -->
      <div v-else-if="currentStep === 'preview'" class="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
        <!-- Floating Toolbar -->
        <div class="flex items-center justify-between mb-4 pb-2 border-b print:hidden">
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="font-mono text-xs">
              {{ generatedData?.monthDisplay }}
            </Badge>
            <span class="text-xs text-muted-foreground">
              Total Days: {{ generatedData?.totalDaysInMonth }} | Active Cutoff: Day {{ generatedData?.activeStartDay }} to {{ generatedData?.activeEndDay }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1.5 text-xs cursor-pointer"
              @click="handleDownloadHtml"
            >
              <Download class="h-3.5 w-3.5" />
              <span>Download HTML</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              class="h-8 gap-1.5 text-xs cursor-pointer"
              @click="handlePrint"
            >
              <Printer class="h-3.5 w-3.5" />
              <span>Print DTR</span>
            </Button>
          </div>
        </div>

        <!-- ─── THE 100% FAITHFUL DTR PRINT AREA ─── -->
        <div class="dtr-print-canvas print:m-0 print:p-0">
          <div
            :class="[
              'dtr-page-sheet mx-auto bg-white p-4 shadow-md rounded border print:shadow-none print:border-none print:p-0 print:m-0',
              dualCopy ? 'flex justify-center gap-6' : 'flex justify-center',
            ]"
          >
            <!-- Left Slip -->
            <DtrSlip
              :employee-name="generatedData?.employeeName"
              :month-display="generatedData?.monthDisplay"
              :regular-hours="generatedData?.regularHours"
              :saturday-hours="generatedData?.saturdayHours"
              :supervisor-name="generatedData?.supervisorName"
              :supervisor-title="generatedData?.supervisorTitle"
              :rows="generatedData?.rows"
              :active-end-day="generatedData?.activeEndDay"
              :total-days-in-month="generatedData?.totalDaysInMonth"
              :is-duplicate-blank-name="false"
            />

            <!-- Optional Right Slip (Duplicate 2-in-1 Side by Side) -->
            <DtrSlip
              v-if="dualCopy"
              :employee-name="generatedData?.employeeName"
              :month-display="generatedData?.monthDisplay"
              :regular-hours="generatedData?.regularHours"
              :saturday-hours="generatedData?.saturdayHours"
              :supervisor-name="generatedData?.supervisorName"
              :supervisor-title="generatedData?.supervisorTitle"
              :rows="generatedData?.rows"
              :active-end-day="generatedData?.activeEndDay"
              :total-days-in-month="generatedData?.totalDaysInMonth"
              :is-duplicate-blank-name="!rightCopyHasName"
            />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style>
/* ─── Global Print Styles for Civil Service Form 48 ─── */
@media print {
  @page {
    size: letter portrait;
    margin: 0.25in 0.35in;
  }

  /* Hide everything on the webpage except the DTR print canvas */
  body * {
    visibility: hidden;
  }

  .dtr-print-canvas,
  .dtr-print-canvas * {
    visibility: visible !important;
  }

  .dtr-print-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    margin: 0 !important;
    padding: 0 !important;
    background-color: transparent !important;
  }

  .dtr-page-sheet {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 auto !important;
    max-width: 8in !important;
    background: transparent !important;
  }
}
</style>
