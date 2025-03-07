export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: BlobPart[] = [];
    private stream: MediaStream | null = null;
    private mimeType: string;

    constructor() {
        this.mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";
    }

    async startRecording(): Promise<void> {
        try {
            // Get user media stream
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: this.mimeType,
                audioBitsPerSecond: 128000
            });

            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    console.log("Data available:", event.data.size, "bytes");
                    this.chunks.push(event.data);
                    console.log("Total chunks:", this.chunks.length);
                }
            };

            // Start recording
            this.mediaRecorder.start(100);
            console.log("MediaRecorder started with state:", this.mediaRecorder.state);
        } catch (error) {
            console.error("Error starting recording:", error);
            this.cleanup();
            throw error;
        }
    }

    stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error("No active recording"));
                return;
            }

            this.mediaRecorder.onstop = async () => {
                try {
                    console.log("Recording stopped, processing chunks...");
                    console.log("Current chunks before processing:", this.chunks.length);

                    // Wait a bit to ensure all chunks are collected
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    console.log("Chunks collected:", this.chunks.length);
                    console.log("Chunk sizes:", this.chunks.map(chunk => chunk instanceof Blob ? chunk.size : 0));

                    if (this.chunks.length === 0) {
                        throw new Error("No audio data was recorded");
                    }

                    const audioBlob = new Blob(this.chunks, { type: this.mimeType });
                    
                    if (audioBlob.size === 0) {
                        throw new Error("Audio recording is empty");
                    }

                    console.log("Audio blob created:", audioBlob.size, "bytes");
                    resolve(audioBlob);
                } catch (error) {
                    console.error("Error processing recording:", error);
                    reject(error);
                } finally {
                    this.cleanup();
                }
            };

            // Request final data and stop recording
            this.mediaRecorder.requestData();
            this.mediaRecorder.stop();
            console.log("MediaRecorder stopped");
        });
    }

    private cleanup(): void {
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.chunks = [];
    }
} 