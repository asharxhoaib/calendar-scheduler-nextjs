import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Calendar Scheduler",
  description:
    "A full-featured calendar and scheduling app with drag-to-create events, recurrence, conflict detection, reminders, and ICS import/export.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Prevents a flash of the wrong theme by reading localStorage before paint.
const themeInitScript = `
(function () {
  try {
    var raw = localStorage.getItem("calendar-scheduler-ui");
    var isDark = false;
    if (raw) {
      var parsed = JSON.parse(raw);
      isDark = !!(parsed && parsed.state && parsed.state.isDarkMode);
    } else {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
