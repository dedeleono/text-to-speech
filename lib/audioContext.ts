// Define the interface for window with WebKit prefix
interface WindowWithWebKit {
    webkitAudioContext: typeof AudioContext;
}

let audioContext: AudioContext | null = null;

export async function getAudioContext(): Promise<AudioContext> {
    if(typeof window === "undefined") {
        throw new Error("AudioContext is only available in the browser");
    }

    try {
        if(!audioContext) {
            const AudioContext = 
                window.AudioContext || (window as unknown as WindowWithWebKit).webkitAudioContext;

            audioContext = new AudioContext();
        }

        //Resume the audio context if it's suspended

        if(audioContext.state === "suspended"){
            await audioContext.resume();
        }

        return audioContext;
    } catch (error) {
        console.error("Error initializing AudioContext:", error);
        throw error;
    }
}

export function closeAudioContext() {
    if(audioContext) {
        audioContext.close().catch(console.error);
        audioContext = null;
    }
}

//Add a utilty functino to check if AudioConect is available and active
export function isAudioContextAvailable(): boolean {
    return !!(audioContext && audioContext.state === "running");
}