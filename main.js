var canvas;
var device;
var meshes = [];
var camera;

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    canvas = document.querySelector("#frontBuffer");
    camera = new SoftEngine.Camera();
    device = new SoftEngine.Device(canvas);

    camera.Position = new BABYLON.Vector3(0, 0, 10);
    camera.Target = new BABYLON.Vector3(0, 0, 0);
    device.LoadJSONFileAsync("monkey.babylon", LoadJSONCompleted);
}

function LoadJSONCompleted(meshsLoaded) {
    meshes = meshsLoaded;
    // 调用 HTML5的渲染循环，相比手写 setTimeout 有优化
    requestAnimationFrame(drawingLoop);
}

// 渲染循环处理函数
function drawingLoop() {
    device.clear();
    for (var i = 0; i < meshes.length; i++) {
        // 每帧旋转一点，方便观察
        // meshes[i].Rotation.x += 0.015;
        meshes[i].Rotation.y += 0.02;
    }

    // 做不同的矩阵运算
    device.render(camera, meshes);

    // 一切就绪后，把背景 buffer 冲到前景 buffer
    device.present();

    // 每次处理完都需要调用
    requestAnimationFrame(drawingLoop);
}