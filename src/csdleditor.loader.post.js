/*global CSDLEditor*/
(function(CSDLEditor, window, undefined) {
    "use strict";

    if (!window.jQuery) {
        var h = document.getElementsByTagName('head'),
            s = document.createElement('script');
        s.src = 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js';
        s.type = 'text/javascript';
        h[0].appendChild(s);
        CSDLEditor.Loader.timeout(true);
    } else {
        CSDLEditor.Loader.load();
    }
})(CSDLEditor, window);