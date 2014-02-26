/*global CodeMirror, Math*/

(function(CodeMirror, Math, undefined) {
    "use strict";

    // define local vars
    var

    /**
     * String value of the current token that is being hinted.
     *
     * Required for a check to prevent firing the hinting function
     * multiple times for the same token.
     * 
     * @type {String}
     */
    currentToken = null,

    /**
     * Shortcut to CodeMirror.Pos() function.
     * 
     * @type {Function}
     */
    Pos = CodeMirror.Pos,

    /**
     * Returns a list of hint options for the given token.
     * 
     * @param  {Object} token Token for which to prepare hint list.
     * @param  {Object|null} previous Token before the token for hinting so that the list can be context aware. 
     * @return {Array}
     */
    getHintList = function(token, previous, config) {
        var candidates = [],
            hints = [],
            str = token.string.toLowerCase(),
            strLength = str.length,
            i;

        // operators can only occur after targets or "cs" operator
        if (previous && (
            previous.type === 'target'
            || (previous.type === 'operator' && previous.string === 'cs')
        )) {
            candidates = candidates.concat(config.operators);
        }

        // logical operators can only occur after operators or values or brackets or keywords
        if (previous && (
            previous.type === 'operator'
            || previous.type === 'string'
            || previous.type === 'number'
            || previous.type === 'closebracket'
            || previous.type === 'keyword'
        )) {
            candidates = candidates.concat(config.logical);
        }

        // targets can only occur after opening brackets, keywords or logicals or nothing
        if (previous === undefined || previous === null || !previous
            || previous.type === null
            || previous.type === 'openbracket'
            || previous.type === 'keyword'
            || previous.type === 'logical'
        ) {
            candidates = candidates.concat(config.targets);
        }

        // keywords can only occur after opening brackets, closing brackets or nothing
        if (previous === undefined || previous === null || !previous
            || previous.type === null
            || previous.type === 'openbracket'
            || previous.type === 'closebracket'
        ) {
            candidates = candidates.concat(config.keywords);
        }

        // punctuation control can only occur after "contains", "contains_any" and "contains_near" operators
        if (previous !== undefined && previous !== null && previous.type === 'operator' && (
            previous.string.toLowerCase() === 'contains'
            || previous.string.toLowerCase() === 'contains_any'
            || previous.string.toLowerCase() === 'continas_near'
        )) {
            candidates = candidates.concat(config.punctuationControl);
        }

        // and now filter the candidates
        for (i = 0; i < candidates.length; i++) {
            // if a substr of the candidate matches the string then autocomplete
            // but not if the candidate's length === input string length because we dont want to autocomplete
            // what's already written
            if (candidates[i].length !== strLength && candidates[i].substr(0, strLength) === str) {
                hints.push(candidates[i]);
            }
        }

        return hints;
    };

    /**
     * Defines a CSDL hint functionality on CodeMirror.
     * 
     * @param  {CodeMirror} cm CodeMirror instance.
     * @param  {Object} config Configuration object of the current editor.
     * @return {Object} Object conforming to hinting interface.
     */
    CodeMirror.csdlHint = function(cm, config) {
        var cursor = cm.getCursor(),
            token = cm.getTokenAt(cursor),
            list = [];

        // work around to not let the same hint being called many many times
        if (token.string === currentToken) {
            return;
        }
        currentToken = token.string;

        // only match words and outside of comments
        if (token.state.type !== 'comment' && token.state.type !== 'string' && /^[0-9a-zA-Z_<>=!\.\(\)\[\]]+$/.test(token.string)) {
            var previousToken = CodeMirror.getPreviousToken(cm, cursor, token);
            list = getHintList(token, previousToken, config);
            list.sort();
        }

        // workaround so that if only one hint is found CodeMirror doesn't automatically insert it
        if (list.length === 1) {
            list.push(' ');
        }

        return {
            list : list,
            from : Pos(cursor.line, token.start),
            to : Pos(cursor.line, token.end)
        };
    };

})(CodeMirror, Math);