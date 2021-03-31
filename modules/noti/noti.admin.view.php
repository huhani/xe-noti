<?php
/*! Copyright (C) 2021 BGM STORAGE. All rights reserved. */
/**
 * @class  noti
 * @author Huhani (mmia268@gmail.com)
 * @brief  noti module admin view.
 */

class notiAdminView extends noti
{
	function init(){
		$this->setTemplatePath($this->module_path.'tpl');
	}

    function dispNotiAdminModuleConfig(){
        $oNotiModel = getModel('noti');
        $notiConfig = $oNotiModel->getConfig();
        $pushGroupList = $oNotiModel->getPushGroupList(true);
        $configFulfilled = $oNotiModel->isConfigFulfilled();

        Context::set('configFulfilled', $configFulfilled);
        Context::set('notiConfig', $notiConfig);
        Context::set('pushGroupList', $pushGroupList);

        debugPrint($pushGroupList);

        $this->setTemplateFile('moduleConfig');
    }

    function dispNotiAdminPushGroupList(){
        $oNotiModel = getModel('noti');
        $notiConfig = $oNotiModel->getConfig();
        $pushGroupList = $notiConfig['PushGroup'];
        Context::set('pushGroupList', $pushGroupList);

        $this->setTemplateFile('pushGroupList');
    }

    function dispNotiAdminPushGroupInsert(){
	    $push_group_srl = intval(Context::get('push_group_srl'));
        $oNotiModel = getModel('noti');
        $pushGroup = $push_group_srl ? $oNotiModel->getPushGroup($push_group_srl) : null;

        Context::set('pushGroup', $pushGroup);

        $this->setTemplateFile('pushGroupInsert');
    }

    function dispNotiAdminNcenterliteConfig(){
        $oNotiModel = getModel('noti');
        $notiConfig = $oNotiModel->getConfig();
        $pushGroupList = $oNotiModel->getPushGroupList(true);
        $ncenterliteConfig = $notiConfig['Ncenterlite'];
	    Context::set('ncenterliteConfig', $ncenterliteConfig);
        Context::set('pushGroupList', $pushGroupList);

        $this->setTemplateFile('ncenterliteConfig');
    }

    function dispNotiAdminEndpointList() {
        $oMemberModel = getModel('member');
        $search_target = Context::get('search_target');
        $search_keyword = Context::get('search_keyword');
        if($search_target === "nick_name_now") {
            $targetMemberSrl = $oMemberModel->getMemberSrlByNickName($search_keyword);
            if($targetMemberSrl) {
                $search_target = "member_srl";
                $search_keyword = $targetMemberSrl;
            }
        }

        $args = new stdClass();
        $columnList = array('endpoint_srl', 'member_srl', 'nick_name', 'ipaddress', 'user_agent', 'endpoint_crc32', 'endpoint', 'auth', 'key', 'browser', 'platform', 'regdate');
        if($search_target && in_array($search_target, $columnList)) {
            $args->{"s_".$search_target} = $search_keyword ? $search_keyword : null;
        }
        $args->sort_index = Context::get('sort_index') ? Context::get('sort_index') : 'regdate';
        $args->order_type = Context::get('order_type') ? Context::get('order_type') : 'desc';
        $args->list_count = 30;
        $args->page = Context::get('page');
        $output = executeQueryArray('noti.getNotiEndpointList', $args);
        if($output->data) {
            foreach($output->data as &$value){
                $oMemberModel = getModel('member');
                $oMemberInfo = $oMemberModel->getMemberInfoByMemberSrl($value->member_srl);
                $value->user_id = $oMemberInfo->user_id;
            }
        }
        
        Context::set('list', $output->data);
        Context::set('page_navigation', $output->page_navigation);

        $this->setTemplateFile('endpointList');
    }

