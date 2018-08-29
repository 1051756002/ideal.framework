var ideal = window.ideal = {};

// ############# 兼容JS部分API #############
(function(ideal) {
	// 禁止引擎日志输出
	window.console.timeEnd = function() {};

	if (!Object.assign) {
		Object.defineProperty(Object, 'assign', {
			enumerable: false,
			configurable: true,
			writable: true,
			value: function(target, firstSource) {
				'use strict';
				if (target === undefined || target === null) {
					throw new TypeError('Cannot convert first argument to object');
				}
				var to = Object(target);
				for (var i = 1; i < arguments.length; i++) {
					var nextSource = arguments[i];
					if (nextSource === undefined || nextSource === null) {
						continue;
					}
					var keysArray = Object.keys(Object(nextSource));
					for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
						var nextKey = keysArray[nextIndex];
						var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
						if (desc !== undefined && desc.enumerable) {
							to[nextKey] = nextSource[nextKey];
						}
					}
				}
				return to;
			}
		});
	}
})(ideal);


// ############# 配置模块 #############
(function(ideal) {
	// 框架配置文件
	ideal.config = require('./core/iConfig');

	// 设备和平台信息
	ideal.device = require('./core/iDevice');

	// 框架设置, 存至LocalStorage
	var setting = cc.sys.localStorage.getItem('ideal-setting');
	if (setting == null || setting.length == 0) {
		cc.sys.localStorage.setItem('ideal-setting', JSON.stringify({
			/**
			 * 背景音乐 1:开 0:关
			 * @type {Number}
			 */
			music: 1,

			/**
			 * 游戏音效 1:开 0:关
			 * @type {Number}
			 */
			effect: 1,
		}));
	}
})(ideal);


// ############# 日志模块 #############
(function(ideal) {
	var _emptyFn = new Function;
	// 正常日志打印
	ideal.log = _emptyFn;
	// 网络日志打印
	ideal.log_net = _emptyFn;
	// 系统日志打印
	ideal.log_sys = _emptyFn;
	// 警告日志
	ideal.warn = _emptyFn;
	// 错误日志
	ideal.error = _emptyFn;

	// 日志初始化 - 默认平台
	function initToDefault() {
		if (ideal.config.debug == true) {
			if (ideal.config.debugLevel == 1) {
				ideal.log_sys = console.log.bind(console);
			}
			else if (ideal.config.debugLevel == 2) {
				ideal.log_net = console.log.bind(console);
				ideal.log_sys = console.log.bind(console);
			}
			else if (ideal.config.debugLevel == 3) {
				ideal.log = console.log.bind(console);
				ideal.log_net = console.log.bind(console);
				ideal.log_sys = console.log.bind(console);
			}
			ideal.warn = console.warn.bind(console);
			ideal.error = console.error.bind(console);
		}
	}

	// 日志初始化 - 微信小游戏平台
	function initToWechatGame() {
		if (ideal.config.debug == true) {
			var dofunc = function() {
			    var args = [];
			    for (var i = 0; i < arguments.length; i++) {
			        args.push(arguments[i]);
			    }
				var str = args[0];
				if (typeof str == 'string' && str.startsWith('%c')) {
					args[0] = str.substr(2);
					args.splice(1, 1);
				}
				console.log.apply(console, args);
			};

			if (ideal.config.debugLevel == 1) {
				ideal.log_sys = dofunc;
			}
			else if (ideal.config.debugLevel == 2) {
				ideal.log_net = dofunc;
				ideal.log_sys = dofunc;
			}
			else if (ideal.config.debugLevel == 3) {
				ideal.log = dofunc;
				ideal.log_net = dofunc;
				ideal.log_sys = dofunc;
			}
			ideal.warn = console.warn.bind(console);
			ideal.error = console.error.bind(console);
		}
	}

	switch(ideal.device.platformSuf) {
		case 'wxgame':
			initToWechatGame();
			break;
		default:
			initToDefault();
			break;
	}

	ideal.Log = {
		/**
		 * 警告
		 * @type {String}
		 */
		Warn: 'color:#e6b74d',

		/**
		 * 异常
		 * @type {String}
		 */
		Error: 'color:#f00',

		/**
		 * 通过
		 * @type {String}
		 */
		Adopt: 'color:#0fe029',

		/**
		 * 淡绿
		 * @type {String}
		 */
		LightGreen: 'color:#31dcad',

		/**
		 * 弱体
		 * @type {String}
		 */
		Slight: 'color:#999999',
	};
})(ideal);


