var bundy = require('bundy');

bundy.copy("src/csdleditor.config.js", "minified/csdleditor.config.js");

bundy.js([
	"src/csdleditor.loader.js",
    "src/lib/codemirror.js",
    "src/lib/codemirror.hint.js",
    "src/lib/codemirror.addon.activeline.js",
    "src/lib/codemirror.addon.closebrackets.js",
    "src/lib/codemirror.addon.continuecomment.js",
    "src/lib/codemirror.addon.markselection.js",
    "src/lib/codemirror.addon.matchbrackets.js",
    "src/lib/codemirror.addon.matchhighlighter.js",
    "src/lib/codemirror.addon.placeholder.js",
    "src/lib/jquery.appendix.js",
    "src/lib/jquery.simulate.js",
    "src/lib/mousetrap.js",
    "src/csdleditor.codemirror.mode.csdl.js",
    "src/csdleditor.codemirror.hint.csdl.js",
    "src/csdleditor.googlemaps.js",
    "src/csdleditor.geoselection.js",
    "src/csdleditor.templates.js",
    "src/csdleditor.js",
    "src/csdleditor.loader.post.js"
], 'minified/csdleditor.min.js');

bundy.css([
    "src/lib/codemirror.css",
    "src/lib/codemirror.hint.css",
	'src/csdleditor.css'
], 'minified/csdleditor.min.css');

bundy.copy([
	'src/images/csdl-header.png',
    'src/images/csdl-help.png',
    'src/images/loader.gif',
    'src/images/maps-marker.png'
], 'minified/images/');

bundy.copy('README.md', 'minified/README.md');

// go!
bundy.build();
