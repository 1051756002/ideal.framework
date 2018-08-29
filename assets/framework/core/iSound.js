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
 * 初始化声音模块
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.init = function() {
	// 从框架设置中获取开关状态
	var setting = JSON.parse(cc.sys.localStorage.getItem('ideal-setting'));
	this._enableMusic = setting.music == 1;
	this._enableEffect = setting.effect == 1;

	var master = compatibles[ideal.device.platformSuf];
	if (master == null) {
		ideal.warn(`警告: ideal.sound初始化失败, 不支持"${ideal.device.platformSuf}"平台`);
	} else {
		for (var i in master) {
			this[i] = master[i];
		}
		ideal.log_sys(`%cideal.sound初始化完成`, ideal.Log.Slight);
	}
};

/**
 * 声音播放类型
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.__defineGetter__('Type', function() {
	return {
		/**
		 * 游戏音效
		 * @type {number}
		 */
		Effect: 1,

		/**
		 * 背景音乐
		 * @type {number}
		 */
		Music: 2,
	};
});

/**
 * 声音播放状态
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.__defineGetter__('State', function() {
	return {
		/**
		 * 异常状态
		 * @type {number}
		 */
		ERROR: -1,

		/**
		 * 正在初始化中
		 * @type {number}
		 */
		INITIALZING: 0,

		/**
		 * 正在播放中
		 * @type {number}
		 */
		PLAYING: 1,

		/**
		 * 已暂停播放
		 * @type {number}
		 */
		PAUSED: 2,
	};
});

