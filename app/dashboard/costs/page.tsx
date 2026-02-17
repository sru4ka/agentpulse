"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CostsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/activity");
  }, [router]);
  return null;
}
