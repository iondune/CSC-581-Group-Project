
///////////////////
// Configuration //
///////////////////

// var pointFileURL = 'http://equinox.iondune.net/pipelines/js/data/';
//var pointFileURL = 'http://localhost:8000/js/data/';
var pointFileURL = '/js/data/';

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
var dataSource;
var dataValues = new Array();
var currentDataSource = -1;
var dataEntries = 0; //Total number of entries in the data set
var daysInMonth = 31;

// Number of data files to load
var dataFiles = 2;
var weatherDataToDraw = new Array();
var rawWeatherData;
var seismicDataToDraw = new Array();
var rawSeismicData;

var glyphWeatherImage;
var glyphWeatherTexture;
var glyphSeismicImage;
var glyphSeismicTexture;

function init()
{
    initMap();
    initCanvas();
    initTextures();

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
      zoom: 6,
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

    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function initTextures() {
    //Weather
    glyphWeatherTexture = gl.createTexture();
    glyphWeatherImage = new Image();
    glyphWeatherImage.onload = function() { handleTextureLoaded(glyphWeatherImage, glyphWeatherTexture); }
    glyphWeatherImage.src = "img/Glyph.png";

    //Seismic
    glyphSeismicTexture = gl.createTexture();
    glyphSeismicImage = new Image();
    glyphSeismicImage.onload = function() { handleTextureLoaded(glyphSeismicImage, glyphSeismicTexture); }
    glyphSeismicImage.src = "img/Earthquake.png";
}

function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
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
    loaded.push(loadDataSource(0));
    loaded.push(loadDataSource(1));
    $.when.apply($, loaded).done(function ()
    {
        pickDataSource(1);
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

    if(index == 0)
        var url = pointFileURL + "weather500.json";
    else
        var url = pointFileURL + "seismic.json";

    $.getJSON(url, function(points)
    {
        var i;
        var index = dataEntries;
        var tempMin = Infinity;
        var tempMax = -Infinity;
        dataEntries += points.features.length;
        for(var i = 0; i < points.features.length; i++)
        {
            var pixel = LatLongToPixelXY(points.features[i].geometry.coordinates[1], points.features[i].geometry.coordinates[0]);
            var dateVal = new Date(points.features[i].properties.date);
            dataValues[index] =
            {
                //Standard
                'lon': pixel.x,
                'lat': pixel.y,
                'Day': dateVal.getDate(),
                //Weather
                'WindSpeed': points.features[i].properties.wind_speed,
                'Rainfall': points.features[i].properties.precipitation,
                'DewPoint': points.features[i].properties.dew_point,
                'Visibility': points.features[i].properties.visibility,
                'MaxWind': points.features[i].properties.max_wind_speed,
                'AtmosphericPressure': points.features[i].properties.station_pressure,
                'Temperature': points.features[i].properties.temperature,
                //Seismic
                'Magnitude': points.features[i].properties.magnitude,
                'Depth': points.features[i].properties.depth,
                'Significance': points.features[i].properties.significance,
                'AffectedStations': points.features[i].properties.affected_stations
    
            }
            if(points.features[i].properties.hasOwnProperty('temperature'))
            {
                if (points.features[i].properties.temperature > tempMax)
                    tempMax = points.features[i].properties.temperature;
                if (points.features[i].properties.temperature < tempMin)
                    tempMin = points.features[i].properties.temperature;
                dataValues[index].isWeather = true;
            }
            else
            {
                dataValues[index].isWeather = false;
            }
            index++;
        }
        //Load color temperature values
        if(tempMin != Infinity)
        {
            gl.uniform1f(gl.getUniformLocation(pointProgram, 'dataMax'), tempMax + 25);
            gl.uniform1f(gl.getUniformLocation(pointProgram, 'dataMin'), tempMin - 15);
            $("#left-key").text(tempMin);
            $("#right-key").text(tempMax);
        }
        dataSource =
        {
            'weatherLength': points.features.length,
            'weatherBuffer': gl.createBuffer(),
            'weatherSizeBuffer': gl.createBuffer(),
            'seismicLength': points.features.length,
            'seismicBuffer': gl.createBuffer(),
            'seismicSizeBuffer': gl.createBuffer()
        };
        data.resolve();
    })
    return data;
}

function pickDataSource(index)
{
    weatherDataToDraw = [];
    seismicDataToDraw = [];
    //Go through all data to find which points are valid for the chosen day
    for (var i = 0; i < dataEntries; i++) {
        if (dataValues[i].Day == index)
        {
            if(dataValues[i].isWeather == true)
                weatherDataToDraw.push(dataValues[i]);
            else
                seismicDataToDraw.push(dataValues[i]);
        }
    }

    //Put the necessary weather data into a buffer
    rawWeatherData = new Float32Array(3 * weatherDataToDraw.length);
    for(var i = 0; i < weatherDataToDraw.length; i++)
    {
        rawWeatherData[i * 3] = weatherDataToDraw[i].lon;
        rawWeatherData[i * 3 + 1] = weatherDataToDraw[i].lat;
        rawWeatherData[i * 3 + 2] = weatherDataToDraw[i].Temperature;
    }

    //Put the necessary seismic data into a buffer
    rawSeismicData = new Float32Array(3 * seismicDataToDraw.length);
    for(var i = 0; i < seismicDataToDraw.length; i++)
    {
        rawSeismicData[i * 3] = seismicDataToDraw[i].lon;
        rawSeismicData[i * 3 + 1] = seismicDataToDraw[i].lat;
    }

    dataSource.weatherLength = weatherDataToDraw.length;
    dataSource.seismicLength = seismicDataToDraw.length;
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
    canvasLayer.resizeMe();
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

    if($("#SeismicForm input[type='radio']:checked").val() != 'NoSelection')
    {
        //Seismic data drawn fixed color, size varies with value
        var sizeMin = Infinity;
        var sizeMax = -Infinity;

        for(var i = 0; i < seismicDataToDraw.length; i++)
        {
            if(seismicDataToDraw[i][$("#SeismicForm input[type='radio']:checked").val()] != null)
            {
                if (seismicDataToDraw[i][$("#SeismicForm input[type='radio']:checked").val()] > sizeMax)
                    sizeMax = seismicDataToDraw[i][$("#SeismicForm input[type='radio']:checked").val()];
                if (seismicDataToDraw[i][$("#SeismicForm input[type='radio']:checked").val()] < sizeMin)
                    sizeMin = seismicDataToDraw[i][$("#SeismicForm input[type='radio']:checked").val()];
            }
        }
        sizeMax += .01;
        var sizeData = new Float32Array(seismicDataToDraw.length);
        for(var i = 0; i < seismicDataToDraw.length; i++)
        {
            if(seismicDataToDraw[i][$("#SeismicForm input[type='radio']:checked").val()] != null)
            {
                sizeData[i] = ((seismicDataToDraw[i][$("#SeismicForm input[type='radio']:checked").val()] - sizeMin) / (sizeMax - sizeMin)) * 60 + 10;
            }
        }
        //Send position data
        gl.bindBuffer(gl.ARRAY_BUFFER, dataSource.seismicBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rawSeismicData, gl.STATIC_DRAW);
        
        var attributeLoc = gl.getAttribLocation(pointProgram, 'worldCoord');
        gl.enableVertexAttribArray(attributeLoc);
        gl.vertexAttribPointer(attributeLoc, 3, gl.FLOAT, false, 0, 0);

        //Send size data
        gl.bindBuffer(gl.ARRAY_BUFFER, dataSource.seismicSizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeData, gl.STATIC_DRAW);

        //Tell the shader its drawing seismic data
        gl.uniform1i(gl.getUniformLocation(pointProgram, 'weatherDraw'), 0);

        //Set up GL stuff
        var attributeLoc = gl.getAttribLocation(pointProgram, 'aPointSize');
        gl.enableVertexAttribArray(attributeLoc);
        gl.vertexAttribPointer(attributeLoc, 1, gl.FLOAT, false, 0, 0);

        var mapMatrix = new Float32Array(16);
        mapMatrix.set(pixelsToWebGLMatrix);

        var scale = Math.pow(2, map.zoom);
        scaleMatrix(mapMatrix, scale, scale);

        var mapProjection = map.getProjection();
        var offset = mapProjection.fromLatLngToPoint(canvasLayer.getTopLeft());
        translateMatrix(mapMatrix, -offset.x, -offset.y);

        var matrixLoc = gl.getUniformLocation(pointProgram, 'mapMatrix');
        gl.uniformMatrix4fv(matrixLoc, false, mapMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glyphSeismicTexture);
        var samplerLoc = gl.getUniformLocation(pointProgram, 'sampler');
        gl.uniform1i(samplerLoc, 0);

        gl.drawArrays(gl.POINTS, 0, dataSource.seismicLength);
    }
    if($("#WeatherForm input[type='radio']:checked").val() != "NoSelection")
    {
        var sizeMin = Infinity;
        var sizeMax = -Infinity;
        //Color represents temperature, size changes with value

        for(var i = 0; i < weatherDataToDraw.length; i++)
        {
            if(weatherDataToDraw[i][$("#WeatherForm input[type='radio']:checked").val()] != null)
            {
                if (weatherDataToDraw[i][$("#WeatherForm input[type='radio']:checked").val()] > sizeMax)
                    sizeMax = weatherDataToDraw[i][$("#WeatherForm input[type='radio']:checked").val()];
                if (weatherDataToDraw[i][$("#WeatherForm input[type='radio']:checked").val()] < sizeMin)
                    sizeMin = weatherDataToDraw[i][$("#WeatherForm input[type='radio']:checked").val()];
            }
        }

        sizeMax += .01;
        var sizeData = new Float32Array(weatherDataToDraw.length);
        for(var i = 0; i < weatherDataToDraw.length; i++)
        {
            if(weatherDataToDraw[i][$("#WeatherForm input[type='radio']:checked").val()] != null)
                sizeData[i] = ((weatherDataToDraw[i][$("#WeatherForm input[type='radio']:checked").val()] - sizeMin) / (sizeMax - sizeMin)) * 40 + 10;
        }

        //Send position data
        gl.bindBuffer(gl.ARRAY_BUFFER, dataSource.weatherBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rawWeatherData, gl.STATIC_DRAW);
        var attributeLoc = gl.getAttribLocation(pointProgram, 'worldCoord');
        gl.enableVertexAttribArray(attributeLoc);
        gl.vertexAttribPointer(attributeLoc, 3, gl.FLOAT, false, 0, 0);

        //Send size data
        gl.bindBuffer(gl.ARRAY_BUFFER, dataSource.weatherSizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeData, gl.STATIC_DRAW);

        //Tell the shader it's drawing weather data
        gl.uniform1i(gl.getUniformLocation(pointProgram, 'weatherDraw'), 1);

        //Set up GL stuff
        var attributeLoc = gl.getAttribLocation(pointProgram, 'aPointSize');
        gl.enableVertexAttribArray(attributeLoc);
        gl.vertexAttribPointer(attributeLoc, 1, gl.FLOAT, false, 0, 0);

        var mapMatrix = new Float32Array(16);
        mapMatrix.set(pixelsToWebGLMatrix);

        var scale = Math.pow(2, map.zoom);
        scaleMatrix(mapMatrix, scale, scale);

        var mapProjection = map.getProjection();
        var offset = mapProjection.fromLatLngToPoint(canvasLayer.getTopLeft());
        translateMatrix(mapMatrix, -offset.x, -offset.y);

        var matrixLoc = gl.getUniformLocation(pointProgram, 'mapMatrix');
        gl.uniformMatrix4fv(matrixLoc, false, mapMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glyphWeatherTexture);
        var samplerLoc = gl.getUniformLocation(pointProgram, 'sampler');
        gl.uniform1i(samplerLoc, 0);

        gl.drawArrays(gl.POINTS, 0, dataSource.weatherLength);
    }   
}

$(function()
{
    init().done(function ()
    {
        console.debug("Initializing slider...");
        currentDataSource = 1;
        update();
        function refresh(event, ui)
        {
            time = ui.value;
            $("#query").text(time);
            pickDataSource(time);
            update();
        }

        //setInterval(update, 15);

        $("#slider").slider({
            slide: refresh,
            min: 1,
            max: daysInMonth,
            step: 1,
            value: 1
        });
    });
});
