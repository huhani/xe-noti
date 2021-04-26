<?php
/*! Copyright (C) 2021 BGM STORAGE. All rights reserved. */
/**
 * @class noti Model
 * @author Huhani (mmia268@gmail.com)
 * @brief noti module model class.
 */

class notiModel extends noti
{

    private static $config = null;

	function init(){
	}

	function getConfig(){
	    if(self::$config === null) {
            $oModuleModel = getModel('module');
            $moduleConfig = $oModuleModel->getModuleConfig('noti');
            $notiConfig = isset($moduleConfig->config) ? $moduleConfig->config : array();
            if(!is_array($notiConfig)) {
                $notiConfig = array();
            }
            $defaultConfig = $this->getDefaultConfig();
            $this->getDefaultObject($notiConfig,$defaultConfig);
            self::$config = $notiConfig;
        }

		return self::$config;
	}

	function isConfigFulfilled() {
	    $config = $this->getConfig();
        $messageQueueConfig = $config['MessageQueue'];
        if(!$messageQueueConfig['host'] || !$messageQueueConfig['port'] || !$messageQueueConfig['vhost'] || !$messageQueueConfig['user'] || !$messageQueueConfig['pw']) {
            return false;
        }

        $PushConfig = $config['Push'];
        if(!$PushConfig['vapidPublicKey'] || !$PushConfig['vapidPrivateKey']){
            return false;
        }

        return true;
    }

    function isVaildEndpoint($endpoint = '') {
	    if(!$endpoint) {
	        return false;
        }

	    $config = $this->getConfig();
	    $endpointFilter = $config['Push']['endpointFilter'];
	    $pattern = '/^https:\/\/((?:\.?(?:\w+|[*-]))+)/';
	    preg_match($pattern, $endpoint, $hostname);
	    if(!$hostname) {
	        return false;
        }
	    if($endpointFilter) {
	        foreach($endpointFilter as $rule) {
	            $isMatched = true;
                preg_match($pattern, $rule, $ruleHostname);
                $hostnameSplit = explode('.', $hostname[1]);
                $ruleHostnameSplit = explode('.', $ruleHostname[1]);
                if(count($hostnameSplit) !== count($ruleHostnameSplit)) {
                    continue;
                }
                for($i=0; $i<count($hostnameSplit); $i++) {
                    if($ruleHostnameSplit[$i] === "*") {
                        continue;
                    }
                    if($hostnameSplit[$i] !== $ruleHostnameSplit[$i]) {
                        $isMatched = false;
                        break;
                    }
                }
                if($isMatched) {
                    return true;
                }
            }
        }



	    return false;
    }

    function isDeniedMember($member_srl = 0) {
	    $oMemberModel = getModel('member');
	    $memberInfo = $oMemberModel->getMemberInfoByMemberSrl($member_srl);
	    if($memberInfo) {
	        return $memberInfo->denied === "Y" || ($memberInfo->limit_date && strtotime($memberInfo->limit_date) - time() > 0);
        }

	    return false;
    }

    function isSupportedBrowser($userAgent = '') {
	    $browserInfo = $this->getUserAgentInfo($userAgent);
	    return in_array($browserInfo->browser, array('Chrome', 'Firefox', 'Opera', 'Edge'));
    }

	// !!!S

    function getNotiServerKey() {
        $moduleConfig = $this->getConfig();
        $publicVAPIDKey = $moduleConfig && array_key_exists('Push', $moduleConfig) ? $moduleConfig['Push']['vapidPublicKey'] : null;

        $swModuleConfig = new stdClass();
        $swModuleConfig->pushMessageType = $moduleConfig['pushMessageType'];
        $swModuleConfig->memberToGuest = $moduleConfig['GuestPush']['memberToGuest'];

        $this->add('publicKey' , $publicVAPIDKey);
        $this->add('serverID', $this->getServerID());
        $this->add('swVersion' , "0.0.2");
        $this->add('timestamp', time());
        $this->add('config', $swModuleConfig);
    }

    function getServerID() {
        $moduleConfig = $this->getConfig();
        $publicVAPIDKey = $moduleConfig && array_key_exists('Push', $moduleConfig) ? $moduleConfig['Push']['vapidPublicKey'] : null;
        $privateVAPIDKey = $moduleConfig && array_key_exists('Push', $moduleConfig) ? $moduleConfig['Push']['vapidPrivateKey'] : null;
        if($publicVAPIDKey && $privateVAPIDKey) {
            return md5($publicVAPIDKey . $privateVAPIDKey);
        }

        return null;
    }