// ############# 公用方法模块 #############
(function(ideal) {
	/**
	 * 执行指定函数 (非function不会执行)
	 * @Author   Zjw
	 * @DateTime 2018-08-28
	 */
	ideal.callFn = function(fn) {
		var args = [];
		for (var i = 1; i < arguments.length; i++) {
			args[i] = arguments[i];
		}

		if (typeof fn == 'function') {
			return fn.apply(fn, args);
		}
	};

	ideal.util = window.iUtil = require('./util/iUtil');
})(ideal);


// ############# 事件管理模块 #############
(function(ideal) {
	ideal.Event = require('./core/iEvent');

	/**
	 * 触发事件
	 * @Author   Zjw
	 * @DateTime 2018-05-09
	 * @param    {string|array}             types    需要通知的事件, 支持多个事件同时通知
	 * @param    {object}                   data     传参
	 * @param    {object}                   thisObj  This作用域
	 * @return   {boolean}
	 */
	ideal.emit = function(types, data, thisObj) {
		if (!types) {
			return false;
		}

		var type_arr = [];
		if (typeof types == 'number') {
			types = types.toString();
		}
		if (typeof types == 'string') {
			type_arr = types.split(',');
		} else {
			type_arr = types.slice();
		}

		if (type_arr.length == 0) {
			return false;
		}

		type_arr.forEach(function(type) {
			ideal.Event.triggerEvent(type, data, thisObj);
		}, this);
		return true;
	};

	/**
	 * 监听事件
	 * @Author   Zjw
	 * @DateTime 2018-05-09
	 * @param    {string|array}             types    需要监听的事件，支持多个事件同时监听
	 * @param    {function}                 selector 监听的函数
	 * @param    {object}                   thisObj  This作用域
	 * @return   {boolean}
	 */
	ideal.on = function(types, selector, thisObj) {
		if (!types) {
			return false;
		}

		let type_arr = [];
		if (typeof types == 'number') {
			types = types.toString();
		}
		if (typeof types == 'string') {
			type_arr = types.split(',');
		} else {
			type_arr = types.slice();
		}

		if (type_arr.length == 0) {
			return false;
		}

		type_arr.forEach(function(type) {
			ideal.Event.addEventListener(type, selector, thisObj);
		}, this);
		return true;
	};

	/**
	 * 移除监听事件
	 * @Author   Zjw
	 * @DateTime 2018-05-09
	 * @param    {String|Array}             types    需要移除监听的事件, 支持多个事件同时移除
	 * @param    {Function}                 selector 监听的函数
	 * @param    {Object}                   thisObj  This作用域
	 * @return   {Boolean}
	 */
	ideal.off = function(types, selector, thisObj) {
		if (!types) {
			return false;
		}

		let type_arr = [];
		if (typeof types == 'number') {
			types = types.toString();
		}
		if (typeof types == 'string') {
			type_arr = types.split(',');
		} else {
			type_arr = types.slice();
		}

		if (type_arr.length == 0) {
			return false;
		}

		type_arr.forEach(function(type) {
			ideal.Event.removeEventListener(type, selector, thisObj);
		}, this);
		return true;
	};

	/**
	 * 释放节点上绑定的所有事件
	 * @Author   Zjw
	 * @DateTime 2018-06-15
	 * @param    {cc.Node}                 node 节点对象
	 */
	ideal.releaseNode = function(node) {
		var eventPools = ideal.Event._pools;
		for (var t in eventPools) {
			for (var i = eventPools[t].length - 1; i > -1; i--) {
				if (typeof node == 'undefined' || eventPools[t][i].thisObj === node) {
					var fname = eventPools[t][i].selector.name || '匿名函数';
					ideal.log(`%c释放: ${fname}`, ideal.Log.Slight);
					eventPools[t].splice(i, 1);
				}
			}
			if (eventPools[t].length == 0) {
				delete eventPools[t];
			}
		}
	};

	/**
	 * 释放项目中的所有事件监听 (框架事件不移除)
	 * @Author   Zjw
	 * @DateTime 2018-06-15
	 */
	ideal.releaseProject = function() {
		var eventPools = ideal.Event._pools;
		for (var t in eventPools) {
			for (var i = eventPools[t].length - 1; i > -1; i--) {
				if (ideal.util.okey(ideal.Event.EventEnum, t) == null) {
					var fname = eventPools[t][i].selector.name || '匿名函数';
					ideal.log(`%c释放: ${fname}`, ideal.Log.Slight);
					eventPools[t].splice(i, 1);
				}
			}

			if (eventPools[t].length == 0) {
				delete eventPools[t];
			}
		}
	};

	// 注册系统事件
	var lasttime = 0;
	cc.game.on(cc.game.EVENT_SHOW, function () {
		var nowtime = Date.now();
		ideal.log_sys(`%c程序恢复正常运行, 本次休眠${nowtime - lasttime}ms`, ideal.Log.LightGreen);
		ideal.emit(ideal.Event.ApplicationResume, nowtime - lasttime);
		lasttime = nowtime;
	});
	cc.game.on(cc.game.EVENT_HIDE, function () {
		lasttime = Date.now();
		ideal.log_sys(`%c程序切换到后台运行...`, ideal.Log.LightGreen);
		ideal.emit(ideal.Event.ApplicationPause);
	});
})(ideal);


