
import { useEffect, useState } from 'react';
import { X, Clock, FileText, Check } from 'lucide-react';
import { Target, AssessmentScore } from '../../types';

interface Props {
    target: Target;
    scores: AssessmentScore[]; // History of scores for this target (joined with cycle data ideally)
    currentScore: AssessmentScore | null;
    onClose: () => void;
    onSaveNote: (note: string) => void;
    /** When true, notes cannot be edited (view-only / locked workflow). */
    notesReadOnly?: boolean;
}

export function TargetDetailModal({ target, scores, currentScore, onClose, onSaveNote, notesReadOnly = false }: Props) {
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

    useEffect(() => {
        setClinicalNoteText(currentScore?.note ?? '');
    }, [target.target_id, currentScore?.id, currentScore?.note]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">

                {/* Header */}
                <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 text-emerald-700 font-mono text-sm px-2 py-1 rounded">
                            {target.target_id}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 truncate max-w-md">{target.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {showDescription && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{descriptionText}</p>
                        </div>
                    )}

                    {/* Context/Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Success Criteria</h4>
                            <p className="text-sm text-gray-900">{target.success_criteria}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Materials</h4>
                            <p className="text-sm text-gray-900">{target.materials || "None specified"}</p>
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

                    {/* Current Status */}
                    <div className="border border-emerald-100 bg-emerald-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Check className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-emerald-900">Current Status</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl font-bold text-emerald-700">
                                {currentScore?.score ?? '-'}
                            </div>
                            <div className="text-sm text-emerald-800">
                                {currentScore?.score === 4 ? 'Mastered' : 'In Progress'}
                                <div className="text-xs text-emerald-600 opacity-75 flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    Last updated: {currentScore?.updated_at ? new Date(currentScore.updated_at).toLocaleDateString() : 'Never'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
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
                            onBlur={(e) => {
                                if (!notesReadOnly) onSaveNote(e.target.value);
                            }}
                        />
                        <p className="text-xs text-gray-400 mt-2 text-right">
                            {notesReadOnly ? 'Notes are read-only for this assessment state.' : 'Notes saved automatically when you click outside.'}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
