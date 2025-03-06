import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { writeFile } from "fs/promises";
import { unlink } from "fs/promises";
import path from "path";
import os from "os";
import { createReadStream } from 'fs';

export async function POST(request: NextRequest) {
    // const groq = new Groq({
    //     apiKey: process.env.GROQ_API_KEY,
    // });

    let tempFilePath: string | null = null;

    try {
        const fromData = await request.formData();
        const file: File | null = fromData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }
        
        //Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer()); //to temporarily save the file and handle it with binary data

        //create temp file path
        const tempDir = os.tmpdir();

        //Unique file path name
        const uniqueFileName = `upload-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.name)}`;
        tempFilePath = path.join(tempDir, uniqueFileName);

        //Save file to temp directory - write the buffer to the temporary file
        await writeFile(tempFilePath, buffer);
        
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        const transcription = await groq.audio.transcriptions.create({
            file: createReadStream(tempFilePath),
            model: "whisper-large-v3",
            response_format: "json",
            language: "en",
            temperature: 0.0,
        });

        //Cleanup: Delete temporary file
        if(tempFilePath) {
            await unlink(tempFilePath);
        }

        return NextResponse.json(transcription, { status: 200 });
        
    } catch (error) {

        console.error("Error transcribing audio:", error);
        //Cleanup: Delete temporary file
        if(tempFilePath) {
            try {
                await unlink(tempFilePath);
            } catch (cleanupError) {
                console.error("Error cleaning up temporary file:", cleanupError);
            }
        }

        return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 });
    }
    
    
}