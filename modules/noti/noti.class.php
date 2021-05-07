<?php
/*! Copyright (C) 2021 BGM STORAGE. All rights reserved. */
/**
 * @class  noti
 * @author Huhani (mmia268@gmail.com)
 * @brief  noti module high class.
 */

class noti extends ModuleObject
{


	private $triggers = array(
		array( 'member.deleteMember',			'noti',	'controller',	'triggerDeleteMember',					'after'	),
        array( 'ncenterlite._insertNotify',			'noti',	'controller',	'triggerNcenterliteInsertNotify',					'after'	),
		array( 'member.doLogin',				'noti',	'controller',	'triggerAfterDoLogin',       			'after'	),
		array( 'member.doLogout',				'noti',	'controller',	'triggerAfterDoLogout',       			'after'	),
		array( 'moduleHandler.init',			'noti',	'controller',	'triggerBeforeModuleInit',				'before'	),
		//array( 'moduleObject.proc',			'noti',	'controller',	'triggerBeforeModuleProc',				'before'	),
		array( 'display',                   'noti', 'controller', 'triggerBeforeDisplay',            'before' )
	);


	function moduleInstall()
	{
		$oModuleModel = getModel('module');
		$oModuleController = getController('module');
		$oNotiController = getController('noti');
		$oNotiController->createNotiMid();

        foreach ($this->triggers as $trigger)
        {
            if (!$oModuleModel->getTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]))
            {
                $oModuleController->insertTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]);
            }
        }

		return new BaseObject();
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

        //페이지 삭제
        $notiInfo = $oModuleModel->getModuleInfoByMid('noti');
        if($notiInfo->module_srl) {
            $output = $oModuleController->deleteModule($notiInfo->module_srl);
            if(!$output->toBool()) {
                return $output;
            }
        }

		return new BaseObject();

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
        $oNotiController = getController('noti');
        $oNotiController->createNotiMid();
		foreach ($this->triggers as $trigger)
		{
			if (!$oModuleModel->getTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]))
			{
				$oModuleController->insertTrigger($trigger[0], $trigger[1], $trigger[2], $trigger[3], $trigger[4]);
			}
		}

		return new BaseObject();
	}

    function setErrorPage() {
        header("HTTP/1.1 502 Bad Gateway");
    }


    // !!!S

    //deprecated
    function getDevId($endpoint) {
        return md5($endpoint."20170505");
    }

    // Rhymix2, XE1 호환용
    function getDBNull() {
	    return defined('RX_VERSION') && version_compare(RX_VERSION, '2.0', '>=') ?
            new Rhymix\Framework\Parsers\DBQuery\NullValue :
            null;
    }

    function getDefault($obj, $key, $defaultValue) {
	    return $obj && isset($obj->{$key}) && $obj->{$key} ? $obj->{$key} : $defaultValue;
    }

    function getUserAgentInfo($user_agent) {
        $user_agent = $user_agent ? $user_agent : $_SERVER["HTTP_USER_AGENT"];
        $ub = 'unknown';
        $platform = 'unknown';

        if(preg_match('/MSIE/i', $user_agent) && !preg_match('/Opera/i', $user_agent)) {
            $ub = "MSIE";
        }
        elseif(preg_match('/Firefox/i', $user_agent)) {
            $ub = "Firefox";
        }
        elseif(preg_match('/Edge?\//i', $user_agent)) {
            $ub = "Edge";
        }
        elseif(preg_match('/Chrome/i', $user_agent)) {
            $ub = "Chrome";
        }
        elseif(preg_match('/Safari/i', $user_agent)) {
            $ub = "Safari";
        }
        elseif(preg_match('/Opera/i', $user_agent)) {
            $ub = "Opera";
        }
        elseif(preg_match('/Netscape/i', $user_agent)) {
            $ub = "Netscape";
        }

        // http://stackoverflow.com/questions/18070154/get-operating-system-info-with-php
        $os_array = array(
            '/windows nt 10/i'	 =>  'Windows 10',
            '/windows nt 6.3/i'	 =>  'Windows 8.1',
            '/windows nt 6.2/i'	 =>  'Windows 8',
            '/windows nt 6.1/i'	 =>  'Windows 7',
            '/windows nt 6.0/i'	 =>  'Windows Vista',
            '/windows nt 5.2/i'	 =>  'Windows Server 2003/XP x64',
            '/windows nt 5.1/i'	 =>  'Windows XP',
            '/windows xp/i'		 =>  'Windows XP',
            '/windows nt 5.0/i'	 =>  'Windows 2000',
            '/windows me/i'		 =>  'Windows ME',
            '/win98/i'			  =>  'Windows 98',
            '/win95/i'			  =>  'Windows 95',
            '/win16/i'			  =>  'Windows 3.11',
            '/macintosh|mac os x/i' =>  'Mac OS X',
            '/mac_powerpc/i'		=>  'Mac OS 9',
            '/linux/i'			  =>  'Linux',
            '/ubuntu/i'			 =>  'Ubuntu',
            '/iphone/i'			 =>  'iPhone',
            '/ipod/i'			   =>  'iPod',
            '/ipad/i'			   =>  'iPad',
            '/android/i'			=>  'Android',
            '/blackberry/i'		 =>  'BlackBerry',
            '/webos/i'			  =>  'Mobile'
        );

        foreach($os_array as $regex => $value) {
            if(preg_match($regex, $user_agent)) {
                $platform = $value;
            }
        }

        $obj = new stdClass();
        $obj->user_agent = cut_str(removeHackTag($_SERVER["HTTP_USER_AGENT"]), 250);
        $obj->browser = $ub;
        $obj->platform = $platform;

        return $obj;
    }

    function getEndpointHash($endpoint) {
        return crc32($endpoint);
    }

    // !!!E

}

/* End of file noti.class.php */
/* Location: ./modules/noti/noti.class.php */
