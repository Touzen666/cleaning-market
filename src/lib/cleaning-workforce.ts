export const CHECKLIST = [
  {
    id: "general",
    title: "Przygotowanie",
    items: [
      "Przewietrz mieszkanie",
      "Sprawdź stan lokalu i zgłoś uszkodzenia",
      "Wynieś śmieci i wymień worki",
      "Odkurz i umyj podłogi",
    ],
  },
  {
    id: "kitchen",
    title: "Kuchnia",
    items: [
      "Umyj naczynia i powierzchnie",
      "Sprawdź lodówkę oraz wyposażenie",
      "Uzupełnij środki i ręczniki papierowe",
    ],
  },
  {
    id: "room",
    title: "Pokój",
    items: [
      "Zmień pościel",
      "Wytrzyj kurz i powierzchnie",
      "Przygotuj miejsce dla kolejnych gości",
    ],
  },
  {
    id: "bathroom",
    title: "Łazienka",
    items: [
      "Umyj i zdezynfekuj łazienkę",
      "Uzupełnij papier i mydło",
      "Przygotuj ręczniki",
    ],
  },
] as const;
export const PHOTO_GROUPS = ["kitchen", "room", "bathroom"] as const;
export const REWARDS = [
  {
    id: "cash10",
    cost: 200,
    cents: 1000,
    stars: 0,
    period: "month",
    label: "10 zł za 200 punktów",
  },
  {
    id: "cash50",
    cost: 600,
    cents: 5000,
    stars: 0,
    period: "month",
    label: "50 zł za 600 punktów",
  },
  {
    id: "cash100",
    cost: 1000,
    cents: 10000,
    stars: 0,
    period: "month",
    label: "100 zł za 1000 punktów",
  },
  {
    id: "star",
    cost: 1450,
    cents: 0,
    stars: 0.5,
    period: "year",
    label: "Pół gwiazdki za 1450 punktów",
  },
] as const;
