"use client";

import { useRouter } from "next/navigation";
import { URLDropZone } from "@/components/url-analysis/URLDropZone";

export default function URLAnalysisPage() {
  const router = useRouter();

  const handleStart = (url: string) => {
    router.push(`/dashboard/url-analysis/new?url=${encodeURIComponent(url)}`);
  };

  const handleCompare = (urls: string[]) => {
    router.push(`/dashboard/url-analysis/compare?urls=${encodeURIComponent(urls.join(","))}`);
  };

  return <URLDropZone onStart={handleStart} onCompare={handleCompare} />;
}
