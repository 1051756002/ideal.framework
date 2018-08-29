// 合并所有util函数
let arr = [
	require('./iUtilLog'),
	require('./iUtilData'),
	require('./iUtilString'),
	require('./iUtilCommon'),
	require('./iUtilCookie'),
	require('./iUtilSound'),
	require('./iUtilView')
];

let util = {};
for (let i in arr) {
	for (let k in arr[i]) {
		if (util[k]) {
			ideal.warn(`警告: iUtil.${k} 已经存在, 未能加入到Util类中.`);
		} else {
			util[k] = arr[i][k];
		}
	}
};

module.exports = util;
