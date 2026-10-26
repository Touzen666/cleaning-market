// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCleaningPreviewFixture } from "../preview/fixtures";
import { CleaningCandidatesPanel } from "./candidates-panel";
import { type CandidatesResponse } from "./view-model";

const now = new Date("2026-10-25T12:00:00Z");

function panel(
  data: CandidatesResponse | undefined = createCleaningPreviewFixture(now),
  options: { loading?: boolean; refreshing?: boolean; error?: string } = {},
) {
  const onRefresh = vi.fn();
  const onRangeChange = vi.fn();
  const result = render(
    <CleaningCandidatesPanel
      data={data}
      range={{ from: "2026-10-25", to: "2026-11-01" }}
      onRangeChange={onRangeChange}
      onRefresh={onRefresh}
      {...options}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Widok listy" }));
  return { ...result, onRefresh, onRangeChange };
}

describe("cleaning candidates panel", () => {
  beforeEach(() => {
    // Vitest's existing JSX configuration uses the classic transform; Next uses its own runtime in production.
    vi.stubGlobal("React", React);
    vi.spyOn(Date, "now").mockReturnValue(now.getTime());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("offers accepted and awaiting stays for planning while keeping 60-minute cleanings unassigned", () => {
    panel();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    const awaiting = screen.getByRole("article", {
      name: "Apartament Słoneczny, rezerwacja 92003",
    });
    expect(
      within(awaiting).getByText("Oczekująca · wstępne"),
    ).toBeInTheDocument();
    expect(within(awaiting).getByText("10:00–15:00")).toBeInTheDocument();
    expect(within(awaiting).getByText("60 min")).toBeInTheDocument();
    expect(
      within(awaiting).getByText("Adres wymaga potwierdzenia przed wejściem"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nie przypisuje pracowników ani konkretnych godzin/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /przypisz|zaplanuj|generuj grafik/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /pracownik|sprzątaczka/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: /Studio Parkowe/ }),
    ).not.toBeInTheDocument();
  });

  it("lets a coordinator find a unit by code, a Polish name without accents or its reservation number", () => {
    panel();
    const search = screen.getByRole("searchbox", {
      name: "Szukaj lokalu lub rezerwacji",
    });
    for (const query of ["DEMO-02", "sloneczny", "92003"]) {
      fireEvent.change(search, { target: { value: query } });
      expect(screen.getAllByRole("article")).toHaveLength(1);
      expect(
        screen.getByRole("article", { name: /Apartament Słoneczny/ }),
      ).toBeInTheDocument();
    }
    fireEvent.change(search, { target: { value: "nieistniejący lokal" } });
    expect(
      screen.getByRole("heading", { name: "Brak pasujących pozycji" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Brak sprzątań w tym zakresie"),
    ).not.toBeInTheDocument();
  });

  it("retains a provisional cleaning when filtering for awaiting reservations", () => {
    panel();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Status rezerwacji" }),
      { target: { value: "provisional" } },
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("article", { name: /Apartament Słoneczny/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: /Apartament Lawendowy/ }),
    ).not.toBeInTheDocument();
  });

  it("separates unsafe windows and unclear reservation statuses from ready cleanings and explains the reasons", () => {
    panel();
    fireEvent.click(screen.getByRole("button", { name: "Do sprawdzenia 3" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(
      screen.queryByRole("article", { name: /Apartament Lawendowy/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Status rezerwacji wymaga wyjaśnienia"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", {
        name: "Apartament do wyjaśnienia, rezerwacja 92007",
      }),
    ).toHaveTextContent("Do wyjaśnienia");
    expect(
      screen.getByText("Blokada dostępności obejmuje czas sprzątania"),
    ).toBeInTheDocument();
    const shortWindow = screen.getByRole("article", {
      name: "Studio Parkowe, rezerwacja 92005",
    });
    expect(
      within(shortWindow).getByText("Brakuje pełnych 60 minut na sprzątanie"),
    ).toBeInTheDocument();
    expect(
      within(shortWindow).getByText("Brak pełnego okna"),
    ).toBeInTheDocument();
  });

  it("shows the checkout and next check-in in reservation details without inventing an appointment", () => {
    panel();
    const accepted = screen.getByRole("article", {
      name: "Apartament Lawendowy, rezerwacja 92001",
    });
    const summary = within(accepted).getByText("Szczegóły rezerwacji");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(within(accepted).getByText("Wyjazd · #92001")).toBeVisible();
    expect(
      within(accepted).getByText("Następny przyjazd · #92002"),
    ).toBeVisible();
    expect(within(accepted).getByText("25 października, 10:00")).toBeVisible();
    expect(within(accepted).getByText("25 października, 15:00")).toBeVisible();
    expect(
      within(accepted).getByText(
        /Jednostka iDoBooking #91001 · katalog iDoBooking/,
      ),
    ).toBeVisible();
    expect(
      within(accepted).queryByText(
        /powiązanie wymaga sprawdzenia|powiązanie lokalu/i,
      ),
    ).not.toBeInTheDocument();
  });

  it("keeps canceled reservations out of planning and explains what their withdrawal means", () => {
    panel();
    expect(screen.queryByText("Rezerwacja #92009")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Wycofane 1" }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("Rezerwacja #92009")).toBeInTheDocument();
    expect(screen.getAllByText("Nieaktywna")).toHaveLength(2);
    expect(
      screen.getByText(
        /Anulowanie po faktycznym pobycie wymaga osobnego sprawdzenia/,
      ),
    ).toBeInTheDocument();
  });

  it("does not call loading or a failed initial read an empty cleaning list", () => {
    const fixture = createCleaningPreviewFixture(now);
    const rendered = panel(fixture, { loading: true });
    rendered.rerender(
      <CleaningCandidatesPanel
        range={{ from: fixture.from, to: fixture.to }}
        onRangeChange={vi.fn()}
        onRefresh={vi.fn()}
        loading
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pobieranie rezerwacji",
    );
    expect(
      screen.getByRole("button", { name: "Odśwież rezerwacje" }),
    ).toBeDisabled();
    expect(
      screen.queryByText("Brak sprzątań w tym zakresie"),
    ).not.toBeInTheDocument();
    rendered.rerender(
      <CleaningCandidatesPanel
        range={{ from: fixture.from, to: fixture.to }}
        onRangeChange={vi.fn()}
        onRefresh={vi.fn()}
        error="Nie udało się pobrać pełnych danych"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się pobrać pełnych danych",
    );
    expect(
      screen.getByRole("heading", {
        name: "Nie można teraz wyświetlić sprzątań",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Brak sprzątań w tym zakresie"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Wszystko sprawdzone")).not.toBeInTheDocument();
  });

  it("warns about a failed refresh while preserving the previous read instead of zeroing it", () => {
    const { onRefresh } = panel(createCleaningPreviewFixture(now), {
      error: "Ponowny odczyt nie powiódł się",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Wyświetlasz poprzedni odczyt",
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Odśwież rezerwacje" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("shows an empty state only after a successful complete read with no candidates", () => {
    const fixture = createCleaningPreviewFixture(now);
    panel({
      ...fixture,
      candidates: [],
      reviews: [],
      excluded: [],
      counts: {
        acceptedCandidates: 0,
        provisionalCandidates: 0,
        reviews: 0,
        excluded: 0,
      },
    });
    expect(
      screen.getByRole("heading", { name: "Brak sprzątań w tym zakresie" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Nie można teraz wyświetlić sprzątań"),
    ).not.toBeInTheDocument();
  });

  it("marks an old snapshot as requiring refresh instead of silently presenting it as current", () => {
    panel({
      ...createCleaningPreviewFixture(now),
      fetchedAt: "2026-10-25T11:54:00Z",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dane wymagają odświeżenia.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pobierz aktualne rezerwacje przed dalszym planowaniem.",
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("switches to the reservation calendar and requests a new range without changing assignments", () => {
    const { onRangeChange } = panel();
    fireEvent.click(screen.getByRole("button", { name: "Widok kalendarza" }));
    expect(
      screen.getByRole("region", { name: "Przewijany kalendarz apartamentów" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Rezerwacja 92003/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Okres" }), {
      target: { value: "1" },
    });
    expect(onRangeChange).toHaveBeenLastCalledWith({
      from: "2026-10-25",
      to: "2026-10-26",
    });
  });
});