    function getNotiPushDefaultMessage() {
	    $config = $this->getConfig();
	    $UnknownPush = $config['UnknownPush'];
	    $UnknownPushConfig = $UnknownPush['PushConfig'];
	    $pushGroup = $this->getPushGroup($UnknownPushConfig['pushGroupSrl']);
	    unset($pushGroup['name']);


	    $date = date("Y-m-d H:i:s");
	    $ipaddress = $_SERVER['REMOTE_ADDR'];

        $payloadType = new stdClass();
        $payloadType->name = "unknown";
        $payloadType->text = "미등록";
        $payload = new stdClass();
        $search_keyword = array('[@site_name]', '[@date]', '[@ipaddress]');
        $search_replace = array( Context::getSiteTitle(), $date, $ipaddress);
        foreach($UnknownPushConfig as $key=>$value){
            $payload->{$key} = is_string($value) ? str_replace($search_keyword, $search_replace, $value) : $value;
        }

        unset($payload->name);
        unset($payload->topic);
        unset($payload->urgency);
        unset($payload->__arrType);
        $payload->push_srl = 0;
        $payload->tag = $UnknownPushConfig['pushGroupSrl'];
        $payload->type = $payloadType;
        $payload->pushGroup = $pushGroup;

        echo(json_encode($payload));

        exit();
    }

    function getNotiCheckValidEndpoint() {
	    $endpoint = Context::get("endpoint");
	    $endpoint_srl = intval(Context::get("endpoint_srl"));

	    $endpointInfo = $this->getNotiEndpointByCRC32($endpoint);
	    $this->add('isValid', $endpointInfo && $endpointInfo->endpoint_srl === $endpoint_srl);
    }

    function getEndpointLastSendDate($endpoint_srl) {
        $columnList = array('regdate');
        $args = new stdClass();
        $args->endpoint_srl = $endpoint_srl;
        $args->sort_type = "regdate";
        $args->order_type = "desc";
        $output = executeQuery('noti.getNotiPushLastSend', $args, $columnList);

        return $output->toBool() && $output->data ? $output->data->regdate : null;
    }

    function getEndpointLastClickDate($endpoint_srl) {
        $columnList = array('click_date');
        $args = new stdClass();
        $args->endpoint_srl = $endpoint_srl;
        $args->sort_type = "regdate";
        $args->order_type = "desc";
        $output = executeQuery('noti.getNotiPushLastClick', $args, $columnList);

        return $output->toBool() && $output->data ? $output->data->click_date : null;
    }

    function getEndpointLastReceivedDate($endpoint_srl) {
        $columnList = array('read_date');
        $args = new stdClass();
        $args->endpoint_srl = $endpoint_srl;
        $args->sort_type = "regdate";
        $args->order_type = "desc";
        $output = executeQuery('noti.getNotiPushLastRead', $args, $columnList);

        return $output->toBool() && $output->data ? $output->data->read_date : null;
    }

    function getEndpointSummary($endpoint_srl, $startDate = null, $endDate = null) {
        $pushLogList = $this->getPushLogByDateRange($endpoint_srl, $startDate, $endDate);
        $pushLogList->lastSendDate = $this->getEndpointLastSendDate($endpoint_srl);
        $pushLogList->lastClickDate = $this->getEndpointLastClickDate($endpoint_srl);
        $pushLogList->lastReceiveDate = $this->getEndpointLastReceivedDate($endpoint_srl);

        return $pushLogList;
    }

