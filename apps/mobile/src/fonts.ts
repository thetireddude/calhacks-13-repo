import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";

export const FONT_LOAD_TIMEOUT_MS = 4000;

export type FontState = "loading" | "loaded" | "failed";

// Resolves once fonts are loaded or failed; a failure falls back to system fonts so the app still works.
export function useAppFonts(): FontState {
  const [loaded, error] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);
  // If loading never settles, proceed with system fonts rather than rendering nothing forever.
  return loaded ? "loaded" : error || timedOut ? "failed" : "loading";
}
