let _util = {};

/**
 * 播放按钮音效
 * @Author   Zjw
 * @DateTime 2018-07-11
 */
_util.playBtnSound = function() {
    ideal.sound.play({
    	url: 'db:framework/sounds/click',
    	type: ideal.sound.Type.Effect,
    });
};

/**
 * 播放警告音效
 * @Author   Zjw
 * @DateTime 2018-07-11
 */
_util.playWarnSound = function() {
	ideal.sound.play({
		url: 'db:framework/sounds/warn',
    	type: ideal.sound.Type.Effect,
	});
};

module.exports = _util;
