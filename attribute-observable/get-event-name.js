var attr = require("./attribute-behaviors");

var isRadioInput = function isRadioInput(el) {
	return el.nodeName.toLowerCase() === "input" && el.type === "radio";
};

var isValidProp = function isValidProp(prop, bindingData) {
	return prop === "checked" && !bindingData.legacyBindings;
};

// Determine the event or events we need to listen to when this value changes.
module.exports = function getEventName(el, prop, bindingData) {
	var event = "change";

	if (isRadioInput(el) && isValidProp(prop, bindingData)) {
		event = "can-stache-bindings-radiochange";
	}

	if (attr.findSpecialListener(prop)) {
		event = prop;
	}

	return event;
};
