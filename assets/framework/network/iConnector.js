/**
 * 连接器异常类型枚举
 * @enum iConnector.ErrorType
 */
var ErrorType = {
	SocketError: 1,
	ReceiveError: 2,
	SendError: 3,
};

/**
 * Socket状态枚举
 * @enum iConnector.SocketStatus
 */
var SocketStatus = {
	Idle: 0,			// 空闲
	Connecting: 1,		// 连接中
	Connected: 2,		// 已连接
	Disconnecting: 3,	// 断开中
	Reconnecting: 4,	// 重连中
};

var Service = require('iService');
var HeartBeat = require('iHeartBeat');


// 静默式重连时间, 毫秒
var SilenceReconnectTime = 4000;
// 常规式重连时间, 毫秒
var NormalReconnectTime = 12000;

// 安防等级上限
var SecurityLevelLimit = 3;
// 安防等级强化时间, 毫秒
var SecurityStrengthenTime = 10000;

// 重连间隔时间, 毫秒
var ReConnectIntervalTime = 1000;

/**
 * 连接器类
 * @Author   Zjw
 * @DateTime 2018-08-15
 */
var iConnector = cc.Class({
	name: 'iConnector',

	properties: {
		_name: '',
		_socket: null,
		_networkUrl: '',
		_status: 0,

		_securityLevel: 1,
		_reconnTimes: 0,
		_connectStack: [],
		_frequentPool: [],

		_isConnected: false,
		_isTimeoutReconnect: false,

		_lastBrokenNetTimestamp: 0,
		_lastReconnectTimestamp: 0,

		_stid_loading: 0,
		_stid_timeout: 0,
		_stid_security: 0,
		_stid_reconnect: 0,
	},

	statics: {
		ErrorType: ErrorType,
		SocketStatus: SocketStatus,
		LoadingKey: 'framework.connector',
	},

	ctor: function() {
		var param = arguments[0];
		var _default = {
			name: 'mask',	// 连接器名称
			level: 1,		// 初始安防等级
		};
		param = ideal.util.merge(_default, param);

		this._name = param['name'];
		this._securityLevel = param['level'];
	},

	/*############## 对外接口 ##############*/

	/**
	 * 连接服务器
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @param    {object}   param 配置参数
	 * @return   {void}
	 */
	connect: function(param) {
		try {
			// 兼容旧API
			param = this.__compatibleApi.apply('connect', arguments);

			var _reconnectUrl = param.networkUrl;
			var _emptyFn = function() {};
			var _default = {
				networkUrl: ideal._pcfg.tcpServer,	// 网络地址
				callback: _emptyFn,					// 回调函数
				isNetSecurityStrengthen: false,		// 是否为强化安防首连操作, 将不间断的显示Loading
			};
			param = ideal.util.merge(_default, param);

			// 连接器已存在, 再次首连
			if (this._socket != null) {
				// 有指定地址
				if (typeof _reconnectUrl == 'string') {
					param.networkUrl = _reconnectUrl;
				}
				// 没有指定地址, 连接原来的网络地址
				else {
					param.networkUrl = this._networkUrl;
				}
			}

			// 该连接器正在断开时将本次连接操作加入堆栈
			if (this._status == SocketStatus.Disconnecting) {
				this._connectStack.push(param);
				return;
			}

			// 拦截非空闲状态的连接操作
			if (this._status != SocketStatus.Idle) {
				this._callFn(param['callback']);
				return;
			}

			var self = this;
			var networkUrl = param['networkUrl'];
			var isNetSecurityStrengthen = param['isNetSecurityStrengthen'];

			var openFn = function(evt) {
				ideal.log_net(`%c连接成功: [${self._name}]`, ideal.Log.LightGreen);
				self._callFn(param['callback']);
				ideal.emit(ideal.Event.NetConnected, { name: self._name, url: networkUrl });
			};

			var errorFn = function(evt) {
				ideal.error(`连接异常[首连]: [${self._name}] ${networkUrl}`);
				ideal.error(evt);
			};

			this._status = SocketStatus.Connecting;
			ideal.log_net(`%c开始连接: [${this._name}] ${networkUrl}`, ideal.Log.LightGreen);

			this._createSocket({
				networkUrl: networkUrl,
				openFn: openFn,
				errorFn: errorFn,
				isNetSecurityStrengthen: isNetSecurityStrengthen,
			});
		} catch (err) {
			this._errorHandle({
				type: ErrorType.SocketError,
				message: err.stack,
			});
		}
	},

	/**
	 * 重连服务器
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @return   {void}
	 */
	reconnect: function() {
		if (this._status != SocketStatus.Idle) {
			ideal.warn(`警告: [${this._name}] 重连失败, 连接器非空闲状态.`);
			return;
		}

		var self = this;
		var nowTime = Date.now();
		var networkUrl = this._networkUrl;

		// 控制重连间隔时间
		if (nowTime - this._lastReconnectTimestamp < ReConnectIntervalTime) {
			this._stid_reconnect = setTimeout(this.reconnect.bind(this), 10);
			return;
		}

		// 启动定时器 = 提示网络不稳定()
		if (this._stid_timeout == 0) {
			this._stid_timeout = setTimeout(function() {
				self._isTimeoutReconnect = true;
				ideal.util.tips('您的网络不稳定，请稍后重试！', '确 认', function() {
					self._stid_timeout = 0;
				});
			}, NormalReconnectTime);
		}

		// 重连超时, 开始加强安防等级
		if (this._stid_security == 0 && this._securityLevel < SecurityLevelLimit) {
			this._stid_security = setTimeout(function() {
				self._stid_security = 0;
				self._securityLevel++;
				self.disconnect(function() {
					ideal.emit(ideal.Event.NetSecurityStrengthen, { name: self._name, level: self._securityLevel });
				});
			}, SecurityStrengthenTime);
		}

		this._reconnTimes++;
		this._status = SocketStatus.Reconnecting;

		ideal.log_net(`%c第${this._reconnTimes}次重连: [${this._name}] ${networkUrl}`, ideal.Log.LightGreen);

		var openFn = function(evt) {
			var consumeTimestamp = Date.now() - self._lastBrokenNetTimestamp;
			ideal.log_net(`%c重连成功: [${self._name}]  耗时${consumeTimestamp}ms`, ideal.Log.LightGreen);

			// 兼容提示网络不稳定后, 重连成功提示一句话
			if (self._isTimeoutReconnect == true) {
				ideal.view.hide('PopTips');
				ideal.util.msg('重连成功，欢迎回来！');
			}

			self._reconnTimes = 0;
			self._isTimeoutReconnect = false;

			ideal.emit(ideal.Event.NetReconnect, { name: self._name, url: networkUrl });
		};

		var errorFn = function(evt) {
			ideal.error(`连接异常[重连]: [${self._name}] ${networkUrl}`);
			ideal.error(evt);
		};

		this._createSocket({
			networkUrl: networkUrl,
			openFn: openFn,
			errorFn: errorFn,
		});
		this._lastReconnectTimestamp = nowTime;
	},

	/**
	 * 强制与服务器断开
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @param    {function} callback 回调函数
	 * @return   {void}
	 */
	disconnect: function(callback) {
		if (this._status == SocketStatus.Idle) {
			this._callFn(callback);
		} else {
			this._status = SocketStatus.Disconnecting;

			// 移除定时器
			clearTimeout(this._stid_timeout), this._stid_timeout = 0;
			clearTimeout(this._stid_security), this._stid_security = 0;
			clearTimeout(this._stid_reconnect), this._stid_reconnect = 0;

			this._closeSocket(callback);
		}
	},

	/**
	 * 中断服务器
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @param    {function} callback 回调函数
	 * @return   {void}
	 */
	interrupt: function(callback) {
		if (this._status == SocketStatus.Connected) {
			this._closeSocket(callback);
		}
	},

	/**
	 * 强化安防
	 * @Author   Zjw
	 * @DateTime 2018-08-13
	 * @return   {Boolean}    是否强化成功
	 */
	strengthen: function() {
		if (this._securityLevel >= 3) {
			return false;
		}

		var self = this;
		this._securityLevel++;
		this.disconnect(function() {
			ideal.emit(ideal.Event.NetSecurityStrengthen, {
				name: self._name,
				level: self._securityLevel
			});
		});

		return true;
	},

	/**
	 * 发送消息
	 * @Author   Zjw
	 * @DateTime 2018-08-16
	 * @param    {number|boolean}   cmd  指令代码, 如果传入true将不走Service
	 * @param    {object}           data 数据对象
	 * @return   {boolean}
	 */
	send: function(cmd, data) {
		var key, keys = ideal.util.okeys(ideal.cmd, cmd);
		if (keys.length > 1) {
			for (var i in keys) {
				if (keys[i].startsWith(this._name)) {
					key = keys[i]; break;
				}
			}
		}
		if (key == null) {
			key = keys[0] ? keys[0] : cmd;
		}

		if (this._status != SocketStatus.Connected) {
			ideal.warn(`警告: [${this._name}] ${key} 发送失败, 连接器非连接状态.`);
			return false;
		}

		if (cmd === true) {
			this._sendMsg(data);
		}
		else {
			if (!this._frequentPool[cmd]) {
				this._frequentPool[cmd] = Date.now();
			} else {
				var intervalTime = 200;
				var nowTime = Date.now();
				if (nowTime < this._frequentPool[cmd] + intervalTime) {
					ideal.warn(`警告: [${this._name}] ${key} 发送过于频繁.`);
					return false;
				}
				this._frequentPool[cmd] = nowTime;
			}
			Service.sendMsg(key, data);
		}
		return true;
	},

	/**
	 * 用于判定连接器是否连通状态
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @return   {boolean}
	 */
	isOnline: function() {
		return this._status == SocketStatus.Connected;
	},

	/**
	 * 获取连接器名称
	 * @Author   Zjw
	 * @DateTime 2018-08-16
	 * @return   {string}
	 */
	getName: function() {
		return this._name;
	},

	/**
	 * 获取网络安防等级
	 * @Author   Zjw
	 * @DateTime 2018-08-16
	 * @return   {number}
	 */
	getSecurityLevel: function() {
		return this._securityLevel;
	},

	/**
	 * 获取网络连接地址
	 * @Author   Zjw
	 * @DateTime 2018-08-16
	 * @return   {string}
	 */
	getNetworkUrl: function() {
		return this._networkUrl;
	},

	/**
	 * 获取连接器状态, 从ideal['iConnector'].SocketStatus可以获得枚举
	 * @Author   Zjw
	 * @DateTime 2018-08-16
	 * @return   {number}
	 */
	getStatus: function() {
		return this._status;
	},

	/**
	 * 获取Socket内置对象
	 * @Author   Zjw
	 * @DateTime 2018-08-16
	 * @return   {object}
	 */
	getSocket: function() {
		return this._socket;
	},

	/*############## Socket ##############*/

	_createSocket: function(param) {
		var _emptyFn = function() {};
		var _default = {
			networkUrl: '',					// 网络地址
			openFn: _emptyFn,				// 连接成功回调
			closeFn: _emptyFn,				// 连接关闭回调
			errorFn: _emptyFn,				// 连接异常回调
			isNetSecurityStrengthen: false,	// 是否为强化安防首连操作, 将不间断的显示Loading
		};
		param = ideal.util.merge(_default, param);

		try {
			switch (ideal.device.platformSuf) {
				case 'wxgame':
					this._newSocketToWechatGame(param);
					break;
				default:
					this._newSocketToWebSocket(param);
					break;
			}

			this._networkUrl = param['networkUrl'];

			if (param['isNetSecurityStrengthen'] == true) {
				this._isConnected = false;
				this._showLoading();
			}
			else if (this._isConnected == true) {
				this._isConnected = false;
				this._showLoading(SilenceReconnectTime);
			}
		} catch (err) {
			this._errorHandle({
				type: ErrorType.SocketError,
				message: err.stack,
			});
		}
	},

	_newSocketToWechatGame: function(param) {
		var self = this;
		var socket = wx.connectSocket({ url: param['networkUrl'] });

		socket.onOpen(function(evt) {
			self._isConnected = true;
			self._status = SocketStatus.Connected;

			// 移除定时器
			clearTimeout(self._stid_timeout), self._stid_timeout = 0;
			clearTimeout(self._stid_security), self._stid_security = 0;
			clearTimeout(self._stid_reconnect), self._stid_reconnect = 0;

			// 初始化频繁请求管理池
			self._frequentPool = {};

			// 实例一个心跳包并启动
			self._heartbeat = new HeartBeat();
			self._heartbeat.start(self);

			self._callFn(param['openFn'], evt);
			self._hideLoading();
		});

		socket.onClose(function(evt) {
			if (self._isConnected == true) {
				self._hideLoading();
				self._lastBrokenNetTimestamp = Date.now();
			}

			// 手动断开网络
			if (self._status == SocketStatus.Disconnecting) {
				ideal.log_net(`%c网络断开: [${self._name}]`, ideal.Log.LightGreen);

				self._status = SocketStatus.Idle;

				self._hideLoading();

				ideal.emit(iEvent.NetDisconnect, { name: self._name, url: param['networkUrl'] });
			}
			// 自动中断网络
			else {
				ideal.log_net(`%c网络中断: [${self._name}]`, ideal.Log.LightGreen);

				self._status = SocketStatus.Idle;

				self._callFn(param['closeFn'], evt);

				// 连接成功后才通知
				if (self._isConnected == true) {
					ideal.emit(iEvent.NetInterrupt, { name: self._name, url: param['networkUrl'] });
				}
				// 自动重连
				self.reconnect();
			}

			// 停止心跳包
			if (self._heartbeat) {
				self._heartbeat.stop();
			}

			// 检测连接堆栈
			if (self._connectStack.length > 0) {
				self.connect({
					callback: function() {
						while(true) {
							self._callFn(self._connectStack.shift());
							if (self._connectStack.length == 0) {
								break;
							}
						}
					}
				});
			}
		});

		socket.onMessage(function(evt) {
			self._receiveMsg(JSON.parse(evt.data));
		});

		socket.onError(function(evt) {
			self._callFn(param['errorFn'], evterrMsg);
		});

		this._socket = socket;
	},

	_newSocketToWebSocket: function(param) {
		var self = this;
		var socket = new WebSocket(param['networkUrl']);

		socket.onopen = function(evt) {
			self._isConnected = true;
			self._status = SocketStatus.Connected;

			// 移除定时器
			clearTimeout(self._stid_timeout), self._stid_timeout = 0;
			clearTimeout(self._stid_security), self._stid_security = 0;
			clearTimeout(self._stid_reconnect), self._stid_reconnect = 0;

			// 初始化频繁请求管理池
			self._frequentPool = {};

			// 实例一个心跳包并启动
			self._heartbeat = new HeartBeat();
			self._heartbeat.start(self);

			self._callFn(param['openFn'], evt);
			self._hideLoading();
		};

		socket.onclose = function(evt) {
			if (self._isConnected == true) {
				self._hideLoading();
				self._lastBrokenNetTimestamp = Date.now();
			}

			// 手动断开网络
			if (self._status == SocketStatus.Disconnecting) {
				ideal.log_net(`%c网络断开: [${self._name}]`, ideal.Log.LightGreen);

				self._status = SocketStatus.Idle;

				self._hideLoading();

				ideal.emit(iEvent.NetDisconnect, { name: self._name, url: param['networkUrl'] });
			}
			// 自动中断网络
			else {
				ideal.log_net(`%c网络中断: [${self._name}]`, ideal.Log.LightGreen);

				self._status = SocketStatus.Idle;

				self._callFn(param['closeFn'], evt);

				// 连接成功后才通知
				if (self._isConnected == true) {
					ideal.emit(iEvent.NetInterrupt, { name: self._name, url: param['networkUrl'] });
				}
				// 自动重连
				self.reconnect();
			}

			// 停止心跳包
			if (self._heartbeat) {
				self._heartbeat.stop();
			}

			// 检测连接堆栈
			if (self._connectStack.length > 0) {
				self.connect({
					callback: function() {
						while(true) {
							self._callFn(self._connectStack.shift());
							if (self._connectStack.length == 0) {
								break;
							}
						}
					}
				});
			}
		};

		socket.onmessage = function(evt) {
			self._receiveMsg(JSON.parse(evt.data));
		};

		socket.onerror = function(evt) {
			self._callFn(param['errorFn'], evt);
		};

		this._socket = socket;
	},

	_closeSocket: function(callback) {
		try {
			var self = this;
			var socket = this._socket;
			if (socket != null) {
				switch (ideal.device.platformSuf) {
					case 'wxgame':
						if (typeof callback == 'function') {
							socket.onClose(function() {
								self._callFn(callback);
							});
						}
						socket.close();
						break;
					default:
						if (typeof callback == 'function') {
							var closeFn = typeof socket.onclose == 'function' ? socket.onclose : null;
							socket.onclose = function() {
								self._callFn(closeFn);
								self._callFn(callback);
							}
						}
						socket.close();
						break;
				}
			} else {
				this._callFn(callback);
			}
		} catch (err) {
			this._errorHandle({
				type: ErrorType.SocketError,
				message: err.stack,
			});
		}
	},

	_sendMsg: function(data) {
		if (typeof data == 'undefined') {
			data = {};
		}

		if (this._status != SocketStatus.Connected) {
			this._errorHandle({
				type: ErrorType.SendError,
				message: '连接器非连接状态，或与服务器断开；无法发送！'
			});
			return;
		}

		try {
			// 兼容框架Debug模式下打印发送数据
			if (ideal.config.debug == true) {
				var notlog = [1].concat(ideal._pcfg.notlog_send || []);
				if (notlog.indexOf(data.cmd) == -1) {
					var key, keys = ideal.util.okeys(ideal.cmd, data.cmd);
					if (keys.length > 1) {
						for (var i in keys) {
							if (keys[i].startsWith(this._name)) {
								key = keys[i]; break;
							}
						}
					}
					if (key == null) {
						key = keys[0] ? keys[0] : data.cmd;
					}
					ideal.log_net(`%c[${this._name}] 发送: cmd=${key}`, ideal.Log.Adopt);
				}
			}

			switch (ideal.device.platformSuf) {
				case 'wxgame':
					this._socket.send({ data: JSON.stringify(data) });
					break;
				default:
					this._socket.send(JSON.stringify(data));
					break;
			}
		} catch (err) {
			this._errorHandle({
				type: ErrorType.SendError,
				message: err.stack,
			});
		}
	},

	/**
	 * 接收服务器推送消息, 并做解析
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @param    {string}        buffer 接收到的消息内容
	 * @return   {void}
	 */
	_receiveMsg: function(data) {
		try {
			if (data.cmd == 1) {
				ideal.emit(ideal.Event.NetHeartBeat, null, this._heartbeat);
			} else {
				// 兼容CMD值相同键不同的需求, 优先选用连接器名称做前缀的Key
				var key, keys = ideal.util.okeys(ideal.cmd, data.cmd);
				if (keys.length > 1) {
					for (var i in keys) {
						if (keys[i].startsWith(this._name)) {
							key = keys[i]; break;
						}
					}
				}
				if (key == null) {
					key = keys[0] ? keys[0] : data.cmd;
				}

				// 兼容框架Debug模式下打印接收数据
				if (ideal.config.debug == true) {
					var notlog = [1].concat(ideal._pcfg.notlog_recv || []);
					if (notlog.indexOf(data.cmd) == -1) {
						ideal.log_net(`%c[${this._name}] 接收: cmd=${key}`, 'color:#ea681c');
						ideal.log_net(data);
					}
				}

				// 刷新心跳包
				this._heartbeat.refresh();

				if (typeof key == 'string') {
					Service.parseMsg(key, data);
				} else {
					ideal.warn(`警告: [${this._name}] 中没有找到"${data.cmd}"接收指令.`);
				}
			}
		} catch (err) {
			this._errorHandle({
				type: ErrorType.ReceiveError,
				message: err.stack,
			});
		}
	},

	/**
	 * 异常处理
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @param    {object}   detail 异常细节对象
	 * @return   {void}
	 */
	_errorHandle: function(detail) {
		var errTitle = null;
		switch (detail.type) {
			case ErrorType.SocketError:
				errTitle = '## 连接器异常[Socket] ##\n';
				break;
			case ErrorType.ReceiveError:
				errTitle = '## 连接器异常[接收数据] ##\n';
				break;
			case ErrorType.SendError:
				errTitle = '## 连接器异常[发送数据] ##\n';
				break;
			default:
				errTitle = '## 连接器异常 ##\n';
				break;
		}
		ideal.error(errTitle, detail.message);
	},

	/**
	 * 验证指定函数是否为Function并执行
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @param    {function}       fn     待执行函数
	 * @param    {object|array}   params 传参数组
	 * @return   {void}
	 */
	_callFn: function(fn, params) {
		if (typeof fn == 'function') {
			if (typeof params != 'undefined') {
				if (params instanceof Array == false) {
					params = [params];
				}
				fn.apply(this, params);
			} else {
				fn();
			}
		}
	},

	/*############# Loading #############*/

	/**
	 * 显示Loading
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @param    {number}       delay 延迟显示时间, 单位毫秒
	 * @return   {void}
	 */
	_showLoading: function(delay) {
		if (typeof delay != 'number') {
			delay = 0;
		}
		var loadingKey = ideal.util.format('{0}[{1}]', iConnector.LoadingKey, this._name);
		if (delay > 0) {
			this._stid_loading = setTimeout(function() {
				ideal.util.showLoading(loadingKey);
			}, delay);
		} else {
			ideal.util.showLoading(loadingKey);
		}
	},

	/**
	 * 隐藏Loading
	 * @Author   Zjw
	 * @DateTime 2018-08-15
	 * @return   {void}
	 */
	_hideLoading: function() {
		if (this._stid_loading > 0) {
			clearTimeout(this._stid_loading);
			this._stid_loading = 0;
		}
		var loadingKey = ideal.util.format('{0}[{1}]', iConnector.LoadingKey, this._name);
		ideal.util.hideLoading(loadingKey);
	},
});

