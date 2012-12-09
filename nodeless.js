#! /usr/bin/env node

var fs = require('fs');
var less = require('less');
var path = require('path');

var argv = require('optimist')
	.usage('Usage: $0 [-x] [-o dir] files')
	.options('x', {
		boolean: true,
		alias: 'compress',
		describe: 'Compress output by removing some whitespaces.'
	})
	.options('o', {
		alias: 'output',
		describe: 'Output all compiled CSS to the specified directory.',
		default: false
	})
	.argv;

function compile(source, target) {
	fs.readFile(source, 'utf8', function(err, content) {
		if(err)
			return console.log('Error reading %s: %s', source, err);
		less.render(content, function(err, css) {
			if(err)
				return console.log('Error compiling %s: %s', source, err);
			fs.writeFile(target, css, function(err) {
				if(err)
					return console.log('Error saving %s: %s', target, err);
				console.log('Compiled %s to %s', source, target);
			});
		});
	});
}

function search(filename) {
	fs.stat(filename, function(err, stats) {
		if(err)
			return console.log('Error describing %s: %s', filename, err);

		if(stats.isDirectory()) {
			fs.readdir(filename, function(err, files) {
				for(var i = 0; i < files.length; i++) {
					search(path.resolve(filename, files[i]));
				}
			});
		} else if(stats.isFile() && path.extname(filename) == '.less') {
			watch(filename);
		}
	});
}

function watch(filename) {
	var source = path.relative(process.cwd(), filename);
	var target = path.relative(
		process.cwd(),
		path.resolve(
			(argv.output
				? path.relative(
					process.cwd(),
					argv.output
				)
				: path.dirname(filename)
			),
			path.basename(filename, '.less') + '.css'
		)
	);
	fs.watch(filename, function(event) {
		fs.stat(source, function(err, sourceStats) {
			if(err)
				return console.log('Error monitoring %s: %s', source, err);

			fs.stat(target, function(err, targetStats) {
				if(err)
					return console.log('Error monitoring %s: %s', target, err);

				//console.log('Source: %s\nTarget: %s', sourceStats.mtime, targetStats.mtime);
				if(targetStats.mtime < sourceStats.mtime)
					compile(source, target);
			});
		});
	});
	//console.log('Watching %s', path.relative(process.cwd(), filename));
}

if(!argv._.length) {
	search(process.cwd());
} else {
	for(var i = 0; i < argv._.length; i++)
	{
		var watched = path.resolve(argv._[i]);
		fs.stat(watched, function(err, stats) {
			if(err)
				return console.log('Error describing %s: %s', watched, err);

			if(stats.isDirectory()) {
				search(watched);
			} else if(stats.isFile()) {
				watch(watched);
			}
		});
	}
}

//search(process.cwd());
//compile('style.less');