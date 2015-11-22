// SETUP

var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// TODO: implement DB saving/loading
//var db_connection = require('./database');
//db_connection.connect(






// ROUTES


// try static files in the public folder when accessing the root URL
app.use(express.static(__dirname + '/public'));

// if no static file found, send 404
app.use(function(req, res, next) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Page introuvable !');
});


// SOCKETS

io.on('connection', function(socket) {

	console.log('user '+socket.id+' connected');

	socket.on('disconnect', function() {
		console.log('user '+socket.id+' disconnected');
	});

});



// SERVER LAUNCH

var server = http.listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('listening on %s:%s', host, port);
});