/**
 * WebAudio实例化的最大上限
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.__defineGetter__('maxAudioInstance', function() {
	return 24;
});

/**
 * 背景音乐开关状态
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.__defineGetter__('EnableMusic', function() {
	return subject._enableMusic;
});

/**
 * 背景音乐开关状态
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.__defineGetter__('enableMusic', function() {
	ideal.warn('警告: "ideal.sound.enableMusic"即将废弃, 请使用"ideal.sound.EnableMusic"');
	return subject._enableMusic;
});

/**
 * 游戏音效开关状态
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.__defineGetter__('EnableEffect', function() {
	return subject._enableEffect;
});

/**
 * 游戏音效开关状态
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
subject.__defineGetter__('enableEffect', function() {
	ideal.warn('警告: "ideal.sound.enableEffect"即将废弃, 请使用"ideal.sound.EnableEffect"');
	return subject._enableEffect;
});

module.exports = subject;

/**
 * 兼容微信H5
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
(function() {
	var sound = {};
	var musicId = -1;
	var pauseIdCache = [];

	/**
	 * 播放声音
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {String|Object}          config 支持配置模式和地址模式
	 * @param    {Boolean}                isLoop 是否循环播放
	 * @return   {Number}                        当前播放的声音ID
	 */
	sound.play = function(config, loop) {
		var path, type;
		if (typeof config == 'string') {
			path = config;
			type = subject.Type.Effect;
		} else {
			path = config.url || '';
			type = config.type || subject.Type.Effect;
		}

		if (path.startsWith('db:')) {
			path = cc.url.raw(`resources/${path.substr(3)}`);
		}
		if (!path.endsWith('.mp3')) {
			path += '.mp3';
		}

		if (type == subject.Type.Effect) {
			if (!subject.EnableEffect) {
				return;
			}
		}

		if (type == subject.Type.Music) {
			if (!subject.EnableMusic) {
				return;
			}

			// 相同背景音乐不需要重复播放
			var audio = getAudioFromId(musicId);
			if (audio && audio.src == path) {
				return;
			} else {
				this.stop(musicId);
			}
		}

		var audio = getAudioFromPath(path, type);

		if (type == subject.Type.Music) {
			musicId = audio.instanceId;
		}

		var callback = function() {
			audio.setLoop(loop || false);
			audio.play();
			audio.bindEnded();
			audio.emit('play');
			initTouchPlayQueue();
		};
		audio.__callback = callback;
		audio.on('load', callback);
		audio.preload();

		return audio.instanceId;
	};

	/**
	 * 暂停指定声音
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Number}                 id 声音ID
	 */
	sound.pause = function(id) {
		var audio = getAudioFromId(id);
		if (!audio || !audio.pause) {
			return false;
		}
		if (audio.getState() != subject.State.PLAYING) {
			return false;
		}
		audio.unbindEnded();
		audio.pause();
		audio.emit('pause');
		return true;
	};

	/**
	 * 暂停所有声音播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.pauseAll = function() {
		for (var id in id2audio) {
			if (this.pause(id)) {
				pauseIdCache.push(id);
			}
		}
	};

	/**
	 * 恢复指定声音
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Number}                 id 声音ID
	 */
	sound.resume = function(id) {
		var audio = getAudioFromId(id);
		if (!audio || !audio.play) {
			return false;
		}
		audio.play();
		audio.bindEnded();
		audio.emit('resume');
		return true;
	};

	/**
	 * 恢复所有声音播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.resumeAll = function() {
		while (pauseIdCache.length > 0) {
			var id = pauseIdCache.pop();
			this.resume(id);
		}
	};

	/**
	 * 停止指定声音
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Number}                 id 声音ID
	 */
	sound.stop = function(id) {
		var audio = getAudioFromId(id);
		if (!audio || !audio.pause) {
			return false;
		}
		audio.off('load', audio.__callback);
		audio.pause();
		audio.emit('stop');
		return true;
	};

	/**
	 * 停止所有声音播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.stopAll = function() {
		for (var id in id2audio) {
			this.stop(id);
		}
	};

	sound.setVolume = function(id, volume) {
		var audio = getAudioFromId(id);
		if (!audio || !audio.setVolume) {
			return false;
		}
		audio.setVolume(volume);
		return true;
	};

	sound.setAllAudioVolume = function(volume) {
		this.setAllVolume(volume);
		ideal.warn(`警告: "ideal.sound.setAllAudioVolume"即将废弃, 请使用"ideal.sound.setAllVolume"`);
	};

	sound.setAllVolume = function(volume) {
		for (var id in id2audio) {
			this.setVolume(id, volume);
		}
	};

	/**
	 * 停止所有音效播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.stopAllEffect = function() {
		for (var id in id2audio) {
			if (id2audio[id].type === subject.Type.Effect) {
				this.stop(id);
			}
		}
	};

	/**
	 * 停止所有背景音乐播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.stopAllMusic = function() {
		for (var id in id2audio) {
			if (id2audio[id].type === subject.Type.Music) {
				this.stop(id);
			}
		}
	};

	/**
	 * 设置背景音乐开关
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Boolean}                 op 开关
	 */
	sound.settingMusic = function(op) {
		let setting = JSON.parse(cc.sys.localStorage.getItem('ideal-setting'));
		subject._enableMusic = !!op;
		setting.music = !!op ? 1 : 0;
		cc.sys.localStorage.setItem('ideal-setting', JSON.stringify(setting));
	};

	/**
	 * 设置游戏音效开关
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Boolean}                 op 开关
	 */
	sound.settingEffect = function(op) {
		let setting = JSON.parse(cc.sys.localStorage.getItem('ideal-setting'));
		subject._enableEffect = !!op;
		setting.effect = !!op ? 1 : 0;
		cc.sys.localStorage.setItem('ideal-setting', JSON.stringify(setting));
	};

	for (var i = 0; i < arguments.length; i++) {
		compatibles[arguments[i]] = sound;
	}

	// ################# WebAudio #################
	var instanceId = 1;
	var id2audio = {};
	var url2id = {};
	var iAudioContext = null;

	var touchBinded = false;
	var initTouchPlayQueue = function() {
		if (touchBinded) {
			return;
		}
		touchBinded = true;

		var playAudio = function() {
			var item;
			while (item = sound._touchPlayList.pop()) {
				item.audio.play(item.offset);
			}
		}

		cc.game.canvas.addEventListener('touchstart', playAudio);

		if (typeof WeixinJSBridge === 'undefined') {
			if (cc.game.canvas.addEventListener) {
				cc.game.canvas.addEventListener('WeixinJSBridgeReady', playAudio);
			}
		} else {
			WeixinJSBridge.invoke('getNetworkType', {}, playAudio);
		}
	};

	var getAudioFromPath = function(path, type) {
		var id = instanceId++;
		var list = url2id[path];
		if (!list) {
			list = url2id[path] = [];
		}
		if (subject.maxAudioInstance <= list.length) {
			var oldId = list.shift();
			var oldAudio = id2audio[oldId];
			oldAudio.stop();
		}

		var audio = new WebAudio();
		var callback = function() {
			var id = this.instanceId;
			delete id2audio[id];
			var index = list.indexOf(id);
			cc.js.array.fastRemoveAt(list, index);
		};
		audio.src = path;
		audio.type = type;
		audio.on('ended', callback);
		audio.on('stop', callback);
		id2audio[id] = audio;

		audio.instanceId = id;
		list.push(id);

		return audio;
	};

	var getAudioFromId = function(id) {
		return id2audio[id];
	};

	var WebAudio = cc.Class({
		name: 'iWebAudio',
		extends: cc.EventTarget,

		properties: {

		},

		ctor: function() {
			if (iAudioContext == null) {
				iAudioContext = new(window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
			} else if (iAudioContext.state == 'interrupted' || iAudioContext.state == 'suspended') {
				iAudioContext.close();
				iAudioContext = new(window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
			}

			this.context = iAudioContext;
			this.src = '';
			this.loop = false;
			this.playedLength = 0;
			this.startTime = -1;
			this.volume = 1;
			this.source = null;
			this.type = subject.Type.Effect;
			this.state = subject.State.INITIALZING;

			this._endedTimer = 0;

			this.gainObj = this.context.createGain();
			if (this.gainObj['gain'].setTargetAtTime) {
				this.gainObj['gain'].setTargetAtTime(this.volume, this.context.currentTime, 0.01);
			} else {
				this.gainObj['gain'].value = 1;
			}
			this.gainObj.connect(this.context.destination);

			this.onended = function() {
				this.emit('ended');
			}.bind(this);
		},

		preload: function() {
			var path = this.src;
			var item = cc.loader.getItem(path);

			if (!item) {
				cc.loader.load(path, function(error) {
					if (!error) {
						item = cc.loader.getItem(path);
						this.buffer = item.content._audio;
						this.emit('load');
					}
				}.bind(this));
			} else if (item.complete) {
				this.buffer = item.content._audio;
				this.emit('load');
			}
		},

		bindEnded: function() {
			var audio = this.source;
			audio.onended = function(e) {
				this.onended();
				audio.onended = null;
			}.bind(this);
		},

		unbindEnded: function() {
			var audio = this.source;
			audio.onended = null;
		},

		play: function(offset) {
			if (this.source && !this.paused) {
				var onended = this.source.onended;
				this.source.onended = function() {
					this.source.onended = onended;
				}.bind(this);
				this.source.stop(0);
				this.playedLength = 0;
			}

			var audio = this.context.createBufferSource();
			audio.buffer = this.buffer;
			audio.connect(this.gainObj);
			audio.loop = this.loop;

			this.startTime = this.context.currentTime;
			offset = offset || this.playedLength;
			if (offset) {
				this.startTime -= offset;
			}

			var duration = this.buffer.duration;
			var startTime = offset,
				endTime;

			if (audio.loop) {
				audio.start(0, startTime);
			} else {
				endTime = duration - offset;
				audio.start(0, startTime, endTime);

				this._endedTimer = setTimeout(function() {
					audio.onended && audio.onended();
				}, endTime * 1000);
			}

			// ideal.log(audio.context.state);

			if ((!audio.context.state || audio.context.state === 'suspended') && this.context.currentTime === 0) {
				sound._touchPlayList.push({
					offset: offset,
					audio: this
				});
			}

			this.source = audio;
			this.state = subject.State.PLAYING;
		},

		pause: function() {
			if (this.paused) {
				return;
			}

			clearTimeout(this._endedTimer);
			this._endedTimer = null;

			// 记录当前播放的时间
			this.playedLength = this.context.currentTime - this.startTime;
			// 如果超过音频的持续时间, 则需要取余数
			this.playedLength %= this.buffer.duration;

			var audio = this.source;
			this.source = null;
			this.startTime = -1;
			audio && audio.stop(0);

			this.state = subject.State.PAUSED;
		},

		setLoop: function(loop) {
			this.loop = loop;
			if (this.audio) {
				this.audio.loop = loop;
			};
		},

		getLoop: function() {
			return this.audio && this.audio.loop;
		},

		setVolume: function(num) {
			this.volume = num;
			if (this.gainObj['gain'].setTargetAtTime) {
				this.gainObj['gain'].setTargetAtTime(this.volume, this.context.currentTime, 0.01);
			} else {
				this.volume['gain'].value = num;
			}
			if (cc.sys.os === cc.sys.OS_IOS && !this.paused && this.source) {
				this.unbindEnded();
				this.pause();
				this.play();
			}
		},

		getState: function() {
			if (subject.State.PLAYING === this.state && this.paused) {
				this.state = subject.State.PAUSED;
			}
			return this.state;
		},
	});

	WebAudio.prototype.__defineGetter__('paused', function() {
		if (this.source && this.source.loop) {
			return false;
		}
		if (this.startTime === -1) {
			return true;
		}
		return this.context.currentTime - this.startTime > this.buffer.duration;
	});
})('wxweb');

