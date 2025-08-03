"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Dropzone from "react-dropzone";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { useS3Upload } from "next-s3-upload";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RecordingBasics } from "./RecordingBasics";
import { RecordingMinutesLeft } from "./RecordingMinutesLeft";
import { useTogetherApiKey } from "./TogetherApiKeyProvider";
import useLocalStorage from "./hooks/useLocalStorage";
import { useLimits } from "./hooks/useLimits";

// Move getDuration outside handleDrop
const getDuration = (file: File) =>
  new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    audio.onerror = () => reject("Failed to load audio");
    audio.src = URL.createObjectURL(file);
  });

export function UploadModal({ onClose }: { onClose: () => void }) {
  const [language, setLanguage] = useLocalStorage("language", "en");

  const [isProcessing, setIsProcessing] = useState<
    "idle" | "uploading" | "transcribing"
  >("idle");

  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const { uploadToS3 } = useS3Upload();
  const router = useRouter();
  const trpc = useTRPC();
  const { apiKey } = useTogetherApiKey();
  const isBYOK = !!apiKey;
  const transcribeMutation = useMutation(
    trpc.whisper.transcribeFromS3.mutationOptions()
  );
  const queryClient = useQueryClient();
  const { minutesData, isLoading } = useLimits();

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        toast.error(
          "Bad file selected. Please make sure to select an audio file."
        );
        return;
      }
      
      // Reset progress and set file name
      setUploadProgress(0);
      setFileName(file.name);
      setIsProcessing("uploading");
      
      try {
        // Start with duration extraction
        setUploadProgress(10);
        const duration = await getDuration(file);
        
        // Upload to S3 with progress simulation
        setUploadProgress(20);
        const uploadResult = await uploadToS3(file);
        
        setUploadProgress(80);
        
        // Call tRPC mutation for transcription
        setIsProcessing("transcribing");
        setUploadProgress(90);
        
        const { id } = await transcribeMutation.mutateAsync({
          audioUrl: uploadResult.url,
          language,
          durationSeconds: Math.round(duration),
        });
        
        setUploadProgress(100);
        
        // Invalidate dashboard query
        await queryClient.invalidateQueries({
          queryKey: trpc.whisper.listWhispers.queryKey(),
        });
        
        router.push(`/whispers/${id}`);
      } catch (err) {
        console.error("Upload error:", err);
        toast.error("Failed to transcribe audio. Please try again.");
        setIsProcessing("idle");
        setUploadProgress(0);
      }
    },
    [uploadToS3, transcribeMutation, router, language, queryClient]
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[392px] !p-0 border border-gray-200 rounded-tl-xl rounded-tr-xl bg-white overflow-hidden gap-0"
      >
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Upload Voice Audio</DialogTitle>
        </DialogHeader>

        {isProcessing !== "idle" ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
            <img
              src="/loading.svg"
              alt="Loading"
              className="w-8 h-8 animate-spin"
            />
            <p className="text-gray-500">
              {isProcessing === "uploading"
                ? "Uploading audio recording"
                : "Transcribing audio..."}
              <span className="animate-pulse">...</span>
            </p>
          </div>
        ) : (
          <>
            <RecordingBasics
              language={language}
              setLanguage={setLanguage}
              disabled={isProcessing !== "idle"}
            />
            <Dropzone
              multiple={false}
              accept={{
                // MP3 audio
                "audio/mpeg3": [".mp3"],
                "audio/x-mpeg-3": [".mp3"],
                // WAV audio
                "audio/wav": [".wav"],
                "audio/x-wav": [".wav"],
                "audio/wave": [".wav"],
                "audio/x-pn-wav": [".wav"],
                // iPhone voice notes (M4A)
                "audio/mp4": [".m4a"],
                "audio/m4a": [".m4a"],
                "audio/x-m4a": [".m4a"],
              }}
              onDrop={handleDrop}
              onDragEnter={() => setIsDragActive(true)}
              onDragLeave={() => setIsDragActive(false)}
              onDropAccepted={() => setIsDragActive(false)}
              onDropRejected={() => setIsDragActive(false)}
            >
              {({ getRootProps, getInputProps }) => (
                <div
                  {...getRootProps()}
                  className="flex flex-col justify-start items-start relative overflow-hidden bg-white cursor-pointer"
                >
                  <input {...getInputProps()} />
                  <div className="relative bg-white p-5 w-full">
                    <div className="relative overflow-hidden rounded-xl bg-gray-100 border-2 border-[#d1d5dc] border-dashed min-h-[86px] flex justify-center items-center flex-col gap-1">
                      <div className="flex justify-center items-center relative gap-2.5 px-3 py-2 rounded-lg bg-[#101828]">
                        <img
                          src="/uploadWhite.svg"
                          className="size-[18px] min-w-[18px]"
                        />
                        <p className="text-base font-semibold text-left text-white">
                          Upload a Recording
                        </p>
                      </div>
                      <p className="text-xs text-center text-[#4a5565]">
                        Or drag‑and‑drop here
                      </p>
                      
                      {/* Progress overlay for uploading */}
                      {isProcessing !== "idle" && (
                        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-20 pointer-events-none">
                          <div className="flex flex-col items-center gap-3 w-4/5">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-sm font-medium text-slate-700">
                                {isProcessing === "uploading" ? "Uploading..." : "Transcribing..."}
                              </span>
                            </div>
                            
                            {fileName && (
                              <div className="text-xs text-slate-500 truncate max-w-full">
                                {fileName}
                              </div>
                            )}
                            
                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            
                            <div className="text-xs text-slate-500">
                              {uploadProgress}% complete
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {isDragActive && isProcessing === "idle" && (
                        <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-10 pointer-events-none">
                          <span className="text-blue-700 font-semibold">
                            Drop audio file here
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative overflow-hidden px-5 py-3 w-full border-t border-gray-200">
                    {isLoading ? (
                      <span className="text-sm text-[#4a5565]">Loading...</span>
                    ) : (
                      <RecordingMinutesLeft
                        minutesLeft={
                          isBYOK ? Infinity : minutesData?.remaining ?? 0
                        }
                      />
                    )}
                  </div>
                </div>
              )}
            </Dropzone>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
