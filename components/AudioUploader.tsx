"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Upload,
  Loader2,
  StopCircle,
  Volume2,
  FileAudio,
} from "lucide-react";
import TranscriptionResults from "./TranscriptionResults";
import AudioVisualizer from "./AudioVisualizer";
import { useHasBrowser } from "@/lib/useHasBrowser";
import { getAudioContext, resumeAudioContext, setUserGesture } from "@/lib/audioContext";
import { AudioRecorder } from "@/lib/audioRecorder";

const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"];

const AudioUploader = () => {
  const hasBrowser = useHasBrowser();

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [error, setError] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);

  //Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  //Check for speech recognition support
  useEffect(() => {
    if (hasBrowser) {
      const speechSupported =
        "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
      setIsSpeechSupported(speechSupported);
    }
  }, [hasBrowser]);

  useEffect(() => {
    if (!hasBrowser) {
      return;
    }
  }, [hasBrowser]);

  useEffect(() => {
    const mediaStream = mediaStreamRef.current;
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stopRecording().catch(console.error);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Initialize AudioContext on mount
  useEffect(() => {
    if (hasBrowser) {
      const initContext = async () => {
        try {
          const context = await getAudioContext();
          setAudioContext(context);
        } catch (error) {
          console.error("Failed to initialize AudioContext:", error);
        }
      };
      initContext();
    }
  }, [hasBrowser]);

  const handleFileChange = (selectedFile: File) => {
    setError("");

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Invalid file type. Please upload a valid audio file.");
      return;
    }

    const maxSize = 25 * 1024 * 1024; //25MB
    if (selectedFile.size > maxSize) {
      setError("File size exceeds the maximum limit of 25MB.");
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setFile(selectedFile);
    setAudioUrl(URL.createObjectURL(selectedFile));

    if (isRecording) {
      handleStopRecording();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleStartRecording = async () => {
    if (!isRecording) {
      try {
        // Set user gesture flag
        setUserGesture();

        // Reset state
        setError("");
        setTranscription("");

        // Ensure AudioContext is initialized and resumed
        if (audioContext) {
          await resumeAudioContext();
        }

        // Check if running on iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
        if (isIOS) {
          // On iOS, we need to ensure the user has granted permissions
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permissionStatus.state === 'denied') {
            setError("Microphone access is blocked. Please enable it in your iOS Settings > Safari > Settings for this website.");
            return;
          }
        }

        // Create new AudioRecorder instance
        audioRecorderRef.current = new AudioRecorder();
        
        // Start recording
        await audioRecorderRef.current.startRecording();
        setIsRecording(true);

      } catch (error) {
        console.error("Error starting recording:", error);
        let errorMessage = "Failed to start recording. ";

        if (error instanceof DOMException) {
          switch (error.name) {
            case "NotAllowedError":
              errorMessage = "Please allow microphone access in your browser settings.";
              break;
            case "NotFoundError":
              errorMessage = "No microphone found. Please connect a microphone and try again.";
              break;
            case "NotReadableError":
              errorMessage = "Microphone is in use by another application.";
              break;
            case "SecurityError":
              errorMessage = "Microphone access is blocked. Please check your browser settings.";
              break;
            default:
              errorMessage += "Please check your microphone settings.";
          }
        }

        setError(errorMessage);
        setIsRecording(false);
      }
    }
  };

  const handleStopRecording = async () => {
    if (audioRecorderRef.current && isRecording) {
      try {
        console.log("Stopping recording...");
        
        // Stop recording and get the audio blob
        const audioBlob = await audioRecorderRef.current.stopRecording();
        
        // Create form data and send to API
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        setIsLoading(true);
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to transcribe audio");
        }

        setTranscription(data.text);
      } catch (error) {
        console.error("Error stopping recording:", error);
        setError(error instanceof Error ? error.message : "Failed to process recording");
      } finally {
        setIsLoading(false);
        setIsRecording(false);
        audioRecorderRef.current = null;
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");
    setTranscription("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Failed to transcribe audio.");
      }

      setTranscription(data.text);
    } catch (error) {
      console.error("Error submitting audio: ", error);
      setError(
        "An error occurred while submitting the audio. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-purple-300 to-blue-500 text-transparent bg-clip-text mb-4">
            Audio Transcription App
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Upload your audio file or record directly to get started with
            transcription
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="relative group">
              <div
                className={`p-10 rounded-3xl backdrop-blur-xl transition-all duration-300 ${
                  isRecording
                    ? "bg-red-50/90 dark:bg-red-900/20 border-2 border-red-500 shadow-red-500/20"
                    : "bg-white/50 dark:bg-gray-800/50 hover:bg-white/60 dark:hover:bg-gray-800/60"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center space-y-8">
                  <div
                    className={`p-6 rounded-full transition-all duration-300 group-hover:scale-110 ${
                      isRecording
                        ? "bg-red-100 dark:bg-red-900/50"
                        : "bg-indigo-100 dark:bg-indigo-900/20"
                    }`}
                  >
                    {isRecording ? (
                      <FileAudio className="w-12 h-12 text-red-600 dark:text-red-400" />
                    ) : (
                      <FileAudio className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <div className="text-center space-y-3">
                    <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                      {isRecording ? "Recording..." : "Drop or Click to Upload"}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {isRecording
                        ? "Your audio is being recorded"
                        : "Supported formats: MP3, WAV, M4A"}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    accept={ALLOWED_TYPES.join(",")}
                    className="hidden"
                  />
                  {!isRecording && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30"
                    >
                      Choose File
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-3xl backdrop-blur-xl transition-all duration-300">
              <div className="flex items-center justify-between gap-4 mb-6">
                <Volume2 className="w-7 h-7 text-gray-800 dark:text-gray-200" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Audio Visualization
                </h3>
              </div>
              <AudioVisualizer
                audioUrl={audioUrl}
                mediaStream={mediaStreamRef.current}
                isLive={isRecording}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={handleSubmit}
                disabled={!file || isLoading}
                className={`flex items-center justify-center gap-2 font-semibold py-3 px-6 rounded-full transition-all duration-300 ${
                  !file || isLoading
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Transcribe Audio
                  </>
                )}
              </button>
              <button
                onClick={
                  isRecording ? handleStopRecording : handleStartRecording
                }
                disabled={!isSpeechSupported}
                className={`flex items-center justify-center gap-2 font-semibold py-3 px-6 rounded-full transition-all duration-300 ${
                  !isSpeechSupported
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    : isRecording
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30"
                    : "bg-indigo-500 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30"
                }`}
              >
                {isRecording ? (
                  <>
                    <StopCircle className="w-5 h-5" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Record
                  </>
                )}
              </button>
            </div>
            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>
          <div className="relative bg-white/50 dark:bg-gray-800/50 p-8 rounded-3xl backdrop-blur-xl">
            {transcription ? (
              <TranscriptionResults text={transcription} />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 dark:text-gray-400">
                <FileAudio className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">No transcription results yet.</p>
                <p className="text-sm mt-2">
                  Upload an audio file or start recording to see results here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioUploader;
