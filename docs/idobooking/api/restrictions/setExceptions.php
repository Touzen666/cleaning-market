
                    <?php

$address = 'https://client1679.idobooking.com/api/restrictions/setExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['setRestrictionExceptions'] = array();
$request['setRestrictionExceptions'][0] = array();
$request['setRestrictionExceptions'][0]['objectsIds'] = array();
$request['setRestrictionExceptions'][0]['objectsIds'][0] = 1;
$request['setRestrictionExceptions'][0]['offerType'] = "offerType";
$request['setRestrictionExceptions'][0]['restrictionExceptionDateFrom'] = "restrictionExceptionDateFrom";
$request['setRestrictionExceptions'][0]['restrictionExceptionDateTo'] = "restrictionExceptionDateTo";
$request['setRestrictionExceptions'][0]['closedToArrival'] = true;
$request['setRestrictionExceptions'][0]['closedToDeparture'] = true;
$request['setRestrictionExceptions'][0]['lengthSetting'] = array();
$request['setRestrictionExceptions'][0]['lengthSetting']['lengthMode'] = 'free';
$request['setRestrictionExceptions'][0]['lengthSetting']['lengthType'] = 'days';
$request['setRestrictionExceptions'][0]['lengthSetting']['lengthStay'] = 2;

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
       
                