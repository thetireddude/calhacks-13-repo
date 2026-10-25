import { fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import * as RN from "react-native";

import { FontsLoadedContext, darkColors, lightColors, useTheme } from "./theme";
import { AppText, AvatarStack, Banner, Button, Card, Chip, EmptyState, Skeleton, TextField, Toggle, VoteButton } from "./ui";

afterEach(() => jest.restoreAllMocks());

test("useTheme follows the system color scheme", async () => {
  jest.spyOn(RN, "useColorScheme").mockReturnValue("dark");
  const dark = (await renderHook(() => useTheme())).result.current;
  expect(dark.isDark).toBe(true);
  expect(dark.colors).toEqual(darkColors);
  expect(dark.colors.bg).toBe("#1B1513");
  jest.spyOn(RN, "useColorScheme").mockReturnValue("light");
  const light = (await renderHook(() => useTheme())).result.current;
  expect(light.isDark).toBe(false);
  expect(light.colors).toEqual(lightColors);
  expect(light.colors.bg).toBe("#FFF8F3");
});

test("type scale uses loaded font families, else system weights", async () => {
  const system = (await renderHook(() => useTheme())).result.current;
  expect(system.type.display).toMatchObject({ fontSize: 34, lineHeight: 38, fontWeight: "800" });
  expect(system.type.display.fontFamily).toBeUndefined();
  const loaded = (await renderHook(() => useTheme(), {
    wrapper: ({ children }) => <FontsLoadedContext.Provider value>{children}</FontsLoadedContext.Provider>,
  })).result.current;
  expect(loaded.type.body.fontFamily).toBe("DMSans_400Regular");
  expect(loaded.type.title).toMatchObject({ fontFamily: "BricolageGrotesque_700Bold", fontSize: 24, lineHeight: 30 });
});

test("Button presses, and is inert when disabled or busy", async () => {
  const onPress = jest.fn();
  const { rerender } = await render(<Button title="Plan something" onPress={onPress} />);
  await fireEvent.press(screen.getByRole("button", { name: "Plan something" }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await rerender(<Button title="Plan something" onPress={onPress} disabled />);
  await fireEvent.press(screen.getByRole("button", { name: "Plan something" }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await rerender(<Button title="Plan something" onPress={onPress} busy variant="outline" />);
  expect(screen.getByLabelText("Working")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Plan something" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("TextField shows label, error alert, and passes input props", async () => {
  const onChangeText = jest.fn();
  await render(<TextField label="Email" error="Enter a valid email address." onChangeText={onChangeText} />);
  await fireEvent.changeText(screen.getByLabelText("Email"), "a@b.co");
  expect(onChangeText).toHaveBeenCalledWith("a@b.co");
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
});

test("VoteButton kinds have distinct labels and there is no maybe", async () => {
  const yes = jest.fn();
  const veto = jest.fn();
  await render(
    <>
      <VoteButton kind="yes" onPress={yes} selected />
      <VoteButton kind="cant_make_it" onPress={() => {}} />
      <VoteButton kind="veto" onPress={veto} />
    </>,
  );
  expect(screen.getByRole("button", { name: "Yes" }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole("button", { name: "Can't make it" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Veto" })).toBeTruthy();
  expect(screen.queryByText(/maybe/i)).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Veto" }));
  expect(veto).toHaveBeenCalledTimes(1);
  expect(yes).not.toHaveBeenCalled();
});

test("VoteButton disabled blocks presses", async () => {
  const onPress = jest.fn();
  await render(<VoteButton kind="veto" onPress={onPress} disabled />);
  await fireEvent.press(screen.getByRole("button", { name: "Veto" }));
  expect(onPress).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Veto" }).props.accessibilityState.disabled).toBe(true);
});

test("AvatarStack shows initials and a +N overflow", async () => {
  await render(<AvatarStack names={["maya", "Dev", "Priya", "Jo", "Lee", "Sam", "Al"]} />);
  expect(screen.getByText("M")).toBeTruthy();
  expect(screen.getByText("L")).toBeTruthy();
  expect(screen.queryByText("S")).toBeNull();
  expect(screen.getByText("+2")).toBeTruthy();
});

test("AvatarStack has no overflow when everyone fits", async () => {
  await render(<AvatarStack names={["A", "B"]} />);
  expect(screen.queryByText(/^\+/)).toBeNull();
});

test("Chip tones default to status names", async () => {
  await render(
    <>
      <Chip tone="voting" />
      <Chip tone="vetoed" />
      <Chip tone="confirmed" />
      <Chip tone="planning" label="Planning soon" />
    </>,
  );
  for (const t of ["Voting", "Vetoed", "Confirmed", "Planning soon"]) expect(screen.getByText(t)).toBeTruthy();
});

test("Banner shows retry only when provided and calls it", async () => {
  const onRetry = jest.fn();
  const { rerender } = await render(<Banner message="Your votes didn't save." />);
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  await rerender(<Banner message="Your votes didn't save." onRetry={onRetry} />);
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  await rerender(<Banner tone="info" message="Reconnecting." />);
  expect(screen.queryByRole("alert")).toBeNull();
});

test("Card, EmptyState, Skeleton, Toggle, AppText render", async () => {
  const onPress = jest.fn();
  const onValueChange = jest.fn();
  await render(
    <>
      <Card tone="mint" onPress={onPress} accessibilityLabel="Trail Crew">
        <AppText variant="heading">Trail Crew</AppText>
      </Card>
      <EmptyState title="No plans yet" message="Start one." />
      <Skeleton />
      <Toggle label="Let Gather learn my patterns" value onValueChange={onValueChange} />
    </>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Trail Crew" }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByText("No plans yet")).toBeTruthy();
  expect(screen.getByLabelText("Loading")).toBeTruthy();
  await fireEvent(screen.getByLabelText("Let Gather learn my patterns"), "valueChange", false);
  expect(onValueChange).toHaveBeenCalledWith(false);
});
