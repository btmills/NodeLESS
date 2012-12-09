#! /usr/bin/env node

var fs = require('fs');
var less = require('less');
var path = require('path');

var argv = require('optimist')
	.usage('Usage: $0 [-x] [-o dir] files')
	.boolean('x')
	.alias('x', 'compress')
	.describe('x', 'Compress output by removing some whitespaces.')
	.alias('o', 'output')
	.describe('o', 'Output all compiled CSS to the specified directory.')
	.argv;

function compile(file) {
	var source = path.relative(process.cwd(), file);
	var target = path.relative(process.cwd(), path.resolve(path.dirname(file), path.basename(file, '.less')+'.css'));

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
	//console.log('Searching %s...', filename);
	fs.stat(filename, function(err, stats) {
		if(err)
			return console.log('Error describing %s: %s', filename, err);

		if(stats.isDirectory()) {
			fs.readdir(filename, function(err, files) {
				for(var i = 0; i < files.length; i++) {
					search(path.resolve(filename, files[i]));
				}
			});
		}
		else if(stats.isFile() && path.extname(filename) == '.less') {
			var toWatch = path.relative(process.cwd(), filename);
			//console.log('Adding %s to watch list.', toWatch);
			watch(toWatch);
		}
	});
}

function watch(filename) {
	fs.watch(filename, function(event) {
		compile(filename);
	});
	console.log('Watching %s', path.relative(process.cwd(), filename));
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