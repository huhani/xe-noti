<?php
/*! Copyright (C) 2017 Moring World. All rights reserved. */
/**
 * @class  notiView
 * @author Huhani (mmia268@gmail.com)
 * @brief  Noti module view class.
 */

class notiView extends noti {

	function init() {
		$noti_config = $this->module_config;


		Context::set('module_config', $noti_config);

/*
		$template_path = sprintf("%sskins/%s/",$this->module_path, $noti_config->design->skin);
		if(!is_dir($template_path) || !$noti_config->design->skin)
		{
			$noti_config->design->skin = 'default';
			$template_path = sprintf("%sskins/%s/",$this->module_path, $noti_config->design->skin);
		}
*/
		$template_path = sprintf("%sskins/default",$this->module_path);

		$this->setTemplatePath($template_path);
	}


	function dispNotiDeviceList() {
		$logged_info =  Context::get('logged_info');
		if(!$logged_info){
			return new Object(-1,'invalid_access');
		}

		$args = new stdClass();
		$args->page = Context::get('page');
		$args->list_count = 20;
		$args->page_count = 10;
		$args->order_type = 'desc';
		$args->member_srl = $logged_info->member_srl;
		$output = executeQueryArray('noti.getNotiRegIDList', $args);

		Context::set('noti', $output->data);
		Context::set('page_navigation', $output->page_navigation);

		$this->setTemplateFile('member_dev');
	}

}


/* End of file noti.view.php */
/* Location: ./modules/noti/noti.view.php */
