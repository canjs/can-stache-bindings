var canReflect = require("can-reflect");
var domEvents = require("can-util/dom/events/events");

var canEvent = {
	on: function on(eventName, handler, queue) {
		var listenWithDOM = domEvents.canAddEventListener.call(this);
		if (listenWithDOM) {
			domEvents.addEventListener.call(this, eventName, handler, queue);
		} else {
			canReflect.onKeyValue(this, eventName, handler, queue);
		}
	},
	off: function off(eventName, handler, queue) {
		var listenWithDOM = domEvents.canAddEventListener.call(this);
		if (listenWithDOM) {
			domEvents.removeEventListener.call(this, eventName, handler, queue);
		} else {
			canReflect.offKeyValue(this, eventName, handler, queue);
		}
	},
	one: function one(event, handler, queue) {
		// Unbind the listener after it has been executed
		var one = function() {
			canEvent.off.call(this, event, one, queue);
			return handler.apply(this, arguments);
		};

		// Bind the altered listener
		canEvent.on.call(this, event, one, queue);
		return this;
	}
};

module.exports = canEvent;
