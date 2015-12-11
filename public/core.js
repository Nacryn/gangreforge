var canvas = document.getElementById("game_canvas");
var engine;
var scene;
var camera;
var time;
var geometry_handler;

// window events

window.onload = function() {

	// scene
	initScene();

};

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

	// geometry handler
	geometry_handler = new GeometryHandler();

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
	time += engine.getDeltaTime()*0.001;

	// refresh the whole geometry
	geometry_handler.update();

	// check what's under the cursor
	// temp: should not be handled that way
	var pickResult = scene.pick(scene.pointerX, scene.pointerY, function(mesh) {
		if(mesh.isPickable) { return true; }
	});
	if(pickResult.hit) {
		/*
		if(pickResult.pickedMesh.entity_id) {
			this.dispatchMessageToEntity(
				pickResult.pickedMesh.entity_id, "hover_entity",
				{ click_position: pickResult.pickedPoint }
			);
		}
		*/
	}

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
		// note: this goes through the worker
		if(pickResult.pickedMesh.entity_id) {
			worker.postMessage({
				type: 'dispatch_message',
				name: 'click_entity',
				entity_id: pickResult.pickedMesh.entity_id,
				data: { click_position: [
					pickResult.pickedPoint.x,  // we send the clicked point in the entity local space
					pickResult.pickedPoint.y,
					pickResult.pickedPoint.z
				] }  
			});
		}

		// no entity associated: we send a click_world event with the clicked point in global space
		else {
			worker.postMessage({
				type: 'dispatch_message',
				name: 'click_world',
				data: { click_position: [
					pickResult.pickedPoint.x,
					pickResult.pickedPoint.y,
					pickResult.pickedPoint.z
				] }
			});      
		}

	}

	/*
	if(pickResult.hit) {

		if(pickResult.pickedMesh.entity_id) {
			environment.dispatchMessageToEntity(
				pickResult.pickedMesh.entity_id, "click_entity",
				{ click_position: pickResult.pickedPoint }
			)
		} else {
			EntityModuleAPI.hideEntityPanel();
		}

		if(pickResult.pickedMesh.name == "ground_plane") {
			environment.dispatchMessage("click_ground", { click_position: pickResult.pickedPoint });
		}
	}
	*/
}


// INTERFACE WITH WORKER

var worker = new Worker("worker.js");

worker.onmessage = function(msg) {
	//console.dir(msg);

	if(msg.data.type == "geometry_block") {
		geometry_handler.injectGeometryBlock(msg.data.block);
	} else if(msg.data.type == "entity_states") {
		var i;
		for(i=0; i<msg.data.entity_states.length; i++) {
			geometry_handler.addEntityState(
				msg.data.entity_states[i].entity_id,
				msg.data.entity_states[i].state.position,
				msg.data.entity_states[i].state.target_position,
				msg.data.entity_states[i].state.speed
			);
		}
	}
};


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