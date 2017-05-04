<?php
/*! Copyright (C) 2017 MORING WORLD. All rights reserved. */
/**
 * @class  notiAdminController
 * @author Huhani (mmia268@gmail.com)
 * @brief  Noti module admin controller class.
 */

class notiAdminController extends noti
{
	function init()
	{
	}

	function procNotiAdminConfig()
	{

		$oModuleController = getController('module');

		$config = Context::getRequestVars();
		getDestroyXeVars($config);
		unset($config->body);
		unset($config->_filter);
		unset($config->error_return_url);
		unset($config->act);
		unset($config->module);
		unset($config->ruleset);

		if($config->use_modules){
			$config->use_modules = explode(",", $config->use_modules);
		} else {
			$config->use_modules = array();
		}

		$output = $oModuleController->updateModuleConfig('noti', $config);
		if (!$output->toBool())
		{
			return $output;
		}

		$this->setMessage('success_saved');

		$returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', 'admin', 'act', 'dispNotiAdminConfig');
		$this->setRedirectUrl($returnUrl);
	}

	function procNotiAdminDelete() {
		$member_srl = Context::get('member_srl');
		if(!$member_srl) {
			return new Object(-1, 'msg_invalid_request');
		}

		$oNotiController = getController('noti');
		$oNotiController->deleteNotiAllInfoByMemberSrl($member_srl);

		$module = Context::get('module');
		$page = Context::get('page');
		$search_target = Context::get('search_target');
		$search_keyword = Context::get('search_keyword');

		$returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', $module, 'act', 'dispNotiAdminList', 'search_target', $search_target, 'search_keyword', $search_keyword, 'page', $page);
		$this->setRedirectUrl($returnUrl);
	}

	function procNotiAdminRegInfoReq() {
		$reg_srl = Context::get('reg_srl');
		if(!$reg_srl) {
			return new Object(-1, 'msg_invalid_request');
		}

		$oNotiModel = getModel('noti');
		$oNotiController = getController('noti');

		$oNotiRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl);
		if(!$oNotiRegInfo) {
			return new Object(-1, 'msg_invalid_request');
		}

		$oNotiController->postNotificationByRegSrl($reg_srl);
	}

	function procNotiAdminRegInfoDelete() {
		$reg_srl = Context::get('reg_srl');
		if(!$reg_srl) {
			return new Object(-1, 'msg_invalid_request');
		}

		$oNotiModel = getModel('noti');
		$oNotiController = getController('noti');

		$oNotiRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl);
		if(!$oNotiRegInfo) {
			return new Object(-1, 'msg_invalid_request');
		}

		$member_srl = $oNotiRegInfo->member_srl;

		$output = $oNotiController->deleteNotiRegInfoByRegSrl($reg_srl);
		$member_dev_count = $oNotiModel->getNotiRegInfoCount($member_srl);

		if(!$member_dev_count) {
			$oNotiController->deleteNotiInfoByMemberSrl($member_srl);
		}

		$module = Context::get('module');
		$page = Context::get('page');
		$search_target = Context::get('search_target');
		$search_keyword = Context::get('search_keyword');

		$returnUrl = Context::get('success_return_url') ? Context::get('success_return_url') : getNotEncodedUrl('', 'module', $module, 'act', 'dispNotiAdminRegInfoList', 'search_target', $search_target, 'search_keyword', $search_keyword, 'page', $page);
		$this->setRedirectUrl($returnUrl);
	}

}

/* End of file noti.admin.controller.php */
/* Location: ./modules/noti/noti.admin.controller.php */
