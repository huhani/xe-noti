<?php
/*! Copyright (C) 2017 Moring World. All rights reserved. */
/**
 * @class noti Model
 * @author Huhani (mmia268@gmail.com)
 * @brief noti module model class.
 */

class notiModel extends noti
{
	function init(){
	}

	function getConfig(){
		static $config = null;
		if(is_null($config))	{
			$oModuleModel = getModel('module');
			$config = $oModuleModel->getModuleConfig('noti');
			if(!$config){
				$config = new stdClass;
			}

			unset($config->body);
			unset($config->_filter);
			unset($config->error_return_url);
			unset($config->act);
			unset($config->module);
		}

		return $config;
	}

	function getNotiCheckUseDevice() {
		$endpoint = Context::get('endpoint');
		$reg_srl = Context::get('reg_srl');
		if(!$endpoint || !$reg_srl) {
			$this->add('result' , "NOT_EXIST_DEVICE");
			return;
		}

		$dev_id = $this->getDevId($endpoint);
		$oNotiRegInfo = $this->getNotiRegInfoByRegSrl($reg_srl);
		if(!$oNotiRegInfo || ($oNotiRegInfo && $oNotiRegInfo->dev_id != $dev_id) ) {
			$this->add('result' , "NOT_EXIST_DEVICE");
			return;
		}

		if(Context::get('get_dev_id')) {
			$this->add('dev_id' , $oNotiRegInfo->dev_id);
		}
		$this->add('result' , "EXIST_DEVICE");
	}

	function getNotiNotificationByServiceWorker() {

		if($_SERVER['REQUEST_METHOD'] !== 'POST') {
			$this->setErrorPage();
			exit();
		}

		$module_config = $this->module_config;

		$defaultMsg = new stdClass();
		$defaultMsg->default_title = $module_config->default_title;
		$defaultMsg->default_message = $module_config->default_message;
		$defaultMsg->default_icon = $module_config->default_icon;
		$defaultMsg->default_url = $module_config->default_url;

		$endpoint = Context::get('endpoint');
		$reg_srl = Context::get('reg_srl');
		if(!$endpoint || !$reg_srl) {
			$defaultMsg->status = 'NOT_FOUND';
			echo json_encode($defaultMsg);
			exit();
		}

		$dev_id = $this->getDevId($endpoint);
		$oNotiRegInfo = $this->getNotiRegInfoByRegSrl($reg_srl);
		if(!$oNotiRegInfo || ($oNotiRegInfo && $oNotiRegInfo->dev_id != $dev_id) ) {
			$defaultMsg->status = 'NOT_REGISTER_ID';
			echo json_encode($defaultMsg);
			exit();
		}

		$noti_srl = $oNotiRegInfo->noti_srl;
		$oNotiInfo = $this->getNotiInfoByNotiSrl($noti_srl);
		if(!$oNotiInfo) {
			$defaultMsg->status = 'NOT_EXIST_NOTIFICATION';
			echo json_encode($defaultMsg);
			exit();
		}

		if($oNotiInfo->is_readed === "Y" && $oNotiRegInfo->is_recv === "Y") {
			$defaultMsg->status = 'ALREADY_READED';
			echo json_encode($defaultMsg);
			exit();
		}

		$oNotiController = getController('noti');
		$output = $oNotiController->setNotiReaded($noti_srl, $oNotiRegInfo->reg_srl);

		$obj->title = $this->module_config->noti_title;
		$obj->content_summary = $oNotiInfo->content_summary;
		$obj->type = $oNotiInfo->type;
		$obj->target_nick_name = $oNotiInfo->target_nick_name;
		$obj->target_profile_image = $oNotiInfo->target_profile_image;
		$obj->target_url = $oNotiInfo->target_url;
		$obj->is_readed = $oNotiInfo->is_readed;
		$obj->is_recv = $oNotiRegInfo->is_recv;
		//$obj->last_post = $oNotiRegInfo->last_post;
		$obj->date = date("YmdHis");
		$obj->status = 'SUCCESS';
		echo json_encode($obj);

//debugPrint($obj);

		exit();
	}

	function getNotiRegInfoToPost($member_srl = 0, $last_post = null) {

		if($this->module_config) {
			$module_config = $this->module_config;
		} else {
			$module_config = $this->module_config = $this->getConfig();
		}

		if(!$last_post) {
			$last_post = date("YmdHis", mktime(date('H'), date('i'), date('s')-(int)($module_config->fcm_msg_exptime), date('m'), date('d'), date('Y')));
		}

		$args = new stdClass();
		$args->member_srl = $member_srl;
		$args->last_post = $last_post; // <- 이 값 이상인 값은 제외함.
		$output = executeQueryArray('noti.getNotiRegInfoToPost', $args);
		if(!$output->toBool() || empty($output->data)) {
			return false;
		}

		return $output->data;
	}

	function getNotiRegInfoByDevId($dev_id = null, $member_srl = null) {
		$args = new stdClass();
		$args->member_srl = $member_srl;
		$args->dev_id = $dev_id;
		$output = executeQueryArray('noti.getNotiRegInfoByDevId', $args);
		if(!$output->toBool() || empty($output->data)) {
			return false;
		}

		return $output->data;
	}

	function getNotiRegInfoByRegSrl($reg_srl = false, $member_srl = null) {
		if(!$reg_srl) {
			return false;
		}

		$args = new stdClass();
		$args->reg_srl = $reg_srl;
		$args->member_srl = $member_srl;
		$output = executeQuery('noti.getNotiRegInfoByRegSrl', $args);
		if(!$output->toBool() || empty($output->data)) {
			return false;
		}

		return $output->data;
	}

	function getNotiRegInfoCount($member_srl = 0) {
		if(!$member_srl) {
			return false;
		}

		$args = new stdClass();
		$args->member_srl = $member_srl;
		$output = executeQuery('noti.getNotiRegInfoCountByMemberSrl', $args);

		return $output->data->count;
	}

	function getNotiInfoByMemberSrl($member_srl) {
		if(!$member_srl) {
			$logged_info = Context::get('logged_info');
			if(!$logged_info) {
				return false;
			}

			$member_srl = $logged_info->member_srl;
		}

		$args = new stdClass();
		$args->member_srl = $member_srl;
		$output = executeQuery('noti.getNotiInfoByMemberSrl', $args);
		if(!$output->toBool() || empty($output->data)) {
			return false;
		}

		return $output->data;
	}

	function getNotiInfoByNotiSrl($noti_srl = 0) {
		if(!$noti_srl) {
			return false;
		}

		$args = new stdClass();
		$args->noti_srl = $noti_srl;
		$output = executeQuery('noti.getNotiInfoByNotiSrl', $args);
		if(!$output->toBool() || empty($output->data)) {
			return false;
		}

		return $output->data;
	}

}

/* End of file noti.model.php */
/* Location: ./modules/noti/noti.model.php */
