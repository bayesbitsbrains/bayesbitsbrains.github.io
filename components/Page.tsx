import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import { CitationsProvider, References } from "./content/Citations";
import { loadBibtexFromFile } from "@/lib/citations";
import { getMdxContent } from "@/lib/lib";
import { referencesPath } from "@/lib/config";
import { Footnotes, FootnotesProvider } from "./content/Footnotes";
import { EquationProvider } from "./content/EquationContext";
import styles from "./Page.module.css";
import ViewTracker from "./ViewTracker";
import ChapterNavigation from "./ChapterNavigation";
import FeedbackButton from "./FeedbackButton";

interface PageProps {
  children: ReactNode;
}

export default async function Page({ children }: PageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ViewTracker />
      <Header />
      <div className="flex-1">
        <Sidebar
          className="xl:w-60 lg:w-52 hidden lg:block fixed top-16 bottom-0 pt-16 text-base"
          style={{ left: "var(--sidebar-offset)" }}
        />
        <main className={`${styles.main} max-w-[var(--content-width)] mx-auto px-4 pt-12 pb-8`}>{children}</main>
      </div>
      <Footer />
      <FeedbackButton />
    </div>
  );
}

export async function singlePage(path: string) {
  const content = await getMdxContent(path);
  const references = await loadBibtexFromFile(referencesPath);
  return (
    <EquationProvider>
      <CitationsProvider data={references}>
        <FootnotesProvider>
          <article className={`${styles.article} prose prose-neutral max-w-none`}>
            {content}
            <Footnotes headerLevel={0} />
            <References />
            <ChapterNavigation currentPath={path} />
          </article>
        </FootnotesProvider>
      </CitationsProvider>
    </EquationProvider>
  );
}