    function getPushLogByDateRange($endpoint_srl, $startDate = null, $endDate = null, $columnList = null) {
        if($columnList === null) {
            $columnList = array('type', 'is_readed', 'read_date', 'is_clicked', 'click_date', 'regdate');
        }

        $totalSendCount = 0;
        $totalClickCount = 0;
        $totalReadCount = 0;
        $totalClickCountSinceRead = 0;
        $totalReadTimeSinceSend = 0;
        $totalClickTimeSinceSend = 0;
        $totalClickTimeSinceRead = 0;
        $typeObj = new stdClass();
        foreach($this->getPushTypeList() as $each) {
            $eachObj = new stdClass();
            $eachObj->name = $each[0];
            $eachObj->clickCount = 0;
            $eachObj->readCount = 0;
            $eachObj->sendCount = 0;
            $typeObj->{$each[1]} = $eachObj;
        }

        $args = new stdClass();
        $args->endpoint_srl = $endpoint_srl;
        $args->startDate = $startDate;
        $args->endDate = $endDate;
        $args->orderType = "desc";
        $args->sortIndex ="regdate";
        $output = executeQueryArray('noti.getPushLogByDateRange', $args, $columnList);
        if($output->toBool() && $output->data) {
            $totalSendCount = count($output->data);
            foreach($output->data as $eachData) {
                $targetTypeObj = isset($typeObj->{$eachData->type}) ? $typeObj->{$eachData->type} : null;
                if($targetTypeObj) {
                    $targetTypeObj->sendCount++;
                }
                if($eachData->read_date) {
                    $totalReadCount++;
                    $totalReadTimeSinceSend += strtotime($eachData->read_date) - strtotime($eachData->regdate);
                    if($targetTypeObj) {
                        $targetTypeObj->readCount++;
                    }
                }
                if($eachData->click_date) {
                    $totalClickCount++;
                    $totalClickTimeSinceSend += strtotime($eachData->click_date) - strtotime($eachData->regdate);
                    if($targetTypeObj) {
                        $targetTypeObj->clickCount++;
                    }
                }
                if($eachData->read_date && $eachData->click_date) {
                    $totalClickCountSinceRead++;
                    $totalClickTimeSinceRead += strtotime($eachData->click_date) - strtotime($eachData->read_date) ;
                }
            }
        }

        $result = new stdClass();
        $result->totalSendCount = $totalSendCount;
        $result->totalClickCount = $totalClickCount;
        $result->totalReadCount = $totalReadCount;
        $result->avgReadTime = intval($totalReadTimeSinceSend / $totalReadCount);
        $result->avgClickTimeSinceRead = intval($totalClickTimeSinceRead / $totalClickCountSinceRead);
        $result->avgClickTime = intval($totalClickTimeSinceSend / $totalClickCount);

        return $result;
    }

    function getPushLog($push_srl) {
        $args = new stdClass();
        $args->push_srl = $push_srl;
        $output = executeQuery('noti.getPushLog', $args);

        return $output->toBool() ? $output->data : null;
    }

    function getPushLogCount($type = null, $value = null, $dateRange = null) {
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
        $output = executeQuery('noti.getNotiPushLogCount', $args);

        return $output->toBool() ? $output->data->count : 0;
    }

    function getManualPushLog($manual_push_srl = null) {
        if(!$manual_push_srl) {
            return null;
        }

        $args = new stdClass();
        $args->manual_push_srl = $manual_push_srl;
        $output = executeQuery('noti.getNotiManualPushLog', $args);

        return $output->toBool() && count($output) > 0 ? $output->data : null;
    }

    function getEndpoint($endpoint_srl) {
        $args = new stdClass();
        $args->endpoint_srl = $endpoint_srl;
        $output = executeQuery('noti.getNotiEndpoint', $args);

        return $output->toBool() ? $output->data : null;
    }

    function getEndpointByMemberSrl($member_srl) {
        $args = new stdClass();
        $args->member_srl = $member_srl;
        $output = executeQueryArray('noti.getEndpointByMemberSrl', $args);
        if(!$output->toBool()) {
            return array();
        }

        return $output->data;
    }

    function getEndpointCount($type = null, $value = null) {
        $oMemberModel = getModel("member");
        if($type === "nick_name_now") {
            $oMemberInfo = $oMemberModel->getMemberInfoByMemberSrl($value);
            $type = "member_srl";
            $value = $oMemberInfo->member_srl;
        }

        $columnList = array('endpoint_srl', 'mebmer_srl', 'nick_name', 'ipaddress', 'regdate');
        $args = new stdClass();
        if($type && $value && in_array($type, $columnList)) {
            $args->{"s_".$type} = $value ? $value : null;
        }
        $output = executeQuery('noti.getNotiEndpointCount', $args);

        return $output->toBool() ? $output->data->count : 0;
    }

