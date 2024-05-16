varying vec3 vPosition;

void main() {
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * vec4(vPosition, 1.0);
}