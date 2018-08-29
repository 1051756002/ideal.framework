let _util = {};

/**
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {number}
 * @return   {string}
 */
_util.toTime = function(time) {
	var dt = Date.now() - time;
    if (dt >= 24 * 60 * 60 * 1000)
        return Math.floor(dt / (24 * 60 * 60 * 1000)) + '天前';
    else if (dt >= 60 * 60 * 1000)
        return Math.floor(dt / (60 * 60 * 1000)) + '小时前';
    else if (dt >= 60 * 1000)
        return Math.floor(dt / (60 * 1000)) + '分钟前';
    else if (dt >= 0)
        return '刚才';
    else
        return '';
};

/**
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {number}
 * @param    {number}
 * @return   {string}
 */
_util.toTime2 = function(use_time, sys_time) {
	use_time = parseInt(use_time);
	if (typeof sys_time == 'undefined') {
		sys_time = Date.now();
	} else {
		sys_time = parseInt(sys_time);
	}

	let date_time = 24 * 60 * 60 * 1000;
	let diff_time = sys_time - use_time;
	let use_day = new Date(use_time).getDate();
	let sys_day = new Date(sys_time).getDate();

	// 显示日期
	if (diff_time > date_time || use_day != sys_day) {
		return iUtil.fmtDate(use_time);
	}
	// 显示时间
	else {
		return iUtil.fmtDate2(use_time);
	}
};

/**
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {object}
 * @return   {string}
 */
_util.fmtDate = function(obj) {
	let date = new Date(obj);
	let y = 1900 + date.getYear();
	let M = iUtil.zeroize(date.getMonth() + 1);
	let d = iUtil.zeroize(date.getDate());
	let h = iUtil.zeroize(date.getHours());
	let m = iUtil.zeroize(date.getMinutes());
	return iUtil.format('{2}-{3} {4}:{5}', y, M, d, h, m);
};

/**
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {object}
 * @return   {string}
 */
_util.fmtDate2 = function(obj) {
	let date = new Date(obj);
	let h = iUtil.zeroize(date.getHours());
	let m = iUtil.zeroize(date.getMinutes());
	return iUtil.format('{1}:{2}', h, m);
};

/**
 * 占位符字符串
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @return   {string}
 */
_util.format = function() {
	var str = arguments[0].toString();

	for (var i = 1; i < arguments.length; i++) {
		str = str.replace(new RegExp("\\{" + (i - 1) + "\\}", "g"), arguments[i]);
	}
	return str;
};

/**
 * 去空格
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {string}
 * @return   {string}
 */
_util.trim = function(text) {
	if (typeof(text) == 'string') {
		return text.replace(/^\s*|\s*$/g, '');
	} else {
		return text;
	}
};

module.exports = _util;
