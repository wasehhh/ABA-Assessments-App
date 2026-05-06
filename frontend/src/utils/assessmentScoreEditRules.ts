/**
 * Who may change scores for the currently viewed cycle.
 * - submitted: therapists locked; senior_therapist/admin may edit during review (cycle must be in_progress).
 * - approved: no edits for any role.
 * - viewer: never.
 * - Non–in-progress cycle: no edits (historical cycle view).
 */
export function canEditAssessmentScores(
  role: string | null | undefined,
  assessmentStatus: string | null | undefined,
  cycleStatus: string | null | undefined
): boolean {
  if (!role || role === 'viewer') return false;
  if (assessmentStatus === 'approved') return false;
  if (cycleStatus !== 'in_progress') return false;
  if (assessmentStatus === 'submitted') {
    return role === 'admin' || role === 'senior_therapist';
  }
  return true;
}
