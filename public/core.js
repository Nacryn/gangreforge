var canvas = document.getElementById("game_canvas");
var engine;
var scene;
var camera;
var time;
var delta_time;
var entities_renderer;
var socket = io();
var hovered_mesh;
var my_entity_id;


// EVENTS BINDING

// page finished loading
window.onload = function() {

	// start scene
	initScene();

	// bind command line interface
	document.getElementById("command_line_interface")
		.getElementsByTagName("input")[0]
		.addEventListener("keydown", function(e) {

		// ENTER
		if(e.keyCode == 13) {

			// send message and clear
			socket.emit('dispatch_message', {
				name: 'command_line_entered',
				entity_id: my_entity_id,
				data: {
					command: this.value
				}
			}); 
			this.value = "";

			return false;
		}

	});

};

// handle resize
window.addEventListener("resize", function() {
	if(engine) {
		engine.resize();
		resizeCamera();
	}
});


// Scene code

function initScene() {
	canvas = document.getElementById("game_canvas");
	engine = new BABYLON.Engine(canvas, true);
	time = 0;

	// click event
	canvas.addEventListener("click", function () {
		mouseClick();
	});

	// scene setup
	scene = new BABYLON.Scene(engine);
	scene.clearColor = new BABYLON.Color3(0.15, 0.15, 0.15);
	scene.beforeRender = updateLoop;

	// camera setup
	camera = new BABYLON.ArcRotateCamera("camera", 0.5, 1.1, 30, new BABYLON.Vector3(0,0,0), scene);
	camera.attachControl(canvas);
	//camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
	resizeCamera();

	// light setup
	var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.4,1,0), scene);
	light.diffuseColor = new BABYLON.Color3(1.0, 1.0, 1.0);
	light.groundColor = new BABYLON.Color3(0.2, 0.2, 0.2);

	// ground mockup for ground click detection
	var ground = BABYLON.Mesh.CreatePlane("ground_plane", 10000, scene);
	ground.rotation.x = Math.PI/2;
	ground.bakeCurrentTransformIntoVertices();
	ground.isVisible = false;

	// entities renderer
	entities_renderer = new EntitiesRenderer();

	// temp
	BABYLON.Mesh.CreateBox("box", 0.2, scene);

	// start loop
	BABYLON.Tools.QueueNewFrame(renderLoop);
}

// standard BabylonJS routine
function renderLoop() {
		engine.beginFrame();
		scene.render();
		engine.endFrame();
		BABYLON.Tools.QueueNewFrame(renderLoop);
}

// tracking app time & update local stuff
function updateLoop() {
	delta_time = engine.getDeltaTime()*0.001;
	time += delta_time;

	// refresh the meshes
	entities_renderer.update();

	// check what's under the cursor
	var pickResult = scene.pick(scene.pointerX, scene.pointerY, function(mesh) {
		if(mesh.isPickable) { return true; }
	});

	// reset previously picked mesh material
	if(hovered_mesh && hovered_mesh != pickResult.pickedMesh) {
		hovered_mesh.material = entities_renderer.default_material;
	}

	// assign new material
	if(pickResult.hit) {
		hovered_mesh = pickResult.pickedMesh;
		hovered_mesh.material = entities_renderer.hovered_material;
	} else {
		hovered_mesh = null;
	}

	//if(hovered_mesh) { console.log('hovered: '+hovered_mesh.name); }

}

// used for ortho camera mode
function resizeCamera() {
	var size = getWindowSize();
	var vertical_size = 20;
	var horizontal_size = vertical_size * size.width / size.height;
	camera.orthoTop = vertical_size/2;
	camera.orthoBottom = -vertical_size/2;
	camera.orthoLeft = -horizontal_size/2;
	camera.orthoRight = horizontal_size/2;
}

// sends back messages according to what was clicked
// TODO: rewrite to handle generic click detection
function mouseClick() {
	var pickResult = scene.pick(scene.pointerX, scene.pointerY, function(mesh) {
		if(mesh.isPickable) { return true; }
	});

	//console.log("clicked detected, mesh: "+pickResult.pickedMesh.name);

	if(pickResult.hit) {

		// if there's an entity id associated with the mesh, send back a click_entity event to the server
		if(pickResult.pickedMesh.entity_id) {

			if(pickResult.pickedMesh.click_message) {

				socket.emit('dispatch_message', {
					name: 'click_entity',
					entity_id: pickResult.pickedMesh.entity_id,
					data: {
						click_position: [
							pickResult.pickedPoint.x,  // we send the clicked point in the entity local space
							pickResult.pickedPoint.y,
							pickResult.pickedPoint.z
						],
						message: pickResult.pickedMesh.click_message
					}
				});


			} else {
				requestInspectorPanel(pickResult.pickedMesh.entity_id);
			}
			
		}

		// no entity associated: we send a click_world event (only to the client entity) with the clicked point in global space
		else {
			socket.emit('dispatch_message', {
				name: 'click_world',
				entity_id: my_entity_id,
				data: {
					click_position: [
						pickResult.pickedPoint.x,
						pickResult.pickedPoint.y,
						pickResult.pickedPoint.z
					]
				}
			});  

			hideInspectorPanel();
		}

	}
}

