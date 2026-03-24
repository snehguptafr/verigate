/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from "react";

interface PhotoCaptureProps {
  onCapture: (base64: string) => void;
  onSkip?: () => void;
}

export default function PhotoCapture({ onCapture, onSkip }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setReady(true);
          };
        }
      })
      .catch(() => console.error("Camera access denied"));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg");
    setCaptured(base64);
  };

  const retake = () => setCaptured(null);

  const confirm = () => {
    if (captured) onCapture(captured);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {!captured ? (
        <>
          <div className="rounded-2xl overflow-hidden border-4 border-gray-200 w-64 h-64">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3">
            <button
              onClick={capture}
              disabled={!ready}
              className="bg-black text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              Take Photo
            </button>
            {onSkip && (
              <button
                onClick={onSkip}
                className="border px-6 py-2 rounded-lg text-sm text-gray-500"
              >
                Skip
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden border-4 border-green-400 w-64 h-64">
            <img src={captured} className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={confirm}
              className="bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-semibold"
            >
              Looks Good
            </button>
            <button
              onClick={retake}
              className="border px-6 py-2 rounded-lg text-sm text-gray-500"
            >
              Retake
            </button>
          </div>
        </>
      )}
    </div>
  );
}
