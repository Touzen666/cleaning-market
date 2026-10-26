
                    <?php

$address = 'https://client1679.idobooking.com/api/clients/edit/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['clients'] = array();
$request['params']['clients'][0] = array();
$request['params']['clients'][0]['login'] = "login";
$request['params']['clients'][0]['id'] = 1;
$request['params']['clients'][0]['password'] = "password";
$request['params']['clients'][0]['type'] = 'person';
$request['params']['clients'][0]['status'] = 'active';
$request['params']['clients'][0]['companyName'] = "companyName";
$request['params']['clients'][0]['taxNumber'] = "taxNumber";
$request['params']['clients'][0]['firstName'] = "firstName";
$request['params']['clients'][0]['lastName'] = "lastName";
$request['params']['clients'][0]['street'] = "street";
$request['params']['clients'][0]['zipcode'] = "zipcode";
$request['params']['clients'][0]['city'] = "city";
$request['params']['clients'][0]['countryCode'] = "countryCode";
$request['params']['clients'][0]['phone'] = "phone";
$request['params']['clients'][0]['email'] = "email";
$request['params']['clients'][0]['language'] = "language";
$request['params']['clients'][0]['currency'] = "currency";
$request['params']['clients'][0]['guestData'] = array();
$request['params']['clients'][0]['guestData']['firstName'] = "firstName";
$request['params']['clients'][0]['guestData']['lastName'] = "lastName";
$request['params']['clients'][0]['guestData']['street'] = "street";
$request['params']['clients'][0]['guestData']['zipcode'] = "zipcode";
$request['params']['clients'][0]['guestData']['city'] = "city";
$request['params']['clients'][0]['guestData']['countryCode'] = "countryCode";
$request['params']['clients'][0]['guestData']['phone'] = "phone";
$request['params']['clients'][0]['guestData']['email'] = "email";
$request['params']['clients'][0]['guestData']['language'] = "language";
$request['params']['clients'][0]['invoiceData'] = array();
$request['params']['clients'][0]['invoiceData']['firstName'] = "firstName";
$request['params']['clients'][0]['invoiceData']['lastName'] = "lastName";
$request['params']['clients'][0]['invoiceData']['companyName'] = "companyName";
$request['params']['clients'][0]['invoiceData']['taxNumber'] = "taxNumber";
$request['params']['clients'][0]['invoiceData']['street'] = "street";
$request['params']['clients'][0]['invoiceData']['zipcode'] = "zipcode";
$request['params']['clients'][0]['invoiceData']['city'] = "city";
$request['params']['clients'][0]['invoiceData']['countryCode'] = "countryCode";
$request['params']['clients'][0]['notification'] = 'y';
$request['params']['clients'][0]['sendNewsletter'] = 'y';
$request['params']['clients'][0]['note'] = "note";
$request['params']['clients'][0]['discountForItemsInPromotion'] = 2.0;
$request['params']['clients'][0]['discountForItemsNotInPromotion'] = 3.0;

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
       
                