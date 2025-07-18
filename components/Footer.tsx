// Used to have style: border-t border-neutral-200

export default function Footer() {
  return (
    <footer className="mt-4">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="pt-4 pb-12" style={{ marginLeft: "calc(max((100% - var(--content-width)) / 2 + 1rem, 0rem))" }}>
          <p className="text-base text-neutral-500">
            {/* Contact us at{" "}
            <a href="mailto:jk@acsresearch.org" className="hover:text-neutral-700 font-mono text-sm">
              gavento@acsresearch.org
            </a>*/}
          </p>
        </div>
      </div>
    </footer>
  );
}
