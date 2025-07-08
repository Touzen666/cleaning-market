import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "@/env";

/**
 * Konfiguracja transportera email
 */
export const createTransporter = (): Transporter => {
    // Sprawdź czy mamy wymagane zmienne środowiskowe
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
        throw new Error("Brak konfiguracji SMTP. Sprawdź zmienne środowiskowe: SMTP_HOST, SMTP_USER, SMTP_PASS");
    }

    // W trybie development używamy Ethereal Email do testowania (jeśli skonfigurowane)
    if (env.NODE_ENV === "development" && env.ETHEREAL_USER && env.ETHEREAL_PASS) {
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: env.ETHEREAL_USER,
                pass: env.ETHEREAL_PASS,
            },
        }) as Transporter;
    }

    // W produkcji lub gdy nie ma Ethereal - używamy rzeczywistego SMTP
    return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT ?? "587"),
        secure: false,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    }) as Transporter;
};

/**
 * Pobiera base URL dla aplikacji
 */
export const getBaseUrl = (): string => {
    return env.NEXTAUTH_URL ?? 'http://localhost:3000';
};

/**
 * Wysyła email z załącznikami
 */
export const sendEmail = async (options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    attachments?: Array<{
        filename: string;
        path: string;
        cid?: string;
    }>;
}) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: options.from ?? `"Złote Wynajmy" <${env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const info = await transporter.sendMail(mailOptions);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.log(`📧 Email wysłany do ${options.to}:`, info.messageId);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return info;
}; 