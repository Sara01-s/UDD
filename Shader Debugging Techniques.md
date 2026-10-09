**Herman**  
**Sara**

|  | Words | Visuals |
| :---- | :---- | :---- |
| **H** Super brief intro | Hi  Thank you for coming to our talk \- I am Herman Tulleken from gamelogic, and this is my colleague Sara San Martín, an independent graphics programmer.  This talk is a mix of English and Spanish \- after the talk we will make a transcript available in both languages so if you miss something, you will be able to catch it later.  |  |
| **S** Motivation 	Difficulties of shader debugging 		No logging 		No unit tests 		No breakpoints (without special tools) | Imaginemos que estamos desarrollando un *shader*, lo ideal sería que funcione a la primera, sin embargo ese no suele ser el caso. Probablemente nos encontremos con un error gráfico y nos tocará *debuggear*. El problema es que al contrario de la CPU, en *shaders* no tenemos **logs**, **test unitarios** o **breakpoints** (sin herramientas externas) que nos ayuden a diagnosticar el problema. Es por eso que  durante esta charla veremos distintas técnicas para poder depurar *shaders*. | **Diapositiva:** Mostrar código de un *diffuse lighting* **Diapositiva:** el error de tener la dirección de la luz en un *uniform* no *bindeada*. Mostrar expectativa vs realidad (pantalla u objeto en negro) **Diapositiva:** Galería de 4 errores gráficos comunes: Pantalla negra, NaNs, normales en view, uv estiradas. **Diapositiva:** Herramientas de CPU: logs, tests, breakpoints. **Diapositiva:** “return float4(rgb)” como herramienta de *debug* de los *shaders* (conecta con los próximos ejemplos de *Encoding*) |
| **H** Encodings 	Size as color, bar 	Vector as color,  Angle as lightness | Usually, there is no simple way to examine the value of a variable. Therefore, it is common to encode values in a way that can be displayed.  | Complex compound example  |
|  | Sometimes it is ok to display the value per pixel (either of the screen or the triangle mesh) For post processes, you may want to limit it to a specific part of the screen so you can see the effect or display more than one value.  In more complex setups, you may even want to render the debug info to a texture so you can examine it independently.  | Splitscreen: Full screen example / code Splitscreen: Example with debug color in square / code (outline example) Show render graph example with rendering to texture from a tap  |
|  | There are several common encoding strategies Float as colors Black and white is easy and fine for many purposes, but better color maps exist, for example Viridis or Turbo for better discrimination.  Cosine formulas ([https\://iquilezles.org/articles/palettes/](https://iquilezles.org/articles/palettes/)) Float as bars or dials 2D Vectors as color RG HL Bilinear interpolation Angles \- cyclical is better 3D Vectors as color  Discrete values  \- pallete \- hashing \- golden ratio trick Rendering actual digits [https\://www\.shadertoy.com/view/4sBSWW](https://www.shadertoy.com/view/4sBSWW)  **In Shader Graph** [https\://gist.github.com/aras-p/657a4947bb8a4549fda53a84bb91fb25](https://gist.github.com/aras-p/657a4947bb8a4549fda53a84bb91fb25)  | Splitscreen: float as color / code Splitscreen: float as bar / code Splitscreen: float as dial / code Splitscreen: vector as color RG normalized / code Splitscreen: vector as color RG abs / code Splitscreen: vector as angle and magnitude (K/RG) / code Splitscreen: vector normalized / code Splitscreen: vector abs / code Split screen: palette for digits / code Split screen: hashed IDs / code Split screen: goldenratio IDs / 2 Split screen: goldenratio IDs / 3 Split screen: goldenratio IDs / 4 Split screen: goldenratio IDs / 5 SplitScreen: Render of digits / Code SplitScreen: Render of digits in Shader Graph / Code |
| **S** Flow control First return solid color to test pipeline Early return 	Return colors for branches Debug views with defines  | Una cosa importante antes de seguir, es que siempre debemos estar seguros que la *pipeline* de renderizado está funcionando, para no cambiar código de GPU cuando el problema está en la CPU. Para eso podemos devolver un color plano para al menos saber que el retorno del shader está llegando. Pero ese retorno puede ser usado en otras ocasiones, por ejemplo dentro de un if como *early return* para saber que el código llega hasta allí. También podemos poner colores por ramas para saber cual se ejecuta. Por último podemos usar las definiciones de preprocesador con “pragma” para habilitar y deshabilitar secciones completas de código.  | **Diapositiva:** Mostrar un return float4(1,0,01) para asegurarse de que el shader funciona. **Diapositiva:** Uso de un return para saber que el código “pasó por aquí”. **Diapositiva:** Tres return float4(...) en distintas ramas: If (true), elseif(...) else (...). En un diffuse por ejemplo. **Diapositiva:** Uso preprocesador con \#define e \#if para ver texturas intermedias. Uso de \#shader\_feature\_local con KeywordEnum.  |
| **S** View modes Lerp Channels Parametrize | También podemos hacer uso de la función lerp para ver un antes y después de la imagen con un parámetro de intensidad del 0 al 1\. Ver la imágen por colores RGBA y hacer swizzling para ver floats como color por ejemplo. La idea es parametrizar lo más posible para entender cómo se comporta cada parte del código, luego estos parámetros pueden ser removidos. | **Diapositiva:** Antes y después con un Lerp. **Diapositiva:** Depth vista como color con depth.rrr **Diapositiva:** Muchos parámetros en un box blur por ejemplo (puede ser otro efecto) |
| Exaggerate  	Blur 	Scale 	Exp / Log | Otra cosa que podemos hacer para depurar es exagerar los efectos que estamos aplicando, como ponerles un blur muy fuerte para descubrir artefactos o escalar números para ver cómo se comportan en casos extremos. Finalmente podemos usar exp y log para visualizar versiones atenuadas de nuestro efecto. | **Diapositiva:** el mismo blur con radio 2 vs radio 40  **Diapositiva:** normal map con strength \* 10 para ver si está hundido o elevado. **Diapositiva:** log2(color \+ 1\) para detectar zonas brillantes de un HDR sobresaturado. |
| Animation and time                  Using time (sintime, \_Time.x/y/z/w, etc…) Using decay Motion vectors Slow down | Using static values often hide issues, so seeing how a shader behaves with a spread of values is very valuable. For example, you may not know where is a good place is for a threshold, or how the shader behaves in extremes.  The simplest way is to allow the user to change the value in the inspector or with in-game UI.  In some cases you may not have your hands free to adjust the slider \- in which case you can animate it using the time variable instead.   | **Splitscreen:** almost all black, threshold code.  **Animation:** threshold slides so the right threshold becomes visible.  **Split screen:** same animation ^, code.  |
| H Debug images for textures, maps, scene Using grids to view transforms 	Gradients \- color brands 	Arrows \- directions 	Isolate cause | A very useful strategy is to use especially designed debug images to make it easier to see what is going on.  An example you may know well is these UV map grids that make it easy to see the UV mapping of a mesh. It is also useful to have tools that can toggle debug textures at runtime. Gradients are also super useful, and morover can be computed. Besides using debug images for textures, you can also use it for fullscreen effects to replace the scene. For example, in a quantization filter, you can use gradients to see whether the bands are evenly spaced.  The general idea is to use a texture where it is easy to understand how it \_should\_ look under the transformations at hand.  For example, to see that a separated max filter works correctly, you can use a white point on black background \- the result should look like your kernel. To see that each channel is correct, you can use a red, green and blue point.  To test correct color transformations, use a grid of colors that includes primaries, secondaries, and a variety of tertiary colors.  A polar grid is useful for checking directional effects \- for example, the vertical and horizontal passes of a separable blur.  Using debug shapes is also useful to see rendering artefacts: Primitives: Cube, Sphere, Pyramid, Donut Thin cylinders Plants High-detail (character) Special shape for outlines   | Scene with UV Map textures Scene with UV gradients. Splitscreen: gradient / quantized gradient Splitscreen: gradient / dithering gradient Splitscreen: gradient / hatching Splitscreen: HLS map / quantized Splitscreen: HLS map/ dithering gradient Splitscreen: HLS map/ dithering gradient Splitscreen: Point / max Splitscreen: RGBW points / max Splitscreen: colorgrid / hullmap transformed Splitscreen: colorgrid / tri-tone map transformed  Splitscreen \- blur  Scene with special shapes and dithering plus outline effect Scene with special outline shapes.   |
|  |  |  |
|  |  |  |
|  |  |  |
| **H** Tools 	~~Safe operations~~ Rendergraph / Frame Debugger  	Renderdoc 	Git [https\://graphtoy.com/](https://graphtoy.com/)  | In complex setups, the final render may involve several passes and multiple shaders. In this case you want to see that the right things happen, and in the right order. Unity’s frame debugger is the tool for this. It allows you to see the output of different passes, and the different maps that serve as input for shaders, such as the shadow map.  You can also use renderdoc to examine values line by line in a shader.  It is very useful to plot the equations you use in your shaders. This makes it easy to visualize what the math does, and to check your assumptions.  Occasionally, it is useful to plot the graph directly in a shader itself.  | Multipass render in frame debugger Shadow map  Renderdoc example Splitscreen Graph / Equation Splitscreen Graph / Equation Splitscreen Graph / Shader code |
| **S** Coding tricks Use constants instead of uniforms 		Use hot reload and change in code (while running) Use fixed colors / gradients instead textures to test first  Using deterministic sine waves with the same frequency as noise during development.  | Ahora antes de terminar, quisiera dar unas trucos rápidos para hacer más fácil el desarrollo de shaders y ahorrar algo de tiempo: Usa constantes antes que *uniforms*. Agregar un *uniform* a la pipeline es costoso en tiempo e implica también modificar la parte de CPU. Puedes aprovechar el *hot reloading* para cambiar la variable o el tiempo como vimos antes. Usar colores fijos, gradientes o texturas de debug como las de mapas UV, para primero *testear* que el espacio y zonas objetivo están como esperas. Usar ondas sinusoidales determinísticas con la misma frecuencia que un ruido para no tener que usar una textura o algoritmo de ruido.  | **Diapositiva:** Título “Little code tricks” **Diapositiva:** código uso de constante y no uniform **Diapositiva:** código colores fijos \+ imágen **Diapositiva:** Como se ve una onda de seno determinista. |
| **H** Brief Outro Thank you My YoutTube Channel My assets | Thank you for coming to our talk\! If you are interested in these topics, please take a look at my YouTube channel where I explain how to implement post effects \- especially with more tricks on how to debug issues.  You can also check out some of the post effects we sell in the Asset Store.   | Links and QR |
| **S** Brief Outro |  | Links and QR |

# **Notes**

vec3 TurboColormap(float x) {  
  const vec4 kRedVec4   \= vec4(0.13572138, 4.61539260, \-42.66032258, 132.13108234);  
  const vec4 kGreenVec4 \= vec4(0.09140261, 2.19418839, 4.84296658, \-14.18503333);  
  const vec4 kBlueVec4  \= vec4(0.10667330, 12.64194608, \-60.58204836, 110.36276771);  
  const vec2 kRedVec2   \= vec2(-152.94239396, 59.28637943);  
  const vec2 kGreenVec2 \= vec2(4.27729857, 2.82956604);  
  const vec2 kBlueVec2  \= vec2(-89.90310912, 27.34824973);

  x \= clamp(x, 0.0, 1.0);  
  vec4 v4 \= vec4(1.0, x, x \* x, x \* x \* x);  
  vec2 v2 \= v4.zw \* v4.z;   // (x^4, x^5)  
  return vec3(  
    dot(v4, kRedVec4)   \+ dot(v2, kRedVec2),  
    dot(v4, kGreenVec4) \+ dot(v2, kGreenVec2),  
    dot(v4, kBlueVec4)  \+ dot(v2, kBlueVec2));  
}

vec3 viridis(float t) {  
  const vec3 c0 \= vec3(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);  
  const vec3 c1 \= vec3(0.1050930431085774, 1.404613529898575, 1.384590162594685);  
  const vec3 c2 \= vec3(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);  
  const vec3 c3 \= vec3(-4.634230498983486, \-5.799100973351585, \-19.33244095627987);  
  const vec3 c4 \= vec3(6.228269936347081, 14.17993336680509, 56.69055260068105);  
  const vec3 c5 \= vec3(4.776384997670288, \-13.74514537774601, \-65.35303263337234);  
  const vec3 c6 \= vec3(-5.435455855934631, 4.645852612178535, 26.3124352495832);  
  t \= clamp(t, 0.0, 1.0);  
  return c0 \+ t\*(c1 \+ t\*(c2 \+ t\*(c3 \+ t\*(c4 \+ t\*(c5 \+ t\*c6)))));  
}

**If the 2D value is a direction \+ magnitude (vector field)**

* **Angle → hue, magnitude → brightness (HSV):** cheapest and most common, but the wheel looks uneven in perceived brightness.  
* **Angle → hue, magnitude → saturation:** zero vectors fade to white instead of black.  
* **Perceptual wheel (OKLab/OKLCH):** angle walks a circle in the a/b plane, magnitude drives lightness. Better looking, more code.  
* **Cosine palette (Inigo Quilez):** one-line cyclic palette for the angle, multiplied by magnitude.  
* **Arrow glyphs / quiver:** draw arrows per cell, colored by magnitude. Usually the clearest for reading direction.  
* **LIC / streamlines:** best for dense flow fields.

**If the two components are independent scalars**

* **Bivariate corner blend:** four colors at the corners of the unit square, bilinearly interpolated.  
* **2D LUT texture:** bake a palette offline and sample it with `texture(lut, uv)`. Easy to swap palettes.  
* **Two-hue blend:** one variable ramps white → color A, the other white → color B, then combine.  
* **Hue \+ lightness:** one variable picks hue, the other sets lightness.  
* **Two side-by-side maps:** each scalar gets its own viridis/turbo map.

**If the 3D value is a direction (unit vector, normal)**

* **Direct XYZ → RGB:** `color = v * 0.5 + 0.5`. This is the classic normal-map look. It's cheap and widely understood, but axes aren't perceptually uniform and you can't read magnitude.  
* **Spherical angles → hue \+ lightness:** azimuth (`atan(y, x)`) maps to hue, elevation (`asin(z)`) maps to lightness. Easier to read than raw RGB, with a pole singularity at ±Z.  
* **Hemisphere/cubemap lookup:** sample a 3D direction into a cubemap or matcap texture you've painted. This gives full artistic control and no singularities.  
* **Octahedral mapping → 2D palette:** project the direction onto a 2D octahedral layout, then use any of the 2D maps (LUT, bivariate). Avoids poles and is compact.

**If the 3D value is a vector with magnitude (velocity, gradient, force)**

* **Direction → color, magnitude → brightness:** use any of the direction mappings above and multiply by normalized length.  
* **Magnitude only → viridis/turbo:** use `length(v)` with a scalar map when direction doesn't matter.  
* **Split encoding:** color shows magnitude, small glyphs (arrows or cones) show direction.  
* **Streamlines / LIC in 3D:** good for flow fields, but they get cluttered fast, so use seeds and clipping planes.

**If the three components are independent scalars**

* **Direct XYZ → RGB:** simplest, works fine when the channels are visually independent (e.g. three fields, each treated as an intensity).  
* **Perceptual space (OKLab/CIELAB):** map components to L, a, b for more even discrimination. Watch the gamut clipping.  
* **3D LUT texture:** bake a 3D color cube and sample it with `texture(lut3d, v)`. It's the standard color-grading approach and lets you control the palette fully.  
* **Dimensionality reduction first (PCA/SVD) → 3 channels:** common for high-dimensional features, and it makes the dominant variance most visible.  
* **Separate maps per component:** three small viridis panels, or one scalar map plus a selector, for when precise reading matters.

