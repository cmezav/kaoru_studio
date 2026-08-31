(function(){'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function defaults(){return{
    adjustments:{brightness:0,contrast:0,saturation:0,exposure:0,temperature:0,hue:0,vibrance:0,opacity:1,gamma:1,shadows:0,highlights:0,whites:0,blacks:0},
    sharpness:{amount:0,radius:1,threshold:0},
    filters:{gaussianBlur:0,blur:0,grayscale:0,monochrome:0,monochromeColor:'#7c3aed',sepia:0,invert:0,motionBlur:0,motionAngle:0,pixelate:1,vignette:0,vignetteSize:48,vignetteSoftness:45},
    grain:{amount:0,size:1,opacity:.5},
    lens:{
      enabled:false,
      radius:12,
      lightness:50,
      shape:'circle',
      opacity:.65,
      size:18,
      threshold:72,
      softness:35,
      rotation:0,
      density:50,
      saturation:100,
      focusX:.5,
      focusY:.5,
      focusRadius:.24,
      transition:.18,
      brushRadius:.08,
      brushHardness:.65,
      brushStrength:1,
      strokes:[]
    },
    transform:{x:0,y:0,scaleX:1,scaleY:1,rotation:0,flipX:false,flipY:false,aspectLock:true},
    crop:{x:0,y:0,width:1,height:1}
  }}
  function merge(source){const base=defaults();source=source&&typeof source==='object'?source:{};return{
    ...base,...clone(source),
    adjustments:{...base.adjustments,...(source.adjustments||{})},
    sharpness:{...base.sharpness,...(source.sharpness||{})},
    filters:{...base.filters,...(source.filters||{})},
    grain:{...base.grain,...(source.grain||{})},
    lens:{...base.lens,...(source.lens||{}),strokes:Array.isArray(source.lens&&source.lens.strokes)?clone(source.lens.strokes):[]},
    transform:{...base.transform,...(source.transform||{})},
    crop:{...base.crop,...(source.crop||{})}
  }}
  function normalizeProject(payload){if(!payload)return defaults();if(payload.schema==='kaoru-image-studio-project'&&payload.state)return merge(payload.state);if(payload.state)return merge(payload.state);return merge(payload)}
  window.ImageState={defaults,merge,normalizeProject,clone};
}());