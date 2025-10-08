# Dashboard CSS Changes - Technical Reference

## Quick Reference: Before & After

### Background Container
```diff
- className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white to-blue-50/20 relative"
+ className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative"
```

### Background Orbs
```diff
- <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/10 rounded-full blur-3xl animate-pulse-subtle" />
+ <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/40 via-indigo-100/25 to-purple-100/15 rounded-full blur-3xl animate-pulse-subtle" />

- <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/25 via-gray-100/15 to-blue-100/10 rounded-full blur-3xl" />
+ <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-slate-100/30 via-gray-100/20 to-blue-100/15 rounded-full blur-3xl" />

- <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-50/20 via-transparent to-transparent rounded-full blur-2xl" />
+ <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-radial from-indigo-50/30 via-transparent to-transparent rounded-full blur-2xl" />
```

---

## Hero Section

### Container
```diff
- <section className="relative mx-auto max-w-6xl px-3 sm:px-4 pt-4 sm:pt-6 animate-stagger-1">
+ <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8 animate-stagger-1">

- <div className="group relative rounded-2xl border border-white/70 bg-tint-blue backdrop-blur-xl p-4 sm:p-6 overflow-hidden shadow-depth-lg hover:shadow-depth-lg transition-all duration-300 border-inner">
+ <div className="group relative rounded-3xl border border-white/80 bg-gradient-to-br from-white/95 via-blue-50/30 to-indigo-50/20 backdrop-blur-xl p-6 sm:p-8 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 ease-out">
```

### Background Elements
```diff
- <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-purple-400/5 opacity-60 blur-2xl" />
+ <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-purple-400/10 opacity-70 blur-3xl group-hover:opacity-90 transition-opacity duration-500" />
+ <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-300/15 via-blue-300/10 to-transparent opacity-60 blur-2xl" />

- <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-white/20 pointer-events-none" />
+ <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 via-white/20 to-transparent pointer-events-none" />
+ <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/60 pointer-events-none" />
```

### Typography
```diff
- <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight mb-2">
+ <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight mb-3 drop-shadow-sm">

- <p className="text-slate-600/90 text-sm sm:text-base leading-relaxed font-medium">
+ <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-medium max-w-2xl">
```

### Pro Badge
```diff
- <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-md flex-shrink-0">
-   <Crown className="w-4 h-4 text-amber-900" />
-   <span className="text-xs font-bold text-amber-900">Pro</span>
+ <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-lg shadow-amber-500/30 flex-shrink-0 ring-2 ring-amber-300/50 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105">
+   <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-900 drop-shadow-sm" />
+   <span className="text-sm sm:text-base font-bold text-amber-900 tracking-wide">Pro</span>
```

---

## Motivational Banner

### Container
```diff
- <section className="relative mx-auto max-w-6xl px-3 sm:px-4 mt-4 sm:mt-5 animate-stagger-2">
+ <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-6 sm:mt-8 animate-stagger-2">

- <div className="h-28 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-2xl shadow-depth-md backdrop-blur-xl border border-white/70 animate-pulse" />
+ <div className="h-32 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-3xl shadow-lg backdrop-blur-xl border border-white/80 animate-pulse" />
```

### Banner Component
```diff
- <div className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${motivation.bgColor} border border-white/70 shadow-depth-xl hover:shadow-depth-xl transition-all duration-500 hover:scale-[1.003] hover:-translate-y-1 border-inner`}>
+ <div className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${motivation.bgColor} border border-white/80 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.002] hover:-translate-y-1`}>

- <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/25 blur-3xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-700" />
+ <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/30 blur-3xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-700" />

- <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-white/15 blur-2xl group-hover:blur-3xl transition-all duration-700" />
+ <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-white/20 blur-2xl group-hover:blur-3xl transition-all duration-700" />

+ <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/60 pointer-events-none" />
```

### Icon Container
```diff
- <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${motivation.color} flex items-center justify-center shadow-depth-lg shadow-current/30 group-hover:shadow-current/50 group-hover:scale-110 transition-all duration-500`}>
-   <Icon className="h-9 w-9 sm:h-10 sm:w-10 text-white" />
+ <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br ${motivation.color} flex items-center justify-center shadow-xl shadow-current/40 group-hover:shadow-2xl group-hover:shadow-current/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-2 ring-white/50`}>
+   <Icon className="h-10 w-10 sm:h-11 sm:w-11 text-white drop-shadow-lg" />
```

### Typography
```diff
- <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300 leading-tight tracking-tight">
+ <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 group-hover:text-slate-800 transition-colors duration-300 leading-tight tracking-tight drop-shadow-sm">

- <p className="text-gray-700/90 text-base sm:text-lg lg:text-xl leading-relaxed font-medium max-w-2xl">
+ <p className="text-slate-700 text-base sm:text-lg lg:text-xl leading-relaxed font-semibold max-w-2xl">
```

---

## Quick Actions

### Section
```diff
- <section className="relative mx-auto max-w-6xl px-3 sm:px-4 mt-6 sm:mt-8 animate-stagger-3">
+ <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-8 sm:mt-10 animate-stagger-3">

- <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4 tracking-tight">
+ <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5 sm:mb-6 tracking-tight">

- <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
+ <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
```

