/**
 * Restore navigation and assessment UI after a full page refresh (same tab).
 * Uses sessionStorage so closing the tab clears the snapshot.
 */

const VIEW_KEY = 'scm-view';
const ASSESSMENT_KEY = 'scm-assessment-state';

const VALID_VIEWS = new Set(['dashboard', 'assessment', 'planning']);

export function readStoredView() {
  try {
    const v = sessionStorage.getItem(VIEW_KEY);
    if (VALID_VIEWS.has(v)) return v;
  } catch {
    /* ignore */
  }
  return 'dashboard';
}

export function writeStoredView(view) {
  try {
    if (VALID_VIEWS.has(view)) sessionStorage.setItem(VIEW_KEY, view);
  } catch {
    /* ignore */
  }
}

export function readAssessmentSession() {
  try {
    const raw = sessionStorage.getItem(ASSESSMENT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    if (!['intro', 'assess', 'results'].includes(o.screen)) return null;
    return {
      screen: o.screen,
      idx: Number.isFinite(Number(o.idx)) ? Number(o.idx) : 0,
      scores: o.scores && typeof o.scores === 'object' ? o.scores : {},
      clientName: typeof o.clientName === 'string' ? o.clientName : '',
      historicalCompletedLabel: o.historicalCompletedLabel ?? null,
      completedAtLabel: o.completedAtLabel ?? null,
      completedClientName: typeof o.completedClientName === 'string' ? o.completedClientName : '',
    };
  } catch {
    return null;
  }
}

export function writeAssessmentSession(state) {
  try {
    sessionStorage.setItem(ASSESSMENT_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function clearAssessmentSession() {
  try {
    sessionStorage.removeItem(ASSESSMENT_KEY);
  } catch {
    /* ignore */
  }
}
