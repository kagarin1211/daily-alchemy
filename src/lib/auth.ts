interface StoredCohort {
  id: string;
  name: string;
  code: string;
  passcode: string;
}

const COHORTS_STORAGE_KEY = 'daily_alchemy_cohorts';
const ACTIVE_COHORT_KEY = 'daily_alchemy_active_cohort_id';

export function getStoredCohorts(): StoredCohort[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(COHORTS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addStoredCohort(cohort: StoredCohort): void {
  const cohorts = getStoredCohorts();
  if (!cohorts.find(c => c.id === cohort.id)) {
    cohorts.push(cohort);
    localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(cohorts));
  }
  localStorage.setItem(ACTIVE_COHORT_KEY, cohort.id);
}

export function getActiveCohortId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_COHORT_KEY);
}

export function setActiveCohortId(id: string): void {
  localStorage.setItem(ACTIVE_COHORT_KEY, id);
}

export function clearAllCohorts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COHORTS_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_COHORT_KEY);
}
