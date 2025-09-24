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
  Circle as Ball
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
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
        <span>Step {step} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SectionTitle({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-widest text-emerald-600">{kicker}</div>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-sm text-slate-600">{desc}</p>}
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
        'group relative w-full rounded-2xl border p-4 text-sm transition',
        'text-left shadow-sm',
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-200 bg-white hover:border-slate-300',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {/* checkmark bubble */}
      <span
        className={[
          'absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]',
          active
            ? 'bg-blue-400 text-white border-blue-400'
            : 'bg-white text-transparent border-slate-200 group-hover:text-slate-300',
        ].join(' ')}
      >
        ✓
      </span>
      {children}
    </button>
  )
}

function MultiGrid({
  items, selected, onToggle, cols = 2, allowNone
}: { items: string[]; selected: string[]; onToggle: (v: string) => void; cols?: 1 | 2; allowNone?: boolean }) {
  return (
    <div className={`grid gap-2 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {items.map((v) => (
        <SelectCard
          key={v}
          active={selected.includes(v)}
          onClick={() => onToggle(v)}
        >
          {v}
          {allowNone && v.startsWith('None') && <span className="ml-2 text-xs text-slate-400">(clears others)</span>}
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
        'px-5 py-2 rounded-lg font-medium',
        disabled
          ? 'bg-blue-600/40 text-white/70 pointer-events-none'
          : 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-600',
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
        'px-4 py-2 rounded-lg border',
        disabled
          ? 'border-slate-200 text-slate-400 pointer-events-none'
          : 'border-slate-200 text-slate-700 hover:bg-slate-50',
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
      case 1: return { kicker: 'Experience', title: 'What’s your training level?', desc: 'We’ll calibrate difficulty and progression automatically.' }
      case 2: return { kicker: 'Goals', title: 'What are you aiming for?', desc: 'Choose one or more goals to shape exercise selection and volume.' }
      case 3: return { kicker: 'Equipment', title: 'What do you have access to?', desc: 'We’ll only include movements you can actually do.' }
      case 4: return { kicker: 'Personal', title: 'Tell us about you', desc: 'Ranges keep things private while enabling personalization.' }
      case 5: return { kicker: 'Injuries', title: 'Any injuries or limitations?', desc: 'We’ll avoid risky movements and include safe alternatives.' }
      default: return { kicker: '', title: '', desc: '' }
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
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50" onKeyDown={onKeyDown} tabIndex={0}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-400 ring-1 ring-black/10" />
            <span className="font-semibold">Neurafit</span>
          </div>
          <span className="text-xs text-slate-500">Onboarding</span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-5 py-6 pb-24">
        <Progress step={step} total={total} />
        <SectionTitle {...header} />

        {/* STEP 1 — EXPERIENCE */}
        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <SelectCard
                key={level}
                active={draft.experience === level}
                onClick={() => setDraft((d) => ({ ...d, experience: level }))}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${draft.experience === level ? 'bg-blue-500' : 'bg-blue-100'}`}>
                    {level === 'Beginner' && <BookOpen className={`h-5 w-5 ${draft.experience === level ? 'text-white' : 'text-blue-600'}`} />}
                    {level === 'Intermediate' && <Zap className={`h-5 w-5 ${draft.experience === level ? 'text-white' : 'text-blue-600'}`} />}
                    {level === 'Expert' && <Trophy className={`h-5 w-5 ${draft.experience === level ? 'text-white' : 'text-blue-600'}`} />}
                  </div>
                  <div className="text-base font-medium">{level}</div>
                </div>
                <div className="text-sm text-white/80 sm:text-slate-600 sm:group-hover:text-slate-700">
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
          <MultiGrid
            items={GOALS}
            selected={draft.goals}
            onToggle={(v) => setDraft((d) => ({ ...d, goals: toggle(d.goals, v) }))}
          />
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
          <div className="grid gap-5">
            {/* Sex Options - Single Row */}
            <div className="grid grid-cols-3 gap-3">
              {SEX_OPTIONS.map((s) => (
                <SelectCard
                  key={s}
                  active={draft.personal.sex === s}
                  onClick={() => setDraft((d) => ({ ...d, personal: { ...d.personal, sex: s } }))}
                >
                  {s}
                </SelectCard>
              ))}
            </div>

            {/* Height - 2x3 Grid */}
            <div>
              <div className="mb-2 text-xs font-medium text-slate-600">Height</div>
              <div className="grid grid-cols-3 gap-2">
                {HEIGHT_RANGES.map((h) => (
                  <SelectCard
                    key={h}
                    active={draft.personal.height === h}
                    onClick={() => setDraft((d) => ({ ...d, personal: { ...d.personal, height: h } }))}
                  >
                    {h}
                  </SelectCard>
                ))}
              </div>
            </div>

            {/* Weight - 2x3 Grid */}
            <div>
              <div className="mb-2 text-xs font-medium text-slate-600">Weight</div>
              <div className="grid grid-cols-3 gap-2">
                {WEIGHT_RANGES.map((w) => (
                  <SelectCard
                    key={w}
                    active={draft.personal.weight === w}
                    onClick={() => setDraft((d) => ({ ...d, personal: { ...d.personal, weight: w } }))}
                  >
                    {w}
                  </SelectCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — INJURIES */}
        {step === 5 && (
          <div className="grid gap-4">
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
              <label className="mb-2 block text-xs font-medium text-slate-600">Notes (optional)</label>
              <textarea
                value={draft.injuries.notes}
                onChange={(e) => setDraft((d) => ({ ...d, injuries: { ...d.injuries, notes: e.target.value } }))}
                placeholder="e.g., mild runner’s knee on right leg; avoid deep flexion"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Fixed Footer Nav */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center justify-between">
          <SecondaryButton onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={atStart}>
            Back
          </SecondaryButton>

          <div className="hidden text-xs text-slate-500 sm:block">
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
        relative p-4 rounded-xl border-2 transition-all duration-200 text-center
        ${active
          ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
        }
      `}
    >
      {active && (
        <div className="absolute -top-2 -right-2 h-6 w-6 bg-blue-400 rounded-full flex items-center justify-center">
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      <div className="flex flex-col items-center space-y-2">
        <div className={`${active ? 'text-white' : 'text-blue-600'}`}>
          {getEquipmentIcon(equipment, "h-8 w-8")}
        </div>
        <div className="text-sm font-medium leading-tight">
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

