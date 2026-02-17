"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  // Close menu on route change or resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#1A1A1D] transition"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <div className="w-5 flex flex-col gap-[5px]">
          <span
            className={`block h-[2px] bg-[#FAFAFA] rounded-full transition-all duration-200 ${
              open ? "rotate-45 translate-y-[7px]" : ""
            }`}
          />
          <span
            className={`block h-[2px] bg-[#FAFAFA] rounded-full transition-all duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-[2px] bg-[#FAFAFA] rounded-full transition-all duration-200 ${
              open ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          />
        </div>
      </button>

      {/* Overlay + dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 bg-[#0A0A0B] border-b border-[#2A2A2D] z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col p-4 space-y-1">
              <a
                href="#features"
                onClick={() => setOpen(false)}
                className="text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#141415] px-4 py-3 rounded-lg transition text-sm"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={() => setOpen(false)}
                className="text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#141415] px-4 py-3 rounded-lg transition text-sm"
              >
                Pricing
              </a>
              <a
                href="#how-it-works"
                onClick={() => setOpen(false)}
                className="text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#141415] px-4 py-3 rounded-lg transition text-sm"
              >
                How It Works
              </a>
              <Link
                href="/docs"
                onClick={() => setOpen(false)}
                className="text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#141415] px-4 py-3 rounded-lg transition text-sm"
              >
                Docs
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#141415] px-4 py-3 rounded-lg transition text-sm"
              >
                Login
              </Link>
              <div className="pt-2">
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-4 py-3 rounded-lg transition text-sm font-medium"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
