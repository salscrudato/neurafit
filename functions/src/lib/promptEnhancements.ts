/**
 * Simplified prompt enhancements for AI workout generation
 * Focuses on quality standards and injury-specific safety guidance
 */

export interface PromptContext {
  injuries?: string[];
}

/**
 * Generate injury-specific safety guidance
 */
function generateInjurySafetyGuidance(injuries?: string[]): string {
  if (!injuries || injuries.length === 0) {
    return '';
  }

  const safetyPoints: string[] = ['\nINJURY-SPECIFIC SAFETY:'];

  injuries.forEach((injury) => {
    const injuryLower = injury.toLowerCase();

    if (injuryLower.includes('knee')) {
      safetyPoints.push(
        '- KNEE SAFETY: Avoid deep knee flexion, ensure proper tracking',
        '- Modify jumping and pivoting movements',
        '- Use knee-friendly alternatives like wall sits or glute bridges',
      );
    }

    if (injuryLower.includes('back') || injuryLower.includes('spine')) {
      safetyPoints.push(
        '- BACK SAFETY: Maintain neutral spine alignment',
        '- Avoid spinal flexion under load',
        '- Include core activation cues and bracing techniques',
      );
    }

    if (injuryLower.includes('shoulder')) {
      safetyPoints.push(
        '- SHOULDER SAFETY: Avoid overhead movements if impingement present',
        '- Include scapular stability and mobility work',
        '- Modify pressing movements to pain-free ranges',
      );
    }

    if (injuryLower.includes('ankle')) {
      safetyPoints.push(
        '- ANKLE SAFETY: Avoid jumping and plyometric movements',
        '- Modify balance and stability exercises',
        '- Use seated or supported alternatives',
      );
    }

    if (injuryLower.includes('wrist')) {
      safetyPoints.push(
        '- WRIST SAFETY: Avoid exercises requiring wrist extension under load',
        '- Use fist position or parallettes for push-ups',
        '- Modify plank variations to forearms',
      );
    }
  });

  return safetyPoints.join('\n');
}

/**
 * Generate simplified prompt enhancement with quality standards and injury safety
 */
export function generateProfessionalPromptEnhancement(context: PromptContext): string {
  const injurySafety = generateInjurySafetyGuidance(context.injuries);

  return `
QUALITY STANDARDS:
- Each exercise description must include: setup, execution, key cues, and breathing
- Form tips should address the most common technique errors (minimum 3 tips)
- Safety tips must include injury prevention and modification options (minimum 2 tips)
- Use clear, instructional language without jargon
- Provide specific, actionable cues${injurySafety}
`.trim();
}