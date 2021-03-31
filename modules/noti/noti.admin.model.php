<?php

class notiAdminModel extends noti {
    function init() {

    }

    function getNotiAdminPushLog() {
        $push_srl = Context::get('push_srl');
        $oNotiModel = getModel('noti');
        $oPushLog = $oNotiModel->getPushLog($push_srl);
        $this->add('data', $oPushLog);
    }

    function getNotiAdminPushLogCount() {
        $oNotiModel = getModel('noti');
        $type = Context::get('target_name');
        $value = Context::get('target_keyword');
        $dateRange = (int)Context::get('date_range');
        $resultCount = $oNotiModel->getPushLogCount($type, $value, $dateRange);

        $this->add('count', $resultCount);
    }

    function getNotiAdminEndpointCount() {
        $oNotiModel = getModel('noti');
        $type = Context::get('target_name');
        $value = Context::get('target_keyword');
        $resultCount = $oNotiModel->getEndpointCount($type, $value);

        $this->add('count', $resultCount);
    }

    function getNotiAdminDormantEndpointCount() {
        $oNotiModel = getModel('noti');
        $type = Context::get('target_name');
        $date = Context::get('dormant_date');
        $resultCount = $oNotiModel->getDormantEndpointCount($type, $date);
        
        $this->add('count', $resultCount);
    }

    function getNotiAdminMemberList() {

        $nick_name = Context::get('nick_name');
        $list_count = 100;

        $args = new stdClass();
        $args->nick_name = $nick_name;
        $args->sort_index = "member.nick_name";
        $args->order_type = "asc";
        $args->endpoint_count_order_type = "desc";
        $args->list_count = $list_count;
        $output = executeQueryArray('noti.getMemberWithEndpointCount', $args);

        $this->add('data', $output->data);
    }

}