// ############# 多媒体模块 #############
(function(ideal) {
	/**
	 * 声音管理类
	 * @type {iSound}
	 */
	ideal.sound = require('./core/iSound');

	/**
	 * 语音管理类
	 * @type {iVoice}
	 */
	ideal.voice = require('./core/iVoice');
})(ideal);


// ############# 网络模块 #############
(function(ideal) {

})(ideal);


// ############# 屏蔽多点触控效果 #############
(function(ideal) {
	cc.Node.maxTouchNum = 1;
	cc.Node.touchNum = 0;

	var _stid_testing = 0;
	var activeTesting = function(node) {
		// 事件被停用, 业务层执行cc.Node.pauseSystemEvents后会停用所有事件的响应
		// var listeners = cc.eventManager._nodeListenersMap[node.__instanceId];
		// for (var i in listeners) {
		// 	if (listeners[i]._paused === true) {
		// 		cc.Node.touchNum--;
		// 		return;
		// 	}
		// }
		// 节点被隐藏后会导致其他事件不响应
		var isActive = function(node) {
			if (node instanceof cc.Scene) {
				return true;
			}
			if (node.parent) {
				return node.active == true && isActive(node.parent);
			} else {
				return node.active;
			}
		}
		if (isActive(node) == false || node._updateSingleEvent == true) {
			delete node._updateSingleEvent;
			cc.Node.touchNum--;
			return;
		}
		_stid_testing = setTimeout(function() {
			activeTesting(node)
		}, 50);
	};

	var __dispatchEvent__ = cc.Node.prototype.dispatchEvent;
	cc.Node.prototype.dispatchEvent = function(ev) {
	    switch (ev.type) {
	        case 'touchstart':
	            if (cc.Node.touchNum < cc.Node.maxTouchNum) {
	            	activeTesting(this);
	                cc.Node.touchNum++;
	                this._canTouch = true;
	                __dispatchEvent__.call(this, ev);
	            }
	            break;
	        case 'touchmove':
	            if (!this._canTouch && cc.Node.touchNum < cc.Node.maxTouchNum) {
	            	activeTesting(this);
	                this._canTouch = true;
	                cc.Node.touchNum++;
	            }
	            if (this._canTouch) {
	                __dispatchEvent__.call(this, ev);
	            }
	            break;
	        case 'touchend':
	            if (this._canTouch) {
	            	clearTimeout(_stid_testing);
	                this._canTouch = false;
	                cc.Node.touchNum--;
	                __dispatchEvent__.call(this, ev);
	            }
	            break;
	        case 'touchcancel':
	            if (this._canTouch) {
	            	clearTimeout(_stid_testing);
	                this._canTouch = false;
	                cc.Node.touchNum--;
	                __dispatchEvent__.call(this, ev);
	            }
	            break;
	        default:
	            __dispatchEvent__.call(this, ev);
	    }
	};
})(ideal);


// ############# 广告反劫持 #############
(function(ideal) {
	if (!cc.sys.isBrowser) {
		return;
	}
	var timeout = 30000;
	var firsttime = Date.now();
	var siid = setInterval(function() {
		var hijacks = [/^chunasqwd.*?/, /.*?scripts.*?/];
		var children = document.body.children;
		var hijackCount = 0;
		for (var i = 0; i < children.length; i++) {
			for (var j in hijacks) {
				if (hijacks[j].test(children[i].id)) {
					hijackCount++;
					children[i].remove();
					break;
				}
			}
		}
		if (hijackCount > 0) {
			clearInterval(siid);
			ideal.log(`%c广告已被反劫持, 捕获${hijackCount}个节点.`, ideal.Log.Adopt);
		}
		if (Date.now() - firsttime > timeout) {
			clearInterval(siid);
			ideal.log(`%c广告反劫持${timeout/100}秒, 未检测到不良节点.\n已停止检测`, ideal.Log.Slight);
		}
	}, 100);
})(ideal);


