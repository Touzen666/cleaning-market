import {
    createBaseTemplate,
    createWelcomeText,
    createInfoBox,
    createFeaturesList,
    createButtonSection
} from '../components';

export const createWelcomeEmailWithoutPasswordTemplate = (ownerName: string, baseUrl: string) => {
    const welcomeMessage = `Miło nam powitać Cię w gronie właścicieli apartamentów współpracujących z firmą <strong>Złote Wynajmy - Apartamenty z Klasą</strong>!<br><br>Twój profil w naszym systemie zarządzania jest aktywny i gotowy do użycia.`;

    const features = [
        'Śledzenie wynajmu swoich apartamentów w czasie rzeczywistym',
        'Przeglądanie miesięcznych raportów z działalności',
        'Zarządzanie rezerwacjami i dostępnością',
        'Kontakt z naszym zespołem 24/7'
    ];

    const content = `
        ${createWelcomeText(ownerName, welcomeMessage)}
        ${createInfoBox('🔐 Dostęp do panelu', 'Użyj swojego istniejącego hasła do zalogowania się do panelu właściciela')}
        ${createFeaturesList('✨ Dostępne funkcje:', features)}
        ${createButtonSection(
        'Zaloguj się do swojego panelu właściciela:',
        '🚀 Przejdź do panelu',
        `${baseUrl}/apartamentsOwner/login`
    )}
    `;

    return createBaseTemplate({
        title: 'Witamy w Złote Wynajmy',
        content,
        baseUrl
    });
}; 