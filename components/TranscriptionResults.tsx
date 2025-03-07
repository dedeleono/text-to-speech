import {FileText, Copy, CheckCircle, AlertCircle} from "lucide-react";
import {useState} from "react";
import EmailSection from './EmailSection';

interface TranscriptionResultsProps {
    text: string;
}

const TranscriptionResults = ({text}: TranscriptionResultsProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    }

    const handleSendEmail = async (email: string) => {
        const response = await fetch('/api/send-transcript', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                utterances: [{
                    speaker: "A",
                    text: text,
                    confidence: 1,
                    start: 0,
                    end: 0
                }]
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send email');
        }
    };

    if (!text || text.trim() === '') {
        return (
            <div className="h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transcription Results</h2>
                    </div>
                </div>
                <div className="glass-card p-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <AlertCircle className="w-12 h-12 text-yellow-500" />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                No Speech Detected
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                The audio file appears to contain no speech or the speech was not clear enough to transcribe.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transcription Results</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleCopy} 
                            className="btn-primary text-sm py-2 px-4"
                            title="Copy to clipboard"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{text}</p>
                </div>
            </div>

            <EmailSection onSendEmail={handleSendEmail} />
        </div>
    )
}

export default TranscriptionResults;