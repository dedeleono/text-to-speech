import { useState } from 'react';
import { Mail } from 'lucide-react';

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
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);

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

    const handleSendEmail = async () => {
        if (!email) {
            setEmailError('Por favor ingresa un email válido');
            return;
        }

        setIsSending(true);
        setEmailError(null);

        try {
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

            setEmailSent(true);
            setEmail('');
        } catch (error) {
            setEmailError('Error al enviar el email. Por favor intenta de nuevo.');
            console.error('Error sending email:', error);
        } finally {
            setIsSending(false);
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

            {/* Email Section */}
            <div className="glass-card p-4 mt-6">
                <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Enviar por Email
                    </h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Ingresa tu email"
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors duration-200"
                        />
                        {emailError && (
                            <p className="mt-1 text-sm text-red-500">{emailError}</p>
                        )}
                    </div>
                    <button
                        onClick={handleSendEmail}
                        disabled={isSending || emailSent}
                        className={`w-full px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                            isSending || emailSent
                                ? 'bg-indigo-500/50 cursor-not-allowed'
                                : 'bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20'
                        }`}
                    >
                        {isSending ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Enviando...
                            </span>
                        ) : emailSent ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Email Enviado
                            </span>
                        ) : (
                            'Enviar por Email'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};