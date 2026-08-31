(function(){
  'use strict';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function initial(){
    return {
      version:1,
      phase:1,
      canvas:{
        width:1080,
        height:1080,
        backgroundMode:'color',
        backgroundColor:'#FFFFFF'
      },
      layers:[],
      selectedId:null,
      aspectLock:true,
      zoom:'fit'
    };
  }

  class History{
    constructor(limit=80){
      this.limit=limit;
      this.items=[];
      this.index=-1;
      this.onChange=null;
    }
    reset(state){
      this.items=[clone(state)];
      this.index=0;
      this.emit();
    }
    push(state){
      const next=clone(state);
      const current=this.items[this.index];
      if(current && JSON.stringify(current)===JSON.stringify(next)) return;
      this.items=this.items.slice(0,this.index+1);
      this.items.push(next);
      if(this.items.length>this.limit) this.items.shift();
      this.index=this.items.length-1;
      this.emit();
    }
    undo(){
      if(this.index<=0) return null;
      this.index-=1;
      this.emit();
      return clone(this.items[this.index]);
    }
    redo(){
      if(this.index>=this.items.length-1) return null;
      this.index+=1;
      this.emit();
      return clone(this.items[this.index]);
    }
    emit(){
      if(this.onChange){
        this.onChange({
          canUndo:this.index>0,
          canRedo:this.index<this.items.length-1
        });
      }
    }
  }

  window.CombinerState={
    clone,
    initial,
    History
  };
}());