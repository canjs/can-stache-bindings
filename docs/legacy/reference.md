@function can-stache-bindings.reference *REFERENCE
@parent can-stache-bindings.legacy-syntaxes 4

@description Export a viewModel into a template's references scope.

@deprecated {3.10} This syntax is deprecated in favor of [can-stache-bindings.toParent this:to="scope.vars.refProp"]

@signature `*ref-prop`

  A shorthand for exporting an element’s viewModel to the reference scope.

  @param {String} ref-prop The name of the property to set in the template's 'references' scope.

@body

## Use

Export a view model to the references scope by adding an attribute with the
hyphenated name of the reference scope property:

```html
<year-selector *year-selector />
```


@demo demos/can-stache-bindings-legacy/reference-one-way.html
