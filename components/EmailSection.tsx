import { useState } from 'react';
import { Mail } from 'lucide-react';

interface EmailSectionProps {
    onSendEmail: (email: string) => Promise<void>;
}

export default function EmailSection({ onSendEmail }: EmailSectionProps) {
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);

    const handleSendEmail = async () => {
        if (!email) {
            setEmailError('Por favor ingresa un email válido');
            return;
        }

        setIsSending(true);
        setEmailError(null);

        try {
            await onSendEmail(email);
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
    );
} 