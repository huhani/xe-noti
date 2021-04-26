<?php
/*! Copyright (C) 2021 BGM STORAGE. All rights reserved. */
/**
 * @class notiController
 * @author Huhani (mmia268@gmail.com)
 * @brief noti module controller class.
 */

require_once __DIR__ . '/lib/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class notiController extends noti
{
	function init(){
	}

	function createNotiMid() {
        $oModuleModel = getModel('module');
        $oModuleController = getController('module');
        $notiInfo = $oModuleModel->getModuleInfoByMid('noti');
        if(!$notiInfo->module_srl) {
            $args = new stdClass();
            $args->mid = 'noti';
            $args->module = 'noti';
            $args->browser_title = '푸시 알림';
            $args->site_srl = 0;
            $args->skin = '/USE_DEFAULT/';
            $args->mskin = '/USE_DEFAULT/';
            $args->layout_srl = -1;
            $args->mlayout_srl = -1;
            $args->use_mobile = "N";
            $oModuleController->insertModule($args);
        }
    }

	function triggerDeleteMember($obj) {
		$member_srl = $obj->member_srl;
		if($member_srl) {
			$this->deleteDeviceByMemberSrl($member_srl);
		}

		return new BaseObject();
	}

	function triggerAfterDoLogin($obj) {
	    $isHTTPS = false;
	    if(array_key_exists('HTTP_X_FORWARDED_PROTO', $_SERVER) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === "https") {
	        $isHTTPS = true;
        }
	    if(isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === "on") {
            $isHTTPS = true;
        }
	    if(!$isHTTPS) {
			return new BaseObject();
		}
		$oNotiModel = getModel('noti');
		$module_config = $oNotiModel->getConfig();
        $keep_signed = Context::get('keep_signed') === "Y";
        if(!$oNotiModel->isSupportedBrowser() || !$module_config['use'] || !$oNotiModel->isConfigFulfilled() ||!((!$keep_signed && $module_config['tryinsertIfLogin']) || ($keep_signed && $module_config['tryinsertIfAutologin'])) ) {
            return new BaseObject();
        }
		if(isset($obj->member_srl) && $obj->member_srl > 0) {
            $_SESSION['__noti__']['afterLogin'] = TRUE;
		}

		return new BaseObject();
	}

	function triggerAfterDoLogout(&$obj) {
        $isHTTPS = false;
        $oNotiModel = getModel('noti');
        if(array_key_exists('HTTP_X_FORWARDED_PROTO', $_SERVER) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === "https") {
            $isHTTPS = true;
        }
        if(isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === "on") {
            $isHTTPS = true;
        }
        if(!$oNotiModel->isSupportedBrowser() || !$isHTTPS) {
            return new BaseObject();
        }

        $oNotiModel = getModel('noti');
        $module_config = $oNotiModel->getConfig();
        if(!$module_config['use']) {
            return new BaseObject();
        }

        setcookie("__notiLogout__", "logout", time() + 60);
    }


	function triggerBeforeDisplay(&$output) {
		$oNotiModel = getModel('noti');
		$moduleConfig = $oNotiModel->getConfig();
		if(!$moduleConfig['use']) {
			return new BaseObject();
		}
		if (Context::getResponseMethod() == 'HTML') {
			Context::addHtmlHeader('<link rel="manifest" href="/manifest.json">');
            Context::loadFile($this->module_path . 'tpl/css/messenger/messenger.min.css');
            Context::loadFile($this->module_path . 'tpl/css/messenger/theme/air.min.css');
            Context::loadFile($this->module_path . 'tpl/js/NotiStore.js', 'body');
            Context::loadFile($this->module_path . 'tpl/js/messenger.min.js', 'body');
            Context::loadFile($this->module_path . 'tpl/js/base.js', 'body');

            if($oNotiModel->isSupportedBrowser()) {
                $logged_info = Context::get('logged_info');
                if($logged_info) {
                    if($_SESSION['__noti__']['afterLogin']) {
                        Context::loadFile($this->module_path . 'tpl/js/login.js', 'body');
                        unset($_SESSION['__noti__']['afterLogin']);
                    }
                }

                if(isset($_COOKIE['__notiLogout__'])) {
                    Context::loadFile($this->module_path . 'tpl/js/logout.js', 'body');
                    setcookie("__notiLogout__", null, -1);
                }
            }
		}

        Context::loadFile(array('./modules/noti/tpl/js/notiBackgroud.js', 'body', '', null), true);

		return new BaseObject();
	}

	function triggerBeforeModuleInit($obj) {
		$isLogged = Context::get('is_logged');
		$oNotiModel = getModel('noti');
		$moduleConfig = $oNotiModel->getConfig();
		if($oNotiModel->isSupportedBrowser() && $moduleConfig['addMemberMenu'] && ($isLogged || (!$isLogged && $moduleConfig['MemberPush']['allowInsert']))){
			Context::loadLang('./modules/noti/lang/lang.xml');

			$oMemberController = getController('member');
			$oMemberController->addMemberMenu('dispNotiEndpointSubscribe', 'cmd_noti_config');
		}

		return new BaseObject();
	}



	// !!!S

    function sendPrivateManualPush($member_srl, $obj) {
	    $oNotiModel = getModel('noti');

    }

    function triggerNcenterliteInsertNotify(&$obj)  {
        $oNotiModel = getModel('noti');
        if(!$oNotiModel->isConfigFulfilled()) {
            return new BaseObject();
        }

        $config = $oNotiModel->getConfig();
        $memberConfig = $config['MemberPush'];
	    $receive_member_srl = $obj->member_srl;
	    if(!$receive_member_srl || (!$memberConfig['sendDeniedMember'] && $oNotiModel->isDeniedMember($receive_member_srl))) {
	        return new BaseObject();
        }

	    if($obj->type === "D" && $obj->target_type === "C") {
	        $obj->config_type = "comment";
        } else if($obj->type === "C" && $obj->target_type === "C") {
            $obj->config_type = "comment_comment";
        } else if($obj->target_type === "M") {
            $obj->config_type = "mention";
        } else if($obj->target_type === "B" || $obj->target_type === "A") {
            $obj->config_type = "admin_content";
        } else if($obj->target_type === "T") {
            $obj->config_type = "custom";
        } else if($obj->target_type === "R") {
            $obj->config_type = "scrap";
        }


	    $endpointList = $oNotiModel->getEndpointByMemberSrl($receive_member_srl);
	    if(!$endpointList || !count($endpointList)) {
            return new BaseObject();
        }

        $sendDataList = array();
        $pushData = $oNotiModel->getNcenterlitePush($obj);
        if(!$pushData) {
            return new BaseObject();
        }

	    foreach ($endpointList as $each) {
	        $endpoint = new stdClass();
	        $endpoint->endpoint_srl = (int)$each->endpoint_srl;
	        $endpoint->endpoint = $each->endpoint;
	        $endpoint->key = $each->key;
	        $endpoint->auth = $each->auth;
	        $endpoint->supportedEncoding = explode(",", $each->supported_encoding);
            $sendDataList[] = $this->getPushDataFormat($pushData, $endpoint);
        }

	    $this->sendToMessageQueue($sendDataList);
    }

    function procNotiDeviceInsert() {
        $oNotiModel = getModel('noti');
        $module_config = $oNotiModel->getConfig();
        if(!$this->module_config) {
            $this->module_config = $module_config;
        }

        if(!$oNotiModel->isConfigFulfilled()) {
            return new BaseObject();
        }

        $logged_info = Context::get('logged_info');
        $endpoint = Context::get('endpoint');
        $supported_encoding = Context::get("contentEncoding");
        $client_details = Context::get("clientDetails");
        $ipaddress = $_SERVER['REMOTE_ADDR'];

        if(!$endpoint || !$oNotiModel->isVaildEndpoint($endpoint)) {
            return new BaseObject(-1, 'msg_invalid_request');
        }
        if(!$logged_info && !$module_config['GuestPush']['allowInsert']) {
            return new BaseObject(-1, '비회원은 푸시 알림을 등록할 수 없습니다.');
        }
        if(!$supported_encoding) {
            $supported_encoding = "";
        }
        $supported_encoding = explode(",", $supported_encoding);
        $supported_encoding_list = array();
        $allow_encoding = array("aesgcm", "aes128gcm");
        foreach($supported_encoding as $each) {
            if(in_array($each, $allow_encoding)) {
                $supported_encoding_list[] = $each;
            }
        }

        $member_srl = $logged_info ? $logged_info->member_srl : 0;
        $oEndpointInfo = $oNotiModel->getNotiEndpointByCRC32($endpoint);
        // 비회원 상태에서 등록한 알림이라면 자동로그인시 해당 계정 정보로 업데이트
        // 회원이라면 그냥 에러뿜꼬 끝내기.
        $client_details = @base64_decode($client_details);
        if(!$client_details || !@json_decode($client_details) || strlen($client_details > 65535)) {
            // 관리자 페이지에서 표시할때 필히 보안에 신경써야 함!
            $client_details = null;
        }

        $args = new stdClass();
        $args->member_srl = $member_srl;
        $args->endpoint = $endpoint;
        $args->nick_name = $member_srl ? $logged_info->nick_name : "Guest";
        $args->ipaddress = $ipaddress;
        $args->key = Context::get("key");
        $args->auth = Context::get("auth");
        $args->supported_encoding = $supported_encoding_list;
        $args->client_details = $client_details;
        $endpoint_srl = !$oEndpointInfo ? $this->insertDevice($args) : $this->updateDevice($oEndpointInfo->endpoint_srl, $args);
        if($endpoint_srl !== -1) {
            $endpointData = new stdClass();
            $endpointData->endpoint_srl = $endpoint_srl;
            $endpointData->endpoint = $endpoint;
            $endpointData->key = Context::get("key");
            $endpointData->auth = Context::get("auth");
            $endpointData->supportedEncoding = $supported_encoding_list;
            if($module_config[$member_srl ? 'MemberPush' : 'GuestPush']['sendInsertNotice']) {
                $this->sendNewDeviceNotice($logged_info, $endpointData);
            }
        }

        $this->add('endpoint_srl', $endpoint_srl);

        return true;
    }

    function procNotiDeviceDelete() {
	    $endpoint = Context::get('endpoint');
	    if(!$endpoint) {
            return new BaseObject(-1, 'msg_invalid_request');
        }

	    $output = $this->deleteDevice($endpoint);
	    if(!$output->toBool()) {
	        return $output;
        }
    }

    function procNotiServiceWorkerEvent() {
	    $oNotiModel  = getModel('noti');
	    $eventName = Context::get('eventName');
	    $endpoint = Context::get('endpoint');
        $endpoint_srl = Context::get('endpoint_srl');
        $push_srl = Context::get('push_srl');

        Context::setRequestMethod('JSON');
        Context::setResponseMethod('JSON');
        if($eventName) {
            switch($eventName) {
                case 'push':
                    $pushData = $push_srl ? $oNotiModel->getPushLog($push_srl) : null;
                    if($push_srl && $pushData && $pushData->endpoint_srl == $endpoint_srl && $pushData->endpoint && $pushData->endpoint === $endpoint) {
                        $this->setPushReaded($push_srl);
                        $this->updateEndpointLastRead($endpoint_srl);
                    }
                    break;

                case 'notificationclick':
                    $pushData = $push_srl ? $oNotiModel->getPushLog($push_srl) : null;
                    if($push_srl && $pushData && $pushData->endpoint_srl == $endpoint_srl && $pushData->endpoint && $pushData->endpoint === $endpoint) {
                        $this->setPushClicked($push_srl);
                        $this->updateEndpointLastClick($endpoint_srl);
                    }
                    break;
            }
        }

        $this->add('message', 'success');
        $this->add('error', 0);
    }

    function procNotiPushSubscriptionChange() {
	    $oldEndpoint = Context::get('oldEndpoint');
        $newEndpoint = Context::get('newEndpoint');
        $key = Context::get('key');
        $auth = Context::get('auth');
        $endpoint_srl = -1;

        $oNotiModel = getModel('noti');
        $endpointData = $oNotiModel->getNotiEndpointByCRC32($oldEndpoint);
        Context::setRequestMethod('JSON');
        Context::setResponseMethod('JSON');
        if($endpointData) {
            if(!$newEndpoint) {
                $output = $this->deleteDevice($oldEndpoint);
                if(!$output->toBool()){
                    return $output;
                }
            } else {
                $updateResult = $this->updateDeviceEndpoint($endpointData->endpoint_srl, $newEndpoint, $key, $auth);
                if($updateResult) {
                    $endpoint_srl = $endpointData->endpoint_srl;
                }
            }
        }

        $this->add('endpoint_srl', $endpoint_srl);
        $this->add('message', 'success');
        $this->add('error', 0);

        // endpoint_srl을 반환하면 업데이트, 0 이하의 값(-1)를 반환하면 삭제된거.

    }

    function procNotiPushTest() {
        $oNotiModel = getModel('noti');
	    $loggedInfo = Context::get('logged_info');
	    $endpoint = Context::get('endpoint');
	    $endpoint_srl = Context::get('endpoint_srl');
	    $endpointInfo = $oNotiModel->getEndpoint($endpoint_srl);
	    if($endpointInfo && $endpointInfo->endpoint === $endpoint) {
            $endpointArgs = new stdClass();
            $endpointArgs->endpoint_srl = (int)$endpointInfo->endpoint_srl;
            $endpointArgs->endpoint = $endpointInfo->endpoint;
            $endpointArgs->key = $endpointInfo->key;
            $endpointArgs->auth = $endpointInfo->auth;
            $endpointArgs->supportedEncoding = explode(",", $endpointInfo->supported_encoding);

	        $this->sendTestMessage($loggedInfo, $endpointArgs);
        } else if(!$endpointInfo) {
            $this->setError(-1, "단말기 정보를 가져올 수 없습니다.");
        } else {
            $this->setError(-1, "올바르지 않은 단말기 정보입니다.");
        }
    }

    function insertDevice($obj) {
	    $member_srl = (int)$this->getDefault($obj, "member_srl", 0);
	    $nick_name = $this->getDefault($obj, "nick_name", "unknown");
	    $ipaddress = $this->getDefault($obj, "ipaddress", $_SERVER["REMOTE_ADDR"]);
	    $user_agent = $this->getDefault($obj, "user_agent", $_SERVER["HTTP_USER_AGENT"]);
	    $client_details = $this->getDefault($obj, "client_details", null);
	    $key = $this->getDefault($obj, "key", null);
	    $auth = $this->getDefault($obj, "auth", null);
	    $supported_encoding = $this->getDefault($obj, "supported_encoding", []);
	    $endpoint = $obj->endpoint;
	    $browserInfo = $this->getUserAgentInfo($user_agent);
	    $browser = $browserInfo->browser;
	    $platform = $browserInfo->platform;
	    $endpoint_crc32 = $endpoint ? $this->getEndpointHash($endpoint) : 0;
        if(!$endpoint) {
            return -1;
        }

        $args = new stdClass();
        $args->endpoint_srl = getNextSequence();
        $args->member_srl = $member_srl;
        $args->nick_name = $nick_name;
        $args->ipaddress = $ipaddress;
        $args->user_agent = $user_agent;
        $args->browser = $browser;
        $args->platform = $platform;
        $args->client_details = $client_details;
        $args->endpoint_crc32 = $endpoint_crc32;
        $args->endpoint = $endpoint;
        $args->auth = $auth;
        $args->key = $key;
        $args->supported_encoding = implode(",", $supported_encoding);
        $args->last_update = date("YmdHis");
        $args->regdate = date("YmdHis");
        //debugPrint($args);
        $output = executeQuery('noti.insertNotiEndpoint', $args);

        return $output->toBool() ? $args->endpoint_srl : -1;
    }

    function insertManualPushLog($obj) {
	    $oNotiModel = getModel('noti');
	    $sequence = getNextSequence();
	    $pushGroup = $oNotiModel->getPushGroup($obj->push_group_srl);

	    $args = new stdClass;
	    $args->manual_push_srl = $sequence;
	    $args->member_srl = isset($obj->member_srl) ? $obj->member_srl : 0;
	    $args->nick_name = isset($obj->nick_name) ? $obj->nick_name : "unknown";
	    $args->ipaddress = isset($obj->ipaddress) ? $obj->ipaddress : $_SERVER['REMOTE_ADDR'];
        $args->target_device = $obj->target_device; // public or private
        $args->type = isset($obj->type) ? $obj->type : null;
	    $args->title = $obj->title;
	    $args->content = $obj->content;
	    $args->action = null;
	    $args->image = $obj->image;
	    $args->icon = $obj->icon;
	    $args->badge = $obj->badge;
        $args->target_url = $obj->target_url;
	    $args->require_interaction = $obj->require_interaction ? "Y" : "N";
        $args->renotify = $obj->renotify ? "Y" : "N";
	    $args->silent = $obj->silent ? "Y" : "N";
	    $args->ttl = (int)$obj->ttl;
	    $args->urgency = in_array($obj->urgency, $oNotiModel->getPushUrgencyTypeList()) ? $obj->urgency : 'normal';
	    $args->send_count = (int)$obj->send_count;
	    $args->push_group_srl = $pushGroup['push_group_srl'];
	    $args->regdate = date("YmdHis");
	    $output = executeQuery('noti.insertNotiManualPushLog', $args);

	    return $output->toBool() ? $sequence : -1;
    }

    function deleteDevice($endpoint) {
	    if(!$endpoint) {
	        return false;
        }

	    $args = new stdClass();
	    $args->endpoint_crc32 = $this->getEndpointHash($endpoint);
	    $args->endpoint = $endpoint;
	    $output = executeQuery('noti.deleteNotiEndpoint', $args);

	    return $output;
    }

    function deleteDeviceByOptions($type, $value) {
        $oMemberModel = getModel("member");
        if($type === "nick_name_now") {
            $oMemberInfo = $oMemberModel->getMemberInfoByMemberSrl($value);
            $type = "member_srl";
            $value = $oMemberInfo->member_srl;
        }

        $columnList = array('endpoint_srl', 'mebmer_srl', 'nick_name', 'ipaddress', 'regdate');
        $args = new stdClass();
        if($type && in_array($type, $columnList)) {
            $args->{"s_".$type} = $value ? $value : null;
        }
        $output = executeQuery('noti.deleteNotiPushLogByOptions', $args);

        return $output;
    }

    function deleteDormantDevice($type, $date) {
        $columnList = array('last_send', 'last_read', 'last_click', 'regdate');
        $args = new stdClass();
        if($type && in_array($type, $columnList)) {
            $args->{"s_".$type} = $date;
        }
        $output = executeQuery('noti.deleteNotiDormantEndpoint', $args);

        return $output;
    }

    function deleteDeviceByEndpointSrl($endpoint_srl = null) {
        $args = new stdClass();
        $args->endpoint_srl = $endpoint_srl;
        $output = executeQuery('noti.deleteNotiEndpointByEndpointSrl', $args);

        return $output;
    }

    function deleteDeviceByMemberSrl($member_srl = 0) {
	    if(!$member_srl) {
	        return false;
        }

	    $args = new stdClass();
	    $args->member_srl = $member_srl;
	    $output = executeQuery('noti.deleteNotiEndpointByMemberSrl', $args);

	    return $output->toBool();
    }

    function updateDevice($endpoint_srl = null, $obj = null) {
	    $args = new stdClass();
        $args->endpoint_srl = $endpoint_srl;
        $args->endpoint = $obj && isset($obj->endpoint) ? $obj->endpoint : null;
        $args->endpoint_crc32 = $obj && isset($obj->endpoint) ? $this->getEndpointHash($obj->endpoint) : null;
        $args->key = $obj && isset($obj->key) ? $obj->key : null;
        $args->auth = $obj && isset($obj->auth) ? $obj->auth : null;
	    $args->member_srl = $obj && isset($obj->member_srl) ? $obj->member_srl : 0;
        $args->nick_name = $obj && isset($obj->nick_name) ? $obj->nick_name : 0;
	    $args->ipaddress = $obj && isset($obj->ipaddress) ? $obj->ipaddress : 0;
        $args->user_agent = $obj && isset($obj->user_agent) ? $obj->user_agent : null;
        $args->browser = $obj && isset($obj->browser) ? $obj->browser : null;
        $args->platform = $obj && isset($obj->platform) ? $obj->platform : null;
        $args->client_details = $obj && isset($obj->client_details) ? $obj->client_details : null;
        $args->last_update = date("YmdHis");
        $output = executeQuery('noti.updateEndpointMemberByEndpointSrl', $args);

        return $output->toBool() ? $endpoint_srl : -1;
    }

    function updateDeviceEndpoint($endpoint_srl, $newEndpoint, $newKey, $newAuth) {
	    $args = new stdClass();
	    $args->endpoint_srl = $endpoint_srl;
	    $args->endpoint = $newEndpoint;
	    $args->endpoint_crc32 = $this->getEndpointHash($newEndpoint);
	    $args->key = $newKey;
	    $args->auth = $newAuth;
        $args->last_update = date("YmdHis");
	    $output = executeQuery('noti.updateNotiEndpointDevice', $args);

	    return $output->toBool();
    }

    function sendNewDeviceNotice($logged_info, $endpoint) {
        $oNotiModel = getModel('noti');
        $data = $oNotiModel->getSubscribeNotificationPush($logged_info);
        $pushData = $this->getPushDataFormat($data, $endpoint);

        return $this->sendToMessageQueue(array($pushData));
    }

    function sendTestMessage($memberInfo, $endpointInfo) {
        $oNotiModel = getModel('noti');
        $data = $oNotiModel->getTestPush($memberInfo);
        $pushData = $this->getPushDataFormat($data, $endpointInfo);

        return $this->sendToMessageQueue(array($pushData));
    }

    function sendManualPush($obj, $targetMemberSrls = [], $targetEndpointSrls = null) {
	    if($obj->type === "private" && (!$targetMemberSrls || !is_array($targetMemberSrls)) && (!$targetEndpointSrls || !is_array($targetEndpointSrls))) {
	        return new BaseObject(-1, '푸시를 전송 할 대상이 지정되지 않았습니다.');
        }

        $manualPushSrl = $this->insertManualPushLog($obj);
	    if($manualPushSrl === -1) {
	        return new BaseObject(-1, 'manual_push_srl 값을 가져오는데 실패하였습니다.');
        }
	    if(!isset($obj->title) || !$obj->title) {
            $obj->title = "알림이 발송되었습니다.";
        }

	    $oNotiModel = getModel('noti');
	    $defaultWebPushConfig = $oNotiModel->getWebPushDefaultOption();
	    $pushGroup = $oNotiModel->getPushGroup($obj->push_group_srl);

	    $payloadType = new stdClass();
	    $payloadType->name = "manual";
	    $payloadType->text = isset($obj->type) ? $obj->type : null;

	    $payload = new stdClass();
	    $payload->type = $payloadType;
	    $payload->title = $obj->title;
	    $payload->body = isset($obj->content) && $obj->content ? $obj->content : null;
	    $payload->launchUrl = isset($obj->target_url) && $obj->target_url ? $obj->target_url : null;
        $payload->icon = isset($obj->icon) && $obj->icon ? $obj->icon : null;
        $payload->image = isset($obj->image) && $obj->image ? $obj->image : null;
        $payload->badge = isset($obj->badge) && $obj->badge ? $obj->badge : null;
        $payload->silent = isset($obj->silent) ? $obj->silent : false;
        $payload->requireInteraction = isset($obj->require_interaction) ? $obj->require_interaction : true;
        $payload->renotify = isset($obj->renotify) ? $obj->renotify : true;
        $payload->vibrate = null;
        $payload->urgency = isset($obj->urgency) ? $obj->urgency : 'normal';
        $payload->ttl = isset($obj->ttl) && is_numeric($obj->ttl) ? $obj->ttl : $defaultWebPushConfig['ttl'];
        $payload->topic = $defaultWebPushConfig['topic'];
        $payload->pushGroupSrl = $pushGroup['push_group_srl'];
        $payload->pushGroup = $pushGroup;
        $payload->tag = $pushGroup['push_group_srl'];

	    $data = new stdClass();
	    $data->targetMemberSrls = $targetMemberSrls;
	    $data->targetEndpointSrls = $targetEndpointSrls;
	    $data->manualPushSrl = $manualPushSrl;
	    $data->targetDevice = $obj->target_device;
	    $data->payload = $payload;
	    $data->sendCount = isset($obj->send_count) && is_numeric($obj->send_count) ? $obj->send_count : 1;

	    $triggerData = $this->getTriggerDataFormat('manualPush', $data);
	    $output = $this->sendToMessageQueue(array($triggerData));
	    if($output->toBool()) {
            $output->add('manual_push_srl', $manualPushSrl);
        }

	    return $output;
    }


    function requestNodeServerExit() {
	    $triggerData = $this->getTriggerDataFormat('exitNodeServer', null, 5);
	    $output = $this->sendToMessageQueue(array($triggerData));

	    return $output;
    }

    function setPushReaded($push_srl) {
        $args = new stdClass();
        $args->push_srl = $push_srl;
        $args->is_readed = "Y";
        $args->target_read_state = "N";
        $args->read_date = date("YmdHis");
        $args->read_ipaddress = $_SERVER['REMOTE_ADDR'];
        $output = executeQuery('noti.updateNotiPushRead', $args);

        return $output->toBool();
    }

    function setPushClicked($push_srl) {
	    $args = new stdClass();
	    $args->push_srl = $push_srl;
	    $args->is_clicked = "Y";
	    $args->target_click_state = "N";
	    $args->click_date = date("YmdHis");
        $args->click_ipaddress = $_SERVER['REMOTE_ADDR'];
        $output = executeQuery('noti.updateNotiPushClick', $args);

        return $output->toBool();
    }

    function resendPush($push_srl, $count = 1) {
	    $oNotiModel = getModel('noti');
	    $config = $oNotiModel->getConfig();
	    if(!$oNotiModel->isConfigFulfilled()) {
	        return new BaseObject(-1, "noti 모듈설정이 올바르지 않습니다.");
        }

	    if($count <= 0 || $count > 3000) {
            return new BaseObject(-1, "재전송 횟수값이 너무 크거나 작습니다.");
        }

	    $pushData = $oNotiModel->getPushLog($push_srl);
	    if(!$pushData) {
            return new BaseObject(-1, "올바르지 않거나 존재하지 않는 푸시 데이터입니다.");
        }

	    $endpointData = $oNotiModel->getEndpoint($pushData->endpoint_srl);
	    if(!$endpointData) {
            return new BaseObject(-1, "알림이 발송될 단말기가 삭제되었거나 존재하지 않습니다.");
        }

	    $payload = @json_decode($pushData->push_payload);
	    if(!$payload) {
            return new BaseObject(-1, "페이로드 데이터가 올바르지 않습니다.");
        }

	    $endpoint = new stdClass();
        $endpoint->endpoint_srl = $endpointData->endpoint_srl;
	    $endpoint->endpoint = $endpointData->endpoint;
        $endpoint->key = $endpointData->key;
        $endpoint->auth = $endpointData->auth;
        $endpoint->supportedEncoding = explode(",", $endpointData->supported_encoding);

	    $obj = new stdClass();
        $obj->module_srl = -1;
        $obj->type = $pushData->type;
        $obj->notify = $pushData->notify;
        $obj->receiver_member_srl = $pushData->member_srl;
        $obj->receiver_nick_name = $pushData->nick_name;
        $obj->sender_member_srl = $pushData->sender_member_srl;
        $obj->sender_nick_name = $pushData->sender_nick_name;
        $obj->sender_profile_image = $pushData->sender_profile_image;
        $obj->target_url = $pushData->target_url;
        $obj->content_summary = $pushData->content_summary;
        $obj->document_srl = $pushData->document_srl;
        $obj->target_srl = $pushData->target_srl;
        $obj->payload = $payload;
        $sendObj = $this->getPushDataFormat($obj, $endpoint);
        $sendObjArr = array_fill(0, $count, $sendObj);

        $this->sendToMessageQueue($sendObjArr);

        return new BaseObject();
    }

    function updateEndpointLastRead($endpoint_srl = 0) {
	    if($endpoint_srl) {
	        $args = new stdClass();
	        $args->endpoint_srl = $endpoint_srl;
	        $args->last_read = date("YmdHis");
	        $output = executeQuery('noti.updateNotiEndpointLastRead', $args);

	        return $output->toBool();
        }

	    return false;
    }

    function updateEndpointLastClick($endpoint_srl = 0) {
        if($endpoint_srl) {
            $args = new stdClass();
            $args->endpoint_srl = $endpoint_srl;
            $args->last_click = date("YmdHis");
            $output = executeQuery('noti.updateNotiEndpointLastClick', $args);

            return $output->toBool();
        }

        return false;
    }

    function deletePushLog($push_srl = null) {
	    $args = new stdClass();
	    $args->push_srl = $push_srl;
	    $output = executeQuery('noti.deleteNotiPushLog', $args);

	    return $output;
    }

    function deletePushLogByOptions($type = null, $value = null, $dateRange = null) {
	    $oMemberModel = getModel("member");
        if($dateRange) {
            $dateRange = intval($dateRange);
        }
	    if($value !== null && $value !== "" && in_array($type, array("nick_name_now", "sender_nick_name_now"))) {
            $oMemberInfo = $oMemberModel->getMemberInfoByMemberSrl($value);
            $type = $type === "nick_name_now" ? "member_srl" : "sender_member_srl";
            $value = $oMemberInfo->member_srl;
        }

        $columnList = array('endpoint_srl', 'mebmer_srl', 'nick_name', 'sender_nick_name', 'sender_member_srl', 'content_summary',
            'ipaddress', 'type', 'push_payload', 'status_code', 'document_srl', 'target_srl', 'target_url', 'member_srl', 'regdate');
        $args = new stdClass();
        $args->date_range = $dateRange > 0 ?
            date("YmdHis", strtotime("-".$dateRange." day")) : null;
        if($type && in_array($type, $columnList)) {
            $args->{"s_".$type} = $value ? $value : null;
        }
        $output = executeQuery('noti.deleteNotiPushLogByOptions', $args);

        return $output;
    }

    function deleteManualPushLog(array $manual_push_srls = []) {
	    $args = new stdClass();
	    $args->manual_push_srls = implode(',', $manual_push_srls);
	    $output = executeQuery('noti.deleteNotiManualPushLog', $args);

	    return $output;
    }

    function getTriggerDataFormat($type, $data, $priority = 1) {
	    $obj = new stdClass();
	    $client = new stdClass();
	    $loggedInfo = null;
	    $logged_info = Context::get('logged_info');
        $client->server_name = $_SERVER['SERVER_NAME'];
        $client->server_port = $_SERVER['SERVER_PORT'];
        $client->server_addr = $_SERVER['SERVER_ADDR'];
        $client->user_agent = $_SERVER['HTTP_USER_AGENT'];
        $client->referer = $_SERVER['HTTP_REFERER'];
        $client->accept_encoding = $_SERVER['HTTP_ACCEPT_ENCODING'];
        $client->request_uri = $_SERVER["REQUEST_URI"];
        $client->request_method = $_SERVER["REQUEST_METHOD"];
        $client->remote_addr = $_SERVER['REMOTE_ADDR'];
        if($logged_info) {
            $loggedInfo = new stdClass();
            $targetProperties = array('member_srl', 'user_id', 'email_address', 'user_name', 'nick_name', 'denied', 'limit_date', 'regdate',
                'is_admin', 'last_login', 'description', 'profile_image', 'group_list'
                );
            foreach($targetProperties as $each) {
                $loggedInfo->{$each} = isset($logged_info->{$each}) && $logged_info->{$each} ? $logged_info->{$each} : null;
            }
        }
        $request = Context::getRequestVars();

        $obj->key = "noti-key-trigger";
        $obj->type = $type;
        $obj->client = $client;
        $obj->logged_info = $loggedInfo;
        $obj->request = $request;
        $obj->data = $data;
        $obj->priority = $priority;

	    return $obj;
    }

    function getPushDataFormat($data, $endpoint, $priority = 1) {
        $obj = new stdClass();
        $obj->data = $data;
        $obj->endpoint = $endpoint;
        $obj->key = "noti-key-push";
        $obj->priority = $priority;

        return $obj;
    }

    function sendToMessageQueue(array $sendDataList = []) {
        $oNotiModel = getModel('noti');
        $config = $oNotiModel->getConfig();
        $messageQueueConfig = $config['MessageQueue'];
        $mqHost = $messageQueueConfig['host'];
        $mqPort = $messageQueueConfig['port'];
        $mqVHost = $messageQueueConfig['vhost'];
        $mqAccountID = $messageQueueConfig['user'];
        $mqAccountPassword = $messageQueueConfig['pw'];
        $connection = null;
        $channel = null;
        $error = null;

        if(!$mqHost || !$mqPort || !$mqVHost || !$mqAccountID) {
            return new BaseObject(-1, "세지 큐 서버 설정값이 올바르지 않습니다.");
        }

        try {
            $connection = new AMQPStreamConnection($mqHost, $mqPort, $mqAccountID, $mqAccountPassword, $mqVHost);
            $channel = $connection->channel();
            if($sendDataList) {
                foreach($sendDataList as $each) {
                    $json = json_encode($each);
                    $amqpData = new AMQPMessage($json, array(
                        'content_type' => 'text/plain',
                        'type' => 'halftime.push.message',
                        'priority' => $each->priority
                    ));

                    $channel->basic_publish($amqpData, "noti-exchange", $each->key);
                }
            }

        } catch(Exception $e) {
            $error = $e;
        } finally {
            if($channel) {
                $channel->close();
                $channel = null;
            }
            if($connection) {
                $connection->close();
                $connection = null;
            }
        }

        $output = new BaseObject();
        if($error) {
            $output->setError(-1, $error->getMessage());
        }

        return $output;
    }

    function purgeQueue($queueName) {
	    $oNotiModel = getModel('noti');
	    if(!$oNotiModel->isConfigFulfilled()) {
	        return false;
        }

	    $error = null;
        $config = $oNotiModel->getConfig();
        $messageQueueConfig = $config['MessageQueue'];
        $mqHost = $messageQueueConfig['host'];
        $mqPort = $messageQueueConfig['port'];
        $mqVHost = $messageQueueConfig['vhost'];
        $mqAccountID = $messageQueueConfig['user'];
        $mqAccountPassword = $messageQueueConfig['pw'];
        $connection = null;
        $channel = null;
        $error = null;
        try {
            $connection = new AMQPStreamConnection($mqHost, $mqPort, $mqAccountID, $mqAccountPassword, $mqVHost);
            $channel = $connection->channel();
            $channel->queue_purge($queueName);
        } catch(Exception $e) {
            $error = $e;
        } finally {
            if($channel) {
                $channel->close();
                $channel = null;
            }
            if($connection) {
                $connection->close();
                $connection = null;
            }
        }

	    return !$error;
    }

    // !!!E
}

/* End of file noti.controller.php */
/* Location: ./modules/noti/noti.controller.php */
