import { NextRequest, NextResponse } from "next/server";
import { sendTranscriptEmail } from "@/lib/transcriptEmail";

interface Utterance {
    start: number;
    end: number;
    speaker: number;
    text: string;
}

export async function POST(request: NextRequest) {
    try {
        const { email, utterances } = await request.json();

        if (!email || !utterances) {
            return NextResponse.json(
                { error: "Email and utterances are required" },
                { status: 400 }
            );
        }

        // Format utterances into transcript format
        const transcript = utterances
            .map((u: Utterance) => {
                const time = `${formatTime(u.start)} - ${formatTime(u.end)}`;
                return `[Hablante ${u.speaker}] (${time})\n${u.text}\n`;
            })
            .join('\n');

        await sendTranscriptEmail(email, transcript);

        return NextResponse.json(
            { message: "Transcript sent successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error sending transcript email:", error);
        return NextResponse.json(
            { error: "Failed to send transcript email" },
            { status: 500 }
        );
    }
}

const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}; 