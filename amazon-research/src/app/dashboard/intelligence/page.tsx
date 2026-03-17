"use client";

import { useRouter } from "next/navigation";
import { IntelligenceLanding } from "@/components/intelligence/IntelligenceLanding";

export default function IntelligencePage() {
  const router = useRouter();

  const handleStart = (capital: number) => {
    router.push(`/dashboard/intelligence/new?capital=${capital}`);
  };

  return <IntelligenceLanding onStart={handleStart} />;
}
