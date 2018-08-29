var http = {};

http.send = function(option, data) {
	// 自定义请求
	if (option.custom == true) {
		this._sendMsg(option, data);
	}
	// 统一规范请求
	else {
		var actionKey = ideal.util.okey(ideal.action, option);

		if (actionKey == null) {
			var n = option;
			if (typeof option == 'object') {
				n = JSON.stringify(option);
			}
			ideal.warn(`警告: ServiceAction中没有找到"${n}"指令.`);
			return;
		}

		ideal.service.sendMsg(actionKey, option, data);
	}
};

http._sendMsg = function(option, data) {
	var _define = {
		path: '',
		timeout: 5000,
		method: 'GET',
		custom: false,
		successFn: null,
		failFn: null,
	};
	option = ideal.util.merge(_define, option);

	var requestURL = option.path;
	var requestMethod = option.method.toLocaleUpperCase();

	if (typeof option.onceCallback == 'function') {
		option.successFn = option.onceCallback;
		ideal.warn(`警告: ideal.http的传参"onceCallback"属性即将废弃, 请使用successFn.`);
	}

	// 非自定义的请求, 走统一规范
	if (option.custom == false) {
		requestURL = ideal.util.addUrlParam(requestURL, 'action', option['action']);
	}

	// GET模式, 传参加入到URL中
	if (requestMethod == 'GET') {
		for (var i in data) {
			requestURL = ideal.util.addUrlParam(requestURL, i, data[i]);
		}
	}

	var xhr = cc.loader.getXMLHttpRequest();
	xhr.timeout = option.timeout;
	xhr.open(requestMethod, requestURL, true);

	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4) {
			return;
		}

		if (xhr.status >= 200 && xhr.status < 300) {
			var resp = null;
			try {
				resp = JSON.parse(xhr.responseText);
			} catch (err) {
				resp = xhr.responseText;
			}
			// 非自定义的请求, 走统一规范
			if (option.custom == false) {
				var actionKey = ideal.util.okey(ideal.action, option);
				ideal.service.parseMsg(actionKey, resp);
			}
			ideal.callFn(option.successFn, resp);
		} else {
			ideal.error(`请求失败, URL: ${requestURL}`);
			ideal.callFn(option.failFn);
		}
	};

	if (requestMethod == 'GET') {
		if (cc.sys.isNative) {
			xhr.setRequestHeader('Accept-Encoding', 'gzip,deflate', 'text/html;charset=UTF-8');
		}
		xhr.send();
	} else {
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		var params = [];
		for (var key in data) {
			params.push(key + '=' + data[key]);
		};
		xhr.send(params.join('&'));
	}
};

module.exports = http;
