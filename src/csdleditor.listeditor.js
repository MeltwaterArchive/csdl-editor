/*global CSDLEditor, Math, FileReader*/
(function(CSDLEditor, Math, window, undefined) {
    "use strict";

CSDLEditor.Loader.addComponent(function($) {

    /* define some static private vars */
    var

    /** @type {Object} A map of keys used for better readability. */
    KEYS = {
        BACKSPACE : 8,
        DELETE : 46,
        ENTER : 13,
        ESC : 27,
        UP : 38,
        DOWN : 40
    };

    /**
     * Constructor.
     * 
     * @param  {CSDLEditor.Editor} editor Instance of the CSDL Editor to which this ListEditor is connected.
     * @param  {jQuery} $view View for the list editor.
     */
    CSDLEditor.ListEditor = function(editor, $view) {
        var self = this;

        this.editor = editor;
        this.$view = $view;
        this.$list = this.$view.find('.csdl-list-elements');

        /* setup links to important elements */
        this.$addBtn = this.$view.find('a[data-add]');
        this.$copyBtn = this.$view.find('a[data-copy]').attr('id', 'csdl-copy-to-clipboard-' + Math.floor(Math.random() * 10000));
        this.$importBtn = this.$view.find('a[data-import]');
        this.$searchInput = this.$view.find('input[name="search"]');

        /* make the list sortable */
        this.$list.sortable({
            axis : 'y',
            containment: 'parent',
            handle : 'a[data-handle]'
        });

        /*
         * REGISTER LISTENERS
         */
        /**
         * When pressed ENTER inside a list input then create a new empty input after it and focus in it.
         */
        this.$list.on('keypress', 'input', function(ev) {
            if (ev.which === KEYS.ENTER) {
                var $el = $(this),
                    $li = $el.closest('li'),
                    $item = self.addItem('', $li);
                $item.find('input').focus();
            }
        });

        /**
         * Navigate with UP and DOWN keys and blur on ESCAPE.
         */
        this.$list.on('keyup', 'input', function(ev) {
            if ($.inArray(ev.which, [KEYS.UP, KEYS.DOWN, KEYS.ESC]) === -1) {
                return;
            }

            var $el = $(this),
                $li = $el.closest('li');

            switch(ev.which) {
                case KEYS.UP:
                    var $prev = $li.prev('li');
                    if ($prev.length) {
                        $prev.find('input').focus();
                    }
                break;

                case KEYS.DOWN:
                    var $next = $li.next('li');
                    if ($next.length) {
                        $next.find('input').focus();
                    }
                break;

                case KEYS.ESC:
                    $el.blur();
                break;
            }
        });

        /**
         * When blurred an item input then check if it's not empty and if it is remove it.
         */
        this.$list.on('blur', 'input', function() {
            if (!$.string.trim(this.value).length) {
                var $li = $(this).closest('li');
                $li.fadeOut(200, function() {
                    $li.remove();
                });
            }
        });

        /**
         * Delete list items when clicked on delete trigger.
         */
        this.$list.on('click', 'a[data-delete]', function() {
            var $li = $(this).closest('li');
            $li.fadeOut(200, function() {
                $li.remove();
            });
            return false;
        });

        /**
         * Add new item to the bottom of the list when clicked on the ADD button.
         */
        this.$addBtn.click(function() {
            var $item = self.addItem('');
            $item.find('input').focus();
            return false;
        });

        /**
         * Sort the list alphabetically when clicked on the sort button.
         */
        this.$view.find('a[data-sort]').click(function() {
            var items = self.$list.children().get();

            items.sort(function(a, b) {
                return $(a).find('input').val().toUpperCase().localeCompare($(b).find('input').val().toUpperCase());
            });

            $.each(items, function(i, item) {
                self.$list.append(item);
            });

            return false;
        });

        // helper function for copying to clipboard
        var copyButtonTransitionTimeout;

        /**
         * Make the copy to clipboard button working.
         */
        this.$copyBtn.zclip({
            path : this.editor.options.zeroClipboard,
            copy : function() {
                return self.getValue();
            },
            afterCopy : function() {
                clearTimeout(copyButtonTransitionTimeout);
                self.$copyBtn.html('Copied');
                setTimeout(function() {
                    self.$copyBtn.html('Copy to Clipboard');
                }, 3000);
            }
        });

        /**
         * Shows or hides the import window.
         */
        this.$importBtn.click(function() {
            self.toggleImportView();
            return false;
        });

        /**
         * Handle searching in the search input.
         *
         * Blur and clear when pressed ESCAPE inside of it.
         */
        this.$searchInput.on('keyup', function(ev) {
            // when pressed ESCAPE then reset the search
            if (ev.which === KEYS.ESC) {
                self.$searchInput.val('').blur();
                self.$list.children().fadeIn(100);
                return;
            }

            var search = self.$searchInput.val(),
                regexPattern = new RegExp('^' + search, 'gi');

            self.$list.children().quickEach(function() {
                if (regexPattern.test(this.find('input').val())) {
                    this.fadeIn(100);
                } else {
                    this.fadeOut(100);
                }
            });
        });
    };

    CSDLEditor.ListEditor.prototype = {
        /** @var {Boolean} Is import process in progress? */
        importing : false,
        /** @var {jQuery} View of the current import process. */
        $importView : null,

        /**
         * Adds an item to the list.
         * 
         * @param  {String} val Value of the item.
         * @param  {jQuery|null} $after [optional] If specified, the item will be added after this element.
         *                              Otherwise it will be appended to the end of the list. Default: null.
         * @param  {Boolean} refresh Should some meta data about the list be refreshed? Used internally. Default: true.
         * @return {jQuery} The newly added item.
         */
        addItem : function(val, $after, refresh) {
            $after = $after || null;
            refresh = refresh === undefined ? true : refresh;

            var $item = this.editor.getTemplate('listElement', {
                value : $.string.escapeHtml(val)
            });

            if ($after && $after.length) {
                $item.insertAfter($after);
            } else {
                $item.appendTo(this.$list);
            }

            if (refresh) {
                this.$list.sortable('refresh');
                this.$searchInput[this.$list.children().length > 30 ? 'addClass' : 'removeClass']('on');
            }

            return $item;
        },

        /**
         * Adds multiple items to the list.
         * 
         * @param  {Array} items List of items to be added.
         * @param  {Boolean} replace [optional] Should the list be cleared first? Default: false.
         */
        addItems : function(items, replace) {
            if (replace) {
               this.$list.empty(); 
            }

            for(var i = 0; i < items.length; i++) {
                this.addItem(items[i], null, false);
            }

            this.$list.sortable('refresh');
        },

        /**
         * Sets the value for the list. Takes a single CSDL string that will be comma-exploded.
         * 
         * @param  {String} val Value to be set.
         */
        setValue : function(val) {
            var self = this,
                escapedToken = '::__ESC_TOKEN__::' + $.string.random() + '::',
                escapedTokenRegEx = new RegExp(escapedToken, 'gi'),
                values = val.replace(/\\,/gi, escapedToken).split(',');

            $.each(values, function(i, item) {
                item = $.string.trim(item.replace(escapedTokenRegEx, ','));

                if (!item.length) {
                    return true;
                }

                // do not refresh sortable while setting the value
                self.addItem(item, null, false);
            });

            // now that all data is there, refresh the sortable
            this.$list.sortable('refresh');
            this.$searchInput[this.$list.children().length > 30 ? 'addClass' : 'removeClass']('on');
        },

        /**
         * Returns the CSDL usable value from the list as a comma-separated list.
         * 
         * @return {String}
         */
        getValue : function() {
            var values = [];

            this.$list.find('input').quickEach(function() {
                var val = this.val();
                if (!$.string.trim(val).length) {
                    return true;
                }

                values.push(val.replace(/,/gi, '\\,'));
            });

            return values.join(',');
        },

        /* ##########################
         * IMPORTING LISTS
         * ########################## */
        /**
         * Toggles the import window.
         */
        toggleImportView : function() {
            if (this.importing) {
                this.hideImportView();
            } else {
                this.showImportView();
            }
        },

        /**
         * Shows the import window.
         */
        showImportView : function() {
            var self = this,
                $view = this.$importView = this.editor.getTemplate('listEditor_import')
                    .appendTo(this.$view).hide(),
                $replaceCheckbox = $view.find('input[name="replace"]');

            // should we also display the file upload? check for availability
            if (window.File && window.FileReader && window.FileList && window.Blob) {
                var $fileUploadView = this.editor.getTemplate('listEditor_import_file')
                        .prependTo($view.find('[data-step-one]')),
                    $fileUploadButton = $fileUploadView.find('input[type="file"]'),
                    /**
                     * Read a CSV file and parse it.
                     */
                    readFile = function(file) {
                        // if no file or not a csv file then ignore
                        if (file === undefined || file.type !== 'text/csv') {
                            return;
                        }

                        // read the CSV file into a string now
                        var reader = new FileReader();
                        reader.onload = function(e) {
                            self.parseCsv(e.target.result.replace(/\r\n|\r/g, "\n"), $replaceCheckbox.is(':checked'));
                        };
                        reader.readAsText(file);
                    };

                /**
                 * Trigger file selector dialog when clicked on the select file button.
                 */
                $fileUploadView.find('a[data-select-file]').click(function() {
                    $fileUploadButton.click();
                    return false;
                });

                /**
                 * When dragged a file over the drop area mark it.
                 *
                 * Had to use native event subscriber as jQuery doesn't seem to support this event.
                 */
                $fileUploadView[0].addEventListener('dragover', function(ev) {
                    ev.stopPropagation();
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = 'copy';
                    $fileUploadView.addClass('over');
                }, false);

                /**
                 * Toggle 'over' class when dragged over the drop area.
                 */
                $fileUploadView[0].addEventListener('dragenter', function() {
                    $fileUploadView.addClass('over');
                }, false);

                /**
                 * Toggle 'over' class when dragged over the drop area.
                 */
                $fileUploadView[0].addEventListener('dragleave', function() {
                    $fileUploadView.removeClass('over');
                }, false);

                /**
                 * Handle file drop in the drop area.
                 *
                 * Had to use native event subscriber as jQuery doesn't seem to support this event.
                 */
                $fileUploadView[0].addEventListener('drop', function(ev) {
                    ev.stopPropagation();
                    ev.preventDefault();
                    readFile(ev.dataTransfer.files[0]);
                }, false);

                /**
                 * Trigger parsing of a CSV file when it was selected.
                 */
                $fileUploadButton.change(function(ev) {
                    readFile(ev.target.files[0]);

                });
            }

            $view.slideDown(200);
            this.importing = true;

            /**
             * Cancel the import process when clicked the cancel button.
             */
            $view.on('click', 'a[data-import-cancel]', function() {
                self.hideImportView();
                return false;
            });

            /**
             * Parse the CSV from the import when clicked on the import button.
             */
            $view.find('a[data-import-csv]').on('click', function() {
                var csv = $view.find('textarea[name="import"]').val();
                self.parseCsv(csv, $replaceCheckbox.is(':checked'));
                return false;
            });
        },

        /**
         * Hides the import window.
         */
        hideImportView : function() {
            if (this.$importView && this.$importView.length) {
                this.$importView.remove();
                this.$importView = null;
            }

            this.importing = false;
        },

        /**
         * Parses the given CSV string and either imports it straight away (if a simple data structure)
         * or calls configureDataImport().
         * 
         * @param  {String} csv CSV string.
         * @param  {Boolean} replace [optional] If the import will happen straight away, should the current list
         *                           in the editor be replaced with the new one or just appended? Default: false.
         */
        parseCsv : function(csv, replace) {
            replace = replace || false;
            var lines = csv.split("\n");

            // single line of values?
            if (lines.length === 1) {
                this.addItems($.csv.toArray(lines[0]), replace);
                this.hideImportView();
                return;
            }

            // read full data structure
            var data = [],
                maxInRow = 1;
            $.each(lines, function(i, line) {
                var items = $.csv.toArray(line);

                if (items.length > maxInRow) {
                    maxInRow = items.length;
                }

                data.push(items);
            });

            // only one item per row, so treat all of them as a list
            if (maxInRow === 1) {
                var items = [];
                $.each(data, function(i, row) {
                    items.push(row[0]);
                });
                this.addItems(items, replace);
                this.hideImportView();
                return;
            }

            // and if more complicated data structure then we need to display a configuration view
            this.configureDataImport(data, maxInRow);
        },

        /**
         * Show a window to the user where they can configure which columns will be imported.
         * 
         * @param {Array} data The data set to be configured for import.
         * @param {Number} width Maximum width (number of columns) in the data set. 
         */
        configureDataImport : function(data, width) {
            var self = this;

            // remove the previous import step
            this.$importView.find('[data-step-one]').remove();

            // setup the import view and data table
            var $importTableView = this.editor.getTemplate('listEditor_import_table').prependTo(this.$importView),
                $importTableHeadRow = $importTableView.find('table thead tr:first'),
                $importTableFoot = $importTableView.find('table tfoot'),
                $importTableBody = $importTableView.find('table tbody'),
                $ignoreHeadersCheckbox = $importTableView.find('input[name="ignoreheaders"]');

            // build the header and footer rows
            for(var i = 0; i < width; i++) {
                this.editor.getTemplate('listEditor_import_tableHeader', {
                    i : i
                }).appendTo($importTableHeadRow);
            }

            if (data.length > 5) {
                this.editor.getTemplate('listEditor_import_tableFooter', {
                    width : width,
                    more : data.length - 5
                }).appendTo($importTableFoot);
            }

            // build the actual data table
            $.each(data, function(i, items) {
                // show only top 5
                if (i > 5) {
                    return false; // break
                }

                // using a for(;;) loop in order to have the same number of cells in each row, even if some rows
                // might have less data in them
                var $row = $('<tr>');
                for(var j = 0; j < width; j++) {
                    $row.append('<td>' + (items[j] !== undefined ? items[j] : '') + '</td>');
                }
                $row.appendTo($importTableBody);

                if (!i) {
                    $row.addClass('ignored');
                }
            });
            
            /**
             * Mark the first row as ignored or not, based on the checkbox.
             */
            $ignoreHeadersCheckbox.change(function() {
                $importTableBody.find('tr:first')[this.checked ? 'addClass' : 'removeClass']('ignored');
            });

            /**
             * Remove the old click event handler from the import button and add a new one that will import the data
             * based on the configuration.
             */
            this.$importView.find('a[data-import-csv]').off('click').on('click', function() {
                // check which columns should be imported
                var columns = [];
                $importTableHeadRow.find('input[name="column"]:checked').each(function() {
                    columns.push(parseInt(this.value, 10));
                });

                // need to select at least one
                if (!columns.length) {
                    self.$importView.find('p[data-info]').addClass('csdl-error');
                    return false;
                }

                // ignore the first row?
                if ($ignoreHeadersCheckbox.is(':checked')) {
                    data.shift();
                }

                // prepare the list that will be imported
                var toImport = [];
                $.each(data, function(i, items) {
                    // select only the selected columns from the row
                    $.each(columns, function(j, column) {
                        if (items[column] !== undefined) {
                            toImport.push(items[column]);
                        }
                    });
                });

                // finally add the items
                self.addItems(toImport, self.$importView.find('input[name="replace"]').is(':checked'));

                // and finish the import
                self.hideImportView();
                return false;
            });
        }
    };

});

})(CSDLEditor, Math, window);