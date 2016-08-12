/*can-stache-bindings@3.0.0-pre.12#converters*/
var stache = require('can-stache');
var stringToAny = require('can-util/js/string-to-any/string-to-any');
stache.registerConverter('boolean-to-inList', {
    get: function (item, list) {
        if (!list) {
            return false;
        } else {
            return list.indexOf(item) !== -1;
        }
    },
    set: function (newVal, item, list) {
        if (!list) {
            return;
        }
        if (!newVal) {
            var idx = list.indexOf(item);
            if (idx !== -1) {
                list.splice(idx, 1);
            }
        } else {
            list.push(item);
        }
    }
});
stache.registerConverter('string-to-any', {
    get: function (compute) {
        return '' + compute();
    },
    set: function (newVal, compute) {
        var converted = stringToAny(newVal);
        compute(converted);
    }
});