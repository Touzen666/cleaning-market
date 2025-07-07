import {
    createBaseTemplate,
    createWelcomeText,
    createPasswordBox,
    createFeaturesList,
    createButtonSection
} from '../components';

export const createWelcomeEmailWithPasswordTemplate = (ownerName: string, temporaryPassword: string, baseUrl: string) => {
    const welcomeMessage = `Miło nam powitać Cię w gronie właścicieli apartamentów współpracujących z firmą <strong>Złote Wynajmy - Apartamenty z Klasą</strong>!<br><br>Twój profil został pomyślnie utworzony w naszym systemie zarządzania. Oto Twoje dane dostępowe:`;

    const features = [
        'Przy pierwszym logowaniu będziesz musiał zmienić hasło na własne',
        'Możesz śledzić wynajem swoich apartamentów w czasie rzeczywistym',
        'Otrzymasz miesięczne raporty z działalności',
        'Nasz zespół jest do Twojej dyspozycji 24/7'
    ];

    const content = `
        ${createWelcomeText(ownerName, welcomeMessage)}
        ${createPasswordBox(temporaryPassword)}
        ${createFeaturesList('✨ Ważne informacje:', features)}
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