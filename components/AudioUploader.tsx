"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  StopCircle,
  Volume2,
  AlertCircle,
} from "lucide-react";
import AudioVisualizer from "./AudioVisualizer";
import { useHasBrowser } from "@/lib/useHasBrowser";
import { getAudioContext, resumeAudioContext, setUserGesture } from "@/lib/audioContext";
import { AudioRecorder } from "@/lib/audioRecorder";
import DiarizedResults from "./DiarizedResults";
import { Transcript, TranscriptUtterance } from "assemblyai";
import TranscriptionResults from "./TranscriptionResults";

const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"];

interface DiarizedTranscript extends Omit<Transcript, 'utterances'> {
  utterances: TranscriptUtterance[];
}

const AudioUploader = () => {
  const hasBrowser = useHasBrowser();

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [diarizedResults, setDiarizedResults] = useState<DiarizedTranscript | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);

  //Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Add isMultipleSpeakers state
  const [isMultipleSpeakers, setIsMultipleSpeakers] = useState(false);
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');

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
    setIsRecording(false);
    setIsLoading(true);
    setError(null);
    setDiarizedResults(null);
    setTranscriptionText(null);

    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!audioRecorderRef.current) {
        throw new Error("No audio recording available");
      }

      const audioBlob = await audioRecorderRef.current.stopRecording();
      const audioFile = new File([audioBlob], "recording.wav", {
        type: "audio/wav",
      });

      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process audio");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setDiarizedResults(data.diarization);
      if (data.transcription) {
        setTranscriptionText(data.transcription.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process audio");
      console.error("Error processing audio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setDiarizedResults(null);
    setTranscriptionText(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process audio");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setDiarizedResults(data.diarization);
      if (data.transcription) {
        setTranscriptionText(data.transcription.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process audio");
      console.error("Error processing audio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-300 to-blue-500 text-transparent bg-clip-text mb-4">
            Audio Transcription App
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto">
            Record your voice to get started with transcription
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-6 lg:space-y-8">
            {/* Multiple Speakers Toggle */}
            <div className="glass-card p-6 rounded-3xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Multiple Speakers</span>
                </div>
                <div 
                  onClick={() => setIsMultipleSpeakers(!isMultipleSpeakers)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isMultipleSpeakers ? 'bg-indigo-500' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isMultipleSpeakers ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Tabs */}
            <div className="glass-card p-4 rounded-3xl">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('record')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === 'record'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Record Audio
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === 'upload'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* Recording Section */}
            {activeTab === 'record' && (
              <div className="glass-card p-8 sm:p-10 rounded-3xl">
                <div className="flex flex-col items-center space-y-8">
                  {/* Recording Status */}
                  <div className={`p-8 rounded-full transition-all duration-500 ${
                    isRecording 
                      ? "bg-red-500/10 animate-pulse" 
                      : "bg-indigo-500/10"
                  }`}>
                    <Mic className={`w-16 h-16 transition-colors duration-500 ${
                      isRecording 
                        ? "text-red-500" 
                        : "text-indigo-500"
                    }`} />
                  </div>

                  {/* Status Text */}
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                      {isRecording ? "Recording in Progress..." : "Ready to Record"}
                    </h3>
                    <p className="text-base text-gray-600 dark:text-gray-300">
                      {isRecording 
                        ? "Click stop when you're done" 
                        : "Click record to start"}
                    </p>
                  </div>

                  {/* Record Button */}
                  <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={!isSpeechSupported}
                    className={`px-8 py-4 rounded-2xl font-medium text-lg transition-all duration-300 flex items-center gap-3 ${
                      !isSpeechSupported 
                        ? "bg-gray-400 cursor-not-allowed" 
                        : isRecording 
                          ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25" 
                          : "bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25"
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <StopCircle className="w-6 h-6" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-6 h-6" />
                        Start Recording
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* File Upload Section */}
            {activeTab === 'upload' && (
              <div className="glass-card p-8 sm:p-10 rounded-3xl">
                <div className="flex flex-col items-center space-y-8">
                  <div className="p-8 rounded-full bg-indigo-500/10">
                    <svg 
                      className="w-16 h-16 text-indigo-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                      Upload Audio File
                    </h3>
                    <p className="text-base text-gray-600 dark:text-gray-300">
                      Supported formats: MP3, WAV, M4A, MP4
                    </p>
                  </div>

                  <div className="w-full max-w-md">
                    <label className="flex flex-col items-center px-4 py-6 bg-white/10 text-gray-200 rounded-xl border-2 border-dashed border-indigo-500/50 cursor-pointer hover:bg-white/20 transition-colors duration-200">
                      <input
                        type="file"
                        className="hidden"
                        accept={ALLOWED_TYPES.join(',')}
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0];
                          if (selectedFile) {
                            handleFileChange(selectedFile);
                          }
                        }}
                        ref={fileInputRef}
                      />
                      <span className="text-sm">Click to browse or drag and drop</span>
                    </label>
                  </div>

                  {file && (
                    <div className="w-full">
                      <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                        <span className="text-gray-200 truncate">{file.name}</span>
                        <button
                          onClick={handleSubmit}
                          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200"
                        >
                          Transcribe
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audio Visualization */}
            <div className="glass-card p-6 sm:p-8 rounded-3xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Volume2 className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  Audio Visualization
                </h3>
              </div>
              <AudioVisualizer
                audioUrl={audioUrl || null}
                mediaStream={mediaStreamRef.current}
                isLive={isRecording}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="glass-card p-6 rounded-3xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-red-500 font-medium">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl min-h-[500px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-500/30 rounded-full animate-spin">
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-500 rounded-full animate-spin-fast" style={{ animationDirection: 'reverse' }}></div>
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">Processing Audio...</p>
              </div>
            ) : diarizedResults ? (
              (() => {
                // Use diarization only when multiple speakers is enabled
                if (isMultipleSpeakers) {
                  return <DiarizedResults utterances={diarizedResults.utterances} />;
                }
                
                // Otherwise use simple transcription
                if (transcriptionText) {
                  return <TranscriptionResults text={transcriptionText} />;
                }
                
                return null;
              })()
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 dark:text-gray-400">
                <Mic className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">No results yet</p>
                <p className="text-sm mt-2">
                  Start recording to see your transcription here
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
