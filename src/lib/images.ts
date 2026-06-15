import IMAGE_MAP from "../data/image-map";

const BASE = import.meta.env.BASE_URL || "/";
const BASE_URL = BASE.replace(/\/$/, "");

export function toImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) {
    const fileId = match[1];
    const local = IMAGE_MAP[fileId];
    if (local) return `${BASE_URL}${local}`;
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
  return url;
}