var displayed_entity_id = null;
function requestInspectorPanel(entity_id) {
	displayed_entity_id = entity_id;	
	socket.emit('request_inspector_panel', {
		entity_id: entity_id
	});
}
function hideInspectorPanel() {
	displayed_entity_id = null;

	var panel = document.getElementById("entity_panel");
	panel.style.display = "none";

	// delete all existing module blocks inside
	for(var i=0; i<panel.children.length; i++) {
		if(panel.children[i].className == "module_block") {
			panel.removeChild(panel.children[i]);
			i--;
		}
	}
}


// SOCKETS INTERFACE

socket.on('connect', function() {
	my_entity_id = 'client'+socket.id;
	console.log('connected! our entity: '+my_entity_id);
});

socket.on('entity_data', function(msg) {

	//console.dir(msg);
	console.log('received data for '+msg.length+' entities');

	if(!entities_renderer) { return; }

	for(var i=0; i<msg.length; i++) {
		entities_renderer.injectEntityData(msg[i].entity_id, msg[i].entity_data);
	}

});

socket.on('inspector_panel_structure', function(msg) {

	//console.dir(msg);

	// we received the inspector panel structure, let's display it
	var panel = document.getElementById("entity_panel");
	panel.style.display = "block";

	// delete all existing module blocks inside
	for(var i=0; i<panel.children.length; i++) {
		if(panel.children[i].className == "module_block") {
			panel.removeChild(panel.children[i]);
			i--;
		}
	}

	// add new blocks corresponding to the specified entity
	var newblock, child;
	for(i=0; i<msg.length; i++) {
		newblock = document.createElement("div");
		newblock.className = "module_block";
		newblock.id = "module_rank"+msg[i].rank;
		panel.appendChild(newblock);

		child = document.createElement("h1");
		child.appendChild(document.createTextNode("#"+msg[i].rank+" "+msg[i].name));
		newblock.appendChild(child);

		child = document.createElement("p");
		child.className = "description";
		child.appendChild(document.createTextNode(msg[i].description));
		newblock.appendChild(child);
	}

});

socket.on('inspector_panel_block', function(msg) {

	//console.dir(msg);

	// we received the content of a block in the inspector panel, let's display it
	var block = document.getElementById("module_rank"+msg.rank);

	if(!block) { return; }

	var type, name, content;
	var el, el2;

	// callback for input controls
	var change_value_cb = function() {
		if(!displayed_entity_id) { return; }
		var obj = {};
		obj[this.name] = this.value;
		socket.emit('dispatch_message', {
			name: 'inspector_panel_change',
			entity_id: displayed_entity_id,
			data: obj
		});
	};

	for(var i=0; i<msg.elements.length; i++) {

		type = msg.elements[i][0];
		name = msg.elements[i][1];
		content = msg.elements[i][2];

		switch(type) {

			case "text":
			el = document.createElement("p");
			el.className = "text";
			el.appendChild(document.createTextNode(content));
			break;

			case "editable_text":
			el = document.createElement("textarea");
			el.name = name;
			el.className = "text";
			el.setAttribute("rows", 10);	// todo: dynamic resize
			el.setAttribute("cols", 30);
			el.value = content;
			break;

			case "code":
			el = document.createElement("pre");
			el.name = name;
			el.className = "codeblock";
			el.appendChild(document.createTextNode(content));
			break;

			case "editable_code":
			el = document.createElement("textarea");
			el.name = name;
			el.className = "codeblock entry";
			el.setAttribute("rows", 10);	// todo: dynamic resize
			el.setAttribute("cols", 30);
			el.value = content;

			// add change listener
			el.addEventListener('keyup', change_value_cb);
			el.addEventListener('change', change_value_cb);
			break;

			case "markdown":
			break;

			case "textfield":
			el = document.createElement("p");
			el2 = document.createElement("label");
			el2.appendChild(document.createTextNode(msg.elements[i][3]));
			el.appendChild(el2);
			el2 = document.createElement("input");
			el2.type = "text";
			el2.name = name;
			el2.value = content;
			el2.className = "entry";
			el2.addEventListener('keyup', change_value_cb);
			el2.addEventListener('change', change_value_cb);
			el.appendChild(el2); 
			break;
		}

		block.appendChild(el); 

	}

});


// utils
function getWindowSize() {
	var size = {};
	var w = window, d = document, e = d.documentElement;
	size.width = w.innerWidth || e.clientWidth || g.clientWidth;
	size.height = w.innerHeight|| e.clientHeight|| g.clientHeight;
	return size;
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function interpolate(start, end, ratio) {
	return start * (1-ratio) + end * ratio;
}

function getScreenPos(worldPos) {
	var result = BABYLON.Vector3.Project(
		worldPos,
		BABYLON.Matrix.Identity(),
		scene.getTransformMatrix(),
		camera.viewport.toGlobal(engine));
	result.x = Math.floor(result.x);
	result.y = Math.floor(result.y);
	result.z = 0;
	return result;  
}

function color4ToCSS(color4) {
	return 'rgba('+Math.floor(255*color4.r)+','+Math.floor(255*color4.g)+','+Math.floor(255*color4.b)+','+color4.a+')';
}

function color3ToCSS(color3) {
	return 'rgb('+Math.floor(255*color3.r)+','+Math.floor(255*color3.g)+','+Math.floor(255*color3.b)+')';
}