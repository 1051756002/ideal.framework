cc.Class({
    extends: cc.Component,

    properties: {
    },

    ctor: function() {
    	if (ideal.enable == true) {
    		this.onInit();
    	} else {
    		ideal.init(this.onInit.bind(this));
    	}
    },

    onInit: function() {
    	ideal.log('init');
    },
});
