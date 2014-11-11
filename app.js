var http = require('http');
var fs = require('fs');
var path = require('path');
var chokidar = require('chokidar');

var index = path.join(__dirname, 'index.html');
var server = http.createServer(function(req, res) {
	var stat = fs.statSync(index);
	res.writeHead(200, {
		'Content-Type': 'text/html',
		'Content-Length': stat.size
	});

	var readStream = fs.createReadStream(index);
	readStream.pipe(res);
});


var io = require('socket.io')(server);

var fileName = process.argv[2];

server.listen(3000, '0.0.0.0', function(){
	console.log("Serving " + fileName + "...");
});


io.on('connection', function(socket){
  console.log('A user connected');

  var content = fs.readFileSync(fileName, 'utf8');
  io.emit('update', content);

  var watcher = chokidar.watch(fileName, {persistent: true});
  watcher.on('change', function(path, stats) {
  	console.log('File', path, 'changed size to', stats.size);

  	content = fs.readFileSync(fileName, 'utf8');
  	io.emit('update', content);
  });

  socket.on('disconnect', function () {
  	watcher.close();
  });
});