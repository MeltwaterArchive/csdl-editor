/*! jQuery Appendix - v0.8.4-csdleditor
* A small set of functions appended to jQuery that make your life even easier.
*
* https://github.com/michaldudek/jQuery-Appendix
*
* Copyright (c) 2013 Michał Dudek, http://www.michaldudek.pl, michal@michaldudek.pl
* MIT License, https://github.com/michaldudek/jQuery-Appendix/blob/master/LICENSE.md
*/

/*global CSDLEditor, Math*/

(function(CSDLEditor, window, document, Math, undefined) {
    "use strict";

CSDLEditor.Loader.addComponent(function($) {

    $.extend($, {

        /*
         * TOOLS THAT EXTEND BASIC OBJECTS
         * but can't be in their prototypes
         */
        /*
         * STRING
         */
        string : {

            /**
             * Parses the string looking for variables to insert from the given set of variables.
             * Ie. looks for occurrences of {$foo} or {bar} and replaces them with values found
             * under 'foo' and 'bar' keys of the passed object.
             *
             * @param {String} str String to have the variables injected.
             * @param {Object} variables[optional] Object containing variables to be injected.
             * @return {String}
             */
            parseVariables : function(str, variables) {
                variables = variables || {};

                return str.replace(/\{(\$?[\w\d]+)\}/gi, function(match, key) {
                    var dollar = (key.substr(0, 1) === '$'); // has dollar sign?
                    if (dollar) {
                        key = key.substr(1);
                    }

                    if (variables[key] === null) {
                        return '';
                    }

                    if (variables[key] !== undefined) {
                        return variables[key];
                    }

                    if (!dollar) {
                        return '{' + key + '}';
                    }

                    return '';
                });
            },

            /**
             * Trims the string of spaces or the given charlist.
             * This method is taked from PHP.JS project (phpjs.org)
             *
             * @param {String} str String to be trimmed.
             * @param {String} chars[optional] Optional list of characters that should be trimmed.
             * @return {String}
             */
            trim : function(str, chars) {
                var ws,
                    l = 0,
                    i = 0;
             
                if (!chars) {
                    // default list
                    ws = " \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000";
                } else {
                    // preg_quote custom list
                    chars += '';
                    ws = chars.replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '$1');
                }
             
                l = str.length;
                for (i = 0; i < l; i++) {
                    if (ws.indexOf(str.charAt(i)) === -1) {
                        str = str.substring(i);
                        break;
                    }
                }
             
                l = str.length;
                for (i = l - 1; i >= 0; i--) {
                    if (ws.indexOf(str.charAt(i)) === -1) {
                        str = str.substring(0, i + 1);
                        break;
                    }
                }
             
                return ws.indexOf(str.charAt(0)) === -1 ? str : '';
            }

        },

        /*
         * NUMBER
         */
        number : {

            /**
             * Formats the number.
             *
             * @param {Number} num Number to be formatted.
             * @param {Number} decimals[optional] How many decimal points. Default: 2.
             * @param {String} decimalPoint[optional] Decimal point. Default: '.'.
             * @param {String} thousandsSeparator[optional] Thousands separator. Default: ','.
             * @return {String}
             */
            format : function(num, decimals, decimalPoint, thousandsSeparator) {
                decimals = (decimals === undefined) ? 2 : decimals;
                decimalPoint = decimalPoint || '.';
                thousandsSeparator = thousandsSeparator || ',';

                // strip all characters but numerical ones
                num = num.toString().replace(/[^0-9+\-Ee.]/g, '');

                var n = !isFinite(+num) ? 0 : +num,
                    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
                    str = '',

                    toFixedFix = function(n, prec) {
                        var k = Math.pow(10, prec);
                        return '' + Math.round(n * k) / k;
                    };

                // Fix for IE parseFloat(0.55).toFixed(0) = 0;
                str = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');

                if (str[0].length > 3) {
                    str[0] = str[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, thousandsSeparator);
                }
                
                if ((str[1] || '').length < prec) {
                    str[1] = str[1] || '';
                    str[1] += new Array(prec - str[1].length + 1).join('0');
                }
                return str.join(decimalPoint);
            }

        }

    });

});

})(CSDLEditor, window, document, Math);