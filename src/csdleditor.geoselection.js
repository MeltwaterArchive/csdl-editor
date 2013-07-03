/*global CSDLEditor, google*/
(function(CSDLEditor, window, undefined) {
    "use strict";

CSDLEditor.Loader.addComponent(function($) {

    // define local vars and functions
    var

    // shortcut to a longer function name
    format = $.number.format,
    
    /**
     * Initializes geo search via Google API using a text input in the given $view.
     * 
     * @param  {jQuery} $view View in which to initialize the geo search.
     */
    initSearch = function($view) {
        var map = $view.data('map'),
            $ac = $view.find('.csdl-map-search'),
            ac = new google.maps.places.Autocomplete($ac[0], {});

        /**
         * Move the map viewport to the found location.
         * @listener
         */
        google.maps.event.addListener(ac, 'place_changed', function() {
            var place = ac.getPlace();

            if (place.geometry === undefined) {
                // choose the first visible suggestion (if any)
                if ($('.pac-container .pac-item').length > 0) {
                    $ac.trigger('focus');
                    $ac.simulate('keydown', {keyCode:40}); // down arrow
                    $ac.simulate('keydown', {keyCode:13}); // enter
                }
                return;
            }

            if (place.geometry.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else {
                map.setCenter(place.geometry.location);
                map.setZoom(17);
            }
        });
    },

    /**
     * Checks if the 1st coordinate is north of the 2nd one.
     * 
     * @param  {google.maps.LatLng} c1
     * @param  {google.maps.LatLng} c2
     * @return {Boolean}
     */
    isNorth = function(c1, c2) {
        return (c1.lat() >= c2.lat());
    },

    /**
     * Checks if the 1st coordinate is east of the 2nd one.
     * 
     * @param  {google.maps.LatLng} c1
     * @param  {google.maps.LatLng} c2
     * @return {Boolean}
     */
    isEast = function(c1, c2) {
        return (c1.lng() >= c2.lng());
    };

    /**
     * Container for different geo selection methods.
     * 
     * @type {Object}
     */
    CSDLEditor.GeoSelection = {};

    /**
     * Constructor for Box GeoSelection.
     * 
     * @param  {CSDLEditor.Editor} editor Instance of the CSDLEditor in which this geo selection will be performed.
     * @param  {jQuery} $view View where this geo selection will be visible.
     */
    CSDLEditor.GeoSelection.box = function(editor, $view) {
        this.editor = editor;
        this.$view = $view;
        
        var self = this,
            // initialize the map
            map = new google.maps.Map($view.find('.csdl-map-canvas')[0], CSDLEditor.mapsOptions),
            // initialize the rectangle that we're gonna draw
            rect = new google.maps.Rectangle($.extend({}, editor.options.mapsOverlay, {})),
            // store rectangle coordinates in an array
            coords = [],
            // create corresponding markers
            mOpt = {
                position : new google.maps.LatLng(0, 0),
                draggable : true,
                icon : editor.options.mapsMarker
            },
            markers = [
                new google.maps.Marker(mOpt),
                new google.maps.Marker(mOpt)
            ];

        $view.data('map', map)
            .data('rect', rect)
            .data('markers', markers);

        $view.find('.csdl-map-instructions').html(editor.config.geo_box.instructions[0]);

        // initialize places autocomplete search
        initSearch($view);

        /**
         * Listen for clicks on the map and adjust the rectangle to it.
         */
        google.maps.event.addListener(map, 'click', function(ev) {
            if (coords.length >= 2) {
                coords.pop();
            }

            coords.push(ev.latLng);

            // drop a corresponding marker
            var m = coords.length - 1;
            markers[m].setPosition(ev.latLng);

            if (!$view.data('bothMarkersVisible')) {
                markers[m].setAnimation(google.maps.Animation.DROP);
            }

            markers[m].setMap(map);

            if (coords.length === 2) {
                self.drawRectangle(map, rect, coords);
                $view.data('bothMarkersVisible', true);
            }

            $view.find('.csdl-map-instructions').html(editor.config.geo_box.instructions[coords.length]);
            $view.find('.csdl-clear-map').fadeIn();
        });

        /**
         * When a marker is dragged to a different position then redraw the rectangle.
         */
        google.maps.event.addListener(markers[0], 'position_changed', function() {
            coords[0] = this.getPosition();
            self.drawRectangle(map, rect, coords);
            
            // calculate the area size
            if (coords.length === 2) {
                self.updateInfo(rect);
            }
        });

        /**
         * When a marker is dragged to a different position then redraw the rectangle.
         */
        google.maps.event.addListener(markers[1], 'position_changed', function() {
            coords[1] = this.getPosition();
            self.drawRectangle(map, rect, coords);

            // calculate the area size
            self.updateInfo(rect);
        });

        /**
         * Remove the rectangle and all values from the map.
         */
        $view.find('.csdl-clear-map').on('click', function() {
            // clear the coords
            coords = [];

            // hide the rectangle and marker
            rect.setMap(null);
            markers[0].setMap(null);
            markers[1].setMap(null);
            $view.data('bothMarkersVisible', false);

            $view.find('.csdl-map-area span').html('0 km<sup>2</sup>');

            $view.find('.csdl-map-instructions').html(editor.config.geo_box.instructions[0]);
            $(this).hide();

            return false;
        });
    };

    CSDLEditor.GeoSelection.box.prototype = {
        /**
         * Set the geo selection value.
         * 
         * @param  {String} val String of coordinates for the geo selection.
         */
        setValue : function(val) {
            val = val.split(':');

            if (val.length !== 2) {
                return false; // invalid value
            }

            var self = this,
                nw = val[0].split(','),
                se = val[1].split(',');

            setTimeout(function() {
                var map = self.$view.data('map'),
                    rect = self.$view.data('rect'),
                    tips = self.getAllTipsFromNWSE(nw, se),
                    bounds = new google.maps.LatLngBounds(tips.sw, tips.ne);

                self.drawRectangleFromBounds(map, rect, bounds);

                var markers = self.$view.data('markers');
                markers[0].setMap(map);
                markers[0].setPosition(tips.ne);
                markers[1].setMap(map);
                markers[1].setPosition(tips.sw);

                map.fitBounds(rect.getBounds());

                // calculate the area size
                self.updateInfo(rect);

                self.$view.find('.csdl-map-instructions').html(self.editor.config.geo_box.instructions[2]);
                self.$view.find('.csdl-clear-map').fadeIn();
                
            }, 400); // make sure everything is properly loaded
        },

        /**
         * Returns the value of the geo selection.
         * 
         * @return {String}
         */
        getValue : function() {
            var rect = this.$view.data('rect');

            // if no map then rect is not visible, so has no values
            if (!rect.getMap()) {
                return '';
            }

            var tips = this.getAllTipsFromBounds(rect.getBounds());
            return tips.nw.lat() + ',' + tips.nw.lng() + ':' + tips.se.lat() + ',' + tips.se.lng();
        },

        /**
         * Updates the marked area information (coordinates and size).
         * 
         * @param  {google.maps.Rectangle} rect Rectangle selection.
         */
        updateInfo : function(rect) {
            var self = this,
                tips = this.getAllTipsFromBounds(rect.getBounds()),
                area = google.maps.geometry.spherical.computeArea([tips.nw, tips.ne, tips.se, tips.sw]);

            this.$view.find('.csdl-map-area span')
                .html(format(Math.round(area / 1000000)) + ' km<sup>2</sup>');

            // update the tips displayed coordinates
            $.each(tips, function(point, coords) {
                self.$view.find('.csdl-map-coordinates .' + point + ' span')
                    .html(format(coords.lat(), 2) + ', ' + format(coords.lng(), 2));
            });
        },

        /**
         * Draws the rectangle using the given coords.
         * 
         * @return {Boolean} Success or not.
         */
        drawRectangle : function(map, rect, coords) {
            if (coords.length !== 2) {
                return false;
            }

            var tips = this.getAllTipsFromUnspecified(coords[0], coords[1]),
                bounds = new google.maps.LatLngBounds(tips.sw, tips.ne);

            this.drawRectangleFromBounds(map, rect, bounds);
            return true;
        },

        /**
         * Draws rectangle using the given bounds.
         * 
         * @param  {google.maps.Map} map Map on which to draw the rectangle.
         * @param  {google.maps.Rectangle} rect The rectangle to be drawn.
         * @param  {google.maps.LatLngBounds} bounds Bounds to be drawn with.
         */
        drawRectangleFromBounds : function(map, rect, bounds) {
            rect.setBounds(bounds);
            rect.setMap(map);
        },

        /**
         * Gets coordinates for all four corners of the rectangle based on its bounds.
         * 
         * @param  {google.maps.LatLngBounds} bounds
         * @return {Object}
         */
        getAllTipsFromBounds : function(bounds) {
            var tips = {};
            tips.ne = bounds.getNorthEast();
            tips.sw = bounds.getSouthWest();
            tips.nw = new google.maps.LatLng(tips.ne.lat(), tips.sw.lng());
            tips.se = new google.maps.LatLng(tips.sw.lat(), tips.ne.lng());
            return tips;
        },

        /**
         * Gets coordinates for all four corners of the rectangle based on it raw coordinates of NW and SE points.
         * 
         * @param  {Array} nw Array where at index 0 is latitude for NW corner, and at index 1 its longitude.
         * @param  {Array} se Array where at index 0 is latitude for SE corner, and at index 1 its longitude.
         * @return {Object}
         */
        getAllTipsFromNWSE : function(nw, se) {
            var tips = {};
            tips.nw = new google.maps.LatLng(parseFloat(nw[0]), parseFloat(nw[1]));
            tips.se = new google.maps.LatLng(parseFloat(se[0]), parseFloat(se[1]));
            tips.ne = new google.maps.LatLng(tips.nw.lat(), tips.se.lng());
            tips.sw = new google.maps.LatLng(tips.se.lat(), tips.nw.lng());
            return tips;
        },

        /**
         * Gets all tips of a rectangle from unspecified two coordinates.
         * 
         * @param  {google.maps.LatLngBounds} c1
         * @param  {google.maps.LatLngBounds} c2
         * @return {Object}
         */
        getAllTipsFromUnspecified : function(c1, c2) {
            var n, s, w, e;

            if (isNorth(c1, c2)) {
                n = c1;
                s = c2;
            } else {
                n = c2;
                s = c1;
            }

            if (isEast(c1, c2)) {
                e = c1;
                w = c2;
            } else {
                e = c2;
                w = c1;
            }

            var tips = {
                nw : new google.maps.LatLng(n.lat(), w.lng()),
                ne : new google.maps.LatLng(n.lat(), e.lng()),
                se : new google.maps.LatLng(s.lat(), e.lng()),
                sw : new google.maps.LatLng(s.lat(), w.lng())
            };

            return tips;
        }
    };

    /**
     * Constructor for Radius GeoSelection.
     * 
     * @param  {CSDLEditor.Editor} editor Instance of the CSDLEditor in which this geo selection will be performed.
     * @param  {jQuery} $view View where this geo selection will be visible.
     */
    CSDLEditor.GeoSelection.radius = function(editor, $view) {
        this.editor = editor;
        this.$view = $view;

        var self = this,
            // initialize the map
            map = new google.maps.Map($view.find('.csdl-map-canvas')[0], CSDLEditor.mapsOptions),
            // initialize the circle that we're gonna draw
            circle = new google.maps.Circle(editor.options.mapsOverlay),
            // create center marker
            markerOptions = {
                position : new google.maps.LatLng(0, 0),
                draggable : true,
                icon : editor.options.mapsMarker
            },
            centerMarker = new google.maps.Marker(markerOptions),
            radiusMarker = new google.maps.Marker(markerOptions);

        $view.data('map', map)
            .data('circle', circle)
            .data('centerMarker', centerMarker)
            .data('radiusMarker', radiusMarker)
            .data('center', false);

        $view.find('.csdl-map-instructions').html(editor.config.geo_radius.instructions[0]);

        // initialize places autocomplete search
        initSearch($view);

        /**
         * Listen for clicks on the map and adjust the circle to it.
         */
        google.maps.event.addListener(map, 'click', function(ev) {
            // the center has already been marked, so this is a click for the radius
            if ($view.data('center')) {
                var radius = google.maps.geometry.spherical.computeDistanceBetween(circle.getCenter(), ev.latLng);
                circle.setRadius(radius);
                circle.setMap(map);

                // drop the corresponding marker
                radiusMarker.setPosition(ev.latLng);
                radiusMarker.setMap(map);

                self.updateInfo(circle);

                $view.find('.csdl-map-instructions').html(editor.config.geo_radius.instructions[2]);

            // the center hasn't been marked yet, so this is the click for it
            } else {
                circle.setCenter(ev.latLng);

                // drop the corresponding marker
                centerMarker.setPosition(ev.latLng);
                centerMarker.setMap(map);

                $view.data('center', true);

                $view.find('.csdl-map-instructions').html(editor.config.geo_radius.instructions[1]);
            }

            $view.find('.csdl-clear-map').fadeIn();
        });

        /**
         * When the center marker is dragged to a different position then redraw the circle.
         */
        google.maps.event.addListener(centerMarker, 'position_changed', function() {
            var center = this.getPosition(),
                oldCenter = circle.getCenter();

            circle.setCenter(center);

            if (oldCenter !== undefined) {
                // move the radius marker as well, to fit new center
                // so first calculate the lat and lng differences
                var latDiff = center.lat() - oldCenter.lat(),
                    lngDiff = center.lng() - oldCenter.lng(),
                    // and apply that to new position of the marker
                    oldPosition = radiusMarker.getPosition(),
                    position = new google.maps.LatLng(oldPosition.lat() + latDiff, oldPosition.lng() + lngDiff);

                radiusMarker.setPosition(position);
            }
        });

        /**
         * When the radius marker is dragged to a different position then redraw the circle.
         */
        google.maps.event.addListener(radiusMarker, 'position_changed', function() {
            var center = circle.getCenter();

            if (center !== undefined) {
                circle.setRadius(google.maps.geometry.spherical.computeDistanceBetween(circle.getCenter(), this.getPosition()));
                self.updateInfo(circle);
            }
        });

        /**
         * Remove the circle and all values from the map.
         */
        $view.find('.csdl-clear-map').on('click', function() {
            circle.setCenter(null);
            circle.setMap(null);
            centerMarker.setMap(null);
            radiusMarker.setMap(null);

            $view.data('center', false);
            $view.find('.csdl-map-area span').html('0 km<sup>2</sup>');

            $view.find('.csdl-map-instructions').html(editor.geo_radius.instructions[0]);
            $(this).hide();

            return false;
        });
    };

    CSDLEditor.GeoSelection.radius.prototype = {
        /**
         * Set the geo selection value.
         * 
         * @param  {String} val String of coordinates for the geo selection.
         */
        setValue : function(val) {
            val = val.split(':');

            var self = this,
                latlng = val[0].split(','),
                radius = parseFloat(val[1]) * 1000;

            setTimeout(function() {
                var map = self.$view.data('map'),
                    circle = self.$view.data('circle'),
                    center = new google.maps.LatLng(latlng[0], latlng[1]);

                // first, set markers because changing their positions causes changes in the circle
                var centerMarker = self.$view.data('centerMarker');
                centerMarker.setPosition(center);
                centerMarker.setMap(map);

                var radiusMarker = self.$view.data('radiusMarker'),
                    radiusPosition = google.maps.geometry.spherical.computeOffset(center, radius, 90);
                radiusMarker.setPosition(radiusPosition);
                radiusMarker.setMap(map);

                circle.setCenter(center);
                circle.setRadius(radius);
                circle.setMap(map); 

                self.$view.data('center', true);

                map.fitBounds(circle.getBounds());

                // calculate the area size
                self.updateInfo(circle);

                self.$view.find('.csdl-map-instructions').html(self.editor.config.geo_radius.instructions[2]);
                self.$view.find('.csdl-clear-map').fadeIn();
                
            }, 200); // make sure everything is properly loaded
        },

        /**
         * Returns the value of the geo selection.
         * 
         * @return {String}
         */
        getValue : function() {
            var circle = this.$view.data('circle');

            // if no map then rect is not visible, so has no values
            if (!circle.getMap()) {
                return '';
            }

            var center = circle.getCenter();
            return center.lat() + ',' + center.lng() + ':' + (circle.getRadius() / 1000);
        },

        /**
         * Updates the area information with calculated information on how big the marked area is.
         * 
         * @param  {google.maps.Circle} circle Circle marking.
         */
        updateInfo : function(circle) {
            var r = circle.getRadius(),
                area = r * r * Math.PI,
                center = circle.getCenter();
            
            this.$view.find('.csdl-map-area span').html(format(Math.round(area / 1000000)) + ' km<sup>2</sup>');
            this.$view.find('.csdl-map-coordinates .center span')
                .html(format(center.lat(), 2) + ', ' + format(center.lng(), 2));
            this.$view.find('.csdl-map-coordinates .radius span')
                .html(format(circle.getRadius() / 1000, 2) + ' km');
        }
    };

    /**
     * Constructor for Box GeoSelection.
     * 
     * @param  {CSDLEditor.Editor} editor Instance of the CSDLEditor in which this geo selection will be performed.
     * @param  {jQuery} $view View where this geo selection will be visible.
     */
    CSDLEditor.GeoSelection.polygon = function(editor, $view) {
        this.editor = editor;
        this.$view = $view;

        var self = this,
            // initialize the map
            map = new google.maps.Map($view.find('.csdl-map-canvas')[0], CSDLEditor.mapsOptions),
            // initialize the polygon that we're gonna draw
            opt = $.extend({}, editor.options.mapsOverlay, {
                paths : [[]],
                editable : true
            }),
            polygon = new google.maps.Polygon(opt),
            path = polygon.getPath(),
            // storage markers
            markers = new google.maps.MVCArray(),
            mc = 1;

        $view.data('map', map)
            .data('polygon', polygon)
            .data('markers', markers);

        // initialize places autocomplete search
        initSearch($view);

        /**
         * Listen for clicks on the map and create new polygon points.
         */
        google.maps.event.addListener(map, 'click', function(ev) {
            path.push(ev.latLng);
        });

        /**
         * Listen for new items added in the polygon path and create corresponding markers.
         */
        google.maps.event.addListener(path, 'insert_at', function(i) {
            var marker = new google.maps.Marker({
                map : map,
                position : path.getAt(i),
                draggable : true,
                icon : editor.options.mapsMarker,
                zIndex : mc++ // zindex serves as a hacky ID to find this marker later
            });

            // add to markers array
            markers.insertAt(i, marker);

            // show the polygon if already 3 tips
            if (path.getLength() >= 3) {
                polygon.setMap(map);
            }

            // update instructions
            var instr = (path.getLength() <= 3) ? path.getLength() : 3;
            $view.find('.csdl-map-instructions').html(editor.config.geo_polygon.instructions[instr]);

            // update info
            self.updateInfo(polygon);
            $view.find('.csdl-clear-map').fadeIn();

            // setup listeners for the marker
            // after marker has moved, move the polygon tip as well
            google.maps.event.addListener(marker, 'position_changed', function() {
                var p = self.getMarkerIndex(marker, markers);
                if (p === -1) {
                    return;
                }

                path.setAt(p, this.getPosition());

                self.updateInfo(polygon);
            });

            // remove the marker and the polygon tip
            google.maps.event.addListener(marker, 'dblclick', function() {
                var p = self.getMarkerIndex(marker, markers);
                if (p === -1) {
                    return;
                }

                path.removeAt(p);
                markers.removeAt(p);
                this.setMap(null);

                self.updateInfo(polygon);
            });
        });

        /**
         * A tip of the polygon has moved, update corresponding marker.
         * 
         * @param  {Number} i Index of the marker.
         */
        google.maps.event.addListener(path, 'set_at', function(i) {
            var mark = markers.getAt(i),
                pos = path.getAt(i);

            if (!mark.getPosition().equals(pos)) {
                mark.setPosition(pos);
            }
        });

        /**
         * Remove the polygon and all values from the map.
         */
        $view.find('.csdl-clear-map').on('click', function() {
            markers.forEach(function(marker) {
                marker.setMap(null);
            });
            markers.clear();
            path.clear();

            self.updateInfo(polygon);

            $view.find('.csdl-map-instructions').html(editor.config.geo_polygon.instructions[0]);
            $(this).hide();

            return false;
        });

        $view.find('.csdl-map-instructions').html(editor.config.geo_polygon.instructions[0]);
    };

    CSDLEditor.GeoSelection.polygon.prototype = {
        /**
         * Set the geo selection value.
         * 
         * @param  {String} val String of coordinates for the geo selection.
         */
        setValue : function(val) {
            var self = this;
            val = val.split(':');

            setTimeout(function() {
                var polygon = self.$view.data('polygon'),
                    map = self.$view.data('map');

                $.each(val, function(i, v) {
                    v = v.split(',');
                    var pos = new google.maps.LatLng(parseFloat(v[0]), parseFloat(v[1]));

                    polygon.getPath().push(pos);
                });

                map.fitBounds(polygon.getBounds());

                // calculate the area size
                self.updateInfo(polygon);

                self.$view.find('.csdl-map-instructions').html(self.editor.config.geo_polygon.instructions[3]);
                self.$view.find('.csdl-clear-map').fadeIn();
                
            }, 400); // make sure everything is properly loaded
        },

        /**
         * Returns the value of the geo selection.
         * 
         * @return {String}
         */
        getValue : function() {
            var pth = this.$view.data('polygon').getPath(),
                v = [];

            pth.forEach(function(p) {
                v.push(p.lat() + ',' + p.lng());
            });

            return v.join(':');
        },

        /**
         * Get index of the marker (using zIndex as an ID).
         * 
         * @param  {google.maps.Marker} mrk Marker for which to get the index.
         * @param  {google.maps.MVCArray} mrks Collection of all markers.
         * @return {Number}
         */
        getMarkerIndex : function(mrk, mrks) {
            var p = -1;
            mrks.forEach(function(m, k) {
                if (m.getZIndex() === mrk.getZIndex()) {
                    p = k;
                }
            });
            return p;
        },

        /**
         * Updates the area information with calculated information on how big the marked area is.
         * 
         * @param  {google.maps.Polygon} polygon Polygon marking.
         */
        updateInfo : function(polygon) {
            var path = polygon.getPath(),
                $list = this.$view.find('.csdl-map-coordinates ul').html('');

            path.forEach(function(p) {
                $('<li />').html('(' + format(p.lat(), 4) + ', ' + format(p.lng(), 4) + ')').appendTo($list);
            });

            if (path.getLength() >= 3) {
                var area = google.maps.geometry.spherical.computeArea(path);
                this.$view.find('.csdl-map-area span').html(format(Math.round(area / 1000000)) + ' km<sup>2</sup>');
            } else {
                this.$view.find('.csdl-map-area span').html('0 km<sup>2</sup>');
            }
        }
    };

});

})(CSDLEditor, window);