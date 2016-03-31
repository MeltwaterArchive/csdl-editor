/*global CSDLEditor, CSDLEditorConfig, CodeMirror, Mousetrap, Math*/

(function(CSDLEditor, CodeMirror, Mousetrap, Math, window, document, undefined) {
    "use strict";

CSDLEditor.Loader.addComponent(function($) {

    var noop = $.noop,
        $win = $(window),
        $doc = $(document),
        $body = $('body'),
        publicMethods = [
            'save',
            'value',
            'verify',
            'error',
            'clearErrors',
            'fullscreen',
            'maximize',
            'minimize',
            'undo',
            'redo',
            'refresh'
        ];

    /**
     * Extend CodeMirror with a function that tries to find a previous token going back from the token given.
     * 
     * @param  {CodeMirror} cm CodeMirror instance.
     * @param  {CodeMirror.Pos} cursor Cursor position.
     * @param  {Object} tokenFrom Object of token from which to start the search.
     * @return {Object|null}
     */
    CodeMirror.getPreviousToken = function(cm, cursor, tokenFrom) {
        var token = null,
            line = cursor.line,
            lineContent = null,
            ch = tokenFrom.start;

        // move the cursor backwards until it finds a token or reaches start
        while(true) {
            // break if reached the beginning
            if (line === 0 && ch === 0) {
                break;
            }

            // if ch reached beginning of line then move to line above
            if (ch === 0) {
                line = line - 1;
                lineContent = cm.getLine(line);
                ch = (typeof lineContent === 'string') ? lineContent.length + 1 : 1; // and set ch to the end of this line
            }

            ch = Math.max(ch - 1, 0); // don't go below 0

            token = cm.getTokenAt(CodeMirror.Pos(line, ch));
            if (token.type !== null && token.type !== 'comment') { // ignore comment tokens as well
                break;
            }
        }

        return token;
    };

    /**
     * Extend CodeMirror with a function that tries to find a next token going forward from the token given.
     *
     * @param  {CodeMirror} cm CodeMirror instance.
     * @param  {CodeMirror.Pos} cursor Cursor position.
     * @param  {Object} tokenFrom Object of token from which to start the search.
     * @return {Object|null}
     */
    CodeMirror.getNextToken = function(cm, cursor, tokenFrom) {
        var token = null,
            line = cursor.line,
            lineContent = cm.getLine(line),
            lineCount = cm.lineCount(),
            ch = tokenFrom.end;

        // move the cursor forwards until it finds a token or reaches the end
        while(true) {
            // break if reached the end
            if (line === lineCount - 1 && ch >= lineContent.length - 1) {
                break;
            }

            // if ch reached end of line then move to line below
            if (ch >= lineContent.length - 1) {
                line = line + 1;
                lineContent = cm.getLine(line);
                ch = 0; // and set ch to the beginning of this line
            } else {
                ch = ch + 1;
            }

            token = cm.getTokenAt(CodeMirror.Pos(line, ch));
            if (token.type !== null && token.type !== 'comment') { // ignore comment tokens as well
                break;
            }
        }

        return token;
    };

    /**
     * Constructor for the CSDLEditor.Editor.
     * 
     * @param {String|jQuery} el DOM element inside of which the editor should be embedded. Can be a jQuery selector or a DOM element or a jQuery DOM element. Must be present in DOM.
     * @param {Object} opt Object with various configuration options.
     */
    CSDLEditor.Editor = function(el, opt) {
        var $el = $(el); // ensure that the container element is a jQuery object
        if (!$el.length) {
            throw new Error("Not a valid DOM element given when creating CSDLEditor.Editor!");
        }

        this.$el = $el.eq(0); // use only on the first matched element

        /** @type {Object} Options object. */
        this.options = $.extend(true, {
            config : {},
            value : '',

            googleMapsApiKey : '',
            mapsOverlay : {
                strokeWeight : 0,
                fillColor : '#7585dd',
                fillOpacity : 0.5
            },
            mapsMarker : null,
            zeroClipboard : null,

            hideTargets : [],
            showTargets : [],

            theme : 'light',
            foldOnLoad : false,
            foldableLength : 20,

            // hooks/event handles
            save : function(code) {
                noop(code);
            },
            autosave : function(code) {
                noop(code);
            },
            themeChange : function(theme) {
                noop(theme);
            },
            verify : false,
            autofocus: false
        }, opt);

        /** @type {Object} Config of CSDLEditor, that can be altered via options. */
        this.config = $.extend(true, CSDLEditorConfig, this.options.config);

        // initialize the editor
        this.init();
    };

    CSDLEditor.Editor.prototype = {
        /** @type {jQuery} DOM element in which the whole editor is built. */
        $container : null,

        /** @type {jQuery} DOM element for the bar above the editor. */
        $topBar : null,
        /** @type {jQuery} DOM element for the bar below the editor. */
        $bottomBar : null,

        $saveBtn : null,
        $undoBtn : null,
        $redoBtn : null,
        $maxBtn : null,
        $minBtn : null,
        $geoBtn : null,
        $verifyBtn : null,

        /** @type {jQuery} DOM element of the indicator. */
        $indicator : null,

        /** @type {jQuery} DOM element displaying help for target hinting. */
        $hintHelp : null,

        /** @type {CodeMirror} CodeMirror instance used in the editor. */
        codeMirror : null,

        /** @type {Number} Line number where an error has been found. */
        errorLine : null,

        /** @type {string} URL to the assets directory. */
        assetsUrl : '/',

        /** @type {jQuery} Geo selection box currently visible. */
        $geo : null,
        /** @type {Boolean} Is geo selection visible? */
        isGeoSelection : false,
        /** @type {String} Name of the current possible geo selection type (box, polygon, radius) based on nearby operator. */
        currentGeoSelectionType : '',
        /** @type {CodeMirror.Token} String token that should get the new geo selection value. */
        currentGeoSelectionValueToken : null,
        /** @type {Number} Line number where the current geo selection value should go in. */
        currentGeoSelectionValueLine : null,

        /** @type {jQuery} List editor currently visible. */
        $list : null,
        /** @type {Boolean} Is list editor visible? */
        isListEditor : false,
        /** @type {CodeMirror.Token} String token that should get the new list value. */
        currentListValueToken : null,
        /** @type {Number} Line number where the current list value should go in. */
        currentListValueLine : null,

        /** @type {Boolean} Full screened flag. */
        isFullscreen : false,
        /** @type {Number} Scroll position before entering fullscreen. */
        fullscreenScrollTop : 0,

        /** @type {Object} Memory cache */
        cache : {
            targetHelp : {}
        },

        undoStackSize : 0,
        originalHeight : 0,

        /**
         * Initializes the editor.
         */
        init : function() {
            var self = this;

            this.$container = this.getTemplate('container').appendTo(this.$el);
            this.$topBar = this.$container.find('[data-bar-top]');
            this.$bottomBar = this.$container.find('[data-bar-bottom]');

            this.$info = this.$container.find('[data-info]');

            this.$saveBtn = this.$container.find('[data-save]');
            this.$undoBtn = this.$container.find('[data-undo]');
            this.$redoBtn = this.$container.find('[data-redo]');
            this.$geoBtn = this.$container.find('[data-geo]');
            this.$listBtn = this.$container.find('[data-list]');
            this.$darkBtn = this.$container.find('[data-theme-dark]');
            this.$lightBtn = this.$container.find('[data-theme-light]');
            this.$maxBtn = this.$container.find('[data-max]');
            this.$minBtn = this.$container.find('[data-min]');
            this.$verifyBtn = this.$container.find('[data-verify]');

            this.assetsUrl = this.guessAssetsUrl();

            // now apply the assets url to maps marker
            if (!this.options.mapsMarker) {
                this.options.mapsMarker = this.assetsUrl + 'images/maps-marker.png';
            }

            if (!this.options.zeroClipboard) {
                this.options.zeroClipboard = this.assetsUrl + 'swf/ZeroClipboard.swf';
            }

            this.config.targets = this.filterTargets(this.config.targets);

            // set configured theme
            this.setTheme(this.options.theme, true);

            // configure CSDL mode for "continue comments" addon
            CodeMirror.extendMode('csdl', {
                blockCommentStart: "/*",
                blockCommentEnd: "*/",
                blockCommentContinue: " * "
            });

            // overwrite/define our custom commands
            CodeMirror.commands.save = function() {
                self.save();
            };

            CodeMirror.commands.undo = function() {
                self.undo();
            };

            CodeMirror.commands.redo = function() {
                self.redo();
            };

            CodeMirror.commands.refresh = function() {
                self.refresh();
            };
            var autosaveTimeout,
                cm = this.codeMirror = CodeMirror(this.$container.find('[data-editor-container]')[0], {
                    value : this.options.value,
                    lineNumbers: true,
                    highlightSelectionMatches : false,
                    styleSelectedText : true,
                    styleActiveLine : true,
                    continueComments : true,
                    placeholder : 'Enter your CSDL code...',
                    mode : {
                        name : 'csdl',
                        targets : this.config.targets,
                        operators : this.config.operators,
                        logical : this.config.logical,
                        unary : this.config.unary,
                        keywords : this.config.keywords,
                        punctuationControl : this.config.punctuationControl
                    },
                    extraKeys : {
                        'Esc' : function() {
                            self.minimize();
                            return false;
                        }
                    },
                    foldOnLoad : this.options.foldOnLoad,
                    foldableLength : this.options.foldableLength,
                    autoCloseBrackets : true,
                    matchBrackets : true,
                    onKeyEvent: function(cm, ev) {
                        if (ev.type === 'keyup' && (ev.which < 37 || ev.which > 40)) {
                            self.showHint();
                        }
                    },
                    gutter: true,
                    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                    autofocus: this.options.autofocus
                });

            // set height to the full height of the container div
            this.originalHeight = this.$el.height() - this.$topBar.outerHeight() - this.$bottomBar.outerHeight();
            cm.setSize(null, this.originalHeight);

            //this.originalHeight = this.$container.find('.CodeMirror').height();

            // show the verify button if verification handler specified
            if (typeof this.options.verify === 'function') {
                this.$verifyBtn.show();
            }

            /*
             * REGISTER LISTENERS
             */
            /**
             * Block standard page save event.
             */
            $doc.on('keydown', function(ev) {
                if (ev.which === 83 && (ev.ctrlKey || ev.metaKey)) {
                    ev.preventDefault();
                    return false;
                }
            });

            /**
             * Autosave the editor on change.
             *
             * Triggers 'autosave' event after a 0.5s timeout of last change.
             */
            cm.on('change', function() {
                clearTimeout(autosaveTimeout);
                autosaveTimeout = setTimeout(function() {
                    self.trigger('autosave', [self.value()]);
                }, 500);
            });

            /**
             * Do various stuff when cursor moves to a token.
             *
             * When inside a string token and that string is after one of the geo_* operators then allow for
             * geo selection.
             *
             * When inside a target token then show target help.
             */
            cm.on('cursorActivity', function() {
                var cursor = cm.getCursor(),
                    token = cm.getTokenAt(cursor);

                self.toggleGeoSelectionForToken(token, cursor);
                self.toggleListEditorForToken(token, cursor);
            });

            /**
             * Helper variable to prevent hiding of the hinted target help in few cases.
             * 
             * @type {Boolean}
             */
            var dontHideHintTargetHelp = false;

            /**
             * On editor blur event hide hint target help.
             */
            cm.on('blur', function() {
                // delay the hiding of hint target help a bit so that any clicks inside of it can be caught
                setTimeout(function() {
                    if (!dontHideHintTargetHelp) {
                        self.hideHintTargetHelp();
                        dontHideHintTargetHelp = false;
                    }
                }, 100);
            });

            /**
             * Allow clicks on hint list to also display target help.
             */
            $body.on('click', '.CodeMirror-hints .CodeMirror-hint', function() {
                self.showHintTargetHelp($(this));
                dontHideHintTargetHelp = true;
            });

            /**
             * Catch any clicks inside the hint help and either open them in new window or show popup with full help.
             */
            $body.on('click', '.csdl-hint-help a', function() {
                var $el = $(this);

                dontHideHintTargetHelp = false;

                // open popup with full help?
                if ($el.is('.csdl-hint-help-more')) {
                    self.showHelpPopup($el.data('target'));
                    return false;

                } else {
                    // just open the link in new tab
                    window.open($el.attr('href'), '_blank');
                    return false;
                }
            });

            /**
             * Triggers the save event.
             */
            this.$saveBtn.click(function() {
                if ($(this).is('.csdl-inactive')) {
                    return false;
                }

                self.save();
                return false;
            });

            /**
             * Undo a change.
             */
            this.$undoBtn.click(function() {
                if ($(this).is('.csdl-inactive')) {
                    return false;
                }

                self.undo();
                return false;
            });

            /**
             * Redo an undone change.
             */
            this.$redoBtn.click(function() {
                if ($(this).is('.csdl-inactive')) {
                    return false;
                }

                self.redo();
                return false;
            });

            /**
             * Maximize to full screen.
             */
            this.$maxBtn.click(function() {
                self.maximize();
                return false;
            });

            /**
             * Minimize from full screen.
             */
            this.$minBtn.click(function() {
                self.minimize();
                return false;
            });

            /**
             * Show geo selection window if possible.
             */
            this.$geoBtn.click(function() {
                if (self.$geoBtn.is('.csdl-inactive') || !self.currentGeoSelectionType.length) {
                    return false;
                }

                if (self.isGeoSelection) {
                    self.hideGeoSelection();
                } else {
                    self.showGeoSelection(self.currentGeoSelectionType);
                }

                return false;
            });

            /**
             * Show list editor window if possible.
             */
            this.$listBtn.click(function() {
                if ($(this).is('.csdl-inactive')) {
                    return false;
                }

                if (self.isListEditor) {
                    self.hideListEditor();
                } else {
                    self.showListEditor();
                }

                return false;
            });

            /**
             * Switch to light theme.
             */
            this.$lightBtn.click(function() {
                self.setTheme('light');
                return false;
            });

            /**
             * Switch to dark theme.
             */
            this.$darkBtn.click(function() {
                self.setTheme('dark');
                return false;
            });

            /**
             * Verify the current code.
             */
            this.$verifyBtn.click(function() {
                if ($(this).is('.csdl-inactive')) {
                    return false;
                }

                self.verify();
                return false;
            });

            /**
             * Show target help popup when right-clicked on a target token inside CodeMirror.
             *
             * And prevent displaying normal context menu.
             */
            this.$container.on('contextmenu', '.CodeMirror-lines .cm-target', function(ev) {
                ev.preventDefault();
                self.showHelpPopup(this.innerHTML);
                return false;
            });

            /**
             * Minimize from full screen when pressed escape key.
             */
            Mousetrap.bind('esc', function() {
                self.minimize();
            });

        },

        /* ##########################
         * ACTIONS
         * ########################## */
        /**
         * Trigger the save event.
         */
        save : function() {
            this.trigger('save', [this.value()]);
        },

        /**
         * Trigger the verify event.
         */
        verify : function() {
            this.trigger('verify', [this.value()]);
        },

        /**
         * Undo a change.
         */
        undo : function() {
            this.codeMirror.undo();
            this.undoStackSize++;
            this.$redoBtn.removeClass('csdl-inactive');
        },

        /**
         * Redo an undone change.
         */
        redo : function() {
            if (this.undoStackSize <= 0) {
                return false;
            }

            this.codeMirror.redo();
            this.undoStackSize--;

            if (this.undoStackSize <= 0) {
                this.$redoBtn.addClass('csdl-inactive');
            }
        },
        /**
         * Refresh the editor.
         */
        refresh : function() {
            this.codeMirror.refresh();
        },
        /**
         * Display a CSDL error in the editor.
         * 
         * @param  {Number} line    Line on which the error occurred.
         * @param  {String} message [optional] Optional message to display next to the error.
         */
        error : function(line, message) {
            message = message || 'An error occurred during compilation of this CSDL on line ' + line;

            this.clearErrors();

            this.errorLine = line - 1;
            this.$info.addClass('csdl-error').html(message);

            this.codeMirror.addLineClass(this.errorLine, 'background', 'csdl-error');

            this.codeMirror.scrollIntoView({
                line: this.errorLine,
                ch: 0
            }, 50);
        },

        /**
         * Clears any visible errors from the editor.
         */
        clearErrors : function() {
            if (this.errorLine !== null && this.errorLine !== undefined) {
                this.codeMirror.removeLineClass(this.errorLine, 'background', 'csdl-error');
            }
            this.errorLine = null;
            this.$info.removeClass('csdl-error').html('');
        },

        /**
         * Maximize the editor to full screen.
         */
        maximize : function() {
            // ignore if already maximized
            if (this.isFullscreen) {
                return false;
            }

            var self = this;

            this.fullscreenScrollTop = $win.scrollTop();

            this.$container.appendTo($body)
                .addClass('csdl-fullscreen');

            this.$maxBtn.hide();
            this.$minBtn.show();
            this.isFullscreen = true;

            this.autosize();

            $win.on('resize.csdl', function() {
                if (self.isFullscreen) {
                    self.autosize();
                }
            });
        },

        /**
         * Maximize the editor to full screen.
         */
        fullscreen : function() {
            this.maximize();
        },

        /**
         * Minimize the editor from full screen.
         */
        minimize : function() {
            // ignore if not maximized
            if (!this.isFullscreen) {
                return false;
            }

            this.$container.appendTo(this.$el)
                .removeClass('csdl-fullscreen')
                .height('auto');
            this.codeMirror.setSize(null, this.originalHeight);

            this.$maxBtn.show();
            this.$minBtn.hide();
            this.isFullscreen = false;

            $win.scrollTop(this.fullscreenScrollTop);

            $win.off('resize.csdl');
        },

        /**
         * Shows geo selection window.
         * 
         * @param  {String} type Type of the selection (box, radius, polygon).
         */
        showGeoSelection : function(type) {
            type = type === undefined ? 'box' : type;

            if (this.$geo && this.$geo.length) {
                this.hideGeoSelection();
            }

            this.toggleMainButtons(false);

            this.$geo = this.getTemplate('geo_' + type)
                .append(this.getTemplate('geo'))
                .appendTo(this.$container);
            this.$geo.find('.csdl-map-coordinates')
                    .html(this.getTemplate('geo_' + type + 'Coordinates', {}, true));

            CSDLEditor.loadGoogleMaps(this, this.loadMaps, [type]);
        },

        /**
         * Hides visible geo selection window.
         */
        hideGeoSelection : function() {
            this.$geo.remove();
            this.$geo = null;
            this.toggleMainButtons(true);
        },

        /**
         * Shows list editor window.
         */
        showListEditor : function() {
            if (this.$list && this.$list.length) {
                this.hideListEditor();
            }

            this.toggleMainButtons(false);

            this.$list = this.getTemplate('listEditor')
                .appendTo(this.$container);
            this.loadListEditor();
        },

        /**
         * Hides visible list editor window.
         */
        hideListEditor : function() {
            this.$list.remove();
            this.$list = null;
            this.toggleMainButtons(true);
        },

        /**
         * Toggles the main top buttons.
         * 
         * @param  {Boolean} enable [optional] Enabled them? Default: true.
         */
        toggleMainButtons : function(enable) {
            enable = enable === undefined ? true : enable;

            this.$undoBtn
                .add(this.$redoBtn)
                .add(this.$geoBtn)
                .add(this.$listBtn)
                .add(this.$verifyBtn)
                .add(this.$saveBtn)
                [enable ? 'removeClass' : 'addClass']('csdl-inactive');

            if (enable) {
                var cursor = this.codeMirror.getCursor(),
                    token = this.codeMirror.getTokenAt(cursor);

                this.toggleGeoSelectionForToken(token, cursor);
                this.toggleListEditorForToken(token, cursor);
            }
        },

        /**
         * Shows full help in popup for the given target.
         * 
         * @param  {String} target Target to show the help for.
         */
        showHelpPopup : function(target) {
            var self = this;
            this.getTargetHelp(target, function(html) {
                var $help = self.getTemplate('popup', {
                    title : target,
                    content : html
                }).appendTo($body);

                // hide this help window when clicked off somewhere else
                $body.on('click.csdl-help', function(ev) {
                    var $el = $(ev.target);

                    if ($el.closest('.csdl-popup').length || $el.is('.csdl-popup')) {
                        return;
                    }

                    $body.off('click.csdl-help');
                    $help.fadeOut(200, function() {
                        $help.remove();
                    });
                });

                // hide this help window when clicked on close icon
                $help.find('.csdl-close').click(function() {
                    $help.fadeOut(200, function() {
                        $help.remove();
                    });

                    $body.off('click.csdl-help');

                    return false;
                });
            });
        },

        /**
         * Attempts to show hint/autocomplete based on the current cursor position.
         */
        showHint : function() {
            var self = this;

            CodeMirror.showHint(this.codeMirror, function(cm) {
                var hint = CodeMirror.csdlHint(cm, self.config);

                // add slight delay so the current hint can be found (otherwise it doesn't work for BACKSPACE)
                setTimeout(function() {
                    var $current = $body.find('.CodeMirror-hints .CodeMirror-hint-active:first');

                    if ($current.length) {
                        self.showHintTargetHelp($current);
                    } else {
                        self.hideHintTargetHelp();
                    }
                }, 10);

                return hint;
            });
        },

        /**
         * Shows hint help for targets when hinting is active.
         * 
         * @param  {jQuery} $hint DOM element of the currently active hint from hints list.
         */
        showHintTargetHelp : function($hint) {
            this.hideHintTargetHelp();

            var target = $hint.text();

            // only use targets and targets have . in them
            if (!/\./.test(target)) {
                return;
            }

            var $hintHelp = this.$hintHelp = this.getTemplate('hintHelp').appendTo($body);

            var leftPosition = $hint.offset().left + $hint.outerWidth() + 10;
            if (leftPosition + $hintHelp.outerWidth() > $win.width()) {
                leftPosition = $hint.offset().left - $hintHelp.outerWidth() - 10;
            }

            $hintHelp.css({
                top: $hint.offset().top,
                left: leftPosition
            });

            this.getTargetHelp(target, function(content) {
                content = $.trim(content);
                var $content = $('<div>' + content + '</div>');
                $hintHelp.html($content.find('p:first').html() + ' <a href="#" class="csdl-hint-help-more" data-target="' + target + '">More</a>');
            });
        },

        /**
         * Hides any visible hint help.
         */
        hideHintTargetHelp : function() {
            if (this.$hintHelp) {
                this.$hintHelp.remove();
                this.$hintHelp = null;
            }
        },

        /* ##########################
         * TOOLS
         * ########################## */
        /**
         * Trigger an event handler defined in the options.
         * 
         * @param  {String} name Name of the event handler.
         * @param  {Array} data [optional] Arguments to pass to the handler.
         * @return {mixed} Whatever the handler returns.
         */
        trigger : function(name, data) {
            data = data || [];

            this.$el.trigger(name.toLowerCase(), data);
            
            if (typeof this.options[name] === 'function') {
                return this.options[name].apply(this, data);
            }

            return null;
        },

        /**
         * Fetches target help from DataSift endpoint or from memory cache (if fetched before).
         * 
         * @param  {String} target Target name.
         * @param  {Function} callback Callback to call after fetching.
         */
        getTargetHelp : function(target, callback) {
            callback = (typeof callback !== 'function') ? noop : callback;

            var self = this;

            if (this.cache.targetHelp[target] === undefined) {
                var url = $.string.parseVariables(this.config.targetHelpJsonpSource, {
                    target : target.replace(/\./g, '-')
                });

                $.ajax({
                    url : url,
                    type : 'GET',
                    async : false,
                    jsonpCallback : 'jcsdlJSONP',
                    contentType : 'text/javascript',
                    dataType : 'jsonp',
                    success : function(data) {
                        if (!data || !data.html || !$.trim(data.html)) {
                            callback.apply(self, [undefined]);
                            return;
                        }

                        var html = $.trim(data.html);
                        self.cache.targetHelp[target] = html;

                        callback.apply(self, [html]);
                    }
                });
            } else {
                callback.apply(self, [this.cache.targetHelp[target]]);
            }
        },

        /**
         * Returns a template (jQuery object) of the given name with inserted variables.
         * 
         * @param  {String} name Name of the template to fetch.
         * @param  {Object} params [optional] Optional object containing params that should be inserted into the template.
         * @param  {Boolean} raw [optional] Should return raw output (String) rather than jQuery object?
         * @return {jQuery|String}
         */
        getTemplate : function(name, params, raw) {
            params = params || {};
            raw = raw || false;

            if (CSDLEditor.Templates[name] === undefined) {
                throw new Error("No CSDLEditor.Template named '" + name + "' found!");
            }

            var template = $.string.parseVariables(CSDLEditor.Templates[name], params);
            return raw ? template : $(template);
        },

        /* ##########################
         * HELPERS
         * ########################## */
        /**
         * Autosizes the editor to take fullscreen. Triggered during entering fullscreen mode and window resizes.
         */
        autosize : function() {
            var winHeight = $win.height();
            this.$container.height(winHeight);
            this.codeMirror.setSize(null, winHeight - this.$topBar.outerHeight() - this.$bottomBar.outerHeight() - 50);
        },

        /**
         * Loads geo selection map.
         *
         * Used as a callback for functionality of "showGeoSelection".
         * 
         * @param  {String} type Type of the selection (box, radius, polygon).
         */
        loadMaps : function(type) {
            var self = this,
                selection = new CSDLEditor.GeoSelection[type](this, this.$geo);

            if (this.currentGeoSelectionValueToken && this.currentGeoSelectionValueToken.type === 'string') {
                var val = $.string.trim(this.currentGeoSelectionValueToken.string, '"');
                if (val.length) {
                    selection.setValue(val);
                }
            }

            this.$geo.find('a[data-cancel]').click(function() {
                self.hideGeoSelection();
                self.codeMirror.focus();
                return false;
            });

            this.$geo.find('a[data-done]').click(function() {
                var val = selection.getValue();

                if (! self.currentGeoSelectionValueToken.type) {
                    self.currentGeoSelectionValueToken.start += 1;
                    self.currentGeoSelectionValueToken.end = self.currentGeoSelectionValueToken.start;
                }

                self.codeMirror.replaceRange('"' + val + '"', {
                    line : self.currentGeoSelectionValueLine,
                    ch : self.currentGeoSelectionValueToken.start
                }, {
                    line : self.currentGeoSelectionValueLine,
                    ch : self.currentGeoSelectionValueToken.end
                });

                self.hideGeoSelection();
                self.codeMirror.focus();
                return false;
            });
        },

        /**
         * Decides whether or not it is possible to use geo selection inside the given token
         * (based on the previous token).
         * 
         * @param  {CodeMirror.Token} token
         * @param  {CodeMirror.Cursor} cursor
         * @return {Boolean}
         */
        toggleGeoSelectionForToken : function(token, cursor) {
            if (token.type === 'string' || ! token.type) {
                var prevToken = CodeMirror.getPreviousToken(this.codeMirror, cursor, token);

                if (prevToken && prevToken.type === 'operator' && $.inArray(prevToken.string, ['geo_polygon', 'geo_radius', 'geo_box']) >= 0) {
                    var nextToken = (token.type !== 'string') ? CodeMirror.getNextToken(this.codeMirror, cursor, token) : null;

                    if (token.type === 'string' || (nextToken && nextToken.type !== 'string') || ! nextToken) {
                        // mark that it is possible to use geo selection now
                        this.currentGeoSelectionType = prevToken.string.substr(4);
                        this.$geoBtn.removeClass('csdl-inactive');

                        this.currentGeoSelectionValueToken = token;
                        this.currentGeoSelectionValueLine = cursor.line;

                        return true;
                    }
                }
            }

            this.currentGeoSelectionType = '';
            this.currentGeoSelectionValueToken = null;
            this.currentGeoSelectionValueLine = null;
            this.$geoBtn.addClass('csdl-inactive');

            return false;
        },

        /**
         * Loads list editor.
         *
         * Used as a callback for functionality of "showListEditor".
         */
        loadListEditor : function() {
            var self = this,
                listEditor = new CSDLEditor.ListEditor(this, this.$list);

            if (this.currentListValueToken && this.currentListValueToken.type === 'string') {
                var val = $.string.trim(this.currentListValueToken.string, '"');
                if (val.length) {
                    listEditor.setValue(val);
                }
            }

            this.$list.find('a[data-cancel]').click(function() {
                self.hideListEditor();
                self.codeMirror.focus();
                return false;
            });

            this.$list.find('a[data-done]').click(function() {
                var val = listEditor.getValue();

                if (! self.currentListValueToken.type) {
                    self.currentListValueToken.start += 1;
                    self.currentListValueToken.end = self.currentListValueToken.start;
                }

                self.codeMirror.replaceRange('"' + val + '"', {
                    line : self.currentListValueLine,
                    ch : self.currentListValueToken.start
                }, {
                    line : self.currentListValueLine,
                    ch : self.currentListValueToken.end
                });

                self.hideListEditor();
                self.codeMirror.focus();
                return false;
            });
        },

        /**
         * Decides whether or not it is possible to use list editor inside the given token
         * (based on the previous token).
         *
         * @param  {CodeMirror.Token} token
         * @param  {CodeMirror.Cursor} cursor
         * @return {Boolean}
         */
        toggleListEditorForToken : function(token, cursor) {
            if (token.type === 'string' || ! token.type) {
                var prevToken = CodeMirror.getPreviousToken(this.codeMirror, cursor, token);

                // if punctuation token then skip it
                if (prevToken && prevToken.type === 'punctuation') {
                    prevToken = CodeMirror.getPreviousToken(this.codeMirror, cursor, prevToken);
                }

                if (prevToken && prevToken.type === 'operator' && $.inArray(prevToken.string, ['contains_any', 'contains_phrase', 'any', 'in', 'url_in', 'all', 'contains_all']) >= 0) {
                    var nextToken = (token.type !== 'string') ? CodeMirror.getNextToken(this.codeMirror, cursor, token) : null;

                    if (token.type === 'string' || (nextToken && nextToken.type !== 'string') || ! nextToken) {
                        // mark that it is possible to use list editor now
                        this.$listBtn.removeClass('csdl-inactive');
                        this.currentListValueToken = token;
                        this.currentListValueLine = cursor.line;

                        return true;
                    }
                }
            }

            this.currentListValueToken = null;
            this.currentListValueLine = null;
            this.$listBtn.addClass('csdl-inactive');

            return false;
        },

        /**
         * Attempts to guess the url to assets directory based on CSS of a map marker dummy element.
         * 
         * @return {String}
         */
        guessAssetsUrl : function() {
            var $mapsMarkerUrl = this.$container.find('.csdl-maps-marker-url:first'),
                mapsMarkerUrl = $mapsMarkerUrl.css('background-image')
                    .replace(/url\((\'|\")?/, '')
                    .replace(/(\'|\")?\)$/, ''),
                mapsMarkerLink = document.createElement('a');

            mapsMarkerLink.href = mapsMarkerUrl;

            var assetsUrl = mapsMarkerLink.pathname.split('/');

            assetsUrl.pop(); // remove file name
            assetsUrl.pop(); // remove folder name
            $mapsMarkerUrl.remove();

            return assetsUrl.join('/') + '/';
        },

        /**
         * Filters out the black/white listed targets from the config.
         *
         * @param {Array} targets Array of targets to be filtered.
         * @return {Array}
         */
        filterTargets : function(targets) {
            var self = this,
                filteredTargets = [];

            // push to a new array instead of removing from original to prevent
            // indexes from getting messed up
            $.each(targets, function(i, target) {
                if (self.isTargetVisible(target)) {
                    filteredTargets.push(target);
                }
            });

            return filteredTargets;
        },

        /**
         * Checks whether the given target is enabled (based on 'hideTargets' and 'showTargets' option).
         *
         * If there are any entries in 'showTargets' then a target to be visible needs to be in there.
         * Otherwise if the target is in 'hideTargets' then it will be hidden.
         * Otherwise it will be displayed.
         * 
         * @param  {String}  name Target name (can be a part of the name).
         * @return {Boolean}
         */
        isTargetVisible : function(name) {
            // for some reason sometimes can be undefined
            if (!name) {
                return false;
            }

            var showTargets = this.options.showTargets,
                hideTargets = this.options.hideTargets;

            // if no targets are black/white listed then dont bother with checking
            if (!showTargets.length && !hideTargets.length) {
                return true;
            }

            if (showTargets.length) {
                // check for the specific target
                if ($.inArray(name, showTargets) >= 0) {
                    return true;
                }

                // specific target not found, but let's see if any of the parents of this target is marked as visible
                var namePath = name.split('.');
                while(namePath.length) {
                    if ($.inArray(namePath.join('.'), showTargets) >= 0) {
                        return true;
                    }

                    namePath.pop();
                }

                // if still no luck then search the other way around
                // check if any children of this target are marked as visible
                var nameAsParent = name + '.';
                for (var i = 0; i < showTargets.length; i++) {
                    if (showTargets[i].indexOf(nameAsParent) === 0) {
                        return true;
                    }
                }

                return false;
            }

            // check for specific target
            if ($.inArray(name, hideTargets) >= 0) {
                return false;
            }

            // specific target not found, but let's see if any of the parents of this target is marked as visible
            var namePath = name.split('.');
            while(namePath.length) {
                if ($.inArray(namePath.join('.'), hideTargets) >= 0) {
                    return false;
                }

                namePath.pop();
            }

            return true;
        },

        /* ##########################
         * SETTERS AND GETTERS
         * ########################## */
        /**
         * Applies a theme for the editor.
         *
         * At the moment only 'dark' and 'light' are supported.
         *
         * Returns (Boolean)false if failed to set the theme.
         * 
         * @param {String} theme  Theme name.
         * @param {Boolean} silent [optional] If set to true then the 'themeChange' event will not be triggered.
         *                         Default: false.
         * @return Boolean
         */
        setTheme : function(theme, silent) {
            silent = silent || false;

            // for now only allow dark and light themes
            if ($.inArray(theme, ['light', 'dark']) === -1) {
                return false;
            }

            this.$container.removeClass('csdl-theme-dark csdl-theme-light')
                .addClass('csdl-theme-' + theme);
            this.$darkBtn.add(this.$lightBtn).hide();
            if (theme === 'dark') {
                this.$lightBtn.show();
            } else {
                this.$darkBtn.show();
            }

            this.options.theme = theme;

            if (!silent) {
                this.trigger('themeChange', [theme]);
            }

            return true;
        },

        /**
         * Returns the current options object.
         * 
         * @return {Object}
         */
        getOptions : function() {
            return this.options;
        },

        /**
         * Returns the current code in the editor.
         * 
         * @return {String}
         */
        value : function(code) {
            if (code) {
                this.codeMirror.setValue(code);
            }
            return this.codeMirror.getValue();
        }

    };

    // register CSDLEditor.Editor as a jQuery plugin as well
    // the difference to using new CSDLEditor.Editor() is that it will return {jQuery} instead of the editor
    $.fn.csdlEditor = function(options) {
        function get($el) {
            var editor = $el.data('csdlEditor');
            if (!editor) {
                editor = new CSDLEditor.Editor($el, options);
                $el.data('csdlEditor', editor);
            }
            return editor;
        }

        if (typeof options === 'string') {
            var returnValue;

            // call a public method
            if ($.inArray(options, publicMethods) >= 0) {
                var argmns = [];
                $.each(arguments, function(i, arg) {
                    // ommit the 1st argument
                    if (!i) {
                        return true;
                    }
                    argmns.push(arg);
                });

                this.each(function() {
                    var editor = get($(this));
                    returnValue = editor[options].apply(editor, argmns);

                    // if a value has been returned then break the foreach
                    if (returnValue !== undefined) {
                        return false;
                    }
                });

                // if there was a return value from the method then return in
                if (returnValue !== undefined) {
                    return returnValue;
                }
            }

            // return this for normal foreach
            return this;
        }

        return this.each(function() {get($(this));});
    };

});

})(CSDLEditor, CodeMirror, Mousetrap, Math, window, document);
