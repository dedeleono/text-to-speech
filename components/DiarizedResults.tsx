import { useState } from 'react';
import EmailSection from './EmailSection';

interface Utterance {
    speaker: string;
    text: string;
    confidence: number;
    start: number;
    end: number;
}

interface DiarizedResultsProps {
    utterances: Utterance[];
}

export default function DiarizedResults({ utterances }: DiarizedResultsProps) {
    const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);

    if (!utterances || utterances.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-lg">No se detectaron hablantes en el audio</p>
                <p className="text-sm mt-2">
                    Intenta grabar o subir un archivo de audio con hablantes claros.
                </p>
            </div>
        );
    }

    // Get unique speakers
    const speakers = Array.from(new Set(utterances.map(u => u.speaker)));

    // Filter utterances by selected speaker
    const filteredUtterances = selectedSpeaker
        ? utterances.filter(u => u.speaker === selectedSpeaker)
        : utterances;

    const handleSendEmail = async (email: string) => {
        const response = await fetch('/api/send-transcript', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                utterances: filteredUtterances,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send email');
        }
    };

    return (
        <div className="space-y-6">
            {/* Speaker Filter */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedSpeaker(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedSpeaker === null
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                >
                    Todos los Hablantes
                </button>
                {speakers.map(speaker => (
                    <button
                        key={speaker}
                        onClick={() => setSelectedSpeaker(speaker)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedSpeaker === speaker
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                    >
                        Hablante {speaker}
                    </button>
                ))}
            </div>

            {/* Utterances */}
            <div className="space-y-4">
                {filteredUtterances.map((utterance, index) => (
                    <div
                        key={index}
                        className="glass-card p-4 hover:scale-[1.01] transition-transform duration-200"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300">
                                Hablante {utterance.speaker}
                            </span>
                            <span className="text-xs text-gray-400">
                                {Math.round(utterance.confidence * 100)}% confianza
                            </span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200">{utterance.text}</p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatTime(utterance.start)} - {formatTime(utterance.end)}
                        </div>
                    </div>
                ))}
            </div>

            <EmailSection onSendEmail={handleSendEmail} />
        </div>
    );
}

const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};