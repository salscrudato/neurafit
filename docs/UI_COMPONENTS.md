# UI Components Guide

## Overview

NeuraFit uses Class Variance Authority (CVA) to create reusable, type-safe UI components with consistent styling across the application.

## Card Components

### Basic Card

```typescript
import { Card } from '@/components/ui/Card'

function MyComponent() {
  return (
    <Card variant="glass" padding="lg" hover="lift">
      <h2>Card Title</h2>
      <p>Card content goes here</p>
    </Card>
  )
}
```

**Variants:**
- `default`: White background with shadow
- `glass`: Glassmorphism effect with backdrop blur
- `gradient`: Gradient background with blue/indigo tones
- `elevated`: Higher elevation shadow
- `flat`: Minimal shadow
- `outline`: Transparent with border

**Padding:**
- `none`, `sm`, `md`, `lg`, `xl`

**Hover Effects:**
- `none`: No hover effect
- `lift`: Lifts up on hover
- `glow`: Glowing shadow on hover
- `scale`: Scales up slightly on hover

**Interactive:**
- `true`: Adds cursor pointer and active scale effect
- `false`: No interactive effects

---

### Stat Card

Display statistics with optional icons and trends.

```typescript
import { StatCard } from '@/components/ui/Card'
import { TrendingUp } from 'lucide-react'

function Dashboard() {
  return (
    <StatCard
      label="Total Workouts"
      value={42}
      icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
      trend={{ value: 12, isPositive: true }}
      variant="gradient"
    />
  )
}
```

**Variants:**
- `default`: White background
- `gradient`: Blue gradient
- `success`: Green gradient
- `warning`: Amber gradient
- `info`: Cyan gradient

**Props:**
- `label`: Stat label
- `value`: Stat value (string or number)
- `icon`: Optional icon element
- `trend`: Optional trend data `{ value: number, isPositive: boolean }`

---

### Action Card

Interactive cards for actions or navigation.

```typescript
import { ActionCard } from '@/components/ui/Card'
import { Dumbbell } from 'lucide-react'

function QuickActions() {
  return (
    <ActionCard
      title="Start Workout"
      description="Generate a new AI-powered workout"
      icon={<Dumbbell className="w-6 h-6" />}
      variant="primary"
      onClick={() => navigate('/generate')}
    />
  )
}
```

**Variants:**
- `primary`: Blue gradient
- `secondary`: White with shadow
- `success`: Green gradient
- `danger`: Red gradient

**Props:**
- `title`: Card title
- `description`: Optional description
- `icon`: Optional icon element
- `onClick`: Click handler

---

### Workout Card

Specialized card for workout items.

```typescript
import { WorkoutCard } from '@/components/ui/Card'

function WorkoutList() {
  return (
    <WorkoutCard variant="completed" interactive>
      <h3>Upper Body Strength</h3>
      <p>45 minutes • 8 exercises</p>
    </WorkoutCard>
  )
}
```

**Variants:**
- `default`: White background
- `completed`: Green gradient (for completed workouts)
- `inProgress`: Blue gradient (for active workouts)

---

## Button Components

### Basic Button

```typescript
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

function MyComponent() {
  return (
    <Button
      variant="primary"
      size="lg"
      leftIcon={<Plus className="w-5 h-5" />}
      onClick={handleClick}
    >
      Add Workout
    </Button>
  )
}
```

**Variants:**
- `primary`: Blue gradient
- `secondary`: White with border
- `success`: Green gradient
- `danger`: Red gradient
- `warning`: Amber gradient
- `ghost`: Transparent with hover
- `outline`: Transparent with border

**Sizes:**
- `sm`, `md`, `lg`, `xl`

**Props:**
- `loading`: Shows loading spinner
- `leftIcon`: Icon on the left
- `rightIcon`: Icon on the right
- `fullWidth`: Makes button full width
- `disabled`: Disables the button

---

### Icon Button

Compact button with just an icon.

```typescript
import { IconButton } from '@/components/ui/Button'
import { X } from 'lucide-react'

function CloseButton() {
  return (
    <IconButton
      icon={<X className="w-5 h-5" />}
      variant="ghost"
      size="md"
      aria-label="Close"
      onClick={handleClose}
    />
  )
}
```

**Variants:**
- `primary`: Blue background
- `secondary`: Gray background
- `ghost`: Transparent
- `danger`: Red background

**Sizes:**
- `sm`, `md`, `lg`, `xl`

