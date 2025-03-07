import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { AssemblyAI, Transcript } from "assemblyai";
import { writeFile } from "fs/promises";
import { unlink } from "fs/promises";
import path from "path";
import os from "os";
import { createReadStream } from 'fs';

// Initialize AssemblyAI client
const assemblyClient = new AssemblyAI({
    apiKey: process.env.ASSEMBLY_API_KEY || '',
});

interface TranscriptionResponse {
    transcription: {
        text: string;
    } | null;
    diarization: Transcript | null;
}

export async function POST(request: NextRequest) {
    let tempFilePath: string | null = null;

    try {
        const formData = await request.formData();
        const file: File | null = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }
        
        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Create temp file path
        const tempDir = os.tmpdir();
        const uniqueFileName = `upload-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.name)}`;
        tempFilePath = path.join(tempDir, uniqueFileName);

        // Save file to temp directory
        await writeFile(tempFilePath, buffer);

        // Process both transcription and diarization in parallel
        const [transcriptionResult, diarizationResult] = await Promise.allSettled([
            // Groq transcription
            (async () => {
                const groq = new Groq({
                    apiKey: process.env.GROQ_API_KEY,
                });

                return await groq.audio.transcriptions.create({
                    file: createReadStream(tempFilePath),
                    model: "whisper-large-v3-turbo",
                    response_format: "json",
                    language: "es",
                    temperature: 0.0,
                });
            })(),
            
            // AssemblyAI diarization
            (async () => {
                try {
                    console.log("Starting AssemblyAI upload process...");
                    
                    // Create a new file stream for AssemblyAI
                    const fileStream = createReadStream(tempFilePath);
                    
                    // Upload the file to AssemblyAI
                    console.log("Uploading file to AssemblyAI...");
                    const uploadUrl = await assemblyClient.files.upload(fileStream);
                    console.log("AssemblyAI upload URL:", uploadUrl);
                    
                    if (!uploadUrl || typeof uploadUrl !== 'string') {
                        throw new Error(`Invalid upload URL: ${JSON.stringify(uploadUrl)}`);
                    }

                    // Start the diarization process
                    console.log("Starting diarization process...");
                    const transcript = await assemblyClient.transcripts.create({
                        audio_url: uploadUrl,
                        speaker_labels: true,
                        speakers_expected: 2, // Default to 2 speakers but AssemblyAI will adapt
                        language_code: "es",
                        punctuate: true,
                        format_text: true,
                        // Add additional parameters for better diarization
                        boost_param: "high", // Improve accuracy for challenging audio
                        filter_profanity: false, // Keep all content for better context
                        redact_pii: false, // Keep all content for better context
                    });

                    console.log("Transcript created:", transcript);

                    if (!transcript?.id) {
                        throw new Error("Failed to create transcript");
                    }

                    // Poll for the transcript to complete with better error handling
                    let result = await assemblyClient.transcripts.get(transcript.id);
                    let attempts = 0;
                    const maxAttempts = 60; // 1 minute timeout

                    while (result.status !== 'completed' && result.status !== 'error' && attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        result = await assemblyClient.transcripts.get(transcript.id);
                        attempts++;
                        console.log(`Polling attempt ${attempts}, status: ${result.status}`);
                    }

                    if (attempts >= maxAttempts) {
                        throw new Error("Diarization timed out");
                    }

                    if (result.status === 'error') {
                        throw new Error(result.error || 'Diarization failed');
                    }

                    // Validate diarization results
                    if (!result.utterances || result.utterances.length === 0) {
                        console.warn("No utterances detected in the audio");
                        return null;
                    }

                    // Check if we have valid speaker labels
                    const hasValidSpeakers = result.utterances.some(u => u.speaker && u.speaker !== '');
                    if (!hasValidSpeakers) {
                        console.warn("No valid speaker labels detected");
                        return null;
                    }

                    console.log("Diarization completed successfully");
                    return result;
                } catch (error) {
                    console.error("AssemblyAI Error:", error);
                    if (error instanceof Error) {
                        console.error("Error details:", {
                            message: error.message,
                            stack: error.stack,
                            name: error.name
                        });
                    }
                    return null; // Return null if diarization fails
                }
            })()
        ]);

        // Cleanup: Delete temporary file
        if(tempFilePath) {
            await unlink(tempFilePath);
        }

        // Prepare response
        const response: TranscriptionResponse = {
            transcription: transcriptionResult.status === 'fulfilled' ? transcriptionResult.value : null,
            diarization: diarizationResult.status === 'fulfilled' ? diarizationResult.value : null,
        };

        // If both failed, return error
        if (!response.transcription && !response.diarization) {
            return NextResponse.json({ 
                error: "Both transcription and diarization failed" 
            }, { status: 500 });
        }

        return NextResponse.json(response, { status: 200 });
        
    } catch (error) {
        console.error("Error processing audio:", error);
        
        // Cleanup: Delete temporary file
        if(tempFilePath) {
            try {
                await unlink(tempFilePath);
            } catch (cleanupError) {
                console.error("Error cleaning up temporary file:", cleanupError);
            }
        }

        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Failed to process audio" 
        }, { status: 500 });
    }
}