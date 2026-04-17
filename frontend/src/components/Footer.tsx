import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#1E293B]/30 mt-auto glass rounded-none backdrop-blur-3xl bg-[#0d0e10]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 text-[#64748B]">
            <a
              href="https://github.com/theGautham/cleansky-monitor"
              className="hover:text-[#78EAF8] transition-colors"
              aria-label="Github"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1E293B]/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#64748B] uppercase tracking-wider">
            &copy; {new Date().getFullYear()} CleanSky. All rights reserved.
          </p>
          <p className="text-xs text-[#64748B] uppercase tracking-wider">
            Powered by XG BOOST 3.2.0{" "}
            <span className="text-[#78EAF8] mx-2">✦</span> Breathe safe
          </p>
        </div>
      </div>
    </footer>
  );
}
