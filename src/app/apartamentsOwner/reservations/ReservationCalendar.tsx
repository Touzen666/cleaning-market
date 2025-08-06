import { useState, useMemo, forwardRef } from "react";
import {
  format,
  addDays,
  subDays,
  eachDayOfInterval,
  isSameDay,
  differenceInDays,
  startOfDay,
} from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { type RouterOutputs } from "@/trpc/react";
import { useRipple } from "@/app/components/ui/Ripple";
import { Tooltip } from "@/app/components/ui/Tooltip";

const getInitials = (name: string): string => {
  if (!name) return "";
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    const part = parts[0]!;
    return `${part.charAt(0).toUpperCase()}`;
  }

  const firstName = parts[0]!;
  const lastName = parts[parts.length - 1]!;
  return `${firstName.charAt(0).toUpperCase()}.${lastName.charAt(0).toUpperCase()}`;
};

const formatGuestName = (name: string): string => {
  if (!name) return "";
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0]!;
  }

  const firstName = parts[0]!;
  const lastName = parts[parts.length - 1]!;
  return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
};

type Apartment = RouterOutputs["reservation"]["getForOwner"][number];

interface ReservationCalendarProps {
  apartment: Apartment;
}

const COLORS = {
  free: "#FFECAE",
  occupied: "#6B5200",
  pending: "#6B5200",
  today: "#FFD700", // Gold
};

const Legend = () => (
  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
    <div className="flex items-center space-x-2">
      <div
        className="h-4 w-4 rounded-sm border border-gray-300"
        style={{ backgroundColor: COLORS.occupied }}
      />
      <span className="text-sm">Zajęty</span>
    </div>
    <div className="flex items-center space-x-2">
      <div
        className="h-4 w-4 rounded-sm border border-gray-300"
        style={{ backgroundColor: COLORS.pending }}
      />
      <span className="text-sm">Oczekujący</span>
    </div>
    <div className="flex items-center space-x-2">
      <div
        className="h-4 w-4 rounded-sm border border-gray-300"
        style={{ backgroundColor: COLORS.free }}
      />
      <span className="text-sm">Wolny</span>
    </div>
  </div>
);

const DayRangeSelector = ({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (days: number) => void;
}) => {
  const ranges = [14, 30, 60];
  return (
    <div className="flex items-center space-x-2 rounded-lg bg-gray-100 p-1">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onSelect(range)}
          className={`rounded-md px-3 py-1 text-sm font-medium ${
            selected === range
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-gray-200"
          }`}
        >
          {range} dni
        </button>
      ))}
    </div>
  );
};

type Reservation = Apartment["reservations"][number];

interface ReservationItemProps {
  reservation: Reservation;
  daysInRange: Date[];
}

const ReservationItem = forwardRef<HTMLDivElement, ReservationItemProps>(
  function ReservationItem({ reservation, daysInRange }, ref) {
    const { onClick, RippleComponent } = useRipple();

    if (daysInRange.length === 0) return null;

    const reservationStartDate = startOfDay(reservation.start);
    const reservationEndDate = startOfDay(reservation.end);
    const firstVisibleDay = startOfDay(daysInRange[0]!);
    const lastVisibleDay = startOfDay(daysInRange[daysInRange.length - 1]!);

    if (
      reservationEndDate < firstVisibleDay ||
      reservationStartDate > lastVisibleDay
    ) {
      return null;
    }

    const clampedStartDate =
      reservationStartDate < firstVisibleDay
        ? firstVisibleDay
        : reservationStartDate;
    const clampedEndDate =
      reservationEndDate > lastVisibleDay ? lastVisibleDay : reservationEndDate;

    const startDayIndex = differenceInDays(clampedStartDate, firstVisibleDay);
    const endDayIndex = differenceInDays(clampedEndDate, firstVisibleDay);

    const startsBeforeVisibleRange = reservationStartDate < firstVisibleDay;
    const startColumn = startsBeforeVisibleRange ? 2 : startDayIndex * 2 + 3;

    const endsAfterVisibleRange = reservationEndDate > lastVisibleDay;
    const endColumn = endsAfterVisibleRange
      ? daysInRange.length * 2 + 2
      : endDayIndex * 2 + 3;

    if (startColumn >= endColumn) {
      return null;
    }

    return (
      <Tooltip
        content={
          <div>
            <p className="font-bold">{formatGuestName(reservation.guest)}</p>
            <p>
              {format(reservation.start, "dd.MM.yyyy")} -{" "}
              {format(reservation.end, "dd.MM.yyyy")}
            </p>
          </div>
        }
      >
        <div
          ref={ref}
          onClick={onClick}
          style={{
            gridRow: 2,
            gridColumn: `${startColumn} / ${endColumn}`,
            backgroundColor: "rgba(107, 82, 0, 0.6)",
            borderColor: "#6B5200",
          }}
          className="relative z-10 my-2 mr-px flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 shadow-md"
        >
          <RippleComponent />
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black text-xs font-bold text-white [text-shadow:_-1px_-1px_0_black,_1px_-1px_0_black,_-1px_1px_0_black,_1px_1px_0_black]">
            {getInitials(reservation.guest)}
          </span>
        </div>
      </Tooltip>
    );
  },
);
ReservationItem.displayName = "ReservationItem";

