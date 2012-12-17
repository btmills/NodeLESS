#! /usr/bin/env node

var fs = require('fs');
var less = require('less');
var path = require('path');
var optimist = require('optimist');

/**
 * ENVIRONMENT
 */

var argv = optimist
	.usage('Usage: $0 -h -x -v -o [dir] files')
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

var sources = {};

/**
 * LOGGING
 */

var debug = function () { if (argv.verbose) console.log.apply(this, arguments); }

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

var compile = function (source, target) {
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

var search = function (filename) {
	fs.stat(filename, function (err, stats) {
		if (err) return error('Error describing %s: %s', filename, err);

		if (stats.isDirectory()) {
			fs.readdir(filename, function (err, files) {
				for (var i = 0; i < files.length; i++)
					search(path.resolve(filename, files[i]));
			});
		} else if (stats.isFile() && path.extname(filename) == '.less') {
			watch(filename);
		}
	});
}

function watch(filename) {
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
	sources[source] = 0;
	fs.watch(filename, function (event) {
		fs.exists(source, function (exists) {
			if (!exists) {
				compile(source, target);
			} else {
				fs.stat(source, function (err, sourceStats) {
					if (err) return error('Error monitoring %s: %s', source, err);

					if (sourceStats.mtime > sources[source]) { // Only compile if more recent
						sources[source] = sourceStats.mtime;

						compile(source, target);
					}
				});
			}
		});
	});
	debug('Watching %s', path.relative(process.cwd(), filename));
}

/**
 * STARTUP
 */

if (argv.help) {
	optimist.showHelp();
} else {
	if (!argv._.length) {
		search(process.cwd());
	} else {
		for (var i = 0; i < argv._.length; i++)
		{
			var watched = path.resolve(argv._[i]);
			fs.stat(watched, function (err, stats) {
				if (err) return error('Error describing %s: %s', watched, err);

				if (stats.isDirectory()) {
					search(watched);
				} else if (stats.isFile()) {
					watch(watched);
				}
			});
		}
	}
}