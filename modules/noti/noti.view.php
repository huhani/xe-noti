<?php
/*! Copyright (C) 2021 BGM STORAGE. All rights reserved. */
/**
 * @class  notiView
 * @author Huhani (mmia268@gmail.com)
 * @brief  Noti module view class.
 */

class notiView extends noti {

	function init() {

        $oModuleModel = getModel('module');
        $notiInfo = $oModuleModel->getModuleInfoByMid('noti');
        $this->module_info = $notiInfo;

        $template_path = sprintf("%sskins/%s/", $this->module_path, $this->module_info->skin);
        $this->module_info->layout_srl = $this->module_info->layout_srl;
        if(!is_dir($template_path)||!$this->module_info->skin) {
            $this->module_info->skin = 'default';
            $template_path = sprintf("%sskins/%s/",$this->module_path, $this->module_info->skin);
        }
        $this->setTemplatePath($template_path);
	}


	function dispNotiEndpointSubscribe() {
        $isHTTPS = false;
        if(array_key_exists('HTTP_X_FORWARDED_PROTO', $_SERVER) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === "https") {
            $isHTTPS = true;
        }
        if(isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === "on") {
            $isHTTPS = true;
        }
        if(!$isHTTPS) {
            return new BaseObject(-1, "HTTPS 환경에서만 알림 사용이 가능합니다.");
        }

        $oNotiModel = getModel('noti');
        $notiConfig = $oNotiModel->getConfig();
        Context::set('notiConfig', $notiConfig);

		$this->setTemplateFile('endpointSubscribe');
	}

	function dispNotiEndpointDebug() {

	    $oNotiModel = getModel('noti');
	    $notiConfig = $oNotiModel->getConfig();

	    Context::set('notiConfig', $notiConfig);
	    Context::set('serverID', $oNotiModel->getServerID());
	    Context::set('isConfigFulfilled', $oNotiModel->isConfigFulfilled());


        $this->setTemplateFile('endpointDebug');
    }

}


/* End of file noti.view.php */
/* Location: ./modules/noti/noti.view.php */
