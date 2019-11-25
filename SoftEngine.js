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
        Device.prototype.drawPoint = function (point, color) {
            // 裁剪出屏幕可见的像素
            if (point.x >= 0 &&
                point.y >= 0 &&
                point.x < this.workingWidth &&
                point.y < this.workingHeight) {
                // 画点 rgba(1,1,0,1)
                this.putPixel(point.x, point.y, color);
            }
        };
        // 中点画线算法
        Device.prototype.drawLine = function (point0, point1) {
            var dist = point1.subtract(point0).length();
            // 两点距离小于 2 像素则返回
            if (dist < 2) {
                return;
            }
            // 画中点
            var middlePoint = point0.add((point1.subtract(point0)).scale(0.5));
            this.drawPoint(middlePoint, new BABYLON.Color4(0, 1, 0, 1));
            // 递归
            this.drawLine(point0, middlePoint);
            this.drawLine(middlePoint, point1);
        };
        //使用 Bresenham 直线生成算法
        Device.prototype.drawBline = function (point0, point1) {
            var x0 = point0.x >> 0,
                y0 = point0.y >> 0;
            var x1 = point1.x >> 0,
                y1 = point1.y >> 0;
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = (x0 < x1) ? 1 : -1;
            var sy = (y0 < y1) ? 1 : -1;
            var err = dx - dy;
            while (true) {
                this.drawPoint(new BABYLON.Vector2(x0, y0), new BABYLON.Color4(0, 1, 0, 1));
                if ((x0 == x1) && (y0 == y1)) break;
                // 2dx-2dy
                var e2 = err << 1;
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
        Device.prototype.sample = function (point0, point1) {
            //
        }
        // 裁剪保证 0-1 的值
        Device.prototype.clamp = function (value, min, max) {
            if (typeof min === "undefined") {
                min = 0;
            }
            if (typeof max === "undefined") {
                max = 1;
            }
            return Math.max(min, Math.min(value, max));
        };
        // 两点之间插值, min->max 起始点到终点
        Device.prototype.interpolate = function (min, max, gradient) {
            return min + (max - min) * this.clamp(gradient);
        };

        // 两点从左到右画线
        // papb -> pcpd
        // pa, pb, pc, pd 必须排好序
        Device.prototype.processScanLine = function (y, pa, pb, pc, pd, color) {
            // 根据当前 y 值计算sx ex, 竖直线 gradient 处理为1
            var gradient1 = pa.y != pb.y ? (y - pa.y) / (pb.y - pa.y) : 1;
            var gradient2 = pc.y != pd.y ? (y - pc.y) / (pd.y - pc.y) : 1;

            var sx = this.interpolate(pa.x, pb.x, gradient1) >> 0;
            var ex = this.interpolate(pc.x, pd.x, gradient2) >> 0;

            // sx -> ex 画线
            for (var x = sx; x < ex; x++) {
                this.drawPoint(new BABYLON.Vector2(x, y), color);
            }
        };

        Device.prototype.drawTriangle = function (p1, p2, p3, color) {
            // 排序之后是 p1 p2 p3
            if (p1.y > p2.y) {
                var temp = p2;
                p2 = p1;
                p1 = temp;
            }
            if (p2.y > p3.y) {
                var temp = p2;
                p2 = p3;
                p3 = temp;
            }
            if (p1.y > p2.y) {
                var temp = p2;
                p2 = p1;
                p1 = temp;
            }

            // 计算 1/k 根据斜率判断是哪种情况
            var dP1P2;
            var dP1P3;

            if (p2.y - p1.y > 0) {
                dP1P2 = (p2.x - p1.x) / (p2.y - p1.y);
            } else {
                dP1P2 = 0;
            }

            if (p3.y - p1.y > 0) {
                dP1P3 = (p3.x - p1.x) / (p3.y - p1.y);
            } else {
                dP1P3 = 0;
            }
            // 第一种情况: 
            // P1
            // -
            // -- 
            // - -
            // -  -
            // -   - P2
            // -  -
            // - -
            // -
            // P3
            if (dP1P2 > dP1P3) {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    if (y < p2.y) {
                        this.processScanLine(y, p1, p3, p1, p2, color);
                    } else {
                        this.processScanLine(y, p1, p3, p2, p3, color);
                    }
                }
            }
            // 第二种情况
            //       P1
            //        -
            //       -- 
            //      - -
            //     -  -
            // P2 -   - 
            //     -  -
            //      - -
            //        -
            //       P3
            else {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    if (y < p2.y) {
                        this.processScanLine(y, p1, p2, p1, p3, color);
                    } else {
                        this.processScanLine(y, p2, p3, p1, p3, color);
                    }
                }
            }
        };
        // 每帧重新计算
        Device.prototype.render = function (camera, meshes) {
            // MVP
            var viewMatrix = BABYLON.Matrix.LookAtLH(
                camera.Position, //eye
                camera.Target, //target
                BABYLON.Vector3.Up() //up
            );
            var projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(
                0.78, //fov
                this.workingWidth / this.workingHeight, //aspect
                0.01, //znear
                1.0 //zfar
            );

            for (var index = 0; index < meshes.length; index++) {
                // current mesh to work on
                var cMesh = meshes[index];
                // 先 rotation 再 translation
                var worldMatrix =
                    BABYLON.Matrix.RotationYawPitchRoll(
                        cMesh.Rotation.y,
                        cMesh.Rotation.x,
                        cMesh.Rotation.z)
                    .multiply(
                        BABYLON.Matrix.Translation(
                            cMesh.Position.x,
                            cMesh.Position.y,
                            cMesh.Position.z)
                    );

                var transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);
                // log(`meshs[${index}]:${cMesh.Faces.length} faces`);
                for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                    var currentFace = cMesh.Faces[indexFaces];
                    var vertexA = cMesh.Vertices[currentFace.A];
                    var vertexB = cMesh.Vertices[currentFace.B];
                    var vertexC = cMesh.Vertices[currentFace.C];

                    var pixelA = this.project(vertexA, transformMatrix);
                    var pixelB = this.project(vertexB, transformMatrix);
                    var pixelC = this.project(vertexC, transformMatrix);

                    var r = 0.3 + ((indexFaces % cMesh.Faces.length) / cMesh.Faces.length)*0.6;
                    var g = 0.3 + ((indexFaces % cMesh.Faces.length) / cMesh.Faces.length)*0.6;
                    var b = 0.3 + ((indexFaces % cMesh.Faces.length) / cMesh.Faces.length)*0.6;
                    this.drawTriangle(pixelA, pixelB, pixelC, new BABYLON.Color4(r, g, b, 1));
                }
            }
        };
        // ajax 封装
        Device.prototype.LoadJSONFileAsync = function (fileName, callback) {
            var jsonObject = {};
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", fileName, true);
            var that = this;
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    jsonObject = JSON.parse(xmlhttp.responseText);
                    log('model load success');
                    callback(that.CreateMeshesFromJSON(jsonObject));
                }
            };
            xmlhttp.send(null);
        };
        Device.prototype.CreateMeshesFromJSON = function (jsonObject) {
            log(`log from CreateMeshesFromJSON function`);
            var meshes = [];
            for (var meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
                log(`meshs[${meshIndex}]:`);
                // 顶点
                var verticesArray = jsonObject.meshes[meshIndex].vertices;
                // 面
                var indicesArray = jsonObject.meshes[meshIndex].indices;

                var uvCount = jsonObject.meshes[meshIndex].uvCount;
                var verticesStep = 1;

                // 根据每个顶点的纹理坐标数量确定访问顶点数组的 step 
                switch (uvCount) {
                    case 0:
                        verticesStep = 6;
                        break;
                    case 1:
                        verticesStep = 8;
                        break;
                    case 2:
                        verticesStep = 10;
                        break;
                }

                var verticesCount = verticesArray.length / verticesStep;
                log(`vertices ${verticesCount}`);
                // 三角形数量 = 数组长度 / 3 (A, B, C)
                var facesCount = indicesArray.length / 3;
                log(`faces ${facesCount}`);
                var mesh = new SoftEngine.Mesh(
                    jsonObject.meshes[meshIndex].name,
                    verticesCount,
                    facesCount
                );
                // get vertices
                for (var index = 0; index < verticesCount; index++) {
                    var x = verticesArray[index * verticesStep];
                    var y = verticesArray[index * verticesStep + 1];
                    var z = verticesArray[index * verticesStep + 2];
                    mesh.Vertices[index] = new BABYLON.Vector3(x, y, z);
                }
                // get faces
                for (var index = 0; index < facesCount; index++) {
                    var a = indicesArray[index * 3];
                    var b = indicesArray[index * 3 + 1];
                    var c = indicesArray[index * 3 + 2];
                    mesh.Faces[index] = {
                        A: a,
                        B: b,
                        C: c
                    };
                }

                // 使用模型中的初始位置信息
                var position = jsonObject.meshes[meshIndex].position;
                mesh.Position = new BABYLON.Vector3(position[0], position[1], position[2]);
                meshes.push(mesh);
            }
            return meshes;
        };
        return Device;
    })();
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));