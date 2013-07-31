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
            'showIndicator',
            'hideIndicator',
            'fullscreen',
            'maximize',
            'minimize',
            'undo',
            'redo'
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

            // hooks/event handles
            save : function(code) {
                noop(code);
            },
            autosave : function(code) {
                noop(code);
            }
        }, opt);

        /** @type {Object} Config of CSDLEditor, that can be altered via options. */
        this.config = $.extend(true, CSDLEditorConfig, this.options.config);

        // initialize the builder
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

        /** @type {jQuery} DOM element of the indicator. */
        $indicator : null,

        /** @type {jQuery} DOM element displaying help for target hinting. */
        $hintHelp : null,

        /** @type {CodeMirror} CodeMirror instance used in the editor. */
        codeMirror : null,

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

            this.$help = this.$container.find('[data-help]');

            this.$saveBtn = this.$container.find('[data-save]');
            this.$undoBtn = this.$container.find('[data-undo]');
            this.$redoBtn = this.$container.find('[data-redo]');
            this.$geoBtn = this.$container.find('[data-geo]');
            this.$listBtn = this.$container.find('[data-list]');
            this.$darkBtn = this.$container.find('[data-theme-dark]');
            this.$lightBtn = this.$container.find('[data-theme-light]');
            this.$maxBtn = this.$container.find('[data-max]');
            this.$minBtn = this.$container.find('[data-min]');
            this.$helpBtn = this.$container.find('[data-help-more]');

            this.assetsUrl = this.guessAssetsUrl();

            // now apply the assets url to maps marker
            if (!this.options.mapsMarker) {
                this.options.mapsMarker = this.assetsUrl + 'images/maps-marker.png';
            }

            if (!this.options.zeroClipboard) {
                this.options.zeroClipboard = this.assetsUrl + 'swf/ZeroClipboard.swf';
            }

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

            var autosaveTimeout,
                cm = this.codeMirror = CodeMirror(this.$container.find('[data-editor-container]')[0], {
                    value : this.options.value,
                    lineNumbers: true,
                    highlightSelectionMatches : true,
                    styleSelectedText : true,
                    styleActiveLine : true,
                    continueComments : true,
                    placeholder : 'Enter your CSDL code...',
                    mode : {
                        name : 'csdl',
                        targets : this.config.targets,
                        operators : this.config.operators,
                        logical : this.config.logical,
                        keywords : this.config.keywords
                    },
                    extraKeys : {
                        'Esc' : function() {
                            self.minimize();
                            return false;
                        }
                    },
                    autoCloseBrackets : true,
                    matchBrackets : true,
                    onKeyEvent: function(cm, ev) {
                        if (ev.type === 'keyup') {
                            self.showHint();
                        }
                    }
                });

            this.originalHeight = this.$container.find('.CodeMirror').height();

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

                if (token.type === 'target') {
                    self.showTargetHelp(token.string);
                } else {
                    self.hideHelp();
                }

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
                self.save();
                return false;
            });

            /**
             * Undo a change.
             */
            this.$undoBtn.click(function() {
                self.undo();
                return false;
            });

            /**
             * Redo an undone change.
             */
            this.$redoBtn.click(function() {
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
                if (self.$listBtn.is('.csdl-inactive')) {
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
             * Show help popup when there's what to show.
             */
            this.$helpBtn.click(function() {
                self.showHelpPopup(self.$help.data('title'));
                return false;
            });

            /**
             * Switch to light theme.
             */
            this.$lightBtn.click(function() {
                self.$container.removeClass('csdl-theme-dark').addClass('csdl-theme-light');
                self.$lightBtn.hide();
                self.$darkBtn.show();
                return false;
            });

            /**
             * Switch to dark theme.
             */
            this.$darkBtn.click(function() {
                self.$container.removeClass('csdl-theme-light').addClass('csdl-theme-dark');
                self.$darkBtn.hide();
                self.$lightBtn.show();
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
         * Shows the indicator at the bottom of the editor.
         * 
         * @return {jQuery}
         */
        showIndicator : function() {
            // check if not already showing
            if (this.$indicator) {
                return;
            }

            this.$indicator = this.getTemplate('indicator').prependTo(this.$bottomBar);
        },

        /**
         * Hides the current indicator.
         * 
         * @return {jQuery}
         */
        hideIndicator : function() {
            if (this.$indicator) {
                this.$indicator.remove();
                this.$indicator = null;
            }
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
        },

        /**
         * Shows list editor window.
         */
        showListEditor : function() {
            if (this.$list && this.$list.length) {
                this.hideListEditor();
            }

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
        },

        /**
         * Shows target help in the help section.
         * 
         * @param  {String} target Target name.
         */
        showTargetHelp : function(target) {
            var self = this;

            this.showIndicator();

            this.getTargetHelp(target, function(content) {
                self.hideIndicator();
                self.showHelp(content, target);
            });
        },

        /**
         * Shows help in the help section.
         * 
         * @param  {String} content Content of the popup.
         * @param  {String} title [optional] Title of the popup.
         */
        showHelp : function(content, title) {
            content = $.trim(content);
            title = title === undefined ? '' : $.trim(title);

            var $content = $('<div>' + content + '</div>');

            this.$help.fadeIn('fast')
                .data('full', content)
                .data('title', title)
                .find('[data-help-content]')
                    .html($content.find('p:first').html());
        },

        /**
         * Empties the help section.
         */
        hideHelp : function() {
            this.$help.hide()
                .data('full', '')
                .data('title', '')
                .find('[data-help-content]').html('');
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
                var hint = CodeMirror.csdlHint(cm);

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

            if (this.currentGeoSelectionValueToken) {
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
            if (token.type === 'string') {
                var prevToken = CodeMirror.getPreviousToken(this.codeMirror, cursor, token);

                if (prevToken.type === 'operator' && $.inArray(prevToken.string, ['geo_polygon', 'geo_radius', 'geo_box']) >= 0) {
                    // mark that it is possible to use geo selection now
                    this.currentGeoSelectionType = prevToken.string.substr(4);
                    this.$geoBtn.removeClass('csdl-inactive');

                    this.currentGeoSelectionValueToken = token;
                    this.currentGeoSelectionValueLine = cursor.line;

                    return true;
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

            if (this.currentListValueToken) {
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
            if (token.type === 'string') {
                var prevToken = CodeMirror.getPreviousToken(this.codeMirror, cursor, token);

                if (prevToken.type === 'operator' && $.inArray(prevToken.string, ['contains_any', 'contains_phrase', 'any', 'in', 'url_in', 'all', 'contains_all']) >= 0) {
                    // mark that it is possible to use list editor now
                    this.$listBtn.removeClass('csdl-inactive');
                    this.currentListValueToken = token;
                    this.currentListValueLine = cursor.line;

                    return true;
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

        /* ##########################
         * SETTERS AND GETTERS
         * ########################## */
        /**
         * Returns the current code in the editor.
         * 
         * @return {String}
         */
        value : function() {
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