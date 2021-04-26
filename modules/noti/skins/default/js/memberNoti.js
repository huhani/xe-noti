(function() {

    var always = function(promise) {
        return new Promise(function(resolve) {
            promise.then(function(data){
                resolve(data);
            })['catch'](function(e){
                resolve(e);
            });
        });
    };

    var getDate = function(timestamp) {
        var date_ob = new Date(timestamp);
        var date = ("0" + date_ob.getDate()).slice(-2);
        var month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
        var year = date_ob.getFullYear();
        var h = ("0" + date_ob.getHours()).slice(-2);
        var m = ("0" + date_ob.getMinutes()).slice(-2);
        var s = ("0" + date_ob.getSeconds()).slice(-2);

        return year + '-' + month + "-" + date + " " + h + ':' + m + ':'+ s;
    };

    window.jQuery(document).ready(function($){

        function getPushLogTable(totalCount, data) {
            var html = ['<table class="noti-list">'];
            html.push('<caption>Total: '+(totalCount || 0)+'</caption>' +
                '<thead>' +
                '<th scope="col" class="nowr">종류</th>' +
                '<th scope="col">내용</th>' +
                '<th scope="col">알림 확인</th>' +
                '<th scope="col">날짜</th>' +
                '<th scope="col">삭제</th>' +
                '</thead>' +
                '<tbody>');

            data.forEach(function(each) {
                if(each.payload) {
                    html.push('<tr data-src="'+each.pushSrl+'">');
                    html.push('<td>'+(each.payload.type ? each.payload.type.text : "-")+'</td>');
                    html.push('<td><a class="launchLink" href="'+(each.payload.launchUrl ? each.payload.launchUrl : 'javascript:;')+'">' + (each.payload.body ?  each.payload.body.substr(0, 40) + (each.payload.body.length > 40 ? "..." : "") : "-") + '</a></td>' );
                    html.push('<td>' + (each.clicked ? "확인" : "확인 안 함") + '</td>');
                    html.push('<td>' + getDate(each.timestamp) + '</td>');
                    html.push('<td><a href="javascript:;" class="removePushLog">삭제</a></td>');
                    html.push('</tr>');
                }
            });

            html.push('</tbody></table>')

            return html.join('');
        }

        function getPushLogPagination(currentPage, lastPage, count) {
            var html = ['<div class="noti-pagination"><ul>'];
            if(currentPage === void 0) {
                currentPage = 1;
            }
            if(lastPage === void 0) {
                lastPage = 1;
            }
            if(count === void 0) {
                count = 10;
            }

            count = Math.max(0, count-1);
            var currentPage = Math.max(1, Math.min(currentPage, lastPage));
            var leftMargin = currentPage > Math.ceil(count / 2) ? Math.ceil(count / 2) : currentPage - 1;
            var rightMargin = Math.max(1, Math.min(lastPage - currentPage, Math.floor(count / 2)));
            var startPage = Math.max(1, currentPage - leftMargin - (Math.floor(count / 2) - rightMargin));
            var endPage = Math.min(lastPage, currentPage + rightMargin + (Math.ceil(count / 2) - leftMargin));

            html.push('<li><a href="javascript:;" class="first direction" data-page="1">« 첫 페이지</a></li>');
            for(var i=startPage; i<=endPage; i++) {
                html.push('<li'+(i === currentPage ? ' class="active"' : '')+'><a href="javascript:;" data-page="'+i+'">'+i+'</a></li>');
            }
            html.push('<li><a href="javascript:;" class="last direction" data-page="'+lastPage+'">끝 페이지 »</a></li>');
            html.push("</ul></div>");

            return html.join('');
        }

        var MemberNoti = new ((function() {
            function MemberNoti(config) {
                if(config === void 0) {
                    config = {};
                }

                this._inProgress = false;
                this._$table = config.$table;
                this._$toggleButton = config.$toggleButton;
                this._client = NotiClientContainer.getInstance();
                this._store = NotiStoreContainer.getInstance();
                this._onPaginationClickHandler = this._onPaginationClick.bind(this);
                this._onPushLogClickHandler = this._onPushLogClick.bind(this);
                this._onPushLogRemoveClickHandler = this._onPushLogRemoveClick.bind(this);
                this._onPushEnableButtonChangeHandler = this._onPushEnableButtonChange.bind(this);
                this._onPushEnableButtonClickHandler = this._onPushEnableButtonClick.bind(this);
                this._init();
            }

            MemberNoti.prototype._onPaginationClick = function(evt) {
                var $target = $(evt.target);
                var page = parseInt($target.attr('data-page'), 10);
                if(isNaN(page)) {
                    page = 1;
                }
                this.updatePushLogTable(page);
            };

            MemberNoti.prototype._onPushLogClick = function(evt) {
                var that = this;
                var $target = $(evt.target);
                var $tr = $target.parents('tr[data-src]');
                var pushSrl = parseInt($tr.attr('data-src'), 10);
                var page = parseInt($target.attr('data-page'), 10);
                if(isNaN(page)) {
                    page = 1;
                }
                if(!isNaN(pushSrl)) {
                    this._client.setPushClick(pushSrl).then(function(){
                        that.updatePushLogTable(page);
                    });
                }
            };

            MemberNoti.prototype._onPushLogRemoveClick = function(evt) {
                var that = this;
                var $target = $(evt.target);
                var page = parseInt(this._$table.find('.noti-pagination .active a').attr('data-page'), 10);
                var pushSrl = parseInt($target.parents('tr[data-src]').attr('data-src'), 10);
                if(isNaN(page)) {
                    page = 1;
                }
                if(!isNaN(pushSrl)) {
                    this._store.deletePushLog(pushSrl).then(function() {
                        return that.updatePushLogTable(page);
                    });
                }
            };

            MemberNoti.prototype._onPushEnableButtonChange = function(evt) {
                var that = this;
                var $target = $(evt.target);
                var enabled = $target.prop('checked');
                var promise = enabled ? this._client.subscribe() : always(this._client.closeAllNotification()).then(function() {
                    return that._client.unsubscribe();
                });
                this._inProgress = true;
                Promise.all([promise, this._store.set('enablePush', enabled)]).then(function() {
                    return that._client.isSubscribed(true);
                }).then(function(result) {
                    that._$toggleButton.prop('checked', result);
                })['catch'](function(err){
                    console.error(err);
                    that._$toggleButton.prop('checked', false);
                }).then(function() {
                    that._inProgress = false;
                });
            };

            MemberNoti.prototype._onPushEnableButtonClick = function(evt) {
                if(this._inProgress) {
                    alert("이미 처리중인 작업이 있습니다.\n잠시만 기다려주세요.");
                    return false;
                }
                if(!this._client.constructor.isSupported()) {
                    alert("웹푸시를 지원하지 않는 브라우저입니다.");
                    return false;
                }
                if(Notification.permission === 'denied') {
                    alert("알림이 비활성화된 상태입니다.\n브라우저 설정에서 알림을 허용해주세요.");
                    return false;
                }

                return true;
            };

            MemberNoti.prototype._init = function() {
                if(!this._client.constructor.isSupported()) {
                    $('.noti-subscribe__container').addClass('hide');
                    $('.noti-not-supported__container').addClass('show');
                    return;
                }

                var that = this;
                this.registerListeners();
                this.updatePushLogTable();
                this._inProgress = true;
                if(this._$toggleButton) {
                    this._client.isSubscribed().then(function(result) {
                        that._$toggleButton.prop('checked', result);
                        that._inProgress = false;
                    });
                }
            };

            MemberNoti.prototype.registerListeners = function() {
                this._$table.on('click', '.noti-pagination a', this._onPaginationClickHandler);
                this._$table.on('click', 'a.removePushLog', this._onPushLogRemoveClickHandler);
                this._$table.on('click', 'a.launchLink', this._onPushLogClickHandler);
                this._$toggleButton.on('change', this._onPushEnableButtonChangeHandler);
                this._$toggleButton.on('click', this._onPushEnableButtonClickHandler);
            };

            MemberNoti.prototype.unregisterListeners = function() {

            };

            MemberNoti.prototype.updatePushLogTable = function(page) {
                if(page === void 0) {
                    page = 1;
                }

                var that = this;
                this._store.getPushLogList(page).then(function(result) {
                    var currentPage = result.currentPage;
                    var lastPage = result.lastPage;
                    var list = result.data;
                    var totalCount = result.totalCount;
                    if(page > 1 && list.length === 0) {
                        return that.updatePushLogTable(lastPage);
                    }

                    that._$table.html(getPushLogTable(totalCount, list) + getPushLogPagination(currentPage, lastPage, 10));
                });
            };

            MemberNoti.prototype.resetPushLog = function() {

            };

            MemberNoti.prototype.removePushLog = function(pushLog) {

            };

            return MemberNoti;

        })())({
            $table: $('.noti-pushlog__container'),
            $toggleButton: $('.noti-subscribe .switch.subscribe input[type=checkbox]')
        });
    });

})();
