// Preload: disable requestFullscreen in Electron.
// The player overlay is already position:fixed covering the viewport.
// Calling requestFullscreen triggers a GPU compositor layer swap causing black video.
window.addEventListener('DOMContentLoaded', () => {
  Element.prototype.requestFullscreen = function () {
    return Promise.resolve()
  }
  document.exitFullscreen = function () {
    return Promise.resolve()
  }
})
