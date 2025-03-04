// This is a dummy notarize.js file that does nothing
// It's used to skip the notarization process
exports.default = async function notarizing(context) {
  console.log("Skipping notarization");
  return;
};
