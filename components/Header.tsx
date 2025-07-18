"use client";

import Link from "next/link";
import { TITLE } from "@/lib/config";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isRootPage = pathname === "/";

  const handleClose = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent body scrolling when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header
        className={`sticky left-0 right-0 top-0 z-50 bg-white/80 backdrop-blur-sm gap-0 transition-all duration-200 ${
          scrolled ? "py-0" : "py-2"
        }`}
      >
        <div className="max-w-[var(--content-width)] mx-auto px-2 sm:px-4 py-6 flex h-16 items-center justify-end">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="top-16 fixed inset-0 bg-neutral-100/80 backdrop-blur-sm shadow-xl" onClick={handleClose} />
        <div
          className={`top-16 fixed inset-x-0 bottom-0 bg-white shadow-xl transition-transform duration-300 overflow-y-auto ${
            isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div
            className="w-full min-h-full"
            style={{ marginLeft: "calc(max((100% - var(--content-width)) / 2 + 1rem, 2rem))" }}
          >
            <Sidebar className="py-6 text-lg" onLinkClick={handleClose} />
          </div>
        </div>
      </div>
    </>
  );
}
