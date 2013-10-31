/*global CSDLEditor, CodeMirror*/
(function(CSDLEditor, CodeMirror, document, undefined) {
    "use strict";

CSDLEditor.Loader.addComponent(function($) {

    // define privates
    var

    /**
     * Name of the gutter.
     * 
     * @type {String}
     */
    gutterName = 'CodeMirror-foldgutter',

    /**
     * Checks if the given token is folded.
     *
     * Returns false if isn't folded or appropriate TextMarker if it is.
     * 
     * @param {CodeMirror} cm CodeMirror instance.
     * @param {Number} l Line number (zero-indexed).
     * @param {CodeMirror.Token} token Token to be checked.
     * @return {Boolean|CodeMirror.TextMarker}
     */
    isTokenFolded = function(cm, l, token) {
        var marks = cm.findMarksAt(CodeMirror.Pos(l, token.start));
        if (marks.length) {
            return marks[0];
        }
        return false;
    },

    /**
     * Toggles fold on the given token.
     * 
     * @param {CodeMirror} cm CodeMirror instance.
     * @param {Number} l Line number (zero-indexed).
     * @param {CodeMirror.Token} token Token to be checked.
     */
    toggleFoldToken = function(cm, l, token) {
        var foldMark = isTokenFolded(cm, l, token);
        if (foldMark) {
            unfoldToken(cm, l, token, foldMark);
        } else {
            foldToken(cm, l, token);
        }
    },

    /**
     * Folds the given token.
     * 
     * @param {CodeMirror} cm CodeMirror instance.
     * @param {Number} l Line number (zero-indexed).
     * @param {CodeMirror.Token} token Token to be checked.
     * @param {CodeMirror.TextMarker} foldMark [optional] Marker associated with the given token (if any).
     */
    foldToken = function(cm, l, token, foldMark) {
        foldMark = foldMark || isTokenFolded(cm, l, token);
        if (foldMark || !isFoldableToken(cm, token)) {
            return;
        }

        var foldMarkElement = $('<span class="csdl-folded-string">' + token.string.substr(0, cm.getOption('foldedLength')) + '..."</span>')[0];

        foldMark = cm.markText(CodeMirror.Pos(l, token.start), CodeMirror.Pos(l, token.end), {
            className : 'csdl-folded-string',
            atomic : true,
            replacedWith : foldMarkElement
        });

        cm.refresh();

        $(foldMarkElement).on('click', function() {
            var pos = foldMark.find();
            foldMark.clear();

            if (pos) {
                isFoldableLine(cm, pos.from.line);
                cm.focus();
                cm.setCursor({
                    line : pos.from.line,
                    ch : pos.from.ch + 1
                });
            }
        });
    },

    /**
     * Unfolds the given token.
     * 
     * @param {CodeMirror} cm CodeMirror instance.
     * @param {Number} l Line number (zero-indexed).
     * @param {CodeMirror.Token} token Token to be checked.
     * @param {CodeMirror.TextMarker} foldMark [optional] Marker associated with the given token (if any).
     */
    unfoldToken = function(cm, l, token, foldMark) {
        foldMark = foldMark || isTokenFolded(cm, l, token);
        if (!foldMark) {
            return;
        }

        foldMark.clear();
        cm.refresh();
    },

    /**
     * Returns tokens of the given type (or types) found on the given line.
     *
     * @param  {CodeMirror} cm CodeMirror instance.
     * @param  {Number} l Line number.
     * @param  {String} type [optional] Type of the token to find. Default: 'string'.
     * @return {Array}
     */
    getTokensInLine = function(cm, l, type) {
        type = type || 'string';
        var tokens = [],
            line = cm.getLineHandle(l),
            token = null,
            ch = 1;

        if (!line) {
            return tokens;
        }

        while (ch < line.text.length) {
            token = cm.getTokenAt(CodeMirror.Pos(l, ch));
            ch = token.type !== null ? token.end + 2 : ch + 1;

            if (token.type === type) {
                tokens.push(token);
            }
        }

        return tokens;
    },

    /*****************************************
     * GUTTER
     *****************************************/
    /**
     * Sets a marker in the gutter for the given line.
     * 
     * @param {CodeMirror} cm CodeMirror instance.
     * @param {Number} l Line number (zero-indexed).
     * @param {String} type [optional] Type of the marker. Default: 'fold'.
     */
    setMarker = function(cm, l, type) {
        type = type || 'fold';
        cm.setGutterMarker(l, gutterName, buildMarker(type));
        cm.getLineHandle(l).foldable = type;
    },

    /**
     * Clears any marker in the gutter for the given line.
     * 
     * @param {CodeMirror} cm CodeMirror instance.
     * @param {Number} l Line number (zero-indexed).
     */
    clearMarker = function(cm, l) {
        cm.setGutterMarker(l, gutterName, null);

        var line = cm.getLineHandle(l);
        if (line) {
            line.foldable = false;
        }
    },

    /*****************************************
     * HELPERS
     *****************************************/
    /**
     * Checks if the given line is foldable, ie. if it has any tokens inside that can be folded.
     * 
     * @param {CodeMirror} cm CodeMirror instance.
     * @param {Number} l Line number (zero-indexed).
     * @return {Boolean}
     */
    isFoldableLine = function(cm, l) {
        var tokens = getTokensInLine(cm, l, 'string');
        for(var i = 0; i < tokens.length; i++) {
            if (isFoldableToken(cm, tokens[i])) {
                setMarker(cm, l, isTokenFolded(cm, l, tokens[i]) ? 'unfold' : 'fold');
                return true;
            }
        }

        clearMarker(cm, l);
        return false;
    },

    /**
     * Checks if the given token is foldable.
     *
     * @param  {CodeMirror} cm CodeMirror instance.
     * @param  {CodeMirror.Token} token Token to be checked.
     * @return {Boolean}
     */
    isFoldableToken = function(cm, token) {
        return token.type === 'string' && token.string.length > cm.getOption('foldableLength');
    },

    /**
     * Toggles gutter marker type between 'fold' and 'unfold'.
     * 
     * @param  {String} type [optional] Type of the marker. Default: 'fold'.
     * @return {String}
     */
    toggle = function(type) {
        return type === 'fold' ? 'unfold' : 'fold';
    },

    /**
     * Creates a marker element for the gutter.
     * 
     * @param  {String} type [optional] Type of the marker. Default: 'fold'.
     * @return {HTMLDivElement}
     */
    buildMarker = function(type) {
        type = type || 'fold';
        var marker = document.createElement('div');
        marker.className = 'CodeMirror-foldmarker CodeMirror-foldmarker-' + type;
        return marker;
    };

    /*****************************************
     * REGISTER IN CODEMIRROR
     *****************************************/
    CodeMirror.defineOption('foldOnLoad', false);
    CodeMirror.defineOption('foldableLength', 20);
    CodeMirror.defineOption('foldedLength', 5);
    CodeMirror.defineInitHook(function(cm) {
        // check each line if it's foldable to add appropriate gutter markers
        var foldOnLoad = cm.getOption('foldOnLoad'),
            l = 0,
            foldDelay = function(cm, l) {
                setTimeout(function() {
                    var tokens = getTokensInLine(cm, l, 'string');
                    for(var i = 0; i < tokens.length; i++) {
                        foldToken(cm, l, tokens[i]);
                        setMarker(cm, l, 'unfold');
                    }
                }, 50);
            };

        cm.eachLine(function() {
            var foldable = isFoldableLine(cm, l);

            if (foldOnLoad && foldable) {
                // delay folding to next tick so that CodeMirror can properly calculate its full line width
                foldDelay(cm, l);
            }

            l++;
        });

        /*****************************************
         * REGISTER LISTENERS
         *****************************************/
        /**
         * When clicked on the gutter then fold/expand code in that line.
         */
        cm.on('gutterClick', function(cm, l, gutter) {
            if (gutter !== gutterName) {
                return;
            }

            // ignore clicks on non foldable lines
            var line = cm.getLineHandle(l);
            if (!line.foldable) {
                return;
            }

            // toggle marker
            var type = toggle(line.foldable);
            setMarker(cm, l, type);

            // fold/unfold all string tokens in this line
            var tokens = getTokensInLine(cm, l, 'string');
            for(var i = 0; i < tokens.length; i++) {
                if (type === 'fold') {
                    unfoldToken(cm, l, tokens[i]);
                } else {
                    foldToken(cm, l, tokens[i]);
                }
            }
        });

        /**
         * When a change in the value occurs update gutters in all lines that were changed.
         */
        cm.on('change', function(cm, changed) {
            var startLine = changed.from.line,
                endLine = changed.to.line + 1; // check next line just in case (breaks on enter?)

            for (var l = startLine; l <= endLine; l++) {
                isFoldableLine(cm, l);
            }
        });
    });

    CodeMirror.defineExtension('isFoldableLine', isFoldableLine);
    CodeMirror.defineExtension('isFoldableToken', isFoldableToken);
    CodeMirror.defineExtension('toggleFoldToken', toggleFoldToken);
    CodeMirror.defineExtension('foldToken', foldToken);
    CodeMirror.defineExtension('unfoldToken', unfoldToken);

});

})(CSDLEditor, CodeMirror, document);