    function dispNotiAdminPushLogList() {
	    $oMemberModel = getModel('member');
        $search_target = Context::get('search_target');
        $search_keyword = Context::get('search_keyword');
        $filter_type = Context::get('filter_type');

        if($search_target === "nick_name_now") {
            $targetMemberSrl = $oMemberModel->getMemberSrlByNickName($search_keyword);
            if($targetMemberSrl) {
                $search_target = "member_srl";
                $search_keyword = $targetMemberSrl;
            }
        } else if($search_target === "sender_nick_name_now") {
            $targetMemberSrl = $oMemberModel->getMemberSrlByNickName($search_keyword);
            if($targetMemberSrl) {
                $search_target = "sender_member_srl";
                $search_keyword = $targetMemberSrl;
            }
        }



        $args = new stdClass();
        $columnList = array('push_srl', 'endpoint_srl', 'member_srl', 'nick_name', 'sender_member_srl', 'sender_nick_name', 'type', 'content_summary', 'ipaddress', 'push_payload', 'target_url', 'status_code', 'regdate');
        if($search_target && in_array($search_target, $columnList)) {
            $args->{"s_".$search_target} = is_string($search_keyword) && strlen($search_keyword) > 0 ? $search_keyword : null;
        }
        $args->sort_index = Context::get('sort_index') ? Context::get('sort_index') : 'regdate';
        $args->order_type = Context::get('order_type') ? Context::get('order_type') : 'desc';
        $args->list_count = 30;
        $args->page = Context::get('page');
        if($filter_type === "readed") {
            $args->is_readed = "Y";
        } else if($filter_type === "not_readed") {
            $args->is_readed = "N";
        } else if($filter_type === "clicked") {
            $args->is_clicked = "Y";
        } else if($filter_type === "send_failure") {
            $args->status_code_without = 201;
        }

        $output = executeQueryArray('noti.getNotiPushList', $args);

        Context::set('list', $output->data);
        Context::set('total_count', $output->total_count);
        Context::set('page_navigation', $output->page_navigation);

        $this->setTemplateFile('pushLogList');
    }

    function dispNotiAdminPushLogView() {
	    $oNotiModel = getModel('noti');
        $oMemberModel = getModel('member');
	    $push_srl = Context::get('push_srl');
	    $pushData = $oNotiModel->getPushLog($push_srl);
	    $endpointData = $pushData ? $oNotiModel->getEndpoint($pushData->endpoint_srl) : null;
	    $memberInfo = $pushData ? $oMemberModel->getMemberInfoByMemberSrl($pushData->member_srl) : null;
	    $senderMemberInfo = $pushData ? $oMemberModel->getMemberInfoByMemberSrl($pushData->sender_member_srl) : null;
	    $payloadData = $pushData && $pushData->push_payload ? @json_decode($pushData->push_payload) : null;
	    $pushResponse = $pushData && $pushData->push_response ? @json_decode($pushData->push_response) : null;

        Context::set('pushMemberInfo', $memberInfo);
        Context::set('pushSenderMemberInfo', $senderMemberInfo);
	    Context::set('pushData', $pushData);
        Context::set('payloadData', $payloadData);
	    Context::set('endpointData', $endpointData);
        Context::set('pushResponse', $pushResponse);

        $this->setTemplateFile('pushLogView');
    }

    function dispNotiAdminEndpointView() {
        $oNotiModel = getModel('noti');
        $oMemberModel = getModel('member');
        $endpoint_srl = Context::get('endpoint_srl');
        $startDate = (int)Context::get('startDate');
        $startDateYmdHis = null;
        if($startDate === 0) {
            $startDate = 7;
        } else if($startDate < 0) {
            $startDate = null;
        }
        if($startDate) {
            $startDateYmdHis = date("YmdHis", strtotime("-".$startDate." days"));
        }
        Context::set('startDate', $startDate);

        $endpointSummary = $oNotiModel->getEndpointSummary($endpoint_srl, $startDateYmdHis);
        $endpointData = $oNotiModel->getEndpoint($endpoint_srl);
        $memberInfo = $endpointData ? $oMemberModel->getMemberInfoByMemberSrl($endpointData->member_srl) : null;

        $endpointSummary->lastClickDateTimeGap = null;
        $endpointSummary->lastReceiveDateTimeGap = null;
        $endpointSummary->lastSendDateTimeGap = null;
        if($endpointSummary->lastClickDate) {
            $clickTimeGap = time() - strtotime($endpointSummary->lastClickDate);
            $endpointSummary->lastClickDateTimeGap = $clickTimeGap > 0 ? $this->secondToString($clickTimeGap, true) . " 전" : "조금 전";
        }
        if($endpointSummary->lastReceiveDate) {
            $receiveTimeGap = time() - strtotime($endpointSummary->lastReceiveDate);
            $endpointSummary->lastReceiveDateTimeGap = $receiveTimeGap > 0 ? $this->secondToString($receiveTimeGap, true) . " 전" : "조금 전";
        }
        if($endpointSummary->lastSendDate) {
            $sendTimeGap = time() - strtotime($endpointSummary->lastSendDate);
            $endpointSummary->lastSendDateTimeGap = $sendTimeGap > 0 ? $this->secondToString($sendTimeGap, true) . " 전" : "조금 전";
        }

        $endpointSummary->avgReadTimeStr = $this->secondToString($endpointSummary->avgReadTime);
        $endpointSummary->avgClickTimeSinceReadStr = $this->secondToString($endpointSummary->avgClickTimeSinceRead);
        $endpointSummary->avgClickTimeStr = $this->secondToString($endpointSummary->avgClickTime);

        Context::set('endpointMemberInfo', $memberInfo);
        Context::set('endpointData', $endpointData);
        Context::set('endpointSummary', $endpointSummary);

        $this->setTemplateFile('endpointView');
    }

