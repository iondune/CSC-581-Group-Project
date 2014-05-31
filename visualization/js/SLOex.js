
///////////////////
// Configuration //
///////////////////

//var pointFileURL = 'http://equinox.iondune.net/pipelines/js/data/';
var pointFileURL = 'http://localhost:8000/js/data/';

/////////////
// Globals //
/////////////

// Google Maps API handle
var map;

// WebGL canvas
var canvasLayer;

// WebGL context
var gl;

// WebGL program
var pointProgram;

// Maps pixel coordinates to WebGL coordinates
var pixelsToWebGLMatrix = new Float32Array(16);

// WebGL arrays for each data source
var dataSources = new Array();
var currentDataSource = -1;

//Arrow buffers
var arrowPosBuf

// Data range
var dataMax = -Infinity;
var dataMin = Infinity;

// Number of data files to load
var dataFiles = 4;

function init()
{
    initMap();
    initCanvas();
    initArrow();

    var load = $.Deferred();
    loadShaders().done(function ()
    {
        loadData().done(function ()
        {
            load.resolve();
        })
    });

    return load;
}

function initMap()
{
    var mapOptions = {
      zoom: 16,
      center: new google.maps.LatLng(35.295, -120.67),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var mapDiv = document.getElementById('map-div');
    map = new google.maps.Map(mapDiv, mapOptions);
}

function initCanvas()
{
    var canvasLayerOptions = {
      map: map,
      resizeHandler: resize,
      animate: false
    };
    canvasLayer = new CanvasLayer(canvasLayerOptions);
    gl = canvasLayer.canvas.getContext('experimental-webgl');
}

function initArrow()
{
    var vertices = [
        -.5, -.5, 0,
        .5, -.5, 0,
        -.5, .25, 0,
        .5, .25, 0,
        -.75, .25, 0,
        .75, .25, 0,
        0, .5, 0
    ];
    arrowPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, arrowPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    arrowPosBuf.itemSize = 3;
    arrowPosBuf.numItems = 7;
    console.debug("Arrow loaded");
}

function loadShaders()
{
    var shaders = $.Deferred();

    console.debug("Loading shaders...");
    ShaderLoader.load(
        function (data)
        {
            var vertexSource = data.point.vertex;
            var fragmentSource = data.point.fragment;

            var vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vertexSource);
            gl.compileShader(vertexShader);

            var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, fragmentSource);
            gl.compileShader(fragmentShader);

            pointProgram = gl.createProgram();
            gl.attachShader(pointProgram, vertexShader);
            gl.attachShader(pointProgram, fragmentShader);
            gl.linkProgram(pointProgram);

            gl.useProgram(pointProgram);
            gl.aPointSize = gl.getAttribLocation(pointProgram, "aPointSize");

            console.debug("Loaded shaders.");
            shaders.resolve();
        }
    );

    return shaders;
}

function loadData()
{
    var data = $.Deferred();

    console.debug("Loading data...");
    noty({id: 'loading', text: "Loading data from " + dataFiles + " files...", layout: 'topCenter'});

    var loaded = [];
    for (var i = 0; i < dataFiles; i++)
        loaded.push(loadDataSource(i));

    $.when.apply($, loaded).done(function ()
    {
        pickDataSource(0);
        canvasLayer.setUpdateHandler(update);
        update();

        $.noty.close('loading');
        console.debug("Loaded data.");
        data.resolve();
    });

    return data;
}

function loadDataSource(index)
{
    var data = $.Deferred();
    var url = pointFileURL + "SLOPoints" + index + ".json";

    console.debug("Loading from: " + url);
    $.getJSON(url, function(points)
    {
        var rawData = new Float32Array(3 * points.length);
        for (var i = 0; i < points.length; i++)
        {
            var pixel = LatLongToPixelXY(points[i].lat, points[i].lon);
            if(index == 0)
            {
                console.debug("Point " + i + " X: " + pixel.x + " Y: " + pixel.y);
            }
            rawData[i * 3] = pixel.x ;
            rawData[i * 3 + 1] = pixel.y;
            rawData[i * 3 + 2] = points[i].temp;

            if (points[i].temp > dataMax)
                dataMax = points[i].temp;
            if (points[i].temp < dataMin)
                dataMin = points[i].temp;
        }

        dataSources[index] =
        {
            'length': points.length,
            'buffer': gl.createBuffer()
        };
        gl.bindBuffer(gl.ARRAY_BUFFER, dataSources[index].buffer);
        gl.bufferData(gl.ARRAY_BUFFER, rawData, gl.STATIC_DRAW);
        console.debug("Resolving " + index);
        data.resolve();
    });

    return data;
}

