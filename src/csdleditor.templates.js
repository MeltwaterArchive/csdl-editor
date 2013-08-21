/*global CSDLEditor*/

(function(CSDLEditor, window, undefined) {
    "use strict";

CSDLEditor.Loader.addComponent(function() {

    CSDLEditor.Templates = {

        container : [
            '<div class="csdl-container csdl-theme-light">',
                '<div class="csdl-maps-marker-url" />',
                '<div class="csdl-header" data-bar-top>',
                    '<a href="#" data-undo class="csdl-button csdl-undo"><i class="csdl-button-icon" />Undo</a>',
                    '<a href="#" data-redo class="csdl-button csdl-inactive csdl-redo"><i class="csdl-button-icon" />Redo</a>',
                    '<a href="#" data-geo class="csdl-button csdl-inactive csdl-geoselect"><i class="csdl-button-icon" />Geo - Selection</a>',
                    '<a href="#" data-list class="csdl-button csdl-inactive csdl-listeditor"><i class="csdl-button-icon" />List</a>',
                    '<a href="#" data-save class="csdl-button csdl-save">Save</a>',
                    '<a href="#" data-verify class="csdl-button csdl-verify" style="display: none;">Verify</a>',
                '</div>',
                '<div class="csdl-editor-container" data-editor-container />',
                '<div class="csdl-footer csdl-row" data-bar-bottom>',
                    '<div class="csdl-column eight csdl-left csdl-info" data-info />',
                    '<div class="csdl-column four csdl-right no-padding">',
                        '<a href="#" data-max class="csdl-button csdl-view-open"><i class="csdl-button-icon" /></a>',
                        '<a href="#" data-min class="csdl-button csdl-view-close" style="display: none;"><i class="csdl-button-icon" /></a>',
                        '<a href="#" data-theme-dark class="csdl-button csdl-theme"><i class="csdl-button-icon" />Dark</a>',
                        '<a href="#" data-theme-light class="csdl-button csdl-theme" style="display: none;"><i class="csdl-button-icon" />Light</a>',
                    '</div>',
                '</div>',
            '</div>'
        ].join(''),

        indicator : '<div class="indicator"></div>',

        popup : [
            '<div class="csdl-overlay" />',
            '<div class="csdl-container csdl-popup">',
                '<div class="csdl-popup-content">',
                    '<a href="#" class="csdl-close">&times;</a>',
                    '<h2>{title}</h2>',
                    '<div class="csdl-popup-content-wrap">{content}</div>',
                '</div>',
            '</div>'
        ].join(''),

        hintHelp : [
            '<div class="csdl-hint-help">',
                '<div class="indicator">Loading...</div>',
            '</div>'
        ].join(''),

        geo : [
            '<div class="csdl-map csdl-row">',
                '<div class="csdl-column six">',
                    '<input type="text" name="location" class="csdl-map-search" placeholder="Search for location..." />',
                    '<div class="csdl-map-canvas" />',
                    '<a href="#" class="csdl-clear-map">clear coordinates</a>',
                '</div>',
                '<div class="csdl-column six">',
                    '<p class="csdl-map-instructions" />',
                    '<div class="csdl-map-coordinates" />',
                    '<div class="csdl-map-area">',
                        '<label>Area:</label>',
                        '<span>0 km<sup>2</sup></span>',
                    '</div>',
                    '<a href="#" class="csdl-button csdl-button-done" data-done>Done</a>',
                    '<a href="#" class="csdl-button csdl-button-link" data-cancel>Cancel</a>',
                '</div>',
            '</div>'
        ].join(''),

        geo_box : '<div class="csdl-geo csdl-geo-box" />',
        geo_boxCoordinates : [
            '<ul>',
                '<li class="nw"><label>NW:</label><span /></li>',
                '<li class="ne"><label>NE:</label><span /></li>',
                '<li class="se"><label>SE:</label><span /></li>',
                '<li class="sw"><label>SW:</label><span /></li>',
            '</ul>'
        ].join(''),

        geo_radius : '<div class="csdl-geo csdl-geo-radius" />',
        geo_radiusCoordinates : [
            '<ul>',
                '<li class="center"><label>Center:</label><span /></li>',
                '<li class="radius"><label>Radius:</label><span /></li>',
            '</ul>'
        ].join(''),

        geo_polygon : '<div class="csdl-geo csdl-geo-polygon" />',
        geo_polygonCoordinates : '<ul />',

        listEditor : [
            '<div class="csdl-list csdl-row">',
                '<div class="csdl-list-bar csdl-row">',
                    '<div class="csdl-column ten csdl-left">',
                        '<a href="#" class="csdl-button csdl-button-icon csdl-import" data-import><i class="csdl-button-icon" />Import</a>',
                        '<a href="#" class="csdl-button csdl-button-icon csdl-sort-az" data-sort><i class="csdl-button-icon" />Sort A-Z</a>',
                        '<a href="#" class="csdl-button csdl-button-icon csdl-copy" data-copy><i class="csdl-button-icon" /><span>Copy to Clipboard</span></a>',
                        '<input type="text" name="search" placeholder="Search..." class="csdl-search">',
                    '</div>',
                    '<div class="csdl-column two csdl-right">',
                        '<a href="#" class="csdl-button csdl-button-link" data-cancel>Cancel</a>',
                        '<a href="#" class="csdl-button csdl-button-done" data-done>Done</a>',
                    '</div>',
                '</div>',
                '<div class="csdl-list-container csdl-row">',
                    '<div class="csdl-list-cta" data-list-cta>',
                        'The first step in creating a list is to add or import data. To get going, look for the <strong>Import</strong> button above this message.',
                    '</div>',
                    '<div class="csdl-list-info" data-list-info style="display: none;">',
                        '<h5>Current List <small>(<span data-counter>0</span> elements)</small></h5>',
                        '<p><strong>Did you know</strong> you can re-order items in this list simply by dragging them into new position?</p>',
                    '</div>',
                    '<ol class="csdl-list-elements clearfix">',
                        '<li class="csdl-list-add" data-add-item>',
                            '<input type="text" name="item" class="csdl-list-add-input" placeholder="Add to list..." />',
                        '</li>',
                    '</ol>',
                '</div>',
            '</div>'
        ].join(''),

        listElement : [
            '<li>',
                '<div class="csdl-list-item" data-handle data-item>',
                    '<a href="#" class="csdl-item-delete" data-delete>&times;</a>',
                    '<span>{value}</span>',
                    '<input type="text" placeholder="Enter a value..." value="{value}">',
                '</div>',
                ',',
            '</li>'
        ].join(''),

        listEditor_import : [
            '<div class="csdl-import-view csdl-row">',
                '<div class="csdl-row" data-step-one>',
                    '<h4>Paste the contents of your CSV below:</h4>',
                    '<textarea name="import" class="csdl-import-input" placeholder="Paste your data here..."></textarea>',
                '</div>',
                '<div class="csdl-row">',
                    '<label><input type="checkbox" name="replace" value="1"> Replace the current list?</label>',
                '</div>',
                '<div class="csdl-row csdl-import-buttons">',
                    '<a href="#" class="csdl-button" data-import-csv>Import</a>',
                    '<a href="#" class="csdl-button csdl-button-link" data-import-cancel>Cancel</a>',
                '</div>',
            '</div>'
        ].join(''),

        listEditor_import_file : [
            '<h4>Import a CSV file</h4>',
            '<div class="csdl-draganddrop" data-import-file>',
                '<input type="file" name="csvfile" style="display: none;">',
                '<p>Drag and drop a CSV file here</p>',
                '<a href="#" class="csdl-button" data-select-file>Select File</a>',
            '</div>'
        ].join(''),

        listEditor_import_table : [
            '<div class="csdl-row" data-step-two>',
                '<h4>Select column(s) to add</h4>',
                '<p data-info>The values in the columns you select will be inserted into a list according to their order. If you\'d like to re-order these items in the next step you can.</p>',
                '<table>',
                    '<thead>',
                        '<tr />',
                    '</thead>',
                    '<tbody />',
                    '<tfoot />',
                '</table>',
                '<div class="csdl-row">',
                    '<label><input type="checkbox" name="ignoreheaders" value="1" checked="checked"> First row is table header</label>',
                '</div>',
            '</div>'
        ].join(''),

        listEditor_import_tableHeader : '<th><input type="checkbox" name="column" value="{i}"></th>',

        listEditor_import_tableFooter : '<tr><td colspan="{width}">{more} more rows found</td></tr>'

    };

});

})(CSDLEditor, window);