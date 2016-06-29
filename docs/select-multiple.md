@function can-stache-bindings.can-value-select-multiple select multiple
@parent can.view.bindings.can-value
@release 2.1

Cross bind a value to a `<select>` element with multiple selections permitted.

@signature `<select multiple can-value='KEY'/>`

Cross binds the selected option values with an observable value.

@param {can.mustache.key} KEY A named value in the current 
scope. `KEY`'s value is cross bound with the selected `<option>` in
the `<select>`. `KEY`'s value should be either Array-like, a String,
or `undefined`.

@body

## Use

Select elements with the multiple attribute (`<select multiple can-value="KEY"/>`)
have a specified behavior if the value of KEY is Array like, a String, or 
undefined.

## Cross binding to Arrays

`<select>` tags with a multiple attribute cross bind
a [can-map] property, [can-compute.computed] or [can-list]
in sync with the selected items of the `<select>` element.

For example, the following template:

    <select multiple can-value="colors">
      <option value='red'>Red</option>
      <option value='green'>Green</option>
      <option value='yellow'>Yellow</option>
    </select>

Could be rendered with one of the following:

    // A can-map property
    new Map({colors: []})

    // A compute
    { colors: canCompute([]) }

    // A can.List
    { colors: new List() }
    
@demo can/view/bindings/doc/select_multiple.html

## Cross binding Strings

If the [can-map] property or [can-compute.computed] value is a 
string like:

    new Map({color: "red;green"});
    { colors: canCompute("red;green") }

The string will be split by `";"`. The items in the split
string are used as values to match against `<option>` tag values.

@demo can/view/bindings/doc/select_multiple_string.html

## Cross binding undefined 

If the `KEY` value begins as undefined [can-map] property like:

    new Map({colors: undefined});
    
The property will be converted to a [can-list].

If the `KEY` value begins as an undefined [can-compute.computed] like:
    
    {colors: canCompute()}

The value of the compute will be set to an array.

@demo can/view/bindings/doc/select_multiple_undefined.html
