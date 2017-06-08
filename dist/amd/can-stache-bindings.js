/*can-stache-bindings@3.2.0-pre.1#can-stache-bindings*/
define(function (require, exports, module) {
    var expression = require('can-stache/src/expression');
    var viewCallbacks = require('can-view-callbacks');
    var live = require('can-view-live');
    var Scope = require('can-view-scope');
    var canViewModel = require('can-view-model');
    var canEvent = require('can-event');
    var canBatch = require('can-event/batch');
    var compute = require('can-compute');
    var observeReader = require('can-observation/reader');
    var Observation = require('can-observation');
    var CID = require('can-cid');
    var assign = require('can-util/js/assign');
    var makeArray = require('can-util/js/make-array');
    var each = require('can-util/js/each');
    var string = require('can-util/js/string');
    var dev = require('can-util/js/dev');
    var types = require('can-types');
    var last = require('can-util/js/last');
    var getMutationObserver = require('can-util/dom/mutation-observer');
    var domEvents = require('can-util/dom/events');
    require('can-util/dom/events/removed');
    require('can-event-radiochange/override').override(domEvents);
    var domData = require('can-util/dom/data');
    var attr = require('can-util/dom/attr');
    var canLog = require('can-util/js/log');
    var stacheHelperCore = require('can-stache/helpers/core');
    var canSymbol = require('can-symbol');
    var canReflect = require('can-reflect');
    var singleReference = require('can-compute/single-reference');
    var noop = function () {
    };
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
        canReflect.set(fn, canSymbol.for('can.onValue'), function (handler) {
            handlers.push(handler);
        });
        canReflect.set(fn, canSymbol.for('can.offValue'), function (handler) {
            var index = handlers.indexOf(handler);
            handlers.splice(index, 1);
        });
        canReflect.set(fn, canSymbol.for('can.setValue'), function (newValue) {
            return fn(newValue);
        });
        canReflect.set(fn, canSymbol.for('can.getValue'), function () {
            return fn();
        });
        fn.isComputed = true;
        return fn;
    };
    var behaviors = {
        viewModel: function (el, tagData, makeViewModel, initialViewModelData) {
            initialViewModelData = initialViewModelData || {};
            var bindingsSemaphore = {}, viewModel, onCompleteBindings = [], onTeardowns = {}, bindingInfos = {}, attributeViewModelBindings = assign({}, initialViewModelData);
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
                    nodeList: tagData.parentNodeList
                });
                if (dataBinding) {
                    if (dataBinding.onCompleteBinding) {
                        if (dataBinding.bindingInfo.parentToChild && dataBinding.value !== undefined) {
                            initialViewModelData[cleanVMName(dataBinding.bindingInfo.childName)] = dataBinding.value;
                        }
                        onCompleteBindings.push(dataBinding.onCompleteBinding);
                    }
                    onTeardowns[node.name] = dataBinding.onTeardown;
                }
            });
            viewModel = makeViewModel(initialViewModelData);
            for (var i = 0, len = onCompleteBindings.length; i < len; i++) {
                onCompleteBindings[i]();
            }
            domEvents.addEventListener.call(el, 'attributes', function (ev) {
                var attrName = ev.attributeName, value = el.getAttribute(attrName);
                if (onTeardowns[attrName]) {
                    onTeardowns[attrName]();
                }
                var parentBindingWasAttribute = bindingInfos[attrName] && bindingInfos[attrName].parent === 'attribute';
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
            var viewModel = canViewModel(el), semaphore = {}, teardown;
            var twoWay = bindingsRegExp.exec(attrData.attributeName)[1];
            var dataBinding = makeDataBinding({
                name: attrData.attributeName,
                value: el.getAttribute(attrData.attributeName),
                nodeList: attrData.nodeList
            }, el, {
                templateType: attrData.templateType,
                scope: attrData.scope,
                semaphore: semaphore,
                getViewModel: function () {
                    return viewModel;
                },
                syncChildWithParent: twoWay
            });
            if (dataBinding.onCompleteBinding) {
                dataBinding.onCompleteBinding();
            }
            teardown = dataBinding.onTeardown;
            canEvent.one.call(el, 'removed', function () {
                teardown();
            });
            domEvents.addEventListener.call(el, 'attributes', function (ev) {
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
                            getViewModel: function () {
                                return viewModel;
                            },
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
            var attributeName = data.attributeName, legacyBinding = attributeName.indexOf('can-') === 0, event = attributeName.indexOf('can-') === 0 ? attributeName.substr('can-'.length) : removeBrackets(attributeName, '(', ')'), onBindElement = legacyBinding;
            event = decodeAttrName(event);
            if (event.charAt(0) === '$') {
                event = event.substr(1);
                onBindElement = true;
            }
            var handler = function (ev) {
                var attrVal = el.getAttribute(attributeName);
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
            if (special[event]) {
                var specialData = special[event](data, el, handler);
                handler = specialData.handler;
                event = specialData.event;
            }
            var context;
            if (onBindElement) {
                context = el;
            } else {
                if (event.indexOf(' ') >= 0) {
                    var eventSplit = event.split(' ');
                    context = data.scope.get(eventSplit[0]);
                    event = eventSplit[1];
                } else {
                    context = canViewModel(el);
                }
            }
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
                canEvent.off.call(context, event, handler);
                canEvent.off.call(el, 'attributes', attributesHandler);
                canEvent.off.call(el, 'removed', removedHandler);
            };
            canEvent.on.call(context, event, handler);
            canEvent.on.call(el, 'attributes', attributesHandler);
            canEvent.on.call(el, 'removed', removedHandler);
        },
        value: function (el, data) {
            var propName = '$value', attrValue = removeBrackets(el.getAttribute('can-value')).trim(), nodeName = el.nodeName.toLowerCase(), elType = nodeName === 'input' && (el.type || el.getAttribute('type')), getterSetter;
            if (nodeName === 'input' && (elType === 'checkbox' || elType === 'radio')) {
                var property = getObservableFrom.scope(el, data.scope, attrValue, {}, true);
                if (el.type === 'checkbox') {
                    var trueValue = attr.has(el, 'can-true-value') ? el.getAttribute('can-true-value') : true, falseValue = attr.has(el, 'can-false-value') ? el.getAttribute('can-false-value') : false;
                    getterSetter = compute(function (newValue) {
                        var isSet = arguments.length !== 0;
                        if (property && property[canSymbol.for('can.getValue')]) {
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
                        if (property && property[canSymbol.for('can.getValue')]) {
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
            canEvent.one.call(el, 'removed', function () {
                dataBinding.onTeardown();
            });
        }
    };
    viewCallbacks.attr(/^\{[^\}]+\}$/, behaviors.data);
    viewCallbacks.attr(/\*[\w\.\-_]+/, behaviors.reference);
    viewCallbacks.attr(/^\([\$?\w\.\\]+\)$/, behaviors.event);
    viewCallbacks.attr(/can-[\w\.]+/, behaviors.event);
    viewCallbacks.attr('can-value', behaviors.value);
    var getObservableFrom = {
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
                    observation[canSymbol.for('can.setValue')] = function (newVal) {
                        scope.set(cleanVMName(scopeProp), newVal);
                    };
                    return observation;
                }
            }
        },
        viewModel: function (el, scope, vmName, bindingData, mustBeSettable, stickyCompute) {
            var setName = cleanVMName(vmName);
            var observation = new Observation(function () {
                var viewModel = bindingData.getViewModel();
                return vmName === '.' ? viewModel : observeReader.read(viewModel, observeReader.reads(vmName), {}).value;
            });
            observation[canSymbol.for('can.setValue')] = function (newVal) {
                var viewModel = bindingData.getViewModel();
                var oldValue = canReflect.getKeyValue(viewModel, setName);
                if (arguments.length) {
                    if (stickyCompute) {
                        if (canReflect.isObservableLike(oldValue)) {
                            canReflect.setValue(oldValue, newVal);
                        } else {
                            canReflect.setKeyValue(viewModel, setName, reflectiveValue(canReflect.getValue(stickyCompute)));
                        }
                    } else {
                        canReflect.setKeyValue(viewModel, setName, newVal);
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
            observation[canSymbol.for('can.setValue')] = set;
            observation[canSymbol.for('can.getValue')] = get;
            observation[canSymbol.for('can.onValue')] = function (updater) {
                var translationHandler = function () {
                    updater(get());
                };
                singleReference.set(updater, this, translationHandler);
                if (event === 'radiochange') {
                    canEvent.on.call(el, 'change', translationHandler);
                }
                canEvent.on.call(el, event, translationHandler);
            };
            observation[canSymbol.for('can.offValue')] = function (updater) {
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
                    if (parentObservable && parentObservable[canSymbol.for('can.getValue')]) {
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
            if (childObservable && childObservable[canSymbol.for('can.getValue')]) {
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
            if (parentObservable && parentObservable[canSymbol.for('can.getValue')]) {
                canReflect.onValue(parentObservable, updateChild);
            }
            return updateChild;
        }
    };
    var bindingsRegExp = /\{(\()?(\^)?([^\}\)]+)\)?\}/, ignoreAttributesRegExp = /^(data-view-id|class|id|\[[\w\.-]+\]|#[\w\.-])$/i, DOUBLE_CURLY_BRACE_REGEX = /\{\{/g, encodedSpacesRegExp = /\\s/g;
    var getBindingInfo = function (node, attributeViewModelBindings, templateType, tagName) {
        var bindingInfo, attributeName = node.name, attributeValue = node.value || '';
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
                    parent: 'attribute',
                    parentName: attributeName,
                    child: 'viewModel',
                    childName: vmName,
                    parentToChild: true,
                    childToParent: true,
                    syncChildWithParent: true
                };
            } else {
                return {
                    bindingAttributeName: attributeName,
                    parent: 'scope',
                    parentName: scopeName,
                    child: 'viewModel',
                    childName: vmName,
                    parentToChild: true,
                    childToParent: true,
                    syncChildWithParent: true
                };
            }
        }
        var twoWay = !!matches[1], childToParent = twoWay || !!matches[2], parentToChild = twoWay || !childToParent;
        var childName = matches[3];
        var isDOM = childName.charAt(0) === '$';
        if (isDOM) {
            bindingInfo = {
                parent: 'scope',
                child: 'attribute',
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
                parent: 'scope',
                child: 'viewModel',
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
        return name.replace(encodedSpacesRegExp, ' ');
    };
    var makeDataBinding = function (node, el, bindingData) {
        var bindingInfo = getBindingInfo(node, bindingData.attributeViewModelBindings, bindingData.templateType, el.nodeName.toLowerCase());
        if (!bindingInfo) {
            return;
        }
        bindingInfo.alreadyUpdatedChild = bindingData.alreadyUpdatedChild;
        if (bindingData.initializeValues) {
            bindingInfo.initializeValues = true;
        }
        var parentObservable = getObservableFrom[bindingInfo.parent](el, bindingData.scope, bindingInfo.parentName, bindingData, bindingInfo.parentToChild), childObservable = getObservableFrom[bindingInfo.child](el, bindingData.scope, bindingInfo.childName, bindingData, bindingInfo.childToParent, bindingInfo.stickyParentToChild && parentObservable), updateParent, updateChild;
        if (bindingData.nodeList) {
            if (parentObservable && parentObservable.computeInstance) {
                parentObservable.computeInstance.setPrimaryDepth(bindingData.nodeList.nesting + 1);
            }
            if (childObservable && childObservable.computeInstance) {
                childObservable.computeInstance.setPrimaryDepth(bindingData.nodeList.nesting + 1);
            }
        }
        if (bindingInfo.parentToChild) {
            updateChild = bind.parentToChild(el, parentObservable, childObservable, bindingData.semaphore, bindingInfo.bindingAttributeName);
        }
        var completeBinding = function () {
            if (bindingInfo.childToParent) {
                updateParent = bind.childToParent(el, parentObservable, childObservable, bindingData.semaphore, bindingInfo.bindingAttributeName, bindingInfo.syncChildWithParent);
            } else if (bindingInfo.stickyParentToChild && childObservable[canSymbol.for('can.onValue')]) {
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
        if (bindingInfo.child === 'viewModel') {
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
            return value && value[canSymbol.for('can.getValue')] ? canReflect.getValue(value) : value;
        }, unbindUpdate = function (observable, updater) {
            if (observable && observable[canSymbol.for('can.getValue')] && typeof updater === 'function') {
                canReflect.offValue(observable, updater);
            }
        }, cleanVMName = function (name) {
            return name.replace(/@/g, '');
        };
    var special = {
        enter: function (data, el, original) {
            return {
                event: 'keyup',
                handler: function (ev) {
                    if (ev.keyCode === 13 || ev.key === 'Enter') {
                        return original.call(this, ev);
                    }
                }
            };
        }
    };
    module.exports = {
        behaviors: behaviors,
        getBindingInfo: getBindingInfo,
        special: special
    };
});