    function getDormantEndpointCount($type, $date) {
        $columnList = array('last_send', 'last_read', 'last_click', 'regdate');
        $args = new stdClass();
        if($type && in_array($type, $columnList)) {
            $args->{"s_".$type} = $date;
        }
        $output = executeQuery('noti.getNotiDormantEndpointCount', $args);

        return $output->toBool() ? $output->data->count : 0;
    }

    function getDefaultPushGroup() {
        $obj = array();
        $obj['push_group_srl'] = -1;
        $obj['max_count'] = 1;
        $obj['use_count_summary'] = true;
        $obj['name'] = "모듈 기본 설정";
        $obj['count_summary_template'] = "[@content_summary]\n+[@count]개의 알림이 있습니다.";

        return $obj;
    }

    function getPushGroup($push_group_srl = -1) {
        $pushGroupList = $this->getPushGroupList();
        foreach($pushGroupList as $pushGroup) {
            if($pushGroup['push_group_srl'] == $push_group_srl) {
                return $pushGroup;
            }
        }

        return $this->getDefaultPushGroup();
    }

    function getPushGroupList($includeDefaultGroup = false) {
        $pushGroup = array();
        if($includeDefaultGroup) {
            $pushGroup[-1] = $this->getDefaultPushGroup();
        }

        return array_merge($pushGroup, $this->getConfig()['PushGroup']);
    }

    function getPushTypeList() {
        return array_merge($this->getNcenterliteTypeList(), array(
            'subscribe_notification'
        ));
    }

    function getPushUrgencyTypeList() {
	    return array('very-low', 'low', 'normal', 'high');
    }

    function getNcenterliteTypeList() {
        $ntenterliteTypeList = array(
            array('맨션', 'mention'),
            array('댓글', 'comment'),
            array('대댓글', 'comment_comment'),
            array('추천', 'vote'),
            array('쪽지', 'message'),
            array('스크랩', 'scrap'),
            array('관리자 알림', 'admin_content'),
            array('기타', 'custom'),
            array('테스트', 'test')
        );

        return $ntenterliteTypeList;
    }

    function getWebPushDefaultOption() {
        // actions : action, launchUrl, icon, title
	    return array(
	        'title' => '알림',
            'body' => '알림이 발송되었습니다.',
            'launchUrl' => null,
            'icon' => null,
            'image' => null,
            'actions' => array(),
            'badge' => '/modules/noti/tpl/img/badge.png',
            'silent' => false,
            'requireInteraction' => true,
            'renotify' => true,
            'vibrate' => null,
            'ttl' => 60 * 60 * 12,
            'topic' => 'push-default-topic',
            'urgency' => 'normal',
            'pushGroupSrl' => -1,
            '__arrType' => 'pushOptions'
        );
    }

    function getNcenterliteDefaultConfig() {
	    $ncenterliteConfig = array();
	    $ncenterliteTypeConfig = array();
	    $ncenterliteTypeList = $this->getNcenterliteTypeList();
        $ncenterliteConfig['use'] = true;
        $ncenterliteConfig['defaultProfileImage'] = null;
        $ncenterliteConfig['defaultImage'] = null;
        $ncenterliteConfig['defaultImageType'] = array('*.png', '*.jpg');
	    foreach($ncenterliteTypeList as $each) {
            $ncenterliteTypeConfig[$each[1]] = $this->getWebPushDefaultOption();
            $ncenterliteTypeConfig[$each[1]]['use'] = true;
            $ncenterliteTypeConfig[$each[1]]['title'] = $each[0] . " 알림 - [@site_name]";
            $ncenterliteTypeConfig[$each[1]]['body'] = '#[@nick_name] [@content_summary]';
            $ncenterliteTypeConfig[$each[1]]['launchUrl'] = '[@target_url]';
            $ncenterliteTypeConfig[$each[1]]['icon'] = '[@profile_image]';
        }
        $ncenterliteConfig['types'] = $ncenterliteTypeConfig;
        $ncenterliteTypeConfig['mention']['image'] = '[@image_without_default]';
        $ncenterliteTypeConfig['comment']['image'] = '[@image_without_default]';
        $ncenterliteTypeConfig['comment_comment']['image'] = '[@image_without_default]';
        $ncenterliteTypeConfig['mention']['body'] = "[@nick_name]님이 '[@content_summary]'[@type]에서 회원님을 호출하였습니다.";
        $ncenterliteTypeConfig['scrap']['body'] = "[@nick_name]님이 회원님의 '[@content_summary]'글을 스크랩하였습니다.";
        $ncenterliteTypeConfig['message']['body'] = "[@nick_name]님이 '[@content_summary]'라고 메세지를 보냈습니다.";
        $ncenterliteTypeConfig['vote']['body'] = "[@nick_name]님이 회원님의 '[@content_summary]' [@type]을 추천하였습니다.";

	    return $ncenterliteConfig;
    }

