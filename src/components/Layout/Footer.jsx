import { Link } from "react-router-dom";
import { Table2 } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-excel-green flex items-center justify-center">
                <Table2 size={14} className="text-white" />
              </div>
              <span className="font-semibold text-white text-sm">
                Excel<span className="text-excel-green">Practice</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              A free, browser-based spreadsheet for mastering Excel formulas
              without the bloat.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-medium text-sm mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/practice" className="text-sm hover:text-white transition-colors">
                  Open Spreadsheet
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm hover:text-white transition-colors">
                  Formula Reference
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-white font-medium text-sm mb-3">Connect</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <a
                href="https://github.com/dwilson-coder/excelpractice.git"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://bsky.app/profile/dwilsoncoder.bsky.social"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-white transition-colors"
              >
                Bluesky
              </a>
              <a
                href="https://www.linkedin.com/in/damion-coder-wilson"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-white transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs">
            © {year} ExcelPractice. Built by{" "}
            <a
              href="https://codeboxllc.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              CodeBox LLC
            </a>
            . All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Built with React, Vite & Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}   