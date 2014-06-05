
precision mediump float;

varying float temperature;

uniform float dataMin;
uniform float dataMax;
uniform int weatherDraw;
uniform sampler2D sampler;


void main()
{
    if(weatherDraw == 1)
    {
        vec4 texColor;
        texColor = texture2D(sampler, gl_PointCoord);
        float value = (temperature - dataMin) / (dataMax - dataMin);
        gl_FragColor = vec4(value, 0.0, 1.0 - value, 1.0) * texColor;
    }   
    else
    {
        gl_FragColor = vec4(0.05, 0.87, 0.2, 1.0);
    }
}