---

### Button Group

Group multiple buttons together.

```typescript
import { Button, ButtonGroup } from '@/components/ui/Button'

function Actions() {
  return (
    <ButtonGroup orientation="horizontal">
      <Button variant="primary">Save</Button>
      <Button variant="secondary">Cancel</Button>
    </ButtonGroup>
  )
}
```

**Props:**
- `orientation`: `'horizontal'` | `'vertical'`

---

## Usage Examples

### Dashboard Stats Grid

```typescript
import { StatCard } from '@/components/ui/Card'
import { Activity, TrendingUp, Calendar, Zap } from 'lucide-react'

function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Workouts"
        value={stats.total}
        icon={<Activity className="w-6 h-6 text-blue-600" />}
        variant="gradient"
      />
      <StatCard
        label="This Week"
        value={stats.weekly}
        icon={<Calendar className="w-6 h-6 text-green-600" />}
        variant="success"
        trend={{ value: 15, isPositive: true }}
      />
      <StatCard
        label="Consistency"
        value={`${stats.consistency}%`}
        icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
        variant="warning"
      />
      <StatCard
        label="Streak"
        value={`${stats.streak} days`}
        icon={<Zap className="w-6 h-6 text-cyan-600" />}
        variant="info"
      />
    </div>
  )
}
```

### Action Cards Grid

```typescript
import { ActionCard } from '@/components/ui/Card'
import { Dumbbell, History, User } from 'lucide-react'

function QuickActions() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ActionCard
        title="Generate Workout"
        description="Create a new AI-powered workout plan"
        icon={<Dumbbell className="w-6 h-6" />}
        variant="primary"
        onClick={() => navigate('/generate')}
      />
      <ActionCard
        title="View History"
        description="See your past workouts and progress"
        icon={<History className="w-6 h-6" />}
        variant="secondary"
        onClick={() => navigate('/history')}
      />
    </div>
  )
}
```

### Form with Buttons

```typescript
import { Button, ButtonGroup } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Save, X } from 'lucide-react'

function ProfileForm() {
  return (
    <Card variant="glass" padding="lg">
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        
        <ButtonGroup orientation="horizontal">
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save className="w-5 h-5" />}
            loading={isSubmitting}
          >
            Save Changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<X className="w-5 h-5" />}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </ButtonGroup>
      </form>
    </Card>
  )
}
```

## Best Practices

### 1. Use Semantic Variants

```typescript
// ✅ Good - Semantic variant names
<Button variant="danger" onClick={handleDelete}>Delete</Button>

// ❌ Bad - Color-based names
<Button variant="red" onClick={handleDelete}>Delete</Button>
```

### 2. Provide Accessible Labels

```typescript
// ✅ Good - Accessible icon button
<IconButton
  icon={<X />}
  aria-label="Close dialog"
  onClick={handleClose}
/>

// ❌ Bad - Missing aria-label
<IconButton icon={<X />} onClick={handleClose} />
```

### 3. Use Loading States

```typescript
// ✅ Good - Shows loading state
<Button loading={isSubmitting} onClick={handleSubmit}>
  Submit
</Button>

// ❌ Bad - No feedback during async operation
<Button onClick={handleSubmit}>Submit</Button>
```

### 4. Consistent Sizing

```typescript
// ✅ Good - Consistent sizes in a group
<ButtonGroup>
  <Button size="md">Save</Button>
  <Button size="md">Cancel</Button>
</ButtonGroup>

// ❌ Bad - Inconsistent sizes
<ButtonGroup>
  <Button size="lg">Save</Button>
  <Button size="sm">Cancel</Button>
</ButtonGroup>
```

### 5. Appropriate Hover Effects

```typescript
// ✅ Good - Interactive card with hover
<Card hover="lift" interactive onClick={handleClick}>
  Content
</Card>

// ❌ Bad - Non-interactive card with hover
<Card hover="lift">
  Static content
</Card>
```

## Customization

All components accept a `className` prop for additional customization:

```typescript
<Card
  variant="glass"
  className="border-2 border-blue-500"
>
  Custom styled card
</Card>
```

## TypeScript Support

All components are fully typed with TypeScript:

```typescript
import type { ButtonProps, CardProps } from '@/components/ui'

// Type-safe props
const buttonProps: ButtonProps = {
  variant: 'primary',
  size: 'lg',
  children: 'Click me'
}
```

