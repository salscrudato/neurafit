// src/pages/TestWorkout.tsx
// TestWorkout page removed React import as it's not needed
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import WorkoutTestValidator from '../components/WorkoutTestValidator'

export default function TestWorkout() {
  const nav = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <AppHeader />
      
      <main className="relative max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => nav('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        <WorkoutTestValidator />
      </main>
    </div>
  )
}
