# MMM-MPlayer
A MagicMirror module that uses MPlayer to display rtsp streams

## Project Status
This module is still under development.<br>
It might not work, can show incorrect results, etc.

## Installation of mplayer
### Verify if mplayer is already installed
```shell
$ which mplayer
/usr/bin/mplayer
```
### Install mplayer (when not installed yet)

```shell
$ sudo apt install -y mplayer
```

## Installation of the MM module
1. In your terminal, change to your Magic Mirror module directory `cd ~/MagicMirror/modules`

2. Clone this repository `git clone https://github.com/evroom/MMM-MPlayer`

3. Make changes to your `config.js` file.
### Config Example
Edit the file `~/MagicMirror/config/config.js` to add or modify the module.
```javascript
{
	module: 'MMM-MPlayer',
        disabled: false,
        position: "top_left",
        header: "MPlayer",
	config: {
	  useTwoWindows: true,
	  layout: 'row',
	  windowSize: { width: 525, height: 295 },
	  windowPosition: { x: 12, y: 575 },
	  streamInterval: 30000,
	  streams: {
		window1: [
		  'something_else.mp4',
		  'something.mp4'
		],
		window2: [
		  'rtsp://foo',
		  'rtsp://bar',
		]
	  }
	}
},
```
## Configuration Options 
###
| Option | Description | Default |
| ------------- | ------------- | ------------- |
| `useTwoWindows`  | Use two windows | true |
| `layout`  | Can be 'row' or 'column' | row |
| `windowSize`  | Window size for both windows | { width: 525, height: 295 } |
| `windowPosition`  | Position of the first window (window1)<br>[window2 is either 5px below or to the right of this window, depending on layout] | { x: 12, y: 575 } |
| `streamInterval`  |  | 30000 |
| `streams`  | window1 and / or window2 streams [ mp4 , rtsp ]  |  |

## Test environment
This procedure has been tested on:

- Raspberry Pi 4 Model B Rev 1.5
- Debian GNU/Linux 12 (bookworm)
- Magic Mirror version: 2.30.0

## Contributions
Initial code provided by user 'myfingersarecold'.<br>
https://forum.magicmirror.builders/user/myfingersarecold
