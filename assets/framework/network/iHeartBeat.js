var iConnector = require('./iConnector');

var iHeartBeat = cc.Class({
	name: 'iHeartBeat',

	properties: {
		/**
		 * 依赖连接器
		 * @type {iConnector}
		 */
		_connector: null,

		/**
		 * 心跳间隔时间
		 * @type {number}
		 */
		_intervalTime: 10000,

		/**
		 * 自动中断网络的时间
		 * @type {number}
		 */
		_autoInterruptTime: 20000,

		/**
		 * 最后一次发包时间, 可用于计算网络延迟
		 * @type {number}
		 */
		_lastTime: 0,

		_stid_beat: 0,
		_stid_interrupt: 0,

		/**
		 * 网络延迟, 单位毫秒
		 * @type {number}
		 */
		networkDelay: 0,
	},

	/**
	 * 心跳开始
	 * @Author   Zjw
	 * @DateTime 2018-08-29
	 * @param    {iConnector}   connector 依赖连接器
	 */
	start: function(connector) {
		if (connector instanceof iConnector) {
			this._connector = connector;
			this.next();
			ideal.on(ideal.Event.NetHeartBeat, this.recvBeat, this);
		} else {
			ideal.error('异常: 心跳启动失败, 需要依赖一个连接器.');
		}
	},

	/**
	 * 心跳停止
	 * @Author   Zjw
	 * @DateTime 2018-08-29
	 */
	stop: function() {
		clearTimeout(this._stid_beat);
		clearTimeout(this._stid_interrupt);
		ideal.off(ideal.Event.NetHeartBeat, this.recvBeat, this);
	},

	/**
	 * 刷新, 继续心跳包定时器
	 * @Author   Zjw
	 * @DateTime 2018-05-15
	 */
	refresh: function() {
		var self = this;

		clearTimeout(this._stid_interrupt);

		// 两次收包的间隔时间超过定义的自动中断连接器时间
		this._stid_interrupt = setTimeout(function() {
			self._connector.interrupt();
		}, this._autoInterruptTime);
	},

	/**
	 * 继续下一个心跳包
	 * @Author   Zjw
	 * @DateTime 2018-05-15
	 */
	next: function() {
		this.sendBeat();
		this._stid_beat = setTimeout(this.next.bind(this), this._intervalTime);
	},

	/**
	 * 发送心跳包
	 * @Author   Zjw
	 * @DateTime 2018-05-15
	 */
	sendBeat: function() {
		this._connector.send(true, {
			cmd: 1
		});
		this._lastTime = Date.now();
	},

	/**
	 * 接收心跳事件
	 * @Author   Zjw
	 * @DateTime 2018-05-15
	 */
	recvBeat: function() {
		this.refresh();

		if (ideal.config.enableHeartBeatLog) {
			var cname = this._connector.getName();
			ideal.log(`${cname}: du ~`);
		}

		this.networkDelay = Date.now() - this._lastTime;
	},
});

module.exports = iHeartBeat;
