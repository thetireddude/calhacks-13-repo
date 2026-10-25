import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "./HomeScreen";

test("renders the placeholder home screen", async () => {
  await render(<HomeScreen />);
  expect(screen.getByText("Gather")).toBeTruthy();
});
