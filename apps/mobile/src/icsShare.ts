import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// Keeps only [A-Za-z0-9._-] from the last path segment so a server-supplied name cannot escape the cache directory.
export function safeIcsFilename(filename: string): string {
  const last = filename.split(/[\\/]/).pop() ?? "";
  const cleaned = last.replace(/[^A-Za-z0-9._-]/g, "").replace(/^\.+/, "");
  const base = cleaned.replace(/\.ics$/i, "") || "event";
  return `${base}.ics`;
}

// Writes the calendar text to a cache file and opens the OS share sheet for it. The user picks the
// destination; nothing is written to a calendar silently. Throws if the file cannot be written.
export async function shareIcsFile(filename: string, content: string): Promise<"shared" | "unavailable"> {
  const file = new File(Paths.cache, safeIcsFilename(filename));
  file.create({ overwrite: true });
  await file.write(content);
  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  await Sharing.shareAsync(file.uri, { mimeType: "text/calendar", UTI: "public.calendar-event" });
  return "shared";
}
