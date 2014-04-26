
precision mediump float;

varying float temperature;

uniform float dataMin;
uniform float dataMax;


void main()
{
    float value = (temperature - dataMin) / (dataMax - dataMin);
    gl_FragColor = vec4(value, 0.0, 1.0 - value, 0.3);
}
