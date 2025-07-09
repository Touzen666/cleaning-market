import {
    createBaseTemplate,
    createWelcomeText,
    createInfoBox,
    createFeaturesList,
    createButtonSection
} from '../components';

export interface MonthlyReportData {
    ownerName: string;
    month: string;
    year: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    baseUrl: string;
}

export const createMonthlyReportTemplate = (data: MonthlyReportData) => {
    const welcomeMessage = `Oto Twój miesięczny raport za <strong>${data.month} ${data.year}</strong>. Poniżej znajdziesz podsumowanie działalności Twoich apartamentów:`;

    const reportStats = [
        `Liczba rezerwacji: ${data.totalBookings}`,
        `Przychód całkowity: ${data.totalRevenue.toLocaleString('pl-PL')} zł`,
        `Średnia ocena gości: ${data.averageRating.toFixed(1)}/5.0`,
        'Wszystkie płatności zostały przetworzone'
    ];

    const content = `
        ${createWelcomeText(data.ownerName, welcomeMessage)}
        ${createInfoBox('📊 Podsumowanie miesiąca', `Twój biznes rozwija się świetnie! W tym miesiącu obsłużyliśmy ${data.totalBookings} rezerwacji.`)}
        ${createFeaturesList('📈 Statystyki:', reportStats)}
        ${createButtonSection(
        'Zobacz szczegółowy raport w panelu:',
        '📋 Przejdź do raportu',
        `${data.baseUrl}/apartamentsOwner/reports`
    )}
    `;

    return createBaseTemplate({
        title: `Raport miesięczny dla ${data.ownerName}`,
        content,
    });
}; 