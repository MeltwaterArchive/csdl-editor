/*global CodeMirror*/

(function(CodeMirror, undefined) {
    "use strict";
    
    // define local vars
    var

    /**
     * Dictionary of all available CSDL targets.
     * 
     * @type {Object}
     */
    targets = {},

    /**
     * Dictionary of all available CSDL operators.
     * 
     * @type {Object}
     */
    operators = {},

    /**
     * Dictionary of all available CSDL logical operators.
     * 
     * @type {Object}
     */
    logicals = {},

    /**
     * Dictionary of all available CSDL keywords.
     * 
     * @type {Object}
     */
    keywords = {},

    /**
     * Dictionary of all available CSDL punctuation controls.
     * 
     * @type {Object}
     */
    punctuationControl = {},

    /**
     * Default tokenizer that will try to recognize tokens.
     * 
     * @param  {StringStream} stream Current stream object.
     * @param  {Object} state State for the tokenizer.
     * @return {String|null}
     */
    tokenize = function(stream, state) {
        var ch = stream.next();

        state.type = null;

        // end of line
        if (ch === undefined) {
            return null;
        }

        /*
         * TOKENIZE
         */
        // open brackets
        if (ch === '(' || ch === '{') {
            state.type = 'openbracket';
            return 'openbracket';

        // close brackets
        } else if (ch === ')' || ch === '}') {
            state.type = 'closebracket';
            return 'closebracket';

        // quoted string
        } else if (ch === '"' || ch === "'") {
            // replace the tokenizer with special tokenizer for strings
            // that will match the stream until the quote is closed
            state.type = 'string';
            state.tokenize = getStringTokenizer(ch);
            return state.tokenize(stream, state);

        // single line comment
        } else if (ch === "/" && stream.eat("/")) {
            state.type = 'comment';
            stream.skipToEnd();
            return 'comment';

        // multi line comment
        } else if (ch === "/" && stream.eat("*")) {
            // replace the tokenizer with special tokenizer for comments
            // that will match the stream until the comment is closed
            state.tokenize = tokenizeComment;
            return state.tokenize(stream, state);

        // number
        } else if (ch.charCodeAt(0) > 47 && ch.charCodeAt(0) < 58
            // also require next one to not be a character
            && !/^[\w]$/.test(stream.peek())
        ) {
            stream.match(/^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/);
            state.type = 'number';
            return 'number';

        // double without the leading 0 (e.g. .5)
        } else if (ch === "." && stream.match(/^[0-9eE]+/)) {
            state.type = 'number';
            return 'number';
        }

        // now match full words - search until a space or bracket has been found
        stream.eatWhile(/^[^\s\(\)\{\}]/);
        var word = stream.current().toLowerCase();

        // is it an operator?
        if (operators.hasOwnProperty(word)) {
            return 'operator';
        }

        // is it a logical
        if (logicals.hasOwnProperty(word)) {
            return 'logical';
        }

        // is it a keyword?
        if (keywords.hasOwnProperty(word)) {
            return 'keyword';
        }

        // include namespaced tag as a keyword as well
        if (word.substr(0, 4) === 'tag.') {
            return 'keyword';
        }

        // include namespaced tags as a keyword as well
        if (word.substr(0, 5) === 'tags.') {
            return 'keyword';
        }

        // is it a start of punctuation control tag?
        if (word === '[keep') {
            stream.eatWhile(/^[^\s]/);
            word = stream.current().toLowerCase();
        }

        // is it a punctuation control?
        if (punctuationControl.hasOwnProperty(word)) {
            return 'punctuation';
        }

        // is it a target? (checking as last for better performance)
        if (targets.hasOwnProperty(word)) {
            return 'target';
        }

        // didn't match any token so return null
        return null;
    },

    /**
     * Returns a tokenizer for strings wrapped in single or double quotes.
     *
     * The tokenizer will look for the given unescaped quote character to mark the end of the token.
     * 
     * @param  {String} quote Quote character used for this string.
     * @return {Function}
     */
    getStringTokenizer = function(quote) {
        return function(stream, state) {
            var escaped = false,
                ch;

            while ((ch = stream.next()) !== null && ch !== undefined) {
                if (ch === quote && !escaped) {
                    state.tokenize = tokenize;
                    break;
                }

                escaped = !escaped && ch === "\\";
            }

            return "string";
        };
    },

    /**
     * Tokenizer for multi line comments that are inbetween /* and * / chars.
     * 
     * @param  {StringStream} stream Current stream object.
     * @param  {Object} state State for the tokenizer.
     * @return {String} Always returns "comment"
     */
    tokenizeComment = function(stream, state) {
        while (true) {
            state.type = 'comment';
            if (stream.skipTo("*")) {
                stream.next();
                if (stream.eat("/")) {
                    state.type = null;
                    state.tokenize = tokenize;
                    break;
                }
            } else {
                stream.skipToEnd();
                break;
            }
        }

        return "comment";
    },

    /**
     * Converts the given array to an object where the array values are keys.
     *
     * Also converts all string values to lower case.
     *
     * The object is filled with (Boolean)true values.
     * 
     * @param  {Array} arr Array to be converted.
     * @return {Object}
     */
    arrayToDictionary = function(arr) {
        if (arr === undefined || arr === null || !arr || !arr.length) {
            return {};
        }

        var obj = {},
            val,
            i;

        for (i = 0; i < arr.length; i++) {
            val = arr[i];

            if (typeof val === 'string') {
                val = val.toLowerCase();
            }

            obj[val] = true;
        }

        return obj;
    };
    

    CodeMirror.defineMode("csdl", function(config, parserConfig) {
        targets = arrayToDictionary(parserConfig.targets);
        operators = arrayToDictionary(parserConfig.operators);
        logicals = arrayToDictionary(parserConfig.logical);
        keywords = arrayToDictionary(parserConfig.keywords);
        punctuationControl = arrayToDictionary(parserConfig.punctuationControl);

        function pushContext(stream, state, type) {
            state.context = {
                prev: state.context,
                indent: stream.indentation(),
                col: stream.column(),
                type: type
            };
        }

        function popContext(state) {
            state.indent = state.context.indent;
            state.context = state.context.prev;
        }

        return {
            startState: function() {
                return {
                    tokenize : tokenize,
                    type : null
                };
            },

            token: function(stream, state) {
                // skip spaces
                if (stream.eatSpace()) {
                    return null;
                }

                // use the current tokenizer (could be altered for strings and comments)
                var style = state.tokenize(stream, state);

                // for comments don't proceed to indentation logic
                if (style === "comment") {
                    return style;
                }

                var tok = stream.current();
                if (tok === "(") {
                    pushContext(stream, state, ")");
                } else if (state.context && state.context.type === tok) {
                    popContext(state);
                }

                return style;
            },

            indent: function(state, textAfter) {
                var cx = state.context;
                if (!cx) {
                    return CodeMirror.Pass;
                }

                if (cx.align) {
                    return cx.col + (textAfter.charAt(0) === cx.type ? 0 : 1);
                } else {
                    return cx.indent + config.indentUnit;
                }
            }
        };

    });

    CodeMirror.defineMIME('text/x-csdl', 'csdl');

})(CodeMirror);