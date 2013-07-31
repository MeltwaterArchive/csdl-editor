/*global CSDLEditor*/

(function(CSDLEditor, window, undefined) {
    "use strict";

CSDLEditor.Loader.addComponent(function() {

    CSDLEditor.Templates = {

        container : [
            '<div class="csdl-container csdl-theme-light">',
                '<div class="csdl-maps-marker-url" />',
                '<div class="csdl-header" data-bar-top>',
                    '<a href="#" data-undo class="csdl-undo">Undo</a>',
                    '<a href="#" data-redo class="csdl-inactive csdl-redo">Redo</a>',
                    '<a href="#" data-geo class="csdl-inactive csdl-geoselect">Geo - Selection</a>',
                    '<a href="#" data-list class="csdl-inactive csdl-listeditor">List</a>',
                    '<a href="#" data-max class="csdl-view-open"></a>',
                    '<a href="#" data-min class="csdl-view-close" style="display: none;"></a>',
                    '<a href="#" data-theme-dark class="csdl-theme">Dark</a>',
                    '<a href="#" data-theme-light class="csdl-theme" style="display: none;">Light</a>',
                    '<a href="#" class="csdl-save" data-save>Save</a>',
                '</div>',
                '<div class="csdl-editor-container" data-editor-container />',
                '<div class="csdl-footer" data-bar-bottom>',
                    '<div class="csdl-help" style="display: none;" data-help>',
                        '<span data-help-content />',
                        '<a href="#" data-help-more>More</a>',
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
                    '<a href="#" class="csdl-button done" data-done>Done</a>',
                    '<a href="#" class="csdl-button" data-cancel>Cancel</a>',
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
                    '<div class="csdl-column six csdl-left">',
                        '<a href="#" class="csdl-button csdl-button-icon csdl-sort-az" data-sort>Sort A-Z</a>',
                        '<a href="#" class="csdl-button csdl-button-icon csdl-copy" data-copy>Copy to Clipboard</a>',
                        '<a href="#" class="csdl-button csdl-button-icon csdl-import" data-import>Import</a>',
                    '</div>',
                    '<div class="csdl-column six csdl-right">',
                        '<input type="text" name="search" placeholder="Search..." class="csdl-search">',
                        '<a href="#" class="csdl-button" data-cancel>Cancel</a>',
                        '<a href="#" class="csdl-button done" data-done>Done</a>',
                    '</div>',
                '</div>',
                '<div class="csdl-list-container csdl-row">',
                    '<ol class="csdl-list-elements" />',
                '</div>',
                '<a href="#" class="csdl-button done add" data-add>Add List Item</a>',
            '</div>'
        ].join(''),

        listElement : [
            '<li>',
                '<a href="#" class="csdl-icon csdl-delete" data-delete></a>',
                '<a href="#" class="csdl-icon csdl-reorder" data-handle></a>',
                '<input type="text" placeholder="Enter a value..." value="{value}">',
            '</li>'
        ].join(''),

        listEditor_import : [
            '<div class="csdl-import-view csdl-row">',
                '<div class="csdl-row" data-step-one>',
                    '<h4>Paste your data as CSV:</h4>',
                    '<textarea name="import" class="csdl-import-input" placeholder="Paste your data here..."></textarea>',
                '</div>',
                '<div class="csdl-row">',
                    '<div class="csdl-column eight csdl-left">',
                        '<label><input type="checkbox" name="replace" value="1"> Replace the current list? <small>Otherwise the new items will be appended)</small></label>',
                    '</div>',
                    '<div class="csdl-column four csdl-right">',
                        '<a href="#" class="csdl-button" data-import-cancel>Cancel</a>',
                        '<a href="#" class="csdl-button done" data-import-csv>Import</a>',
                    '</div>',
                '</div>',
            '</div>'
        ].join(''),

        listEditor_import_file : [
            '<div class="csdl-draganddrop" data-import-file>',
                '<input type="file" name="csvfile" style="display: none;">',
                '<p>Drag and drop a CSV file here</p>',
                'or <a href="#" class="csdl-button done" data-select-file>Select File</a>',
            '</div>'
        ].join(''),

        listEditor_import_table : [
            '<div class="csdl-row" data-step-two>',
                '<p data-info>Please select which columns from your dataset you would like to import.</p>',
                '<p><label><input type="checkbox" name="ignoreheaders" value="1" checked="checked"> Ignore first row (it\'s a table header)</label></p>',
                '<table>',
                    '<thead>',
                        '<tr />',
                    '</thead>',
                    '<tbody />',
                    '<tfoot />',
                '</table>',
            '</div>'
        ].join(''),

        listEditor_import_tableHeader : '<th><input type="checkbox" name="column" value="{i}"></th>',

        listEditor_import_tableFooter : '<tr><td colspan="{width}">({more} more)</td></tr>'

    };

});

})(CSDLEditor, window);