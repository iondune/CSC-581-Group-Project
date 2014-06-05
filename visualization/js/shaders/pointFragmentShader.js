
precision mediump float;

varying float temperature;

uniform float dataMin;
uniform float dataMax;
uniform int weatherDraw;
uniform sampler2D sampler;


void main()
{
    vec4 texColor;
    texColor = texture2D(sampler, gl_PointCoord);
    if(weatherDraw == 1)
    {
        float value = (temperature - dataMin) / (dataMax - dataMin);
        gl_FragColor = vec4(value, 0.0, 1.0 - value, 1.0) * texColor;
    }   
    else
    {
        gl_FragColor = vec4(0.195, .31, 0.43, 1.0) * texColor;
    }
}
