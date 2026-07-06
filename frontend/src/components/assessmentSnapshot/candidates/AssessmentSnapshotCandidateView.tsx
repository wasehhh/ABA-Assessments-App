import { SnapshotCandidateId } from '../concepts/snapshotConceptTypes';
import { AssessmentSnapshotCandidateA } from './AssessmentSnapshotCandidateA';
import { AssessmentSnapshotCandidateB } from './AssessmentSnapshotCandidateB';
import { AssessmentSnapshotCandidateC } from './AssessmentSnapshotCandidateC';
import { SnapshotCandidateProps } from './AssessmentSnapshotCandidateA';

export function AssessmentSnapshotCandidateView({
    candidate,
    ...props
}: SnapshotCandidateProps & { candidate: SnapshotCandidateId }) {
    switch (candidate) {
        case 'candidate-b':
            return <AssessmentSnapshotCandidateB {...props} />;
        case 'candidate-c':
            return <AssessmentSnapshotCandidateC {...props} />;
        case 'candidate-a':
        default:
            return <AssessmentSnapshotCandidateA {...props} />;
    }
}