    function getPushDefaultConfig() {
        $pushConfig = array();
        $pushConfig['vapidPublicKey'] = null;
        $pushConfig['vapidPrivateKey'] = null;
        $pushConfig['vapidSubject'] = null;
        $pushConfig['endpointFilter'] = array(
            'https://fcm.googleapis.com/',
            'https://updates.push.services.mozilla.com/',
            'https://*.notify.windows.com/',
            'https://android.googleapis.com/'
            );

        return $pushConfig;
    }

    function getMessageQueueDefaultConfig() {
        $messageQueueConfig = array();
        $messageQueueConfig['host'] = '127.0.0.1';
        $messageQueueConfig['port'] = '5672';
        $messageQueueConfig['vhost'] = null;
        $messageQueueConfig['user'] = null;
        $messageQueueConfig['pw'] = null;

        return $messageQueueConfig;
    }

    function getMemberPushDefaultConfig() {
        $defaultWebPush = $this->getWebPushDefaultOption();
        $defaultWebPush['title'] = "알림이 등록되었습니다 - [@site_name]";
        $defaultWebPush['body'] = "푸시알림이 설정되었습니다.";
        $defaultWebPush['launchUrl'] = "[@noti_config_link]";
        $memberPushDefaultConfig = array();
        $memberPushDefaultConfig['allowInsert'] = true;
        $memberPushDefaultConfig['sendInsertNotice'] = false;
        $memberPushDefaultConfig['sendDeniedMember'] = true;
        $memberPushDefaultConfig['PushConfig'] = $defaultWebPush;

        return $memberPushDefaultConfig;
    }

    function getGuestPushDefaultConfig() {
        $defaultWebPush = $this->getWebPushDefaultOption();
        $defaultWebPush['title'] = "알림이 등록되었습니다 - [@site_name]";
        $defaultWebPush['body'] = "푸시알림이 설정되었습니다.";
        $defaultWebPush['launchUrl'] = "[@noti_config_link]";
        $guestPushDefaultConfig = array();
        $guestPushDefaultConfig['allowInsert'] = true;
        $guestPushDefaultConfig['memberToGuest'] = true;
        $guestPushDefaultConfig['sendInsertNotice'] = false;
        $guestPushDefaultConfig['PushConfig'] = $defaultWebPush;

        return $guestPushDefaultConfig;
    }

    function getUnknownPushDefaultConfig() {
        $defaultWebPush = $this->getWebPushDefaultOption();
        $defaultWebPush['title'] = "알림이 발송되었습니다 - [@site_name]";
        $defaultWebPush['body'] = "[@date]:\n[@ipaddress]";
        $unknownPushDefaultConfig = array();
        $unknownPushDefaultConfig['PushConfig'] = $defaultWebPush;

        return $unknownPushDefaultConfig;
    }

    function getTestPushDefaultConfig() {
        $defaultWebPush = $this->getWebPushDefaultOption();
        $defaultWebPush['title'] = "알림이 발송되었습니다 - [@site_name]";
        $defaultWebPush['body'] = "테스트용 푸시입니다.\n[@date]";
        $testPushDefaultConfig = array();
        $testPushDefaultConfig['PushConfig'] = $defaultWebPush;

        return $testPushDefaultConfig;
    }

