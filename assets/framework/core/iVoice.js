var compatibles = {
	'web': null,
	'wxweb': null,
	'wxgame': null,
};

var subject = {
	_enableMusic: true,
	_enableEffect: true,
};

/**
 * 初始化语音模块
 * @Author   Zjw
 * @DateTime 2018-08-29
 */
subject.init = function() {
	// 从框架设置中获取开关状态
	var setting = JSON.parse(cc.sys.localStorage.getItem('ideal-setting'));
	this._enableMusic = setting.music == 1;
	this._enableEffect = setting.effect == 1;

	var master = compatibles[ideal.device.platformSuf];
	if (master == null) {
		ideal.warn(`警告: ideal.voice初始化失败, 不支持"${ideal.device.platformSuf}"平台`);
	} else {
		for (var i in master) {
			this[i] = master[i];
		}
		this.init();
		ideal.log_sys(`%cideal.voice初始化完成`, ideal.Log.Slight);
	}
};

/**
 * 语音事件类型
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.__defineGetter__('Event', function() {
	return {
		/**
		 * 录音完成事件
		 * @type {string}
		 */
		RecordComplete: 'voice.record.complete',

		/**
		 * 播放完成事件
		 * @type {string}
		 */
		PlayComplete: 'voice.play.complete',
	};
});

module.exports = subject;

/**
 * 兼容微信H5
 * @Author   Zjw
 * @DateTime 2018-08-29
 * @return   {[type]}   [description]
 */
(function() {
	var voice = {};

	voice.init = function() {

	};

	for (var i = 0; i < arguments.length; i++) {
		compatibles[arguments[i]] = voice;
	}
})('wxweb');

/**
 * 兼容微信小游戏
 * @Author   Zjw
 * @DateTime 2018-08-29
 */
