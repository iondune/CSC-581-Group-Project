
attribute vec4 worldCoord;
attribute float aPointSize;

uniform mat4 mapMatrix;
//uniform float timer;

varying float temperature;


void main()
{
    temperature = worldCoord.z;

    gl_Position = mapMatrix * worldCoord;
    float scale = 80.0;
    gl_PointSize = aPointSize;// + scale + scale * sin(timer);
}
