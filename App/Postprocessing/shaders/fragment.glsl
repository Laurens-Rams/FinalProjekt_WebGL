uniform sampler2D uPrevInput;

varying vec2 vUv;

void main(){
  vec3 finalColor = texture2D(uPrevInput, vUv).rgb;
  gl_FragColor = vec4(finalColor, 1.0);
}