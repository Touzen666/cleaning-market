
                    <?php

$address = 'https://client1679.idobooking.com/api/reservations/edit/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['reservations'] = array();
$request['params']['reservations'][0] = array();
$request['params']['reservations'][0]['id'] = 1;
$request['params']['reservations'][0]['dateFrom'] = "dateFrom";
$request['params']['reservations'][0]['dateTo'] = "dateTo";
$request['params']['reservations'][0]['clientId'] = 2;
$request['params']['reservations'][0]['clientNote'] = "clientNote";
$request['params']['reservations'][0]['externalNote'] = "externalNote";
$request['params']['reservations'][0]['apiNote'] = "apiNote";
$request['params']['reservations'][0]['internalNote'] = "internalNote";
$request['params']['reservations'][0]['items'] = array();
$request['params']['reservations'][0]['items'][0] = array();
$request['params']['reservations'][0]['items'][0]['objectItemId'] = 3;
$request['params']['reservations'][0]['items'][0]['price'] = 4.0;
$request['params']['reservations'][0]['items'][0]['priceCorrection'] = 5.0;
$request['params']['reservations'][0]['items'][0]['vat'] = 6.0;
$request['params']['reservations'][0]['items'][0]['numberOfAdults'] = 7;
$request['params']['reservations'][0]['items'][0]['numberOfBigChildren'] = 8;
$request['params']['reservations'][0]['items'][0]['numberOfSmallChildren'] = 9;
$request['params']['reservations'][0]['items'][0]['addons'] = array();
$request['params']['reservations'][0]['items'][0]['addons'][0] = array();
$request['params']['reservations'][0]['items'][0]['addons'][0]['addonId'] = 10;
$request['params']['reservations'][0]['items'][0]['addons'][0]['persons'] = 11;
$request['params']['reservations'][0]['items'][0]['addons'][0]['nights'] = 12;
$request['params']['reservations'][0]['items'][0]['addons'][0]['quantity'] = 13;
$request['params']['reservations'][0]['items'][0]['addons'][0]['price'] = 14.0;
$request['params']['reservations'][0]['items'][0]['addons'][0]['vat'] = 15.0;
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
       
                