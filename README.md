DataSift CSDL Editor
======

DataSift CSDL Editor is a code editor for [CSDL](http://dev.datasift.com/csdl).

# Installation

Include the following files on your page:

    <link rel="stylesheet" href="[path_to_editor]/csdleditor.min.css">
    <script type="text/javascript" src="[path_to_editor]/csdleditor.config.js"></script>
    <script type="text/javascript" src="[path_to_editor]/csdleditor.min.js"></script>

Prepare a HTML element where the editor will be embedded:

    <div id="csdleditor"></div>

And initialize the editor in JavaScript:

    var editor = new CSDLEditor.Editor('#csdleditor', {});

This will return instance of the editor. The second argument is a list of options (see below).

You can also initialize the editor as a jQuery plugin:

    $('#csdleditor').csdlEditor({});

This will return a jQuery object (```$('#csdleditor')```). The second argument is a list of options (see below).

## Options

There are several options you can pass to the editor on its initialization. They should be passed as properties
of an object literal.

    var options = {
        value : '',                     // initial value of the editor (CSDL code)
        googleMapsApiKey: '',           // if you have a Google Maps API key it is advised to set it here for additional usage allowance

        // visual tweaks
        mapsOverlay : {                 // arguments for the overlay of Google Map
            strokeWeight : 0,
            fillColor : '#7585dd',
            fillOpacity : 0.5
        },
        mapsMarker : null,              // URL to the marker image used on maps if you want to specify your own

        // hooks/event handles
        save : function(code) {},       // event triggered on manual user save
        autosave : function(code) {},    // event triggered on auto save 
	autofocus: false		// autofocus on initialization; defaults to false
    };

# Save/autosave

There are two hooks for save events that you can use. You can define them on initialization when passing options (see above).

```save``` event is triggered when user manually clicks "Save" button (or presses ctrl/cmd+s)
```autosave``` event is triggered few miliseconds after user has applied latest change to the content of the editor

Both hooks take one argument ```code``` which is the current value/content inside the editor.

Corresponding DOM events are also triggered on the element on which the editor was initialized.

# Public methods

When using the editor as a jQuery plugin you can call several public methods:

    // assuming the editor was already initialized on $('#csdleditor'):
    $('#csdleditor').csdlEditor('save'); // triggers save

    var val = $('#csdleditor').csdlEditor('value'); // reads the value from the editor
    $('#csdleditor').csdlEditor('value', 'interaction.content contains "datasift"'); // sets the value of the editor to what is passed as 2nd argument

    $('#csdleditor').csdlEditor('showIndicator'); // shows loading indicator in the bottom bar
    $('#csdleditor').csdlEditor('hideIndicator'); // hides the loading indicator in the bottom bar

    $('#csdleditor').csdlEditor('fullscreen'); // maximizes the editor to full screen
    $('#csdleditor').csdlEditor('maximize'); // maximizes the editor to full screen
    $('#csdleditor').csdlEditor('minimize'); // minimizes the editor

    $('#csdleditor').csdlEditor('undo'); // triggers an undo
    $('#csdleditor').csdlEditor('redo'); // triggers a redo

# Contributing

The editor uses [Bundy](https://github.com/michaldudek/Bundy) to build minified version. Install it using NPM:

    $ npm install bundy

And then run `bundy.js`:

    $ node bundy.js

This will minify all JavaScript and CSS files and copy image files and place them inside `minified/` directory.
