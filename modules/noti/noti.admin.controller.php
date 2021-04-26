<?php
/*! Copyright (C) 2021 BGM STORAGE. All rights reserved. */
/**
 * @class  notiAdminController
 * @author Huhani (mmia268@gmail.com)
 * @brief  Noti module admin controller class.
 */

require_once __DIR__ . '/lib/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class notiAdminController extends noti
{
	function init()
	{
	}

	// !!!S

    function procNotiAdminMessageQueueServerTest() {
        $oNotiModel = getModel('noti');
        $config = $oNotiModel->getConfig();
        $messageQueueConfig = $config['MessageQueue'];
        $mqHost = $messageQueueConfig['host'];
        $mqPort = $messageQueueConfig['port'];
        $mqVHost = $messageQueueConfig['vhost'];
        $mqAccountID = $messageQueueConfig['user'];
        $mqAccountPassword = $messageQueueConfig['pw'];

        $diagnosisMessage = null;
        $executeTime = 0;
        $startTime = 0;
        $completeTime = 0;
        if(!$mqHost) {
            $diagnosisMessage = "host정보가 입력되지 않았습니다.";
        } else if(!$mqPort) {
            $diagnosisMessage = "port정보가 입력되지 않았습니다.";
        } else if(!$mqVHost) {
            $diagnosisMessage = "vhost정보가 입력되지 않았습니다.";
        } else if(!$mqAccountID || !$mqAccountPassword) {
            $diagnosisMessage = "메세지 큐 접속 아이디 혹은 패스워드가 입력되지 않았습니다.";
        }
        $connection = null;
        $channel = null;
        if($diagnosisMessage === null) {
            try {
                $startTime = $this->microtimeFloat();
                $connection = new AMQPStreamConnection($mqHost, $mqPort, $mqAccountID, $mqAccountPassword, $mqVHost);
                $channel = $connection->channel();
            } catch(Exception $e) {
                debugPrint($e);
                $diagnosisMessage = $e->getMessage();
            } finally {
                if($channel) {
                    $channel->close();
                    $channel = null;
                }
                if($connection) {
                    $connection->close();
                    $connection = null;
                }
                $completeTime = $this->microtimeFloat();
            }
        }
        if($startTime) {
            $executeTime = round($completeTime - $startTime, 7);
        }

        $this->add('diagnosisMessage', $diagnosisMessage);
        $this->add('executeTime', $executeTime);
    }

    function procNotiAdminMessageQueuePurge() {
	    $oNotiController = getController('noti');
	    $oNotiModel = getModel('noti');
	    if(!$oNotiModel->isConfigFulfilled()) {
	        return new BaseObject(-1, '모듈의 메세지 큐 혹은 푸시 서버 정보가 제대로 설정되지 않았습니다.');
        }

	    $queueList = array('noti-queue-push', 'noti-queue-trigger');
	    foreach($queueList as $queue) {
	        $output = $oNotiController->purgeQueue($queue);
	        if(!$output) {
                return new BaseObject(-1, '퍼지 작업중 오류가 발생했습니다.');
            }
        }

    }

    function procNotiAdminNodeExitRequest() {
	    $oNotiController = getController('noti');
	    
	    return $oNotiController->requestNodeServerExit();
    }

    function procNotiAdminModuleConfig() {
	    $oNotiModel = getModel('noti');
        $config = $oNotiModel->getConfig();
        $vars = Context::getRequestVars();
        $notiConfig = isset($vars->notiConfig) ? $vars->notiConfig : array();
        if(!is_array($notiConfig)) {
            $notiConfig = array();
        }
        //debugPrint($config);
        $this->configObjectRecursion($notiConfig, $config);
        if(isset($vars->notiConfig) && array_key_exists('Push', $vars->notiConfig) && array_key_exists('endpointFilter', $vars->notiConfig['Push'])) {
            $notiConfig['Push']['endpointFilter'] = $this->getCurrectEndpointFilter($vars->notiConfig['Push']['endpointFilter']);
        }

        //debugPrint($notiConfig);

        $args = new stdClass();
        $args->config = $notiConfig;

        $oModuleController = getController('module');
        $output = $oModuleController->updateModuleConfig('noti', $args);
        if (!$output->toBool())
        {
            return $output;
        }


        $this->setMessage('success_saved');

        $returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminModuleConfig');
        $this->setRedirectUrl($returnUrl);

    }

    function procNotiAdminNcenterliteConfig() {
        $oNotiModel = getModel('noti');
        $config = $oNotiModel->getConfig();
        $ncenterliteConfig = Context::get('ncenterlite');
        if(!is_array($ncenterliteConfig)) {
            $ncenterliteConfig = array();
        }
        $notiConfig = array();
        $notiConfig['Ncenterlite'] = $ncenterliteConfig;
        $this->configObjectRecursion($notiConfig, $config);
        if(array_key_exists('defaultImageType', $ncenterliteConfig)){
            $notiConfig['Ncenterlite']['defaultImageType'] = $this->getValidImageRules($ncenterliteConfig['defaultImageType']);
        }

        $args = new stdClass();
        $args->config = $notiConfig;
        $oModuleController = getController('module');
        $output = $oModuleController->updateModuleConfig('noti', $args);
        if (!$output->toBool())
        {
            return $output;
        }


        $this->setMessage('success_saved');

        $returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminNcenterliteConfig');
        $this->setRedirectUrl($returnUrl);
    }

    function procNotiAdminManualPushInsert() {

	    $loggedInfo = Context::get('logged_info');

	    $oNotiController = getController('noti');
	    $member_srl = $loggedInfo->member_srl;
	    $nick_name = $loggedInfo->nick_name;
	    $ipaddress = $_SERVER['REMOTE_ADDR'];
	    $target_member_srls = Context::get('target_member_srls');
	    $target_device = Context::get('target_device');
	    $type = Context::get('type');
	    $title = Context::get('title');
	    $content = Context::get('content');
	    $icon = Context::get('icon');
	    $image = Context::get('image');
	    $badge = Context::get('badge');
	    $target_url = Context::get('target_url');
	    $require_interaction = Context::get('require_interaction') === "Y";
	    $renotify = Context::get('renotify') === "Y";
	    $silent = Context::get('silent') === "Y";
	    $urgency = Context::get('urgency');
	    $ttl = Context::get('ttl');
	    $send_count = Context::get('send_count');
	    $push_group_srl = Context::get('push_group_srl');

	    $obj = new stdClass();
	    $obj->member_srl = $member_srl;
	    $obj->nick_name =$nick_name;
	    $obj->ipaddress = $ipaddress;
	    $obj->target_device = $target_device;
	    $obj->type = $type;
	    $obj->title = $title;
	    $obj->content = $content;
	    $obj->icon = $icon;
	    $obj->image = $image;
	    $obj->badge = $badge;
	    $obj->target_url = $target_url;
	    $obj->require_interaction = $require_interaction;
	    $obj->renotify = $renotify;
	    $obj->silent = $silent;
	    $obj->urgency = $urgency;
	    $obj->ttl = $ttl;
	    $obj->send_count = $send_count;
	    $obj->push_group_srl = $push_group_srl;

        $output = $oNotiController->sendManualPush($obj, $target_member_srls);
        if(!$output->toBool()) {
            return $output;
        }

        $this->setMessage('메세지 큐로 푸시요청을 보냈습니다.');

        $returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminModuleConfig');
        $this->setRedirectUrl($returnUrl);
    }

    function procNotiAdminManualPushDelete() {
	    $manual_push_srls = Context::get('manual_push_srls');
	    if(!$manual_push_srls || !is_array($manual_push_srls)) {
	        return new BaseObject(-1, "삭제할 수동 푸시 정보가 없습니다.");
        }

	    $oNotiController = getController('noti');
	    $output = $oNotiController->deleteManualPushLog($manual_push_srls);
	    if(!$output->toBool()) {
	        return $output;
        }

        $this->setMessage('success_deleted');
    }

    function procNotiAdminPushGroupInsert() {
        $oNotiModel = getModel('noti');
        $config = $oNotiModel->getConfig();

        $push_group_srl = intval(Context::get('push_group_srl'));
        $max_count = intval(Context::get('max_count'));
        $use_count_summary = Context::get('use_count_summary') === "Y";
        $count_summary_template = Context::get('count_summary_template');
        $name = Context::get('name');

        $pushGroup = $oNotiModel->getPushGroup($push_group_srl);
        if($pushGroup['push_group_srl'] === -1) {
            $push_group_srl = 0;
        }
        if($name) {
            $name = trim($name);
        }

        if(!$name) {
            return new BaseObject(-1, 'msg_invalid_request');
        }

        if(!$push_group_srl) {
            $push_group_srl = getNextSequence();
        }

        $max_count = 1;
        $newPushGroup = array();
        $newPushGroup['push_group_srl'] = $push_group_srl;
        $newPushGroup['name'] = $name;
        $newPushGroup['max_count'] = $max_count;
        $newPushGroup['use_count_summary'] = $use_count_summary;
        $newPushGroup['count_summary_template'] = $count_summary_template;
        $config['PushGroup'][$push_group_srl] = $newPushGroup;

        $args = new stdClass();
        $args->config = $config;
        $oModuleController = getController('module');
        $output = $oModuleController->updateModuleConfig('noti', $args);
        if (!$output->toBool()) {
            return $output;
        }

        $returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminPushGroupList');
        $this->setRedirectUrl($returnUrl);
    }

    function procNotiAdminPushGroupDelete() {
        $push_group_srl = intval(Context::get('push_group_srl'));
        $oNotiModel = getModel('noti');
        $config = $oNotiModel->getConfig();
        if(!$push_group_srl || $push_group_srl === -1 || !array_key_exists($push_group_srl, $config['PushGroup'])){
            return new Object(-1, 'msg_invalid_request');
        }

        unset($config['PushGroup'][$push_group_srl]);

        $args = new stdClass();
        $args->config = $config;
        $oModuleController = getController('module');
        $output = $oModuleController->updateModuleConfig('noti', $args);
        if (!$output->toBool()) {
            return $output;
        }

        $returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminPushGroupList');
        $this->setRedirectUrl($returnUrl);
    }

    function procNotiAdminEndpointDelete() {
	    $endpoint_srl = Context::get('endpoint_srl');
        $endpoint_srls = Context::get('endpoint_srls');
	    $oNotiModel = getModel('noti');
        $oNotiController = getController('noti');
        if(is_array($endpoint_srls) && count($endpoint_srls) > 0) {
            foreach($endpoint_srls as $each_endpoint_srl) {
                $output = $oNotiController->deleteDeviceByEndpointSrl($each_endpoint_srl);
                if(!$output->toBool()){
                    return $output;
                }
            }
        } else {
            if(!$endpoint_srl) {
                return new BaseObject(-1, 'msg_invalid_request');
            }
            $endpointData = $oNotiModel->getEndpoint($endpoint_srl);
            if(!$endpointData) {
                return new BaseObject(-1, '단말기 정보를 불러올 수 없습니다.');
            }
            $output = $oNotiController->deleteDeviceByEndpointSrl($endpoint_srl);
            if(!$output->toBool()){
                return $output;
            }
        }

        $returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminEndpointList');
        $this->setRedirectUrl($returnUrl);
    }

    function procNotiAdminPushLogDelete() {
	    $push_srl = Context::get('push_srl');
	    $push_srls = Context::get('push_srls');
        $oNotiModel = getModel('noti');
        $oNotiController = getController('noti');
        if(is_array($push_srls) && count($push_srls) > 0) {
            foreach($push_srls as $each_pusht_srl) {
                $output = $oNotiController->deletePushLog($each_pusht_srl);
                if(!$output->toBool()){
                    return $output;
                }
            }
        } else {
            if(!$push_srl) {
                return new BaseObject(-1, 'msg_invalid_request');
            }
            $pushData = $oNotiModel->getPushLog($push_srl);
            if(!$pushData) {
                return new BaseObject(-1, '푸시 정보를 불러올 수 없습니다.');
            }
            $output = $oNotiController->deletePushLog($push_srl);
            if(!$output->toBool()){
                return $output;
            }
        }

        $returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminPushLogList');
        $this->setRedirectUrl($returnUrl);
    }

    function procNotiAdminPushTest() {
	    $logged_info = Context::get('logged_info');
	    $endpoint_srl = Context::get('endpoint_srl');
	    $oNotiModel = getModel('noti');
	    $oNotiController = getController('noti');
	    $endpointInfo = $oNotiModel->getEndpoint($endpoint_srl);
	    if(!$endpointInfo) {
	        return new BaseObject(-1, "단말기 정보를 찾을 수 없습니다.");
        }

        $endpointArgs = new stdClass();
        $endpointArgs->endpoint_srl = (int)$endpointInfo->endpoint_srl;
        $endpointArgs->endpoint = $endpointInfo->endpoint;
        $endpointArgs->key = $endpointInfo->key;
        $endpointArgs->auth = $endpointInfo->auth;
        $endpointArgs->supportedEncoding = explode(",", $endpointInfo->supported_encoding);
        
	    $memberInfo = new stdClass();
	    $memberInfo->member_srl = $logged_info->member_srl;
	    $memberInfo->nick_name = $logged_info->nick_name;

        $oNotiController->sendTestMessage($memberInfo, $endpointArgs);
    }

    function procNotiAdminPushLogDeleteByOptions() {
	    $oNotiController = getController('noti');
	    $type = Context::get('target_name');
	    $value = Context::get('target_keyword');
	    $dateRange = (int)Context::get('date_range');
	    if(!$type) {
            $type = null;
        }
	    if($type && !$value) {
	        return BaseObject(-1, "삭제할 발송로그의 대상 값이 입력되지 않았습니다.");
        }

	    $output = $oNotiController->deletePushLogByOptions($type, $value, $dateRange);
	    if(!$output->toBool()) {
            return $output;
        }
    }

    function procNotiAdminEndpointDeleteByOptions() {

    }

    function procNotiAdminEndpointDeleteDormant() {
	    $target_type = Context::get("target_type");
	    $dormant_date = Context::get('dormant_date');
	    
    }

    function procNotiAdminPushResend() {
	    $push_srl = Context::get('push_srl');
	    $resendCount = (int)Context::get('resend_count');
	    $oNotiController = getController('noti');
	    $output = $oNotiController->resendPush($push_srl, $resendCount);
	    if(!$output->toBool()) {
	        return $output;
        }

        return $output;
    }

    function procNotiAdminSkinConfig() {
        $oModuleController = getController('module');
        $oModuleModel = getModel('module');
        $notiInfo = $oModuleModel->getModuleInfoByMid('noti');
        if($notiInfo){
            $notiInfo->skin = Context::get('skin');
            $notiInfo->mskin = Context::get('mskin');
            $notiInfo->layout_srl = Context::get('layout_srl');
            $notiInfo->mlayout_srl = Context::get('mlayout_srl');
            $notiInfo->use_mobile = Context::get('use_mobile') === "Y" ? "Y" : "N";

            $oModuleController->updateModule($notiInfo);
        }

        $this->setMessage('success_saved');

        $returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminSkinConfig');
        $this->setRedirectUrl($returnUrl);
    }

    private function getValidImageRules($text = "") {
	    $text = is_string($text) ? $text : "";
	    $split = explode(";", $text);
	    $rules = array();
	    foreach($split as $each) {
	        $each = strtolower(trim($each));
	        if($each) {
	            $ruleSplit = explode(".", $each);
	            if(count($ruleSplit) > 1 && end($ruleSplit)) {
                    $rules[] = $each;
                }
            }
        }

	    return $rules;
    }

    private function getCurrectEndpointFilter($text = "") {
	    $oNotiModel = getModel('noti');
	    $text = $text ? trim($text) : "";
	    if(!$text) {
	        return $oNotiModel->getPushDefaultConfig()['endpointFilter'];
        }

        $split = preg_split("/\r\n|\n|\r/", $text);
        $rules = array();
        foreach($split as $each) {
            $each = trim($each);
            preg_match('/^https:\/\/(\.?(\w+|\*))+\/$/', $each, $result);
            if($result) {
                $rules[] = $each;
            }
        }

        return $rules;
    }

    private function configObjectRecursion(&$vars, &$before) {
	    $boolKeys = array('use', 'simpleConfig', 'tryinsertIfLogin', 'tryinsertIfAutologin', 'allowDebugPage', 'memberToGuest',
            'allowInsert', 'sendInsertNotice', 'silent', 'requireInteraction', 'renotify', 'sendDeniedMember', 'addMemberMenu');
	    $intKeys = array('ttl', 'thumbnailWidth', 'thumbnailHeight', 'pushGroupSrl', 'browserPushLogMaxCount');
	    $__arrType = null;
	    foreach($before as $key=>$val) {
            if(!array_key_exists ($key, $vars) || (is_array($val) && !is_array($vars[$key]))) {
                $vars[$key] = $before[$key];
            } else if(is_array($vars[$key]) && is_array($before)) {
                $this->configObjectRecursion($vars[$key], $val);
            }

            switch($key) {
                case "__arrType":
                    $__arrType = $val;
                    unset($vars[$key]);
                    break;

                case "actions":
                    if( 1 || (array_key_exists("__arrType", $vars) && $vars[$key] === "pushOptions") || $__arrType === "pushOptions") {
                        $actionList = array();
                        for($i=1; $i<=3; $i++) {
                            $eachActionArr = array();
                            $action = "action".$i;
                            $eachActionArr['action'] = array_key_exists($action, $vars) ? $vars[$action] : null;
                            $eachActionArr['title'] = array_key_exists($action."_title", $vars) ? $vars[$action."_title"] : null;
                            $eachActionArr['icon'] = array_key_exists($action."_icon", $vars) ? $vars[$action."_icon"] : null;
                            $eachActionArr['launchUrl'] = array_key_exists($action."_launch_url", $vars) ? $vars[$action."_launch_url"] : null;
                            if($eachActionArr['action'] && $eachActionArr['title']) {
                                $actionList[] = $eachActionArr;
                            }
                        }
                        $vars[$key] = $actionList;
                    }

                    break;
            }

            if(in_array($key, $boolKeys) && !is_bool($vars[$key])) {
                $vars[$key] = $vars[$key] === "Y";
            } else if(in_array($key, $intKeys)) {
                $vars[$key] = is_numeric($vars[$key]) ? intval($vars[$key]) : null;
            } else if(is_string($vars[$key]) && !trim($vars[$key])) {
                $vars[$key] = null;
            }
        }

	    foreach($vars as $key=>$val) {
	        if(is_string($key) && !array_key_exists ($key, $before)) {
	            unset($vars[$key]);
            }
        }
    }

    private function microtimeFloat(){
        list($usec, $sec) = explode(" ", microtime());
        return ((float)$usec + (float)$sec);
    }

    //!!!E


}

/* End of file noti.admin.controller.php */
/* Location: ./modules/noti/noti.admin.controller.php */
