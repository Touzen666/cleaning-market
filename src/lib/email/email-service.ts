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

    const emailProvider = env.EMAIL_PROVIDER ?? 'smtp';

    // Użyj Ethereal Email do testowania, jeśli jest jawnie skonfigurowany
    if (emailProvider === 'ethereal') {
        if (!env.ETHEREAL_USER || !env.ETHEREAL_PASS) {
            throw new Error("Brak konfiguracji Ethereal. Sprawdź zmienne środowiskowe: ETHEREAL_USER, ETHEREAL_PASS");
        }
        console.log("📨 Using Ethereal email provider for development.");
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: env.ETHEREAL_USER,
                pass: env.ETHEREAL_PASS,
            },
        }) as Transporter;
    }

    // Domyślnie używamy rzeczywistego SMTP
    console.log("📨 Using SMTP email provider.");
    return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT ?? "587"),
        secure: (env.SMTP_PORT === "465"), // true for 465, false for other ports
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
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
        contentType?: string;
    }>;
}) => {
    const transporter = createTransporter();

    const fromUser = env.SMTP_FROM_USER ?? env.SMTP_USER;

    const mailOptions = {
        from: options.from ?? `"Złote Wynajmy" <${fromUser}>`,
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