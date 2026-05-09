(function () {
  'use strict';

  var result = Handoff.classify(window.location.search);

  // Reveal whichever state matches. Sections start `hidden` as a no-JS
  // fallback so non-JS visitors only ever see the landing copy.
  var sections = document.querySelectorAll('.state');
  for (var i = 0; i < sections.length; i++) {
    sections[i].removeAttribute('hidden');
  }
  document.body.dataset.state = result.kind;

  if (result.kind === 'navigate') {
    // Fill the navigate-state slots BEFORE the browser fires the redirect.
    // If the OS prompt is dismissed or the scheme isn't registered, the
    // page stays on the navigate state and the user can tap the fallback
    // link to retry the same target.
    fillSlots(result.scheme, result.url);

    // Validation byte == navigation byte. No transformation between
    // validate and navigate inside the page; browser-side canonicalisation
    // at the navigation boundary is outside scope.
    window.location.replace(result.url);
  }

  function fillSlots(scheme, url) {
    var name = titleCase(scheme);
    var nameEls = document.querySelectorAll('[data-app-name]');
    for (var i = 0; i < nameEls.length; i++) {
      nameEls[i].textContent = name;
    }
    var linkEls = document.querySelectorAll('[data-app-link]');
    for (var j = 0; j < linkEls.length; j++) {
      linkEls[j].setAttribute('href', url);
    }
  }

  function titleCase(scheme) {
    return scheme.split('-').map(function (p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join('-');
  }
})();
