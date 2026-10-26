// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createCleaningPreviewFixture } from "../preview/fixtures";
import { CleaningCandidatesPanel } from "./candidates-panel";

const now = new Date("2026-10-25T12:00:00Z");
function setup(data = createCleaningPreviewFixture(now)) {
  const onRangeChange = vi.fn();
  render(
    <CleaningCandidatesPanel
      data={data}
      range={{ from: data.from, to: data.to }}
      onRangeChange={onRangeChange}
      onRefresh={vi.fn()}
    />,
  );
  return { data, onRangeChange };
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.spyOn(Date, "now").mockReturnValue(now.getTime());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("cleaning reservation calendar", () => {
  it("identifies the actual overlapping stays in review details", () => {
    const data = createCleaningPreviewFixture(now);
    data.overview.reservations.push({
      id: 92010,
      unitId: 91003,
      from: "2026-10-26T15:00",
      to: "2026-10-28T10:00",
      status: "accepted",
      certainty: "accepted",
    });
    setup(data);
    fireEvent.click(screen.getByRole("button", { name: "Do sprawdzenia 3" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Sprzątanie Studio Parkowe/ }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Pobyty nakładające się na tę rezerwację",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "#92010 · 26 października, 15:00",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Ta pozycja wymaga sprawdzenia przed planowaniem",
    );
  });
  it("opens the real calendar by default with native reservation bars and separate cleaning windows", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Widok kalendarza" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /Rezerwacja 92003/ }),
    ).toHaveAccessibleName(/Oczekująca/);
    expect(
      screen.getByRole("button", { name: /Sprzątanie Apartament Słoneczny/ }),
    ).toHaveTextContent("60 min");
    expect(
      screen.queryByRole("button", { name: /przypisz|generuj grafik/i }),
    ).not.toBeInTheDocument();
  });
  it("retains accepted occupancy when filtering provisional cleaning windows", () => {
    setup();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Status rezerwacji" }),
      { target: { value: "provisional" } },
    );
    expect(
      screen.getByRole("button", { name: /Rezerwacja 92004/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Rezerwacja 92003/ }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /^Sprzątanie / }),
    ).toHaveLength(1);
  });
  it("opens reservation and cleaning details, closes with Escape and exposes actual hours", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Rezerwacja 92003/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Rezerwacja #92003");
    expect(screen.getByRole("dialog")).toHaveTextContent("15:00");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Sprzątanie Apartament Słoneczny/ }),
    );
    expect(
      within(screen.getByRole("dialog")).getByText("10:00–15:00"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("Sprzątanie wstępne");
    expect(screen.getByRole("dialog")).toHaveTextContent("60 minut");
  });
  it("shows review windows and lets navigation request another period", () => {
    const { onRangeChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Do sprawdzenia 3" }));
    expect(
      screen.getAllByRole("button", { name: /^Sprzątanie / }),
    ).toHaveLength(3);
    fireEvent.click(
      screen.getByRole("button", { name: /Sprzątanie Studio Parkowe/ }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Brakuje pełnych 60 minut",
    );
    fireEvent.click(screen.getByRole("button", { name: "Zamknij szczegóły" }));
    fireEvent.click(screen.getByRole("button", { name: "Następny okres" }));
    expect(onRangeChange).toHaveBeenCalledWith({
      from: "2026-11-01",
      to: "2026-11-08",
    });
  });
  it("offers a reservation table in the list view including complete stay dates", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Widok listy" }));
    const list = screen.getByRole("region", { name: "Lista rezerwacji" });
    expect(within(list).getByText("#92003")).toBeInTheDocument();
    expect(within(list).getByText("Oczekująca")).toBeInTheDocument();
    expect(within(list).getAllByText("15:00").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("region", {
        name: "Przewijany kalendarz apartamentów",
      }),
    ).not.toBeInTheDocument();
  });
});
