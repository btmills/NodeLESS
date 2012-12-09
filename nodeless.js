#! /usr/bin/env node

var fs = require('fs');
var less = require('less');
var path = require('path');
var program = require('commander');

program
	.version('0.0.1')
	.option('-x, --compress', 'Compress output by removing some whitespaces.')
	.parse(process.argv);

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
			console.log('Adding %s to watch list.', toWatch);
			fs.watch(toWatch, function(event) {
				console.log('%s modified', toWatch);
				//compile(toWatch);
			});
		}
	});
}

search(process.cwd());
//compile('style.less');