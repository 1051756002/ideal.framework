var event = {
	_pools: {},

	EventEnum: {
		/**
		 * 网络事件 - 连接成功
		 * @type {string}
		 */
		NetConnected: 'network.connected',

		/**
		 * 网络事件 - 网络重连
		 * @type {string}
		 */
		NetReconnect: 'network.reconnect',

		/**
		 * 网络事件 - 连接断开
		 * @type {string}
		 */
		NetDisconnect: 'network.disconnect',

		/**
		 * 网络事件 - 连接中断
		 * @type {string}
		 */
		NetInterrupt: 'network.interrupt',

		/**
		 * 网络事件 - 网络安防强化
		 * @type {string}
		 */
		NetSecurityStrengthen: 'network.strengthen',

		/**
		 * 网络事件 - 网络心跳
		 * @type {string}
		 */
		NetHeartBeat: 'network.heartbeat',
		
		/**
		 * 应用进程暂停, 切换至后台运行或锁屏
		 * @type {string}
		 */
		ApplicationPause: 'application.pause',

		/**
		 * 应用进程恢复, 切换回前台运行或解屏
		 * @type {string}
		 */
		ApplicationResume: 'application.resume',
	},
};

for (var i in event.EventEnum) {
	(function(i) {
		event.__defineGetter__(i, function() {
			return event.EventEnum[i];
		});
	})(i);
};

/**
 * 获取当前事件池
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @return   {object}
 */
event.__defineGetter__('EventPools', function() {
	return this._pools;
});

/**
 * 注册事件监听
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @param    {string}     type     事件类型
 * @param    {function}   selector 事件函数
 * @param    {object}     thisObj  this作用域对象
 * @return   {boolean}             是否执行成功
 */
event.addEventListener = function(type, selector, thisObj) {
	if (!this._pools[type]) {
		this._pools[type] = [];
	};

	// 拦截重复注册事件
	for (var i in this._pools[type]) {
		if (this._pools[type][i].selector === selector && this._pools[type][i].thisObj === thisObj) {
			return false;
		};
	};

	this._pools[type].push({
		selector: selector,
		thisObj: thisObj,
	});
	return true;
};

/**
 * 移除事件监听
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @param    {string}     type     事件类型
 * @param    {function}   selector 事件函数
 * @param    {object}     thisObj  this作用域
 * @return   {boolean}             是否执行成功
 */
event.removeEventListener = function(type, selector, thisObj) {
	if (!this._pools[type]) {
		return false;
	}

	for (var i = this._pools[type].length - 1; i > -1; i--) {
		var _thisObj = this._pools[type][i].thisObj;
		var _selector = this._pools[type][i].selector;

		if (thisObj && selector) {
			if (thisObj === _thisObj && selector === _selector) {
				this._pools[type].splice(i, 1);
			}
		}
		else if (selector) {
			if (_selector === selector) {
				this._pools[type].splice(i, 1);
			}
		}
		else {
			this._pools[type].splice(i, 1);
		}
	};

	if (this._pools[type].length == 0) {
		delete this._pools[type];
	}
	return true;
};

/**
 * 触发事件
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @param    {string}   type    事件类型
 * @param    {object}   data    传参对象
 * @param    {object}   thisObj this作用域
 * @return   {boolean}          是否执行成功
 */
event.triggerEvent = function(type, data, thisObj) {
	if (!this._pools[type]) {
		return false;
	}

	for (var i = 0; this._pools[type] && i < this._pools[type].length; i++) {
		var _thisObj = this._pools[type][i].thisObj;
		var _selector = this._pools[type][i].selector;

		if (thisObj) {
			if (thisObj === _thisObj) {
				_selector.call(_thisObj, data);
			}
		} else {
			if (_thisObj) {
				_selector.call(_thisObj, data);
			} else {
				_selector(data);
			}
		}
	}
	return true;
};

module.exports = event;
