// # can-stache-bindings.js
//
// This module provides CanJS's default data and event bindings.
// It's broken up into several parts:
//
// - Behaviors - Binding behaviors that run given an attribute or element.
// - Attribute Syntaxes - Hooks up custom attributes to their behaviors.
// - getComputeFrom - Methods that return a compute cross bound to the scope, viewModel, or element.
// - bind - Methods for setting up cross binding
// - getBindingInfo - A helper that returns the details of a data binding given an attribute.
// - makeDataBinding - A helper method for setting up a data binding.
// - initializeValues - A helper that initializes a data binding.
var expression = require('can-stache/src/expression');
var viewCallbacks = require('can-view-callbacks');
var live = require('can-view-live');
var Scope = require('can-view-scope');
var canViewModel = require('can-view-model');
var canEvent = require('can-event');
var canBatch = require('can-event/batch/batch');
var compute = require('can-compute');
var observeReader = require('can-observation/reader/reader');
var Observation = require('can-observation');

var assign = require('can-util/js/assign/assign');
var makeArray  = require('can-util/js/make-array/make-array');
var each  = require('can-util/js/each/each');
var string = require('can-util/js/string/string');
var dev = require('can-util/js/dev/dev');
var types = require('can-types');
var last = require('can-util/js/last/last');

