import { SnapshotArchiveConceptId } from './snapshotConceptTypes';
import { AssessmentSnapshotBarcodeConcept } from './AssessmentSnapshotBarcodeConcept';
import { AssessmentSnapshotCanvasesConcept } from './AssessmentSnapshotCanvasesConcept';
import { AssessmentSnapshotGlyphsConcept } from './AssessmentSnapshotGlyphsConcept';
import { AssessmentSnapshotRibbonsConcept } from './AssessmentSnapshotRibbonsConcept';
import { AssessmentSnapshotSignatureConcept } from './AssessmentSnapshotSignatureConcept';
import { AssessmentSnapshotTableConcept } from './AssessmentSnapshotTableConcept';
import { AssessmentSnapshotTerrainConcept } from './AssessmentSnapshotTerrainConcept';
import { AssessmentSnapshotThreadsConcept } from './AssessmentSnapshotThreadsConcept';
import { AssessmentSnapshotTimelineConcept } from './AssessmentSnapshotTimelineConcept';
import { AssessmentSnapshotTowersConcept } from './AssessmentSnapshotTowersConcept';
import { SnapshotConceptProps } from './snapshotConceptShared';

export function AssessmentSnapshotConceptView({
    concept,
    ...props
}: SnapshotConceptProps & { concept: SnapshotArchiveConceptId }) {
    switch (concept) {
        case 'barcode':
            return <AssessmentSnapshotBarcodeConcept {...props} />;
        case 'towers':
            return <AssessmentSnapshotTowersConcept {...props} />;
        case 'ribbons':
            return <AssessmentSnapshotRibbonsConcept {...props} />;
        case 'terrain':
            return <AssessmentSnapshotTerrainConcept {...props} />;
        case 'threads':
            return <AssessmentSnapshotThreadsConcept {...props} />;
        case 'timeline':
            return <AssessmentSnapshotTimelineConcept {...props} />;
        case 'canvases':
            return <AssessmentSnapshotCanvasesConcept {...props} />;
        case 'glyphs':
            return <AssessmentSnapshotGlyphsConcept {...props} />;
        case 'signature':
            return <AssessmentSnapshotSignatureConcept {...props} />;
        case 'table':
        default:
            return <AssessmentSnapshotTableConcept {...props} />;
    }
}
