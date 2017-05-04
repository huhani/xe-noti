<?php
/*! Copyright (C) 2017 MORING WORLD. All rights reserved. */
/**
 * @class  noti
 * @author Huhani (mmia268@gmail.com)
 * @brief  noti module high class.
 */

class noti extends ModuleObject
{


	private $triggers = array(
		array( 'member.deleteMember',			'noti',	'controller',	'triggerDeleteMember',					'after'	),
		//array( 'document.insertDocument',	'noti',	'controller',	'triggerAfterInsertDocument',      'after'	),
		//array( 'document.updateDocument',	'noti',	'controller',	'triggerAfterUpdateDocument',      'after'	),
		//array( 'document.deleteDocument',	'noti',	'controller',	'triggerAfterDeleteDocument',      'after'	),
		array( 'comment.insertComment',		'noti',	'controller',	'triggerAfterInsertComment',       'after'	),
		//array( 'comment.updateComment',		'noti',	'controller',	'triggerAfterUpdateComment',       'after'	),
		//array( 'comment.deleteComment',		'noti',	'controller',	'triggerAfterDeleteComment',       'after'	),
		array( 'member.doLogin',				'noti',	'controller',	'triggerAfterDoLogin',       			'after'	),
		//array( 'member.doLogout',				'noti',	'controller',	'triggerAfterDoLogout',       			'after'	),
		array( 'moduleHandler.init',			'noti',	'controller',	'triggerBeforeModuleInit',				'before'	),
		//array( 'moduleObject.proc',			'noti',	'controller',	'triggerBeforeModuleProc',				'before'	),
		array( 'display',                   'noti', 'controller', 'triggerBeforeDisplay',            'before' )
	);


	function moduleInstall()
	{
		$oModuleModel = getModel('module');
		$oModuleController = getController('module');

		$config = new stdClass();
		$config->use = "Y";
		$config->fcm_msg_exptime = 3600 * 2; //2시간. (단위: 초)
		$config->fcm_msg_priority = 'normal'; // "normal" or "high"
		$config->noti_title = '#알림';
		$config->init_target_member_srl = -1;
		$config->init_target_nick_name = '[알림]';
		$config->init_target_profile_image = '/modules/noti/tpl/default.jpg';
		$config->init_content_summary = '새로운 단말기에서 알림이 등록되었습니다.';
		$config->init_target_url = '/index.php?act=dispNotiDeviceList';
		$config->max_reg_device_count = 15;
		$config->login_readed = 'Y';
		$config->auto_login = 'Y';
		$config->show_member_menu = 'Y';

		$config->default_title = '#알림';
		$config->default_icon = '/modules/noti/tpl/default.jpg';
		$config->default_message = '메세지가 도착했습니다.';
		$config->default_url = '/';

		$oModuleController->insertModuleConfig('noti', $config);

		foreach ($this->triggers as $trigger) {
			$oModuleController->insertTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]);
		}

		return new Object();
	}




	function moduleUninstall()
	{
		$oModuleModel = getModel('module');
		$oModuleController = getController('module');

		//트리거 삭제
		foreach ($this->triggers as $trigger)
		{
			$oModuleController->deleteTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]);
		}

		return new Object();

	}




	function checkUpdate()
	{
		$oModuleModel = getModel('module');
		foreach ($this->triggers as $trigger)
		{
			if (!$oModuleModel->getTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]))
			{
				return true;
			}
		}

		return false;
	}

	function moduleUpdate()
	{

		$oModuleModel = getModel('module');
		$oModuleController = getController('module');
		foreach ($this->triggers as $trigger)
		{
			if (!$oModuleModel->getTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]))
			{
				$oModuleController->insertTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]);
			}
		}

		return new Object();
	}

	function getDevId($endpoint) {
		return md5($endpoint."20170505");
	}

	function setErrorPage() {
		header("HTTP/1.1 502 Bad Gateway");
	}

}

/* End of file noti.class.php */
/* Location: ./modules/noti/noti.class.php */
