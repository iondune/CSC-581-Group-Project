
attribute vec4 worldCoord;
attribute float aPointSize;

uniform mat4 mapMatrix;

varying float temperature;


void main()
{
    temperature = worldCoord.z;

    gl_Position = mapMatrix * worldCoord;
    gl_PointSize = aPointSize;
}
