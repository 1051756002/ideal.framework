var Connector = require('./iConnector');
var net = {
	_conns: {},
};

net.create = function() {
	// var conn = new Connector();
	// this._conns[] = conn;
	// return conn;
};

/**
 * 根据连接器名称获取连接器
 * @Author   Zjw
 * @DateTime 2018-06-15
 * @param    {string}                 cname 连接器名称
 * @return   {iConnect|undefined}
 */
net.getConnector = function(cname) {
	return this._conns[cname];
};

/**
 * 断开所有连接器
 * @Author   Zjw
 * @DateTime 2018-05-11
 */
net.clean = function() {
	for (var i in this._conns) {
		this._conns[i].disconnect();
	}
};

module.exports = net;
