import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    isDestructive?: boolean;
    variant?: 'confirm' | 'alert';
    confirmationKeyword?: string;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = false,
    variant = 'confirm',
    confirmationKeyword,
}: ConfirmDialogProps) {
    const [inputValue, setInputValue] = useState('');

    // Reset input when dialog opens
    useEffect(() => {
        if (isOpen) setInputValue('');
    }, [isOpen]);

    const isConfirmDisabled = confirmationKeyword
        ? inputValue !== confirmationKeyword
        : false;
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-scale-in">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    {variant === 'confirm' && onCancel && (
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed">
                    {message}
                </p>

                {confirmationKeyword && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type <strong>{confirmationKeyword}</strong> to confirm:
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                            placeholder={confirmationKeyword}
                        />
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    {variant === 'confirm' && onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        disabled={isConfirmDisabled}
                        className={`px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-colors ${isConfirmDisabled
                            ? 'bg-gray-300 cursor-not-allowed'
                            : isDestructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
