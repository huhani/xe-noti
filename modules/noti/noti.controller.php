<?php
/*! Copyright (C) 2017 Moring World. All rights reserved. */
/**
 * @class notiController
 * @author Huhani (mmia268@gmail.com)
 * @brief noti module controller class.
 */

class notiController extends noti
{
	function init(){
	}

	function triggerDeleteMember($obj) {
		$member_srl = $obj->member_srl;
		if($member_srl) {
			$this->deleteNotiAllInfoByMemberSrl($member_srl);
		}

		return new Object();
	}

	function triggerAfterDoLogin($obj) {
		if(!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] == 'off') {
			return new Object();
		}

		$oNotiModel = getModel('noti');
		$module_config = $oNotiModel->getConfig();
		$use_auto_login_noti = $module_config->auto_login;

		if($module_config->use !== "Y") {
			return new Object();
		}

		if($module_config->login_readed === "Y") {
			$member_srl = $obj->member_srl;
			$this->setNotiReadedByMemberSrl($member_srl);
		}

		if(isset($obj->member_srl) && $obj->member_srl > 0) {
			$keep_signed = Context::get('keep_signed');
			if($keep_signed === "Y" && $use_auto_login_noti === "Y") {
				$_SESSION['__noti__']['keep_signed'] = TRUE;
			}
		}

