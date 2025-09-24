// src/pages/Profile.tsx
import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { useNavigate } from 'react-router-dom'
import {
  EXPERIENCE_LEVELS,
  GOALS,
  EQUIPMENT,
  SEX_OPTIONS,
  HEIGHT_RANGES,
  WEIGHT_RANGES,
  INJURY_OPTIONS
} from '../config/onboarding'

/* -------------------- Types & Constants (self-contained) -------------------- */
type Personal = { sex?: string; height?: string; weight?: string }
type Injuries = { list: string[]; notes: string }
type ProfileData = {
  experience?: string
  goals?: string[]
  equipment?: string[]
  personal?: Personal
  injuries?: Injuries
}

// Constants are now imported from ../config/onboarding.ts

/* -------------------- Small UI primitives -------------------- */
function Section({ title, desc, children }: {title:string; desc?:string; children:React.ReactNode}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="font-semibold">{title}</h3>
        {desc && <p className="text-sm text-slate-600">{desc}</p>}
      </div>
      {children}
    </div>
  )
}
function Pill({ active, children, onClick }: {active?:boolean; children:React.ReactNode; onClick:()=>void}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-2 rounded-xl border text-sm transition',
        active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 border-slate-200'
      ].join(' ')}
    >
      {children}
    </button>
  )
}
function GridSelect({
  items, selected, onToggle, twoCol=false
}: {items:string[]; selected:string[]; onToggle:(v:string)=>void; twoCol?:boolean}) {
  return (
    <div className={twoCol ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
      {items.map(v => (
        <Pill key={v} active={selected.includes(v)} onClick={() => onToggle(v)}>{v}</Pill>
      ))}
    </div>
  )
}

/* -------------------- Profile page -------------------- */
export default function Profile() {
  const nav = useNavigate()
  const uid = auth.currentUser?.uid || ''
  const displayId = auth.currentUser?.email || auth.currentUser?.phoneNumber || 'User'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<ProfileData | null>(null)
  const [draft, setDraft] = useState<ProfileData>({
    experience: undefined,
    goals: [],
    equipment: [],
    personal: { sex:'', height:'', weight:'' },
    injuries: { list:[], notes:'' }
  })

  // Load profile
  useEffect(() => {
    (async () => {
      if (!uid) return setLoading(false)
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) {
          const data = snap.data() as ProfileData
          setSaved(data)
          setDraft({
            experience: data.experience ?? undefined,
            goals: data.goals ?? [],
            equipment: data.equipment ?? [],
            personal: {
              sex: data.personal?.sex ?? '',
              height: data.personal?.height ?? '',
              weight: data.personal?.weight ?? '',
            },
            injuries: {
              list: data.injuries?.list ?? [],
              notes: data.injuries?.notes ?? '',
            },
          })
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        // Handle permission errors gracefully
      } finally {
        setLoading(false)
      }
    })()
  }, [uid])

  // Helpers
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved ?? {}), [draft, saved])
  const invalid =
    !draft.experience ||
    !draft.personal?.height ||
    !draft.personal?.weight ||
    (draft.goals?.length ?? 0) === 0 ||
    (draft.equipment?.length ?? 0) === 0

  const toggle = (list: string[] = [], v: string, allowNone = false) => {
    const isNone = v.startsWith('None')
    if (allowNone && isNone) return [v] // clears others
    if (allowNone && list.some(x => x.startsWith('None'))) list = list.filter(x => !x.startsWith('None'))
    return list.includes(v) ? list.filter(x => x !== v) : [...list, v]
  }

  // Actions
  const save = async () => {
    if (!uid || invalid) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'users', uid), draft, { merge: true })
      setSaved(draft)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    if (!saved) return
    setDraft(JSON.parse(JSON.stringify(saved)))
  }

  const logout = async () => {
    try {
      await signOut(auth)
      nav('/')
    } catch (e) {
      console.error('Sign out failed', e)
      alert('Sign out failed. Please try again.')
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 shadow-lg ring-1 ring-white/10" />
          <span className="text-lg font-semibold tracking-tight">Neurafit</span>
        </div>
        <button onClick={() => nav('/dashboard')} className="text-sm text-white/80 hover:text-white">Dashboard</button>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-6 pb-14">
        {/* Identity */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/70">Signed in as</div>
              <div className="text-lg font-semibold">{displayId}</div>
            </div>
            <button
              onClick={logout}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white/90 hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Editable sections */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Section title="Experience" desc="We calibrate volume, intensity, and progressions.">
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map(l => (
                <Pill
                  key={l}
                  active={draft.experience === l}
                  onClick={() => setDraft(d => ({ ...d, experience: l }))}
                >
                  {l}
                </Pill>
              ))}
            </div>
          </Section>

          <Section title="Goals" desc="Pick one or more training goals.">
            <GridSelect
              items={GOALS}
              selected={draft.goals ?? []}
              onToggle={(v) => setDraft(d => ({ ...d, goals: toggle(d.goals, v) }))}
            />
          </Section>

          <Section title="Equipment" desc="Only movements using your equipment are included.">
            <GridSelect
              items={EQUIPMENT}
              selected={draft.equipment ?? []}
              onToggle={(v) => setDraft(d => ({ ...d, equipment: toggle(d.equipment, v, true) }))}
              twoCol
            />
            <p className="mt-2 text-xs text-slate-500">Tip: Selecting “None (Bodyweight)” clears other selections.</p>
          </Section>

          <Section title="Personal" desc="Ranges help personalize while keeping exact numbers private.">
            <div className="mb-3">
              <div className="mb-1 text-xs text-slate-600">Sex</div>
              <div className="flex flex-wrap gap-2">
                {SEX_OPTIONS.map(s => (
                  <Pill
                    key={s}
                    active={draft.personal?.sex === s}
                    onClick={() => setDraft(d => ({ ...d, personal: { ...d.personal, sex: s } }))}
                  >
                    {s}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-xs text-slate-600">Height</div>
                <div className="grid grid-cols-2 gap-2">
                  {HEIGHT_RANGES.map(h => (
                    <Pill
                      key={h}
                      active={draft.personal?.height === h}
                      onClick={() => setDraft(d => ({ ...d, personal: { ...d.personal, height: h } }))}
                    >
                      {h}
                    </Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">Weight</div>
                <div className="grid grid-cols-2 gap-2">
                  {WEIGHT_RANGES.map(w => (
                    <Pill
                      key={w}
                      active={draft.personal?.weight === w}
                      onClick={() => setDraft(d => ({ ...d, personal: { ...d.personal, weight: w } }))}
                    >
                      {w}
                    </Pill>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Injuries" desc="We’ll avoid risky movements and include safe modifications.">
            <GridSelect
              items={INJURY_OPTIONS}
              selected={draft.injuries?.list ?? []}
              onToggle={(v) =>
                setDraft(d => {
                  const currentInjuries = d.injuries || { list: [], notes: '' }
                  if (v === 'None') return { ...d, injuries: { ...currentInjuries, list: ['None'] } }
                  const list = (currentInjuries.list || []).filter(x => x !== 'None')
                  const next = list.includes(v) ? list.filter(x => x !== v) : [...list, v]
                  return { ...d, injuries: { ...currentInjuries, list: next } }
                })
              }
              twoCol
            />
            <textarea
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
              rows={3}
              placeholder="Notes (optional)…"
              value={draft.injuries?.notes ?? ''}
              onChange={(e) => setDraft(d => {
                const currentInjuries = d.injuries || { list: [], notes: '' }
                return { ...d, injuries: { ...currentInjuries, notes: e.target.value } }
              })}
            />
          </Section>
        </div>

        {/* Save bar */}
        <div className="sticky bottom-0 mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {invalid ? (
                <span className="text-amber-300">Complete all required fields to save.</span>
              ) : hasChanges ? (
                <span className="text-emerald-300">Unsaved changes</span>
              ) : (
                <span className="text-white/70">All changes saved</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={reset}
                disabled={!hasChanges}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white/90 hover:bg-white/10 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                onClick={save}
                disabled={invalid || !hasChanges || saving}
                className={[
                  'rounded-xl px-5 py-2 font-semibold',
                  invalid || !hasChanges || saving
                    ? 'bg-emerald-500/40 text-white/80 cursor-not-allowed'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                ].join(' ')}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}