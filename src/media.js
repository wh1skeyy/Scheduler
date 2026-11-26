// Full-viewport media controller. One shared video element only:
// every booking type currently uses the same assets/video/priority.mp4
// (2.1 MB), so four <video> elements loaded and decoded the same file
// four times while only one was ever shown. If per-type videos are ever
// added again, set this video's src in setActive() instead of restoring
// the four layers.
const VIDEO_SRC = "assets/video/priority.mp4";
const POSTER_SRC = "assets/img/priority.jpg";
const SLOW_RATE = 0.65;
// HTMLMediaElement.HAVE_CURRENT_DATA (= 2) as a plain number, so this
// module also runs in the Node DOM shim used by tests/dom-smoke.mjs,
// where the HTMLMediaElement global does not exist.

export function createMediaController(root, onChange = () => {}) {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let active = null;
  let playing = !motionQuery.matches;

  root.innerHTML = '<div class="media-scrim" aria-hidden="true"></div>';
  const layer = document.createElement("div");
  layer.className = "media-layer is-active";
  layer.dataset.mediaType = "priority";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `
      <img class="media-image is-fallback" src="${POSTER_SRC}" alt="" loading="eager">
      <video class="media-video" muted loop autoplay playsinline preload="metadata" poster="${POSTER_SRC}" src="${VIDEO_SRC}" aria-hidden="true"></video>`;
  root.prepend(layer);
  const video = layer.querySelector("video");
  const image = layer.querySelector("img");
  // load() resets playbackRate to 1.0, so set defaultPlaybackRate as well
  // and re-apply it on loadeddata (below). Setting the src in markup
  // instead of via load() also avoids an extra reset.
  video.defaultPlaybackRate = SLOW_RATE;
  video.playbackRate = SLOW_RATE;

  video.addEventListener("loadeddata", () => {
    video.defaultPlaybackRate = SLOW_RATE;
    video.playbackRate = SLOW_RATE;
    layer.classList.add("has-video");
    layer.classList.remove("video-failed");
    if (playing) video.play().catch(() => {});
  });
  video.addEventListener("error", () => {
    layer.classList.remove("has-video");
    layer.classList.add("video-failed");
    image.classList.add("is-fallback");
  });
  image.addEventListener("error", () => layer.classList.add("image-failed"));
  image.addEventListener("load", () => layer.classList.remove("image-failed"));

  function syncPlayback() {
    root.classList.toggle("media-paused", !playing);
    if (playing) {
      if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) {
        video.play().catch(() => {});
      }
    } else {
      video.pause();
    }
    onChange({ playing, active });
  }

  function setActive(type) {
    // The video is shared, so there is no layer to switch — track the
    // type for callers and keep playback in sync.
    active = type;
    syncPlayback();
  }

  function setPlaying(value) {
    playing = Boolean(value);
    syncPlayback();
  }

  motionQuery.addEventListener("change", (event) => {
    if (event.matches) setPlaying(false);
  });

  syncPlayback();

  return {
    setActive,
    setPlaying,
    toggle: () => setPlaying(!playing),
    get playing() {
      return playing;
    },
    get active() {
      return active;
    },
  };
}
