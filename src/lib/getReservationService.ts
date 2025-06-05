import { JSDOM } from "jsdom";
import * as process from "node:process";
import { type Reservation } from "@prisma/client";
import { db } from "@/server/db";
import moment from "moment";

const user = process.env.IDOBOOKING_USER;
const password = process.env.IDOBOOKING_PASSWORD;
let PHPSESSID = "";
let panelLoginCookie = ""; // Store panel_login_cookie
let fullCookieString = ""; // Store the full cookie string from successful login
const IDOBOOKING_BASE_URL = "https://client47056.idosell.com"; // Base URL for Idobooking panel


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
    // Define common browser-like headers to be used across requests
    const commonHeaders = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9,pl;q=0.8", // You might want to adjust this to pl-PL,pl;q=0.9 if that's your primary browser lang
        "cache-control": "max-age=0",
        "priority": "u=0, i",
        "sec-ch-ua": '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"', // Example, update if needed
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"', // Example, update if needed
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "upgrade-insecure-requests": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36" // Example User-Agent
    };

    // Step 1: Fetch the login page to get an initial PHPSESSID cookie.
    console.log("Step 1: Fetching initial login page to get PHPSESSID...");
    const initialSession = await fetch(
        `${IDOBOOKING_BASE_URL}/panel/user/login`,
        {
            headers: {
                ...commonHeaders,
                "sec-fetch-user": "?1", // Specific to initial navigation
                "Referer": `${IDOBOOKING_BASE_URL}/panel/`, // Common referer for initial visit
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
        },
    );
    console.log("Initial session fetch status:", initialSession.status);

    const initialSetCookie = initialSession.headers.get("set-cookie");
    if (initialSetCookie) {
        console.log("Set-Cookie from initial session fetch:", initialSetCookie);
        PHPSESSID = (/PHPSESSID=([^;]+)/.exec(initialSetCookie))?.[1] ?? PHPSESSID;
        panelLoginCookie = (/panel_login_cookie=([^;]+)/.exec(initialSetCookie))?.[1] ?? panelLoginCookie;
        // Potentially extract other cookies if they seem relevant from your manual tests
        // const typeOfVisitor = initialSetCookie.match(/type_of_visitor=([^;]+)/)?.[1];
        // if (typeOfVisitor) fullCookieString += `; type_of_visitor=${typeOfVisitor}`;
    } else {
        console.warn("No Set-Cookie header from initial session fetch.");
    }
    console.log(`PHPSESSID after initial fetch: ${PHPSESSID}, panelLoginCookie: ${panelLoginCookie}`);

    // Step 2: Perform the actual login by sending credentials (user/password).
    // We now expect 200 OK if successful, as observed.
    console.log("Step 2: Posting login credentials...");
    const loginResponse = await fetch(
        `${IDOBOOKING_BASE_URL}/panel/user/login/`,
        {
            method: "POST",
            headers: {
                ...commonHeaders, // Base headers
                "content-type": "application/x-www-form-urlencoded",
                cookie: `PHPSESSID=${PHPSESSID}${panelLoginCookie ? "; panel_login_cookie=" + panelLoginCookie : ""}`,
                "Referer": `${IDOBOOKING_BASE_URL}/panel/user/login/`,
                "sec-fetch-user": "?1", // Often present on user-initiated form submissions
                "origin": IDOBOOKING_BASE_URL, // Added origin for POST
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body:
                `login=${encodeURIComponent(user!)}&password=${encodeURIComponent(password!)}&remember_login%5B%5D=1&domain=client47056.idosell.com`,
            // redirect: 'manual', // Removed, as we now expect 200 and no manual redirect handling for now
        },
    );

    console.log("Login POST response status:", loginResponse.status);

    if (loginResponse.status !== 200) {
        console.error("Login POST failed. Status:", loginResponse.status);
        try {
            const errorBody = await loginResponse.text();
            console.error("Login POST error body:", errorBody.substring(0, 500));
        } catch (e) {
            console.error("Could not read error body from login POST.");
        }
        process.exit(1);
    }

    // Step 3: Process cookies from the login POST response (if any).
    // Even with a 200, there might be updated cookies, though logs say otherwise currently.
    const loginSetCookie = loginResponse.headers.get("set-cookie");
    if (loginSetCookie) {
        console.log("Set-Cookie header from Login POST response (status 200):", loginSetCookie);
        const newPHPSESSID = (/PHPSESSID=([^;]+)/.exec(loginSetCookie))?.[1];
        if (newPHPSESSID) PHPSESSID = newPHPSESSID;
        const newPanelCookie = (/panel_login_cookie=([^;]+)/.exec(loginSetCookie))?.[1];
        if (newPanelCookie) panelLoginCookie = newPanelCookie;
    } else {
        console.log("No Set-Cookie header in Login POST response (status 200).");
    }

    // Construct the cookie string for downloading the CSV
    // Primarily use cookies obtained from the initial GET, potentially updated by POST response.
    fullCookieString = `PHPSESSID=${PHPSESSID}`;
    // Manually add panel_login_cookie based on successful manual test, as script doesn't receive it via Set-Cookie
    // The value for 'login' inside the cookie should be the actual username.
    const panelLoginCookieValue = encodeURIComponent(`{"login":"${user}"}`);
    fullCookieString += `; panel_login_cookie=${panelLoginCookieValue}`;

    // Add other cookies observed in successful manual browser navigation and download
    // Replicating the cookie string from the previously working version as closely as possible.
    fullCookieString += "; type_of_visitor=client";
    fullCookieString += "; WebAnkieta_IdoBooking=1";
    fullCookieString += "; idosellbooking_frntpg=" + encodeURIComponent("{\"language\":1,\"currency\":1}");
    fullCookieString += "; ck_cook=yes"; // Added from previously working version
    if (user) { // Add 'login=<username>' cookie if user is defined
        fullCookieString += `; login=${encodeURIComponent(user)}`;
    }
    // The WV also had 'client=' + PHPSESSID again, let's try adding that too.
    // However, ensure PHPSESSID is defined before appending it, to avoid 'client=undefined'.
    if (PHPSESSID) {
        fullCookieString += `; client=${PHPSESSID}`;
    }
    // Note: Analytic cookies like _ga, _gid, _clck are omitted for now as they are less likely to be critical for auth.

    console.log("Constructed fullCookieString for CSV download:", fullCookieString);

    // Step 4 (formerly 5): Attempt to download the CSV file.
    // We are skipping the explicit redirect following step for now as login POST returns 200.
    console.log("Step 4: Attempting to download CSV...");
    const reservationsResponse = await fetch(
        `${IDOBOOKING_BASE_URL}/panel/reservations-lists/download`,
        {
            method: "POST", // Make sure this is POST as in WV
            headers: {
                ...commonHeaders, // Base headers
                "content-type": "application/x-www-form-urlencoded",
                cookie: fullCookieString,
                "Referer": `${IDOBOOKING_BASE_URL}/panel/reservations-lists/`,
                "sec-fetch-user": "?1", // Similar to other user-initiated actions
                "origin": IDOBOOKING_BASE_URL, // Added origin for POST
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: "processId=189&type=csv",
        },
    );

    // Check if CSV download was successful
    if (reservationsResponse.status !== 200) {
        console.error(`CSV download failed. Status: ${reservationsResponse.status}`);
        try {
            const errorBody = await reservationsResponse.text();
            console.error("CSV download error body (first 500 chars):", errorBody.substring(0, 500));
        } catch (e) {
            console.error("Could not read error body from CSV download.");
        }
        process.exit(1);
    }

    const text = await reservationsResponse.text();

    // Log a sample of the downloaded text to verify if it's CSV or HTML
    console.log("--- Downloaded Content (reservationsText) Sample ---");
    console.log(text.substring(0, 500));
    console.log("--- End Downloaded Content Sample ---");

    return text;
}

async function parseReservations(reservationsData: string) {
    // This function parses the raw string data (expected to be CSV) into an array of reservation objects.
    // It splits the data by lines, then each line by semicolons.
    // The first line is assumed to be headers.

    // Check if the data seems like HTML, which would indicate a problem in the download step.
    if (reservationsData.trim().toLowerCase().startsWith("<!doctype html") || reservationsData.trim().toLowerCase().startsWith("<html")) {
        console.error("Error: parseReservations received HTML content instead of CSV. Aborting parse.");
        console.error("Received content sample (first 300 chars):", reservationsData.substring(0, 300));
        // Optionally, throw an error or return an empty array to prevent further processing issues.
        // For now, we'll proceed, but this will likely lead to errors in mapReservation.
        // A more robust solution would be to throw an error here.
    }

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
    if (reservations.length > 0) {
        console.log("Sample reservation object from CSV (feed to mapReservation):", JSON.stringify(reservations[0], null, 2));
    }
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
        paymantValue: typeof reservation['Wartość'] === 'string' ? parseFloat(reservation['Wartość'].replace(',', '.')) : 0,
        currency: reservation.Waluta!,
        adults: parseInt(reservation.dorosli?.split(':')[1] ?? '0'),
        children: parseInt(reservation.dzieci?.split(':')[1] ?? '0'),
        apartmentId: null
    };
}
