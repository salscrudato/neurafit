# NeuraFit UI Components

Reusable UI primitives that form the foundation of the NeuraFit design system.

## Philosophy

These components are:
- **Primitive**: Low-level building blocks, not feature-specific
- **Reusable**: Used across multiple pages and features
- **Accessible**: WCAG AA compliant with proper ARIA labels
- **Performant**: Memoized and optimized for minimal re-renders
- **Consistent**: Follow the NeuraFit design language

## Usage

### Recommended Import Pattern

```tsx
// Import from the ui directory
import { Button, Card } from '@/ui'

// Or import specific components
import { Button } from '@/ui/Button'
import { Card, CardHeader, CardContent } from '@/ui/Card'
```

### Legacy Import Pattern (Deprecated)

```tsx
// Still works for backward compatibility
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
```

## Components

### Button

Comprehensive button component with multiple variants and features.

**Variants:**
- `primary` - Main call-to-action (gradient blue)
- `secondary` - Secondary actions (white with border)
- `success` - Success actions (gradient green)
- `danger` - Destructive actions (gradient red)
- `warning` - Warning actions (gradient amber)
- `ghost` - Minimal style (transparent)
- `outline` - Outlined style (blue border)

**Sizes:**
- `sm` - Small (36px min height)
- `md` - Medium (44px min height) - Default
- `lg` - Large (52px min height)
- `xl` - Extra large (60px min height)

**Features:**
- Loading state with spinner
- Left/right icon support
- Full width option
- Disabled state
- Keyboard navigation
- Touch-friendly (44px minimum)

**Example:**

```tsx
import { Button } from '@/ui'

function MyComponent() {
  return (
    <>
      <Button variant="primary" size="md">
        Generate Workout
      </Button>
      
      <Button 
        variant="secondary" 
        loading={isLoading}
        leftIcon={<Icon />}
      >
        Save
      </Button>
      
      <Button variant="danger" fullWidth>
        Delete Account
      </Button>
    </>
  )
}
```

### IconButton

Compact button for icon-only actions.

**Example:**

```tsx
import { IconButton } from '@/ui'
import { X } from 'lucide-react'

function MyComponent() {
  return (
    <IconButton
      icon={<X />}
      variant="ghost"
      size="md"
      aria-label="Close"
      onClick={handleClose}
    />
  )
}
```

### ButtonGroup

Groups multiple buttons together.

**Example:**

```tsx
import { ButtonGroup, Button } from '@/ui'

function MyComponent() {
  return (
    <ButtonGroup orientation="horizontal">
      <Button variant="outline">Cancel</Button>
      <Button variant="primary">Save</Button>
    </ButtonGroup>
  )
}
```

### Card

Flexible card component with multiple variants and sub-components.

**Variants:**
- `default` - Standard white card with shadow
- `glass` - Glassmorphism effect with backdrop blur
- `gradient` - Subtle gradient background
- `elevated` - Enhanced shadow for emphasis
- `flat` - Minimal shadow
- `outline` - Border only, no background

**Padding:**
- `none` - No padding
- `sm` - Small (12-16px)
- `md` - Medium (16-20px) - Default
- `lg` - Large (20-24px)
- `xl` - Extra large (24-32px)

**Hover Effects:**
- `none` - No hover effect - Default
- `lift` - Lifts up on hover
- `glow` - Adds glow effect
- `scale` - Scales up slightly

**Features:**
- Interactive mode with keyboard support
- Rounded corners (customizable)
- Sub-components for structure
- Responsive padding

**Example:**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/ui'

function MyComponent() {
  return (
    <Card variant="glass" padding="lg" hover="lift">
      <CardHeader>
        <CardTitle>Workout Complete</CardTitle>
        <CardDescription>
          Great job! You completed 12 exercises.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <p>Your stats for today...</p>
      </CardContent>
      
      <CardFooter>
        <Button>View Details</Button>
      </CardFooter>
    </Card>
  )
}
```

## Design Tokens

### Colors

The components use the following color system:

- **Primary**: Blue (#3B82F6) to Indigo (#4F46E5)
- **Success**: Green (#22C55E) to Emerald (#10B981)
- **Danger**: Red (#EF4444) to Rose (#F43F5E)
- **Warning**: Amber (#F59E0B) to Orange (#F97316)

### Spacing

- **Touch targets**: Minimum 44px for mobile accessibility
- **Padding scale**: 12px, 16px, 20px, 24px, 32px
- **Border radius**: 12px (rounded-xl), 16px (rounded-2xl)

### Shadows

- **sm**: Subtle shadow for cards
- **md**: Standard shadow for elevated elements
- **lg**: Enhanced shadow for emphasis
- **xl**: Maximum shadow for modals/overlays

## Accessibility

All components follow WCAG AA standards:

- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ ARIA labels and roles
- ✅ Color contrast ratios
- ✅ Touch-friendly targets (44px minimum)
- ✅ Screen reader support

## Performance

Components are optimized for performance:

- ✅ Memoized with `React.memo`
- ✅ Proper dependency arrays
- ✅ Minimal re-renders
- ✅ Tree-shakeable exports
- ✅ No unnecessary prop spreading

## Adding New Components

When adding new UI primitives to this directory:

1. **Follow the existing patterns**: Use CVA for variants, forwardRef for refs, memo for performance
2. **Add TypeScript types**: Export all prop types
3. **Document thoroughly**: Add JSDoc comments
4. **Test accessibility**: Verify keyboard navigation and screen readers
5. **Update index.ts**: Add exports to the centralized file
6. **Update this README**: Document the new component

## Related

- **Feature Components**: See `src/components/` for page-specific components
- **Hooks**: See `src/hooks/` for reusable logic
- **Utils**: See `src/lib/utils.ts` for the `cn()` utility
- **Constants**: See `src/constants/` for design tokens

---

**Maintained by:** NeuraFit Team  
**Last Updated:** 2025-10-09

