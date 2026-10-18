import React, { useEffect, useRef, useState } from "react";

interface Props {
  value: string | null;
  onChange: (uri: string) => void;
}

type CameraState = "idle" | "starting" | "live" | "unavailable";

/**
 * Captures a live selfie via the device camera (front-facing where available)
 * for rider identity verification — distinct from the document uploads, which
 * accept existing photos/scans. Falls back to a plain file picker if the browser
 * or device has no camera / denies permission, so the form never gets stuck.
 */
export const FaceCapture: React.FC<Props> = ({ value, onChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => stopStream, []);

  const startCamera = async () => {
    setError(null);
    setState("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera not supported in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("live");
    } catch {
      setError("Couldn't access the camera. You can upload a photo instead.");
      setState("unavailable");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Center-crop to a square and mirror it so the preview matches what the
    // person saw of themselves while the camera was live.
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    onChange(canvas.toDataURL("image/jpeg", 0.85));
    stopStream();
    setState("idle");
  };

  const retake = () => {
    onChange("");
    startCamera();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(URL.createObjectURL(file));
  };

  if (value) {
    return (
      <div style={{ textAlign: "center", margin: "0 22px 14px" }}>
        <img
          src={value}
          alt="Captured selfie"
          style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--green)" }}
        />
        <div>
          <button type="button" className="link-text" style={{ background: "none", border: "none", fontSize: 12, marginTop: 10 }} onClick={retake}>
            Retake photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: "0 22px 14px" }}>
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: "50%",
          overflow: "hidden",
          margin: "0 auto 12px",
          background: "var(--bg)",
          border: "2px dashed var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {state === "live" ? (
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        ) : (
          <span style={{ fontSize: 40 }}>🤳</span>
        )}
      </div>

      {state === "live" ? (
        <button type="button" className="btn btn-primary" onClick={capture} style={{ maxWidth: 220, margin: "0 auto" }}>
          📸 Capture
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={startCamera} disabled={state === "starting"} style={{ maxWidth: 240, margin: "0 auto" }}>
          {state === "starting" ? "Starting camera…" : "Take a selfie"}
        </button>
      )}

      {error && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <p style={{ fontSize: 11.5, color: "var(--danger)", marginBottom: 6 }}>{error}</p>
          <button type="button" className="link-text" style={{ background: "none", border: "none", fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>
            Upload a photo instead
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        </div>
      )}
    </div>
  );
};
