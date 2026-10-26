
                    <?php

$address = 'https://client47056.idobooking.com/api/reservations/get/34/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['result'] = array();
$request['result']['page'] = 1;
$request['result']['number'] = 2;
$request['result']['returnElements'] = array();
$request['result']['returnElements'][0] = "returnElements";
$request['paramsSearch'] = array();
$request['paramsSearch']['status'] = array();
$request['paramsSearch']['status'][0] = 'unconfirmed';
$request['paramsSearch']['modificationDateRange'] = array();
$request['paramsSearch']['modificationDateRange']['startDate'] = "startDate";
$request['paramsSearch']['modificationDateRange']['endDate'] = "endDate";
$request['paramsSearch']['addDateRange'] = array();
$request['paramsSearch']['addDateRange']['startDate'] = "startDate";
$request['paramsSearch']['addDateRange']['endDate'] = "endDate";
$request['paramsSearch']['fromDateRange'] = array();
$request['paramsSearch']['fromDateRange']['startDate'] = "startDate";
$request['paramsSearch']['fromDateRange']['endDate'] = "endDate";
$request['paramsSearch']['toDateRange'] = array();
$request['paramsSearch']['toDateRange']['startDate'] = "startDate";
$request['paramsSearch']['toDateRange']['endDate'] = "endDate";
$request['paramsSearch']['betweenDateRange'] = array();
$request['paramsSearch']['betweenDateRange']['startDate'] = "startDate";
$request['paramsSearch']['betweenDateRange']['endDate'] = "endDate";
$request['paramsSearch']['objectsIds'] = array();
$request['paramsSearch']['objectsIds'][0] = 3;
$request['paramsSearch']['locationsIds'] = array();
$request['paramsSearch']['locationsIds'][0] = 4;
$request['paramsSearch']['ids'] = array();
$request['paramsSearch']['ids'][0] = 5;
$request['paramsSearch']['clientsIds'] = array();
$request['paramsSearch']['clientsIds'][0] = 6;
$request['paramsSearch']['modificationStatus'] = 'new';

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
       
                