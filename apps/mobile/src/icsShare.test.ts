import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { safeIcsFilename, shareIcsFile } from "./icsShare";

const mockCreate = jest.fn();
const mockWrite = jest.fn();
const mockFiles: { dir: string; name: string }[] = [];

jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: jest.fn().mockImplementation((dir: string, name: string) => {
    mockFiles.push({ dir, name });
    return { uri: `${dir}/${name}`, create: mockCreate, write: mockWrite };
  }),
}));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const isAvailable = jest.mocked(Sharing.isAvailableAsync);
const shareAsync = jest.mocked(Sharing.shareAsync);

beforeEach(() => {
  jest.clearAllMocks();
  mockFiles.length = 0;
  mockCreate.mockReset();
  mockWrite.mockReset().mockResolvedValue(undefined);
  isAvailable.mockResolvedValue(true);
  shareAsync.mockResolvedValue(undefined);
});

test("safeIcsFilename keeps only safe characters and neutralizes path traversal", () => {
  expect(safeIcsFilename("event-e1.ics")).toBe("event-e1.ics");
  expect(safeIcsFilename("../x")).toBe("x.ics");
  expect(safeIcsFilename("..\\..\\evil name?.ics")).toBe("evilname.ics");
  expect(safeIcsFilename("../../")).toBe("event.ics");
  expect(safeIcsFilename("event-e/1.ics")).toBe("1.ics");
  expect(safeIcsFilename(".hidden")).toBe("hidden.ics");
});

test("writes the exact text to a sanitized cache file and shares that URI as text/calendar", async () => {
  const text = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";
  expect(await shareIcsFile("../x", text)).toBe("shared");
  expect(File).toHaveBeenCalledTimes(1);
  expect(mockFiles[0]).toEqual({ dir: "file:///cache", name: "x.ics" });
  expect(mockCreate).toHaveBeenCalledWith({ overwrite: true });
  expect(mockWrite).toHaveBeenCalledWith(text);
  expect(shareAsync).toHaveBeenCalledWith("file:///cache/x.ics", expect.objectContaining({ mimeType: "text/calendar" }));
});

test("reports unavailable sharing without opening the share sheet", async () => {
  isAvailable.mockResolvedValue(false);
  expect(await shareIcsFile("event-e1.ics", "BEGIN:VCALENDAR")).toBe("unavailable");
  expect(shareAsync).not.toHaveBeenCalled();
});

test("a write failure rejects and never shares", async () => {
  mockWrite.mockRejectedValue(new Error("disk full"));
  await expect(shareIcsFile("event-e1.ics", "BEGIN:VCALENDAR")).rejects.toThrow("disk full");
  expect(shareAsync).not.toHaveBeenCalled();
});
