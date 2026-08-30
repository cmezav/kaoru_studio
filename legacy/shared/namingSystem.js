/* Nombres breves y consistentes para las exportaciones de Silueta Studio. */
(function () {
  'use strict';
  const consonants = ['B','C','D','F','G','H','J','K','L','M','N','P','Q','R','S','5','T','7','V','W','X','Y','Z'];
  const vowels = ['A','4','E','3','U','Y'];

  function pick(values) { return values[(Math.random() * values.length) | 0]; }
  function code() {
    let value = '';
    for (let index = 0; index < 4; index += 1) value += pick(consonants) + pick(vowels);
    return value;
  }
  function base(prefix) { return `${String(prefix || 'FILE').toUpperCase()}-${code()}`; }
  function file(prefix, extension) {
    const cleanExtension = String(extension || '').replace(/^\./, '').toLowerCase();
    return `${base(prefix)}${cleanExtension ? `.${cleanExtension}` : ''}`;
  }

  window.StudioNaming = { code, base, file };
}());
