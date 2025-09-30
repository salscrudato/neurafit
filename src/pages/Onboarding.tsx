// src/pages/Onboarding.tsx
import { useEffect, useMemo, useState } from 'react'
import { auth, db } from '../lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Zap,
  Trophy,
  User,
  Dumbbell,
  Weight,
  Zap as ResistanceBand,
  Circle,
  Settings,
  Monitor,
  Bike,
  Waves,
  ArrowUp,
  Cable,
  Circle as Ball,
  Scale,
  Flame,
  Target,
  Heart,
  Sparkles,
  Shield,
  Brain,
  Move
} from 'lucide-react'
import {
  EXPERIENCE_LEVELS,
  GOALS,
  EQUIPMENT,
  SEX_OPTIONS,
  HEIGHT_RANGES,
  WEIGHT_RANGES,
  INJURY_OPTIONS
} from '../config/onboarding'
import { trackProfileComplete } from '../lib/firebase-analytics'

/** ---------------- DATA ---------------- */
type Personal = { sex?: string; height?: string; weight?: string }
type Injuries = { list: string[]; notes: string }
type Profile = {
  experience?: string
  goals?: string[]
  equipment?: string[]
  personal?: Personal
  injuries?: Injuries
}

// Constants are now imported from ../config/onboarding.ts

type Draft = {
  experience: string | null
  goals: string[]
  equipment: string[]
  personal: Personal
  injuries: Injuries
}

const EMPTY_DRAFT: Draft = {
  experience: null,
  goals: [],
  equipment: [],
  personal: { sex: '', height: '', weight: '' },
  injuries: { list: [], notes: '' },
}

/** -------------- VALIDATION -------------- */
function validStep(step: number, d: Draft): boolean {
  switch (step) {
    case 1: return !!d.experience
    case 2: return d.goals.length > 0
    case 3: return d.equipment.length > 0
    case 4: return !!d.personal.sex && !!d.personal.height && !!d.personal.weight
    case 5: return true
    default: return false
  }
}

