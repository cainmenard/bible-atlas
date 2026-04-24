// GLSL shaders for WebGL2 instanced arc rendering
// Uses triangle-strip quads for smooth, anti-aliased lines with configurable width.

export const VERTEX_SHADER = `#version 300 es
precision highp float;

// Shared geometry: parameter along the ellipse (0..1) and side offset (-1 or +1)
in float a_t;
in float a_side;

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

// Line rendering
uniform float u_lineWidth; // in CSS pixels
uniform float u_dpr;       // device pixel ratio

// Zoom-dependent alpha
uniform float u_zoomAlpha;

out vec4 v_color;
out float v_side;
out float v_axisProximity; // 0 = at axis, 1 = far from axis

void main() {
  // Fully-invisible arcs (canon filtering) are culled out of clip space.
  // Fractional a_visible values fall through and fade via alpha multiply.
  if (a_visible <= 0.001) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    v_color = vec4(0.0);
    v_side = 0.0;
    v_axisProximity = 1.0;
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
    v_side = 0.0;
    return;
  }

  float cx = (x1 + x2) / 2.0;
  float rx = (maxX - minX) / 2.0;

  float distance = abs(a_toIdx - a_fromIdx);
  float normalizedDist = distance / u_totalVerses;
  bool isForward = a_toIdx > a_fromIdx;

  float ryBase = isForward
    ? max(3.0, normalizedDist * u_maxArcHeight * 2.0)
    : max(3.0, normalizedDist * u_maxArcHeightBelow * 2.0);
  // Scale ry with sqrt(scaleX) so arcs maintain curvature at high zoom
  float ryScaled = ryBase * sqrt(u_scaleX);
  // Clamp so arcs never exceed viewport bounds
  float maxRy = isForward ? (u_axisY - 5.0) : (u_resolution.y - u_axisY - 5.0);
  float ry = min(ryScaled, maxRy);

  // Parametric ellipse: angle from 0 to PI
  float angle = a_t * 3.14159265;

  // Compute point on ellipse (in CSS pixel coords)
  float px, py;
  if (isForward) {
    px = cx + rx * cos(3.14159265 - angle);
    py = u_axisY - ry * sin(angle);
  } else {
    px = cx + rx * cos(angle);
    py = u_axisY + ry * sin(angle);
  }

  // Compute analytical tangent for normal calculation
  // Derivative of parametric ellipse with respect to angle:
  //   dx/dangle, dy/dangle
  float tx, ty;
  if (isForward) {
    // px = cx + rx * cos(PI - angle) => dx/dangle = rx * sin(PI - angle)
    // py = axisY - ry * sin(angle)   => dy/dangle = -ry * cos(angle)
    tx = rx * sin(3.14159265 - angle);
    ty = -ry * cos(angle);
  } else {
    // px = cx + rx * cos(angle) => dx/dangle = -rx * sin(angle)
    // py = axisY + ry * sin(angle) => dy/dangle = ry * cos(angle)
    tx = -rx * sin(angle);
    ty = ry * cos(angle);
  }

  // Screen-space normal (perpendicular to tangent)
  float tLen = length(vec2(tx, ty));
  vec2 normal;
  if (tLen > 0.001) {
    normal = vec2(-ty, tx) / tLen;
  } else {
    normal = vec2(0.0, 1.0);
  }

  // Offset position by half line width in screen space
  float halfWidth = u_lineWidth * 0.5;
  px += a_side * halfWidth * normal.x;
  py += a_side * halfWidth * normal.y;

  // Compute axis proximity for fade near label zone (0 = at axis, 1 = far)
  float distFromAxis = abs(py - u_axisY);
  v_axisProximity = smoothstep(0.0, 50.0, distFromAxis);

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

  // Apply zoom-dependent alpha boost and per-arc visibility fade
  alpha *= u_zoomAlpha * a_visible;

  int gi = int(a_genreIdx);
  v_color = vec4(u_genreColors[gi], alpha);
  v_side = a_side;
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_color;
in float v_side;
in float v_axisProximity;
out vec4 fragColor;

void main() {
  // Smooth edge falloff for anti-aliased line edges
  float edgeDist = abs(v_side);
  float edgeAlpha = 1.0 - smoothstep(0.5, 1.0, edgeDist);
  // Fade arcs near the axis so text labels remain readable
  float axisFade = mix(0.15, 1.0, v_axisProximity);
  // Clamp final alpha to prevent saturation from additive blending at deep zoom
  float finalAlpha = min(v_color.a * edgeAlpha * axisFade, 0.25);
  fragColor = vec4(v_color.rgb, finalAlpha);
}
`;