### Card Container
```diff
- <Card variant="elevated" rounded="2xl" className="relative p-5 sm:p-6 border border-white/70 bg-tint-blue backdrop-blur-xl shadow-depth-md hover:shadow-blue-depth transition-all duration-300 active:scale-[0.98] border-inner">
+ <Card variant="elevated" rounded="2xl" className="relative p-6 sm:p-7 border border-white/80 bg-gradient-to-br from-white/95 via-blue-50/30 to-indigo-50/20 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-500 active:scale-[0.98] overflow-hidden group-hover:-translate-y-1">

+ <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
```

### Icon Container
```diff
- <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
-   <Zap className="h-7 w-7 sm:h-8 sm:w-8" />
+ <div className="flex-shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
+   <Zap className="h-8 w-8 sm:h-9 sm:w-9 drop-shadow-sm" />
```

### Typography
```diff
- <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5 leading-tight">
+ <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 leading-tight tracking-tight">

- <p className="text-slate-600/90 text-sm sm:text-base leading-snug">
+ <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
```

### Button
```diff
- <Button size="sm" className="haptic-feedback flex-shrink-0" onClick={() => nav('/generate')}>
+ <Button size="sm" className="haptic-feedback flex-shrink-0 shadow-md hover:shadow-lg" onClick={() => nav('/generate')}>
```

---

## Profile Settings

### Container
```diff
- <section className="relative mx-auto max-w-6xl px-3 sm:px-4 mt-6 sm:mt-8 animate-stagger-4">
+ <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-8 sm:mt-10 animate-stagger-4">

- <div className="relative bg-tint-slate backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-white/70 shadow-depth-md hover:shadow-depth-lg transition-all duration-300 active:scale-[0.98] border-inner">
+ <div className="relative bg-gradient-to-br from-white/95 via-slate-50/30 to-gray-50/20 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-white/80 shadow-lg hover:shadow-xl transition-all duration-500 active:scale-[0.98] overflow-hidden hover:-translate-y-1">

+ <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
+ <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 via-white/10 to-transparent pointer-events-none" />
```

### Icon & Typography
Same pattern as Quick Actions cards for consistency.

---

## Subscription Status

```diff
- <section className="relative mx-auto max-w-6xl px-3 sm:px-4 mt-6 sm:mt-8 mb-8 sm:mb-12 animate-stagger-5">
+ <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-8 sm:mt-10 mb-12 sm:mb-16 animate-stagger-5">
```

---

## Error Toast

```diff
- <div className="fixed bottom-6 right-6 bg-gradient-to-r from-red-50 to-red-100/90 border border-red-200/60 text-red-800 px-6 py-4 rounded-2xl shadow-2xl shadow-red-200/40 backdrop-blur-xl max-w-sm animate-in slide-in-from-right-5 fade-in duration-500">
+ <div className="fixed bottom-8 right-8 bg-gradient-to-r from-red-50 to-red-100/95 border border-red-200/70 text-red-800 px-6 py-5 rounded-2xl shadow-2xl shadow-red-200/50 backdrop-blur-xl max-w-sm animate-in slide-in-from-right-5 fade-in duration-500 ring-1 ring-red-300/30">

- <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0 mt-0.5">
+ <div className="w-6 h-6 rounded-full bg-red-500 flex-shrink-0 mt-0.5 shadow-lg shadow-red-500/40">

- <p className="text-sm font-medium leading-relaxed">{error}</p>
+ <p className="text-sm font-semibold leading-relaxed">{error}</p>
```

---

## Key Patterns

### Spacing Increases
- Container padding: `px-3 sm:px-4` → `px-4 sm:px-6`
- Section padding: `pt-4 sm:pt-6` → `pt-6 sm:pt-8`
- Card padding: `p-4 sm:p-6` → `p-6 sm:p-8`
- Margins: `mt-4 sm:mt-5` → `mt-6 sm:mt-8`

### Border Enhancements
- Opacity: `border-white/70` → `border-white/80`
- Added: `ring-1 ring-inset ring-white/60` for depth

### Shadow Upgrades
- `shadow-depth-md` → `shadow-lg`
- `shadow-depth-lg` → `shadow-xl`
- `shadow-depth-xl` → `shadow-2xl`
- Added colored shadows: `shadow-{color}-500/30`

### Rounded Corners
- `rounded-2xl` → `rounded-3xl` (main containers)
- `rounded-xl` → `rounded-2xl` (icons)

### Typography
- Heading sizes: +1 size tier (e.g., `text-2xl` → `text-3xl`)
- Font weights: `font-bold` → `font-extrabold`
- Added: `drop-shadow-sm` for depth
- Body text: `text-slate-600/90` → `text-slate-600`

### Transitions
- Duration: `duration-300` → `duration-500`
- Added: `ease-out` for smoother feel

### Hover Effects
- Added: `group-hover:scale-110 group-hover:rotate-3`
- Added: Subtle background accents on hover
- Enhanced: Shadow transitions

---

## Summary

All changes follow a consistent pattern:
1. **More space**: Increased padding and margins
2. **Better depth**: Enhanced shadows and gradients
3. **Smoother interactions**: Longer transitions
4. **Premium feel**: Refined typography and effects
5. **Consistent design**: Same patterns across all components

