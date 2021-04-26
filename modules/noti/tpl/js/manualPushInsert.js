(function($){

    var memberListRequest = null;
    var memberListCahce = [];
    function getMemberList(nick_name, callback) {
        var cache = memberListCahce.find(function(each){
            return each.key === nick_name;
        });
        if(cache) {
            callback(cache.value);
            return;
        }

        if(memberListRequest) {
            memberListRequest.abort();
        }

        var notiClient = NotiClientContainer.getInstance();
        memberListRequest = notiClient.constructor.exec_json('noti.getNotiAdminMemberList', {
            nick_name: nick_name
        });
        memberListRequest.promise.then(function(response) {
            callback(response.data);
            if(memberListCahce.length > 1000) {
                memberListCahce.shift();
            }
            memberListCahce.push({
                key: nick_name,
                value: response.data
            });
        })['catch'](function() {

        });
    }

    $(document).ready(function() {

        function isCurrectContent() {
            if(!$('#manualPush_title').val().trim()) {
                alert("제목 값은 필수입니다");

                return false;
            }

            return true;
        }

        function previewManualPush() {
            var notiClient = NotiClientContainer.getInstance();
            if(!isCurrectContent()) {
                return;
            }

            var push_srl = 0;
            var title = $('#manualPush_title').val().trim();
            var content = $('#manualPush_content').val().trim();
            var actions = [];
            var icon = $('#manualPush_icon').val().trim();
            var image = $('#manualPush_image').val().trim();
            var badge = $('#manualPush_badge').val().trim();
            var target_url = $('#manualPush_target_url').val().trim();
            var requireInteraction = $('input[type=radio][name=require_interaction][value=Y]').prop('checked');
            var renotify = $('input[type=radio][name=renotify][value=Y]').prop('checked');
            var silent = $('input[type=radio][name=silent][value=Y]').prop('checked');
            var $pushGroup = $('#push_group');
            var pushGroupSelectedIndex = $pushGroup.prop('selectedIndex');
            var $option = $pushGroup.find('option').eq(pushGroupSelectedIndex);
            var tag = parseInt($option.val(), 10);
            var maxCount = $option.attr('data-max-count');
            var useCountSummary = $option.attr('data-use-count-summary');
            var countSummaryTemplate = $option.attr('data-count-summary-template');
            var payload = {
                push_srl: push_srl,
                title: title,
                body: content ? content : null,
                actions: actions,
                icon: icon ? icon : null,
                image: image ? image : null,
                badge: badge ? badge : null,
                launchUrl: target_url,
                renotify: renotify,
                silent: silent,
                requireInteraction: requireInteraction,
                tag: tag,
                pushGroup: {
                    max_count: maxCount,
                    use_count_summary: useCountSummary,
                    count_summary_template: countSummaryTemplate
                }
            };

            notiClient.showNotification(payload)['catch'](function(err){
                console.log(payload);
                console.error(err);
                alert('Error: '+ err.name + "\n<BR>" + "Message: "+ err.message);
            });

        }

        function closeAllNotification() {
            var notiClient = NotiClientContainer.getInstance();
            notiClient.closeAllNotification();
        }

        function setPushTypeUI(type) {
            if(type === "private") {
                $('.select-member__container').show();
                $('.push-device-count .count b').html("0");
            } else if(type === "public") {
                $('.select-member__container').hide();
                $('.push-device-count .count b').html($('.push-device-count').attr('data-total-count'));
                memberSelect.clearStore();
                memberSelect.clearInput();
            }
        }

        var memberSelect = new Choices($('.select-member')[0], {
            maxItemCount: -1,
            searchResultLimit: 1000,
            addItems: true,
            removeItemButton:true,
            paste: true,
            duplicateItemsAllowed: false,
            searchChoices: false,
            shouldSort: false,
            shouldSortItems: false,
            callbackOnCreateTemplates: function(template) {
                return {
                    choice: function(classNames, data) {
                        return template(`
          <div class="${classNames.item} ${classNames.itemChoice} ${
                            data.disabled ? classNames.itemDisabled : classNames.itemSelectable
                            }" data-select-text="${this.config.itemSelectText}" data-choice ${
                            data.disabled
                                ? 'data-choice-disabled aria-disabled="true"'
                                : 'data-choice-selectable'
                            } data-id="${data.id}" data-value="${data.value}" ${
                            data.groupId > 0 ? 'role="treeitem"' : 'role="option"'
                            }>
            ${data.label} <span>[${data.customProperties.endpoint_count}]</span>
          </div>
        `)
                    }
                };
            }
        });

        $('.select-member')[0].addEventListener('search', function(evt) {
            var detail = evt.detail;
            var value = detail.value;
            getMemberList(value, function(retObj) {
                var memberList = retObj.data.map(function(each){
                    return {
                        value: each.member_srl,
                        label: each.nick_name,
                        disabled: !each.endpoint_count,
                        customProperties: {
                            endpoint_count: each.endpoint_count
                        }
                    };
                });

                memberSelect.clearChoices();
                memberSelect.setChoices(memberList);
            });
        });

        $('.select-member')[0].addEventListener('change', function(evt) {
            var totalSendCount = memberSelect.getValue().reduce(function(val, current) {
                return val + current.customProperties.endpoint_count;
            }, 0);
            $('.push-device-count .count b').html(totalSendCount);
        });

        $('input[type=radio][name=target_device]').on('focus', function() {
            var $this = $(this);
            var type = $this.val();
            setPushTypeUI(type);
        });

        setPushTypeUI($('input[name=target_device][value=public]').prop('checked') ? 'public' : 'private');
        window.previewManualPush = previewManualPush;
        window.closeAllNotification = closeAllNotification;
    });
})(window.jQuery);
