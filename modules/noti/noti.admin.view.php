<?php
/*! Copyright (C) 2017 MORING WORLD. All rights reserved. */
/**
 * @class  noti
 * @author Huhani (mmia268@gmail.com)
 * @brief  noti module admin view.
 */

class notiAdminView extends noti
{
	function init(){
		$oModuleModel = getModel('module');
		$this->module_info = $oModuleModel->getModuleInfoByMid("media");

		$this->setTemplatePath($this->module_path.'tpl');
		Context::set('config', $this->module_config);
	}

	function dispNotiAdminList() {
		$search_target = Context::get('search_target');
		$search_keyword = Context::get('search_keyword');

		$oMemberModel = getModel('member');
		$args = new stdClass();
		$columnList = array('noti_srl', 'ipaddress', 'type', 'member_srl', 'regdate');
		if($search_target && in_array($search_target, $columnList)) {
			$args->{"s_".$search_target} = $search_keyword ? $search_keyword : null;
		}
		$args->sort_index = Context::get('sort_index') ? Context::get('sort_index') : 'regdate';
		$args->order_type = Context::get('order_type') ? Context::get('order_type') : 'desc';
		$args->list_count = 20;
		$args->page = Context::get('page');
		$output = executeQueryArray('noti.getNotiAdminList', $args);

		foreach($output->data as &$value){
			$oMemberInfo = $oMemberModel->getMemberInfoByMemberSrl($value->member_srl);
			$value->nick_name = $oMemberInfo->nick_name;
		}

		Context::set('list', $output->data);
		Context::set('page_navigation', $output->page_navigation);

		$this->setTemplateFile('noti_list');
	}

	function dispNotiAdminView() {
		$noti_srl = Context::get('noti_srl');
		if(!$noti_srl) {
			return new Object(-1, 'msg_invalid_request');
		}

		$oNotiModel = getModel('noti');
		$oMemberModel = getModel('member');
		$oNotiInfo = $oNotiModel->getNotiInfoByNotiSrl($noti_srl);
		if(!$oNotiInfo) {
			return new Object(-1, 'msg_invalid_request');
		}
		$member_srl = $oNotiInfo->member_srl;
		$member_info = $oMemberModel->getMemberInfoByMemberSrl($member_srl);
		$device_count = $oNotiModel->getNotiRegInfoCount($member_srl);

		$oNotiInfo->device_count = $device_count;

		Context::set('noti', $oNotiInfo);
		Context::set('member_info', $member_info);

		$this->setTemplateFile('noti_view');
	}

	function dispNotiAdminRegInfoList() {
		$search_target = Context::get('search_target');
		$search_keyword = Context::get('search_keyword');

		$oMemberModel = getModel('member');
		$args = new stdClass();
		$columnList = array('reg_srl', 'member_srl', 'noti_srl', 'ipaddress', 'browser', 'platform', 'last_post', 'regdate');
		if($search_target && in_array($search_target, $columnList)) {
			$args->{"s_".$search_target} = $search_keyword ? $search_keyword : null;
		}
		$args->sort_index = Context::get('sort_index') ? Context::get('sort_index') : 'regdate';
		$args->order_type = Context::get('order_type') ? Context::get('order_type') : 'desc';
		$args->list_count = 20;
		$args->page = Context::get('page');
		$output = executeQueryArray('noti.getNotiAdminRegInfoList', $args);

		foreach($output->data as &$value){
			$oMemberInfo = $oMemberModel->getMemberInfoByMemberSrl($value->member_srl);
			$value->user_id = $oMemberInfo->user_id;
			$value->nick_name = $oMemberInfo->nick_name;
		}

		Context::set('list', $output->data);
		Context::set('page_navigation', $output->page_navigation);

		$this->setTemplateFile('noti_reg_list');
	}

	function dispNotiAdminRegInfoView() {
		$reg_srl = Context::get('reg_srl');
		if(!$reg_srl) {
			return new Object(-1, 'msg_invalid_request');
		}

		$oNotiModel = getModel('noti');
		$oMemberModel = getModel('member');
		$oRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl);
		if(!$oRegInfo) {
			return new Object(-1, 'msg_invalid_request');
		}

		$member_srl = $oRegInfo->member_srl;
		$member_info = $oMemberModel->getMemberInfoByMemberSrl($member_srl);

		Context::set('reg_info', $oRegInfo);
		Context::set('member_info', $member_info);

		$this->setTemplateFile('noti_reg_view');
	}

	function dispNotiAdminConfig(){
		$this->setTemplateFile('config');
	}

	

}

/* End of file : noti.admin.view.php */
/* Location : ./modules/noti/noti.admin.view.php */
