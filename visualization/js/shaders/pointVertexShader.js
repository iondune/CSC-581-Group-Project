
attribute vec4 worldCoord;
attribute float aPointSize;

uniform mat4 mapMatrix;
uniform mat4 modelMatrix;

varying float temperature;


void main()
{
    temperature = worldCoord.z;

    //gl_Position = mapMatrix * modelMatrix * worldCoord;
    gl_Position = mapMatrix * worldCoord;
    gl_PointSize = aPointSize;
}
