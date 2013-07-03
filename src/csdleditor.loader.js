var CSDLEditor = {}; // register namespace

(function(CSDLEditor, window, undefined) {
    "use strict";

    CSDLEditor.Loader = {
        // array list of functions to be called when loading
        compnts : [],
        // array list of functions to be called when finished loadign
        loaded : [],

        isLoaded : false,

        addComponent : function(f) {
            if (typeof f === 'function') {
                CSDLEditor.Loader.compnts.push(f);
            }
        },
        addLoaded : function(f) {
            if (typeof f === 'function') {
                CSDLEditor.Loader.loaded.push(f);
            }
        },

        load : function() {
            var $ = window.jQuery;

            // delay to DOM ready
            $(function() {
                $.each(CSDLEditor.Loader.compnts, function() {
                    this.apply(window, [$, CSDLEditor]);
                });
                
                $.each(CSDLEditor.Loader.loaded, function() {
                    this.apply(window, [$, CSDLEditor]);
                });

                CSDLEditor.Loader.isLoaded = true;
            });
        },

        timeout : function(nc) {
            setTimeout(function() {
                if (window.jQuery) {
                    if (nc) {
                        window.jQuery.noConflict();
                    }

                    CSDLEditor.Loader.load();
                } else {
                    CSDLEditor.Loader.timeout();
                }
            }, 100);
        }
    };

    CSDLEditor.onLoad = function(f) {
        if (typeof f !== 'function') {
            return false;
        }

        // if editor already loaded then call immediately
        if (CSDLEditor.Loader.isLoaded) {
            f.apply(window, [window.jQuery]);

        // but normally add to queue
        } else {
            CSDLEditor.Loader.addLoaded(f);
        }
    };

})(CSDLEditor, window);