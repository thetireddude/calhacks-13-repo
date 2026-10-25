/**
 * Shared Gather UI kit (DEV1-013). All components follow the system light/dark scheme via useTheme().
 * Every Pressable has an accessibilityRole and accessibilityLabel and a tap target of at least 48.
 *
 * Screen        { scroll?, edges?, style?, contentStyle?, children }  cream/night bg, 24 padding, safe area.
 *                 edges defaults to ["top","left","right"]; pass [] (or ["left","right"]) under a navigation header.
 * AppText       { variant?: display|title|heading|body|small|label (default body), muted?, color?, ...TextProps }
 * Button        { title, onPress, variant?: primary|secondary|outline (default primary), disabled?, busy?,
 *                 accessibilityLabel? (defaults to title), icon?: IconName, style? }  56 high pill; busy shows a spinner and blocks presses.
 * TextField     { label, error?, helper?, ...TextInputProps }  16 radius peach border; accessibilityLabel defaults to label;
 *                 the error renders with role "alert".
 * Card          { tone?: peach|mint|butter|sky|lilac|surface (default surface), onPress?, accessibilityLabel?, style?, children }
 *                 24 radius. With onPress it is a button.
 * Chip          { tone: voting|vetoed|confirmed|planning, label? (defaults to the status name) }
 * AvatarStack   { names: string[], max?: number (default 5) }  pastel initial circles, then "+N" for the rest.
 * Banner        { tone?: error|info (default error), message, onRetry?, retryLabel? (default "Retry") }  info is butter.
 * EmptyState    { title, message?, action?: ReactNode }
 * Skeleton      { height?, width?, radius?, style? }  placeholder block (accessibilityLabel "Loading").
 * VoteButton    { kind: yes|cant_make_it|veto, selected?, disabled?, onPress, accessibilityLabel? }
 *                 Labels "Yes", "Can't make it", "Veto". Veto = solid outline + stop icon; cant_make_it = dashed, calm.
 *                 There is deliberately no "maybe" kind (no contract support).
 * Toggle        { label, value, onValueChange, disabled? }  switch row.
 * Icon          { name: IconName, size?, color? }  simple unicode glyphs; decorative (hidden from accessibility).
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { StyleProp, TextInputProps, TextProps, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";

import { screenPadding, useTheme } from "./theme";
import type { Colors, TypeVariant } from "./theme";

// ---- Icon ----

const glyphs = {
  check: "✓",
  stop: "⊖",
  calendar: "▦",
  people: "☺",
  bell: "♫",
  person: "●",
  plus: "+",
  key: "⚅",
  arrow: "→",
  alert: "!",
  refresh: "↻",
  dot: "●",
} as const;
export type IconName = keyof typeof glyphs;

export function Icon({ name, size = 18, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      style={{ fontSize: size, lineHeight: size + 4, color: color ?? colors.ink, fontWeight: "700" }}
    >
      {glyphs[name]}
    </Text>
  );
}

// ---- Text ----

export function AppText({
  variant = "body",
  muted,
  color,
  style,
  ...rest
}: TextProps & { variant?: TypeVariant; muted?: boolean; color?: string }) {
  const { colors, type } = useTheme();
  return <Text {...rest} style={[type[variant], { color: color ?? (muted ? colors.muted : colors.ink) }, style]} />;
}

// ---- Screen ----

const DEFAULT_EDGES: Edge[] = ["top", "left", "right"];

export function Screen({
  scroll,
  edges = DEFAULT_EDGES,
  style,
  contentStyle,
  children,
}: {
  scroll?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding: screenPadding, gap: 16 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding: screenPadding }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

// ---- Button ----

export type ButtonVariant = "primary" | "secondary" | "outline";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  busy,
  accessibilityLabel,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, type, bold, radius, tap } = useTheme();
  const inactive = !!disabled || !!busy;
  const bg = inactive ? colors.peach : variant === "primary" ? colors.coral : variant === "secondary" ? colors.peach : colors.surface;
  const fg = inactive ? colors.muted : variant === "primary" ? colors.onCoral : colors.ink;
  const border = variant === "outline" && !inactive ? colors.ink : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      style={[
        {
          minHeight: tap.button,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: border,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator accessibilityLabel="Working" color={fg} /> : icon ? <Icon name={icon} color={fg} /> : null}
      <Text style={[type.body, { color: fg }, bold]}>{title}</Text>
    </Pressable>
  );
}

// ---- TextField ----

export function TextField({
  label,
  error,
  helper,
  style,
  ...rest
}: TextInputProps & { label: string; error?: string | null; helper?: string }) {
  const { colors, type, bold, radius, tap } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="small" style={bold}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...rest}
        style={[
          type.body,
          {
            minHeight: tap.button,
            borderRadius: radius.input,
            borderWidth: 2,
            borderColor: error ? colors.danger : colors.peach,
            backgroundColor: colors.surface,
            color: colors.ink,
            paddingHorizontal: 16,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="small" accessibilityRole="alert" color={colors.danger}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="small" muted>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

// ---- Card ----

export type CardTone = "peach" | "mint" | "butter" | "sky" | "lilac" | "surface";

export function Card({
  tone = "surface",
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  tone?: CardTone;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { colors, radius } = useTheme();
  const base: ViewStyle = { backgroundColor: colors[tone], borderRadius: radius.card, padding: 20, gap: 12 };
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={[base, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// ---- Chip ----

export type ChipTone = "voting" | "vetoed" | "confirmed" | "planning";
const chipLabels: Record<ChipTone, string> = {
  voting: "Voting",
  vetoed: "Vetoed",
  confirmed: "Confirmed",
  planning: "Planning",
};

export function Chip({ tone, label }: { tone: ChipTone; label?: string }) {
  const { colors, type, bold } = useTheme();
  const bg = tone === "voting" ? colors.sky : tone === "confirmed" ? colors.mint : tone === "planning" ? colors.lilac : "transparent";
  const icon: IconName | null = tone === "voting" ? "dot" : tone === "vetoed" ? "stop" : tone === "confirmed" ? "check" : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: 999,
        borderWidth: tone === "vetoed" ? 1.5 : 0,
        borderColor: colors.ink,
        paddingHorizontal: 14,
        paddingVertical: 6,
      }}
    >
      {icon ? <Icon name={icon} size={12} color={colors.ink} /> : null}
      <Text style={[type.small, { color: colors.ink }, bold]}>{label ?? chipLabels[tone]}</Text>
    </View>
  );
}

// ---- AvatarStack ----

function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function AvatarStack({ names, max = 5 }: { names: string[]; max?: number }) {
  const { colors, bold } = useTheme();
  const pastels = [colors.peach, colors.butter, colors.mint, colors.sky, colors.lilac];
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  const circle: ViewStyle = {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  };
  return (
    <View style={{ flexDirection: "row" }} accessibilityLabel={`${names.length} ${names.length === 1 ? "person" : "people"}`}>
      {shown.map((n, i) => (
        <View
          key={`${n}-${i}`}
          style={[circle, { backgroundColor: pastels[i % pastels.length], marginLeft: i === 0 ? 0 : -8 }]}
        >
          <AppText variant="small" style={bold}>
            {initial(n)}
          </AppText>
        </View>
      ))}
      {extra > 0 ? (
        <View style={[circle, { backgroundColor: colors.bg, marginLeft: -8 }]}>
          <AppText variant="small" style={bold}>{`+${extra}`}</AppText>
        </View>
      ) : null}
    </View>
  );
}

// ---- Banner ----

export function Banner({
  tone = "error",
  message,
  onRetry,
  retryLabel = "Retry",
}: {
  tone?: "error" | "info";
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { colors, type, bold, radius } = useTheme();
  const isError = tone === "error";
  return (
    <View
      accessible={isError}
      accessibilityRole={isError ? "alert" : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: isError ? colors.dangerBg : colors.butter,
        borderRadius: radius.input,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <Icon name={isError ? "alert" : "refresh"} color={isError ? colors.danger : colors.ink} />
      <Text style={[type.small, { color: colors.ink, flex: 1 }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          onPress={onRetry}
          style={{
            minHeight: 48,
            minWidth: 48,
            justifyContent: "center",
            borderRadius: radius.pill,
            backgroundColor: colors.ink,
            paddingHorizontal: 18,
          }}
        >
          <Text style={[type.small, { color: colors.bg }, bold]}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---- EmptyState & Skeleton ----

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <Card tone="peach" style={{ gap: 8 }}>
      <AppText variant="heading">{title}</AppText>
      {message ? (
        <AppText variant="small" muted>
          {message}
        </AppText>
      ) : null}
      {action}
    </Card>
  );
}

export function Skeleton({
  height = 16,
  width = "100%",
  radius: r = 8,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel="Loading"
      style={[{ height, width, borderRadius: r, backgroundColor: colors.peach }, style]}
    />
  );
}

// ---- VoteButton ----

export type VoteKind = "yes" | "cant_make_it" | "veto";
const voteLabels: Record<VoteKind, string> = { yes: "Yes", cant_make_it: "Can't make it", veto: "Veto" };
const voteIcons: Record<VoteKind, IconName> = { yes: "check", cant_make_it: "calendar", veto: "stop" };

function voteColors(kind: VoteKind, selected: boolean, c: Colors): { bg: string; fg: string; border: string } {
  if (!selected) return { bg: c.surface, fg: c.ink, border: kind === "veto" ? c.ink : kind === "yes" ? c.peach : c.muted };
  if (kind === "yes") return { bg: c.mint, fg: c.ink, border: c.ink };
  if (kind === "veto") return { bg: c.ink, fg: c.bg, border: c.ink };
  return { bg: c.peach, fg: c.ink, border: c.muted };
}

export function VoteButton({
  kind,
  selected = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: {
  kind: VoteKind;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { colors, type, bold, radius } = useTheme();
  const v = disabled ? { bg: colors.peach, fg: colors.muted, border: colors.peach } : voteColors(kind, selected, colors);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? voteLabels[kind]}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 72,
        minWidth: 72,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        borderRadius: radius.input,
        backgroundColor: v.bg,
        borderWidth: 2,
        borderColor: v.border,
        borderStyle: kind === "cant_make_it" ? "dashed" : "solid",
        paddingHorizontal: 4,
      }}
    >
      <Icon name={voteIcons[kind]} color={v.fg} size={20} />
      <Text style={[type.small, { color: v.fg, textAlign: "center" }, bold]}>{voteLabels[kind]}</Text>
    </Pressable>
  );
}

// ---- Toggle ----

export function Toggle({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, gap: 12 }}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.coral, false: colors.peach }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

