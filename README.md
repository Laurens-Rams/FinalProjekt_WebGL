# FinalProjekt_WebGL
## Overview
This WebGL application, built with Three.js, showcases interactive 3D models with custom shaders and post-processing effects. The environment is designed to be dynamic and responsive, featuring draggable and scrollable elements for an engaging user experience.

# Concept and Decisions
## Shadows
I decided not to use shadows for the character to keep the performance high. Shadows aren't crucial for this project, so I thought it would be best to keep things running smoothly.

## Camera Movement
One cool feature I added is subtle orbit camera movements to make the scene more dynamic. It adds a nice touch of liveliness.

## Model Optimization
To improve performance, I reduced the vertex count in Blender for each model. I went over the code again and again but couldn't figure out why it was acting weird. Anyway, fewer vertices mean smoother performance!

## Character Creation
I created the 3D character with Ready Player Me and made custom animations with MoveONE AI based on my own body movements. However, I encountered some texture issues during export, so for now, I'm using the basic animations from MIXAMO.

## Dragging Logic
I implemented a dragging feature for the slider, making sure it recognizes whether the user is dragging or clicking. This makes the interaction a lot more intuitive.

Hope you enjoy the project!