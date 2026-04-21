// FoundersYard Rank System - Reputation Infrastructure
// This is NOT gamification - it's a serious reputation system

// Rank logo imports
import newcomerImg from '@/assets/ranks/newcomer.png';
import contributorImg from '@/assets/ranks/contributor.png';
import activeBuilderImg from '@/assets/ranks/active_builder.png';
import communityInsiderImg from '@/assets/ranks/community_insider.png';
import recognizedBuilderImg from '@/assets/ranks/recognized_builder.png';
import coreOperatorImg from '@/assets/ranks/core_operator.png';
import ecosystemInfluencerImg from '@/assets/ranks/ecosystem_influencer.png';
import marketOperatorImg from '@/assets/ranks/market_operator.png';
import eliteFounderImg from '@/assets/ranks/elite_founder.png';
import apexFounderImg from '@/assets/ranks/apex_founder.png';

export type RankKey = 
  | 'newcomer'
  | 'contributor'
  | 'active_builder'
  | 'community_insider'
  | 'recognized_builder'
  | 'core_operator'
  | 'ecosystem_influencer'
  | 'market_operator'
  | 'elite_founder'
  | 'apex_founder';

export interface RankRequirements {
  posts: number;
  comments: number;
  uniqueInteractors?: number;
  repliesReceived?: number;
  bookmarksReceived?: number;
  highImpactPosts?: number;
  longFormPosts?: number;
  avgEngagement?: number;
  accountDays: number;
  profileCompletion: number;
  zeroReports?: boolean;
  zeroViolations?: boolean;
}

export interface RankInfo {
  order: number;
  key: RankKey;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string; // Now stores image path
  requirements: RankRequirements;
}

export const RANKS: Record<RankKey, RankInfo> = {
  newcomer: {
    order: 0,
    key: 'newcomer',
    name: 'Newcomer',
    description: 'Just getting started on your founder journey',
    color: 'hsl(0 0% 45%)',
    bgColor: 'hsl(0 0% 95%)',
    borderColor: 'hsl(0 0% 80%)',
    icon: newcomerImg,
    requirements: { posts: 0, comments: 0, accountDays: 0, profileCompletion: 0 }
  },
  contributor: {
    order: 1,
    key: 'contributor',
    name: 'Contributor',
    description: 'Actively participating in the community',
    color: 'hsl(38 92% 45%)',
    bgColor: 'hsl(38 92% 95%)',
    borderColor: 'hsl(38 92% 70%)',
    icon: contributorImg,
    requirements: { posts: 5, comments: 20, accountDays: 7, profileCompletion: 50 }
  },
  active_builder: {
    order: 2,
    key: 'active_builder',
    name: 'Active Builder',
    description: 'Consistently building and engaging',
    color: 'hsl(210 90% 50%)',
    bgColor: 'hsl(210 90% 95%)',
    borderColor: 'hsl(210 90% 70%)',
    icon: activeBuilderImg,
    requirements: { posts: 25, comments: 75, uniqueInteractors: 10, accountDays: 21, profileCompletion: 80 }
  },
  community_insider: {
    order: 3,
    key: 'community_insider',
    name: 'Community Insider',
    description: 'A recognized voice in the community',
    color: 'hsl(152 69% 40%)',
    bgColor: 'hsl(152 69% 95%)',
    borderColor: 'hsl(152 69% 60%)',
    icon: communityInsiderImg,
    requirements: { posts: 60, comments: 150, uniqueInteractors: 25, repliesReceived: 15, accountDays: 45, profileCompletion: 80 }
  },
  recognized_builder: {
    order: 4,
    key: 'recognized_builder',
    name: 'Recognized Builder',
    description: 'Content that gets saved and shared',
    color: 'hsl(25 95% 53%)',
    bgColor: 'hsl(25 95% 95%)',
    borderColor: 'hsl(25 95% 70%)',
    icon: recognizedBuilderImg,
    requirements: { posts: 100, comments: 300, uniqueInteractors: 50, bookmarksReceived: 25, accountDays: 90, profileCompletion: 100 }
  },
  core_operator: {
    order: 5,
    key: 'core_operator',
    name: 'Core Operator',
    description: 'Platform pillar with spotless record',
    color: 'hsl(16 90% 50%)',
    bgColor: 'hsl(16 90% 95%)',
    borderColor: 'hsl(16 90% 70%)',
    icon: coreOperatorImg,
    requirements: { posts: 200, comments: 600, uniqueInteractors: 100, accountDays: 150, profileCompletion: 100, zeroReports: true }
  },
  ecosystem_influencer: {
    order: 6,
    key: 'ecosystem_influencer',
    name: 'Ecosystem Influencer',
    description: 'Scaling impact across the ecosystem',
    color: 'hsl(152 69% 35%)',
    bgColor: 'hsl(152 69% 95%)',
    borderColor: 'hsl(152 69% 55%)',
    icon: ecosystemInfluencerImg,
    requirements: { posts: 350, comments: 1000, uniqueInteractors: 200, avgEngagement: 3, accountDays: 240, profileCompletion: 100 }
  },
  market_operator: {
    order: 7,
    key: 'market_operator',
    name: 'Market Operator',
    description: 'Market-shaping voice with high impact',
    color: 'hsl(243 75% 55%)',
    bgColor: 'hsl(243 75% 95%)',
    borderColor: 'hsl(243 75% 70%)',
    icon: marketOperatorImg,
    requirements: { posts: 500, comments: 1500, uniqueInteractors: 350, highImpactPosts: 10, accountDays: 365, profileCompletion: 100 }
  },
  elite_founder: {
    order: 8,
    key: 'elite_founder',
    name: 'Elite Founder',
    description: 'Legacy builder with deep expertise',
    color: 'hsl(280 70% 50%)',
    bgColor: 'hsl(280 70% 95%)',
    borderColor: 'hsl(280 70% 70%)',
    icon: eliteFounderImg,
    requirements: { posts: 800, comments: 2500, uniqueInteractors: 600, longFormPosts: 50, accountDays: 548, profileCompletion: 100 }
  },
  apex_founder: {
    order: 9,
    key: 'apex_founder',
    name: 'Apex Founder',
    description: 'Symbolic elite - the pinnacle of founders',
    color: 'hsl(0 80% 50%)',
    bgColor: 'hsl(0 80% 95%)',
    borderColor: 'hsl(0 80% 70%)',
    icon: apexFounderImg,
    requirements: { posts: 1200, comments: 4000, uniqueInteractors: 1000, accountDays: 730, profileCompletion: 100, zeroViolations: true }
  }
};

