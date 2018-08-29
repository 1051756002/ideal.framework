let _util = {};

_util.log = function() {
	ideal.log.apply(this, arguments);
	ideal.warn('"ideal.util.log"即将废弃, 请使用"ideal.log"');
};

_util.log_sys = function() {
	ideal.log_sys.apply(this, arguments);
	ideal.warn('"ideal.util.log_sys"即将废弃, 请使用"ideal.log_sys"');
};

_util.log_net = function() {
	ideal.log_net.apply(this, arguments);
	ideal.warn('"ideal.util.log_net"即将废弃, 请使用"ideal.log_net"');
};

_util.warn = function() {
	ideal.warn.apply(this, arguments);
	ideal.warn('"ideal.util.warn"即将废弃, 请使用"ideal.warn"');
};

_util.error = function() {
	ideal.error.apply(this, arguments);
	ideal.warn('"ideal.util.error"即将废弃, 请使用"ideal.error"');
};

module.exports = _util;
