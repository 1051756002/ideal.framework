/**
 * 业务服务器
 * 用于解析服务器推送过来的消息，分发出业务指令。
 */
var service = {
	_pools: [],
};

/**
 * 初始化Service业务函数
 * @Author   Zjw
 * @DateTime 2018-08-29
 */
service.init = function(slist) {
	try {
		this._pools = [];
		for (var i = 0; i < slist.length; i++) {
			this._pools.push(slist[i]);
		}
	} catch (err) {
		ideal.warn(`警告: iService.init 没有找到指定文件.`);
	}
};

/**
 * 发送指令
 * @Author   Zjw
 * @DateTime 2018-08-29
 * @param    {string}   key  指令键名
 * @param    {object}   data 发送数据
 */
service.sendMsg = function(key, data) {
	var exist = false;

	var args = [];
	for (var i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	};

	var pools = this._pools;
	for (var i in pools) {
		if (pools[i] && typeof pools[i]['Send_'+key] == 'function') {
			exist = true;
			pools[i]['Send_'+key].apply(pools[i], args);
			break;
		}
	};

	if (exist == false) {
		ideal.warn(`警告: Service 中没有找到"Send_${key}"指令的对应发送方法.`);
	}
};

/**
 * 解析消息
 * @Author   Zjw
 * @DateTime 2018-08-29
 * @param    {string}   key  指令键名
 * @param    {object}   data 接收数据
 */
service.parseMsg = function(key, data) {
	var exist = false;

	var args = [];
	for (var i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	};

	var pools = this._pools;
	for (var i in pools) {
		if (pools[i] && typeof pools[i]['Recv_'+key] == 'function') {
			exist = true;
			pools[i]['Recv_' + key].apply(pools[i], args);
			break;
		}
	};

	if (exist == false) {
		ideal.warn(`警告: Service 中没有找到"Recv_${key}"指令的对应接收方法.`);
	}
};

module.exports = service;
