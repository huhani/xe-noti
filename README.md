# XE HTML5 Notificatioin 모듈

XE 환경에서 Facebook이나 YouTube와 같이 HTML5기반 알림을 표시합니다.
크롬에서만 작동합니다.

## Server Requirements
* PHP version 5.4.0 or greater
* cURL
* XE 1.8 latest version

## Installation
1. 모듈 파일은 모듈에 복사, manifest.json, service-worker.js파일은 무.조.건. 사이트 최상단에다 복사.
2. https://console.firebase.google.com 에서 서버 키(Server key)와, 발신자 키(Sender ID) 발급. 발급 방법은 https://developers.google.com/web/updates/2015/03/push-notifications-on-the-open-web 참조.
3. 발급받은 서버 키는 /index.php?module=admin&act=dispNotiAdminConfig 의  "Google FCM API Key"에 입력, 발신자 키는 아까 복사한 사이트 최상위 디렉터리에 있는 manifest.json의 "gcm_sender_id" 항목에다 적기. 그 외 name, short_name 등.. 항목들도 적당히 입력.
4. /index.php?act=dispNotiDeviceList 들어가서 알림 테스트. 새 단말기가 등록되었다는 메세지가 뜨지 않는다면 위 과정중 하나라도 잘못되었을 가능성이 큼.
