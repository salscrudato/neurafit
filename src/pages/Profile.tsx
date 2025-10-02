// src/pages/Profile.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'

import { auth, db } from '../lib/firebase'

import {
  EXPERIENCE_LEVELS,
  GOALS,
  EQUIPMENT,
  SEX_OPTIONS,
  HEIGHT_RANGES,
  WEIGHT_RANGES,
  INJURY_OPTIONS
} from '../config/onboarding'
import AppHeader from '../components/AppHeader'
import { LoadingSpinner } from '../components/Loading'

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



/* -------------------- Small UI primitives -------------------- */
function Section({ title, desc, children }: {title:string; desc?:string; children:React.ReactNode}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {desc && <p className="text-sm text-gray-600">{desc}</p>}
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
        'px-3 py-2 rounded-xl border text-sm transition-all duration-200',
        active ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-500 shadow-md scale-[1.02]' : 'bg-white/70 hover:bg-white border-gray-200 hover:border-blue-300 text-gray-700 hover:scale-[1.01]'
      ].join(' ')}
    >
      {children}
    </button>
  )
}
function GridSelect({
  items, selected, onToggle, twoCol=false
}: {items:string[]; selected:string[]; onToggle:(_v:string)=>void; twoCol?:boolean}) {
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



  if (loading) {
    return <LoadingSpinner fullScreen text="Loading profile..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Body */}
      <main className="relative mx-auto max-w-4xl px-6 pb-14 pt-6">
        {/* Identity */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-5 shadow-sm">
          <div>
            <div className="text-sm text-gray-500">Signed in as</div>
            <div className="text-lg font-semibold text-gray-900">{displayId}</div>
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
            <div className="grid gap-6">
              {/* Sex Options */}
              <div>
                <div className="mb-3 text-sm font-semibold text-gray-700">Gender</div>
                <div className="grid grid-cols-3 gap-3">
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

              {/* Height Range */}
              <div>
                <div className="mb-3 text-sm font-semibold text-gray-700">Height Range</div>
                <div className="grid grid-cols-3 gap-3">
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

              {/* Weight Range */}
              <div>
                <div className="mb-3 text-sm font-semibold text-gray-700">Weight Range</div>
                <div className="grid grid-cols-3 gap-3">
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