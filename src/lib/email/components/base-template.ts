export interface BaseTemplateProps {
    title: string;
    content: string;
    baseUrl: string;
}

export const createBaseTemplate = ({ title, content, baseUrl }: BaseTemplateProps) => {
    return `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('${baseUrl}/logo.svg') center/cover;
            opacity: 0.1;
            z-index: 0;
        }
        .header h1 {
            position: relative;
            z-index: 1;
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header p {
            position: relative;
            z-index: 1;
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
            background: white;
        }
        .footer {
            background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .footer-logo {
            max-width: 180px;
            height: auto;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .footer-info {
            margin-bottom: 20px;
        }
        .footer-info p {
            margin: 5px 0;
            font-size: 14px;
        }
        .footer-info a {
            color: #fbbf24;
            text-decoration: none;
            transition: color 0.3s ease;
        }
        .footer-info a:hover {
            color: #f59e0b;
            text-decoration: underline;
        }
        .footer-signature {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 12px;
            opacity: 0.8;
            line-height: 1.8;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1><img src="cid:logo@zlote-wynajmy.pl" alt="Złote Wynajmy" style="max-width:180px; height:auto; margin-bottom:20px; border-radius:8px;"> Złote Wynajmy - Apartamenty z Klasą</h1>
            <p>Witamy w gronie naszych Partnerów!</p>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <img src="cid:logo@zlote-wynajmy.pl" alt="Złote Wynajmy" style="max-width:180px; height:auto; margin-bottom:20px; border-radius:8px;">
            <div class="footer-info">
                <p><strong>Złote Wynajmy - Apartamenty z Klasą</strong></p>
                <p>Z wyrazami szacunku,</p>
                <p>Bartosz Wilk</p>
                <p>Dyrektor ds. Technologi &  Koordynator ds. Obsługi Nieruchomości  </p>
                <p>📧 <a href="mailto:biuro@zlote-wynajmy.com">biuro@zlote-wynajmy.com</a></p>
                <p>📱 <a href="tel:+48690884961">+48 690 884 961</a></p>
                <p>📱 <a href="tel:+48531392423">+48 531 392 423</a></p>
                <p>🌐 <a href="https://www.zlote-wynajmy.pl" target="_blank">www.zlote-wynajmy.pl</a></p>
            </div>
            <div class="footer-signature">
                Dziękujemy za zaufanie i życzymy owocnej współpracy!<br>
                Pozdrawiamy serdecznie,<br>
                Zespół Złote Wynajmy - Apartamenty z Klasą
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

export const createCTAButton = (text: string, href: string) => `
  <div style="text-align: center;">
    <a href="${href}" 
      style="
        display: inline-block;
        text-transform: uppercase;
        width: 80%;
        padding: 10px 40px;
        font-weight: 700;
        background: #E7AA3D;
        border: 1px solid #E7AA3D;
        color: white !important;
        border-radius: 5px;
        border-bottom: 2px solid white;
        transition: all .3s ease-in-out;
        text-decoration: none;
        font-size: 16px;
        margin: 20px 0;
        text-align: center;
      "
    >${text}</a>
  </div>
`; 