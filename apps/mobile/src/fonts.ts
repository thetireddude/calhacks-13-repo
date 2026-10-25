import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";

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
  return loaded ? "loaded" : error ? "failed" : "loading";
}
