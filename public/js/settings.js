/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

const defaultViewInput = document.getElementById('default-view');
const slideshowSpeedInput = document.getElementById('slideshow-speed');
const autoplayEnabledInput = document.getElementById('autoplay-enabled');
const btnSave = document.getElementById('btn-save');

t.render(function () {
  return t.get('member', 'private', 'gallerySettings')
    .then(function (savedSettings) {
      if (savedSettings) {
        if (savedSettings.defaultView) defaultViewInput.value = savedSettings.defaultView;
        if (savedSettings.slideshowSpeed) slideshowSpeedInput.value = savedSettings.slideshowSpeed;
        if (typeof savedSettings.autoplay !== 'undefined') autoplayEnabledInput.checked = savedSettings.autoplay;
      }
    })
    .then(function () {
      return t.sizeTo('.settings-container');
    });
});

btnSave.addEventListener('click', function () {
  const newSettings = {
    defaultView: defaultViewInput.value,
    slideshowSpeed: parseFloat(slideshowSpeedInput.value) || 3.5,
    autoplay: autoplayEnabledInput.checked
  };

  return t.set('member', 'private', 'gallerySettings', newSettings)
    .then(function () {
      return t.closePopup();
    });
});
