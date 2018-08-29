let _util = {};

/**
 * 重定位当前场景中的Page节点
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @return   {void}
 */
_util.fixedPage = function() {
    let nodes = cc.find('Canvas').children;
    for (let i in nodes) {
        if (nodes[i] instanceof cc.Node) {
            let node = nodes[i];
            let resp = node.name.match(/^(Page)([a-z|0-9]*)$/i);
            if (resp == null) continue;

            // 强制隐藏
            node.active = false;

            // 重定位到屏幕显示区域
            let widget = node.getComponent(cc.Widget);
            if (!widget) {
            	widget = node.addComponent(cc.Widget);
            }

            var isPhoneX = function() {
                let testMobile = cc.sys.isBrowser && cc.sys.isMobile;
                let testAgent = !!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
                let testScreen = screen.height == 812 && screen.width == 375;
                return testMobile && testAgent && testScreen;
            }();

            let leftSpace = 0;
            let rightSpace = 0;
            if (ideal.config.enablePhoneX && isPhoneX) {
                if (window.orientation == 90) {
                    leftSpace = 60;
                }
                if (window.orientation == -90) {
                    rightSpace = 60;
                }
            }

            widget.left = leftSpace;
            widget.isAlignLeft = true;
            widget.right = rightSpace;
            widget.isAlignRight = true;
            widget.top = 0;
            widget.isAlignTop = true;
            widget.bottom = 0;
            widget.isAlignBottom = true;
            widget.alignMode = cc.Widget.AlignMode.ALWAYS;
        }
    }
};

/**
 * 显示消息提示
 * 支持以下几种传参顺序:
 * 1. content<消息内容>
 * 2. content<消息内容>, confirmFn<确认回调>
 * 3. content<消息内容>, confirmFn<确认回调>, cancelFn<取消回调>
 * 4. content<消息内容>, confirmText<确认按钮文本>, cancelText<取消按钮文本>
 * 5. content<消息内容>, confirmText<确认按钮文本>, confirmFn<确认回调>
 * 6. content<消息内容>, confirmText<确认按钮文本>, confirmFn<确认回调>, cancelFn<取消回调>
 * 7. content<消息内容>, confirmText<确认按钮文本>, confirmFn<确认回调>, cancelText<取消按钮文本>, cancelFn<取消回调>
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @return   {void}
 */
_util.tips = function () {
    let args = [];
    for (let i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    };

    if (args.length == 0) {
        return;
    }

    let cfg = { content: ideal.util.trim(args[0]) };

    // content<消息内容>, confirmFn<确认回调>
    if (args.length === 2) {
        cfg['confirmFn'] = args[1];
    }

    if (args.length === 3) {
        // content<消息内容>, confirmFn<确认回调>, cancelFn<取消回调>
        if (typeof args[1] == 'function' && typeof args[2] == 'function') {
            cfg['confirmFn'] = args[1];
            cfg['cancelFn'] = args[2];
        }

        // content<消息内容>, confirmText<确认按钮文本>, cancelText<取消按钮文本>
        if (typeof args[1] == 'string' && typeof args[2] == 'string') {
            cfg['confirmText'] = args[1];
            cfg['cancelText'] = args[2];
        }

        // content<消息内容>, confirmText<确认按钮文本>, confirmFn<确认回调>
        if (typeof args[1] == 'string' && typeof args[2] == 'function') {
            cfg['confirmText'] = args[1];
            cfg['confirmFn'] = args[2];
        }
    }
    
    // content<消息内容>, confirmText<确认按钮文本>, confirmFn<确认回调>, cancelText<取消按钮文本>, cancelFn<取消回调>
    if (args.length === 5) {
        cfg['confirmText'] = args[1];
        cfg['confirmFn'] = args[2];
        cfg['cancelText'] = args[3];
        cfg['cancelFn'] = args[4];
    }

    ideal.view.show('PopTips', './framework/prefab', cfg);
};

/**
 * 显示软提示消息
 * 支持以下几种传参顺序:
 * 1. content<消息内容>
 * @Author   Zjw
 * @DateTime 2018-05-10
 * @return   {void}
 */
_util.msg = function() {
    let args = [];
    for (let i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    };

    if (args.length == 0) {
        return;
    }

    ideal.view.show('FixMsg', './framework/prefab', {
        content: ideal.util.trim(args[0]),
    });
};

/**
 * 显示Loading遮罩层
 * @Author   Zjw
 * @DateTime 2018-05-21
 * @param    {String}                 taskName   任务名称
 * @param    {Number}                 taskTime   任务时间 (单位秒, -1为无限时长)
 * @return   {void}
 */
_util.showLoading = function(taskName = 'master', taskTime = -1) {
    ideal.view.show('FixLoading', './framework/prefab', {
        name: taskName,
        time: taskTime,
    });
};

/**
 * 隐藏Loading遮罩层
 * @Author   Zjw
 * @DateTime 2018-05-21
 * @param    {String}                 taskName 任务名称
 * @return   {void}
 */
_util.hideLoading = function(taskName) {
    ideal.view.hide('FixLoading', taskName, true);
};

module.exports = _util;
