/*can-stache-bindings@3.5.0-pre.2#can-stache-bindings*/
var expression = require('can-stache/src/expression');
var viewCallbacks = require('can-view-callbacks');
var live = require('can-view-live');
var Scope = require('can-view-scope');
var canViewModel = require('can-view-model');
var canEvent = require('can-event');
var canBatch = require('can-event/batch/batch');
var compute = require('can-compute');
var observeReader = require('can-stache-key');
var Observation = require('can-observation');
var CID = require('can-cid');
var assign = require('can-util/js/assign/assign');
var makeArray = require('can-util/js/make-array/make-array');
var each = require('can-util/js/each/each');
var string = require('can-util/js/string/string');
var dev = require('can-util/js/dev/dev');
var types = require('can-types');
var last = require('can-util/js/last/last');
var getMutationObserver = require('can-util/dom/mutation-observer/mutation-observer');
var domEvents = require('can-util/dom/events/events');
require('can-util/dom/events/removed/removed');
var domData = require('can-util/dom/data/data');
var attr = require('can-util/dom/attr/attr');
var canLog = require('can-util/js/log/log');
var stacheHelperCore = require('can-stache/helpers/core');
var canSymbol = require('can-symbol');
var canReflect = require('can-reflect');
var singleReference = require('can-util/js/single-reference/single-reference');
var encoder = require('can-attribute-encoder');
var addEnterEvent = require('can-event-dom-enter/compat');
addEnterEvent(domEvents);
var addRadioChange = require('can-event-dom-radiochange/compat');
addRadioChange(domEvents);
var noop = function () {
};
var onMatchStr = 'on:', byMatchStr = ':by:', toMatchStr = ':to', fromMatchStr = ':from', bindMatchStr = ':bind', attributesEventStr = 'attributes', removedStr = 'removed', viewModelBindingStr = 'viewModel', attributeBindingStr = 'attribute', scopeBindingStr = 'scope', viewModelOrAttributeBindingStr = 'viewModelOrAttribute', getValueSymbol = 'can.getValue', setValueSymbol = 'can.setValue', onValueSymbol = 'can.onValue', offValueSymbol = 'can.offValue';
var reflectiveValue = function (value) {
    var handlers = [];
    var fn = function (newValue) {
        if (arguments.length) {
            value = newValue;
            handlers.forEach(function (handler) {
                canBatch.queue([
                    handler,
                    fn,
                    [newValue]
                ]);
            }, this);
        } else {
            Observation.add(fn);
            return value;
        }
    };
    CID(fn);
    canReflect.set(fn, canSymbol.for(onValueSymbol), function (handler) {
        handlers.push(handler);
    });
    canReflect.set(fn, canSymbol.for(offValueSymbol), function (handler) {
        var index = handlers.indexOf(handler);
        handlers.splice(index, 1);
    });
    canReflect.set(fn, canSymbol.for(setValueSymbol), function (newValue) {
        return fn(newValue);
    });
    canReflect.set(fn, canSymbol.for(getValueSymbol), function () {
        return fn();
    });
    fn.isComputed = true;
    return fn;
};
function setPriority(observable, priority) {
    if (observable instanceof Observation) {
        observable.compute._primaryDepth = priority;
    } else if (observable.computeInstance) {
        observable.computeInstance.setPrimaryDepth(priority);
    } else if (observable.observation) {
        observable.observation.compute._primaryDepth = priority;
    }
}
var throwOnlyOneTypeOfBindingError = function () {
    throw new Error('can-stache-bindings - you can not have contextual bindings ( {this}=\'value\' ) and key bindings ( {prop}=\'value\' ) on one element.');
};
var checkBindingState = function (bindingState, dataBinding) {
    var isSettingOnViewModel = dataBinding.bindingInfo.parentToChild && dataBinding.bindingInfo.child === viewModelBindingStr;
    if (isSettingOnViewModel) {
        var bindingName = dataBinding.bindingInfo.childName;
        var isSettingViewModel = isSettingOnViewModel && (bindingName === 'this' || bindingName === '.');
        if (isSettingViewModel) {
            if (bindingState.isSettingViewModel || bindingState.isSettingOnViewModel) {
                throwOnlyOneTypeOfBindingError();
            } else {
                return {
                    isSettingViewModel: true,
                    initialViewModelData: undefined
                };
            }
        } else {
            if (bindingState.isSettingViewModel) {
                throwOnlyOneTypeOfBindingError();
            } else {
                return {
                    isSettingOnViewModel: true,
                    initialViewModelData: bindingState.initialViewModelData
                };
            }
        }
    } else {
        return bindingState;
    }
};
var behaviors = {
    viewModel: function (el, tagData, makeViewModel, initialViewModelData, staticDataBindingsOnly) {
        var bindingsSemaphore = {}, viewModel, onCompleteBindings = [], onTeardowns = {}, bindingInfos = {}, attributeViewModelBindings = assign({}, initialViewModelData), bindingsState = {
                isSettingOnViewModel: false,
                isSettingViewModel: false,
                initialViewModelData: initialViewModelData || {}
            }, hasDataBinding = false;
        each(makeArray(el.attributes), function (node) {
            var dataBinding = makeDataBinding(node, el, {
                templateType: tagData.templateType,
                scope: tagData.scope,
                semaphore: bindingsSemaphore,
                getViewModel: function () {
                    return viewModel;
                },
                attributeViewModelBindings: attributeViewModelBindings,
                alreadyUpdatedChild: true,
                nodeList: tagData.parentNodeList,
                favorViewModel: true
            });
            if (dataBinding) {
                bindingsState = checkBindingState(bindingsState, dataBinding);
                hasDataBinding = true;
                if (dataBinding.onCompleteBinding) {
                    if (dataBinding.bindingInfo.parentToChild && dataBinding.value !== undefined) {
                        if (bindingsState.isSettingViewModel) {
                            bindingsState.initialViewModelData = dataBinding.value;
                        } else {
                            bindingsState.initialViewModelData[cleanVMName(dataBinding.bindingInfo.childName)] = dataBinding.value;
                        }
                    }
                    onCompleteBindings.push(dataBinding.onCompleteBinding);
                }
                onTeardowns[node.name] = dataBinding.onTeardown;
            }
        });
        if (staticDataBindingsOnly && !hasDataBinding) {
            return;
        }
        viewModel = makeViewModel(bindingsState.initialViewModelData, hasDataBinding);
        for (var i = 0, len = onCompleteBindings.length; i < len; i++) {
            onCompleteBindings[i]();
        }
        if (!bindingsState.isSettingViewModel) {
            domEvents.addEventListener.call(el, attributesEventStr, function (ev) {
                var attrName = ev.attributeName, value = el.getAttribute(attrName);
                if (onTeardowns[attrName]) {
                    onTeardowns[attrName]();
                }
                var parentBindingWasAttribute = bindingInfos[attrName] && bindingInfos[attrName].parent === attributeBindingStr;
                if (value !== null || parentBindingWasAttribute) {
                    var dataBinding = makeDataBinding({
                        name: attrName,
                        value: value
                    }, el, {
                        templateType: tagData.templateType,
                        scope: tagData.scope,
                        semaphore: {},
                        getViewModel: function () {
                            return viewModel;
                        },
                        attributeViewModelBindings: attributeViewModelBindings,
                        initializeValues: true,
                        nodeList: tagData.parentNodeList
                    });
                    if (dataBinding) {
                        if (dataBinding.onCompleteBinding) {
                            dataBinding.onCompleteBinding();
                        }
                        bindingInfos[attrName] = dataBinding.bindingInfo;
                        onTeardowns[attrName] = dataBinding.onTeardown;
                    }
                }
            });
        }
        return function () {
            for (var attrName in onTeardowns) {
                onTeardowns[attrName]();
            }
        };
    },
    data: function (el, attrData) {
        if (domData.get.call(el, 'preventDataBindings')) {
            return;
        }
        var viewModel, getViewModel = function () {
                return viewModel || (viewModel = canViewModel(el));
            }, semaphore = {}, teardown;
        var legacyBindings = bindingsRegExp.exec(attrData.attributeName);
        var twoWay = legacyBindings && legacyBindings[1];
        var dataBinding = makeDataBinding({
            name: attrData.attributeName,
            value: el.getAttribute(attrData.attributeName),
            nodeList: attrData.nodeList
        }, el, {
            templateType: attrData.templateType,
            scope: attrData.scope,
            semaphore: semaphore,
            getViewModel: getViewModel,
            syncChildWithParent: twoWay
        });
        if (dataBinding.onCompleteBinding) {
            dataBinding.onCompleteBinding();
        }
        teardown = dataBinding.onTeardown;
        canEvent.one.call(el, removedStr, function () {
            teardown();
        });
        domEvents.addEventListener.call(el, attributesEventStr, function (ev) {
            var attrName = ev.attributeName, value = el.getAttribute(attrName);
            if (attrName === attrData.attributeName) {
                if (teardown) {
                    teardown();
                }
                if (value !== null) {
                    var dataBinding = makeDataBinding({
                        name: attrName,
                        value: value
                    }, el, {
                        templateType: attrData.templateType,
                        scope: attrData.scope,
                        semaphore: semaphore,
                        getViewModel: getViewModel,
                        initializeValues: true,
                        nodeList: attrData.nodeList,
                        syncChildWithParent: twoWay
                    });
                    if (dataBinding) {
                        if (dataBinding.onCompleteBinding) {
                            dataBinding.onCompleteBinding();
                        }
                        teardown = dataBinding.onTeardown;
                    }
                }
            }
        });
    },
    reference: function (el, attrData) {
        if (el.getAttribute(attrData.attributeName)) {
            canLog.warn('*reference attributes can only export the view model.');
        }
        var name = string.camelize(attrData.attributeName.substr(1).toLowerCase());
        var viewModel = canViewModel(el);
        var refs = attrData.scope.getRefs();
        refs._context.attr('*' + name, viewModel);
    },
    event: function (el, data) {
        var attributeName = encoder.decode(data.attributeName), event, bindingContext;
        if (attributeName.indexOf('can-') === 0) {
            event = attributeName.substr('can-'.length);
            bindingContext = el;
        } else if (attributeName.indexOf(onMatchStr) === 0) {
            event = attributeName.substr(onMatchStr.length);
            var byIndex = event.indexOf(byMatchStr);
            if (byIndex >= 0) {
                bindingContext = data.scope.get(decodeAttrName(event.substr(byIndex + byMatchStr.length)));
                event = event.substr(0, byIndex);
            } else {
                var viewModel = domData.get.call(el, viewModelBindingStr);
                bindingContext = viewModel || el;
            }
        } else {
            event = removeBrackets(attributeName, '(', ')');
            if (event.charAt(0) === '$') {
                event = event.substr(1);
                bindingContext = el;
            } else {
                if (event.indexOf(' ') >= 0) {
                    var eventSplit = event.split(' ');
                    bindingContext = data.scope.get(decodeAttrName(eventSplit[0]));
                    event = eventSplit[1];
                } else {
                    bindingContext = canViewModel(el);
                }
            }
        }
        event = decodeAttrName(event);
        var handler = function (ev) {
            var attrVal = el.getAttribute(encoder.encode(attributeName));
            if (!attrVal) {
                return;
            }
            var viewModel = canViewModel(el);
            var expr = expression.parse(removeBrackets(attrVal), {
                lookupRule: function () {
                    return expression.Lookup;
                },
                methodRule: 'call'
            });
            if (!(expr instanceof expression.Call) && !(expr instanceof expression.Helper)) {
                var defaultArgs = [
                    data.scope._context,
                    el
                ].concat(makeArray(arguments)).map(function (data) {
                    return new expression.Arg(new expression.Literal(data));
                });
                expr = new expression.Call(expr, defaultArgs, {});
            }
            var localScope = data.scope.add({
                '@element': el,
                '@event': ev,
                '@viewModel': viewModel,
                '@scope': data.scope,
                '@context': data.scope._context,
                '%element': this,
                '$element': types.wrapElement(el),
                '%event': ev,
                '%viewModel': viewModel,
                '%scope': data.scope,
                '%context': data.scope._context,
                '%arguments': arguments
            }, { notContext: true });
            var scopeData = localScope.read(expr.methodExpr.key, { isArgument: true }), args, stacheHelper, stacheHelperResult;
            if (!scopeData.value) {
                var name = observeReader.reads(expr.methodExpr.key).map(function (part) {
                    return part.key;
                }).join('.');
                stacheHelper = stacheHelperCore.getHelper(name);
                if (stacheHelper) {
                    args = expr.args(localScope, null)();
                    stacheHelperResult = stacheHelper.fn.apply(localScope.peek('.'), args);
                    if (typeof stacheHelperResult === 'function') {
                        stacheHelperResult(el);
                    }
                    return stacheHelperResult;
                }
                return null;
            }
            args = expr.args(localScope, null)();
            return scopeData.value.apply(scopeData.parent, args);
        };
        var attributesHandler = function (ev) {
            var isEventAttribute = ev.attributeName === attributeName;
            var isRemoved = !this.getAttribute(attributeName);
            var isEventAttributeRemoved = isEventAttribute && isRemoved;
            if (isEventAttributeRemoved) {
                unbindEvent();
            }
        };
        var removedHandler = function (ev) {
            unbindEvent();
        };
        var unbindEvent = function () {
            canEvent.off.call(bindingContext, event, handler);
            canEvent.off.call(el, attributesEventStr, attributesHandler);
            canEvent.off.call(el, removedStr, removedHandler);
        };
        canEvent.on.call(bindingContext, event, handler);
        canEvent.on.call(el, attributesEventStr, attributesHandler);
        canEvent.on.call(el, removedStr, removedHandler);
    },
    value: function (el, data) {
        var propName = '$value', attrValue = removeBrackets(el.getAttribute('can-value')).trim(), nodeName = el.nodeName.toLowerCase(), elType = nodeName === 'input' && (el.type || el.getAttribute('type')), getterSetter;
        if (nodeName === 'input' && (elType === 'checkbox' || elType === 'radio')) {
            var property = getObservableFrom.scope(el, data.scope, attrValue, {}, true);
            if (el.type === 'checkbox') {
                var trueValue = attr.has(el, 'can-true-value') ? el.getAttribute('can-true-value') : true, falseValue = attr.has(el, 'can-false-value') ? el.getAttribute('can-false-value') : false;
                getterSetter = compute(function (newValue) {
                    var isSet = arguments.length !== 0;
                    if (property && property[canSymbol.for(getValueSymbol)]) {
                        if (isSet) {
                            canReflect.setValue(property, newValue ? trueValue : falseValue);
                        } else {
                            return canReflect.getValue(property) == trueValue;
                        }
                    } else {
                        if (isSet) {
                        } else {
                            return property == trueValue;
                        }
                    }
                });
            } else if (elType === 'radio') {
                getterSetter = compute(function (newValue) {
                    var isSet = arguments.length !== 0 && newValue;
                    if (property && property[canSymbol.for(getValueSymbol)]) {
                        if (isSet) {
                            canReflect.setValue(property, el.value);
                        } else {
                            return canReflect.getValue(property) == el.value;
                        }
                    } else {
                        if (isSet) {
                        } else {
                            return property == el.value;
                        }
                    }
                });
            }
            propName = '$checked';
            attrValue = 'getterSetter';
            data.scope = new Scope({ getterSetter: getterSetter });
        } else if (isContentEditable(el)) {
            propName = '$innerHTML';
        }
        var dataBinding = makeDataBinding({
            name: '{(' + propName + '})',
            value: attrValue
        }, el, {
            templateType: data.templateType,
            scope: data.scope,
            semaphore: {},
            initializeValues: true,
            legacyBindings: true
        });
        canEvent.one.call(el, removedStr, function () {
            dataBinding.onTeardown();
        });
    }
};
viewCallbacks.attr(/^(:lb:)[(:c:)\w-]+(:rb:)$/, behaviors.data);
viewCallbacks.attr(/[\w\.:]+:to/, behaviors.data);
viewCallbacks.attr(/[\w\.:]+:from/, behaviors.data);
viewCallbacks.attr(/[\w\.:]+:bind/, behaviors.data);
viewCallbacks.attr(/\*[\w\.\-_]+/, behaviors.reference);
viewCallbacks.attr(/on:[\w\.:]+/, behaviors.event);
viewCallbacks.attr(/^(:lp:)[(:d:)?\w\.\\]+(:rp:)$/, behaviors.event);
viewCallbacks.attr(/can-[\w\.]+/, behaviors.event);
viewCallbacks.attr('can-value', behaviors.value);
var getObservableFrom = {
    viewModelOrAttribute: function (el, scope, vmNameOrProp, bindingData, mustBeSettable, stickyCompute, event) {
        var viewModel = domData.get.call(el, viewModelBindingStr);
        if (viewModel) {
            return this.viewModel.apply(this, arguments);
        } else {
            return this.attribute.apply(this, arguments);
        }
    },
    scope: function (el, scope, scopeProp, bindingData, mustBeSettable, stickyCompute) {
        if (!scopeProp) {
            return reflectiveValue();
        } else {
            if (mustBeSettable) {
                var parentExpression = expression.parse(scopeProp, { baseMethodType: 'Call' });
                return parentExpression.value(scope, new Scope.Options({}));
            } else {
                var observation = new Observation(function () {
                });
                observation[canSymbol.for(setValueSymbol)] = function (newVal) {
                    scope.set(cleanVMName(scopeProp), newVal);
                };
                return observation;
            }
        }
    },
    viewModel: function (el, scope, vmName, bindingData, mustBeSettable, stickyCompute) {
        var setName = cleanVMName(vmName);
        var isBoundToContext = vmName === '.' || vmName === 'this';
        var keysToRead = isBoundToContext ? [] : observeReader.reads(vmName);
        var observation = new Observation(function () {
            var viewModel = bindingData.getViewModel();
            return observeReader.read(viewModel, keysToRead, {}).value;
        });
        observation[canSymbol.for(setValueSymbol)] = function (newVal) {
            var viewModel = bindingData.getViewModel();
            if (arguments.length) {
                if (stickyCompute) {
                    var oldValue = canReflect.getKeyValue(viewModel, setName);
                    if (canReflect.isObservableLike(oldValue)) {
                        canReflect.setValue(oldValue, newVal);
                    } else {
                        canReflect.setKeyValue(viewModel, setName, reflectiveValue(canReflect.getValue(stickyCompute)));
                    }
                } else {
                    if (isBoundToContext) {
                        canReflect.setValue(viewModel, newVal);
                    } else {
                        canReflect.setKeyValue(viewModel, setName, newVal);
                    }
                }
            }
        };
        return observation;
    },
    attribute: function (el, scope, prop, bindingData, mustBeSettable, stickyCompute, event) {
        if (!event) {
            event = 'change';
            var isRadioInput = el.nodeName === 'INPUT' && el.type === 'radio';
            var isValidProp = prop === 'checked' && !bindingData.legacyBindings;
            if (isRadioInput && isValidProp) {
                event = 'radiochange';
            }
            var isSpecialProp = attr.special[prop] && attr.special[prop].addEventListener;
            if (isSpecialProp) {
                event = prop;
            }
        }
        var hasChildren = el.nodeName.toLowerCase() === 'select', isMultiselectValue = prop === 'value' && hasChildren && el.multiple, set = function (newVal) {
                if (bindingData.legacyBindings && hasChildren && 'selectedIndex' in el && prop === 'value') {
                    attr.setAttrOrProp(el, prop, newVal == null ? '' : newVal);
                } else {
                    attr.setAttrOrProp(el, prop, newVal);
                }
                return newVal;
            }, get = function () {
                return attr.get(el, prop);
            };
        if (isMultiselectValue) {
            prop = 'values';
        }
        var observation = new Observation(get);
        observation[canSymbol.for(setValueSymbol)] = set;
        observation[canSymbol.for(getValueSymbol)] = get;
        observation[canSymbol.for(onValueSymbol)] = function (updater) {
            var translationHandler = function () {
                updater(get());
            };
            singleReference.set(updater, this, translationHandler);
            if (event === 'radiochange') {
                canEvent.on.call(el, 'change', translationHandler);
            }
            canEvent.on.call(el, event, translationHandler);
        };
        observation[canSymbol.for(offValueSymbol)] = function (updater) {
            var translationHandler = singleReference.getAndDelete(updater, this);
            if (event === 'radiochange') {
                canEvent.off.call(el, 'change', translationHandler);
            }
            canEvent.off.call(el, event, translationHandler);
        };
        return observation;
    }
};
var bind = {
    childToParent: function (el, parentObservable, childObservable, bindingsSemaphore, attrName, syncChild) {
        var updateParent = function (newVal) {
            if (!bindingsSemaphore[attrName]) {
                if (parentObservable && parentObservable[canSymbol.for(getValueSymbol)]) {
                    if (canReflect.getValue(parentObservable) !== newVal) {
                        canReflect.setValue(parentObservable, newVal);
                    }
                    if (syncChild) {
                        if (canReflect.getValue(parentObservable) !== canReflect.getValue(childObservable)) {
                            bindingsSemaphore[attrName] = (bindingsSemaphore[attrName] || 0) + 1;
                            canReflect.setValue(childObservable, canReflect.getValue(parentObservable));
                            Observation.afterUpdateAndNotify(function () {
                                --bindingsSemaphore[attrName];
                            });
                        }
                    }
                } else if (canReflect.isMapLike(parentObservable)) {
                    var attrValue = el.getAttribute(attrName);
                    dev.warn('can-stache-bindings: Merging ' + attrName + ' into ' + attrValue + ' because its parent is non-observable');
                    canReflect.eachKey(parentObservable, function (prop) {
                        canReflect.deleteKeyValue(parentObservable, prop);
                    });
                    canReflect.setValue(parentObservable, newVal && newVal.serialize ? newVal.serialize() : newVal, true);
                }
            }
        };
        if (childObservable && childObservable[canSymbol.for(getValueSymbol)]) {
            canReflect.onValue(childObservable, updateParent);
        }
        return updateParent;
    },
    parentToChild: function (el, parentObservable, childUpdate, bindingsSemaphore, attrName) {
        var updateChild = function (newValue) {
            bindingsSemaphore[attrName] = (bindingsSemaphore[attrName] || 0) + 1;
            canReflect.setValue(childUpdate, newValue);
            Observation.afterUpdateAndNotify(function () {
                --bindingsSemaphore[attrName];
            });
        };
        if (parentObservable && parentObservable[canSymbol.for(getValueSymbol)]) {
            canReflect.onValue(parentObservable, updateChild);
        }
        return updateChild;
    }
};
var endsWith = String.prototype.endsWith || function (text) {
    return this.lastIndexOf(text) === this.length - text.length;
};
var bindingsRegExp = /\{(\()?(\^)?([^\}\)]+)\)?\}/, ignoreAttributesRegExp = /^(data-view-id|class|name|id|\[[\w\.-]+\]|#[\w\.-])$/i, DOUBLE_CURLY_BRACE_REGEX = /\{\{/g, encodedSpacesRegExp = /\\s/g, encodedForwardSlashRegExp = /\\f/g;
var getBindingInfo = function (node, attributeViewModelBindings, templateType, tagName, favorViewModel) {
    var bindingInfo, attributeName = encoder.decode(node.name), attributeValue = node.value || '', childName;
    if (endsWith.call(attributeName, fromMatchStr)) {
        childName = attributeName.substr(0, attributeName.length - fromMatchStr.length);
        return {
            parent: scopeBindingStr,
            child: favorViewModel ? viewModelBindingStr : viewModelOrAttributeBindingStr,
            childToParent: false,
            parentToChild: true,
            bindingAttributeName: attributeName,
            childName: decodeAttrName(string.camelize(childName)),
            parentName: attributeValue,
            initializeValues: true,
            syncChildWithParent: false
        };
    } else if (endsWith.call(attributeName, toMatchStr)) {
        childName = attributeName.substr(0, attributeName.length - toMatchStr.length);
        return {
            parent: scopeBindingStr,
            child: favorViewModel ? viewModelBindingStr : viewModelOrAttributeBindingStr,
            childToParent: true,
            parentToChild: false,
            bindingAttributeName: attributeName,
            childName: decodeAttrName(string.camelize(childName)),
            parentName: attributeValue,
            initializeValues: true,
            syncChildWithParent: false
        };
    } else if (endsWith.call(attributeName, bindMatchStr)) {
        childName = attributeName.substr(0, attributeName.length - bindMatchStr.length);
        return {
            parent: scopeBindingStr,
            child: favorViewModel ? viewModelBindingStr : viewModelOrAttributeBindingStr,
            childToParent: true,
            parentToChild: true,
            bindingAttributeName: attributeName,
            childName: decodeAttrName(string.camelize(childName)),
            parentName: attributeValue,
            initializeValues: true,
            syncChildWithParent: true
        };
    }
    var matches = attributeName.match(bindingsRegExp);
    if (!matches) {
        var ignoreAttribute = ignoreAttributesRegExp.test(attributeName);
        var vmName = string.camelize(attributeName);
        if (ignoreAttribute || viewCallbacks.attr(attributeName)) {
            return;
        }
        var syntaxRight = attributeValue[0] === '{' && last(attributeValue) === '}';
        var isAttributeToChild = templateType === 'legacy' ? attributeViewModelBindings[vmName] : !syntaxRight;
        var scopeName = syntaxRight ? attributeValue.substr(1, attributeValue.length - 2) : attributeValue;
        if (isAttributeToChild) {
            return {
                bindingAttributeName: attributeName,
                parent: attributeBindingStr,
                parentName: attributeName,
                child: viewModelBindingStr,
                childName: vmName,
                parentToChild: true,
                childToParent: true,
                syncChildWithParent: true
            };
        } else {
            return {
                bindingAttributeName: attributeName,
                parent: scopeBindingStr,
                parentName: scopeName,
                child: viewModelBindingStr,
                childName: vmName,
                parentToChild: true,
                childToParent: true,
                syncChildWithParent: true
            };
        }
    }
    var twoWay = !!matches[1], childToParent = twoWay || !!matches[2], parentToChild = twoWay || !childToParent;
    childName = matches[3];
    var isDOM = childName.charAt(0) === '$';
    if (isDOM) {
        bindingInfo = {
            parent: scopeBindingStr,
            child: attributeBindingStr,
            childToParent: childToParent,
            parentToChild: parentToChild,
            bindingAttributeName: attributeName,
            childName: childName.substr(1),
            parentName: attributeValue,
            initializeValues: true,
            syncChildWithParent: twoWay
        };
        if (tagName === 'select') {
            bindingInfo.stickyParentToChild = true;
        }
        return bindingInfo;
    } else {
        bindingInfo = {
            parent: scopeBindingStr,
            child: viewModelBindingStr,
            childToParent: childToParent,
            parentToChild: parentToChild,
            bindingAttributeName: attributeName,
            childName: decodeAttrName(string.camelize(childName)),
            parentName: attributeValue,
            initializeValues: true,
            syncChildWithParent: twoWay
        };
        if (attributeValue.trim().charAt(0) === '~') {
            bindingInfo.stickyParentToChild = true;
        }
        return bindingInfo;
    }
};
var decodeAttrName = function (name) {
    return name.replace(encodedSpacesRegExp, ' ').replace(encodedForwardSlashRegExp, '/');
};
var makeDataBinding = function (node, el, bindingData) {
    var bindingInfo = getBindingInfo(node, bindingData.attributeViewModelBindings, bindingData.templateType, el.nodeName.toLowerCase(), bindingData.favorViewModel);
    if (!bindingInfo) {
        return;
    }
    bindingInfo.alreadyUpdatedChild = bindingData.alreadyUpdatedChild;
    if (bindingData.initializeValues) {
        bindingInfo.initializeValues = true;
    }
    var parentObservable = getObservableFrom[bindingInfo.parent](el, bindingData.scope, bindingInfo.parentName, bindingData, bindingInfo.parentToChild), childObservable = getObservableFrom[bindingInfo.child](el, bindingData.scope, bindingInfo.childName, bindingData, bindingInfo.childToParent, bindingInfo.stickyParentToChild && parentObservable), updateParent, updateChild;
    if (bindingData.nodeList) {
        if (parentObservable) {
            setPriority(parentObservable, bindingData.nodeList.nesting + 1);
        }
        if (childObservable) {
            setPriority(childObservable, bindingData.nodeList.nesting + 1);
        }
    }
    if (bindingInfo.parentToChild) {
        updateChild = bind.parentToChild(el, parentObservable, childObservable, bindingData.semaphore, bindingInfo.bindingAttributeName);
    }
    var completeBinding = function () {
        if (bindingInfo.childToParent) {
            updateParent = bind.childToParent(el, parentObservable, childObservable, bindingData.semaphore, bindingInfo.bindingAttributeName, bindingInfo.syncChildWithParent);
        } else if (bindingInfo.stickyParentToChild && childObservable[canSymbol.for(onValueSymbol)]) {
            canReflect.onValue(childObservable, noop);
        }
        if (bindingInfo.initializeValues) {
            initializeValues(bindingInfo, childObservable, parentObservable, updateChild, updateParent);
        }
    };
    var onTeardown = function () {
        unbindUpdate(parentObservable, updateChild);
        unbindUpdate(childObservable, updateParent);
        unbindUpdate(childObservable, noop);
    };
    if (bindingInfo.child === viewModelBindingStr) {
        return {
            value: bindingInfo.stickyParentToChild ? reflectiveValue(getValue(parentObservable)) : getValue(parentObservable),
            onCompleteBinding: completeBinding,
            bindingInfo: bindingInfo,
            onTeardown: onTeardown
        };
    } else {
        completeBinding();
        return {
            bindingInfo: bindingInfo,
            onTeardown: onTeardown
        };
    }
};
var initializeValues = function (bindingInfo, childObservable, parentObservable, updateChild, updateParent) {
    var doUpdateParent = false;
    if (bindingInfo.parentToChild && !bindingInfo.childToParent) {
    } else if (!bindingInfo.parentToChild && bindingInfo.childToParent) {
        doUpdateParent = true;
    } else if (getValue(childObservable) === undefined) {
    } else if (getValue(parentObservable) === undefined) {
        doUpdateParent = true;
    }
    if (doUpdateParent) {
        updateParent(getValue(childObservable));
    } else {
        if (!bindingInfo.alreadyUpdatedChild) {
            updateChild(getValue(parentObservable));
        }
    }
};
if (!getMutationObserver()) {
    var updateSelectValue = function (el) {
        var bindingCallback = domData.get.call(el, 'canBindingCallback');
        if (bindingCallback) {
            bindingCallback.onMutation(el);
        }
    };
    live.registerChildMutationCallback('select', updateSelectValue);
    live.registerChildMutationCallback('optgroup', function (el) {
        updateSelectValue(el.parentNode);
    });
}
var isContentEditable = function () {
        var values = {
            '': true,
            'true': true,
            'false': false
        };
        var editable = function (el) {
            if (!el || !el.getAttribute) {
                return;
            }
            var attr = el.getAttribute('contenteditable');
            return values[attr];
        };
        return function (el) {
            var val = editable(el);
            if (typeof val === 'boolean') {
                return val;
            } else {
                return !!editable(el.parentNode);
            }
        };
    }(), removeBrackets = function (value, open, close) {
        open = open || '{';
        close = close || '}';
        if (value[0] === open && value[value.length - 1] === close) {
            return value.substr(1, value.length - 2);
        }
        return value;
    }, getValue = function (value) {
        return value && value[canSymbol.for(getValueSymbol)] ? canReflect.getValue(value) : value;
    }, unbindUpdate = function (observable, updater) {
        if (observable && observable[canSymbol.for(getValueSymbol)] && typeof updater === 'function') {
            canReflect.offValue(observable, updater);
        }
    }, cleanVMName = function (name) {
        return name.replace(/@/g, '');
    };
module.exports = {
    behaviors: behaviors,
    getBindingInfo: getBindingInfo
};