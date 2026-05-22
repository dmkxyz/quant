import type { PrepGuideProgress } from "./contracts";

export function createInitialPrepProgress(weekPackId: string): PrepGuideProgress {
  return {
    weekPackId,
    completedCheckIds: []
  };
}

export function markPrepGuideViewed(progress: PrepGuideProgress, now = new Date()): PrepGuideProgress {
  return {
    ...progress,
    viewedAt: progress.viewedAt ?? now.toISOString()
  };
}

export function markPrepQuickCheckComplete(progress: PrepGuideProgress, checkId: string): PrepGuideProgress {
  if (progress.completedCheckIds.includes(checkId)) return progress;
  return {
    ...progress,
    completedCheckIds: [...progress.completedCheckIds, checkId]
  };
}
