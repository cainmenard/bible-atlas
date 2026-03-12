// GLSL shaders for WebGL2 instanced arc rendering
// Vertex shader computes ellipse geometry on the GPU; fragment shader passes through color.

export const VERTEX_SHADER = `#version 300 es
precision highp float;

// Shared geometry: parameter along the ellipse (0..1)
in float a_t;

// Per-instance attributes (one per arc)
in float a_fromIdx;
in float a_toIdx;
in float a_genreIdx;
in float a_visible;

// Transform & layout uniforms
uniform vec2 u_resolution;
uniform float u_offsetX;
uniform float u_scaleX;
uniform float u_totalVerses;
uniform float u_margin;
uniform float u_axisY;
uniform float u_maxArcHeight;
uniform float u_maxArcHeightBelow;

// Selection uniforms (-1 = no selection)
uniform float u_selStart;
uniform float u_selEnd;

// Genre colors (normalized 0-1)
uniform vec3 u_genreColors[10];

// Alpha tiers
uniform float u_alphaDefault;
uniform float u_alphaHighlight;
uniform float u_alphaDimmed;

out vec4 v_color;

void main() {
  // Discard invisible arcs (canon filtering)
  if (a_visible < 0.5) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    v_color = vec4(0.0);
    return;
  }

  float totalWidth = (u_resolution.x - u_margin * 2.0) * u_scaleX;
  float xScale = totalWidth / u_totalVerses;

  float x1 = u_margin + u_offsetX + a_fromIdx * xScale;
  float x2 = u_margin + u_offsetX + a_toIdx * xScale;

  // Viewport culling
  float minX = min(x1, x2);
  float maxX = max(x1, x2);
  if (maxX < -50.0 || minX > u_resolution.x + 50.0) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    v_color = vec4(0.0);
    return;
  }

  float cx = (x1 + x2) / 2.0;
  float rx = (maxX - minX) / 2.0;

  float distance = abs(a_toIdx - a_fromIdx);
  float normalizedDist = distance / u_totalVerses;
  bool isForward = a_toIdx > a_fromIdx;

  float ry = isForward
    ? max(3.0, normalizedDist * u_maxArcHeight * 2.0)
    : max(3.0, normalizedDist * u_maxArcHeightBelow * 2.0);

  // Parametric ellipse: angle from 0 to PI
  float angle = a_t * 3.14159265;

  float px, py;
  if (isForward) {
    // Arc above axis: sweep from PI to 0
    px = cx + rx * cos(3.14159265 - angle);
    py = u_axisY - ry * sin(angle);
  } else {
    // Arc below axis: sweep from 0 to PI
    px = cx + rx * cos(angle);
    py = u_axisY + ry * sin(angle);
  }

  // Convert to clip space
  gl_Position = vec4(
    (px / u_resolution.x) * 2.0 - 1.0,
    1.0 - (py / u_resolution.y) * 2.0,
    0.0,
    1.0
  );

  // Determine alpha tier based on selection
  float alpha;
  if (u_selStart < 0.0) {
    alpha = u_alphaDefault;
  } else {
    bool fromInSel = a_fromIdx >= u_selStart && a_fromIdx < u_selEnd;
    bool toInSel = a_toIdx >= u_selStart && a_toIdx < u_selEnd;
    alpha = (fromInSel || toInSel) ? u_alphaHighlight : u_alphaDimmed;
  }

  int gi = int(a_genreIdx);
  v_color = vec4(u_genreColors[gi], alpha);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;
