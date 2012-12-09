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

Watch all .less files in this directory (recursive): `lessw`

Watch a single file: `lessw style.less`

Watch all .less files in a directory (recursive): `lessw styles/`

## TODO

- Compress option does nothing
- Output dir option does nothing

## License

Copyright (c) 2012 Brandon Mills.
NodeLESS is licensed under the MIT License. See LICENSE for full text.