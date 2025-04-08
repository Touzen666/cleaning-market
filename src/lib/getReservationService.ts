import fs from "fs";
import { JSDOM } from "jsdom";
import * as process from "node:process";
import { type Reservation } from "@prisma/client";
import { db } from "@/server/db";
import moment from "moment";

const user = process.env.IDOBOOKING_USER;
const password = process.env.IDOBOOKING_PASSWORD;
let PHPSESSID = "";


export async function getReservations() {
    const reservationsText = await loginAndDownload();
    const reservations = await parseReservations(reservationsText);
    // const reservation = await getToplayer(reservations[0]!);
    // console.log(reservation);
    // const someReservations = reservations.slice(0, 5);
    await enrichReservations(reservations);
    const dbReservations = await dbUpsert(reservations);
    // console.log(reservations);
    return dbReservations;
}

async function loginAndDownload() {
    const session = await fetch(
        "https://client47056.idosell.com/panel/user/login",
        {
            headers: {
                accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9,pl;q=0.8",
                "cache-control": "max-age=0",
                priority: "u=0, i",
                "sec-ch-ua":
                    '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                Referer: "https://client47056.idosell.com/panel",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
            body: null,
            method: "GET",
        },
    );

    PHPSESSID =
        session.headers.get("set-cookie")?.split(";")[0]?.split("=")[1] ?? "";
    console.log("PHPSESSID", PHPSESSID);

    const login = await fetch(
        "https://client47056.idosell.com/panel/user/login/",
        {
            headers: {
                accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9,pl;q=0.8",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                priority: "u=0, i",
                "sec-ch-ua":
                    '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                cookie:
                    "PHPSESSID=" +
                    PHPSESSID +
                    "; idosellbooking_frntpg=%257B%2522language%2522%253A1%252C%2522currency%2522%253A1%257D; type_of_visitor=client",
                Referer:
                    "https://client47056.idosell.com/panel/user/login/source/logout",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
            body:
                "login=" +
                user +
                "&password=" +
                password +
                "&remember_login%5B%5D=1&domain=client47056.idosell.com",
            method: "POST",
        },
    );

    console.log("login status", login.status);

    if (login.status >= 400) {
        console.log("login failed", await login.text());
        console.log("login failed");
        process.exit(1);
    }

    const reservations = await fetch(
        "https://client47056.idosell.com/panel/reservations-lists/download",
        {
            headers: {
                accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9,pl;q=0.8",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                priority: "u=0, i",
                "sec-ch-ua":
                    '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                cookie:
                    "type_of_visitor=client; WebAnkieta_IdoBooking=1; ck_cook=yes; login=" +
                    user +
                    "; panel_login_cookie=%257B%2522login%2522%253A%2522" +
                    user +
                    "%2522%257D; PHPSESSID=" +
                    PHPSESSID +
                    "; client=" +
                    PHPSESSID +
                    "; _gid=GA1.2.1838747238.1740239209; _clck=1bjfhdm%7C2%7Cftn%7C0%7C1853; positionInCalendar=818.1818237304688; _ga=GA1.1.2018585069.1738004960; _clsk=1fb1q0u%7C1740263750991%7C3%7C1%7Cs.clarity.ms%2Fcollect; _ga_520KR3NJHW=GS1.1.1740263706.109.1.1740263828.60.0.0",
                Referer: "https://client47056.idosell.com/panel/reservations-lists/",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
            body: "processId=189&type=csv",
            method: "POST",
        },
    );

    if (reservations.status !== 200) {
        console.log("reservations failed", await reservations.text());
        console.log("reservations failed");
        process.exit(1);
    }

    const text = await reservations.text();

    // write to file
    // fs.writeFileSync("reservations.csv", text);
    return text;
}

async function parseReservations(reservationsData: string) {
    //read from file
    // const reservationsData = fs.readFileSync("reservations.csv", "utf8");

    // Parse CSV data using proper CSV parsing to handle quotes and escapes
    const reservationsArray = reservationsData
        .split("\n")
        .map((line) => line.split(";"));
    const headers = reservationsArray[0];
    if (!headers) {
        console.log("no headers");
        process.exit(1);
    }

    const reservationObjects: Record<string, string>[] = [];

    for (const reservation of reservationsArray.slice(1)) {
        const reservationObject: Record<string, string> = {};
        if (reservation.length !== headers.length) {
            continue;
        }

        if (reservation[0] === undefined) {
            continue;
        }

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i]!;
            reservationObject[header] = reservation[i]!;
        }
        reservationObjects.push(reservationObject);
    }

    console.log("znaleziono rezerwacji", reservationObjects.length);

    return reservationObjects;
}

function getValueByText(dom: JSDOM, text: string) {
    const document = dom.window.document;
    const xpathExpr = `//div[contains(., '${text}') and not(.//div[contains(., '${text}')])]`;
    const result = document.evaluate(
        xpathExpr,
        document,
        null,
        dom.window.XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
    );

    const node = result.singleNodeValue;
    if (!node) {
        return null;
    }

    return node.textContent;
}

async function getToplayer(reservation: Record<string, string>) {
    const reservationId = reservation.ID;
    if (!reservationId) {
        return reservation;
    }

    console.log("getting toplayer for", reservationId);

    const toplayer = await fetch(
        "https://client47056.idosell.com/panel/reservation/items/id/" +
        reservationId +
        "/toplayer-content/true",
        {
            headers: {
                accept: "/",
                "accept-language": "en-US,en;q=0.9,pl;q=0.8",
                priority: "u=1, i",
                "sec-ch-ua":
                    '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
                cookie:
                    "PHPSESSID=" +
                    PHPSESSID +
                    "; idosellbooking_frntpg=%257B%2522language%2522%253A1%252C%2522currency%2522%253A1%257D; type_of_visitor=client; panel_login_cookie=%257B%2522login%2522%253A%2522barwil128%2522%257D; WebAnkieta_IdoBooking=1; _gid=GA1.2.156367519.1740265178; _clck=dj9mn5%7C2%7Cftn%7C0%7C1879; _gat_gtag_UA_76287829_8=1; _clsk=fesarp%7C1740267696171%7C5%7C1%7Cs.clarity.ms%2Fcollect; _ga_520KR3NJHW=GS1.1.1740265177.1.1.1740267731.20.0.0; _ga=GA1.2.370594152.1740265178",
                Referer:
                    "https://client47056.idosell.com/panel/reservation/read/id/102",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
            body: null,
            method: "POST",
        },
    );

    const tl = await toplayer.text();
    // fs.writeFileSync("toplayer.html", tl);
    // const tl = fs.readFileSync("toplayer.html", "utf8");

    const dom = new JSDOM(tl);
    const dorosli = getValueByText(dom, "Dorośli");
    if (dorosli) {
        reservation.dorosli = dorosli;
    } else {
        console.log("no dorosli", reservationId);
    }
    const dzieci = getValueByText(dom, "Dzieci");
    if (dzieci) {
        reservation.dzieci = dzieci;
    } else {
        console.log("no dzieci", reservationId);
    }

    return reservation;
}

async function enrichReservations(reservations: Record<string, string>[]) {
    const promises = reservations.map(async (reservation) => {
        await getToplayer(reservation);
    });

    return await Promise.all(promises);
}

async function dbUpsert(reservations: Record<string, string>[]) {
    const reservationsArr = [];
    for (const reservation of reservations) {
        const dbReservation = mapReservation(reservation);
        await db.reservation.upsert({
            where: {
                id: dbReservation.id
            },
            create: dbReservation,
            update: dbReservation
        })
        reservationsArr.push(dbReservation)
    }
    return reservationsArr;
}

// const idbookingReservation = {
//     '': '5',
//     ID: '98',
//     'Źródło': 'Airbnb',
//     '"Data złożenia"': '22.02.2025',
//     'Klient/Gość': '"Adma Wkładam"',
//     '"Data przyjazdu"': '"09.03.2025 15:00"',
//     '"Data wyjazdu"': '"10.03.2025 10:00"',
//     '"Miejsca noclegowe"': '"Przytulny apartament Brooklyn"',
//     Lokalizacje: '"Podwisłocze 38 198A"',
//     Status: 'Przyjęta',
//     'Płatności': '"opłacona w Airbnb"',
//     'Wartość': '194,00',
//     Waluta: 'PLN',
//     dorosli: 'Dorośli: 1',
//     dzieci: 'Dzieci do 2 lat: 0'
// }

function mapReservation(reservation: Record<string, string>): Reservation {
    return {
        id: parseInt(reservation.ID!),
        source: reservation['Źródło']!,
        createDate: moment(reservation['"Data złożenia"'], 'DD.MM.YYYY').toDate(),
        guest: reservation['Klient/Gość']!,
        start: moment(reservation['"Data przyjazdu"'], 'DD.MM.YYYY HH:mm').toDate(),
        end: moment(reservation['"Data wyjazdu"'], 'DD.MM.YYYY HH:mm').toDate(),
        apartmentName: reservation['"Miejsca noclegowe"']!,
        address: reservation.Lokalizacje!,
        status: reservation.Status!,
        payment: reservation['Płatności']!,
        paymantValue: parseFloat(reservation['Wartość']!.replace(',', '.')),
        currency: reservation.Waluta!,
        adults: parseInt(reservation.dorosli?.split(':')[1] || '0'),
        children: parseInt(reservation.dzieci?.split(':')[1] || '0'),
        apartmentId: null
    };
}
