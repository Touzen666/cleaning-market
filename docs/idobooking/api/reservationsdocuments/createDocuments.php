
                    <?php

$address = 'https://client1679.idobooking.com/api/reservationsdocuments/createDocuments/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['createDocuments'] = array();
$request['params']['createDocuments'][0] = array();
$request['params']['createDocuments'][0]['ids'] = array();
$request['params']['createDocuments'][0]['ids'][0] = 1;
$request['params']['createDocuments'][0]['type'] = 'vat_invoice';
$request['params']['createDocuments'][0]['issueDate'] = "issueDate";
$request['params']['createDocuments'][0]['saleDate'] = "saleDate";
$request['params']['createDocuments'][0]['paymentDate'] = "paymentDate";

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
       
                