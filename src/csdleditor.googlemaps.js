/*global CSDLEditor, google*/
(function(CSDLEditor, window, undefined) {
    "use strict";

CSDLEditor.Loader.addComponent(function($) {

    // define some local vars
    var $body = $('body'),
        /** @type {Boolean} Flag whether or not the Google Maps JS API has been already loaded. */
        loaded = false,
        /** @type {CSDLEditor.Editor} Editor instance for which Google Maps are being loaded. */
        currentEditor = null,
        /** @type {Function} Callback function to call after Google Maps have been loaded. */
        currentCallback = $.noop,
        /** @type {Array} Arguments for the callback. */
        currentCallbackArgs = [];
    
    /**
     * General map config/options.
     * 
     * @type {Object}
     */
    CSDLEditor.mapsOptions = {};

    /**
     * Loads Google Maps JavaScript API and calls the given callback from the given editor instance
     * with the given callback arguments.
     * 
     * @param  {CSDLEditor.Editor} editor Instance of the editor that is requesting to load GMaps.
     * @param  {Function} callback Callback function to call when the api has been loaded.
     * @param  {Array} callbackArgs Arguments for the callback.
     */
    CSDLEditor.loadGoogleMaps = function(editor, callback, callbackArgs) {
        currentEditor = editor;
        currentCallback = callback;
        currentCallbackArgs = callbackArgs;

        if (!loaded) {
            var key = (editor.options.googleMapsApiKey.length) ? 'key=' + editor.options.googleMapsApiKey + '&' : '',
                protocol = (window.location.protocol == 'file:') ? 'http:' : ''; // if not loaded from file then allow for dynamic protocol

            $body.append('<script type="text/javascript" src="' + protocol + '//maps.googleapis.com/maps/api/js?' + key + 'libraries=places,geometry&sensor=false&callback=CSDLEditor.mapsInit" />');
            loaded = true;
        } else {
            CSDLEditor.mapsInit();
        }
    };

    /**
     * Callback called directly by Google Maps JS API. It will setup some dependencies and config
     * and call the originally requested user callback.
     */
    CSDLEditor.mapsInit = function() {
        CSDLEditor.mapsOptions = {
            center: new google.maps.LatLng(40, 0),
            zoom: 1,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            },
            navigationControl: true,
            navigationControlOptions: {
                style: google.maps.NavigationControlStyle.SMALL
            }
        };

        // extend the Polygon of Google Maps API
        if (!google.maps.Polygon.prototype.getBounds) {
            google.maps.Polygon.prototype.getBounds = function(latLng) {
                var bounds = new google.maps.LatLngBounds(),
                    paths = this.getPaths(),
                    path, p, i;

                for (p = 0; p < paths.getLength(); p++) {
                    path = paths.getAt(p);

                    for (i = 0; i < path.getLength(); i++) {
                        bounds.extend(path.getAt(i));
                    }
                }

                return bounds;
            };
        }

        if (currentEditor && currentCallback) {
            setTimeout(function() {
                currentCallback.apply(currentEditor, currentCallbackArgs);
            }, 210); // make sure the map canvas is fully visible before loading them
        }
    };

});

})(CSDLEditor, window);