export function ReservationCalendar({ apartment }: ReservationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(30);

  const handlePrev = () => setCurrentDate(subDays(currentDate, 7));
  const handleNext = () => setCurrentDate(addDays(currentDate, 7));

  const startDate = useMemo(() => currentDate, [currentDate]);
  const endDate = useMemo(
    () => addDays(startDate, daysToShow - 1),
    [startDate, daysToShow],
  );

  const daysInRange = useMemo(
    () => eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate],
  );

  const gridTemplateColumns = `200px repeat(${
    daysInRange.length * 2
  }, minmax(20px, 1fr))`;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrev}
            className="rounded-md p-2 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-bold">
            {format(startDate, "d MMM", { locale: pl })} -{" "}
            {format(endDate, "d MMM yyyy", { locale: pl })}
          </h2>
          <button
            onClick={handleNext}
            className="rounded-md p-2 hover:bg-gray-100"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
        <DayRangeSelector selected={daysToShow} onSelect={setDaysToShow} />
      </div>

      <div className="relative overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns,
            gridTemplateRows: `auto 1fr`,
          }}
        >
          {/* Apartment Info */}
          <div
            className="sticky left-0 z-20 grid grid-rows-[auto_1fr] gap-2 bg-white p-2"
            style={{ gridRow: `1 / span 2` }}
          >
            <div>
              <div className="font-bold">{apartment.name}</div>
              <div className="text-sm text-gray-500">{apartment.address}</div>
            </div>
            {apartment.imageUrl && (
              <div className="relative h-[70px]">
                <Image
                  src={apartment.imageUrl}
                  alt={apartment.name}
                  fill
                  sizes="200px"
                  className="rounded-md object-cover"
                />
              </div>
            )}
          </div>

          {/* Day Headers */}
          {daysInRange.map((day, index) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={`${day.toString()}-header`}
                className={`z-10 border-r text-center ${isToday ? "bg-yellow-200" : ""}`}
                style={{
                  gridRow: 1,
                  gridColumn: `${index * 2 + 2} / span 2`,
                }}
              >
                <div className="text-xs text-gray-500">
                  {format(day, "EEE", { locale: pl })}
                </div>
                <div className="text-sm font-semibold">{format(day, "dd")}</div>
              </div>
            );
          })}

          {/* Background cells */}
          <div
            className="col-start-2"
            style={{
              gridColumnEnd: -1,
              gridRow: 2,
              display: "grid",
              gridTemplateColumns: `repeat(${daysInRange.length * 2}, 1fr)`,
            }}
          >
            {Array.from({ length: daysInRange.length * 2 }).map((_, index) => (
              <div
                key={index}
                className="border-r border-gray-200"
                style={{ backgroundColor: COLORS.free }}
              ></div>
            ))}
          </div>

          {/* Reservations */}
          {apartment.reservations
            .filter(
              (reservation) =>
                reservation.status !== "Anulowana" &&
                reservation.status !== "Odrzucona przez obsługę",
            )
            .map((reservation) => (
              <ReservationItem
                key={reservation.id}
                reservation={reservation}
                daysInRange={daysInRange}
              />
            ))}
        </div>
      </div>
      <Legend />
    </div>
  );
}
