// Komponent przycisku CTA
export const createCTAButton = (text: string, href: string) => {
    return `
        <style>
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                margin: 20px 0;
                box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2);
                transition: all 0.3s ease;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(245, 158, 11, 0.3);
            }
        </style>
        <div style="text-align: center;">
            <a href="${href}" class="cta-button">
                ${text}
            </a>
        </div>
    `;
};

// Komponent box z hasłem
export const createPasswordBox = (password: string) => {
    return `
        <style>
            .password-box {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px solid #f59e0b;
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);
            }
            .password-label {
                font-size: 16px;
                color: #92400e;
                margin-bottom: 15px;
                font-weight: 600;
            }
            .password-value {
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 3px;
                color: #92400e;
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                border: 2px dashed #f59e0b;
                margin: 10px 0;
                font-family: 'Courier New', monospace;
            }
            .password-note {
                font-size: 12px;
                color: #92400e;
                margin-top: 10px;
                opacity: 0.8;
            }
            @media (max-width: 600px) {
                .password-value {
                    font-size: 24px;
                    letter-spacing: 2px;
                }
            }
        </style>
        <div class="password-box">
            <div class="password-label">🔑 Twoje tymczasowe hasło:</div>
            <div class="password-value">${password}</div>
            <div class="password-note">Hasło jest ważne przez 7 dni</div>
        </div>
    `;
};

// Komponent info box (niebieski)
export const createInfoBox = (title: string, content: string) => {
    return `
        <style>
            .info-box {
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                border: 2px solid #3b82f6;
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
            }
            .info-box h3 {
                color: #1e40af;
                margin-bottom: 15px;
                font-size: 18px;
                font-weight: 600;
            }
            .info-box p {
                font-size: 16px;
                color: #1e40af;
                margin: 0;
                font-weight: 500;
            }
        </style>
        <div class="info-box">
            <h3>${title}</h3>
            <p>${content}</p>
        </div>
    `;
};

// Komponent lista funkcji
export const createFeaturesList = (title: string, features: string[]) => {
    const featuresHtml = features.map(feature => `<li>${feature}</li>`).join('');

    return `
        <style>
            .features-list {
                background: #f8fafc;
                border-radius: 8px;
                padding: 25px;
                margin: 30px 0;
            }
            .features-list h3 {
                color: #1f2937;
                margin-bottom: 15px;
                font-size: 18px;
            }
            .features-list ul {
                margin: 0;
                padding-left: 20px;
            }
            .features-list li {
                margin-bottom: 8px;
                color: #4b5563;
            }
        </style>
        <div class="features-list">
            <h3>${title}</h3>
            <ul>
                ${featuresHtml}
            </ul>
        </div>
    `;
};

// Komponent tekst powitalny
export const createWelcomeText = (ownerName: string, message: string) => {
    return `
        <style>
            .welcome-text {
                font-size: 18px;
                color: #374151;
                margin-bottom: 30px;
            }
        </style>
        <div class="welcome-text">
            <h2>Dzień dobry ${ownerName}!</h2>
            <p>${message}</p>
        </div>
    `;
};

// Komponent sekcja z przyciskiem
export const createButtonSection = (title: string, buttonText: string, buttonHref: string) => {
    return `
        <p style="text-align: center; margin: 30px 0;">
            <strong>${title}</strong>
        </p>
        ${createCTAButton(buttonText, buttonHref)}
    `;
}; 