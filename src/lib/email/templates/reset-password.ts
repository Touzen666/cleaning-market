export const createResetPasswordEmail = (ownerName: string, resetUrl: string) => `
  <p>Dzień dobry ${ownerName},</p>
  <p>Otrzymaliśmy prośbę o zresetowanie Twojego hasła. Kliknij poniższy link, aby ustawić nowe:</p>
  <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #E7AA3D; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Zresetuj hasło</a></p>
  <p>Link jest ważny przez 1 godzinę.</p>
  <p>Jeśli to nie Ty prosiłeś o reset hasła, możesz bezpiecznie zignorować tę wiadomość.</p>
`; 