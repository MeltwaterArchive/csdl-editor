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
        geo_polygonCoordinates : '<ul />'

    };

});

})(CSDLEditor, window);