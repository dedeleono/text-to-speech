// Define the interface for window with WebKit prefix
interface WindowWithWebKit {
    webkitAudioContext: typeof AudioContext;
}

let audioContext: AudioContext | null = null;
let hasUserGesture = false;

export function setUserGesture() {
    hasUserGesture = true;
}

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

        // Only attempt to resume if we have user gesture
        if(hasUserGesture && audioContext.state === "suspended") {
            await audioContext.resume();
        }

        return audioContext;
    } catch (error) {
        console.error("Error initializing AudioContext:", error);
        throw error;
    }
}

export async function resumeAudioContext(): Promise<void> {
    if (!hasUserGesture) {
        throw new Error("AudioContext can only be resumed after a user gesture");
    }

    if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
    }
}

export function closeAudioContext() {
    if(audioContext) {
        audioContext.close().catch(console.error);
        audioContext = null;
    }
}

// Add a utility function to check if AudioContext is available and active
export function isAudioContextAvailable(): boolean {
    return !!(audioContext && audioContext.state === "running");
}