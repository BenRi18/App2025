// FrontEnd/components/TraitBloom.js
// A person's visual signature, generated from their own quiz answers.
//
// Eight petals, one per trait, each petal's length set by that trait's score,
// with the palette chosen by their strongest trait. Nobody picks this — it's
// earned by answering the quiz, so no two profiles look alike and the app's
// core idea (you are your personality profile) becomes visible.
//
// Drawn with plain Views (rotated, rounded) so it needs no SVG dependency.
import React from "react";
import { View, StyleSheet } from "react-native";

const TRAIT_ORDER = [
  "energy", "social", "teamwork", "routine",
  "responsibility", "creativity", "outdoors", "pressure",
];

// Palette per dominant trait — each a trio of related hues
const PALETTES = {
  energy:         ["#E76F51", "#F4A261", "#E9C46A"],
  social:         ["#D4537E", "#ED93B1", "#F4C0D1"],
  teamwork:       ["#1D9E75", "#5DCAA5", "#9FE1CB"],
  routine:        ["#4A6FA5", "#7D8FB3", "#A8BCD8"],
  responsibility: ["#0B6E72", "#3E8C9E", "#A8DADC"],
  creativity:     ["#7F77DD", "#AFA9EC", "#CECBF6"],
  outdoors:       ["#639922", "#97C459", "#C0DD97"],
  pressure:       ["#BA7517", "#EF9F27", "#FAC775"],
};

const DEFAULT_PALETTE = ["#93A6A6", "#B4B2A9", "#D3D1C7"];

/** The trait a person scores highest on — decides their palette. */
export function dominantTrait(traits) {
  if (!traits) return null;
  return Object.entries(traits)
    .filter(([k]) => TRAIT_ORDER.includes(k))
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export default function TraitBloom({ traits, size = 96, style }) {
  const centre  = size / 2;
  const maxLen  = size * 0.42;
  const minLen  = size * 0.09;
  const petalW  = Math.max(8, size * 0.115);

  const dom     = dominantTrait(traits);
  const palette = PALETTES[dom] ?? DEFAULT_PALETTE;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {TRAIT_ORDER.map((trait, i) => {
        const value = traits?.[trait] ?? 0.5;
        const len   = minLen + (maxLen - minLen) * value;
        const color = palette[i % palette.length];
        return (
          <View
            key={trait}
            pointerEvents="none"
            style={{
              position:        "absolute",
              left:            centre - petalW / 2,
              top:             centre - len,
              width:           petalW,
              height:          len,
              borderRadius:    petalW / 2,
              backgroundColor: color,
              opacity:         0.8,
              transform: [
                { translateY: len / 2 },
                { rotate: `${i * 45}deg` },
                { translateY: -len / 2 },
              ],
            }}
          />
        );
      })}
      {/* Core */}
      <View
        pointerEvents="none"
        style={{
          position:        "absolute",
          left:            centre - size * 0.075,
          top:             centre - size * 0.075,
          width:           size * 0.15,
          height:          size * 0.15,
          borderRadius:    size * 0.075,
          backgroundColor: palette[0],
        }}
      />
    </View>
  );
}

// ─── Archetype naming ─────────────────────────────────────────────────────────
// A short identity label derived from the two strongest traits. People adopt
// identity language — it gives the quiz a payoff beyond invisible ranking.
const LABELS = {
  "energy+social":            { name: "The Host",        blurb: "Thrives in a room full of people" },
  "social+energy":            { name: "The Host",        blurb: "Thrives in a room full of people" },
  "creativity+pressure":      { name: "The Improviser",  blurb: "Finds a way when the plan breaks" },
  "pressure+creativity":      { name: "The Improviser",  blurb: "Finds a way when the plan breaks" },
  "responsibility+routine":   { name: "The Anchor",      blurb: "Steady, thorough, always shows up" },
  "routine+responsibility":   { name: "The Anchor",      blurb: "Steady, thorough, always shows up" },
  "outdoors+energy":          { name: "The Field Hand",  blurb: "Happiest working outside" },
  "energy+outdoors":          { name: "The Field Hand",  blurb: "Happiest working outside" },
  "teamwork+social":          { name: "The Teammate",    blurb: "Makes the group work better" },
  "social+teamwork":          { name: "The Teammate",    blurb: "Makes the group work better" },
  "creativity+outdoors":      { name: "The Explorer",    blurb: "Drawn to new places and new problems" },
  "responsibility+pressure":  { name: "The Steady Hand", blurb: "Calm when it counts" },
  "pressure+responsibility":  { name: "The Steady Hand", blurb: "Calm when it counts" },
  "routine+teamwork":         { name: "The Craftsman",   blurb: "Does it properly, every time" },
  "teamwork+routine":         { name: "The Craftsman",   blurb: "Does it properly, every time" },
};

const SINGLE = {
  energy:         { name: "The Spark",       blurb: "Brings the pace" },
  social:         { name: "The Host",        blurb: "Thrives around people" },
  teamwork:       { name: "The Teammate",    blurb: "Makes the group work better" },
  routine:        { name: "The Craftsman",   blurb: "Does it properly, every time" },
  responsibility: { name: "The Anchor",      blurb: "Steady, thorough, always shows up" },
  creativity:     { name: "The Improviser",  blurb: "Finds a way when the plan breaks" },
  outdoors:       { name: "The Field Hand",  blurb: "Happiest working outside" },
  pressure:       { name: "The Steady Hand", blurb: "Calm when it counts" },
};

export function traitArchetype(traits) {
  if (!traits) return null;
  const ranked = Object.entries(traits)
    .filter(([k]) => TRAIT_ORDER.includes(k))
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;

  const [first, second] = ranked;
  return LABELS[`${first[0]}+${second?.[0]}`] ?? SINGLE[first[0]] ?? null;
}
