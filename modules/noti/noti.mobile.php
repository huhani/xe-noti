<?php

class notiMobile extends notiView {
    function init() {
        $path = file_exists($this->module_path . '/m.skins/') ?
            $this->module_path . '/m.skins/' . ($this->module_info->mskin ?: 'default') :
            $this->module_path . '/skins/' . ($this->module_info->skin ?: 'default');

        $this->setTemplatePath($path);
    }
}