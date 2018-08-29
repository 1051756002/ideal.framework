let _util = {};

/**
 * 深拷贝
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {object}
 * @return   {object}
 */
_util.clone = function(obj) {
	if (obj === null || typeof obj !== 'object') {
		return;
	}

	var str, newobj = obj.constructor === Array ? [] : {};
	if (window.JSON) {
		str = JSON.stringify(obj), newobj = JSON.parse(str);
	} else {
		for (var i in obj) {
			newobj[i] = typeof obj[i] === 'object' ? iUtil.clone(obj[i]) : obj[i];
		}
	}
	return newobj;
};

/**
 * 补零
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {number}
 * @param    {number}
 * @return   {string}
 */
_util.zeroize = function(val, num) {
	if (typeof num == 'undefined') {
		num = 2;
	}
	let str = '';
	for (let i = 0; i < num; i++) {
		str += '0';
	}
	str += val;
	return str.substring(str.length - num);
};

/**
 * 生成随机数
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {number}
 * @param    {number}
 * @return   {number}
 */
_util.rnd = function(min, max) {
	if (typeof max == 'undefined') {
		max = min;
		min = 0;
	}

	return Math.floor(Math.random() * max + min);
};

/**
 * MD5加密
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {string}
 * @return   {string}
 */
_util.md5 = function(content) {
	let md5 = require('../core/iMd5');

	if ( typeof md5 == 'function') {
		return md5(iUtil.trim(content));
	} else {
		return content;
	}
};

/**
 * Base64加密
 * @Author   Zjw
 * @DateTime 2018-08-09
 * @param    {String}   content 需要加密的字符串
 * @return   {String}
 */
_util.base64Encode = function(content) {
	if (window['btoa']) {
		return window['btoa'](content);
	} else {
		return require('../core/iBase64').encode(content);
	}
};

/**
 * Base64解密
 * @Author   Zjw
 * @DateTime 2018-08-09
 * @param    {String}   content 需要解密的字符串
 * @return   {String}
 */
_util.base64Decode = function(content) {
	if (window['atob']) {
		return window['atob'](content);
	} else {
		return require('../core/iBase64').decode(content);
	}
};

/**
 * 获取对象的属性总数量
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {object}
 * @return   {number}
 */
_util.olen = function(obj) {
	if (Object['getOwnPropertyNames']) {
		return Object.getOwnPropertyNames(obj).length;
	}

	let len = 0;
	for (let i in obj) {
		len++;
	};
	return len;
};

/**
 * 通过值获取对象中的键名
 * @Author   Zjw
 * @DateTime 2018-05-04
 * @param    {Object}                 obj     需要查找的对象
 * @param    {Object}                 val     需要用于判定的值
 * @param    {Object}                 def     默认值
 * @return   {Object}
 */
_util.okey = function(obj, val, def = null) {
	for (let i in obj) {
		if (obj[i] === val) {
			return i;
		}
	}
	return def;
};

/**
 * 通过值获取对象中的所有匹配键名
 * @Author   Zjw
 * @DateTime 2018-08-10
 * @param    {Object}                 obj     需要查找的对象
 * @param    {Object}                 val     需要用于判定的值
 * @param    {Object}                 def     默认值
 * @return   {Object}
 */
_util.okeys = function(obj, val) {
	let keys = [];
	for (let i in obj) {
		if (obj[i] === val) {
			keys.push(i);
		}
	}
	return keys;
};

/**
 * 通过值获取对象中指定键的值
 * @Author   Zjw
 * @DateTime 2018-05-28
 * @param    {Object}                 obj 需要查找的对象
 * @param    {String}                 key 键名
 * @param    {Object}                 val 需要用于判断的值
 * @param    {Object}                 def 默认值
 * @return   {Object}
 */
_util.okey2 = function(obj, key, val, def = null) {
	for (let i in obj) {
		if (obj[i][key] === val) {
			return obj[i];
		}
	}
	return def;
};

/**
 * 合并对象
 * @Author   Zjw
 * @DateTime 2018-04-12
 * @param    {object}
 * @param    {object}
 * @return   {object}
 */
_util.merge = function(def, obj) {
	if (typeof obj == 'undefined') {
		obj = {};
	};
	for (var k in def) {
		if (typeof obj[k] === 'undefined') {
			obj[k] = def[k];
		}
	}
	return obj;
};

/**
 * 模拟一个TCP消息接收的iService处理
 * @Author   Zjw
 * @DateTime 2018-05-16
 * @param    {Object}                 data 需要处理的数据
 * @return   {Boolean}
 */
_util.toService = function(data) {
	if (data instanceof Object == false) {
		ideal.error('异常: "ideal.util.toService"需要一个Object类型的数据');
		return false;
	}

	let key = ideal.util.okey(ideal.cmd, data.cmd);

	if (key) {
		require('iService').parseMsg(key, data);
	} else {
		ideal.warn(`警告: 找不到"ideal.cmd.${data.cmd}"接收指令`);
	}
	return true;
};

/**
 * 复制指定内容到系统剪切板
 * @Author   Zjw
 * @DateTime 2018-05-16
 * @param    {String}                 content 需要复制的内容
 * @return   {Boolean}
 */
_util.toCopy = function(content) {
	if (ideal.device.platformSuf == 'wxgame') {
		wx.setClipboardData({
			data: content,
		})
		return true;
	}
	if (!cc.sys.isBrowser) {
		return false;
	}

	if (!document.execCommand) {
		ideal.warn(`警告: 该浏览器不支持面板复制功能`);
		return false;
	}

	if (typeof ClipboardJS == 'undefined') {
		ideal.warn(`警告: 插件未载入, 复制失败!`);
		return false;
	}

	ClipboardJS.copy(content, function(isok) {
        isok || ideal.warn(`警告: 复制失败了!`);
    });

	return true;
};

/**
 * 将整形数字转为字符显示, 正数前会附加一个"+"号
 * @Author   Zjw
 * @DateTime 2018-05-17
 * @param    {Number}                 num 需要转换的整型
 * @return   {String}
 */
_util.toNumber = function(num) {
	num = parseInt(num);

	isNaN(num) && (num = 0);

	if (num > 0) {
		return '+' + num;
	} else {
		return num.toString();
	}
};

module.exports = _util;
