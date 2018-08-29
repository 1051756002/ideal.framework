let _util = {};

/**
 * 是否为空对象
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {object} val
 * @return   {boolean}
 */
_util.isEmpty = function(val) {
    switch (typeof(val)) {
        case 'string':
            return iUtil.trim(val).length == 0 ? true : false;
            break;
        case 'number':
            return val == 0;
            break;
        case 'object':
            return val == null;
            break;
        case 'array':
            return val.length == 0;
            break;
        case 'function':
            return false;
            break;
        default:
            return true;
    }
};

/**
 * 是否定义了该内容
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {Object} val
 * @return   {Boolean}
 */
_util.isDefine = function(val) {
    return !iUtil.isEmpty(val);
};

/**
 * 当前是否为微信浏览器
 * @Author   Zjw
 * @DateTime 2018-05-28
 * @return   {Boolean}
 */
_util.isWeixin = function() {
    if (!cc.sys.isBrowser) {
        return false;
    }
    let ua = navigator.userAgent.toLowerCase();
    let isWeixin = ua.indexOf('micromessenger') != -1;
    return !!isWeixin;
};

/**
 * 唤起微信支付
 * @Author   Zjw
 * @DateTime 2018-06-07
 * @param    {Number}                 userid        用户Id
 * @param    {Number}                 goodsId       商品Id
 * @param    {Function}               callback      支付成功的回调函数
 * @return   {Boolean}
 */
_util.callWxPay = function(userid, goodsId, callback) {
    // 非微信内置浏览器统统不支持此功能
    if (!cc.sys.isBrowser || !ideal.util.isWeixin()) {
        return false;
    }

    if (ideal.util.isEmpty(ideal._pcfg.wxPayHttpServer)) {
        ideal.warn(`警告: Config中没有找到wxPayHttpServer属性.`);
        return false;
    }

    let wxinfo = ideal.util.getCookie('wxinfo');
    if (wxinfo == null) {
        iUtil.msg('获取微信用户信息失败.');
        return false;
    }
    wxinfo = JSON.parse(wxinfo);

    // 唤起微信JS桥
    let invokeFn = function(param) {
        if (typeof param == 'string') {
            param = JSON.parse(param);
        }
        WeixinJSBridge.invoke('getBrandWCPayRequest', param, function(res) {
            ideal.util.hideLoading('WxPay');
            callback && callback(res);
        });
    };

    // 下单请求回调
    let orderFn = function(res) {
        // 下单成功
        if (res.code == true) {
            // 避免该对象的异步还未加载完成
            if (typeof WeixinJSBridge == 'undefined') {
                if (document.addEventListener) {
                    document.addEventListener('WeixinJSBridgeReady', function() { invokeFn(res.data.param); }, false);
                } else if (document.attachEvent) {
                    document.attachEvent('WeixinJSBridgeReady', function() { invokeFn(res.data.param); });
                    document.attachEvent('onWeixinJSBridgeReady', function() { invokeFn(res.data.param); });
                }
            } else {
                invokeFn(res.data.param);
            }
        } else {
            ideal.util.msg(res.message);
            ideal.util.hideLoading('WxPay');
        }
    };

    let action = {
        path: ideal._pcfg.wxPayHttpServer,
        method: 'POST',
        custom: true,
        onceCallback: orderFn,
    };

    let data = {
        uid: userid,
        goods_id: goodsId,
        openid: wxinfo.oid,
    };

    ideal.http.sendMsg(action, data);
    ideal.util.showLoading('WxPay');
    return true;
};

/**
 * 获得地址参数列表
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {string}
 * @param    {string}
 * @return   {string|null}
 */
_util.getQueryString = function(name, defval = null, decode = true) {
    if (ideal.device.platformSuf != 'wxweb' &&
        ideal.device.platformSuf != 'web') {
            ideal.warn(`getQueryString 不支持：${ideal.device.platformSuf}`);
            return;
    }
    let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    let idx = location.search.indexOf('/');
    let content = location.search.substr(1);

    if (decode) {
        content = decodeURIComponent(decodeURI(content));
    }

    let r = content.match(reg);
    let ret = defval;
    if (r != null) {
        if (decode) {
            ret = decodeURIComponent(decodeURI(r[2]));
        } else {
            ret = r[2];
        }
    }

    return ret;
};