/** -------------- UI PRIMITIVES -------------- */
function Progress({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div className="w-full mb-8">
      <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
        <span className="font-medium">Step {step} of {total}</span>
        <span className="text-blue-600 font-semibold">{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out rounded-full shadow-sm"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              i < step ? 'bg-blue-500 scale-110' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-6 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
    </div>
  )
}

function SelectCard({
  active, children, onClick, disabled
}: { active?: boolean; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'group relative w-full rounded-2xl border p-5 text-sm transition-all duration-300',
        'text-left shadow-sm hover:shadow-md',
        active
          ? 'border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-[1.02]'
          : 'border-gray-200 bg-white/70 backdrop-blur-sm hover:border-blue-300 hover:bg-white hover:scale-[1.01]',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function MultiGrid({
  items, selected, onToggle, cols = 2, allowNone
}: { items: string[]; selected: string[]; onToggle: (v: string) => void; cols?: 1 | 2; allowNone?: boolean }) {
  return (
    <div className={`grid gap-3 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {items.map((v) => (
        <SelectCard
          key={v}
          active={selected.includes(v)}
          onClick={() => onToggle(v)}
        >
          <div className="text-center font-medium">
            {v}
            {allowNone && v.startsWith('None') && <span className="ml-2 text-xs opacity-70">(clears others)</span>}
          </div>
        </SelectCard>
      ))}
    </div>
  )
}

function PrimaryButton({
  children, onClick, disabled, type = 'button'
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      className={[
        'px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-sm',
        disabled
          ? 'bg-gray-300 text-gray-500 pointer-events-none'
          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      className={[
        'px-5 py-3 rounded-xl border font-medium transition-all duration-300',
        disabled
          ? 'border-gray-200 text-gray-400 pointer-events-none'
          : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:scale-105 active:scale-95',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/** -------------- PAGE -------------- */
export default function Onboarding() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const total = 5
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)

  // Prefill if profile exists (edit-friendly)
  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid
      if (!uid) return setLoading(false)
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) {
          const p = snap.data() as Profile
          setDraft({
            experience: p.experience ?? null,
            goals: p.goals ?? [],
            equipment: p.equipment ?? [],
            personal: {
              sex: p.personal?.sex ?? '',
              height: p.personal?.height ?? '',
              weight: p.personal?.weight ?? '',
            },
            injuries: {
              list: p.injuries?.list ?? [],
              notes: p.injuries?.notes ?? '',
            },
          })
        }
      } catch (error) {
        console.error('Error loading existing profile:', error)
        // Continue with empty draft if loading fails
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const header = useMemo(() => {
    switch (step) {
      case 1: return { title: 'What’s your training level?'}
      case 2: return { title: 'What are you aiming for?'}
      case 3: return { title: 'What do you have access to?'}
      case 4: return { title: 'Tell us about you'}
      case 5: return { title: 'Any injuries or limitations?'}
      default: return { title: '' }
    }
  }, [step])

  const disableNext = !validStep(step, draft)
  const atStart = step === 1
  const atEnd = step === total

  function toggle(list: string[], value: string, allowNone = false) {
    const isNone = value.startsWith('None')
    // If "None" is selected, clear everything else
    if (allowNone && isNone) return ['None (Bodyweight)', 'None'].includes(value) ? [value] : [value]
    // If list already contains "None", remove it before toggling others
    if (allowNone && list.some((v) => v.startsWith('None'))) {
      list = list.filter((v) => !v.startsWith('None'))
    }
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  async function finish() {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          experience: draft.experience,
          goals: draft.goals,
          equipment: draft.equipment,
          personal: draft.personal,
          injuries: draft.injuries,
        },
        { merge: true }
      )

      // Track profile completion
      trackProfileComplete(
        draft.experience || 'Unknown',
        draft.goals,
        draft.equipment
      )

      nav('/dashboard')
    } catch (error) {
      console.error('Error saving profile:', error)
      // You might want to show an error message to the user here
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Allow Enter to go Next only when valid
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !disableNext) {
      e.preventDefault()
      if (!atEnd) setStep((s) => s + 1)
      else finish()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30" onKeyDown={onKeyDown} tabIndex={0}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.05),transparent_50%)]" />



      {/* Content */}
      <div className="relative mx-auto max-w-3xl px-6 pt-12 pb-28">
        <Progress step={step} total={total} />
        <SectionTitle {...header} />

        {/* STEP 1 — EXPERIENCE */}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <SelectCard
                key={level}
                active={draft.experience === level}
                onClick={() => setDraft((d) => ({ ...d, experience: level }))}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-3 rounded-xl transition-all duration-300 ${
                    draft.experience === level
                      ? 'bg-white/20 border border-white/30'
                      : 'bg-blue-50 border border-blue-100'
                  }`}>
                    {level === 'Beginner' && <BookOpen className={`h-6 w-6 ${draft.experience === level ? 'text-white' : 'text-blue-600'}`} />}
                    {level === 'Intermediate' && <Zap className={`h-6 w-6 ${draft.experience === level ? 'text-white' : 'text-blue-600'}`} />}
                    {level === 'Expert' && <Trophy className={`h-6 w-6 ${draft.experience === level ? 'text-white' : 'text-blue-600'}`} />}
                  </div>
                  <div className="text-lg font-bold">{level}</div>
                </div>
                <div className={`text-sm leading-relaxed ${
                  draft.experience === level
                    ? 'text-white/90'
                    : 'text-gray-600 group-hover:text-gray-700'
                }`}>
                  {level === 'Beginner' && 'Perfect for those just starting their fitness journey or returning after a break.'}
                  {level === 'Intermediate' && 'You have consistent training experience and understand basic movement patterns.'}
                  {level === 'Expert' && 'You have years of training experience and advanced knowledge of programming.'}
                </div>
              </SelectCard>
            ))}
          </div>
        )}

        {/* STEP 2 — GOALS */}
        {step === 2 && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {GOALS.map((goal) => (
              <GoalCard
                key={goal}
                goal={goal}
                active={draft.goals.includes(goal)}
                onClick={() => setDraft((d) => ({ ...d, goals: toggle(d.goals, goal) }))}
              />
            ))}
          </div>
        )}

        {/* STEP 3 — EQUIPMENT */}
        {step === 3 && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {EQUIPMENT.map((equipment) => (
              <EquipmentCard
                key={equipment}
                equipment={equipment}
                active={draft.equipment.includes(equipment)}
                onClick={() => setDraft((d) => ({ ...d, equipment: toggle(d.equipment, equipment) }))}
              />
            ))}
          </div>
        )}

        {/* STEP 4 — PERSONAL */}
        {step === 4 && (
          <div className="grid gap-8">
            {/* Sex Options - Single Row */}
            <div>
              <div className="mb-4 text-sm font-semibold text-gray-700 text-center">Gender</div>
              <div className="grid grid-cols-3 gap-4">
                {SEX_OPTIONS.map((s) => (
                  <SelectCard
                    key={s}
                    active={draft.personal.sex === s}
                    onClick={() => setDraft((d) => ({ ...d, personal: { ...d.personal, sex: s } }))}
                  >
                    <div className="text-center font-medium">{s}</div>
                  </SelectCard>
                ))}
              </div>
            </div>

            {/* Height - 2x3 Grid */}
            <div>
              <div className="mb-4 text-sm font-semibold text-gray-700 text-center">Height Range</div>
              <div className="grid grid-cols-3 gap-3">
                {HEIGHT_RANGES.map((h) => (
                  <SelectCard
                    key={h}
                    active={draft.personal.height === h}
                    onClick={() => setDraft((d) => ({ ...d, personal: { ...d.personal, height: h } }))}
                  >
                    <div className="text-center font-medium">{h}</div>
                  </SelectCard>
                ))}
              </div>
            </div>

            {/* Weight - 2x3 Grid */}
            <div>
              <div className="mb-4 text-sm font-semibold text-gray-700 text-center">Weight Range</div>
              <div className="grid grid-cols-3 gap-3">
                {WEIGHT_RANGES.map((w) => (
                  <SelectCard
                    key={w}
                    active={draft.personal.weight === w}
                    onClick={() => setDraft((d) => ({ ...d, personal: { ...d.personal, weight: w } }))}
                  >
                    <div className="text-center font-medium">{w}</div>
                  </SelectCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — INJURIES */}
        {step === 5 && (
          <div className="grid gap-6">
            <div className="mb-2 text-sm font-semibold text-gray-700 text-center">Current Injuries or Limitations</div>
            <MultiGrid
              items={INJURY_OPTIONS}
              selected={draft.injuries.list}
              onToggle={(v) =>
                setDraft((d) => {
                  // If selecting "None", keep only None; else toggle and ensure None is removed
                  if (v === 'None') return { ...d, injuries: { ...d.injuries, list: ['None'] } }
                  const list = d.injuries.list.filter((x) => x !== 'None')
                  const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
                  return { ...d, injuries: { ...d.injuries, list: next } }
                })
              }
              cols={2}
            />
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-700">Additional Notes (optional)</label>
              <textarea
                value={draft.injuries.notes}
                onChange={(e) => setDraft((d) => ({ ...d, injuries: { ...d.injuries, notes: e.target.value } }))}
                placeholder="e.g., mild runner’s knee on right leg; avoid deep flexion"
                className="w-full rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                rows={4}
              />
            </div>
          </div>
        )}
      </div>

      {/* Fixed Footer Nav */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200/50 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <SecondaryButton onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={atStart}>
            Back
          </SecondaryButton>

          <div className="hidden text-xs text-gray-500 sm:block max-w-xs text-center">
            {step === 1 && 'Tip: Be honest about level—your plan adapts.'}
            {step === 2 && 'Tip: Multiple goals are okay; we’ll balance.'}
            {step === 3 && 'Tip: Select all equipment you have access to.'}
            {step === 4 && 'Tip: Ranges personalize without exact numbers.'}
            {step === 5 && 'Tip: Selecting “None” clears other injuries.'}
          </div>

          {!atEnd ? (
            <PrimaryButton onClick={() => setStep((s) => Math.min(total, s + 1))} disabled={disableNext}>
              Next
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={finish} disabled={saving}>
              {saving ? 'Saving…' : 'Finish'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Goal Card Component ---------- */
function GoalCard({
  goal,
  active,
  onClick
}: {
  goal: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative p-3 rounded-2xl border-2 transition-all duration-300 text-center shadow-sm hover:shadow-lg
        ${active
          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 text-white shadow-lg scale-[1.02]'
          : 'bg-white/70 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-white hover:scale-[1.01]'
        }
      `}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className={`transition-transform duration-300 group-hover:scale-110 ${active ? 'text-white' : 'text-blue-600'}`}>
          {getGoalIcon(goal, "h-6 w-6")}
        </div>
        <div className="text-xs font-semibold leading-tight">
          {goal}
        </div>
      </div>
    </button>
  )
}

/* ---------- Equipment Card Component ---------- */
function EquipmentCard({
  equipment,
  active,
  onClick
}: {
  equipment: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative p-3 rounded-2xl border-2 transition-all duration-300 text-center shadow-sm hover:shadow-lg
        ${active
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500 text-white shadow-lg scale-[1.02]'
          : 'bg-white/70 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-white hover:scale-[1.01]'
        }
      `}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className={`transition-transform duration-300 group-hover:scale-110 ${active ? 'text-white' : 'text-emerald-600'}`}>
          {getEquipmentIcon(equipment, "h-6 w-6")}
        </div>
        <div className="text-xs font-semibold leading-tight">
          {equipment}
        </div>
      </div>
    </button>
  )
}

/* ---------- Equipment Icons ---------- */
function getEquipmentIcon(equipment: string, className: string = "h-6 w-6") {
  switch (equipment) {
    case 'Bodyweight':
      return <User className={className} />
    case 'Dumbbells':
      return <Dumbbell className={className} />
    case 'Barbells':
      return <Weight className={className} />
    case 'Resistance Bands':
      return <ResistanceBand className={className} />
    case 'Kettlebells':
      return <Circle className={className} />
    case 'Medicine Balls':
      return <Ball className={className} />
    case 'Weight Machines':
      return <Settings className={className} />
    case 'Treadmill':
      return <Monitor className={className} />
    case 'Stationary Bike':
      return <Bike className={className} />
    case 'Rowing Machine':
      return <Waves className={className} />
    case 'Pull-Up Bar':
      return <ArrowUp className={className} />
    case 'Cable Machine':
      return <Cable className={className} />
    default:
      return <Circle className={className} />
  }
}

/* ---------- Goal Icons ---------- */
function getGoalIcon(goal: string, className: string = "h-6 w-6") {
  switch (goal) {
    case 'Weight Loss':
      return <Scale className={className} />
    case 'Build Muscle':
      return <Flame className={className} />
    case 'Strength':
      return <Dumbbell className={className} />
    case 'Stamina':
      return <Heart className={className} />
    case 'Tone':
      return <Sparkles className={className} />
    case 'General Health':
      return <Shield className={className} />
    case 'Increase Flexibility':
      return <Move className={className} />
    case 'Sports Performance':
      return <Trophy className={className} />
    case 'Mental Health':
      return <Brain className={className} />
    case 'Injury Prevention':
      return <Shield className={className} />
    default:
      return <Target className={className} />
  }
}