    function getDefaultConfig() {
	    $config = array();
        $config['use'] = true;
        $config['simpleConfig'] = true;
        $config['tryinsertIfLogin'] = true;
        $config['tryinsertIfAutologin'] = true;
        $config['allowDebugPage'] = false;
        $config['thumbnailWidth'] = 512;
        $config['thumbnailHeight'] = 256;
        $config['pushMessageType'] = "push";
        $config['default_image'] = '';
        $config['default_badge'] = '';
        $config['browserPushLogMaxCount'] = 1000;
        $config['addMemberMenu'] = true;
        $config['Push'] = $this->getPushDefaultConfig();
        $config['PushGroup'] = array();
        $config['MessageQueue'] = $this->getMessageQueueDefaultConfig();
        $config['MemberPush'] = $this->getMemberPushDefaultConfig();
        $config['GuestPush'] = $this->getGuestPushDefaultConfig();
        $config['UnknownPush'] = $this->getUnknownPushDefaultConfig();
        $config['TestPush'] = $this->getTestPushDefaultConfig();
        $config['Ncenterlite'] = $this->getNcenterliteDefaultConfig();

	    return $config;
    }

    function getSubscribeNotificationPush($logged_member_info) {
        $config = $this->getConfig();
        $subscribeConfig = $logged_member_info ? $config['MemberPush'] : $config['GuestPush'];

        $payloadType = new stdClass();
        $payloadType->name = "subscribe_notification";
        $payloadType->text = "푸시설정";

        $obj = new stdClass();
        $payload = new stdClass();
        $receiver_member_srl = $logged_member_info->member_srl;
        $receiver_nick_name = $logged_member_info ? $logged_member_info->nick_name : "Guest";
        $unset_keys = array('use', '__arrType');
        $search_keyword = array('[@site_name]', '[@date]', '[@ipaddress]', '[@nick_name]', '[@noti_config_link]');
        $search_replace = array(Context::getSiteTitle(), date("Y-m-d H:i:s"), $_SERVER['REMOTE_ADDR'], $receiver_nick_name, getUrl('', 'mid', 'noti'));
        foreach($subscribeConfig['PushConfig'] as $key=>$value){
            $payload->{$key} = $value;
            if(is_string($value)) {
                $payload->{$key} = str_replace($search_keyword, $search_replace, $value);
            }
        }
        foreach($unset_keys as $each_keys) {
            if(isset($payload->{$each_keys})) {
                unset($payload->{$each_keys});
            }
        }
        $payload->type = $payloadType;

        $obj->type = "subscribe_notification";
        $obj->module_srl = -1;
        $obj->sender_member_srl = -1;
        $obj->sender_nick_name = "unknown";
        $obj->sender_profile_image = null;
        $obj->notify = null;
        $obj->receiver_member_srl = $receiver_member_srl;
        $obj->receiver_nick_name = $receiver_nick_name;
        $obj->target_url = $subscribeConfig['launchUrl'];
        $obj->content_summary = $subscribeConfig['body'];
        $obj->document_srl = -1;
        $obj->target_srl = -1;
        $obj->payload = $payload;

        $pushGroupConfig = $this->getPushGroup($subscribeConfig['pushGroupSrl']);
        $pushGroup = new stdClass();
        $payload->tag = $pushGroupConfig['push_group_srl'];
        $payload->pushGroup = $pushGroup;

        return $obj;
    }

    function getImageFileList($target_srl = 0) {
        $oFileModel = getModel('file');
        $fileList = $oFileModel->getFiles($target_srl);
        $config = $this->getConfig();
        $ncenterliteConfig = $config['Ncenterlite'];
        $defaultImageType = $ncenterliteConfig['defaultImageType'];

        $newArr = array();
        $filenameRules = array();
        $extensionRules = array();
        foreach($defaultImageType as $each) {
            $dotPos = strrpos($each, '.');
            $name = substr($each, 0, $dotPos);
            $extension = substr($each, $dotPos+1);
            $filenameRules[] = $name;
            $extensionRules[] = $extension;
        }

        foreach($fileList as $eachFile) {
            $filename = pathinfo($eachFile->source_filename, PATHINFO_FILENAME);
            $fileExtension = pathinfo($eachFile->source_filename, PATHINFO_EXTENSION);
            $extensionMatched = false;
            $filenameMatched = true;
            foreach ($extensionRules as $eachExtensionRule) {
                if($eachExtensionRule === "*" || $eachExtensionRule === $fileExtension) {
                    $extensionMatched = true;
                    break;
                }
            }
            foreach($filenameRules as $eachFilenameRule) {
                if($eachFilenameRule === "*" || $eachFilenameRule === $filename) {
                    $filenameMatched = true;
                    break;
                }
            }
            if($extensionMatched && $filenameMatched) {
                $newArr[] = $eachFile;
            }
        }

        return $newArr;
    }

