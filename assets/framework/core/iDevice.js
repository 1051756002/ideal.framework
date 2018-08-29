var _cache = [];
var getPlatform = function() {
	if (_cache.length == 0) {
		_cache = [cc.sys.os];
		if (CC_JSB) {
			_cache.push('jsb');
		} else {
			if (typeof wx == 'object') {
				// 微信小游戏
				if (wx.getFileSystemManager) {
					_cache.push('wxgame');
				}
				// 微信H5
				else {
					_cache.push('wxweb');
				}
			} else {
				// 普通H5
				_cache.push('web');
			}
		}
	}
	return _cache;
};

var device = {};

/**
 * 获取设备信息
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @return   {object}   设备信息
 */
device.getSystemInfoSync = function() {
	var systemInfo = {
		brand: '',			// 手机品牌
		model: '',			// 手机型号
		wxVersion: '',		// 微信版本号
		system: '',			// 操作系统版本
		platform: '',		// 客户端平台
		wxSDKVersion: '',	// 微信SDK版本号
	};
	if (ideal.device.platformSuf == 'wxgame') {
		var wxInfo = wx.getSystemInfoSync();
		systemInfo.brand = wxInfo.brand;
		systemInfo.model = wxInfo.model;
		systemInfo.wxVersion = wxInfo.version;
		systemInfo.system = wxInfo.system;
		systemInfo.platform = wxInfo.platform;
		systemInfo.wxSDKVersion = wxInfo.SDKVersion;
	}
	return systemInfo;
};

/**
 * 获取网络类型
 * WiFi: WiFi网络
 * 2G: 2G网络
 * 3G: 3G网络
 * 4G: 4G网络
 * none: 无网络
 * unknown: Android 下不常见的网络类型
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @param    {function} fn 回调函数
 */
device.getNetworkType = function(fn) {
	if (this.platformSuf == 'wxgame') {
		wx.getNetworkType({
			complete: function(e) {
				if (e.errMsg && e.errMsg == 'getNetworkType:ok') {
					ideal.callFn(fn, e.networkType);
				} else {
					ideal.callFn(fn, null);
				}
			}
		});
	} else {
		ideal.warn(`onNetworkStatusChange 暂不支持：${this.platformSuf}`);
		// 未知
		ideal.callFn(fn, null);
	}
};

/**
 * 监听网络状态变化事件
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @param    {function} fn 回调函数
 */
device.onNetworkStatusChange = function(fn) {
	if (this.platformSuf == 'wxgame') {
		wx.onNetworkStatusChange(fn);
	} else {
		ideal.warn(`onNetworkStatusChange 暂不支持：${this.platformSuf}`);
	}
};

/**
 * 获取设备电量
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @param    {function} fn 回调函数
 */
device.getBatteryInfo = function(fn) {
	if (this.platformSuf == 'wxgame') {
		// 微信sdk1.7.3以上才支持
		if (wx.getBatteryInfo) {
			wx.getBatteryInfo({
				success: function(e) {
					// 由于有些版本可能不支撑，isCharging可能为undefined
					ideal.callFn(fn, {
						// 电量
						level: e.level,
						// 是否充电 undefined 表示未知
						isCharging: e.isCharging
					});
				},
				fail: function() {
					// 接口调用失败
					ideal.callFn(fn, null);
				}
			});
		} else {
			ideal.warn(`getBatteryInfo 不支持：1.7.3以下的微信SDK版本`);
		}
	} else {
		ideal.warn(`getBatteryInfo 暂不支持：${this.platformSuf}`);
	}
};

/**
 * 完整平台标识
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @return   {string}
 */
device.__defineGetter__('platform', function() {
	return getPlatform().join('-');
});

/**
 * 平台标识后缀 (jsb wxgame wxweb web ...)
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @return   {string}
 */
device.__defineGetter__('platformSuf', function() {
	return getPlatform()[1];
});

/**
 * 平台标识前缀 (Android iOS Windows ...)
 * @Author   Zjw
 * @DateTime 2018-08-28
 * @return   {string}
 */
device.__defineGetter__('platformPrefix', function() {
	return getPlatform()[0];
});

module.exports = device;