(function() {
	var voice = {};
	// 录音功能是否被授权
	var isAuthor = null;
	// 标记, 取消本次录音
	var flagCancelRecord = false;
	// 标记, 正在录音中
	var flagRecording = false;
	// 录音管理器
	var recorderManager = null;
	// 录音超时设置上限, 单位秒
	var timeoutLimit = 50;
	// 上传文件地址
	var uploadFilePath = '';
	// 上传文件参数
	var uploadFileParam = {};
	var _uid, _skey;

	voice.init = function() {
		recorderManager = wx.getRecorderManager();
		wx.getSetting({
			success: function(res) {
				isAuthor = res.authSetting['scope.record'];
			},
			fail: function(err) {
				ideal.error('异常: ' + err.errMsg);
			}
		});
		voice.bindEvents();
	};

	/**
	 * 设置上传文件的地址
	 * @Author   Zjw
	 * @DateTime 2018-08-22
	 * @param    {string}   path 地址
	 * @param    {object}   data 参数对象
	 */
	voice.setPath = function(path, data) {
		uploadFilePath = path;
		_uid = data.uid;
		_skey = data.skey;
	};

	/**
	 * 设置上传文件的参数
	 * @Author   Zjw
	 * @DateTime 2018-08-22
	 * @param    {object}   param 参数对象
	 */
	voice.setParam = function(param) {
		// '{"roomid":11111, "suffix": "mp3"}';
		uploadFileParam = param;
	};

	voice.bindEvents = function() {
		recorderManager.onStart(function(res) {
			// 初始化录音标记
			flagCancelRecord = false;
			// 标记为正在录音中
			flagRecording = true;
		});

		recorderManager.onError(function(err) {
			// 标记为非录音状态
			flagRecording = false;
			ideal.error('录音异常: ' + err.errMsg);
		});

		recorderManager.onStop(function(res) {
			// 标记为非录音状态
			flagRecording = false;

			if (flagCancelRecord == true) {
				flagCancelRecord = false;
				ideal.log('取消录音');
				return;
			}

			var tempFilePath = res.tempFilePath;
			wx.uploadFile({
				url: voice.uploadFilePath,
				filePath: tempFilePath,
				name: 'ideal-record',
				header: {
					'content-type': 'multipart/form-data'
				},
				success: function(res) {
					ideal.log('上传成功');
					var data = JSON.parse(res.data);
					ideal.emit(voice.Event.RecordComplete, data.data.send_sound_url);
				},
				fail: function() {
					ideal.log('上传失败');
				},
			});
		});
	};

	/**
	 * 开始录音
	 * @Author   Zjw
	 * @DateTime 2018-08-29
	 * @param    {number}    timeout 超时时间, 单位秒 (上限为50秒)
	 * @return   {boolean}
	 */
	voice.startRecord = function(timeout) {
		if (isAuthor == false) {
			wx.openSetting({
				success: function(res) {
					isAuthor = res.authSetting['scope.record'];
				},
				fail: function(err) {
					ideal.error('异常: ' + err.errMsg);
				}
			});
			return false;
		}

		// 超时默认为30秒
		if (typeof timeout == 'undefined') {
			timeout = 30;
		}

		// 超时范围为5~50秒之间
		if (timeout > timeoutLimit) {
			timeout = timeoutLimit;
		} else if (timeout < 5) {
			timeout = 5;
		}

		recorderManager.start({
			duration: timeout * 1000,
			sampleRate: 16000,
			numberOfChannels: 1,
			encodeBitRate: 96000,
			format: 'mp3',
			frameSize: 50,
		});
		return true;
	};

	/**
	 * 结束录音
	 * @Author   Zjw
	 * @DateTime 2018-08-29
	 * @return   {boolean}
	 */
	voice.stopRecord = function() {
		if (isAuthor == false) {
			wx.openSetting({
				success: function(res) {
					isAuthor = res.authSetting['scope.record'];
				},
				fail: function(err) {
					ideal.error('异常: ' + err.errMsg);
				}
			});
			return false;
		}

		recorderManager.stop();
		return true;
	};

	/**
	 * 取消录音
	 * @Author   Zjw
	 * @DateTime 2018-08-29
	 * @return   {boolean}
	 */
	voice.cancelRecord = function() {
		if (isAuthor == false) {
			wx.openSetting({
				success: function(res) {
					isAuthor = res.authSetting['scope.record'];
				},
				fail: function(err) {
					ideal.error('异常: ' + err.errMsg);
				}
			});
			return false;
		}

		// 标记为取消本次录音
		flagCancelRecord = true;

		recorderManager.stop();
		return true;
	};

	/**
	 * 播放录音
	 * @Author   Zjw
	 * @DateTime 2018-08-29
	 * @param    {string}   url      录音文件地址
	 * @param    {function} callback 回调函数
	 */
	voice.playRecord = function(url, callback) {
		var audio = wx.createInnerAudioContext();
		audio.src = url;
		audio.autoplay = true;

		audio.onPlay(function() {
			ideal.callFn(callback);
		});

		audio.onError(function(err) {
			ideal.error('异常: ' + err.errMsg);
		});

		audio.onStop(function() {
			ideal.emit(subject.Event.PlayComplete, url);
		});
	};

	voice.__defineGetter__('isRecording', function() {
		return flagRecording;
	});

	voice.__defineGetter__('isPlayRecord', function() {
		return false;
	});

	voice.__defineGetter__('uploadFilePath', function() {
		var paramstr = JSON.stringify(uploadFileParam);
		var requestPath = uploadFilePath;

		var _param = (function() {
			var _date = new Date();
			var data = {
				time: parseInt(_date.getTime() / 1000),
				ver: '1.0',
			};
			if (_uid !== 0) {
				data.uid = _uid;
			}
			if (_skey !== '') {
				data.skey = _skey;
			}
			data.sign = (function(_data) {
				var _s = ['action', 'time', 'ver', 'uid', 'skey'];
				_s.sort();
				var _msg = '';
				var _key = "Aguo@987654321_99Zv";
				for (var i = 0; i < _s.length; ++i) {
					if (_data[_s[i]]) {
						_msg += _s[i] + '=' + _data[_s[i]] + '&';
					}
				}
				_msg += 'key' + '=' + _key;
				return ideal.util.md5(_msg).toLowerCase();
			})(data);
			return data;
		})();

		requestPath = ideal.util.addUrlParam(requestPath, 'action', 'ChatSendSound_h5ver');
		requestPath = ideal.util.addUrlParam(requestPath, 'ver', '1.0');
		requestPath = ideal.util.addUrlParam(requestPath, 'uid', _param.uid);
		requestPath = ideal.util.addUrlParam(requestPath, 'skey', _param.skey);
		requestPath = ideal.util.addUrlParam(requestPath, 'sign', _param.sign);
		requestPath = ideal.util.addUrlParam(requestPath, 'param', paramstr);

		return requestPath;
	});

	for (var i = 0; i < arguments.length; i++) {
		compatibles[arguments[i]] = voice;
	}
})('wxgame');
