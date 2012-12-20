#! /usr/bin/env node

var fs = require('fs');
var lazy = require('lazy');
var less = require('less');
var optimist = require('optimist');
var path = require('path');

/**
 * ENVIRONMENT
 */

var argv = optimist
	.usage('Usage: $0 -h -x --verbose -o [dir] files')
	.options('h', {
		boolean: true,
		alias: 'help',
		describe: 'Display this information'
	})
	.options('x', {
		boolean: true,
		alias: 'compress',
		describe: 'Compress output by removing some whitespaces.'
	})
	.options('v', {
		boolean: true,
		alias: 'verbose',
		describe: 'Output detailed log information.',
	})
	.options('o', {
		alias: 'output',
		describe: 'Output all compiled CSS to the specified directory.',
	})
	.argv;

var cwd = process.cwd();

var options = { compress: argv.compress }

/**
 * LOGGING
 */

var debug = function () { if (argv.verbose) console.log.apply(this, arguments); }

var trace = function () {
	if(argv.verbose) {
		if(arguments[0])
			arguments[0] = 'Trace: ' + arguments[0];

		console.log.apply(this, arguments);
	}
}

var error = function () { console.log.apply(this, arguments); }

var log = function () { console.log.apply(this, arguments); }

var relativePath = function (filename) {
	return path.relative(cwd, filename);
}

var stylesheetError = function (err, filename) {
	error('Error while compiling %s at line %d, column %d in %s: %s\n%s',
		  relativePath(filename),
		  err.line,
		  err.column,
		  err.filename/* || path.basename(filename)*/,
		  err.message.trim(),
		  err.extract.join('\n').replace(/^\n*([\s\S]*)$/, '$1').trimRight());
}

var time = function () {
	var d, h, m, s;

	d = new Date();
	h = d.getHours();
	m = d.getMinutes();
	s = d.getSeconds();

	if (h < 10) h = '0' + h;
	if (m < 10) m = '0' + m;
	if (s < 10) s = '0' + s;

	return h + ':' + m + ':' + s;
}

/**
 * COMPILATION
 */

/**
 * Update a CSS file and its importers
 *
 * @param {String} Absolute path to LESS source file
 */
var update = function (filename) {
	trace('update(%s);', filename);

	compile(filename);

	for (var i = 0; i < watchlist[filename].importers.length; i++) {
		update(watchlist[filename].importers[i]);
	}
}

/**
 * Determine if a file was actually modified
 *
 * @param {String} Absolute path to modified file
 */
var modified = function (filename, dependency) {
	trace('modified(%s);', filename);

	fs.stat(filename, function (err, stats) {
		if (err) return error('Error checking timestamp on %s: %s', filename, err);

		if (stats.mtime > watchlist[filename].mtime) {
			watchlist[filename].mtime = stats.mtime;

			update(filename);
		}
	});
}

/**
 * Compile a LESS file into its corresponding CSS
 *
 * @param {String} Absolute path to LESS file
 */
var compile = function (filename) {
	trace('compile(%s);', filename);
	var source = filename;
	var target = path.resolve(
					(argv.output
						? path.relative(
							process.cwd(),
							argv.output
						)
						: path.dirname(filename)
					),
					path.basename(filename, '.less') + '.css'
				);

	fs.readFile(source, 'utf8', function (err, content) {
		if (err) return error('Error reading %s: %s', source, err);

		try {
			(new(less.Parser)({
				paths: [relativePath(path.dirname(source))/*, process.cwd()*/],
				filename: path.basename(source)
			}))
			.parse(content, function (err, tree) {
				if (err) return stylesheetError(err, source);

				try { var css = tree.toCSS(options); }
				catch (err) { return stylesheetError(err, source); }

				fs.writeFile(target, css, function (err) {
					if (err) return error('Error saving %s: %s', target, err);

					var d = new Date();
					log('[%s] Compiled %s to %s',
						time(),
						relativePath(source), relativePath(target));
				});
			});
		} catch (err) { return parseError(err, source); }
	});
}

/**
 * WATCHING
 */

var watchlist = {};

/**
 * Add a watch to a file
 *
 * @param {String} Absolute path to file
 */
var watch = function (filename) {
	//trace('watch(%s);', filename);
	fs.watch(filename, function () {
		modified(filename);
	});
	debug('Watching %s.', relativePath(filename));
}

/**
 * Enumerate and watch LESS files imported from a LESS stylesheet
 *
 * @param {String} Absolute path to master LESS file
 */
var dependencies = function (importer) {
	var re = /@import (?:url\()?(?:'|")?([\S]+\.less)(?:'|")?\)?;?/;

	try {
		new lazy(fs.createReadStream(importer))
			.lines
			.map(String)
			.map(function (line) {
				var match = re.exec(line);
				if (match) {
					var imported = path.resolve(
						path.dirname(importer),
						match[1]
					);
					debug('%s imports %s', relativePath(importer), relativePath(imported));
					fs.exists(imported, function (exists) {
						if(!exists)
							return error('%s was imported by %s but does not exist',
							             relativePath(imported),
							             relativePath(importer));

						found(imported);
						watchlist[imported].importers.push(importer);
					});
				}
			});
	} catch (err) {
		error('Error getting dependencies of %s: %s', importer, err);
	}
}

/**
 * A LESS file was found - watch it and its dependencies
 *
 * @param {String} Absolute path to found LESS file
 */
var found = function (filename) {
	if (watchlist.hasOwnProperty(filename)) return; // Already found

	watchlist[filename] = {
		importers: [],	// What files depend on this?
		mtime: 0		// When did we last see this file was modified?
	};

	watch(filename);
	dependencies(filename);
}

/**
 * Add a file or directory to the watchlist
 * If a directory, search recursively for LESS files
 *
 * @param {String} Absolute path to file or directory
 */
var add = function (filename) {
	trace('add(%s);', filename);

	var less = /^[\s\S]+\.less$/;

	fs.exists(filename, function (exists) {
		if (!exists) return error('%s does not exist.', relativePath(filename));

		fs.stat(filename, function (err, stats) {
			if (err) return error('Error adding %s to watchlist: %s', relativePath(filename), err);

			if (stats.isDirectory()) {
				fs.readdir(filename, function (err, files) {
					if (err) return error('Could not get contents of directory %s: %s', filename, err);

					for (var i = 0; i < files.length; i++) {
						add(path.resolve(filename, files[i]));
					}
				});
			} else if(less.test(path.basename(filename))) {
				found(filename);
			}
		});
	});
}

/**
 * STARTUP
 */

/**
 * Show help or add watches
 */
var run = function () {
	if (argv.help) {
		optimist.showHelp();
	} else {
		if (argv._.length === 0) { // No paths specified
			add(process.cwd());
		} else {
			for (var i = 0; i < argv._.length; i++) {
				add(path.resolve(argv._[i]));
			}
		}
	}
}

run();