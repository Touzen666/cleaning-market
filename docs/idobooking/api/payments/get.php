
                    <?php

$address = 'https://client1679.idobooking.com/api/payments/get/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['settings'] = array();
$request['settings']['page'] = 1;
$request['settings']['number'] = 2;
$request['params'] = array();
$request['params']['reservationIds'] = array();
$request['params']['reservationIds'][0] = 3;
$request['params']['paymentIds'] = array();
$request['params']['paymentIds'][0] = 4;
$request['params']['statuses'] = array();
$request['params']['statuses'][0] = 'pending';
$request['params']['paymentTypes'] = array();
$request['params']['paymentTypes'][0] = 'payment';

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
       
                