		return new Object();
	}

	function triggerAfterInsertComment($obj) {

		$oNotiModel = getModel('noti');
		$module_config = $oNotiModel->getConfig();

		$logged_info = Context::get('logged_info');
		$ipaddr = $_SERVER['REMOTE_ADDR'];

		$document_srl = $obj->document_srl;
		$comment_srl = $obj->comment_srl;
		$member_srl = $obj->member_srl;
		$nick_name = $obj->nick_name;
		$parent_srl = $obj->parent_srl;
		$mid = $obj->mid;

		$oDocumentModel = getModel('document');
		$oDocument = $oDocumentModel->getDocument($document_srl);
		$doc_member_srl = $oDocument->get('member_srl');
		$doc_ipaddr = $oDocument->get('ipaddress'); // <- 비회원일 경우를 대비

		if($module_config->use !== "Y") {
			return new Object();
		}

		if($doc_member_srl < -1) { // 익명게시판 사용시
			return new Object();
		}

		$reg_info_google = array();
		$reg_info_mozilla = array();
		if( !($parent_srl || ($member_srl && $member_srl == $doc_member_srl) || (!$member_srl && $ipaddr == $doc_ipaddr)) ) {
			// 게시글 작성자에게 알림 발송
			$output = $this->setNotiByCommentInfo($doc_member_srl, $obj); // 받는 사람 회원번호, 댓글 오브젝트.
			if($output) {
				$aRegInfo = $oNotiModel->getNotiRegInfoToPost($doc_member_srl);
				if($aRegInfo) {
					$this->setNotiRegInfoRead($doc_member_srl);
					foreach($aRegInfo as $RegInfo) {
						$obj = new stdClass();
						$obj->reg_srl = $RegInfo->reg_srl;
						$obj->reg_id = $RegInfo->reg_id;
						$obj->member_srl = $RegInfo->member_srl;
						if($RegInfo->browser == 'Chrome') {
							$reg_info_google[] = $obj;
						} else if($RegInfo->browser == 'Firefox') {
							$reg_info_mozilla[] = $obj;
						}
					}
				}
			}
		}

		if($parent_srl) {
			$oCommentModel = getModel('comment');
			$oComment = $oCommentModel->getComment($obj->parent_srl);
			$p_member_srl = $oComment->get('member_srl');
			$p_ipaddr = $oComment->get('ipaddress');

			if($p_member_srl < 0) {
				return new Object();
			}

			if( !(($member_srl && $member_srl == $p_member_srl) || (!$member_srl && $ipaddr == $p_ipaddr)) ) {
				// 부모 댓글 작성자에게 알림 발송
				$output = $this->setNotiByCommentInfo($p_member_srl, $obj);
				if($output) {
					$aRegInfo = $oNotiModel->getNotiRegInfoToPost($p_member_srl);
					if(!empty($aRegInfo)) {
						$this->setNotiRegInfoRead($p_member_srl);
						foreach($aRegInfo as $RegInfo) {

							$obj = new stdClass();
							$obj->reg_srl = $RegInfo->reg_srl;
							$obj->reg_id = $RegInfo->reg_id;
							$obj->member_srl = $RegInfo->member_srl;
							if($RegInfo->browser == 'Chrome') {
								$reg_info_google[] = $obj;
							} else if($RegInfo->browser == 'Firefox') {
								$reg_info_mozilla[] = $obj;
							}

						}
					}
				}
			}
		}


		if(!empty($reg_info_google)) {
			$this->pushNotificationToGoogle($reg_info_google);
		}

		if(!empty($reg_info_mozilla)) {
			//$this->pushNotificationToMozilla($reg_info_mozilla);
		}

		return new Object();
	}

	function setNotiByCommentInfo($member_srl = false, $oComment = false) {
		if(!$member_srl || !$oComment) {
			return false;
		}

		$oNotiModel = getModel('noti');
		if(!$this->module_config) {
			$module_config = $this->module_config = $oNotiModel->getConfig();
		} else {
			$module_config = $this->module_config;
		}

		$date = date("YmdHis");
		$ipaddress = $_SERVER['REMOTE_ADDR'];

		$oNotiInfo = $oNotiModel->getNotiInfoByMemberSrl($member_srl);
		if(!$oNotiInfo) {
			return false;
		}

		$accu_count = $oNotiInfo->accu_count;
		$is_readed = $oNotiInfo->is_readed;
		$content = $oComment->content;
		$content_summary = '#'.$oComment->nick_name.' '. htmlspecialchars(cut_str($content, 20));
		if($is_readed != 'Y' && $accu_count > 0) {
			$content_summary .= "\n+ 새 알림 " . $accu_count . "개";
			$accu_count++;
		} else {
			$accu_count = 1;
		}

		$args = new stdClass();
		$args->member_srl = $member_srl;
		$args->module_srl = $oComment->module_srl;
		$args->type = 'comment';
		$args->target_member_srl = $oComment->member_srl;
		$args->target_nick_name = $oComment->nick_name;
		$args->target_profile_image = $this->_getProfileImage($oComment->member_srl);
		$args->content_summary = $content_summary;
		$args->target_url = '/index.php?mid='. $oComment->mid .'&document_srl=' . $oComment->document_srl . '&cpage_detect=1&comment_srl='. $oComment->comment_srl .'#comment_' . $oComment->comment_srl;
		$args->is_readed = "N";
		$args->accu_count = $accu_count;
		$args->last_update = $date;

		$output = executeQuery('noti.updateNotiInfo', $args);

		return true;
	}

	function triggerAfterUpdateComment($obj) {


	}

	function triggerBeforeDisplay(&$output) {
		$oNotiModel = getModel('noti');
		$module_config = $oNotiModel->getConfig();
		if($module_config->use !== "Y") {
			return new Object();
		}

		if (Context::getResponseMethod() == 'HTML') {
			Context::addHtmlHeader('<link rel="manifest" href="/manifest.json">');
			Context::loadFile($this->module_path . 'tpl/js/noti.js', 'body');

			$logged_info = Context::get('logged_info');
			if($logged_info) {
				if($_SESSION['__noti__']['keep_signed']) {
					Context::loadFile($this->module_path . 'tpl/js/login.js', 'body');
					unset($_SESSION['__noti__']['keep_signed']);
				}
			}

			$_noti = $_COOKIE['_noti'];
			$noti_status = FALSE;
			if($_noti) {
				preg_match('/^(\d+).(\w{32})$/', $_noti, $matches);
				$reg_srl = (int)$matches[1];
				$dev_id = $matches[2];

				$oRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl);
				if($oRegInfo && $oRegInfo->dev_id === $dev_id) {
					$noti_status = TRUE;
				}
			}

			Context::set('noti_status', $noti_status);

			$oTemplate = TemplateHandler::getInstance();
			$plugin_path = $this->module_path . 'tpl';
			$compile = $oTemplate->compile($plugin_path, 'templateConfig');
			$output .= $compile;
		}

		return new Object();
	}

	function triggerBeforeModuleInit($obj) {
		if(!Context::get('is_logged')){
			return new Object();
		}

		$oNotiModel = getModel('noti');
		$module_config = $oNotiModel->getConfig();

		if($module_config->show_member_menu === "Y"){
			Context::loadLang('./modules/noti/lang/lang.xml');

			$oMemberController = getController('member');
			$oMemberController->addMemberMenu('dispNotiDeviceList', 'cmd_noti_config');
		}

		return new Object();
	}

	function procNotiDeviceInsert() {
		$logged_info = Context::get('logged_info');
		$endpoint = Context::get('endpoint');
		if(!$logged_info || !$endpoint) {
			return new Object(-1, 'msg_invalid_request');
		}

		$oNotiModel = getModel('noti');
		if(!$this->module_config) {
			$module_config = $oNotiModel->getConfig();
		} else {
			$module_config = $this->module_config;
		}

		$member_srl = $logged_info->member_srl;
		$regInfoCount = $oNotiModel->getNotiRegInfoCount($member_srl);
		$devLimit = $module_config->max_reg_device_count;
		if($devLimit > 0 && $regInfoCount >= $devLimit) {
			$this->add('status', "EXCEED_DEVICE_COUNT");
			return;
		}

		$dev_id = $this->getDevId($endpoint);

		$oRegInfo = $oNotiModel->getNotiRegInfoByDevId($dev_id, $member_srl);
		$date = date("YmdHis");
		$ipaddress = $_SERVER['REMOTE_ADDR'];

		$oNotiInfo = $oNotiModel->getNotiInfoByMemberSrl($member_srl);
		$noti_srl = $oNotiInfo ? $oNotiInfo->noti_srl : 0;
		if(!is_array($oRegInfo) && $oRegInfo->member_srl != $member_srl && $oRegInfo->dev_id == $dev_id) {
			$this->add('status', "ALREADY_EXIST");
			return;
		}

		if(!$oNotiInfo) {
			$output = $this->_createNotiInfo($member_srl);
			if(!$output) {
				return new Object(-1, 'msg_invalid_request');
			}
			$noti_srl = $output;
		} else {
			$accu_count = $oNotiInfo->accu_count;
			$is_readed = $oNotiInfo->is_readed;
			$content_summary = $module_config->init_content_summary;
			if($is_readed != 'Y' && $accu_count > 0) {
				$content_summary .= "\n+ 새 알림 " . $accu_count . "개";
				$accu_count++;
			} else {
				$accu_count = 1;
			}

			$args = new stdClass();
			$args->noti_srl = $noti_srl;
			$args->ipaddress = $ipaddress;
			$args->type = 'newDevice';
			$args->target_nick_name = $module_config->init_target_nick_name;
			$args->target_profile_image = $module_config->init_target_profile_image;
			$args->content_summary = $module_config->init_content_summary;
			$args->target_url = $module_config->init_target_url;
			$args->accu_count = $accu_count;
			$args->last_update = $date;

			$output = executeQuery('noti.updateNotiInfo', $args);
		}

		$browserInfo = $this->_getUserAgentInfo();
		$args = new stdClass();
		$args->ipaddress = $ipaddress;
		$args->user_agent = $browserInfo->user_agent;
		$args->browser = $browserInfo->browser;
		$args->platform = $browserInfo->platform;
		$args->dev_id = $dev_id;
		$args->reg_id = $endpoint;
		$args->is_clicked = "N";		
		$args->is_recv = "N";
		$args->last_post = $date;

		if($oRegInfo) {
			$regInfo = current($oRegInfo);
			$args->reg_srl = $regInfo->reg_srl;

			executeQuery('noti.updateNotiRegInfo', $args);
		} else {
			$args->reg_srl = getNextSequence();
			$args->noti_srl = $noti_srl;
			$args->member_srl = $member_srl;
			$args->regdate = $date;

			executeQuery('noti.insertNotiRegInfo', $args);
		}

		$this->postNotificationByMemberSrl($member_srl, array($args->reg_srl));
		$this->add('status', "SUCCESS");
		$this->add('reg_srl', $args->reg_srl);
		$this->add('dev_id', $dev_id);

		return true;
	}

	function procNotiNewDevicePost() {
		$endpoint = Context::get('endpoint');
		$reg_srl = Context::get('reg_srl');
		if(!$endpoint || !$reg_srl) {
			return new Object(-1, 'msg_invalid_request');
		}

		$dev_id = $this->getDevId($endpoint);
		$oNotiModel = getModel('noti');
		$oRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl);
		if(!$oRegInfo ||
			$oRegInfo->dev_id !== $dev_id ||
			$oRegInfo->is_recv === 'Y'
		) {
			return new Object(-1, 'msg_invalid_request');
		}

		$this->setNotiRegInfoReadByRegSrl($reg_srl);
		$this->postNotificationByRegSrl($reg_srl);
	}

	function procNotiDeviceDelete() {
		$oNotiModel = getModel('noti');
		$endpoint = Context::get('endpoint');
		$dev_id = Context::get('dev_id');
		$reg_srl = Context::get('reg_srl');
		if(!($endpoint || $dev_id) || !$reg_srl) {
			return new Object(-1, 'msg_invalid_request');
		}


		$oRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl);
		$dev_id = $endpoint ? $this->getDevId($endpoint) : $dev_id;
		if(!$oRegInfo || ($oRegInfo && $oRegInfo->dev_id !== $dev_id)) {
			$this->add('status', 'NOT_EXIST');
			return new Object();
		}

		$this->deleteNotiRegInfoByRegSrl($reg_srl);

		$member_srl = $oRegInfo->member_srl;
		$member_dev_count = $oNotiModel->getNotiRegInfoCount($member_srl);
		if(!$member_dev_count) {
			$this->deleteNotiInfoByMemberSrl($member_srl);
		}

		$this->add('status', 'SUCCESS');
	}

	function procNotiRegInfoDeleteAll() {
		$logged_info = Context::get('logged_info');
		if(!$logged_info) {
			return new Object(-1, 'msg_invalid_request');
		}

		$member_srl = $logged_info->member_srl;
		$this->deleteNotiAllInfoByMemberSrl($member_srl);
	}

	function procNotiRegInfoDelete() {
		$reg_srl = Context::get('reg_srl');
		$logged_info = Context::get('logged_info');
		if(!$logged_info || !$reg_srl) {
			return new Object(-1, 'msg_invalid_request');
		}

		$oNotiModel = getModel('noti');
		$member_srl = $logged_info->member_srl;
		$oRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl, $member_srl);
		if(!$oRegInfo) {
			return new Object(-1, 'msg_invalid_request');
		}

		$this->deleteNotiRegInfoByRegSrl($oRegInfo->reg_srl);
		$member_dev_count = $oNotiModel->getNotiRegInfoCount($member_srl);
		if(!$member_dev_count) {
			$this->deleteNotiInfoByMemberSrl($member_srl);
		}
	}

	function procNotiClickNotification() {
		$endpoint = Context::get('endpoint');
		$reg_srl = Context::get('reg_srl');
		if(!$endpoint || !$reg_srl) {
			//$this->setErrorPage();
			exit();
		}

		$oNotiModel = getModel('noti');
		$dev_id = $this->getDevId($endpoint);
		$oRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl);
		if(!$oRegInfo || $oRegInfo->dev_id !== $dev_id) {
			$this->setErrorPage();
			exit();
		}

		$date = date("YmdHis");

		$args = new stdClass();
		$args->reg_srl = $oRegInfo->reg_srl;
		$args->is_clicked = "Y";
		$args->click_count = $oRegInfo->click_count+1;
		$args->last_click = $date;
		$output = executeQuery('noti.setNotiRegInfoClick', $args);

		exit();
	}

	function postNotificationByRegSrl($reg_srl = 0) {
		$oNotiModel = getModel('noti');
		$reg_info_google = array();
		$reg_info_mozilla = array();

		$oNotiModel = getModel('noti');
		if(is_array($reg_srl)) {
			foreach($reg_srl as $val) {
				$oRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($val);
					$obj = new stdClass();
					$obj->reg_srl = $oRegInfo->reg_srl;
					$obj->reg_id = $oRegInfo->reg_id;
					$obj->member_srl = $oRegInfo->member_srl;
					if($oRegInfo->browser == 'Chrome') {
						$reg_info_google[] = $obj;
					} else if($RegInfo->browser == 'Firefox') {
						$oreg_info_mozilla[] = $obj;
					}
			}
		} else {
			$oRegInfo = $oNotiModel->getNotiRegInfoByRegSrl($reg_srl);

			$obj = new stdClass();
			$obj->reg_srl = $oRegInfo->reg_srl;
			$obj->reg_id = $oRegInfo->reg_id;
			$obj->member_srl = $oRegInfo->member_srl;
			if($oRegInfo->browser == 'Chrome') {
				$reg_info_google[] = $obj;
			} else if($oRegInfo->browser == 'Firefox') {
				$reg_info_mozilla[] = $obj;
			}
		}

		if(count($reg_info_google)) {
			$this->pushNotificationToGoogle($reg_info_google, json_encode($obj));
		}
		if(count($reg_info_mozilla)) {
			//$this->pushNotificationToMozilla($reg_info_mozilla, json_encode($obj));
		}

		return true;
	}

	function postNotificationByMemberSrl($member_srl = 0, $reg_srls = array()) {// target member_srl, skip reg_srls
		$oNotiModel = getModel('noti');
		$reg_info_google = array();
		$reg_info_mozilla = array();

		if(is_array($member_srl)) {
			foreach($member_srl as $val) {
				$oNotiInfo = $oNotiModel->getNotiInfoByMemberSrl($member_srl);
				$aRegInfo = $oNotiModel->getNotiRegInfoByDevId(null, $member_srl);

				foreach($aRegInfo as $RegInfo) {
					if(in_array($RegInfo->reg_srl, $reg_srls)) {
						continue;
					}

					$obj = new stdClass();
					$obj->reg_srl = $RegInfo->reg_srl;
					$obj->reg_id = $RegInfo->reg_id;
					$obj->member_srl = $RegInfo->member_srl;
					if($RegInfo->browser == 'Chrome') {
						$reg_srl_google[] = $obj;
					} else if($RegInfo->browser == 'Firefox') {
						$reg_srl_mozilla[] = $obj;
					}
				}
			}
		} else {
			$oNotiInfo = $oNotiModel->getNotiInfoByMemberSrl($member_srl);
			$aRegInfo = $oNotiModel->getNotiRegInfoToPost($member_srl);

			foreach($aRegInfo as $RegInfo) {
				if(in_array($RegInfo->reg_srl, $reg_srls)) {
					continue;
				}

				$obj = new stdClass();
				$obj->reg_srl = $RegInfo->reg_srl;
				$obj->reg_id = $RegInfo->reg_id;
				$obj->member_srl = $RegInfo->member_srl;
				if($RegInfo->browser == 'Chrome') {
					$reg_info_google[] = $obj;
				} else if($RegInfo->browser == 'Firefox') {
					$reg_info_mozilla[] = $obj;
				}
			}
		}

		$obj = new stdClass();
		$obj->type = $oNotiInfo->type;
		$obj->content_summary = $oNotiInfo->content_summary;
		$obj->target_url = $oNotiInfo->target_url;
		$obj->target_nick_name = $oNotiInfo->target_nick_name;
		$obj->is_readed = $oNotiInfo->is_readed;

		$this->setNotiRegInfoRead($member_srl);
		if(count($reg_info_google)) {
			$this->pushNotificationToGoogle($reg_info_google, json_encode($obj));
		}
		if(count($reg_info_mozilla)) {
			//$this->pushNotificationToMozilla($reg_info_mozilla, json_encode($obj));
		}
	}

	//GCM
	function pushNotificationToGoogle($reg_info, $data = null) {
		// reg_id[] , data(json)
		//나중에 $data는 payload 구현시 사용.
		// 근데 삼성브라우저 4와 같은 크로미움 구버전에선 payload를 지원하지 않는다.

		$oNotiModel = getModel('noti');
		if($this->module_config) {
			$module_config = $this->module_config;
		} else {
			$module_config = $this->module_config = $oNotiModel->getConfig();
		}

		$API_KEY = $module_config->fcm_key;
		$priority = $module_config->fcm_msg_priority;
		$exptime = (int)$module_config->fcm_msg_exptime;

		$reg_ids = array();
		foreach($reg_info as $value) {
			$reg_ids[] = $value->reg_id;
		}

		$url = 'https://android.googleapis.com/gcm/send';
		$header = array('Authorization: key='.$API_KEY, 'Content-Type: application/json');
		$data = array('registration_ids' => $reg_ids, 'priority' => $priority, 'time_to_live' => $exptime);

		$curl = curl_init();
		curl_setopt($curl, CURLOPT_URL, $url);
		curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, FALSE);
		curl_setopt($curl, CURLOPT_POST, TRUE);
		curl_setopt($curl, CURLOPT_HTTPHEADER, $header);
		curl_setopt($curl, CURLOPT_RETURNTRANSFER, TRUE);
		curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));	

		$output = curl_exec($curl);
		$result = json_decode($output);
		if($result) {
			foreach($result->results as $key=>$value) {
				$member_srl = $reg_info[$key]->member_srl;
				$reg_srl = $reg_info[$key]->reg_srl;

				if(isset($value->message_id) && isset($value->registration_id)) {
//!!!S
					debugPrint('changed endpoint!!');
					debugPrint($output);
//!!!E
					$this->updateRegId($reg_srl, $value->registration_id);
					continue;
				}

				if(isset($value->error)) {
					$error = $value->error;
//!!!S
					debugPrint('catch error!!');
					debugPrint($output);
//!!!E
					if($error == 'NotRegistered') {
						$this->deleteNotiRegInfoByRegSrl($reg_srl);
						$member_dev_count = $oNotiModel->getNotiRegInfoCount($member_srl);
						if(!$member_dev_count) {
							$this->deleteNotiInfoByMemberSrl($member_srl);
						}
					}
				}
			}
		}
		curl_close($curl);

		return true;
	}

	//VAPID
	function pushNotificationToMozilla($reg_id, $data = null) {

		$count = count($reg_id);
		if(!$count) {
			return false;
		}

		$url = 'https://updates.push.services.mozilla.com/wpush/v1/';
		$multi_handler = curl_multi_init();

		$chs = array();
		for($i=0; $i<$count; $i++) {
			$chs[$i] = curl_init();
			curl_setopt($chs[$i], CURLOPT_URL, $url . $reg_id[$i]);
			curl_setopt($chs[$i], CURLOPT_SSL_VERIFYPEER, FALSE);
			curl_setopt($chs[$i], CURLOPT_POST, TRUE);
			curl_setopt($chs[$i], CURLOPT_HTTPHEADER, array("TTL: 60") );
			curl_setopt($chs[$i], CURLOPT_RETURNTRANSFER, TRUE);
			curl_setopt($chs[$i], CURLOPT_POSTFIELDS, json_encode());	
			curl_multi_add_handle($multi_handler, $chs[$i]);
		}

		do {
			curl_multi_exec($multi_handler, $running);
			curl_multi_select($multi_handler);
		} while ($running > 0);

		for ($i=0; $i<$count; $i++){
			curl_multi_remove_handle($multi_handler, $chs[$i]);
		}

		curl_multi_close($multi_handler);

		return true;
	}


	function _createNotiInfo($member_srl = 0, $obj = false) {

		if(!$member_srl && !$obj) {
			$logged_info = Context::get('logged_info');
			if(!$logged_info) {
				return false;
			}
			$member_srl = $logged_info->member_srl;
		}

		if(!$this->module_config) {
			$oNotiModel = getModel('noti');
			$module_config = $oNotiModel->getConfig();
		} else {
			$module_config = $this->module_config;
		}

		$sequence = getNextSequence();
		$date = date("YmdHis");
		if(gettype($obj) == 'object') {
			if(!isset($obj->noti_srl, $obj->member_srl, $obj->ipaddress, $obj->type, $obj->content_summary, $obj->target_url, $obj->last_update, $obj->regdate)) {
				return false;
			}

			executeQuery('noti.insertNotiInfo', $obj);
		} else {
			$args = new stdClass();
			$args->noti_srl = $sequence;
			$args->member_srl = $member_srl;
			$args->ipaddress = $_SERVER['REMOTE_ADDR'];
			$args->type = 'newDevice';
			$args->target_nick_name = $module_config->init_target_nick_name;
			$args->target_profile_image = $module_config->init_target_profile_image;
			$args->content_summary = $module_config->init_content_summary;
			$args->target_url = $module_config->init_target_url;
			$args->last_update = $date;
			$args->regdate = $date;
			$output = executeQuery('noti.insertNotiInfo', $args);
			//debugPrint($args);
		}

		return $sequence;
	}

	function updateRegId($reg_srl, $endpoint) {
		if(!$reg_srl || !$endpoint) {
			return false;
		}

		$dev_id = $this->getDevId($endpoint);
		$args = new stdClass();
		$args->reg_srl = $reg_srl;
		$args->reg_id = $endpoint;
		$args->dev_id = $dev_id;
		$output = executeQuery('noti.updateNotiRegId', $args);

		return true;
	}

	function setNotiRegInfoRead($member_srl, $is_recv = "N", $is_clicked = "N") {
		$module_config = $this->module_config;

		$args = new stdClass();
		$args->member_srl = $member_srl;
		$args->is_recv = $is_recv;
		$args->is_clicked = $is_clicked;
		$args->c_last_post = date("YmdHis");
		$args->last_post = date("YmdHis", mktime(date('H'), date('i'), date('s')-(int)($module_config->fcm_msg_exptime), date('m'), date('d'), date('Y')));
		$output = executeQuery('noti.setNotiRegInfoNotRecvByMemberSrl', $args);

		return true;
	}

	function setNotiRegInfoReadByRegSrl($reg_srl, $is_recv = "N", $is_clicked = "N") {
		$args = new stdClass();
		$args->reg_srl = $reg_srl;
		$args->is_recv = $is_recv;
		$args->is_clicked = $is_clicked;
		$args->last_post = date("YmdHis");
		$output = executeQuery('noti.setNotiRegInfoNotRecvByRegSrl', $args);

		return true;
	}

	function setNotiReaded($noti_srl = 0, $reg_srl = 0) {
		if(!$noti_srl) {
			return false;
		}

		$date = date("YmdHis");

		$args = new stdClass();
		$args->noti_srl = $noti_srl;
		$args->is_readed = "Y";
		$args->readdate = $date;
		$output = executeQuery('noti.setNotiInfoReaded', $args);

		if($reg_srl) {
			$args1 = new stdClass();
			$args1->reg_srl = $reg_srl;
			$args1->is_recv = "Y";
			$args1->recv_date = $date;
			$output = executeQuery('noti.setNotiRegInfoRecv', $args1);
		}

		return true;
	}

	function setNotiReadedByMemberSrl($member_srl = 0) {
		if(!$member_srl) {
			return false;
		}

		$date = date("YmdHis");

		$args = new stdClass();
		$args->member_srl = $member_srl;
		$args->is_readed = "Y";
		$args->readdate = $date;
		$output = executeQuery('noti.setNotiInfoReaded', $args);

		return true;
	}

	function deleteNotiAllInfoByMemberSrl($member_srl = 0) {
		$this->deleteNotiInfoByMemberSrl($member_srl);
		$this->deleteNotiRegInfoByMemberSrl($member_srl);

		return true;
	}

	function deleteNotiInfoByMemberSrl($member_srl = 0) {
		if(!$member_srl) {
			return false;
		}

		$args = new stdClass();
		$args->member_srl = $member_srl;
		$output = executeQuery('noti.deleteNotiInfoByMemberSrl', $args);
		return true;
	}

	function deleteNotiRegInfoByMemberSrl($member_srl = 0) {
		$args = new stdClass();
		$args->member_srl = $member_srl;
		$output = executeQuery('noti.deleteNotiRegInfoByMemberSrl', $args);
		return true;
	}

	function deleteNotiRegInfoByRegSrl($reg_srl = 0) {
		if(!$reg_srl) {
			return false;
		}

		$args = new stdClass();
		$args->reg_srl = $reg_srl;
		$output = executeQuery('noti.deleteNotiRegInfo', $args);

		return true;
	}


	function _getProfileImage($member_srl) {
		if(!$this->module_config) {
			$oNotiModel = getModel('noti');
			$module_config = $this->module_config = $oNotiModel->getConfig();
		} else {
			$module_config = $this->module_config;
		}

		$oMemberModel = getModel('member');
		$profileImage = $oMemberModel->getProfileImage($member_srl);

		$profile_filename = explode('?',$profileImage->src);
		return !$profileImage->src ? $module_config->init_target_profile_image : $profile_filename[0];
	}

	function _getUserAgentInfo() {
		$user_agent = $_SERVER["HTTP_USER_AGENT"];
		$ub = 'unknown';
		$platform = 'unknown';

		if(preg_match('/MSIE/i', $user_agent) && !preg_match('/Opera/i', $user_agent)) { 
			$ub = "MSIE"; 
		} 
		elseif(preg_match('/Firefox/i', $user_agent)) { 
			$ub = "Firefox"; 
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

}

/* End of file noti.controller.php */
/* Location: ./modules/noti/noti.controller.php */
