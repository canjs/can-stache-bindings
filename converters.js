var stache = require("can-stache");

stache.registerConverter("boolean-to-inList", {
	get: function(item, list){
		if(!list) {
			return false;
		} else {
			return list.indexOf(item) !== -1;
		}
	},

	set: function(newVal, item, list){
		if(!list) {
			return;
		}
		if(!newVal) {
			var idx = list.indexOf(item);
			if(idx !== -1) {
				list.splice(idx, 1);
			}
		} else {
			list.push(item);
		}
	}
});
