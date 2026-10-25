import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import type { TextStyle } from "react-native";

// Design tokens from the Gather design system (DEV1-013). Light and dark follow the system scheme.
export type Colors = {
  coral: string;
  bg: string; // screen background (Cream / Night)
  surface: string;
  ink: string;
  muted: string;
  peach: string;
  butter: string;
  mint: string;
  sky: string;
  lilac: string;
  onCoral: string; // text on coral buttons
  danger: string; // error text/icon
  dangerBg: string; // error banner background
};

export const lightColors: Colors = {
  coral: "#FF6B4A",
  bg: "#FFF8F3",
  surface: "#FFFFFF",
  ink: "#2A1F1B",
  muted: "#6B5C55",
  peach: "#FFE0D2",
  butter: "#FFF0BD",
  mint: "#D6F0E3",
  sky: "#DAEAFB",
  lilac: "#E7DFFA",
  onCoral: "#2A1F1B",
  danger: "#B3261E",
  dangerBg: "#FBE4E0",
};

export const darkColors: Colors = {
  coral: "#FF6B4A",
  bg: "#1B1513",
  surface: "#2A211E",
  ink: "#FBEEE8",
  muted: "#C4B1A8",
  peach: "#4B2C23",
  butter: "#473D1C",
  mint: "#1E3B2E",
  sky: "#1F3446",
  lilac: "#352F52",
  onCoral: "#1B1513",
  danger: "#FF9C8F",
  dangerBg: "#4B2420",
};

export type TypeVariant = "display" | "title" | "heading" | "body" | "small" | "label";
export type TypeStyle = Pick<TextStyle, "fontFamily" | "fontWeight" | "fontSize" | "lineHeight" | "letterSpacing" | "textTransform">;

export const fontFamilies = {
  displayBold: "BricolageGrotesque_700Bold",
  displayExtraBold: "BricolageGrotesque_800ExtraBold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
} as const;

// When the fonts are not loaded (load failure, tests) the system font is used with a matching weight.
export function buildType(fontsLoaded: boolean): Record<TypeVariant, TypeStyle> {
  const f = (family: string, weight: TextStyle["fontWeight"]) =>
    fontsLoaded ? { fontFamily: family } : { fontWeight: weight };
  return {
    display: { ...f(fontFamilies.displayExtraBold, "800"), fontSize: 34, lineHeight: 38 },
    title: { ...f(fontFamilies.displayBold, "700"), fontSize: 24, lineHeight: 30 },
    heading: { ...f(fontFamilies.displayBold, "700"), fontSize: 18, lineHeight: 24 },
    body: { ...f(fontFamilies.body, "400"), fontSize: 16, lineHeight: 24 },
    small: { ...f(fontFamilies.body, "400"), fontSize: 14, lineHeight: 20 },
    label: {
      ...f(fontFamilies.bodyBold, "700"),
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
  };
}

// Bold body text (button labels, chips, field labels): bold DM Sans when loaded, else system bold.
export function buildBold(fontsLoaded: boolean): TypeStyle {
  return fontsLoaded ? { fontFamily: fontFamilies.bodyBold } : { fontWeight: "700" };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { input: 16, card: 24, pill: 999 } as const;
export const tap = { min: 48, button: 56 } as const;
export const screenPadding = 24;

// App.tsx provides true once the Google fonts have loaded; otherwise system fonts are used.
export const FontsLoadedContext = createContext(false);

export type Theme = {
  colors: Colors;
  type: Record<TypeVariant, TypeStyle>;
  bold: TypeStyle;
  space: typeof space;
  radius: typeof radius;
  tap: typeof tap;
  isDark: boolean;
};

export function useTheme(): Theme {
  const isDark = useColorScheme() === "dark";
  const fontsLoaded = useContext(FontsLoadedContext);
  return {
    colors: isDark ? darkColors : lightColors,
    type: buildType(fontsLoaded),
    bold: buildBold(fontsLoaded),
    space,
    radius,
    tap,
    isDark,
  };
}