    function dispNotiAdminInspectView() {
        $this->setTemplateFile('inspectView');
    }

    function dispNotiAdminManualPushList() {
        $oMemberModel = getModel('member');
        $search_target = Context::get('search_target');
        $search_keyword = Context::get('search_keyword');
        if($search_target === "nick_name_now") {
            $targetMemberSrl = $oMemberModel->getMemberSrlByNickName($search_keyword);
            if($targetMemberSrl) {
                $search_target = "member_srl";
                $search_keyword = $targetMemberSrl;
            }
        }

        $args = new stdClass();
        $columnList = array('member_srl', 'nick_name', 'title', 'content', 'image', 'icon', 'target_url', 'regdate');
        if($search_target && in_array($search_target, $columnList)) {
            $args->{"s_".$search_target} = is_string($search_keyword) && strlen($search_keyword) > 0 ? $search_keyword : null;
        }
        $args->sort_index = Context::get('sort_index') ? Context::get('sort_index') : 'regdate';
        $args->order_type = Context::get('order_type') ? Context::get('order_type') : 'desc';
        $args->list_count = 30;
        $args->page = Context::get('page');
        $output = executeQueryArray('noti.getNotiManualPushList', $args);
        Context::set('list', $output->data);
        Context::set('total_count', $output->total_count);
        Context::set('page_navigation', $output->page_navigation);

        $this->setTemplateFile('manualPushList');
    }

    function dispNotiAdminManualPushView() {
        $this->setTemplateFile('manualPushView');
    }

    function dispNotiAdminManualPushInsert() {

	    $manual_push_srl = Context::get('manual_push_srl');

        $oNotiModel = getModel('noti');
        $pushGroupList = $oNotiModel->getPushGroupList(true);
        $totalEndpointCount = $oNotiModel->getEndpointCount();
        $manualPushLog = $oNotiModel->getManualPushLog($manual_push_srl);

        Context::set('pushGroupList', $pushGroupList);
        Context::set('totalEndpointCount', $totalEndpointCount);
        Context::set('manualPush', $manualPushLog);
        $this->setTemplateFile('manualPushInsert');
    }

    function secondToString($second = 0, $gapMode = false) {
        $t = $second;
        $d = floor($t / (3600 * 24));
        $t -= $d * 3600 * 24;
        $h = floor($t / 3600);
        $t -= $h * 3600;
        $m = floor($t / 60);
        $s = $t % 60;

        $strArr = array();

        if($d > 0) {
            $strArr[] = $d."일";
        }
        if((!$gapMode || !count($strArr)) && $h > 0) {
            $strArr[] = $h."시간";
        }
        if((!$gapMode || !count($strArr)) && $m > 0) {
            $strArr[] = $m."분";
        }
        if((!$gapMode || !count($strArr)) && $s > 0) {
            $strArr[] = $s."초";
        }

        return implode(" ", $strArr);
    }



}

/* End of file : noti.admin.view.php */
/* Location : ./modules/noti/noti.admin.view.php */