/**
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {string}
 * @param    {string}
 * @param    {string}
 * @return   {void}
 */
_util.addUrlParam = function(url, name, value) {
    if (/\?/g.test(url)) {
        if (/name=[-\w]{4,25}/g.test(url)) {
            url = url.replace(/name=[-\w]{4,25}/g, name + "=" + encodeURIComponent(value));
        } else {
            url += "&" + name + "=" + encodeURIComponent(value);
        }
    } else {
        url += "?" + name + "=" + encodeURIComponent(value);
    }
    return url;
};

/**
 * 加载外界JS脚本文件
 * @Author   Zjw
 * @DateTime 2018-04-20
 * @param    {string}                 url      脚本地址
 * @param    {Function}               callback 载入后的回调
 * @return   {void}
 */
_util.loadJavaScript = function(url, callback) {
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    if (iUtil.isDefine(callback)) {
        script.onload = function() {
            callback();
        };
    }
    document.body.appendChild(script);
};

_util.loadRes = function(resource, progressFn, completeFn) {
    resource = 'res/raw-assets/' + resource;
    cc.loader.load(resource, progressFn, completeFn);
};

/**
 * 加载内链/外链图片资源到指定节点 (内链请在Url前面加上"db:", 且不需要后缀名; 如: db:hall/logo)
 * @Author   Zjw
 * @DateTime 2018-05-15
 * @param    {cc.Node|cc.Sprite}      node     需要显示图片的节点
 * @param    {String}                 url      图片链接
 * @param    {Function}               callback 回调函数
 * @param    {Boolean}                isCache  是否读缓存
 * @param    {Array}                  s9       九宫格数组[top, bottom, left, right]
 * @return   {void}
 */
_util.loadSpriteFrame = function(node, url, callback, isCache, s9) {
    let sprite;
    if (node instanceof cc.Node) {
        sprite = node.getComponent(cc.Sprite);
        if (sprite == null) {
            sprite = node.addComponent(cc.Sprite);
        }
    } else if (node instanceof cc.Sprite) {
        sprite = node;
    } else {
        throw '加载SpriteFrame失败, node参数非有效参数';
    }

    let config;
    // 简单Url形式
    if (typeof url == 'string') {
        config = {
            url: url,
            type: 'png',
        };
    }
    // 配置对象形式
    else {
        config = url;
    }

    config.url = unescape(config.url);
    // 强制追加参数, 模拟JPEG格式(规避引擎BUG)
    if (!config.url.endsWith('jpg') && !config.url.endsWith('png')) {
        config.url += '?n.jpg';
    }

    let cache = ideal.textureCache.get(config.url);
    if (cache) {
        sprite.spriteFrame = cache;
        callback && callback();
        return;
    }

    // 内链
    if (config.url.startsWith('db:')) {
        config.url = config.url.substr(3);
        // 避免异步回调导致纹理回滚显示
        sprite.ideal_url = config.url;

        cc.loader.loadRes(config.url, cc.SpriteFrame, function(err, spriteFrame) {
            if (err) {
                throw err;
            }

            if (s9 instanceof Array) {
                spriteFrame.insetTop = s9[0] || 0;
                spriteFrame.insetBottom = s9[1] || 0;
                spriteFrame.insetLeft = s9[2] || 0;
                spriteFrame.insetRight = s9[3] || 0;
            }

            if (isCache) {
                ideal.textureCache.add(config.url, spriteFrame);
            }

            if (sprite.ideal_url === config.url) {
                sprite.spriteFrame = spriteFrame;
                callback && callback();
            }
        });
    }
    // 外链
    else {
        // 避免异步回调导致纹理回滚显示
        sprite.ideal_url = config.url;

        cc.loader.load(config, function(err, texture) {
            if (err) {
                throw err;
            }

            var spriteFrame = new cc.SpriteFrame(texture);
            if (s9 instanceof Array) {
                spriteFrame.insetTop = s9[0] || 0;
                spriteFrame.insetBottom = s9[1] || 0;
                spriteFrame.insetLeft = s9[2] || 0;
                spriteFrame.insetRight = s9[3] || 0;
            }

            if (isCache) {
                ideal.textureCache.add(config.url, spriteFrame);
            }

            if (sprite.ideal_url === config.url) {
                sprite.spriteFrame = spriteFrame;
                callback && callback();
            }
        });
    }
};

module.exports = _util;