    function getNcenterlitePush($ncenterliteNotification) {

        $config = $this->getConfig();
        $ncenterliteConfig = $config['Ncenterlite'];
        $ncenterliteTypesConfig = $ncenterliteConfig['types'];

        $oMemberModel = getModel('member');
        $receiver_member_info = isset($ncenterliteNotification->member_srl) ? $oMemberModel->getMemberInfoByMemberSrl($ncenterliteNotification->member_srl) : null;
        $receiver_member_srl = $ncenterliteNotification->member_srl;
        $receiver_nick_name = $receiver_member_info ? $receiver_member_info->nick_name : "Guest";

        $sender_member_srl = $ncenterliteNotification->target_member_srl;
        $sender_nick_name = $ncenterliteNotification->target_nick_name;
        $sender_profile_Image = $oMemberModel->getProfileImage($sender_member_srl);
        $sender_profile_Image_src = $sender_profile_Image ? $sender_profile_Image->src : $ncenterliteConfig['defaultProfileImage'];
        $image = $ncenterliteConfig['defaultImage'];
        $image_without_default = null;
        $documentImage = null;
        if( $ncenterliteNotification->type === "D" && in_array($ncenterliteNotification->target_type, array('B', 'A', 'M')) ) {
            $documentImage = $this->getImageFileList($ncenterliteNotification->srl);
        } else if($ncenterliteNotification->target_type === "C") {
            $documentImage = $this->getImageFileList($ncenterliteNotification->target_srl);
        }
        if($documentImage && count($documentImage) > 0) {
            $image = $documentImage[0]->uploaded_filename;
            $image_without_default = $image;
        }

        $module_srl = $ncenterliteNotification->module_srl;
        $notify = $ncenterliteNotification->notify;
        $target_summary = $ncenterliteNotification->target_summary;
        $config_type = $ncenterliteNotification->config_type;
        $target_url = $ncenterliteNotification->target_url;
        $date = date("Y-m-d H:i:s");
        $ipaddress = $_SERVER['REMOTE_ADDR'];
        $isStickerContent = preg_match('/{@sticker:\d+\|\d+}/', $target_summary, $stickerMatches);
        if($isStickerContent) {
            $target_summary = "[스티커 댓글]";
        }

        $targetConfigType = array_key_exists($config_type, $ncenterliteTypesConfig) ? $ncenterliteTypesConfig[$config_type] : null;
        if(!$targetConfigType || !$targetConfigType['use']) {
            return null;
        }

        $pushGroupConfig = $this->getPushGroup($targetConfigType['pushGroupSrl']);
        $pushGroup = new stdClass();
        $pushGroup->push_group_srl = $pushGroupConfig['push_group_srl'];
        $pushGroup->max_count = $pushGroupConfig['max_count'];
        $pushGroup->use_count_summary = $pushGroupConfig['use_count_summary'];
        $pushGroup->count_summary_template = $pushGroupConfig['count_summary_template'];
        $type = "";
        if(in_array($ncenterliteNotification->type, array('D', 'E', 'R'))) {
            $type = "게시글";
        } else if($ncenterliteNotification->type === "C") {
            $type = "댓글";
        }

        $obj = new stdClass();
        $payload = new stdClass();
        $search_keyword = array('[@nick_name]', '[@content_summary]', '[@target_url]', '[@profile_image]', '[@site_name]', '[@image]', '[@image_without_default]',
            '[@date]', '[@ipaddress]', '[@type]', '[@target_type]'
        );
        $search_replace = array($sender_nick_name, $target_summary, $target_url, $sender_profile_Image_src, Context::getSiteTitle(), $image, $image_without_default,
            $date, $ipaddress, $type, $targetConfigType['name']);
        $unset_keys = array('use', '__arrType');
        $inDocumentTypes = array('mention', 'comment', 'comment_comment', 'vote', 'scrap', 'admin_content');
        $document_srl = 0;
        $target_srl = 0;
        foreach($targetConfigType as $key=>$value){
            $payload->{$key} = $value;
            if(is_string($value)) {
                $payload->{$key} = str_replace($search_keyword, $search_replace, $value);
            }
        }
        foreach($unset_keys as $each_keys) {
            if(isset($payload->{$each_keys})) {
                unset($payload->{$each_keys});
            }
        }
        if(in_array($config_type, $inDocumentTypes)) {
            $document_srl = $ncenterliteNotification->srl;
        }
        if($ncenterliteNotification->target_type === "C") {
            $target_srl = $ncenterliteNotification->target_srl;
        }

        $payloadType = new stdClass();
        $payloadType->name = $config_type;
        $payloadType->text = "알림센터 알림";
        foreach($this->getNcenterliteTypeList() as $eachType) {
            if($eachType[1] === $config_type) {
                $payloadType->text = $eachType[0];
                break;
            }
        }


        $payload->tag = $pushGroupConfig['push_group_srl'];
        $payload->pushGroup = $pushGroup;
        $payload->type = $payloadType;

        $obj->type = $config_type;
        $obj->module_srl = $module_srl;
        $obj->notify = $notify;
        $obj->sender_member_srl = $sender_member_srl;
        $obj->sender_nick_name = $sender_nick_name;
        $obj->sender_profile_image = $sender_profile_Image_src;
        $obj->receiver_member_srl = $receiver_member_srl;
        $obj->receiver_nick_name = $receiver_nick_name;
        $obj->target_url = $target_url;
        $obj->content_summary = $target_summary;
        $obj->document_srl = $document_srl;
        $obj->target_srl = $target_srl;
        $obj->payload = $payload;

        return $obj;
    }

