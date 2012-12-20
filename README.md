# NodeLESS

Watch [LESS](http://lesscss.org) stylesheets and recompile them on the fly. Usess the official [less.js](https://github.com/cloudhead/less.js) parser.

## Installation

Via command line: `npm install -g https://github.com/btmills/NodeLESS/tarball/master`

In `package.json`:
```json
{
	// ...
	"devDependencies": {
		"nodeless": "https://github.com/btmills/NodeLESS/tarball/master"
	}
}
```

## Usage

### Options

- `-h` or `--help`: Display usage information.
- `-x` or `--compress`: Compress output by removing some whitespaces.
- `-v` or `--verbose`: Output detailed log information.
- `-o` or `--output`: Output all compiled CSS to the specified directory.

### Examples

- Watch a single file: `lessw style.less`
- Watch all .less files in this directory (recursive): `lessw`
- Watch all .less files in a directory (recursive): `lessw styles/`
- Watch and compile all files in less/ to css/: `lessw -o css/ less/`
- Watch all .less files in a directory and compress the output: `lessw -x`

## TODO

- Complex dependency trees can trigger multiple recompiles of the same file
- Variables declared in master files result in false positive compilation errors in imported files

## License

Copyright (c) 2012 Brandon Mills.
NodeLESS is licensed under the MIT License. See LICENSE for full text.