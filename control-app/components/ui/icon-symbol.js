import MaterialIcons from "@expo/vector-icons/MaterialIcons";
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right"
};
function IconSymbol({
  name,
  size = 24,
  color,
  style
}) {
  return /* @__PURE__ */ React.createElement(MaterialIcons, { color, size, name: MAPPING[name], style });
}
export {
  IconSymbol
};
