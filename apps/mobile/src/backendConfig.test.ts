import { selectBackend } from "./backendConfig";

const all = { supabaseUrl: "https://s.test", supabaseAnonKey: "anon", apiUrl: "https://api.test" };

test("all unset -> mock in dev/test", () => {
  expect(selectBackend({}, true)).toBe("mock");
});
test("supabase set + api missing -> config_error even in dev", () => {
  expect(selectBackend({ ...all, apiUrl: undefined }, true)).toBe("config_error");
});
test("all set -> real", () => {
  expect(selectBackend(all, true)).toBe("real");
  expect(selectBackend(all, false)).toBe("real");
});
test("release + api missing -> config_error", () => {
  expect(selectBackend({ ...all, apiUrl: undefined }, false)).toBe("config_error");
  expect(selectBackend({}, false)).toBe("config_error");
});
