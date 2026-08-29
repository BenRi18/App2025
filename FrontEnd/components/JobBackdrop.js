// FrontEnd/components/JobBackdrop.js
// Renders a backdrop: a deep colour field with the profession's icon tiled
// across it at low opacity, and a base strip in the accent colour.
//
// The motif is deliberately quiet (8% opacity, rotated, oversized) so it reads
// as texture rather than clip-art, and never competes with the job title.
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBackdrop } from "../constants/backdrops";

const TILE = 52;      // spacing between motif glyphs
const GLYPH = 30;     // glyph size
const OPACITY = 0.08;

export default function JobBackdrop({ backdropId, width = 400, height = 150, children, style }) {
  const bd = getBackdrop(backdropId);

  // Build the tile grid once per size/backdrop
  const tiles = useMemo(() => {
    const cols = Math.ceil(width / TILE) + 1;
    const rows = Math.ceil(height / TILE) + 1;
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          key: `${r}-${c}`,
          // offset every other row so the grid doesn't read as a rigid lattice
          left: c * TILE + (r % 2 ? TILE / 2 : 0) - GLYPH / 2,
          top:  r * TILE - GLYPH / 2,
        });
      }
    }
    return out;
  }, [width, height, backdropId]);

  return (
    <View style={[styles.wrap, { backgroundColor: bd.bg }, style]}>
      {/* Motif layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {tiles.map(t => (
          <Ionicons
            key={t.key}
            name={bd.icon}
            size={GLYPH}
            color={bd.ink}
            style={{
              position: "absolute",
              left: t.left,
              top: t.top,
              opacity: OPACITY,
              transform: [{ rotate: "-18deg" }],
            }}
          />
        ))}
      </View>

      {/* Content sits above the motif */}
      {children}

      {/* Accent base strip — the horizon line, carried over from the card */}
      <View style={[styles.strip, { backgroundColor: bd.accent }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { overflow: "hidden", justifyContent: "flex-start" },
  strip: { position: "absolute", left: 0, right: 0, bottom: 0, height: 12 },
});