export const RANK_ORDER: RankKey[] = [
  'newcomer',
  'contributor',
  'active_builder',
  'community_insider',
  'recognized_builder',
  'core_operator',
  'ecosystem_influencer',
  'market_operator',
  'elite_founder',
  'apex_founder'
];

export function getRankInfo(rankKey: string): RankInfo {
  return RANKS[rankKey as RankKey] || RANKS.newcomer;
}

export function getNextRank(currentRank: RankKey): RankKey | null {
  const currentIndex = RANK_ORDER.indexOf(currentRank);
  if (currentIndex === -1 || currentIndex === RANK_ORDER.length - 1) {
    return null;
  }
  return RANK_ORDER[currentIndex + 1];
}

export function calculateProgress(
  current: number,
  required: number
): { percentage: number; remaining: number } {
  if (required === 0) return { percentage: 100, remaining: 0 };
  const percentage = Math.min(100, Math.round((current / required) * 100));
  const remaining = Math.max(0, required - current);
  return { percentage, remaining };
}

export function calculateProfileCompletion(profile: {
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  company_name?: string | null;
  location?: string | null;
}): number {
  let completion = 0;
  if (profile.full_name && profile.full_name.trim() !== '') completion += 20;
  if (profile.avatar_url) completion += 20;
  if (profile.bio && profile.bio.trim() !== '') completion += 20;
  if (profile.company_name && profile.company_name.trim() !== '') completion += 20;
  if (profile.location && profile.location.trim() !== '') completion += 20;
  return completion;
}

export function estimateDaysToNextRank(
  currentStats: {
    posts: number;
    comments: number;
    accountDays: number;
  },
  nextRankRequirements: RankRequirements
): number | null {
  // Calculate based on account days requirement
  const daysNeeded = nextRankRequirements.accountDays - currentStats.accountDays;
  
  // Calculate based on activity (assuming ~1 post/day, ~3 comments/day)
  const postsNeeded = Math.max(0, nextRankRequirements.posts - currentStats.posts);
  const commentsNeeded = Math.max(0, nextRankRequirements.comments - currentStats.comments);
  
  const activityDays = Math.max(postsNeeded, Math.ceil(commentsNeeded / 3));
  
  // Return the maximum of both
  return Math.max(daysNeeded, activityDays);
}
