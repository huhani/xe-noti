<?php
/*! Copyright (C) 2021 BGM STORAGE. All rights reserved. */
/**
 * @class  notiView
 * @author Huhani (mmia268@gmail.com)
 * @brief  Noti module view class.
 */

class notiView extends noti {

	function init() {
		$noti_config = $this->module_config;
		Context::set('module_config', $noti_config);
		$template_path = sprintf("%sskins/default",$this->module_path);

		$this->setTemplatePath($template_path);
	}


	function dispNotiDeviceList() {

        Context::loadFile(array('./modules/noti/tpl/js/base.js', 'head', '', null), true);

		$this->setTemplateFile('member_dev');
	}

}


/* End of file noti.view.php */
/* Location: ./modules/noti/noti.view.php */
