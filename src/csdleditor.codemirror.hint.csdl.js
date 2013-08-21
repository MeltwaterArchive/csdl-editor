/*global CodeMirror, CSDLEditorConfig, Math*/

(function(CodeMirror, CSDLEditorConfig, Math, undefined) {
    "use strict";

    // define local vars
    var

    /**
     * List of all available targets.
     * 
     * @type {Array}
     */
    targets = CSDLEditorConfig.targets,

    /**
     * List of logical operators.
     * 
     * @type {Array}
     */
    logical = CSDLEditorConfig.logical,

    /**
     * List of all available operators.
     * 
     * @type {Array}
     */
    operators = CSDLEditorConfig.operators,

    /**
     * List of all available keywords.
     * 
     * @type {Array}
     */
    keywords = CSDLEditorConfig.keywords,

    /**
     * List of all available punctuation controls.
     * 
     * @type {Array}
     */
    punctuationControl = CSDLEditorConfig.punctuationControl,

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
    getHintList = function(token, previous) {
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
            candidates = candidates.concat(operators);
        }

        // logical operators can only occur after operators or values or brackets or keywords
        if (previous && (
            previous.type === 'operator'
            || previous.type === 'string'
            || previous.type === 'number'
            || previous.type === 'closebracket'
            || previous.type === 'keyword'
        )) {
            candidates = candidates.concat(logical);
        }

        // targets can only occur after opening brackets, keywords or logicals or nothing
        if (previous === undefined || previous === null || !previous
            || previous.type === null
            || previous.type === 'openbracket'
            || previous.type === 'keyword'
            || previous.type === 'logical'
        ) {
            candidates = candidates.concat(targets);
        }

        // keywords can only occur after opening brackets, closing brackets or nothing
        if (previous === undefined || previous === null || !previous
            || previous.type === null
            || previous.type === 'openbracket'
            || previous.type === 'closebracket'
        ) {
            candidates = candidates.concat(keywords);
        }

        // punctuation control can only occur after "contains", "contains_any" and "contains_near" operators
        if (previous !== undefined && previous.type === 'operator' && (
            previous.string.toLowerCase() === 'contains'
            || previous.string.toLowerCase() === 'contains_any'
            || previous.string.toLowerCase() === 'continas_near'
        )) {
            candidates = candidates.concat(punctuationControl);
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
     * @return {Object} Object conforming to hinting interface.
     */
    CodeMirror.csdlHint = function(cm) {
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
            list = getHintList(token, previousToken);
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

})(CodeMirror, CSDLEditorConfig, Math);