(function(){'use strict';
  async function render(source,state,opts,onStatus){if(onStatus)onStatus('Renderizando a resolución final…');await new Promise(r=>requestAnimationFrame(r));return ImageRenderer.render(source,state,{width:opts.width,height:opts.height,background:opts.background||null,quality:'full'})}
  async function blob(canvas,format,quality){return new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('No se pudo codificar la imagen.')),`image/${format}`,quality))}
  window.ImageExportPipeline={render,blob};
}());
