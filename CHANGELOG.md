# Changelog

All notable changes to NeuraFit will be documented in this file.

## [Unreleased]

### Added - Adaptive Personalization Feature

#### Real-time Difficulty Tuning
- **Workout Feedback System**: After completing a workout, users can now rate the difficulty as "Too Easy", "Just Right", or "Too Hard"
- **Optional RPE Scale**: Users can provide a Rate of Perceived Exertion (1-10) for more granular feedback
- **Adaptive Intensity Scaling**: The AI automatically adjusts future workout difficulty based on user feedback and completion rates
- **Smart Calibration**: Intensity adjustments are clamped to safe bounds (0.6x to 1.4x baseline) with modest incremental changes

#### Intelligent Workout Generation
- **Personalized Intensity**: Workouts are generated with targetIntensity based on recent feedback and performance
- **Progressive Overload**: "Just Right" feedback triggers small progressive increases (2%) to maintain challenge
- **Completion Rate Analysis**: Low completion rates (<60%) bias difficulty downward, high rates (>90%) bias upward
- **AI Prompt Enhancement**: Training adjustment block in AI prompts ensures intensity calibration respects injuries and equipment constraints

#### User Experience Enhancements
- **Intensity Indicators**: Visual badges show when workouts are calibrated above or below baseline
- **Progression Notes**: Clear explanations of why difficulty was adjusted (e.g., "user rated last workout too easy; increase difficulty ~10% safely")
- **Transparent Feedback**: Users see immediate confirmation when feedback is submitted and how it will affect future workouts

#### Technical Implementation
- **Backend Personalization Engine**: New `functions/src/lib/personalization.ts` with adaptive state management
- **Firestore Integration**: User adaptive states stored in `users/{uid}/personalization/adaptive` documents
- **Feature Flags**: Configurable feature toggles for gradual rollout and A/B testing
- **Comprehensive Telemetry**: Privacy-respecting analytics for feedback submission, state updates, and workout generation
- **Extensive Testing**: Unit tests for scalar computation logic and integration tests for end-to-end workflows

#### Safety & Guardrails
- **Bounded Adjustments**: Difficulty changes are clamped to prevent unsafe jumps (max 15% between sessions)
- **Injury Respect**: Adaptive scaling never violates user injury constraints or equipment limitations
- **Rate Limiting**: One adaptive update per completed workout to prevent gaming
- **Graceful Degradation**: System falls back to baseline difficulty (1.0x) if personalization fails

#### Data Model
```typescript
type AdaptiveState = {
  difficultyScalar: number // 0.6-1.4, where 1.0 is baseline
  lastFeedback: 'easy' | 'right' | 'hard' | null
  lastUpdatedAt: Timestamp
  recentCompletionRate?: number // 0-1 over last 5 workouts
}
```

#### User Journey
1. Complete workout → Rate difficulty → System updates adaptive state
2. Generate next workout → AI receives targetIntensity and progression note
3. Preview workout → See intensity calibration badge if adjusted
4. Repeat cycle with continuous personalization refinement

### Technical Details
- **Files Added**: 
  - `functions/src/lib/personalization.ts` - Core adaptive logic
  - `functions/src/lib/personalization.test.ts` - Comprehensive unit tests
  - `src/config/features.ts` - Feature flag system
  - `src/lib/telemetry.ts` - Privacy-respecting analytics
- **Files Modified**: 
  - `functions/src/index.ts` - Enhanced generateWorkout endpoint
  - `src/pages/workout/Complete.tsx` - Added feedback UI
  - `src/pages/Generate.tsx` - Integrated adaptive intensity
  - `src/pages/workout/Preview.tsx` - Added calibration indicators
  - `src/components/WorkoutTestValidator.tsx` - Extended test coverage

### Backward Compatibility
- **Fully backward compatible** - existing users default to 1.0x intensity
- **No breaking changes** to existing workout data structures
- **Graceful handling** of users who never provide feedback
- **Feature flags** allow gradual rollout and easy rollback if needed

### Performance Impact
- **Minimal**: ≤2 additional Firestore reads + 1 write per workout completion
- **Cost Efficient**: No extra OpenAI calls - tuning happens before single generation request
- **Optimized**: Recent completion rate cached to avoid repeated calculations

---

## Previous Versions
[Previous changelog entries would go here...]
