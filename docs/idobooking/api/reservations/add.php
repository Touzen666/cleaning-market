
                    <?php

$address = 'https://client1679.idobooking.com/api/reservations/add/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['reservations'] = array();
$request['params']['reservations'][0] = array();
$request['params']['reservations'][0]['dateFrom'] = "dateFrom";
$request['params']['reservations'][0]['dateTo'] = "dateTo";
$request['params']['reservations'][0]['price'] = 1.0;
$request['params']['reservations'][0]['clientId'] = 2;
$request['params']['reservations'][0]['clientData'] = array();
$request['params']['reservations'][0]['clientData']['login'] = "login";
$request['params']['reservations'][0]['clientData']['password'] = "password";
$request['params']['reservations'][0]['clientData']['type'] = 'person';
$request['params']['reservations'][0]['clientData']['status'] = 'active';
$request['params']['reservations'][0]['clientData']['companyName'] = "companyName";
$request['params']['reservations'][0]['clientData']['taxNumber'] = "taxNumber";
$request['params']['reservations'][0]['clientData']['firstName'] = "firstName";
$request['params']['reservations'][0]['clientData']['lastName'] = "lastName";
$request['params']['reservations'][0]['clientData']['street'] = "street";
$request['params']['reservations'][0]['clientData']['zipcode'] = "zipcode";
$request['params']['reservations'][0]['clientData']['city'] = "city";
$request['params']['reservations'][0]['clientData']['countryCode'] = "countryCode";
$request['params']['reservations'][0]['clientData']['phone'] = "phone";
$request['params']['reservations'][0]['clientData']['email'] = "email";
$request['params']['reservations'][0]['clientData']['language'] = "language";
$request['params']['reservations'][0]['clientData']['currency'] = "currency";
$request['params']['reservations'][0]['clientData']['guestData'] = array();
$request['params']['reservations'][0]['clientData']['guestData']['firstName'] = "firstName";
$request['params']['reservations'][0]['clientData']['guestData']['lastName'] = "lastName";
$request['params']['reservations'][0]['clientData']['guestData']['street'] = "street";
$request['params']['reservations'][0]['clientData']['guestData']['zipcode'] = "zipcode";
$request['params']['reservations'][0]['clientData']['guestData']['city'] = "city";
$request['params']['reservations'][0]['clientData']['guestData']['countryCode'] = "countryCode";
$request['params']['reservations'][0]['clientData']['guestData']['phone'] = "phone";
$request['params']['reservations'][0]['clientData']['guestData']['email'] = "email";
$request['params']['reservations'][0]['clientData']['guestData']['language'] = "language";
$request['params']['reservations'][0]['clientData']['invoiceData'] = array();
$request['params']['reservations'][0]['clientData']['invoiceData']['firstName'] = "firstName";
$request['params']['reservations'][0]['clientData']['invoiceData']['lastName'] = "lastName";
$request['params']['reservations'][0]['clientData']['invoiceData']['companyName'] = "companyName";
$request['params']['reservations'][0]['clientData']['invoiceData']['taxNumber'] = "taxNumber";
$request['params']['reservations'][0]['clientData']['invoiceData']['street'] = "street";
$request['params']['reservations'][0]['clientData']['invoiceData']['zipcode'] = "zipcode";
$request['params']['reservations'][0]['clientData']['invoiceData']['city'] = "city";
$request['params']['reservations'][0]['clientData']['invoiceData']['countryCode'] = "countryCode";
$request['params']['reservations'][0]['clientData']['notification'] = 'y';
$request['params']['reservations'][0]['clientData']['sendNewsletter'] = 'y';
$request['params']['reservations'][0]['clientData']['note'] = "note";
$request['params']['reservations'][0]['clientData']['discountForItemsInPromotion'] = 3.0;
$request['params']['reservations'][0]['clientData']['discountForItemsNotInPromotion'] = 4.0;
$request['params']['reservations'][0]['apiNote'] = "apiNote";
$request['params']['reservations'][0]['clientNote'] = "clientNote";
$request['params']['reservations'][0]['externalNote'] = "externalNote";
$request['params']['reservations'][0]['internalNote'] = "internalNote";
$request['params']['reservations'][0]['validAvailability'] = true;
$request['params']['reservations'][0]['status'] = 'unconfirmed';
$request['params']['reservations'][0]['internalSource'] = 'other';
$request['params']['reservations'][0]['packages'] = array();
$request['params']['reservations'][0]['packages'][0] = array();
$request['params']['reservations'][0]['packages'][0]['packageId'] = 5;
$request['params']['reservations'][0]['packages'][0]['price'] = 6.0;
$request['params']['reservations'][0]['items'] = array();
$request['params']['reservations'][0]['items'][0] = array();
$request['params']['reservations'][0]['items'][0]['objectItemId'] = 7;
$request['params']['reservations'][0]['items'][0]['objectId'] = 8;
$request['params']['reservations'][0]['items'][0]['price'] = 9.0;
$request['params']['reservations'][0]['items'][0]['vat'] = 10.0;
$request['params']['reservations'][0]['items'][0]['numberOfAdults'] = 11;
$request['params']['reservations'][0]['items'][0]['numberOfBigChildren'] = 12;
$request['params']['reservations'][0]['items'][0]['numberOfSmallChildren'] = 13;
$request['params']['reservations'][0]['items'][0]['addons'] = array();
$request['params']['reservations'][0]['items'][0]['addons'][0] = array();
$request['params']['reservations'][0]['items'][0]['addons'][0]['addonId'] = 14;
$request['params']['reservations'][0]['items'][0]['addons'][0]['persons'] = 15;
$request['params']['reservations'][0]['items'][0]['addons'][0]['nights'] = 16;
$request['params']['reservations'][0]['items'][0]['addons'][0]['quantity'] = 17;
$request['params']['reservations'][0]['items'][0]['addons'][0]['price'] = 18.0;
$request['params']['reservations'][0]['items'][0]['addons'][0]['vat'] = 19.0;
$request['params']['reservations'][0]['currency'] = "currency";
$request['params']['reservations'][0]['notify'] = 'y';
$request['params']['reservations'][0]['notifyService'] = 'y';

$request_json = json_encode($request);
$headers = array(
    'Accept: application/json',
    'Content-Type: application/json;charset=UTF-8'
);

$curl = curl_init($address);
curl_setopt($curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($curl, CURLOPT_FORBID_REUSE, 1);
curl_setopt($curl, CURLINFO_HEADER_OUT, 1);
curl_setopt($curl, CURLOPT_HEADER, 1);
curl_setopt($curl, CURLOPT_POST, 1);
curl_setopt($curl, CURLOPT_POSTFIELDS, $request_json);
curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($curl);
$status = curl_getinfo($curl);
curl_close($curl);
       
                