// ############# 框架启动模块 #############
(function(ideal) {
	var _callback = null;
	var _initialize = false;

	/**
	 * 初始化架构
	 * @Author   Zjw
	 * @DateTime 2018-04-28
	 * @param    {function}               callback 执行完成后的调回函数, 如果框架已启动则直接回调
	 * @return   {void}
	 */
	ideal.init = function(callback) {
		if (_initialize) {
			ideal.callFn(callback);
		} else {
			ideal.log_sys('%cideal framework initialization begin.', ideal.Log.Adopt);
			_callback = callback;
			_initialize = true;
			cc.sys.isBrowser ? loadDependent() : loadComplete();
		}
	};

	/**
	 * 用于判断框架是否已经启动
	 * @type {Boolean}
	 */
	ideal.__defineGetter__('enable', function() {
		return _initialize;
	});

	var loadDependent = function() {
		loadDependentScripts();
	};

	var loadDependentScripts = function() {
		var jss = ideal.config.dependLoaded['js'];
		var f = function(i = 0) {
			if (i >= jss.length) {
				loadDependentPrefabs();
			} else {
				ideal.log_sys(`%c加载依赖脚本: ${jss[i]}`, ideal.Log.Slight);
				iUtil.loadJavaScript(jss[i], function() {
					f(i + 1);
				});
			}
		}; f();
	};

	var loadDependentPrefabs = function() {
        var prefabs = ideal.config.dependLoaded['prefab'];
        if (prefabs.length > 0) {
            var loaded = 0;
            for (var i in prefabs) {
                var pname, pidx;
                if (prefabs[i] instanceof Array) {
                    pname = prefabs[i][0];
                    pidx = prefabs[i][1];
                } else {
                    pname = prefabs[i];
                    pidx = 0;
                }

                var path = './framework/prefab/' + pname;
                cc.loader.loadRes(path, function(err, prefab) {
                    if (err) {
                        ideal.warn(`警告: "${path}"依赖文件加载失败`);
                        return;
                    }
                    loaded++;
                    var node = cc.instantiate(prefab);
                    cc.director.getScene().addChild(node, pidx);
                    cc.game.addPersistRootNode(node);
                    ideal.log_sys(`%c常驻节点载入 ${node.name}`, ideal.Log.Slight);

                    if (loaded == prefabs.length) {
                        loadComplete();
                    }
                });
            };
        } else {
            loadComplete();
        }
	};

	var loadComplete = function() {
		// ideal.data.init();
		ideal.sound.init();
		ideal.voice.init();

		ideal.log_sys(`%cVersion: ${ideal.config.version}`, ideal.Log.Adopt);
		ideal.log_sys(`%cDebugModel: ${ideal.config.debug}\n`, ideal.Log.Adopt);
		ideal.log_sys(`%cideal framework initialization end.`, ideal.Log.Adopt);

		if (ideal.config.debug == true) {
			ideal.callFn(_callback);
		} else {
			// 微信小游戏
			if (ideal.device.platformSuf == 'wxgame') {
				wx.getSystemInfo({
					success: function(e) {
						var toValue = function(v) {
							var arr = v.split('.');
							arr.splice(3);
							for (var i = arr.length; i < 3; i++) {
								arr.push('0');
							}
							for (var i = 0; i < arr.length; i++) {
								for (var j = arr[i].length; j < 3; j++) {
									arr[i] = '0' + arr[i];
								}
								arr[i] = arr[i].substr(0, 5);
							}
							return parseInt(arr.join(''));
						};

						if (toValue(e.SDKVersion) < toValue('2.0.0')) {
							ideal.util.tips('您的微信版本过低，请及时更新！', function() {
								wx.exitMiniProgram();
							});
						} else {
							ideal.callFn(_callback);
						}
					}
				});
			}
			// 微信H5
			else if (ideal.device.platformSuf == 'wxweb') {
				ideal.callFn(_callback);
			}
			// 普通H5
			else {
				ideal.util.tips('暂不支持此浏览器，请在微信内体验！', function() {
					location.reload();
				});
			}
		}
	};

	ideal.on(ideal.Event.ApplicationPause, function() {
		ideal.sound.pauseAll();
	}, this);
	
	ideal.on(ideal.Event.ApplicationResume, function() {
		ideal.sound.resumeAll();
	}, this);
})(ideal);