// compatible
(function(_proto) {
	_proto.__defineGetter__('name', function() {
		ideal.warn(`警告: 连接器的"name"属性即将废弃, 请使用"getName()"获取.`);
		return this._name;
	});
	_proto.__defineGetter__('socket', function() {
		ideal.warn(`警告: 连接器的"socket"属性即将废弃, 请使用"getSocket()"获取.`);
		return this._socket;
	});
	_proto.__defineGetter__('serverUrl', function() {
		ideal.warn(`警告: 连接器的"serverUrl"属性即将废弃, 请使用"getNetworkUrl()"获取.`);
		return this._networkUrl;
	});
	_proto.__defineGetter__('state', function() {
		ideal.warn(`警告: 连接器的"state"属性即将废弃, 请使用"getStatus()"获取.`);
		return this._status;
	});
	_proto.__defineGetter__('__securityLevel', function() {
		ideal.warn(`警告: 连接器的"__securityLevel"属性即将废弃, 请使用"getSecurityLevel()"获取.`);
		return this._securityLevel;
	});

	_proto.sendMsg = function(data) {
		ideal.warn(`警告: 连接器的"sendMsg()"即将废弃, 请使用"send()"[参数1传入true将不走Service].`);
		this._sendMsg(data);
	};

	var connect = function() {
		var param = {};

		if (arguments.length == 1) {
			if (typeof arguments[0] == 'object') {
				param = arguments[0];
			}
			else if (typeof arguments[0] == 'function') {
				param['callback'] = arguments[0];
			}
		}

		if (typeof arguments[0] == 'string') {
			param['networkUrl'] = arguments[0];
			if (typeof arguments[1] == 'function') {
				param['callback'] = arguments[1];
			}
			if (typeof arguments[2] == 'boolean') {
				param['isNetSecurityStrengthen'] = arguments[2];
			}
		}

		return param;
	};

	_proto.__compatibleApi = function() {
		switch(this) {
			case 'connect':
				return connect.apply(_proto, arguments);
		}
	};
})(iConnector.prototype);

ideal['iConnector'] = iConnector;
