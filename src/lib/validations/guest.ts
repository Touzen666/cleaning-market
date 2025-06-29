import { z } from "zod";

export const checkInFormSchema = z.object({
    bookingHolderFirstName: z.string().min(1, "Imię rezerwującego jest wymagane"),
    bookingHolderLastName: z.string().min(1, "Nazwisko rezerwującego jest wymagane"),
    isDifferentGuest: z.boolean(),
    guestFirstName: z.string().optional(),
    guestLastName: z.string().optional(),
    firstName: z.string().min(1, "Imię jest wymagane"),
    lastName: z.string().min(1, "Nazwisko jest wymagane"),
    dateOfBirth: z.string().min(1, "Data urodzenia jest wymagana"),
    nationality: z.string().min(1, "Narodowość jest wymagana"),
    documentType: z.string().min(1, "Typ dokumentu jest wymagany"),
    documentNumber: z.string().min(1, "Numer dokumentu jest wymagany"),
    addressStreet: z.string().min(1, "Ulica jest wymagana"),
    addressCity: z.string().min(1, "Miasto jest wymagane"),
    addressZipCode: z.string().min(1, "Kod pocztowy jest wymagany"),
    addressCountry: z.string().min(1, "Kraj jest wymagany"),
    submittedApartmentIdentifier: z.string().min(1, "Identyfikator apartamentu jest wymagany"),
    stayStartDate: z.string().min(1, "Data rozpoczęcia pobytu jest wymagana"),
    stayEndDate: z.string().min(1, "Data zakończenia pobytu jest wymagana"),
});

export const guestLoginSchema = z.object({
    firstName: z.string().min(1, "Imię jest wymagane"),
    lastName: z.string().min(1, "Nazwisko jest wymagane"),
    documentNumber: z.string().min(1, "Numer dokumentu jest wymagany"),
    apartmentSlug: z.string().min(1, "Slug apartamentu jest wymagany"),
});

export const guestCheckinSchema = z.object({
    apartmentSlug: z.string().min(1, "Apartment slug is required")
});

// Guest Dashboard schemas
export const apartmentDataSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
});

export const guestDataSchema = z.object({
    authenticated: z.boolean(),
    apartmentSlug: z.string(),
    reservation: z.object({
        start: z.string(),
        end: z.string(),
        guest: z.string(),
        apartment: apartmentDataSchema.optional(),
    }).optional(),
    checkInCard: z.object({
        firstName: z.string(),
        lastName: z.string(),
        isPrimaryGuest: z.boolean(),
        actualCheckInTime: z.string().nullable().optional(),
    }).optional(),
    shouldShowCheckIn: z.boolean().optional(),
    canCheckInFrom: z.string().optional(),
    sessionExpiresAt: z.string().optional(),
});

// Page props schemas
export const checkInCardPagePropsSchema = z.object({
    params: z.object({
        apartmentSlug: z.string(),
    }),
});

export const guestLoginPagePropsSchema = z.object({
    params: z.promise(z.object({
        apartmentSlug: z.string(),
    })),
});

// Export inferred types
export type CheckInFormData = z.infer<typeof checkInFormSchema>;
export type GuestLoginData = z.infer<typeof guestLoginSchema>;
export type GuestCheckinData = z.infer<typeof guestCheckinSchema>;
export type ApartmentData = z.infer<typeof apartmentDataSchema>;
export type GuestData = z.infer<typeof guestDataSchema>;
export type CheckInCardPageProps = z.infer<typeof checkInCardPagePropsSchema>;
export type GuestLoginPageProps = z.infer<typeof guestLoginPagePropsSchema>;

export const guestVerifySchema = z.object({
    apartmentSlug: z.string(),
    sessionToken: z.string().optional(),
}); 