// Advanced chart components for NeuraFit analytics
// Lightweight SVG-based charts with animations and interactions

import { useMemo, useState } from 'react'
import { cn } from '../lib/utils'

export interface ChartDataPoint {
  label: string
  value: number
  date?: Date
  color?: string
}

export interface LineChartProps {
  data: ChartDataPoint[]
  width?: number
  height?: number
  className?: string
  showGrid?: boolean
  showDots?: boolean
  animated?: boolean
  color?: string
  strokeWidth?: number
}

export function LineChart({
  data,
  width = 400,
  height = 200,
  className,
  showGrid = true,
  showDots = true,
  animated = true,
  color = '#3B82F6',
  strokeWidth = 2
}: LineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  const { points } = useMemo(() => {
    if (data.length === 0) return { points: [], maxValue: 0, minValue: 0, xScale: 0, yScale: 0 }

    const values = data.map(d => d.value)
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const range = maxValue - minValue || 1

    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const xScale = chartWidth / Math.max(data.length - 1, 1)
    const yScale = chartHeight / range

    const points = data.map((point, index) => ({
      x: padding + index * xScale,
      y: padding + (maxValue - point.value) * yScale,
      ...point
    }))

    return { points }
  }, [data, width, height])

  const pathD = useMemo(() => {
    if (points.length === 0) return ''
    
    return points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${path} ${command} ${point.x} ${point.y}`
    }, '')
  }, [points])

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={cn('relative', className)}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20">
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = 40 + ratio * (height - 80)
              return (
                <line
                  key={`h-grid-${index}`}
                  x1={40}
                  y1={y}
                  x2={width - 40}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                />
              )
            })}
            
            {/* Vertical grid lines */}
            {points.map((point, index) => (
              <line
                key={`v-grid-${index}`}
                x1={point.x}
                y1={40}
                x2={point.x}
                y2={height - 40}
                stroke="currentColor"
                strokeWidth="1"
                opacity={index % 2 === 0 ? 1 : 0.5}
              />
            ))}
          </g>
        )}

        {/* Area fill */}
        {points.length > 0 && (
          <path
            d={`${pathD} L ${points[points.length - 1].x} ${height - 40} L ${points[0].x} ${height - 40} Z`}
            fill={`url(#${gradientId})`}
            className={animated ? 'animate-scale-in' : ''}
          />
        )}

        {/* Line */}
        {points.length > 0 && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={animated ? 'animate-fade-in-up' : ''}
            style={animated ? { animationDelay: '0.2s' } : {}}
          />
        )}

        {/* Data points */}
        {showDots && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={hoveredPoint === index ? 6 : 4}
            fill={color}
            stroke="white"
            strokeWidth="2"
            className={cn(
              'cursor-pointer transition-all duration-200',
              animated ? 'animate-scale-in' : ''
            )}
            style={animated ? { animationDelay: `${0.3 + index * 0.1}s` } : {}}
            onMouseEnter={() => setHoveredPoint(index)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}

        {/* Tooltip */}
        {hoveredPoint !== null && points[hoveredPoint] && (
          <g>
            <rect
              x={points[hoveredPoint].x - 30}
              y={points[hoveredPoint].y - 35}
              width="60"
              height="25"
              rx="4"
              fill="rgba(0, 0, 0, 0.8)"
              className="animate-scale-in"
            />
            <text
              x={points[hoveredPoint].x}
              y={points[hoveredPoint].y - 18}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="500"
            >
              {points[hoveredPoint].value}
            </text>
          </g>
        )}
      </svg>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10 text-xs text-gray-500">
        {data.map((point, index) => (
          <span key={index} className={index % 2 === 0 ? '' : 'opacity-50'}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export interface BarChartProps {
  data: ChartDataPoint[]
  width?: number
  height?: number
  className?: string
  showValues?: boolean
  animated?: boolean
  color?: string
}

export function BarChart({
  data,
  width = 400,
  height = 200,
  className,
  showValues = true,
  animated = true,
  color = '#3B82F6'
}: BarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  const { bars } = useMemo(() => {
    if (data.length === 0) return { bars: [], maxValue: 0 }

    const maxValue = Math.max(...data.map(d => d.value))
    const padding = 40
    const chartHeight = height - padding * 2
    const barWidth = (width - padding * 2) / data.length * 0.8
    const barSpacing = (width - padding * 2) / data.length * 0.2

    const bars = data.map((point, index) => {
      const barHeight = (point.value / maxValue) * chartHeight
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2
      const y = height - padding - barHeight

      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        ...point
      }
    })

    return { bars }
  }, [data, width, height])

  return (
    <div className={cn('relative', className)}>
      <svg width={width} height={height}>
        {/* Bars */}
        {bars.map((bar, index) => (
          <rect
            key={index}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={bar.color || color}
            rx="4"
            className={cn(
              'cursor-pointer transition-all duration-200',
              hoveredBar === index ? 'opacity-80' : 'opacity-100',
              animated ? 'animate-scale-in' : ''
            )}
            style={animated ? { 
              animationDelay: `${index * 0.1}s`,
              transformOrigin: 'bottom'
            } : {}}
            onMouseEnter={() => setHoveredBar(index)}
            onMouseLeave={() => setHoveredBar(null)}
          />
        ))}

        {/* Values */}
        {showValues && bars.map((bar, index) => (
          <text
            key={index}
            x={bar.x + bar.width / 2}
            y={bar.y - 8}
            textAnchor="middle"
            fill="currentColor"
            fontSize="12"
            fontWeight="500"
            className={cn(
              'opacity-70',
              animated ? 'animate-fade-in-up' : ''
            )}
            style={animated ? { animationDelay: `${0.2 + index * 0.1}s` } : {}}
          >
            {bar.value}
          </text>
        ))}
      </svg>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10 text-xs text-gray-500">
        {data.map((point, index) => (
          <span key={index} className="text-center" style={{ width: `${100 / data.length}%` }}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export interface DonutChartProps {
  data: ChartDataPoint[]
  size?: number
  className?: string
  showLabels?: boolean
  animated?: boolean
  strokeWidth?: number
}

export function DonutChart({
  data,
  size = 200,
  className,
  showLabels = true,
  animated = true,
  strokeWidth = 20
}: DonutChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)

  const { segments, total } = useMemo(() => {
    const total = data.reduce((sum, point) => sum + point.value, 0)
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius

    let currentAngle = -90 // Start from top

    const segments = data.map((point, index) => {
      const percentage = point.value / total
      const angle = percentage * 360
      const strokeDasharray = `${percentage * circumference} ${circumference}`
      const strokeDashoffset = -currentAngle * (circumference / 360)

      const segment = {
        ...point,
        percentage,
        angle,
        strokeDasharray,
        strokeDashoffset,
        color: point.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`
      }

      currentAngle += angle
      return segment
    })

    return { segments, total }
  }, [data, size, strokeWidth])

  const radius = (size - strokeWidth) / 2
  const center = size / 2

  return (
    <div className={cn('relative inline-block', className)}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(0, 0, 0, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Segments */}
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={hoveredSegment === index ? strokeWidth + 4 : strokeWidth}
            strokeDasharray={segment.strokeDasharray}
            strokeDashoffset={segment.strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              'cursor-pointer transition-all duration-300',
              animated ? 'animate-scale-in' : ''
            )}
            style={animated ? { 
              animationDelay: `${index * 0.2}s`,
              transformOrigin: 'center'
            } : {}}
            onMouseEnter={() => setHoveredSegment(index)}
            onMouseLeave={() => setHoveredSegment(null)}
          />
        ))}

        {/* Center text */}
        <text
          x={center}
          y={center - 5}
          textAnchor="middle"
          fill="currentColor"
          fontSize="24"
          fontWeight="bold"
        >
          {total}
        </text>
        <text
          x={center}
          y={center + 15}
          textAnchor="middle"
          fill="currentColor"
          fontSize="12"
          opacity="0.7"
        >
          Total
        </text>
      </svg>

      {/* Legend */}
      {showLabels && (
        <div className="mt-4 space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="flex-1">{segment.label}</span>
              <span className="font-medium">{segment.value}</span>
              <span className="text-gray-500">
                ({Math.round(segment.percentage * 100)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
