"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { PARTS, META_PAGES, TITLE } from "@/lib/config";
import { TableOfContents } from "./TableOfContents";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
  style?: React.CSSProperties;
}

export default function Sidebar({ className = "", onLinkClick, style }: SidebarProps) {
  const pathname = usePathname();
  const [prevActive, setPrevActive] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (prevActive !== pathname) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevActive(pathname);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pathname, prevActive]);

  return (
    <nav className={`${styles.sidebar} ${className}`} style={style}>
      <div className="mb-6 flex-shrink-0">
        <Link href="/" onClick={onLinkClick} className="text-2xl font-semibold text-neutral-900 hover:text-neutral-600 transition-colors">
          {TITLE}
        </Link>
      </div>
      
      <div className={styles.scrollableContent}>
        {/* Render all Parts (always visible) */}
        {PARTS.map((part: any, partIndex: number) => (
          <div key={`part-${partIndex}`}>
            {/* Add separator between parts (but not before the first one) */}
            {partIndex > 0 && (
              <div className="my-4 border-t border-gray-200"></div>
            )}
            
            <ul className={styles.list}>
              {part.chapters.map((chapter: string[], index: number) => {
                const [title, path] = chapter;
                const href = `/${path}`;
                const isActive = pathname === href || (path === "" && pathname === "/");
                const wasActive = prevActive === href || (path === "" && prevActive === "/");

                return (
                  <li key={path} className={styles.item}>
                    <Link href={href} onClick={onLinkClick} className={`${styles.link} ${isActive ? styles.active : ""}`}>
                      {title}
                    </Link>
                    <div
                      className={`${styles.subsections} ${
                        (isActive || (wasActive && isTransitioning)) && styles.subsectionsVisible
                      }`}
                    >
                      <div
                        className={`${styles.subsectionWrapper} ${
                          isActive ? styles.subsectionWrapperVisible : styles.subsectionWrapperHidden
                        }`}
                      >
                        {(isActive || (wasActive && isTransitioning)) && (
                          <TableOfContents className={styles.tableOfContents} onSubsectionClick={onLinkClick} />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        
        {/* Meta pages */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <ul className={styles.list}>
            {META_PAGES.map((page: string[], index: number) => {
              const [title, path] = page;
              const href = `/${path}`;
              const isActive = pathname === href;
              
              return (
                <li key={path} className={styles.item}>
                  <Link href={href} onClick={onLinkClick} className={`${styles.link} ${isActive ? styles.active : ""}`}>
                    {title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
