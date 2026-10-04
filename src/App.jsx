import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/Layout";
import { Home, Practice, About } from "./pages";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/about" element={<About />} />
          <Route
            path="*"
            element={
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>
                <p className="text-gray-500 mb-6">Page not found.</p>
                <a href="/" className="btn-primary">
                  Go Home
                </a>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}   