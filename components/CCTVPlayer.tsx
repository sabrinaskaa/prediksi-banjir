"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function CCTVPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let hls: Hls | null = null;

    // Safari biasanya support native HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 60,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        // biar gak crash, cukup log
        console.warn("[HLS ERROR]", data?.type, data?.details);
      });
    } else {
      // fallback minimal
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      try {
        if (hls) hls.destroy();
      } catch {}
    };
  }, [url]);

  return (
    <div className="rounded-xl overflow-hidden border bg-black">
      <video
        ref={videoRef}
        controls
        muted
        playsInline
        className="w-full h-[220px] object-contain bg-black"
      />
    </div>
  );
}
