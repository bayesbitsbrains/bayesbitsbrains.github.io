import "katex/dist/katex.min.css";
import { singlePage } from "@/components/Page";
import { getAllMdxPaths } from "@/lib/lib";
import { rootSlug, PARTS, META_PAGES } from "@/lib/config";
import { redirect, notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    path: string[];
  }>;
}

export async function generateStaticParams() {
  const paths: string[][] = [];
  
  // Add all chapter paths from PARTS
  PARTS.forEach(part => {
    part.chapters.forEach(([_, slug]) => {
      if (slug && slug !== "") {
        paths.push([slug]);
      }
    });
  });
  
  // Add all meta pages
  META_PAGES.forEach(([_, slug]) => {
    if (slug && slug !== "") {
      paths.push([slug]);
    }
  });
  
  // Add any other MDX files that might not be in config
  const allMdxFiles = getAllMdxPaths();
  allMdxFiles.forEach(file => {
    // Only add if not already included
    if (!paths.some(p => p[0] === file)) {
      paths.push([file]);
    }
  });
  
  return paths.map(path => ({ path }));
}

export default async function ChapterPage({ params }: PageProps) {
  const path = (await params).path.join("/");

  // Redirect /00-riddles to the root page
  if (path === "00-riddles" || path === "00-riddles/") {
    redirect("/");
  }

  // Check if the path looks like a static file and return 404
  const staticFileExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".js", ".css", ".map"];
  const hasStaticExtension = staticFileExtensions.some((ext) => path.toLowerCase().endsWith(ext));
  
  // Also check for common static file paths
  const isStaticPath = path === "favicon.ico" || 
                      path.startsWith("_next/") || 
                      path.includes("/static/") ||
                      hasStaticExtension;

  if (isStaticPath) {
    // This is a static file request, return not found to let static assets handle it
    notFound();
  }

  return singlePage(path);
}
