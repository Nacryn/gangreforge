// SETUP

var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
//var iostream = require('socket.io-stream');
var path = require('path');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// TODO: implement DB saving/loading
//var db_connection = require('./database');
//db_connection.connect(...);


// actual 'game' logic
var entity_module_api = require('./entitymoduleapi');
var entity_module_builder = require('./entitymodulebuilder')(entity_module_api);
var environment = require('./environment')(entity_module_builder);
entity_module_api.environment = environment;
//entity_module_api.iostream = iostream;

// registering modules!
require('./modules_list')(entity_module_builder);


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

	// create an entity in the environment
	var id = "client"+socket.id;
	environment.createNewEntity(id);
	environment.attachModuleToEntity(id, "appearance");
	environment.attachModuleToEntity(id, "client").socket = socket;

	socket.on('disconnect', function() {
		console.log('user '+socket.id+' disconnected');
		environment.deleteEntity("client"+socket.id);
	});

	socket.on('dispatch_message', function(msg) {

		console.log('received a message to dispatch: '+msg.name);
		//console.dir(msg);
		msg.data.socket = socket;

		if(msg.entity_id) {
			environment.dispatchMessageToEntity(msg.entity_id, msg.name, msg.data);
		} else {
			environment.dispatchMessage(msg.name, msg.data);
		}
	});

	socket.on('request_inspector_panel', function(msg) {

		// send general panel structure
		var modules = environment.getModulesList(msg.entity_id);
		var structure = [];
		for(var i=0; i<modules.length; i++) {
			structure[i] = {
				rank: modules[i].rank,
				name: modules[i].name,
				description: entity_module_builder.getDescription(modules[i].name)
			};
		}
		socket.emit('inspector_panel_structure', structure);
		
		// ask for individual blocks
		msg.data = { socket: socket };
		environment.dispatchMessageToEntity(msg.entity_id, "inspector_panel", msg.data);
	});

});


// SERVER LAUNCH

var server = http.listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('listening on %s:%s', host, port);

  environment.init();
  environment.update();
});