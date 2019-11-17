var SoftEngine;
(function (SoftEngine) {
    // 摄像机类
    var Camera = (function () {
        function Camera() {
            this.Position = BABYLON.Vector3.Zero();
            this.Target = BABYLON.Vector3.Zero();
        }
        return Camera;
    })();
    SoftEngine.Camera = Camera;
    // Mesh类
    var Mesh = (function () {
        function Mesh(name, verticesCount, facesCount) {
            this.name = name;
            this.Vertices = new Array(verticesCount);
            this.Faces = new Array(facesCount);
            this.Rotation = new BABYLON.Vector3(0, 0, 0);
            this.Position = new BABYLON.Vector3(0, 0, 0);
        }
        return Mesh;
    })();
    SoftEngine.Mesh = Mesh;
    // Device类(Core)
    var Device = (function () {
        function Device(canvas) {
            // Note: 背景 buffer 大小等于在屏幕上要画的像素数
            // (width*height) * 4 (R,G,B & Alpha values)
            this.workingCanvas = canvas;
            this.workingWidth = canvas.width;
            this.workingHeight = canvas.height;
            this.workingContext = this.workingCanvas.getContext("2d");
        }
        // 使用特定颜色清理背景
        Device.prototype.clear = function () {
            // 调用 canvas 的clearRect, 默认清理为 rgba(0,0,0,0)
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            // 清理完之后得到我们的背景 buffer
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        };
        // 一切就绪，把背景 buffer 冲到前景 buffer
        Device.prototype.present = function () {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        };
        // 在屏幕 (x,y) 处设置一个像素
        Device.prototype.putPixel = function (x, y, color) {
            this.backbufferdata = this.backbuffer.data;
            // 背景 buffer 是一维数组，需要计算 index
            // Note: 位移运算是为了转 int
            var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;

            // HTML5 canvas 使用 RGBA 颜色空间
            this.backbufferdata[index] = color.r * 255;
            this.backbufferdata[index + 1] = color.g * 255;
            this.backbufferdata[index + 2] = color.b * 255;
            this.backbufferdata[index + 3] = color.a * 255;
        };
        // 使用 transformation 矩阵投影和转换 3D 坐标到 2D 
        Device.prototype.project = function (coord, transMat) {
            var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
            // 视口变换: NDC 转 2D坐标 ps: 左上角:(0,0)
            var x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
            var y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;
            return (new BABYLON.Vector2(x, y));
        };
        // drawPoint = clipping -> putPixel
        Device.prototype.drawPoint = function (point) {
            // 裁剪出屏幕可见的像素
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth &&
                point.y < this.workingHeight) {
                // 画点 rgba(1,1,0,1)
                this.putPixel(point.x, point.y, new BABYLON.Color4(1, 1, 0, 1));
            }
        };
        // 中电画线算法
        Device.prototype.drawLine = function (point0, point1) {
            var dist = point1.subtract(point0).length();

            // 两点距离小于 2 像素则返回
            if (dist < 2) {
                return;
            }

            // 找中点
            var middlePoint = point0.add((point1.subtract(point0)).scale(0.5));
            // 画中点
            this.drawPoint(middlePoint);
            // 递归
            this.drawLine(point0, middlePoint);
            this.drawLine(middlePoint, point1);
        };
        //使用 Bresenham 直线生成算法
        Device.prototype.drawBline = function (point0, point1) {
            var x0 = point0.x >> 0;
            var y0 = point0.y >> 0;
            var x1 = point1.x >> 0;
            var y1 = point1.y >> 0;
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = (x0 < x1) ? 1 : -1;
            var sy = (y0 < y1) ? 1 : -1;
            var err = dx - dy;
            while (true) {
                this.drawPoint(new BABYLON.Vector2(x0, y0));
                if ((x0 == x1) && (y0 == y1)) break;
                var e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y0 += sy;
                }
            }
        };
        // 每帧重新计算
        Device.prototype.render = function (camera, meshes) {
            // MVP
            var viewMatrix = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target, BABYLON.Vector3.Up());
            var projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(
                0.78,
                this.workingWidth / this.workingHeight,
                0.01,
                1.0
            );

            for (var index = 0; index < meshes.length; index++) {
                // current mesh to work on
                var cMesh = meshes[index];
                // 先 rotation 再 translation
                var worldMatrix =
                    BABYLON.Matrix.RotationYawPitchRoll(
                        cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z)
                    .multiply(
                        BABYLON.Matrix.Translation(
                            cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));

                var transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);

                for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                    var currentFace = cMesh.Faces[indexFaces];
                    var vertexA = cMesh.Vertices[currentFace.A];
                    var vertexB = cMesh.Vertices[currentFace.B];
                    var vertexC = cMesh.Vertices[currentFace.C];

                    var pixelA = this.project(vertexA, transformMatrix);
                    var pixelB = this.project(vertexB, transformMatrix);
                    var pixelC = this.project(vertexC, transformMatrix);

                    this.drawBline(pixelA, pixelB);
                    this.drawBline(pixelB, pixelC);
                    this.drawBline(pixelC, pixelA);
                }
            }
        };
        return Device;
    })();
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));