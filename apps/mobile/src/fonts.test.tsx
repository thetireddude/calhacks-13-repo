import { act, renderHook } from "@testing-library/react-native";

import { FONT_LOAD_TIMEOUT_MS, useAppFonts } from "./fonts";

jest.mock("expo-font", () => ({ useFonts: () => [false, null] }));

afterEach(() => jest.useRealTimers());

test("font loading that never settles falls back to system fonts after the timeout", async () => {
  jest.useFakeTimers();
  const { result } = await renderHook(() => useAppFonts());
  expect(result.current).toBe("loading");
  await act(async () => {
    jest.advanceTimersByTime(FONT_LOAD_TIMEOUT_MS);
  });
  expect(result.current).toBe("failed");
});
