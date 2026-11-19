import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage (landing)", () => {
  it("shows the PropDesk name, the headline and a sign in link", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("link", { name: "PropDesk home" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /Every property/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("names every section with a heading", () => {
    render(<HomePage />);

    for (const name of [
      /Why PropDesk/,
      /not just rent tracking/,
      /Everything a small letting business runs on/,
      /Set up in an afternoon/,
      /Small teams/,
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });
});