var getMutationObserver = require('can-util/dom/mutation-observer/mutation-observer');
var domEvents = require('can-util/dom/events/events');
require('can-util/dom/events/removed/removed');
require('can-event-radiochange/override').override(domEvents);
var domData = require('can-util/dom/data/data');
var attr = require('can-util/dom/attr/attr');
var canLog = require('can-util/js/log/log');
var stacheHelperCore = require("can-stache/helpers/core");

	// ## Behaviors
	var behaviors = {
		// ### bindings.behaviors.viewModel
		// Sets up all of an element's data binding attributes to a "soon-to-be-created"
		// `viewModel`.
		// This is primarily used by `can.Component` to ensure that its
		// `viewModel` is initialized with values from the data bindings as quickly as possible.
		// Component could look up the data binding values itself.  However, that lookup
		// would have to be duplicated when the bindings are established.
		// Instead, this uses the `makeDataBinding` helper, which allows creation of the `viewModel`
		// after scope values have been looked up.
		//
		// - `makeViewModel(initialViewModelData)` - a function that returns the `viewModel`.
		// - `initialViewModelData` any initial data that should already be added to the `viewModel`.
		//
		// Returns:
		// - `function` - a function that tears all the bindings down. Component
		// wants all the bindings active so cleanup can be done during a component being removed.
		viewModel: function(el, tagData, makeViewModel, initialViewModelData){
			initialViewModelData = initialViewModelData || {};

			var bindingsSemaphore = {},
				viewModel,
				// Stores callbacks for when the viewModel is created.
				onCompleteBindings = [],
				// Stores what needs to be called when the element is removed
				// to prevent memory leaks.
				onTeardowns = {},
				// Track info about each binding, we need this for binding attributes correctly.
				bindingInfos = {},
				attributeViewModelBindings = assign({}, initialViewModelData);

			// For each attribute, we start the binding process,
			// and save what's returned to be used when the `viewModel` is created,
			// the element is removed, or the attribute changes values.
			each( makeArray(el.attributes), function(node){

				var dataBinding = makeDataBinding(node, el, {
					templateType: tagData.templateType,
					scope: tagData.scope,
					semaphore: bindingsSemaphore,
					getViewModel: function(){
						return viewModel;
					},
					attributeViewModelBindings: attributeViewModelBindings,
					alreadyUpdatedChild: true,
					nodeList: tagData.parentNodeList
				});
				if(dataBinding) {
					// For bindings that change the viewModel,
					if(dataBinding.onCompleteBinding) {
						// save the initial value on the viewModel.
						if(dataBinding.bindingInfo.parentToChild && dataBinding.value !== undefined) {
							initialViewModelData[cleanVMName(dataBinding.bindingInfo.childName)] = dataBinding.value;
						}
						// Save what needs to happen after the `viewModel` is created.
						onCompleteBindings.push(dataBinding.onCompleteBinding);
					}
					onTeardowns[node.name] = dataBinding.onTeardown;
				}

			});

			// Create the `viewModel` and call what needs to be happen after
			// the `viewModel` is created.
			viewModel = makeViewModel(initialViewModelData);

			for(var i = 0, len = onCompleteBindings.length; i < len; i++) {
				onCompleteBindings[i]();
			}

			// Listen to attribute changes and re-initialize
			// the bindings.
			domEvents.addEventListener.call(el, "attributes", function (ev) {
				var attrName = ev.attributeName,
					value = el.getAttribute(attrName);

				if( onTeardowns[attrName] ) {
					onTeardowns[attrName]();
				}
				// Parent attribute bindings we always re-setup.
				var parentBindingWasAttribute = bindingInfos[attrName] && bindingInfos[attrName].parent === "attribute";

				if(value !== null || parentBindingWasAttribute ) {
					var dataBinding = makeDataBinding({name: attrName, value: value}, el, {
						templateType: tagData.templateType,
						scope: tagData.scope,
						semaphore: {},
						getViewModel: function(){
							return viewModel;
						},
						attributeViewModelBindings: attributeViewModelBindings,
						// always update the viewModel accordingly.
						initializeValues: true,
						nodeList: tagData.parentNodeList
					});
					if(dataBinding) {
						// The viewModel is created, so call callback immediately.
						if(dataBinding.onCompleteBinding) {
							dataBinding.onCompleteBinding();
						}
						bindingInfos[attrName] = dataBinding.bindingInfo;
						onTeardowns[attrName] = dataBinding.onTeardown;
					}
				}
			});

			return function(){
				for(var attrName in onTeardowns) {
					onTeardowns[attrName]();
				}
			};
		},
		// ### bindings.behaviors.data
		// This is called when an individual data binding attribute is placed on an element.
		// For example `{^value}="name"`.
		data: function(el, attrData){
			if(domData.get.call(el,"preventDataBindings")){
				return;
			}
			var viewModel = canViewModel(el),
				semaphore = {},
				teardown;

			// If a two-way binding, take extra measure to ensure
			//  that parent and child sync values properly.
			var twoWay = bindingsRegExp.exec(attrData.attributeName)[1];

			// Setup binding
			var dataBinding = makeDataBinding({
				name: attrData.attributeName,
				value: el.getAttribute(attrData.attributeName),
				nodeList: attrData.nodeList
			}, el, {
				templateType: attrData.templateType,
				scope: attrData.scope,
				semaphore: semaphore,
				getViewModel: function(){
					return viewModel;
				},
				syncChildWithParent: twoWay
			});

			if(dataBinding.onCompleteBinding) {
				dataBinding.onCompleteBinding();
			}
			teardown = dataBinding.onTeardown;
			canEvent.one.call(el, 'removed', function(){
				teardown();
			});

			// Listen for changes
			domEvents.addEventListener.call(el, "attributes", function (ev) {
				var attrName = ev.attributeName,
					value = el.getAttribute(attrName);

				if( attrName === attrData.attributeName ) {

					if( teardown ) {
						teardown();
					}

					if(value !== null  ) {

						var dataBinding = makeDataBinding({name: attrName, value: value}, el, {
							templateType: attrData.templateType,
							scope: attrData.scope,
							semaphore: semaphore,
							getViewModel: function(){
								return viewModel;
							},
							// always update the viewModel accordingly.
							initializeValues: true,
							nodeList: attrData.nodeList,
							syncChildWithParent: twoWay
						});
						if(dataBinding) {
							// The viewModel is created, so call callback immediately.
							if(dataBinding.onCompleteBinding) {
								dataBinding.onCompleteBinding();
							}
							teardown = dataBinding.onTeardown;
						}
					}

				}
			});
		},
		// ### bindings.behaviors.reference
		// Provides the shorthand `*ref` behavior that exports the `viewModel`.
		// For example `{^value}="name"`.
		reference: function(el, attrData) {
			if(el.getAttribute(attrData.attributeName)) {
				canLog.warn("*reference attributes can only export the view model.");
			}

			var name = string.camelize( attrData.attributeName.substr(1).toLowerCase() );

			var viewModel = canViewModel(el);
			var refs = attrData.scope.getRefs();
			refs._context.attr("*"+name, viewModel);
		},
		// ### bindings.behaviors.event
		// The following section contains code for implementing the can-EVENT attribute.
		// This binds on a wildcard attribute name. Whenever a view is being processed
		// and can-xxx (anything starting with can-), this callback will be run.  Inside, its setting up an event handler
		// that calls a method identified by the value of this attribute.
		event: function(el, data) {

			// Get the `event` name and if we are listening to the element or viewModel.
			// The attribute name is the name of the event.
			var attributeName = data.attributeName,
			// The old way of binding is can-X
				legacyBinding = attributeName.indexOf('can-') === 0,
				event = attributeName.indexOf('can-') === 0 ?
					attributeName.substr("can-".length) :
					removeBrackets(attributeName, '(', ')'),
				onBindElement = legacyBinding;

			event = decodeAttrName(event);

			if(event.charAt(0) === "$") {
				event = event.substr(1);
				onBindElement = true;
			}

			// This is the method that the event will initially trigger. It will look up the method by the string name
			// passed in the attribute and call it.
			var handler = function (ev) {
					var attrVal = el.getAttribute(attributeName);
					if (!attrVal) { return; }

					var viewModel = canViewModel(el);

					// expression.parse will read the attribute
					// value and parse it identically to how mustache helpers
					// get parsed.
					var expr = expression.parse(removeBrackets(attrVal),{
						lookupRule: function(){
							return expression.Lookup;
						}, methodRule: "call"});

					if(!(expr instanceof expression.Call) && !(expr instanceof expression.Helper)) {

						var defaultArgs = [data.scope._context, el].concat(makeArray(arguments)).map(function(data){
							return new expression.Arg(new expression.Literal(data));
						});
						expr = new expression.Call(expr, defaultArgs, {} );
					}

					// make a scope with these things just under
					var localScope = data.scope.add({
						"@element": el,
						"@event": ev,
						"@viewModel": viewModel,
						"@scope": data.scope,
						"@context": data.scope._context,

						"%element": this,
						"$element": types.wrapElement(el),
						"%event": ev,
						"%viewModel": viewModel,
						"%scope": data.scope,
						"%context": data.scope._context,
						"%arguments": arguments
					},{
						notContext: true
					});


					// We grab the first item and treat it as a method that
					// we'll call.
					var scopeData = localScope.read(expr.methodExpr.key, {
						isArgument: true
					}), args, stacheHelper, stacheHelperResult;

					if (!scopeData.value) {
						// nothing found yet, look for a stache helper
						var name = observeReader.reads(expr.methodExpr.key).map(function(part){
							return part.key;
						}).join(".");

						stacheHelper = stacheHelperCore.getHelper(name);
						if(stacheHelper){
							args = expr.args(localScope, null)();
							stacheHelperResult = stacheHelper.fn.apply(localScope.peek("."), args);
							if(typeof stacheHelperResult === "function"){
							  stacheHelperResult(el);
							}
							return stacheHelperResult;
						}

						//!steal-remove-start
						dev.warn("can-stache-bindings: " + attributeName + " couldn't find method named " + expr.methodExpr.key, {
							element: el,
							scope: data.scope
						});
						//!steal-remove-end

						return null;
					}

					args = expr.args(localScope, null)();
					return scopeData.value.apply(scopeData.parent, args);
				};

			// This code adds support for special event types, like can-enter="foo". special.enter (or any special[event]) is
			// a function that returns an object containing an event and a handler. These are to be used for binding. For example,
			// when a user adds a can-enter attribute, we'll bind on the keyup event, and the handler performs special logic to
			// determine on keyup if the enter key was pressed.
			if (special[event]) {
				var specialData = special[event](data, el, handler);
				handler = specialData.handler;
				event = specialData.event;
			}

			var context;
			if(onBindElement){
				context = el;
			}else{
				if(event.indexOf(" ") >= 0){
					var eventSplit = event.split(" ");
					context = data.scope.get(eventSplit[0]);
					event = eventSplit[1];
				}else{
					context = canViewModel(el);
				}
			}

			// Unbind the event when the attribute is removed from the DOM
			var attributesHandler = function(ev) {
				var isEventAttribute = ev.attributeName === attributeName;
				var isRemoved = !this.getAttribute(attributeName);
				var isEventAttributeRemoved = isEventAttribute && isRemoved;
				if (isEventAttributeRemoved) {
					unbindEvent();
				}
			};
			// Unbind the event when the target is removed from the DOM
			var removedHandler = function(ev) {
				unbindEvent();
			};
			var unbindEvent = function() {
				canEvent.off.call(context, event, handler);
				canEvent.off.call(el, 'attributes', attributesHandler);
				canEvent.off.call(el, 'removed', removedHandler);
			};

			// Bind the handler defined above to the element we're currently processing and the event name provided in this
			// attribute name (can-click="foo")
			canEvent.on.call(context, event, handler);
			canEvent.on.call(el, 'attributes', attributesHandler);
			canEvent.on.call(el, 'removed', removedHandler);
		},
		// ### bindings.behaviors.value
		// Behavior for the deprecated can-value
		value: function(el, data) {
			var propName = "$value",
				attrValue = removeBrackets(el.getAttribute("can-value")).trim(),
				nodeName = el.nodeName.toLowerCase(),
				elType = nodeName === "input" && (el.type || el.getAttribute("type")),
				getterSetter;

			if (nodeName === "input" && (elType === "checkbox" || elType === "radio")) {

				var property = getComputeFrom.scope(el, data.scope, attrValue, {}, true);
				if (el.type === "checkbox") {

					var trueValue = attr.has(el, "can-true-value") ? el.getAttribute("can-true-value") : true,
						falseValue = attr.has(el, "can-false-value") ? el.getAttribute("can-false-value") : false;

					getterSetter = compute(function (newValue) {
						// jshint eqeqeq: false
						var isSet = arguments.length !== 0;
						var isCompute = property && property.isComputed;
						if (isCompute) {
							if (isSet) {
								property(newValue ? trueValue : falseValue);
							} else {
								return property() == trueValue;
							}
						} else {
							if (isSet) {
								// TODO: https://github.com/canjs/can-stache-bindings/issues/180
							} else {
								return property == trueValue;
							}
						}
					});
				}
				else if(elType === "radio") {
					// radio is two-way bound to if the property value
					// equals the element value
					getterSetter = compute(function (newValue) {
						// jshint eqeqeq: false
						var isSet = arguments.length !== 0 && newValue;
						var isCompute = property && property.isComputed;
						if (isCompute) {
							if (isSet) {
								property(el.value);
							} else {
								return property() == el.value;
							}
						} else {
							if (isSet) {
								// TODO: https://github.com/canjs/can-stache-bindings/issues/180
							} else {
								return property == el.value;
							}
						}
					});
				}
				propName = "$checked";
				attrValue = "getterSetter";
				data.scope = new Scope({
					getterSetter: getterSetter
				});
			}
			// For contenteditable elements, we instantiate a Content control.
			else if (isContentEditable(el)) {
				propName = "$innerHTML";
			}

			var dataBinding = makeDataBinding({
				name: "{(" + propName + "})",
				value: attrValue
			}, el, {
				templateType: data.templateType,
				scope: data.scope,
				semaphore: {},
				initializeValues: true,
				legacyBindings: true
			});

			canEvent.one.call(el, "removed", function(){
				dataBinding.onTeardown();
			});

		}
	};


	// ## Attribute Syntaxes
	// The following sets up the bindings functions to be called
	// when called in a template.

	// `{}="bar"` data bindings.
	viewCallbacks.attr(/^\{[^\}]+\}$/, behaviors.data);

	// `*ref-export` shorthand.
	viewCallbacks.attr(/\*[\w\.\-_]+/, behaviors.reference);

	// `(EVENT)` event bindings.
	viewCallbacks.attr(/^\([\$?\w\.\\]+\)$/, behaviors.event);


	//!steal-remove-start
	function syntaxWarning(el, attrData) {
		dev.warn('can-stache-bindings: mismatched binding syntax - ' + attrData.attributeName);
	}
	viewCallbacks.attr(/^\(.+\}$/, syntaxWarning);
	viewCallbacks.attr(/^\{.+\)$/, syntaxWarning);
	viewCallbacks.attr(/^\(\{.+\}\)$/, syntaxWarning);
	//!steal-remove-end


	// Legacy bindings.
	viewCallbacks.attr(/can-[\w\.]+/, behaviors.event);
	viewCallbacks.attr("can-value", behaviors.value);


	// ## getComputeFrom
	// An object of helper functions that make a getter/setter compute
	// on different types of objects.
	var getComputeFrom = {
		// ### getComputeFrom.scope
		// Returns a compute from the scope.  This handles expressions like `someMethod(.,1)`.
		scope: function(el, scope, scopeProp, bindingData, mustBeACompute, stickyCompute){
			if(!scopeProp) {
				return compute();
			} else {
				if(mustBeACompute) {
					var parentExpression = expression.parse(scopeProp,{baseMethodType: "Call"});
					return parentExpression.value(scope, new Scope.Options({}));
				} else {
					return function(newVal){
						scope.set(cleanVMName(scopeProp), newVal);
					};
				}
			}

		},
		// ### getComputeFrom.viewModel
		// Returns a compute that's two-way bound to the `viewModel` returned by
		// `options.getViewModel()`.
		viewModel: function(el, scope, vmName, bindingData, mustBeACompute, stickyCompute) {
			var setName = cleanVMName(vmName);
			if(mustBeACompute) {
				return compute(function(newVal){
					var viewModel = bindingData.getViewModel();
					if(arguments.length) {
						if( types.isMapLike(viewModel) ) {
							observeReader.set(viewModel,setName,newVal);
						} else {
							viewModel[setName] = newVal;
						}

					} else {
						return vmName === "." ? viewModel : observeReader.read(viewModel, observeReader.reads(vmName), {}).value;
					}
				});
			} else {
				return function(newVal){
					var childCompute;
					var viewModel = bindingData.getViewModel();

					function updateViewModel(value, options) {
						if( types.isMapLike(viewModel) ) {
							observeReader.set(viewModel, setName, value, options);
						} else {
							viewModel[setName] = value;
						}
					}

					if(stickyCompute) {
						childCompute = observeReader.get(viewModel, setName, { readCompute: false });
						// childCompute is a compute at this point unless it was locally overwritten
						//  in the child viewModel.
						if(!childCompute || !childCompute.isComputed) {
							// If it was locally overwritten, make a new compute for the property.
							childCompute = compute();
							updateViewModel(childCompute, { readCompute: false });
						}
						// Otherwise update the compute's value.
						childCompute(newVal);
					} else {
						updateViewModel(newVal);
					}
				};
			}


		},
		// ### getComputeFrom.attribute
		// Returns a compute that is two-way bound to an attribute or property on the element.
		attribute: function(el, scope, prop, bindingData, mustBeACompute, stickyCompute, event){
			// Determine the event or events we need to listen to
			// when this value changes.
			if(!event) {
				event = "change";
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

			var hasChildren = el.nodeName.toLowerCase() === "select",
				isMultiselectValue = prop === "value" && hasChildren && el.multiple,
				// Sets the element property or attribute.
				set = function(newVal){
					if(bindingData.legacyBindings && hasChildren &&
						 ("selectedIndex" in el) && prop === "value") {
						attr.setAttrOrProp(el, prop, newVal == null ? "" : newVal);
					} else {
						attr.setAttrOrProp(el, prop, newVal);
					}

					return newVal;
				},
				get = function(){
					return attr.get(el, prop);
				};

			if(isMultiselectValue) {
				prop = "values";
			}

			return compute(get(), {
				on: function(updater){
					if (event === "radiochange") {
						canEvent.on.call(el, "change", updater);
					}

					canEvent.on.call(el, event, updater);
				},
				off: function(updater){
					if (event === "radiochange") {
						canEvent.off.call(el, "change", updater);
					}

					canEvent.off.call(el, event, updater);
				},
				get: get,
				set: set
			});
		}
	};

	// ## bind
	// An object with helpers that perform bindings in a certain direction.
	// These use the semaphore to prevent cycles.
	var bind = {
		// ## bind.childToParent
		// Listens to the child and updates the parent when it changes.
		// - `syncChild` - Makes sure the child is equal to the parent after the parent is set.
		childToParent: function(el, parentCompute, childCompute, bindingsSemaphore, attrName, syncChild){
			var parentUpdateIsFunction = typeof parentCompute === "function";

			// Updates the parent if
			var updateParent = function(ev, newVal){

				if (!bindingsSemaphore[attrName]) {
					if(parentUpdateIsFunction) {
						parentCompute(newVal);

						if( syncChild ) {
							// If, after setting the parent, it's value is not the same as the child,
							// update the child with the value of the parent.
							// This is used by `can-value`.
							if(parentCompute() !== childCompute()) {
								bindingsSemaphore[attrName] = (bindingsSemaphore[attrName] || 0 )+1;
								childCompute(parentCompute());
								Observation.afterUpdateAndNotify(function(){
									--bindingsSemaphore[attrName];
								});
							}
						}
					}
					// The parentCompute can sometimes be just an observable if the observable
					// is on a plain JS object. This updates the observable to match whatever the
					// new value is.
					else if(types.isMapLike(parentCompute)) {
						// !steal-dev-start
						var attrValue = el.getAttribute(attrName);
						dev.warn("can-stache-bindings: Merging " + attrName + " into " + attrValue + " because its parent is non-observable");
						// !steal-dev-end
						(parentCompute.set || parentCompute.attr).call(
							parentCompute,
							newVal.serialize ? newVal.serialize() : newVal,
							true
						);
					}
				}
			};

			if(childCompute && childCompute.isComputed) {
				childCompute.bind("change", updateParent);
			}

			return updateParent;
		},
		// parent -> child binding
		parentToChild: function(el, parentCompute, childUpdate, bindingsSemaphore, attrName){

			// setup listening on parent and forwarding to viewModel
			var updateChild = function(ev, newValue){

				// Save the viewModel property name so it is not updated multiple times.
				// We listen for when the batch has ended, and all observation updates have ended.
				bindingsSemaphore[attrName] = (bindingsSemaphore[attrName] || 0 )+1;
				canBatch.start();
				childUpdate(newValue);

				// only after computes have been updated, reduce the update counter
				Observation.afterUpdateAndNotify(function(){
					--bindingsSemaphore[attrName];
				});
				canBatch.stop();
			};

			if(parentCompute && parentCompute.isComputed) {
				parentCompute.bind("change", updateChild);
			}

			return updateChild;
		}
	};

	// Regular expressions for getBindingInfo
	var bindingsRegExp = /\{(\()?(\^)?([^\}\)]+)\)?\}/,
		ignoreAttributesRegExp = /^(data-view-id|class|id|\[[\w\.-]+\]|#[\w\.-])$/i,
		DOUBLE_CURLY_BRACE_REGEX = /\{\{/g,
		encodedSpacesRegExp = /\\s/g;

	// ## getBindingInfo
	// takes a node object like {name, value} and returns
	// an object with information about that binding.
	// Properties:
	// - `parent` - where is the parentName read from: "scope", "attribute", "viewModel".
	// - `parentName` - what is the parent property that should be read.
	// - `child` - where is the childName read from: "scope", "attribute", "viewModel".
	//  - `childName` - what is the child property that should be read.
	// - `parentToChild` - should changes in the parent update the child.
	// - `childToParent` - should changes in the child update the parent.
	// - `bindingAttributeName` - the attribute name that created this binding.
	// - `initializeValues` - should parent and child be initialized to their counterpart.
	// If undefined is return, there is no binding.
	var getBindingInfo = function(node, attributeViewModelBindings, templateType, tagName){
		var bindingInfo,
			attributeName = node.name,
			attributeValue = node.value || "";

		// Does this match the new binding syntax?
		var matches = attributeName.match(bindingsRegExp);
		if(!matches) {
			var ignoreAttribute = ignoreAttributesRegExp.test(attributeName);
			var vmName = string.camelize(attributeName);

			//!steal-remove-start
			// user tried to pass something like id="{foo}", so give them a good warning
			// Something like id="{{foo}}" is ok, though. (not a binding)
			if(ignoreAttribute && node.value.replace(DOUBLE_CURLY_BRACE_REGEX, "").indexOf("{") > -1) {
				dev.warn("can-component: looks like you're trying to pass "+attributeName+" as an attribute into a component, "+
				"but it is not a supported attribute");
			}
			//!steal-remove-end

			// if this is handled by another binding or a attribute like `id`.
			if ( ignoreAttribute || viewCallbacks.attr(attributeName) ) {
				return;
			}
			var syntaxRight = attributeValue[0] === "{" && last(attributeValue) === "}";
			var isAttributeToChild = templateType === "legacy" ? attributeViewModelBindings[vmName] : !syntaxRight;
			var scopeName = syntaxRight ? attributeValue.substr(1, attributeValue.length - 2 ) : attributeValue;
			if(isAttributeToChild) {
				return {
					bindingAttributeName: attributeName,
					parent: "attribute",
					parentName: attributeName,
					child: "viewModel",
					childName: vmName,
					parentToChild: true,
					childToParent: true,
					syncChildWithParent: true
				};
			} else {
				return {
					bindingAttributeName: attributeName,
					parent: "scope",
					parentName: scopeName,
					child: "viewModel",
					childName: vmName,
					parentToChild: true,
					childToParent: true,
					syncChildWithParent: true
				};
			}
		}

		var twoWay = !!matches[1],
			childToParent = twoWay || !!matches[2],
			parentToChild = twoWay || !childToParent;

		var childName = matches[3];
		var isDOM = childName.charAt(0) === "$";
		if(isDOM) {
			bindingInfo = {
				parent: "scope",
				child: "attribute",
				childToParent: childToParent,
				parentToChild: parentToChild,
				bindingAttributeName: attributeName,
				childName: childName.substr(1),
				parentName: attributeValue,
				initializeValues: true,
				syncChildWithParent: twoWay
			};
			if(tagName === "select") {
				bindingInfo.stickyParentToChild = true;
			}
			return bindingInfo;
		} else {
			bindingInfo = {
				parent: "scope",
				child: "viewModel",
				childToParent: childToParent,
				parentToChild: parentToChild,
				bindingAttributeName: attributeName,
				childName: decodeAttrName(string.camelize(childName)),
				parentName: attributeValue,
				initializeValues: true,
				syncChildWithParent: twoWay
			};
			if(attributeValue.trim().charAt(0) === "~") {
				bindingInfo.stickyParentToChild = true;
			}
			return bindingInfo;
		}

	};
	var decodeAttrName = function(name){
		return name.replace(encodedSpacesRegExp, " ");
	};


	// ## makeDataBinding
	// Makes a data binding for an attribute `node`.  Returns an object with information
	// about the binding, including an `onTeardown` method that undoes the binding.
	// If the data binding involves a `viewModel`, an `onCompleteBinding` method is returned on
	// the object.  This method must be called after the element has a `viewModel` with the
	// `viewModel` to complete the binding.
	//
	// - `node` - an attribute node or an object with a `name` and `value` property.
	// - `el` - the element this binding belongs on.
	// - `bindingData` - an object with:
	//   - `templateType` - the type of template.
	//   - `scope` - the `Scope`,
	//   - `semaphore` - an object that keeps track of changes in different properties to prevent cycles,
	//   - `getViewModel`  - a function that returns the `viewModel` when called.  This function can be passed around (not called) even if the
	//      `viewModel` doesn't exist yet.
	//   - `attributeViewModelBindings` - properties already specified as being a viewModel<->attribute (as opposed to viewModel<->scope) binding.
	//
	// Returns:
	// - `undefined` - If this isn't a data binding.
	// - `object` - An object with information about the binding.
	var makeDataBinding = function(node, el, bindingData){

		// Get information about the binding.
		var bindingInfo = getBindingInfo(node, bindingData.attributeViewModelBindings, bindingData.templateType, el.nodeName.toLowerCase());
		if(!bindingInfo) {
			return;
		}
		// assign some bindingData props to the bindingInfo
		bindingInfo.alreadyUpdatedChild = bindingData.alreadyUpdatedChild;
		if( bindingData.initializeValues) {
			bindingInfo.initializeValues = true;
		}

		// Get computes for the parent and child binding
		var parentCompute = getComputeFrom[bindingInfo.parent](
				el,
				bindingData.scope,
				bindingInfo.parentName,
				bindingData, bindingInfo.parentToChild
			),
			childCompute = getComputeFrom[bindingInfo.child](
				el,
				bindingData.scope,
				bindingInfo.childName,
				bindingData,
				bindingInfo.childToParent,
				bindingInfo.stickyParentToChild && parentCompute
			),
			// these are the functions bound to one compute that update the other.
			updateParent,
			updateChild,
			childLifecycle;

		if(bindingData.nodeList) {
			if(parentCompute && parentCompute.isComputed){
				parentCompute.computeInstance.setPrimaryDepth(bindingData.nodeList.nesting+1);
			}
			if(childCompute && childCompute.isComputed){
				childCompute.computeInstance.setPrimaryDepth(bindingData.nodeList.nesting+1);
			}
		}

		// Only bind to the parent if it will update the child.
		if(bindingInfo.parentToChild){
			updateChild = bind.parentToChild(el, parentCompute, childCompute, bindingData.semaphore, bindingInfo.bindingAttributeName);
		}

		// This completes the binding.  We can't call it right away because
		// the `viewModel` might not have been created yet.
		var completeBinding = function(){
			if(bindingInfo.childToParent){
				// setup listening on parent and forwarding to viewModel
				updateParent = bind.childToParent(el, parentCompute, childCompute, bindingData.semaphore, bindingInfo.bindingAttributeName,
					bindingInfo.syncChildWithParent);
			}
			// the child needs to be bound even if
			else if(bindingInfo.stickyParentToChild) {
				childCompute.bind("change", childLifecycle = function(){});
			}

			if(bindingInfo.initializeValues) {
				initializeValues(bindingInfo, childCompute, parentCompute, updateChild, updateParent);
			}


		};
		// This tears down the binding.
		var onTeardown = function() {
			unbindUpdate(parentCompute, updateChild);
			unbindUpdate(childCompute, updateParent);
			unbindUpdate(childCompute, childLifecycle);
		};
		// If this binding depends on the viewModel, which might not have been created,
		// return the function to complete the binding as `onCompleteBinding`.
		if(bindingInfo.child === "viewModel") {
			return {
				value: bindingInfo.stickyParentToChild ? compute(getValue(parentCompute)) : getValue(parentCompute),
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

	// ## initializeValues
	// Updates the parent or child value depending on the direction of the binding
	// or if the child or parent is `undefined`.
	var initializeValues = function(bindingInfo, childCompute, parentCompute, updateChild, updateParent){
		var doUpdateParent = false;
		if(bindingInfo.parentToChild && !bindingInfo.childToParent) {
			// updateChild
		}
		else if(!bindingInfo.parentToChild && bindingInfo.childToParent) {
			doUpdateParent = true;
		}
		// Two way
		// Update child or parent depending on who has a value.
		// If both have a value, update the child.
		else if( getValue(childCompute) === undefined) {
			// updateChild
		} else if(getValue(parentCompute) === undefined) {
			doUpdateParent = true;
		}

		if(doUpdateParent) {
			updateParent({}, getValue(childCompute) );
		} else {
			if(!bindingInfo.alreadyUpdatedChild) {
				updateChild({}, getValue(parentCompute) );
			}
		}
	};

	// For "sticky" select values, we need to know when `<option>`s are
	// added or removed to a `<select>`.  If we don't have
	// MutationObserver, we need to setup can.view.live to
	// callback when this happens.
	if( !getMutationObserver() ) {
		var updateSelectValue = function(el){
			var bindingCallback = domData.get.call(el,"canBindingCallback");
			if(bindingCallback) {
				bindingCallback.onMutation(el);
			}
		};
		live.registerChildMutationCallback("select",updateSelectValue);
		live.registerChildMutationCallback("optgroup",function(el){
			updateSelectValue(el.parentNode);
		});
	}


	// ## isContentEditable
	// Determines if an element is contenteditable.
	// An element is contenteditable if it contains the `contenteditable`
	// attribute set to either an empty string or "true".
	// By default an element is also contenteditable if its immediate parent
	// has a truthy version of the attribute, unless the element is explicitly
	// set to "false".
	var isContentEditable = (function(){
		// A contenteditable element has a value of an empty string or "true"
		var values = {
			"": true,
			"true": true,
			"false": false
		};

		// Tests if an element has the appropriate contenteditable attribute
		var editable = function(el){
			// DocumentFragments do not have a getAttribute
			if(!el || !el.getAttribute) {
				return;
			}

			var attr = el.getAttribute("contenteditable");
			return values[attr];
		};

		return function (el){
			// First check if the element is explicitly true or false
			var val = editable(el);
			if(typeof val === "boolean") {
				return val;
			} else {
				// Otherwise, check the parent
				return !!editable(el.parentNode);
			}
		};
	})(),
		removeBrackets = function(value, open, close){
			open = open || "{";
			close = close || "}";

			if(value[0] === open && value[value.length-1] === close) {
				return value.substr(1, value.length - 2);
			}
			return value;
		},
		getValue = function(value){
			return value && value.isComputed ? value() : value;
		},
		unbindUpdate = function(compute, updateOther){
			if(compute && compute.isComputed && typeof updateOther === "function") {
				compute.unbind("change", updateOther);
			}
		},
		cleanVMName = function(name){
			return name.replace(/@/g,"");
		};


	// ## Special Event Types (can-SPECIAL)
	//
	// A special object, similar to [$.event.special](http://benalman.com/news/2010/03/jquery-special-events/),
	// for adding hooks for special can-SPECIAL types (not native DOM events). Right now, only can-enter is
	// supported, but this object might be exported so that it can be added to easily.
	//
	// To implement a can-SPECIAL event type, add a property to the special object, whose value is a function
	// that returns the following:
	//
	//		// the real event name to bind to
	//		event: "event-name",
	//		handler: function (ev) {
	//			// some logic that figures out if the original handler should be called or not, and if so...
	//			return original.call(this, ev);
	//		}
	var special = {
		enter: function (data, el, original) {
			return {
				event: "keyup",
				handler: function (ev) {
					if (ev.keyCode === 13 || ev.key === "Enter") {
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
