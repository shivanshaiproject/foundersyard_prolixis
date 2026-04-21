/**
 * Text Moderation using simple pattern matching for toxicity detection
 * Zero-cost client-side text analysis
 */

export interface ToxicityResult {
  isBlocked: boolean;
  isFlagged: boolean;
  scores: {
    hate_speech: number;
    insult: number;
    threat: number;
    obscene: number;
    identity_attack: number;
    severe_toxicity: number;
  };
  detectedCategories: string[];
  reason?: string;
}

// Toxic word patterns with weights
const TOXIC_PATTERNS = {
  hate_speech: [
    { pattern: /\b(hate|hatred)\s+(all|every|those)\s+\w+/gi, weight: 0.8 },
    { pattern: /\b(inferior|subhuman|scum)\b/gi, weight: 0.9 },
    { pattern: /\b(go\s+back\s+to|don't\s+belong)\b/gi, weight: 0.7 },
    { pattern: /\b(exterminate|eradicate)\s+\w+/gi, weight: 0.95 },
  ],
  insult: [
    { pattern: /\b(idiot|stupid|dumb|moron|loser|pathetic)\b/gi, weight: 0.5 },
    { pattern: /\b(worthless|useless|trash|garbage)\s+(person|human|people)?\b/gi, weight: 0.7 },
    { pattern: /\b(shut\s+up|get\s+lost|go\s+away)\b/gi, weight: 0.4 },
    { pattern: /you('re|\s+are)\s+(an?\s+)?(idiot|stupid|dumb|loser)/gi, weight: 0.75 },
  ],
  threat: [
    { pattern: /\b(kill|murder|destroy)\s+(you|them|him|her)\b/gi, weight: 0.95 },
    { pattern: /\b(i('ll|'m\s+going\s+to)|gonna)\s+(kill|hurt|destroy)\b/gi, weight: 0.95 },
    { pattern: /\b(death\s+threat|threat(en|ening)?)\b/gi, weight: 0.85 },
    { pattern: /\b(watch\s+your\s+back|you('re|\s+are)\s+dead)\b/gi, weight: 0.9 },
    { pattern: /\b(find\s+(you|where\s+you\s+live))\b/gi, weight: 0.85 },
  ],
  obscene: [
    { pattern: /\bf+u+c+k+\b/gi, weight: 0.6 },
    { pattern: /\bs+h+i+t+\b/gi, weight: 0.4 },
    { pattern: /\ba+s+s+h+o+l+e+\b/gi, weight: 0.5 },
    { pattern: /\bb+i+t+c+h+\b/gi, weight: 0.5 },
  ],
  identity_attack: [
    { pattern: /\b(all|every|those)\s+(men|women|gays?|lesbians?|trans)\s+(are|should)\b/gi, weight: 0.8 },
    { pattern: /\b(typical|stereotypical)\s+\w+\s+(behavior|people)\b/gi, weight: 0.6 },
  ],
  severe_toxicity: [
    { pattern: /\b(kys|kill\s+yourself)\b/gi, weight: 0.99 },
    { pattern: /\b(hope\s+you\s+die|wish\s+you\s+were\s+dead)\b/gi, weight: 0.95 },
    { pattern: /\b(rape|molest|assault)\s+(you|them|her|him)\b/gi, weight: 0.98 },
  ],
};

// Thresholds for blocking/flagging - PARANOID MODE (0.5)
const BLOCK_THRESHOLDS = {
  hate_speech: 0.5,
  insult: 0.5,
  threat: 0.5,
  identity_attack: 0.5,
  severe_toxicity: 0.5,
};

const FLAG_THRESHOLDS = {
  obscene: 0.4,
  identity_attack: 0.4,
  insult: 0.4,
};

function calculateCategoryScore(text: string, patterns: Array<{ pattern: RegExp; weight: number }>): number {
  let maxScore = 0;
  
  for (const { pattern, weight } of patterns) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // More matches = higher confidence, but cap at pattern weight
      const score = Math.min(weight + (matches.length - 1) * 0.1, 1);
      maxScore = Math.max(maxScore, score);
    }
  }
  
  return maxScore;
}

export function analyzeTextToxicity(text: string): ToxicityResult {
  if (!text || text.trim().length === 0) {
    return {
      isBlocked: false,
      isFlagged: false,
      scores: {
        hate_speech: 0,
        insult: 0,
        threat: 0,
        obscene: 0,
        identity_attack: 0,
        severe_toxicity: 0,
      },
      detectedCategories: [],
    };
  }

  const normalizedText = text.toLowerCase();
  
  const scores = {
    hate_speech: calculateCategoryScore(normalizedText, TOXIC_PATTERNS.hate_speech),
    insult: calculateCategoryScore(normalizedText, TOXIC_PATTERNS.insult),
    threat: calculateCategoryScore(normalizedText, TOXIC_PATTERNS.threat),
    obscene: calculateCategoryScore(normalizedText, TOXIC_PATTERNS.obscene),
    identity_attack: calculateCategoryScore(normalizedText, TOXIC_PATTERNS.identity_attack),
    severe_toxicity: calculateCategoryScore(normalizedText, TOXIC_PATTERNS.severe_toxicity),
  };

  const detectedCategories: string[] = [];
  let isBlocked = false;
  let isFlagged = false;
  let blockReason = '';

  // Check for blocking conditions
  for (const [category, threshold] of Object.entries(BLOCK_THRESHOLDS)) {
    const score = scores[category as keyof typeof scores];
    if (score >= threshold) {
      isBlocked = true;
      detectedCategories.push(category);
      blockReason = `High ${category.replace('_', ' ')} detected`;
    }
  }

  // Check for flagging conditions (if not already blocked)
  if (!isBlocked) {
    for (const [category, threshold] of Object.entries(FLAG_THRESHOLDS)) {
      const score = scores[category as keyof typeof scores];
      if (score >= threshold && !detectedCategories.includes(category)) {
        isFlagged = true;
        detectedCategories.push(category);
      }
    }
  }

  return {
    isBlocked,
    isFlagged,
    scores,
    detectedCategories,
    reason: blockReason || undefined,
  };
}

// Aggressive content patterns for additional checking
const AGGRESSIVE_INDICATORS = [
  /!{3,}/g, // Multiple exclamation marks
  /\b(YOU|THEY|THEM)\b/g, // Aggressive capitalization
  /\b(always|never|everyone|nobody)\b/gi, // Absolute statements
];

export function calculateAggressionScore(text: string): number {
  let score = 0;
  
  for (const pattern of AGGRESSIVE_INDICATORS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) {
      score += matches.length * 0.1;
    }
  }
  
  // Check for all caps (more than 30% of text)
  const capsRatio = (text.match(/[A-Z]/g)?.length || 0) / Math.max(text.length, 1);
  if (capsRatio > 0.3 && text.length > 20) {
    score += 0.3;
  }
  
  return Math.min(score, 1);
}
