import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { UserType } from "@prisma/client";

// Zod schemas dla API responses
const objectsGetAllResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  capacity: z.number(),
  area: z.number(),
  items: z.array(
    z.object({
      id: z.number(),
      code: z.string(),
      name: z.string(),
    }),
  ),
});

const reservationDetailsSchema = z.object({
  price: z.number(),
  advance: z.number(),
  currency: z.string(),
  dateAdd: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  status: z.string(),
  internalNote: z.string(),
  clientNote: z.string(),
  externalNote: z.string(),
  apiNote: z.string(),
  modificationStatus: z.string(),
  modificationDate: z.string(),
  note: z.string(),
  languageCode: z.string(),
  isSurplus: z.number(),
});

const reservationItemSchema = z.object({
  objectItemId: z.number(),
  itemId: z.number(),
  objectName: z.string(),
  itemCode: z.string(),
  objectId: z.number(),
  priceCorrection: z.number(),
  price: z.number(),
  vat: z.number(),
  numberOfGuests: z.number(),
  isSurplus: z.number(),
  prices: z.array(z.unknown()),
  addons: z.array(z.unknown()),
});

const reservationGuestSchema = z
  .object({
    // Add guest properties as needed
  })
  .passthrough();

const reservationClientSchema = z.object({
  id: z.number(),
  login: z.string(),
  clientType: z.string(),
  companyName: z.string(),
  taxNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  zipcode: z.string(),
  city: z.string(),
  phone: z.string(),
  email: z.string(),
  countryCode: z.string(),
  language: z.string(),
  langDescription: z.string(),
  currency: z.string(),
  guests: z.array(reservationGuestSchema),
});

const reservationSchema = z.object({
  id: z.number(),
  reservationDetails: reservationDetailsSchema,
  items: z.array(reservationItemSchema),
  client: reservationClientSchema,
});

// Funkcja do generowania system_key zgodnie z dokumentacją idobooking
function generateSystemKey(password: string): string {
  // 1. Hashuj hasło użytkownika SHA1
  const hashedPassword = createHash("sha1").update(password).digest("hex");

  // 2. Generuj datę w formacie YYYYMMDD
  const today = new Date();
  const date =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    today.getDate().toString().padStart(2, "0");

  // 3. Połącz datę z zahashowanym hasłem
  const strToHash = date + hashedPassword;

  // 4. Hashuj ponownie SHA1
  const systemKey = createHash("sha1").update(strToHash).digest("hex");

  return systemKey;
}

function getAuth() {
  const login = "barwil128";
  const password = "Metalcat133c!";
  const systemKey = generateSystemKey(password);

  return {
    systemLogin: login,
    systemKey: systemKey,
    lang: "pol",
  };
}

async function getApartmentsList(): Promise<
  z.infer<typeof objectsGetAllResponseSchema>[]
> {
  const apartments: z.infer<typeof objectsGetAllResponseSchema>[] = [];

  // Bezpośrednie zapytanie do API idobooking
  const response = await fetch(
    "https://zlote-wynajmy.pl/api/objects/getAll/1/json",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        authenticate: getAuth(),
      }),
    },
  );

  const responseData = (await response.json()) as {
    result?: { objects?: unknown[] };
  };

  for (const object of responseData.result?.objects ?? []) {
    const objectParsed = objectsGetAllResponseSchema.parse(object);
    apartments.push(objectParsed);
  }

  console.log(apartments);

  return apartments;
}

async function getReservations(
  apartment: z.infer<typeof objectsGetAllResponseSchema>,
): Promise<z.infer<typeof reservationSchema>[]> {
  const response = await fetch(
    `https://zlote-wynajmy.pl/api/reservations/get/${apartment.id}/json`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        authenticate: getAuth(),
        paramsSearch: {
          objectIds: [apartment.id],
          fromDateRange: {
            startDate: "2025-06-01T00:00:00",
            endDate: "2025-07-07T00:00:00",
          },
        },
      }),
    },
  );

  const responseData = (await response.json()) as unknown;
  // Parse the entire response structure
  const responseSchema = z.object({
    result: z
      .object({
        reservations: z.array(reservationSchema),
      })
      .optional(),
  });

  console.log(responseData);
  const parsedResponse = responseSchema.parse(responseData);
  const reservations = parsedResponse.result?.reservations ?? [];

  console.log("Parsed reservations:", reservations.length);
  if (reservations.length > 0) {
    console.log("First reservation:", reservations[0]);
  }

  return reservations;
}

export const idobookingRouter = createTRPCRouter({
  // Pobierz listę apartamentów z idobooking
  getApartmentsList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.type !== UserType.ADMIN) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can access idobooking data",
      });
    }

    const apartments = await getApartmentsList();

    if (apartments.length > 0) {
      const firstApartment = apartments[0];
      if (firstApartment) {
        const reservations = await getReservations(firstApartment);
      }
    }

    return apartments;
  }),
});
