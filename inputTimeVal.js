// time validator for degraded time inputs
// Note: This must be loaded AFTER all user form submitters have
// been added
(function () {

  // error overlay custom element
  class ErrorOverlay extends HTMLElement {
    constructor () {
      super();

      // create a shadow root
      let shadowRoot = this.attachShadow({mode: 'open'});

      // create shadow DOM element
      const overlay = document.createElement('div');
      this.overlay = overlay;
      overlay.className = 'error-overlay';

      // create css for the shadow DOM
      const style = document.createElement('style');
      style.textContent = `
          .error-overlay {
            font-family: Helvetica, sans-serif;
            position: absolute;
            z-index: 1000;
            border: 1px solid #808080;
            border-radius: 4px;
            color: #f8f8f8;
            background-color: #808080;
            padding: 0.2rem 0.4rem;
            display: none;
          }
          .error-overlay::after {
            content: " ";
            position: absolute;
            top: 100%;
            left: 24px;
            margin-left: -5px;
            border-width: 5px;
            border-style: solid;
            border-color: #808080 transparent transparent transparent;
          }
        `;

      // attach shadow DOM to shadow root
      shadowRoot.appendChild(style);
      shadowRoot.appendChild(overlay);
    }

    // show error overlay above the input
    show (input, message) {
      const {top, right, bottom, left} = input.getBoundingClientRect();
      const overlay = this.overlay;
      overlay.style.top = Math.round(top - 34) + 'px';
      overlay.style.left = Math.round(left) + 'px';
      overlay.innerText = message;
      overlay.style.display = 'block';

      // hide overlay
      function overlayHide () {
        overlay.style.display = 'none';
        // remove listeners
        input.removeEventListener('keyup', overlayHide);
        input.removeEventListener('blur', overlayHide);
      }

      // add input listeners and focus the input
      input.addEventListener('keyup', overlayHide);
      input.addEventListener('blur', overlayHide);
      input.focus();
    }
  }

  // create overlay instance & add to body
  customElements.define('error-overlay', ErrorOverlay);
  const errorOverlay = document.createElement('error-overlay');
  document.body.appendChild(errorOverlay);

  // convert time string to decimal hours
  // time string patterns: "hh:mm AM", "hh:mm PM", "hh:mm"
  function timeStringToDecimalHours (timeStr) {
    let [hhmm, ampm] = timeStr.split(' ');
    ampm = (ampm || '').toLowerCase();
    let [hour, minute] = hhmm.split(':').map(el => Number(el));
    if (ampm === 'pm' && hour < 12) {
      hour += 12;
    } else if (ampm === 'am' && hour === 12) {
      hour = 0;
    }
    return hour + (minute / 60);
  }

  // get array of inputs that have this pattern:
  // <input type="text" min="hh:mm" max="hh:mm">
  function getDegradedTimeInputs (form) {
    return Array.from(form.querySelectorAll('input'))
      .filter(input => {
        if (input.type !== 'text') { return false; }
        return input.hasAttribute('min') ||
          input.hasAttribute('max');
      });
  }

  // validate inputs when form is submitted
  function validateTimeOnFormSubmit (evt) {

    // get form's inputs that have type="text", `min` and/or `max`
    const form = evt.target;
    const tInputs = getDegradedTimeInputs(form);

    // validate that each input value is between min and max
    for (const input of tInputs) {
      const {value, max, min} = input;

      // convert time strings into decimal hours
      const valTime = timeStringToDecimalHours(value),
        minTime = timeStringToDecimalHours(min),
        maxTime = timeStringToDecimalHours(max);

      if (valTime < minTime || maxTime < valTime) {
        // show the error overlay and prevent the submit
        errorOverlay.show(input, `Time must be between ${min} and ${max}`);
        return false;
      }
    }
    // complete the submit
    return form.realOnSubmit(evt);
  }

  // add time validator to all forms that contain degraded time inputs
  const forms = document.querySelectorAll('form');

  function submitHandlerStub () { return true; }

  for (const form of forms) {
    if (getDegradedTimeInputs(form).length > 0) {
      // store the real submit handler as `form.realOnSubmit`
      const realOnSubmit = form.onsubmit || submitHandlerStub;
      Object.defineProperty(form, 'realOnSubmit', {
        value: realOnSubmit,
        enumerable: false
      });
      form.onsubmit = validateTimeOnFormSubmit;
    }
  }

})();