function pickDataSource(index)
{
    console.debug("Picking data source " + index);
    console.debug("Drawing " + dataSources[index].length + " points");
    gl.bindBuffer(gl.ARRAY_BUFFER, dataSources[index].buffer);
    var attributeLoc = gl.getAttribLocation(pointProgram, 'worldCoord');
    gl.enableVertexAttribArray(attributeLoc);
    gl.vertexAttribPointer(attributeLoc, 3, gl.FLOAT, false, 0, 0);
    currentDataSource = index;
}

function resize()
{
    var width = canvasLayer.canvas.width;
    var height = canvasLayer.canvas.height;

    gl.viewport(0, 0, width, height);
    pixelsToWebGLMatrix.set([2/width, 0, 0, 0, 0, -2/height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);
}

function scaleMatrix(matrix, scaleX, scaleY)
{
    matrix[0] *= scaleX;
    matrix[1] *= scaleX;
    matrix[2] *= scaleX;
    matrix[3] *= scaleX;

    matrix[4] *= scaleY;
    matrix[5] *= scaleY;
    matrix[6] *= scaleY;
    matrix[7] *= scaleY;
}

function translateMatrix(matrix, tx, ty)
{
    matrix[12] += matrix[0]*tx + matrix[4]*ty;
    matrix[13] += matrix[1]*tx + matrix[5]*ty;
    matrix[14] += matrix[2]*tx + matrix[6]*ty;
    matrix[15] += matrix[3]*tx + matrix[7]*ty;
}

function update()
{
    if (currentDataSource == -1)
    {
        console.debug("Aborting draw, data not yet loaded.");
        return;
    }

    if (! canvasLayer.isAdded())
    {
        console.debug("Aborting draw, canvas not added yet.");
        return;
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    if($("#WeatherLayerSelector").is(':checked'))
    {
        console.debug("Drawing weather layer");
        gl.vertexAttrib1f(gl.aPointSize, Math.max(3 * map.zoom, 1.0));
        var mapMatrix = new Float32Array(16);
        mapMatrix.set(pixelsToWebGLMatrix);

        var scale = Math.pow(2, map.zoom);
        scaleMatrix(mapMatrix, scale, scale);

        var mapProjection = map.getProjection();
        var offset = mapProjection.fromLatLngToPoint(canvasLayer.getTopLeft());
        console.debug("Top left @ (" + offset.x + ", " + offset.y + ")");
        translateMatrix(mapMatrix, -offset.x, -offset.y);

        var matrixLoc = gl.getUniformLocation(pointProgram, 'mapMatrix');
        gl.uniformMatrix4fv(matrixLoc, false, mapMatrix);

        gl.uniform1f(gl.getUniformLocation(pointProgram, 'dataMax'), dataMax);
        gl.uniform1f(gl.getUniformLocation(pointProgram, 'dataMin'), dataMin);

        gl.drawArrays(gl.POINTS, 0, dataSources[currentDataSource].length);

        //Matrix to transform arrow into "world space" aka lat/long coordinates
        var modelMatrix = new Float32Array(16);
        modelMatrix.set(pixelsToWebGLMatrix);
        scaleMatrix(modelMatrix, 5, 5);
        translateMatrix(modelMatrix, 35.292394, -120.661159);
        var worldMatrixLoc = gl.getUniformLocation(pointProgram, 'modelMatrix');
        gl.uniformMatrix4fv(worldMatrixLoc, false, modelMatrix);

        //gl.bindBuffer(gl.ARRAY_BUFFER, arrowPosBuf);
        //gl.vertexAttribPointer(pointProgram.worldCoord, arrowPosBuf.itemSize, gl.FLOAT, false, 0, 0);
        //gl.drawArrays(gl.TRIANGLES, 0, arrowPosBuf.numItems);

        
    }
    if($("#SeismicLayerSelector").is(':checked'))
    {
        console.debug("Drawing seismic data");
        //Do seismic stuff here
    }
} 

$(function()
{
    init().done(function ()
    {
        console.debug("Initializing slider...");

        function refresh(event, ui)
        {
            time = ui.value;
            $("#query").text(time);
            pickDataSource(time);
            update();
        }

        $("#slider").slider({
            slide: refresh,
            min: 0,
            max: dataFiles - 1,
            step: 1,
            value: 0
        });
    });
});
