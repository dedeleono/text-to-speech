import { NextRequest, NextResponse } from "next/server";
import { sendTranscriptEmail } from "@/lib/transcriptEmail";

export async function POST(request: NextRequest) {
    try {
        const { email, transcript } = await request.json();

        if (!email || !transcript) {
            return NextResponse.json(
                { error: "Email and transcript are required" },
                { status: 400 }
            );
        }

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