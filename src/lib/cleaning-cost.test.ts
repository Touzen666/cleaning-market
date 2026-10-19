import { describe, expect, it } from "vitest";
import { cleaningCostForReservation } from "./cleaning-cost";

describe("cleaningCostForReservation", () => {
  const unitRates = { "1": 28, "2": 33 };

  it("bierze cennik raportu, gdy jest ustawiony", () => {
    expect(
      cleaningCostForReservation({
        adults: 2,
        children: 0,
        reportCleaningCosts: { "1": 45, "2": 48 },
        stayCleaningCosts: unitRates,
      }),
    ).toBe(48);
  });

  it("bierze cennik lokalu rezerwacji, gdy raport budynku ma pusty cennik", () => {
    expect(
      cleaningCostForReservation({
        adults: 2,
        children: 0,
        reportCleaningCosts: {},
        stayCleaningCosts: unitRates,
      }),
    ).toBe(33);
  });

  it("schodzi do niższego progu, gdy brakuje stawki dla większej grupy", () => {
    expect(
      cleaningCostForReservation({
        adults: 3,
        children: 1,
        reportCleaningCosts: null,
        stayCleaningCosts: unitRates,
      }),
    ).toBe(33);
  });

  it("zostawia zero, gdy żaden cennik nie ma stawek", () => {
    expect(
      cleaningCostForReservation({
        adults: 2,
        children: 0,
        reportCleaningCosts: {},
        stayCleaningCosts: null,
      }),
    ).toBe(0);
  });
});
