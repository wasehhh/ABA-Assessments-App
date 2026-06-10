
import { useEffect, useState } from 'react';
import { X, Clock, FileText, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Target, AssessmentScore } from '../../types';
import { interpretTargetScore } from '../../utils/scoreInterpretation';
import { TargetScoreControls } from './TargetScoreControls';

interface Props {
    target: Target;
    currentScore: AssessmentScore | null;
    targetPositionLabel: string;
    canNavigatePrev: boolean;
    canNavigateNext: boolean;
    scoresEditable: boolean;
    onClose: () => void;
    onSaveNote: (note: string) => void;
    onScoreUpdate: (value: number) => void;
    onNavigateTarget: (direction: 'prev' | 'next') => void;
    notesReadOnly?: boolean;
}

export function TargetDetailModal({
    target,
    currentScore,
    targetPositionLabel,
    canNavigatePrev,
    canNavigateNext,
    scoresEditable,
    onClose,
    onSaveNote,
    onScoreUpdate,
    onNavigateTarget,
    notesReadOnly = false,
}: Props) {
    const descriptionText =
        typeof target.description === 'string' ? target.description.trim() : '';
    const instructionsText =
        typeof target.instructions === 'string' ? target.instructions.trim() : '';
    const examplesText = typeof target.examples === 'string' ? target.examples.trim() : '';
    const targetNotesText =
        typeof target.notes === 'string' ? target.notes.trim() : '';
    const [clinicalNoteText, setClinicalNoteText] = useState<string>(currentScore?.note ?? '');
    const showDescription = descriptionText.length > 0;
    const showInstructions = instructionsText.length > 0;
    const showExamples = examplesText.length > 0;
    const showTargetNotes = targetNotesText.length > 0;
    const scoreInterpretation = interpretTargetScore(target, currentScore);
    const currentScoreValue = scoreInterpretation.rawScore;
    const statusLabel =
        scoreInterpretation.competencyState === 'unscored'
            ? 'Not Scored'
            : scoreInterpretation.competencyState === 'at_maximum'
                ? 'At Maximum Score'
                : 'Scored';

    useEffect(() => {
        setClinicalNoteText(currentScore?.note ?? '');
    }, [target.target_id, currentScore?.id, currentScore?.note]);

    const flushClinicalNote = () => {
        if (!notesReadOnly && clinicalNoteText !== (currentScore?.note ?? '')) {
            onSaveNote(clinicalNoteText);
        }
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        flushClinicalNote();
        onNavigateTarget(direction);
    };

    const handleClose = () => {
        flushClinicalNote();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in">

                <div className="border-b px-6 py-4 flex items-center justify-between shrink-0 bg-white rounded-t-xl">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-emerald-100 text-emerald-700 font-mono text-sm px-2 py-1 rounded shrink-0">
                            {target.target_id}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 truncate">{target.title}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{targetPositionLabel}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {showDescription && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{descriptionText}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Success Criteria</h4>
                            <p className="text-sm text-gray-900">{target.success_criteria}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Materials</h4>
                            <p className="text-sm text-gray-900">{target.materials || 'None specified'}</p>
                        </div>
                    </div>

                    {showInstructions && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Instructions</h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{instructionsText}</p>
                        </div>
                    )}

                    {showExamples && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Examples</h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{examplesText}</p>
                        </div>
                    )}

                    {showTargetNotes && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Target Notes</h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{targetNotesText}</p>
                        </div>
                    )}

                    <div className="border border-emerald-100 bg-emerald-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Check className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-emerald-900">Current Status</h3>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="text-4xl font-bold text-emerald-700">{currentScoreValue ?? '-'}</div>
                            <div className="text-sm text-emerald-800">
                                {statusLabel}
                                <div className="text-xs text-emerald-600 opacity-75 flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    Last updated:{' '}
                                    {currentScore?.updated_at
                                        ? new Date(currentScore.updated_at).toLocaleDateString()
                                        : 'Never'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-emerald-800 uppercase mb-2 tracking-wide">Score</p>
                            <TargetScoreControls
                                target={target}
                                current={currentScoreValue}
                                scoresEditable={scoresEditable}
                                onScoreUpdate={onScoreUpdate}
                            />
                            {!scoresEditable && (
                                <p className="text-xs text-emerald-700/80 mt-2">
                                    Scoring is read-only for this assessment state.
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            Clinical Notes
                        </h4>
                        <textarea
                            readOnly={notesReadOnly}
                            className={`w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 ${notesReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                            rows={4}
                            placeholder="Enter observation notes, prompts used, or maladaptive behaviors..."
                            value={clinicalNoteText}
                            onChange={(e) => setClinicalNoteText(e.target.value)}
                            onBlur={() => {
                                if (!notesReadOnly) onSaveNote(clinicalNoteText);
                            }}
                        />
                        <p className="text-xs text-gray-400 mt-2 text-right">
                            {notesReadOnly
                                ? 'Notes are read-only for this assessment state.'
                                : 'Notes saved automatically when you click outside.'}
                        </p>
                    </div>
                </div>

                <div className="border-t px-6 py-4 flex items-center justify-between gap-3 shrink-0 bg-gray-50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={() => handleNavigate('prev')}
                        disabled={!canNavigatePrev}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            canNavigatePrev
                                ? 'text-gray-700 hover:bg-white border border-gray-200'
                                : 'text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous Target
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNavigate('next')}
                        disabled={!canNavigateNext}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            canNavigateNext
                                ? 'text-gray-700 hover:bg-white border border-gray-200'
                                : 'text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        Next Target
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
