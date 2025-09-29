// src/components/PlateCalculator.tsx
import { useMemo } from 'react'
import { Calculator, Info } from 'lucide-react'

interface PlateCalculatorProps {
  targetWeight: number
  barbellWeight?: number
  availablePlates?: number[]
  onWeightChange?: (weight: number) => void
}

interface PlateConfiguration {
  plates: { weight: number; count: number }[]
  totalWeight: number
  isExact: boolean
}

export function PlateCalculator({
  targetWeight,
  barbellWeight = 45,
  availablePlates = [45, 35, 25, 10, 5, 2.5],
  onWeightChange
}: PlateCalculatorProps) {
  const plateConfiguration = useMemo(() => {
    const weightToLoad = Math.max(0, targetWeight - barbellWeight)
    const weightPerSide = weightToLoad / 2

    if (weightPerSide <= 0) {
      return {
        plates: [],
        totalWeight: barbellWeight,
        isExact: targetWeight === barbellWeight
      }
    }

    // Calculate optimal plate combination
    const plates: { weight: number; count: number }[] = []
    let remainingWeight = weightPerSide
    
    // Sort plates in descending order
    const sortedPlates = [...availablePlates].sort((a, b) => b - a)
    
    for (const plateWeight of sortedPlates) {
      if (remainingWeight >= plateWeight) {
        const count = Math.floor(remainingWeight / plateWeight)
        if (count > 0) {
          plates.push({ weight: plateWeight, count })
          remainingWeight = Math.round((remainingWeight - (plateWeight * count)) * 4) / 4 // Round to nearest 0.25
        }
      }
    }

    const actualWeightPerSide = plates.reduce((sum, p) => sum + (p.weight * p.count), 0)
    const totalWeight = barbellWeight + (actualWeightPerSide * 2)
    const isExact = Math.abs(totalWeight - targetWeight) < 0.1

    return {
      plates,
      totalWeight,
      isExact
    }
  }, [targetWeight, barbellWeight, availablePlates])

  const handlePlateClick = (plateWeight: number, increment: boolean) => {
    const currentPlate = plateConfiguration.plates.find(p => p.weight === plateWeight)
    const currentCount = currentPlate?.count || 0
    const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1)
    
    // Calculate new total weight
    const otherPlatesWeight = plateConfiguration.plates
      .filter(p => p.weight !== plateWeight)
      .reduce((sum, p) => sum + (p.weight * p.count), 0)
    
    const newWeightPerSide = otherPlatesWeight + (plateWeight * newCount)
    const newTotalWeight = barbellWeight + (newWeightPerSide * 2)
    
    onWeightChange?.(newTotalWeight)
  }

  if (targetWeight <= 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-gray-900">Plate Calculator</span>
        </div>
        <p className="text-sm text-gray-600">Enter a weight to see plate configuration</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-gray-900">Plate Calculator</span>
        </div>
        {!plateConfiguration.isExact && (
          <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
            <Info className="h-3 w-3" />
            Closest match
          </div>
        )}
      </div>

      {/* Target vs Actual Weight */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{targetWeight} lbs</div>
          <div className="text-xs text-gray-600">Target</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${
            plateConfiguration.isExact ? 'text-green-600' : 'text-orange-600'
          }`}>
            {plateConfiguration.totalWeight} lbs
          </div>
          <div className="text-xs text-gray-600">Actual</div>
        </div>
      </div>

      {/* Barbell Visualization */}
      <div className="mb-4">
        <div className="text-xs text-gray-600 mb-2 text-center">
          {barbellWeight}lb barbell + plates on each side
        </div>
        
        {/* Visual representation */}
        <div className="flex items-center justify-center gap-1 p-4 bg-gray-50 rounded-xl">
          {/* Left side plates */}
          <div className="flex items-center gap-0.5">
            {plateConfiguration.plates.map((plate, index) => (
              <div key={`left-${index}`} className="flex gap-0.5">
                {Array.from({ length: plate.count }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 rounded-sm ${getPlateColor(plate.weight)}`}
                    style={{ height: getPlateHeight(plate.weight) }}
                    title={`${plate.weight} lbs`}
                  />
                ))}
              </div>
            ))}
          </div>
          
          {/* Barbell */}
          <div className="h-2 w-16 bg-gray-400 rounded-full mx-2" />
          
          {/* Right side plates (mirror) */}
          <div className="flex items-center gap-0.5">
            {plateConfiguration.plates.map((plate, index) => (
              <div key={`right-${index}`} className="flex gap-0.5">
                {Array.from({ length: plate.count }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 rounded-sm ${getPlateColor(plate.weight)}`}
                    style={{ height: getPlateHeight(plate.weight) }}
                    title={`${plate.weight} lbs`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plate Breakdown */}
      {plateConfiguration.plates.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-900 mb-2">Per Side:</div>
          <div className="space-y-2">
            {plateConfiguration.plates.map((plate, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-6 rounded-sm ${getPlateColor(plate.weight)}`}
                  />
                  <span className="text-sm font-medium">{plate.weight} lbs</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlateClick(plate.weight, false)}
                    className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold transition-colors"
                    disabled={!onWeightChange}
                  >
                    −
                  </button>
                  <span className="text-sm font-bold w-8 text-center">
                    {plate.count}×
                  </span>
                  <button
                    onClick={() => handlePlateClick(plate.weight, true)}
                    className="w-6 h-6 rounded-full bg-green-100 hover:bg-green-200 text-green-600 text-xs font-bold transition-colors"
                    disabled={!onWeightChange}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Plate Additions */}
      {onWeightChange && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-900 mb-2">Quick Add:</div>
          <div className="grid grid-cols-3 gap-2">
            {[2.5, 5, 10].map(weight => (
              <button
                key={weight}
                onClick={() => onWeightChange(plateConfiguration.totalWeight + (weight * 2))}
                className="px-3 py-2 text-sm font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
              >
                +{weight * 2} lbs
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getPlateColor(weight: number): string {
  const colorMap: Record<number, string> = {
    45: 'bg-blue-500 h-8',
    35: 'bg-yellow-500 h-7',
    25: 'bg-green-500 h-6',
    10: 'bg-gray-500 h-5',
    5: 'bg-red-500 h-4',
    2.5: 'bg-purple-500 h-3'
  }
  return colorMap[weight] || 'bg-gray-400 h-4'
}

function getPlateHeight(weight: number): string {
  const heightMap: Record<number, string> = {
    45: '32px',
    35: '28px',
    25: '24px',
    10: '20px',
    5: '16px',
    2.5: '12px'
  }
  return heightMap[weight] || '16px'
}
