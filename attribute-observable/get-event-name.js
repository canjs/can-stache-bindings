var attr = require("can-util/dom/attr/attr");

var isRadioInput = function isRadioInput(el) {
	return el.nodeName.toLowerCase() === "input" && el.type === "radio";
};

var isValidProp = function isValidProp(prop, bindingData) {
	return prop === "checked" && !bindingData.legacyBindings;
};

var isSpecialProp = function isSpecialProp(prop) {
	return attr.special[prop] && attr.special[prop].addEventListener;
};

// Determine the event or events we need to listen to when this value changes.
module.exports = function getEventName(el, prop, bindingData) {
	var event = "change";

	if (isRadioInput(el) && isValidProp(prop, bindingData)) {
		event = "radiochange";
	}

	if (isSpecialProp(prop)) {
		event = prop;
	}

	return event;
};
