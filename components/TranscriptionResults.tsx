import {FileText, Copy, CheckCircle, Mail, RefreshCw} from "lucide-react";
import {useState} from "react";

interface TranscriptionResultsProps {
    text: string;
}

const TranscriptionResults = ({text}: TranscriptionResultsProps) => {
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [error, setError] = useState("");

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    }

    const resetEmailState = () => {
        setEmail("");
        setEmailSent(false);
        setError("");
    };

    const handleSendEmail = async () => {
        if (!email) {
            setError("Por favor ingresa tu correo electrónico");
            return;
        }

        setIsSending(true);
        setError("");

        try {
            const response = await fetch("/api/send-transcript", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, transcript: text }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al enviar el correo");
            }

            setEmailSent(true);
            // Auto reset after 5 seconds
            setTimeout(resetEmailState, 5000);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Error al enviar el correo");
        } finally {
            setIsSending(false);
        }
    }

    return (
        <div className="h-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-6 px-6 pt-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transcription Results</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleCopy} 
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
                        title="Copy to clipboard"
                    >
                        {copied ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                            <Copy className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        )}
                    </button>
                </div>
            </div>
            <div className="h-[calc(100vh_-_12rem)] p-6 bg-white dark:bg-gray-900 rounded-xl overflow-auto border border-gray-100 dark:border-gray-800 shadow-inner">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mb-6 text-base md:text-lg">{text}</p>
                
                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Mail className="w-5 h-5 text-indigo-500" />
                            Enviar por correo electrónico
                        </h3>
                        {emailSent && (
                            <button
                                onClick={resetEmailState}
                                className="text-sm text-indigo-500 hover:text-indigo-600 flex items-center gap-2 transition-colors duration-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-lg"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Enviar otro
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Tu correo electrónico"
                            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            disabled={isSending}
                        />
                        <button
                            onClick={handleSendEmail}
                            disabled={isSending}
                            className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 min-w-[120px] ${
                                isSending
                                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                    : "bg-indigo-500 hover:bg-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                            }`}
                        >
                            <Mail className="w-4 h-4" />
                            {isSending ? "Enviando..." : emailSent ? "Enviado" : "Enviar"}
                        </button>
                    </div>
                    {error && (
                        <p className="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                            {error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TranscriptionResults;