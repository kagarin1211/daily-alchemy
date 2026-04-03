const COHORT_STORAGE_KEY = 'daily_alchemy_cohort_id';
const COHORT_PASSCODE_KEY = 'daily_alchemy_cohort_passcode';

export function getCohortFromStorage(): { id: string | null; passcode: string | null } {
  if (typeof window === 'undefined') {
    return { id: null, passcode: null };
  }
  const id = localStorage.getItem(COHORT_STORAGE_KEY);
  const passcode = localStorage.getItem(COHORT_PASSCODE_KEY);
  return { id, passcode };
}

export function setCohortToStorage(id: string, passcode: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COHORT_STORAGE_KEY, id);
  localStorage.setItem(COHORT_PASSCODE_KEY, passcode);
}

export function clearCohortStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COHORT_STORAGE_KEY);
  localStorage.removeItem(COHORT_PASSCODE_KEY);
}
