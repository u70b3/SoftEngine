var canvas;
var device;
var mesh;
var meshes = [];
var camera;

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    canvas = document.querySelector("#frontBuffer");
    mesh = new SoftEngine.Mesh("Cube", 8);
    meshes.push(mesh);
    camera = new SoftEngine.Camera();
    device = new SoftEngine.Device(canvas);

    mesh.Vertices[0] = new BABYLON.Vector3(-1, 1, 1);
    mesh.Vertices[1] = new BABYLON.Vector3(1, 1, 1);
    mesh.Vertices[2] = new BABYLON.Vector3(-1, -1, 1);
    mesh.Vertices[3] = new BABYLON.Vector3(-1, -1, -1);
    mesh.Vertices[4] = new BABYLON.Vector3(-1, 1, -1);
    mesh.Vertices[5] = new BABYLON.Vector3(1, 1, -1);
    mesh.Vertices[6] = new BABYLON.Vector3(1, -1, 1);
    mesh.Vertices[7] = new BABYLON.Vector3(1, -1, -1);

    camera.Position = new BABYLON.Vector3(0, 0, 15);
    camera.Target = new BABYLON.Vector3(0, 0, 0);

    // Calling the HTML5 rendering loop
    requestAnimationFrame(drawingLoop);
}

// Rendering loop handler
function drawingLoop() {
    device.clear();

    // rotating slightly the cube during each frame rendered
    mesh.Rotation.x += 0.015;
    mesh.Rotation.y += 0.015;

    // Doing the various matrix operations
    device.render(camera, meshes);
    // Flushing the back buffer into the front buffer
    device.present();

    // Calling the HTML5 rendering loop recursively
    requestAnimationFrame(drawingLoop);
}
