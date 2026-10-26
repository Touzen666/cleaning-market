import type { BookingSnapshot, Unit } from "@/server/idobooking/operations";

/** Cleaning owns its catalog identity and location metadata independently of admin inventory. */
export type CleaningUnit = Omit<Unit, "mapping"> & {
  mapping?: Unit["mapping"] | "source-id";
  locationStatus?: "known" | "missing" | "ambiguous";
  locationId?: number;
};

export type CleaningSnapshot = Omit<BookingSnapshot, "units"> & {
  units: CleaningUnit[];
};
