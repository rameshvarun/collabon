// Command-line Arguments
var program = require('commander');
program
  .option('-p, --port [port]', 'The port to host on. [3000]', 3000)
  .option('-f, --file [file]', 'File or directory to server. ["./"]', "./")
  .parse(process.argv)

var http = require('http');
var fs = require('fs');
var path = require('path');
var chokidar = require('chokidar');
var handlebars = require('handlebars');

// Load templates
var filepage = handlebars.compile(fs.readFileSync(path.join(__dirname, 'file.html'), 'utf-8'));
var dirpage = handlebars.compile(fs.readFileSync(path.join(__dirname, 'dir.html'), 'utf-8'));

var server = http.createServer(function(req, res) {
	var filename = (req.url == "/") ? program.file : path.join(program.file, req.url);

	if(!fs.existsSync(filename)) {
		res.writeHead(404, {
			'Content-Type': 'text/html'
		});
		res.end("Could not find file " + filename);
		return;
	}

	var stat = fs.statSync(filename);

	var content = "";
	if(stat.isFile()) {
		content = filepage({
			filename : filename
		});
	} else {
		var filenames = fs.readdirSync(filename);
		var files = [];
		for(var i = 0; i < filenames.length; ++i) {
			files.push({
				name : filenames[i],
				path : path.join(filename, filenames[i])
			});
		}
		content = dirpage({
			filename : filename,
			files : files
		});
	}

	res.writeHead(200, {
		'Content-Type': 'text/html',
		'Content-Length': content.length
	});
	res.end(content);
});


var io = require('socket.io')(server);

server.listen(program.port, '0.0.0.0', function(){
	console.log("Serving " + program.file + "...");
});


io.on('connection', function(socket){
  console.log('A user connected');

  var filename = null;
  var watcher = null;

  var sendFile = function() {
  	var content = fs.readFileSync(filename, 'utf8');
  	io.emit('update', content);
  }

  socket.on('register', function (msg) {
  	filename = msg;
  	console.log("A user is watching " + filename + "...");

  	var watcher = chokidar.watch(filename, {persistent: true});

	watcher.on('change', function(path, stats) {
		console.log(filename + " updated...", stats.size);
		sendFile();
	});
	sendFile();
  });

  socket.on('disconnect', function () {
  	if(watcher != null)
  		watcher.close();
  });
});