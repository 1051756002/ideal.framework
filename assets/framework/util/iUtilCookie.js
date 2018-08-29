let _util = {};

/**
 * 获得指定Cookie
 * @Author   Zjw
 * @DateTime 2018-05-31
 * @param    {String}                 key        键
 * @param    {Object}                 defval     默认值
 * @return   {Boolean}
 */
_util.getCookie = function(key, defval = null) {
    if (!cc.sys.isBrowser) {
        return defval;
    }
    let arr, reg = new RegExp("(^| )" + key + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg)) {
        return decodeURIComponent(unescape(arr[2]));
    }
    return defval;
};

/**
 * 设置指定Cookie
 * @Author   Zjw
 * @DateTime 2018-05-31
 * @param    {String}                 key        键
 * @param    {String}                 value      值
 * @param    {Number}                 expiretime 过期时间 (单位:秒)
 * @return   {Boolean}
 */
_util.setCookie = function(key, value, expiretime = null) {
    if (!cc.sys.isBrowser) {
        return false;
    }
    let cookiestr = key + '=' + escape(value);
    if (typeof expiretime == 'number') {
        let expiredate = new Date();
        expiredate.setSeconds(expiredate.getSeconds() + expiretime);
        cookiestr += ';expires=' + expiredate.toGMTString();
    }
    document.cookie = cookiestr;
    return true;
};

/**
 * 删除指定Cookie
 * @Author   Zjw
 * @DateTime 2018-06-01
 * @param    {String}                 key 键
 * @return   {Boolean}
 */
_util.delCookie = function(key) {
    return _util.setCookie(key, '', -1);
};

module.exports = _util;