/**
 * 兼容微信小游戏和普通H5
 * @Author   Zjw
 * @DateTime 2018-08-28
 */
(function() {
	var sound = {};
	var musicId = -1;
	var pauseIdCache = [];

	/**
	 * 播放声音
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {String|Object}          config 支持配置模式和地址模式
	 * @param    {Boolean}                isLoop 是否循环播放
	 * @return   {Number}                        当前播放的声音ID
	 */
	sound.play = function(config, loop) {
		var path, type;
		if (typeof config == 'string') {
			path = config;
			type = subject.Type.Effect;
		} else {
			path = config.url || '';
			type = config.type || subject.Type.Effect;
		}

		if (path.startsWith('db:')) {
			path = cc.url.raw(`resources/${path.substr(3)}`);
		}
		if (!path.endsWith('.mp3')) {
			path += '.mp3';
		}

		if (type == subject.Type.Effect) {
			if (!subject.EnableEffect) {
				return;
			}
			return cc.audioEngine.playEffect(path, loop);
		}

		if (type == subject.Type.Music) {
			if (!subject.EnableMusic) {
				return;
			}
			var audio = cc.audioEngine._id2audio[musicId];
			if (audio && audio.src == path) {
				return;
			} else {
				musicId = cc.audioEngine.playMusic(path, loop);
			}
			return musicId;
		}
	};

	/**
	 * 暂停指定声音
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Number}                 id 声音ID
	 */
	sound.pause = function(id) {
		return cc.audioEngine.pause(id);
	};

	/**
	 * 暂停所有声音播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.pauseAll = function() {
		cc.audioEngine.pauseAll();
	};

	/**
	 * 恢复指定声音
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Number}                 id 声音ID
	 */
	sound.resume = function(id) {
		return cc.audioEngine.resume(id);
	};

	/**
	 * 恢复所有声音播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.resumeAll = function() {
		cc.audioEngine.resumeAll();
	};

	/**
	 * 停止指定声音
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Number}                 id 声音ID
	 */
	sound.stop = function(id) {
		return cc.audioEngine.stop(id);
	};

	/**
	 * 停止所有声音播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.stopAll = function() {
		cc.audioEngine.stopAll();
	};

	sound.setVolume = function(id, volume) {
		return cc.audioEngine.setVolume(id, volume);
	};

	sound.setAllAudioVolume = function(volume) {
		this.setAllVolume(volume);
		ideal.warn(`警告: "ideal.sound.setAllAudioVolume"即将废弃, 请使用"ideal.sound.setAllVolume"`);
	};

	sound.setAllVolume = function(volume) {
		for (var id in cc.audioEngine._id2audio) {
			this.setVolume(id, volume);
		}
	};

	/**
	 * 停止所有音效播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.stopAllEffect = function() {
		var id2audio = cc.audioEngine._id2audio;
		for (var id in id2audio) {
			if (id == musicId) continue;
			var audio = id2audio[id];
			var state = audio.getState();
			if (state === cc.audioEngine.AudioState.PLAYING) {
				audio.stop();
			}
		}
	};

	/**
	 * 停止所有背景音乐播放
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 */
	sound.stopAllMusic = function() {
		cc.audioEngine.stop(musicId);
	};

	/**
	 * 设置背景音乐开关
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Boolean}                 op 开关
	 */
	sound.settingMusic = function(op) {
		let setting = JSON.parse(cc.sys.localStorage.getItem('ideal-setting'));
		subject._enableMusic = !!op;
		setting.music = !!op ? 1 : 0;
		cc.sys.localStorage.setItem('ideal-setting', JSON.stringify(setting));
	};

	/**
	 * 设置游戏音效开关
	 * @Author   Zjw
	 * @DateTime 2018-07-23
	 * @param    {Boolean}                 op 开关
	 */
	sound.settingEffect = function(op) {
		let setting = JSON.parse(cc.sys.localStorage.getItem('ideal-setting'));
		subject._enableEffect = !!op;
		setting.effect = !!op ? 1 : 0;
		cc.sys.localStorage.setItem('ideal-setting', JSON.stringify(setting));
	};

	for (var i = 0; i < arguments.length; i++) {
		compatibles[arguments[i]] = sound;
	}
})('wxgame', 'web');