    function getTestPush($memberInfo = null) {
        $config = $this->getConfig();
        $TestPush = $config['TestPush'];
        $TestPushConfig = $TestPush['PushConfig'];
        $pushGroup = $this->getPushGroup($TestPushConfig['pushGroupSrl']);
        unset($pushGroup['name']);


        $obj = new stdClass();
        $payload = new stdClass();

        $date = date("Y-m-d H:i:s");
        $ipaddress = $_SERVER['REMOTE_ADDR'];

        $search_keyword = array('[@site_name]', '[@date]', '[@ipaddress]');
        $search_replace = array( Context::getSiteTitle(), $date, $ipaddress);
        foreach($TestPushConfig as $key=>$value){
            if(is_string($value)) {
                $UnknownPushConfig[$key] = str_replace($search_keyword, $search_replace, $value);
            }
        }

        foreach($TestPushConfig as $key=>$value){
            $payload->{$key} = is_string($value) ? str_replace($search_keyword, $search_replace, $value) : $value;
        }
        $payloadType = new stdClass();
        $payloadType->name = "test";
        $payloadType->text = "테스트";
        $payload->tag = $pushGroup['push_group_srl'];
        $payload->pushGroup = $pushGroup;
        $payload->type = $payloadType;
        unset($payload->__arrType);

        $obj->type = "test";
        $obj->module_srl = -1;
        $obj->notify = null;
        $obj->sender_member_srl = -1;
        $obj->sender_nick_name = "unknown";
        $obj->sender_profile_image = null;
        $obj->receiver_member_srl = $memberInfo ? $memberInfo->member_srl : 0;
        $obj->receiver_nick_name = $memberInfo ? $memberInfo->nick_name : "Guest";
        $obj->target_url = $payload->launchUrl;
        $obj->content_summary = $payload->body;
        $obj->document_srl = -1;
        $obj->target_srl = -1;
        $obj->payload = $payload;

        return $obj;
    }

    function getNotiEndpointByCRC32($endpoint) {
        if(!$endpoint) {
            return null;
        }

        $endpointCRC32 = $this->getEndpointHash($endpoint);
        $args = new stdClass();
        $args->endpoint_crc32 = $endpointCRC32;
        $args->endpoint = $endpoint;
        $output = executeQueryArray("noti.getNotiEndpointByCRC32", $args);
        if($output->message !== "success" || !count($output->data)) {
            return null;
        }

        return $output->data[0];
    }

    private function getDefaultObject(&$target, &$origin) {
        foreach($origin as $key=>$value) {
            if(!array_key_exists($key, $target) || (is_array($value) && !is_array($target[$key]))) {
                $target[$key] = $origin[$key];
            } else if(is_array($target[$key]) && is_array($origin)) {
                $this->getDefaultObject($target[$key], $value);
            }
        }
    }

    // !!!E
}

/* End of file noti.model.php */
/* Location: ./modules/noti/noti.model.php */
