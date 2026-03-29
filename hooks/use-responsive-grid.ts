import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

const H_PAD = 16;
const GAP = 12;

export function useResponsiveGrid(minColWidth = 200) {
  const [width, setWidth] = useState(Dimensions.get("window").width);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setWidth(window.width);
    });
    return () => sub.remove();
  }, []);

  const numCols = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const tileWidth = (width - H_PAD * 2 - GAP * (numCols - 1)) / numCols;

  return { width, numCols, tileWidth, H_PAD, GAP };
}
