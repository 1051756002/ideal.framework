var _define = {
	name: 'ideal-framework',

	/**
	 * 调试模式
	 * @type {Boolean}
	 */
	debug: true,

	/**
	 * 调试登记, 决定日志输出
	 * 1: 系统日志
	 * 2: 系统日志, 通讯日志
	 * 3: 系统日志, 通讯日志, 常用日志
	 * @type {Number}
	 */
	debugLevel: 3,

	/**
	 * 启用数据缓存
	 * @type {Boolean}
	 */
	enableDataCache: true,

	/**
	 * 启用心跳日志打印
	 * @type {Boolean}
	 */
	enableHeartBeatLog: true,

	/**
	 * 框架版本号
	 * @type {String}
	 */
	version: '2.0.0',

	/**
	 * 界面设计尺寸
	 * @type {Number}
	 */
	designWidth: 1136,
	designHeight: 640,

	/**
	 * 启用iPhoneX样式兼容(顶部的暂用面积)
	 * @type {Boolean}
	 */
	enablePhoneXCompatible: false,

	/**
	 * 依赖加载
	 * @type {Object}
	 */
	dependLoaded: {
		prefab: [],
		js: [],
	},

	/**
	 * 模块启用状态集合
	 * @type {Object}
	 */
	modules: {
	},
};

var config = {};
for (var i in _define) {
	(function(i) {
		config.__defineGetter__(i, function() {
			return _define[i];
		});
	})(i);
};

module.exports = config;
