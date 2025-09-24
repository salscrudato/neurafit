import { useEffect, useState } from 'react'
import { auth, db } from '../lib/firebase'
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'

export default function History() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('Not authenticated')
          return
        }

        const q = query(collection(db, 'users', uid, 'workouts'), orderBy('timestamp', 'desc'))
        const snap = await getDocs(q)
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err: any) {
        console.error('Error fetching workout history:', err)
        setError(err.message || 'Failed to load workout history')
      } finally {
        setLoading(false)
      }
    })()
  }, [])
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2">History</h2>
        <div className="text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 max-w-md mx-auto space-y-3">
      <h2 className="text-xl font-semibold mb-2">History</h2>
      {items.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No workouts yet. Complete your first workout to see it here!
        </div>
      ) : (
        items.map(it => (
          <div key={it.id} className="border rounded p-3">
            <div className="font-medium">{it.workoutType} • {it.duration} min</div>
            {it.timestamp && (
              <div className="text-sm text-gray-500 mt-1">
                {new Date(it.timestamp.toDate()).toLocaleDateString()}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}