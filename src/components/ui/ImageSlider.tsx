import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function toImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  return url;
}

interface Props {
  images: (string | null | undefined)[];
  alt: string;
  aspectSquare?: boolean;
  onImageClick?: (urls: string[], idx: number) => void;
}

export default function ImageSlider({ images, alt, aspectSquare = true, onImageClick }: Props) {
  const valid = images.filter(Boolean) as string[];
  const urls = valid.map(toImageUrl);
  const [idx, setIdx] = useState(0);
  const touchX = useRef(0);
  const [transitioning, setTransitioning] = useState(false);

  const slide = useCallback((dir: 1 | -1) => {
    if (transitioning) return;
    setTransitioning(true);
    setIdx((i) => {
      const next = i + dir;
      if (next < 0) return urls.length - 1;
      if (next >= urls.length) return 0;
      return next;
    });
    setTimeout(() => setTransitioning(false), 300);
  }, [transitioning, urls.length]);

  if (!urls.length) {
    return <div className={`flex items-center justify-center bg-gradient-to-br from-[#242424] to-[#1a1a1a] ${aspectSquare ? "aspect-square" : ""}`} />;
  }

  const navBtn = "absolute top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all z-10";

  return (
    <div className={`relative overflow-hidden group ${aspectSquare ? "aspect-square" : ""}`}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = touchX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) slide(diff > 0 ? 1 : -1);
      }}>
      <div className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}>
        {urls.map((url, i) => (
          <div key={i} className="w-full h-full shrink-0 overflow-hidden">
            <img src={url} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer" loading="lazy" onClick={() => onImageClick?.(urls, i)} />
          </div>
        ))}
      </div>

      {urls.length > 1 && (
        <>
          <button onClick={() => slide(-1)} type="button" className={`left-2 ${navBtn}`}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => slide(1)} type="button" className={`right-2 ${navBtn}`}>
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {urls.map((_, i) => (
              <button key={i} onClick={() => { if (!transitioning) setIdx(i); }} type="button"
                className={`rounded-full transition-all duration-300 ${i === idx ? "h-2.5 w-2.5 bg-[#f97316] scale-110" : "h-2 w-2 bg-white/40 hover:bg-white/70"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
