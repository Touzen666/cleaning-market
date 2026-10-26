
                    <?php

$address = 'https://client1679.idobooking.com/api/objects/editLengthSetup/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['objectsLengthSetups'] = array();
$request['objectsLengthSetups'][0] = array();
$request['objectsLengthSetups'][0]['objectId'] = 1;
$request['objectsLengthSetups'][0]['objectLengthSetupMode'] = 'inherited';
$request['objectsLengthSetups'][0]['ownLengthSetup'] = array();
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupMode'] = 'free';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupType'] = 'days';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupValue'] = 2;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupStartingMode'] = 'any';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupStartingWeekDays'] = array();
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupStartingWeekDays'][0] = 3;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupStartingMonthDay'] = 4;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupEndingMode'] = 'any';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupEndingWeekDays'] = array();
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupEndingWeekDays'][0] = 5;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupEndingMonthDay'] = 6;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupGapSaleMode'] = 'allowed';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupGapSaleDays'] = 7;

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
       
                